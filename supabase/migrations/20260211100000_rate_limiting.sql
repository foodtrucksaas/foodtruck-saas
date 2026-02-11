-- Persistent rate limiting table (replaces in-memory rate limiter)
CREATE TABLE IF NOT EXISTS rate_limits (
  identifier TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  request_count INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (identifier, window_start)
);

-- Index for cleanup of expired entries
CREATE INDEX idx_rate_limits_window ON rate_limits (window_start);

-- Atomic rate limit check: returns TRUE if allowed, FALSE if rate limited
-- Uses INSERT ON CONFLICT for atomic upsert (no race conditions)
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_identifier TEXT,
  p_window_seconds INTEGER DEFAULT 60,
  p_max_requests INTEGER DEFAULT 10
) RETURNS BOOLEAN AS $$
DECLARE
  v_window_start TIMESTAMPTZ;
  v_current_count INTEGER;
BEGIN
  -- Calculate current window start (truncate to window_seconds boundary)
  v_window_start := date_trunc('minute', NOW());

  -- Clean up old entries (older than 2 windows) - lightweight, runs every call
  DELETE FROM rate_limits WHERE window_start < NOW() - (p_window_seconds * 2 || ' seconds')::INTERVAL;

  -- Try to insert or increment atomically
  INSERT INTO rate_limits (identifier, window_start, request_count)
  VALUES (p_identifier, v_window_start, 1)
  ON CONFLICT (identifier, window_start)
  DO UPDATE SET request_count = rate_limits.request_count + 1
  RETURNING request_count INTO v_current_count;

  RETURN v_current_count <= p_max_requests;
END;
$$ LANGUAGE plpgsql;

-- No RLS needed - only called from edge functions via service role
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;
