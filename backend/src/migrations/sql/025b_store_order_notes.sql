CREATE TABLE IF NOT EXISTS pd_store_order_note (
  id          VARCHAR(64) PRIMARY KEY,
  order_id    VARCHAR(64) NOT NULL REFERENCES pd_order(id) ON DELETE CASCADE,
  store_id    VARCHAR(64) NOT NULL REFERENCES pd_store(id) ON DELETE CASCADE,
  body        TEXT NOT NULL DEFAULT '',
  created_by  VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  updated_by  VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  created_at  TIMESTAMP DEFAULT NOW(),
  updated_at  TIMESTAMP DEFAULT NOW(),
  UNIQUE (order_id, store_id)
);

CREATE INDEX IF NOT EXISTS idx_store_order_note_order ON pd_store_order_note(order_id);
CREATE INDEX IF NOT EXISTS idx_store_order_note_store ON pd_store_order_note(store_id);
