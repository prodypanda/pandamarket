CREATE TABLE IF NOT EXISTS pd_chat_conversation (
  id VARCHAR(64) PRIMARY KEY,
  type VARCHAR(30) NOT NULL CHECK (type IN ('buyer_seller', 'seller_admin', 'buyer_admin', 'seller_seller')),
  status VARCHAR(20) NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed')),
  store_id VARCHAR(64) REFERENCES pd_store(id) ON DELETE CASCADE,
  buyer_id VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  seller_id VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  order_id VARCHAR(64) REFERENCES pd_order(id) ON DELETE SET NULL,
  product_id VARCHAR(64) REFERENCES pd_product(id) ON DELETE SET NULL,
  subject VARCHAR(200) NOT NULL,
  created_by VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  last_message_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  CHECK (
    (type = 'buyer_seller' AND buyer_id IS NOT NULL AND store_id IS NOT NULL) OR
    (type = 'seller_admin' AND buyer_id IS NULL AND store_id IS NOT NULL AND seller_id IS NOT NULL) OR
    (type = 'buyer_admin' AND buyer_id IS NOT NULL AND store_id IS NULL) OR
    (type = 'seller_seller' AND buyer_id IS NULL AND store_id IS NOT NULL AND seller_id IS NOT NULL)
  )
);

CREATE TABLE IF NOT EXISTS pd_chat_participant (
  conversation_id VARCHAR(64) NOT NULL REFERENCES pd_chat_conversation(id) ON DELETE CASCADE,
  user_id VARCHAR(64) NOT NULL REFERENCES pd_user(id) ON DELETE CASCADE,
  role VARCHAR(30) NOT NULL,
  store_id VARCHAR(64) REFERENCES pd_store(id) ON DELETE CASCADE,
  last_read_at TIMESTAMP,
  archived_at TIMESTAMP,
  muted_until TIMESTAMP,
  joined_at TIMESTAMP DEFAULT NOW(),
  PRIMARY KEY (conversation_id, user_id)
);

CREATE TABLE IF NOT EXISTS pd_chat_message (
  id VARCHAR(64) PRIMARY KEY,
  conversation_id VARCHAR(64) NOT NULL REFERENCES pd_chat_conversation(id) ON DELETE CASCADE,
  sender_id VARCHAR(64) REFERENCES pd_user(id) ON DELETE SET NULL,
  sender_role VARCHAR(30) NOT NULL,
  body TEXT NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  attachments JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  edited_at TIMESTAMP,
  deleted_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_conversation_store ON pd_chat_conversation(store_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversation_buyer ON pd_chat_conversation(buyer_id, updated_at DESC) WHERE buyer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_conversation_type_status ON pd_chat_conversation(type, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_conversation_order ON pd_chat_conversation(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_conversation_product ON pd_chat_conversation(product_id) WHERE product_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_chat_participant_user ON pd_chat_participant(user_id, joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_message_conversation ON pd_chat_message(conversation_id, created_at ASC) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chat_message_sender ON pd_chat_message(sender_id, created_at DESC);

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_buyer_seller_context_unique
  ON pd_chat_conversation (
    buyer_id,
    store_id,
    COALESCE(order_id, ''),
    COALESCE(product_id, '')
  )
  WHERE type = 'buyer_seller' AND status = 'open';

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_seller_admin_subject_unique
  ON pd_chat_conversation (store_id, LOWER(subject))
  WHERE type = 'seller_admin' AND status = 'open';

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_buyer_admin_subject_unique
  ON pd_chat_conversation (buyer_id, LOWER(subject))
  WHERE type = 'buyer_admin' AND status = 'open';

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_seller_seller_subject_unique
  ON pd_chat_conversation (created_by, store_id, LOWER(subject))
  WHERE type = 'seller_seller' AND status = 'open';
