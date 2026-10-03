package eventflowv1

import (
	"context"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type GetEventCapacityRequest struct {
	EventId string `json:"event_id,omitempty"`
	TierId  string `json:"tier_id,omitempty"`
}

type GetEventCapacityResponse struct {
	EventId           string `json:"event_id,omitempty"`
	TierId            string `json:"tier_id,omitempty"`
	TotalCapacity     int32  `json:"total_capacity,omitempty"`
	RemainingCapacity int32  `json:"remaining_capacity,omitempty"`
	ConfirmedCount    int32  `json:"confirmed_count,omitempty"`
	WaitlistCount     int32  `json:"waitlist_count,omitempty"`
	IsSoldOut         bool   `json:"is_sold_out,omitempty"`
}

type GetRSVPStatusRequest struct {
	RsvpId string `json:"rsvp_id,omitempty"`
}

type GetRSVPStatusResponse struct {
	RsvpId           string `json:"rsvp_id,omitempty"`
	EventId          string `json:"event_id,omitempty"`
	UserId           string `json:"user_id,omitempty"`
	TierId           string `json:"tier_id,omitempty"`
	Status           string `json:"status,omitempty"`
	WaitlistPosition int32  `json:"waitlist_position,omitempty"`
	CreatedAt        string `json:"created_at,omitempty"`
}

type TriggerReconciliationRequest struct {
	EventId string `json:"event_id,omitempty"`
}

type TriggerReconciliationResponse struct {
	Success              bool   `json:"success,omitempty"`
	DiscrepancyCorrected int32  `json:"discrepancy_corrected,omitempty"`
	Message              string `json:"message,omitempty"`
}

// RSVPServiceClient is the client API for RSVPService service.
type RSVPServiceClient interface {
	GetEventCapacity(ctx context.Context, in *GetEventCapacityRequest, opts ...grpc.CallOption) (*GetEventCapacityResponse, error)
	GetRSVPStatus(ctx context.Context, in *GetRSVPStatusRequest, opts ...grpc.CallOption) (*GetRSVPStatusResponse, error)
	TriggerReconciliation(ctx context.Context, in *TriggerReconciliationRequest, opts ...grpc.CallOption) (*TriggerReconciliationResponse, error)
}

type rsvpServiceClient struct {
	cc grpc.ClientConnInterface
}

func NewRSVPServiceClient(cc grpc.ClientConnInterface) RSVPServiceClient {
	return &rsvpServiceClient{cc}
}

func (c *rsvpServiceClient) GetEventCapacity(ctx context.Context, in *GetEventCapacityRequest, opts ...grpc.CallOption) (*GetEventCapacityResponse, error) {
	out := new(GetEventCapacityResponse)
	err := c.cc.Invoke(ctx, "/eventflow.v1.RSVPService/GetEventCapacity", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *rsvpServiceClient) GetRSVPStatus(ctx context.Context, in *GetRSVPStatusRequest, opts ...grpc.CallOption) (*GetRSVPStatusResponse, error) {
	out := new(GetRSVPStatusResponse)
	err := c.cc.Invoke(ctx, "/eventflow.v1.RSVPService/GetRSVPStatus", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

func (c *rsvpServiceClient) TriggerReconciliation(ctx context.Context, in *TriggerReconciliationRequest, opts ...grpc.CallOption) (*TriggerReconciliationResponse, error) {
	out := new(TriggerReconciliationResponse)
	err := c.cc.Invoke(ctx, "/eventflow.v1.RSVPService/TriggerReconciliation", in, out, opts...)
	if err != nil {
		return nil, err
	}
	return out, nil
}

// RSVPServiceServer is the server API for RSVPService service.
type RSVPServiceServer interface {
	GetEventCapacity(context.Context, *GetEventCapacityRequest) (*GetEventCapacityResponse, error)
	GetRSVPStatus(context.Context, *GetRSVPStatusRequest) (*GetRSVPStatusResponse, error)
	TriggerReconciliation(context.Context, *TriggerReconciliationRequest) (*TriggerReconciliationResponse, error)
}

// UnimplementedRSVPServiceServer can be embedded to have forward compatible implementations.
type UnimplementedRSVPServiceServer struct{}

func (*UnimplementedRSVPServiceServer) GetEventCapacity(context.Context, *GetEventCapacityRequest) (*GetEventCapacityResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method GetEventCapacity not implemented")
}
func (*UnimplementedRSVPServiceServer) GetRSVPStatus(context.Context, *GetRSVPStatusRequest) (*GetRSVPStatusResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method GetRSVPStatus not implemented")
}
func (*UnimplementedRSVPServiceServer) TriggerReconciliation(context.Context, *TriggerReconciliationRequest) (*TriggerReconciliationResponse, error) {
	return nil, status.Errorf(codes.Unimplemented, "method TriggerReconciliation not implemented")
}

func RegisterRSVPServiceServer(s grpc.ServiceRegistrar, srv RSVPServiceServer) {
	s.RegisterService(&_RSVPService_serviceDesc, srv)
}

func _RSVPService_GetEventCapacity_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(GetEventCapacityRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(RSVPServiceServer).GetEventCapacity(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/eventflow.v1.RSVPService/GetEventCapacity",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(RSVPServiceServer).GetEventCapacity(ctx, req.(*GetEventCapacityRequest))
	}
	return interceptor(ctx, in, info, handler)
}

func _RSVPService_GetRSVPStatus_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(GetRSVPStatusRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(RSVPServiceServer).GetRSVPStatus(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/eventflow.v1.RSVPService/GetRSVPStatus",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(RSVPServiceServer).GetRSVPStatus(ctx, req.(*GetRSVPStatusRequest))
	}
	return interceptor(ctx, in, info, handler)
}

func _RSVPService_TriggerReconciliation_Handler(srv interface{}, ctx context.Context, dec func(interface{}) error, interceptor grpc.UnaryServerInterceptor) (interface{}, error) {
	in := new(TriggerReconciliationRequest)
	if err := dec(in); err != nil {
		return nil, err
	}
	if interceptor == nil {
		return srv.(RSVPServiceServer).TriggerReconciliation(ctx, in)
	}
	info := &grpc.UnaryServerInfo{
		Server:     srv,
		FullMethod: "/eventflow.v1.RSVPService/TriggerReconciliation",
	}
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return srv.(RSVPServiceServer).TriggerReconciliation(ctx, req.(*TriggerReconciliationRequest))
	}
	return interceptor(ctx, in, info, handler)
}

var _RSVPService_serviceDesc = grpc.ServiceDesc{
	ServiceName: "eventflow.v1.RSVPService",
	HandlerType: (*RSVPServiceServer)(nil),
	Methods: []grpc.MethodDesc{
		{
			MethodName: "GetEventCapacity",
			Handler:    _RSVPService_GetEventCapacity_Handler,
		},
		{
			MethodName: "GetRSVPStatus",
			Handler:    _RSVPService_GetRSVPStatus_Handler,
		},
		{
			MethodName: "TriggerReconciliation",
			Handler:    _RSVPService_TriggerReconciliation_Handler,
		},
	},
	Streams:  []grpc.StreamDesc{},
	Metadata: "proto/eventflow/v1/rsvp.proto",
}
