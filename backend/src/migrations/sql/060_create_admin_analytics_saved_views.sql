-- Migration: 060_create_admin_analytics_saved_views.sql
-- Description: Create table for superadmin saved platform analytics views and filter presets

CREATE TABLE IF NOT EXISTS pd_admin_analytics_saved_view (
  id TEXT PRIMARY KEY,
  admin_user_id TEXT NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NULL,
  filters JSONB NOT NULL DEFAULT '{}'::jsonb,
  visible_tabs JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pd_admin_analytics_saved_view_admin 
  ON pd_admin_analytics_saved_view(admin_user_id, created_at DESC);
