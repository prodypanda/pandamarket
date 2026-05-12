ALTER TABLE pd_chat_conversation ALTER COLUMN store_id DROP NOT NULL;

ALTER TABLE pd_chat_conversation DROP CONSTRAINT IF EXISTS pd_chat_conversation_type_check;
ALTER TABLE pd_chat_conversation ADD CONSTRAINT pd_chat_conversation_type_check
  CHECK (type IN ('buyer_seller', 'seller_admin', 'buyer_admin', 'seller_seller'));

ALTER TABLE pd_chat_conversation DROP CONSTRAINT IF EXISTS pd_chat_conversation_check;
ALTER TABLE pd_chat_conversation DROP CONSTRAINT IF EXISTS pd_chat_conversation_scope_check;
ALTER TABLE pd_chat_conversation ADD CONSTRAINT pd_chat_conversation_scope_check
  CHECK (
    (type = 'buyer_seller' AND buyer_id IS NOT NULL AND store_id IS NOT NULL) OR
    (type = 'seller_admin' AND buyer_id IS NULL AND store_id IS NOT NULL AND seller_id IS NOT NULL) OR
    (type = 'buyer_admin' AND buyer_id IS NOT NULL AND store_id IS NULL) OR
    (type = 'seller_seller' AND buyer_id IS NULL AND store_id IS NOT NULL AND seller_id IS NOT NULL)
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_buyer_admin_subject_unique
  ON pd_chat_conversation (buyer_id, LOWER(subject))
  WHERE type = 'buyer_admin' AND status = 'open';

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_seller_seller_subject_unique
  ON pd_chat_conversation (created_by, store_id, LOWER(subject))
  WHERE type = 'seller_seller' AND status = 'open';
