CREATE TABLE IF NOT EXISTS pd_system_log (
  id            VARCHAR(64) PRIMARY KEY,
  level         VARCHAR(20) NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'fatal')),
  source        VARCHAR(80) NOT NULL DEFAULT 'backend',
  event_type    VARCHAR(80) NOT NULL DEFAULT 'server_error',
  message       TEXT NOT NULL,
  request_id    VARCHAR(64),
  method        VARCHAR(12),
  path          TEXT,
  status_code   INTEGER,
  user_id       VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  user_role     VARCHAR(40),
  ip            VARCHAR(80),
  user_agent    TEXT,
  error_name    VARCHAR(120),
  error_code    VARCHAR(120),
  stack         TEXT,
  metadata      JSONB DEFAULT '{}'::jsonb,
  created_at    TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_log_level_created
  ON pd_system_log(level, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_log_event_created
  ON pd_system_log(event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_system_log_request
  ON pd_system_log(request_id);

CREATE INDEX IF NOT EXISTS idx_system_log_created
  ON pd_system_log(created_at DESC);
