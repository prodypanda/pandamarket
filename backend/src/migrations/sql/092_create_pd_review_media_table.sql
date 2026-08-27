-- 092_create_pd_review_media_table.sql

CREATE TABLE IF NOT EXISTS pd_review_media (
  id TEXT PRIMARY KEY,
  review_id VARCHAR(64) NOT NULL REFERENCES pd_review(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type VARCHAR(20) NOT NULL DEFAULT 'image' CHECK (media_type IN ('image', 'video')),
  status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (status IN ('approved', 'pending', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pd_review_media_review ON pd_review_media(review_id);
