package grpcserver

import (
	"context"
	"errors"
	"fmt"
	"net"
	"time"

	eventflowv1 "github.com/eventflow/rsvp-core/gen/eventflow/v1"
	"github.com/eventflow/rsvp-core/internal/domain"
	"github.com/eventflow/rsvp-core/internal/service"
	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type Server struct {
	eventflowv1.UnimplementedRSVPServiceServer
	grpcServer  *grpc.Server
	rsvpService *service.RSVPService
	port        string
}

func NewServer(port string, rsvpService *service.RSVPService) *Server {
	s := grpc.NewServer()
	srv := &Server{
		grpcServer:  s,
		rsvpService: rsvpService,
		port:        port,
	}
	eventflowv1.RegisterRSVPServiceServer(s, srv)
	return srv
}

func (s *Server) Start() error {
	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", s.port))
	if err != nil {
		return fmt.Errorf("failed to listen on gRPC port %s: %w", s.port, err)
	}

	go func() {
		_ = s.grpcServer.Serve(lis)
	}()
	return nil
}

func (s *Server) Stop() {
	s.grpcServer.GracefulStop()
}

func (s *Server) GetEventCapacity(ctx context.Context, req *eventflowv1.GetEventCapacityRequest) (*eventflowv1.GetEventCapacityResponse, error) {
	if req.EventId == "" || req.TierId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "event_id and tier_id are required")
	}

	snap, err := s.rsvpService.GetCapacity(ctx, req.EventId, req.TierId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to get capacity: %v", err)
	}

	return &eventflowv1.GetEventCapacityResponse{
		EventId:           snap.EventID,
		TierId:            snap.TierID,
		TotalCapacity:     int32(snap.TotalCapacity),
		RemainingCapacity: int32(snap.RemainingCapacity),
		ConfirmedCount:    int32(snap.ConfirmedCount),
		WaitlistCount:     int32(snap.WaitlistCount),
		IsSoldOut:         snap.IsSoldOut,
	}, nil
}

func (s *Server) GetRSVPStatus(ctx context.Context, req *eventflowv1.GetRSVPStatusRequest) (*eventflowv1.GetRSVPStatusResponse, error) {
	if req.RsvpId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "rsvp_id is required")
	}

	rsvp, err := s.rsvpService.GetRSVP(ctx, req.RsvpId)
	if err != nil {
		if errors.Is(err, domain.ErrRSVPNotFound) {
			return nil, status.Errorf(codes.NotFound, "rsvp not found: %s", req.RsvpId)
		}
		return nil, status.Errorf(codes.Internal, "failed to query rsvp: %v", err)
	}

	return &eventflowv1.GetRSVPStatusResponse{
		RsvpId:    rsvp.ID,
		EventId:   rsvp.EventID,
		UserId:    rsvp.UserID,
		TierId:    rsvp.TierID,
		Status:    string(rsvp.Status),
		CreatedAt: rsvp.CreatedAt.Format(time.RFC3339),
	}, nil
}

func (s *Server) TriggerReconciliation(ctx context.Context, req *eventflowv1.TriggerReconciliationRequest) (*eventflowv1.TriggerReconciliationResponse, error) {
	if req.EventId == "" {
		return nil, status.Errorf(codes.InvalidArgument, "event_id is required")
	}

	tiers, err := s.rsvpService.GetTiersByEvent(ctx, req.EventId)
	if err != nil {
		return nil, status.Errorf(codes.Internal, "failed to fetch tiers for reconciliation: %v", err)
	}

	discrepancies := 0
	for _, t := range tiers {
		if err := s.rsvpService.ReconcileCapacity(ctx, req.EventId, t.ID); err != nil {
			discrepancies++
		}
	}

	return &eventflowv1.TriggerReconciliationResponse{
		Success:              true,
		DiscrepancyCorrected: int32(discrepancies),
		Message:              fmt.Sprintf("Successfully reconciled %d tier capacities for event %s", len(tiers), req.EventId),
	}, nil
}
