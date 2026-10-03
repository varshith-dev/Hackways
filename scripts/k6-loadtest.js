import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate, Counter } from 'k6/metrics';

// Latency & Error Budgets (Target SLA)
const rsvpLatency = new Trend('rsvp_duration_ms');
const errorRate = new Rate('error_rate');
const confirmedCount = new Counter('confirmed_rsvps');
const waitlistCount = new Counter('waitlist_rsvps');

export const options = {
  scenarios: {
    viral_drop_flash_crowd: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 500,
      maxVUs: 2000,
      stages: [
        { duration: '10s', target: 200 },   // Warm-up
        { duration: '30s', target: 2000 },  // Flash-crowd spike (2,000 reqs/sec)
        { duration: '20s', target: 5000 },  // Peak viral drop (5,000 reqs/sec)
        { duration: '10s', target: 0 },     // Cool down
      ],
    },
  },
  thresholds: {
    // Non-negotiable SLA budgets:
    'http_req_duration': ['p(50)<15', 'p(95)<40', 'p(99)<80'],
    'error_rate': ['rate<0.001'], // < 0.1% unexpected system errors
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const EVENT_ID = __ENV.EVENT_ID || 'a0000000-0000-0000-0000-000000000001';
const TIER_ID = __ENV.TIER_ID || 'b0000000-0000-0000-0000-000000000002';

export default function () {
  const userId = `k6_user_${__VU}_${__ITER}`;
  const payload = JSON.stringify({
    tier_id: TIER_ID,
    user_id: userId,
    user_email: `${userId}@k6test.io`,
    user_name: `K6 Load User ${__VU}`,
    idempotency_key: `k6_idemp_${userId}`,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': `k6_idemp_${userId}`,
    },
  };

  const res = http.post(`${BASE_URL}/api/v1/events/${EVENT_ID}/rsvps`, payload, params);

  const isSuccess = check(res, {
    'status is 201 or 202': (r) => r.status === 201 || r.status === 202,
    'has valid json body': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body.rsvp && body.rsvp.status !== undefined;
      } catch (e) {
        return false;
      }
    },
  });

  errorRate.add(!isSuccess);
  rsvpLatency.add(res.timings.duration);

  if (res.status === 201) {
    confirmedCount.add(1);
  } else if (res.status === 202) {
    waitlistCount.add(1);
  }
}
