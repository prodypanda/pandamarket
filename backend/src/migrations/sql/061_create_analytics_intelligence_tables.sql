-- Migration: 061_create_analytics_intelligence_tables.sql
-- Description: Create tables for daily intelligence snapshots and executive report schedules

CREATE TABLE IF NOT EXISTS pd_analytics_intelligence_snapshot (
  id TEXT PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  metric_key TEXT NOT NULL,
  metric_value NUMERIC NULL,
  baseline_value NUMERIC NULL,
  delta_pct NUMERIC NULL,
  severity TEXT NULL,
  insight_type TEXT NOT NULL,
  entity_type TEXT NULL,
  entity_id TEXT NULL,
  explanation TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT pd_analytics_intel_snapshot_unique UNIQUE(snapshot_date, metric_key, insight_type, entity_type, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_pd_analytics_intelligence_snapshot_date
  ON pd_analytics_intelligence_snapshot(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_pd_analytics_intelligence_snapshot_type
  ON pd_analytics_intelligence_snapshot(insight_type, severity, snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_pd_analytics_intelligence_snapshot_entity
  ON pd_analytics_intelligence_snapshot(entity_type, entity_id, snapshot_date DESC);

CREATE TABLE IF NOT EXISTS pd_admin_analytics_report_schedule (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  frequency TEXT NOT NULL,
  timezone TEXT NOT NULL DEFAULT 'UTC',
  recipients JSONB NOT NULL DEFAULT '[]'::jsonb,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  include_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  format TEXT NOT NULL DEFAULT 'csv',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_sent_at TIMESTAMPTZ NULL,
  next_run_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pd_admin_analytics_report_schedule_next_run
  ON pd_admin_analytics_report_schedule(is_active, next_run_at);
