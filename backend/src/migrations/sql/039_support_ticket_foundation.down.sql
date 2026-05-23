DROP TRIGGER IF EXISTS trg_pd_support_ticket_message_updated_at ON pd_support_ticket_message;
DROP TRIGGER IF EXISTS trg_pd_support_ticket_updated_at ON pd_support_ticket;

DROP TABLE IF EXISTS pd_support_ticket_attachment;
DROP TABLE IF EXISTS pd_support_ticket_message;
DROP TABLE IF EXISTS pd_support_ticket;
