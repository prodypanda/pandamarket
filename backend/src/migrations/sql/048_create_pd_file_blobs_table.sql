-- Migration 048: Create Database File Blobs Storage Table
-- Provides 100% persistent database storage for uploaded pictures & assets across Render redeploys

CREATE TABLE IF NOT EXISTS pd_file_blobs (
  key VARCHAR(512) PRIMARY KEY,
  bucket VARCHAR(128) NOT NULL,
  content_type VARCHAR(128) NOT NULL,
  data BYTEA NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pd_file_blobs_bucket ON pd_file_blobs(bucket);
