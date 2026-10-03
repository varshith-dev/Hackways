package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"net/http"
	"sort"
	"sync"
	"sync/atomic"
	"time"
)

type LoadTestConfig struct {
	BaseURL     string
	EventID     string
	TierID      string
	TotalReqs   int
	Concurrency int
}

func main() {
	baseURL := flag.String("url", "http://localhost:8080", "Base URL of rsvp-core")
	eventID := flag.String("event", "a0000000-0000-0000-0000-000000000001", "Event UUID")
	tierID := flag.String("tier", "b0000000-0000-0000-0000-000000000002", "Ticket Tier UUID")
	totalReqs := flag.Int("n", 2000, "Total number of RSVP requests to dispatch")
	concurrency := flag.Int("c", 100, "Concurrent worker routines")
	flag.Parse()

	fmt.Printf("\n=======================================================\n")
	fmt.Printf("   EventFlow High-Concurrency Flash Crowd Load Test\n")
	fmt.Printf("=======================================================\n")
	fmt.Printf("Target:      %s/api/v1/events/%s/rsvps\n", *baseURL, *eventID)
	fmt.Printf("Requests:    %d\n", *totalReqs)
	fmt.Printf("Concurrency: %d workers\n\n", *concurrency)

	client := &http.Client{
		Timeout: 5 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        500,
			MaxIdleConnsPerHost: 500,
			IdleConnTimeout:     30 * time.Second,
		},
	}

	reqChan := make(chan int, *totalReqs)
	for i := 0; i < *totalReqs; i++ {
		reqChan <- i
	}
	close(reqChan)

	var confirmedCount int64
	var waitlistCount int64
	var errorCount int64
	var latenciesMu sync.Mutex
	latencies := make([]time.Duration, 0, *totalReqs)

	var wg sync.WaitGroup
	startTime := time.Now()

	for w := 0; w < *concurrency; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for reqIdx := range reqChan {
				userID := fmt.Sprintf("bench_user_%d_%d", workerID, reqIdx)
				payload := map[string]interface{}{
					"tier_id":         *tierID,
					"user_id":         userID,
					"user_email":      fmt.Sprintf("%s@eventflow-load.io", userID),
					"user_name":       fmt.Sprintf("Load User %d", reqIdx),
					"idempotency_key": fmt.Sprintf("idemp_%s", userID),
				}
				bodyBytes, _ := json.Marshal(payload)

				reqStart := time.Now()
				req, _ := http.NewRequest("POST", fmt.Sprintf("%s/api/v1/events/%s/rsvps", *baseURL, *eventID), bytes.NewReader(bodyBytes))
				req.Header.Set("Content-Type", "application/json")
				req.Header.Set("Idempotency-Key", fmt.Sprintf("idemp_%s", userID))

				resp, err := client.Do(req)
				latency := time.Since(reqStart)

				latenciesMu.Lock()
				latencies = append(latencies, latency)
				latenciesMu.Unlock()

				if err != nil {
					atomic.AddInt64(&errorCount, 1)
					continue
				}

				if resp.StatusCode == http.StatusCreated {
					atomic.AddInt64(&confirmedCount, 1)
				} else if resp.StatusCode == http.StatusAccepted {
					atomic.AddInt64(&waitlistCount, 1)
				} else {
					atomic.AddInt64(&errorCount, 1)
				}
				_ = resp.Body.Close()
			}
		}(w)
	}

	wg.Wait()
	totalDuration := time.Since(startTime)

	sort.Slice(latencies, func(i, j int) bool {
		return latencies[i] < latencies[j]
	})

	var p50, p95, p99 time.Duration
	if len(latencies) > 0 {
		p50 = latencies[len(latencies)*50/100]
		p95 = latencies[len(latencies)*95/100]
		p99 = latencies[len(latencies)*99/100]
	}

	rps := float64(*totalReqs) / totalDuration.Seconds()

	fmt.Printf("-------------------------------------------------------\n")
	fmt.Printf("RESULTS SUMMARY:\n")
	fmt.Printf("  Total Elapsed Time:   %v\n", totalDuration)
	fmt.Printf("  Throughput (RPS):     %.2f reqs/sec\n", rps)
	fmt.Printf("  Confirmed RSVPs:      %d\n", confirmedCount)
	fmt.Printf("  Waitlisted RSVPs:     %d\n", waitlistCount)
	fmt.Printf("  Errors (Non-2xx):     %d\n", errorCount)
	fmt.Printf("LATENCY DISTRIBUTION:\n")
	fmt.Printf("  p50 (Median):         %v\n", p50)
	fmt.Printf("  p95:                  %v\n", p95)
	fmt.Printf("  p99:                  %v\n", p99)
	fmt.Printf("-------------------------------------------------------\n")
}
