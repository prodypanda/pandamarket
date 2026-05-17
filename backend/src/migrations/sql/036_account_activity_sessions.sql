CREATE TABLE IF NOT EXISTS pd_user_session (
  id               VARCHAR(64) PRIMARY KEY,
  user_id          VARCHAR(64) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  role             VARCHAR(40),
  store_id          VARCHAR(64),
  refresh_token_id VARCHAR(64),
  ip               VARCHAR(80),
  user_agent       TEXT,
  device_label     VARCHAR(255),
  metadata         JSONB DEFAULT '{}'::jsonb,
  last_event_type  VARCHAR(80),
  expires_at       TIMESTAMP NOT NULL,
  revoked_at       TIMESTAMP,
  revoked_reason   VARCHAR(80),
  created_at       TIMESTAMP DEFAULT NOW(),
  last_seen_at     TIMESTAMP DEFAULT NOW()
);

ALTER TABLE pd_refresh_tokens
  ADD COLUMN IF NOT EXISTS session_id VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_user_session_user_active
  ON pd_user_session(user_id, revoked_at, expires_at, last_seen_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_session_refresh_token
  ON pd_user_session(refresh_token_id);

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_session
  ON pd_refresh_tokens(session_id);

CREATE TABLE IF NOT EXISTS pd_user_login_event (
  id             VARCHAR(64) PRIMARY KEY,
  user_id        VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  email          VARCHAR(255),
  role           VARCHAR(40),
  store_id       VARCHAR(64),
  session_id     VARCHAR(64) REFERENCES pd_user_session(id) ON DELETE SET NULL,
  event_type     VARCHAR(80) NOT NULL,
  success        BOOLEAN NOT NULL DEFAULT false,
  failure_reason VARCHAR(255),
  ip             VARCHAR(80),
  user_agent     TEXT,
  device_label   VARCHAR(255),
  metadata       JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_login_event_user_created
  ON pd_user_login_event(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_login_event_email_created
  ON pd_user_login_event(email, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_login_event_session
  ON pd_user_login_event(session_id);

CREATE INDEX IF NOT EXISTS idx_user_login_event_type_created
  ON pd_user_login_event(event_type, created_at DESC);
