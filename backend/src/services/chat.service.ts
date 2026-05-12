import { UserRole } from '@pandamarket/types';
import { query, transaction } from '../db/pool';
import { PdErrorCode, PdForbiddenError, PdNotFoundError, PdRateLimitError, PdValidationError } from '../errors';
import { socketGateway } from '../realtime/socket-gateway';
import { pdId } from '../utils/crypto';

export type ChatConversationType = 'buyer_seller' | 'seller_admin' | 'buyer_admin' | 'seller_seller';
export type ChatConversationStatus = 'open' | 'closed';

export interface ChatAttachmentInput {
  file_url?: string | null;
  file_key?: string | null;
  file_name: string;
  content_type: string;
  file_size?: number | null;
}

export interface ChatConversationRow {
  id: string;
  type: ChatConversationType;
  status: ChatConversationStatus;
  store_id: string | null;
  buyer_id: string | null;
  seller_id: string | null;
  order_id: string | null;
  product_id: string | null;
  subject: string;
  created_by: string | null;
  last_message_at: Date | null;
  created_at: Date;
  updated_at: Date;
  store_name?: string | null;
  store_subdomain?: string | null;
  buyer_email?: string | null;
  buyer_name?: string | null;
  seller_email?: string | null;
  seller_name?: string | null;
  product_title?: string | null;
  order_status?: string | null;
  last_message_body?: string | null;
  last_sender_id?: string | null;
  last_sender_role?: string | null;
  last_message_created_at?: Date | null;
  unread_count?: number;
}

export interface ChatMessageRow {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  sender_role: string;
  sender_email?: string | null;
  sender_name?: string | null;
  body: string;
  attachments: ChatAttachmentInput[];
  metadata: Record<string, unknown>;
  edited_at: Date | null;
  deleted_at: Date | null;
  created_at: Date;
}

export interface ChatDetails {
  conversation: ChatConversationRow;
  messages: ChatMessageRow[];
}

export interface ChatActorContext {
  id: string;
  role: UserRole;
  store_id?: string | null;
}

interface ChatCreateInput {
  store_id?: string | null;
  buyer_id?: string | null;
  product_id?: string | null;
  order_id?: string | null;
  subject?: string | null;
  body?: string | null;
  attachments?: ChatAttachmentInput[];
  check_existing?: boolean;
  force_new?: boolean;
}

interface ChatLimits {
  messageRateLimitPerMinute: number;
  maxImagesPerMessage: number;
  maxImageSizeBytes: number;
  maxMessageLength: number;
}

const CHAT_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const DEFAULT_CHAT_LIMITS: ChatLimits = {
  messageRateLimitPerMinute: 20,
  maxImagesPerMessage: 4,
  maxImageSizeBytes: 5 * 1024 * 1024,
  maxMessageLength: 5000,
};
const CHAT_LIMIT_KEYS = [
  'chat_message_rate_limit_per_minute',
  'chat_max_images_per_message',
  'chat_max_image_size_mb',
  'chat_max_message_length',
];

const CHAT_SELECT = `
  SELECT
    c.*,
    s.name AS store_name,
    s.subdomain AS store_subdomain,
    buyer.email AS buyer_email,
    COALESCE(NULLIF(TRIM(CONCAT(COALESCE(buyer.first_name, ''), ' ', COALESCE(buyer.last_name, ''))), ''), buyer.email) AS buyer_name,
    seller.email AS seller_email,
    COALESCE(NULLIF(TRIM(CONCAT(COALESCE(seller.first_name, ''), ' ', COALESCE(seller.last_name, ''))), ''), seller.email) AS seller_name,
    p.title AS product_title,
    o.status AS order_status,
    lm.body AS last_message_body,
    lm.sender_id AS last_sender_id,
    lm.sender_role AS last_sender_role,
    lm.created_at AS last_message_created_at
  FROM pd_chat_conversation c
  LEFT JOIN pd_store s ON s.id = c.store_id
  LEFT JOIN pd_user buyer ON buyer.id = c.buyer_id
  LEFT JOIN pd_user seller ON seller.id = c.seller_id
  LEFT JOIN pd_product p ON p.id = c.product_id
  LEFT JOIN pd_order o ON o.id = c.order_id
  LEFT JOIN LATERAL (
    SELECT body, sender_id, sender_role, created_at
    FROM pd_chat_message
    WHERE conversation_id = c.id AND deleted_at IS NULL
    ORDER BY created_at DESC
    LIMIT 1
  ) lm ON true
`;

function isAdminRole(role: UserRole) {
  return role === UserRole.Admin || role === UserRole.SuperAdmin;
}

function normalizeMessageBody(body: string | null | undefined, hasAttachments: boolean, maxLength: number) {
  const trimmed = (body ?? '').trim();
  if (trimmed.length > maxLength) {
    throw new PdValidationError(`Message must be ${maxLength} characters or less`);
  }
  if (trimmed.length < 1 && !hasAttachments) {
    throw new PdValidationError('Message must include text or an image');
  }
  return trimmed || ' ';
}

function normalizeSubject(subject?: string | null, fallback = 'Conversation') {
  const trimmed = (subject ?? '').trim();
  const value = trimmed || fallback;
  if (value.length < 2 || value.length > 200) {
    throw new PdValidationError('Subject must be between 2 and 200 characters');
  }
  return value;
}

function normalizeAttachments(attachments: ChatAttachmentInput[] | undefined, actor: ChatActorContext, limits: ChatLimits) {
  if ((attachments ?? []).length > limits.maxImagesPerMessage) {
    throw new PdValidationError(`You can attach up to ${limits.maxImagesPerMessage} images per message`);
  }
  return (attachments ?? []).map((attachment) => {
    const fileKey = attachment.file_key?.replace(/^\/+/, '').trim();
    const contentType = attachment.content_type.trim().toLowerCase();
    const fileName = attachment.file_name.trim();
    if (!fileKey || fileKey.includes('..') || !fileKey.startsWith(`chat/${actor.id}/`)) {
      throw new PdValidationError('Invalid chat image attachment');
    }
    if (!fileName) {
      throw new PdValidationError('Attachment requires a file name');
    }
    if (!CHAT_IMAGE_TYPES.has(contentType)) {
      throw new PdValidationError('Only image attachments are allowed in chat');
    }
    if (attachment.file_size !== undefined && attachment.file_size !== null && attachment.file_size > limits.maxImageSizeBytes) {
      throw new PdValidationError('Chat image is too large');
    }
    return {
      file_url: null,
      file_key: fileKey,
      file_name: fileName,
      content_type: contentType,
      file_size: attachment.file_size ?? null,
    };
  });
}

function parseUnreadCount(row: ChatConversationRow & { unread_count?: string | number }) {
  return {
    ...row,
    unread_count: Number(row.unread_count ?? 0),
  };
}

function subjectFromContext(input: { subject?: string | null; order_id?: string | null; product_title?: string | null; store_name?: string | null }) {
  if (input.subject?.trim()) return input.subject.trim();
  if (input.order_id) return `Order #${input.order_id.slice(-8).toUpperCase()}`;
  if (input.product_title) return input.product_title;
  if (input.store_name) return `Conversation with ${input.store_name}`;
  return 'Conversation';
}

export class ChatService {
  async getChatLimits(): Promise<ChatLimits> {
    const { rows } = await query<{ key: string; value: string }>(
      'SELECT key, value FROM pd_platform_config WHERE key = ANY($1)',
      [CHAT_LIMIT_KEYS],
    );
    const values = new Map(rows.map((row) => [row.key, Number(row.value)]));
    const numberValue = (key: string, fallback: number, min: number, max: number) => {
      const value = values.get(key);
      if (!Number.isFinite(value)) return fallback;
      return Math.min(max, Math.max(min, Math.floor(value as number)));
    };
    return {
      messageRateLimitPerMinute: numberValue('chat_message_rate_limit_per_minute', DEFAULT_CHAT_LIMITS.messageRateLimitPerMinute, 1, 300),
      maxImagesPerMessage: numberValue('chat_max_images_per_message', DEFAULT_CHAT_LIMITS.maxImagesPerMessage, 1, 10),
      maxImageSizeBytes: numberValue('chat_max_image_size_mb', DEFAULT_CHAT_LIMITS.maxImageSizeBytes / (1024 * 1024), 1, 25) * 1024 * 1024,
      maxMessageLength: numberValue('chat_max_message_length', DEFAULT_CHAT_LIMITS.maxMessageLength, 1, 5000),
    };
  }

  private async assertMessageRateLimit(actor: ChatActorContext, limits: ChatLimits) {
    const { rows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM pd_chat_message
       WHERE sender_id = $1
         AND deleted_at IS NULL
         AND created_at >= NOW() - INTERVAL '1 minute'`,
      [actor.id],
    );
    if (parseInt(rows[0]?.count ?? '0', 10) >= limits.messageRateLimitPerMinute) {
      throw new PdRateLimitError(60);
    }
  }

  private async getStore(storeId: string) {
    const { rows } = await query<{ id: string; owner_id: string; name: string; subdomain: string | null }>(
      'SELECT id, owner_id, name, subdomain FROM pd_store WHERE id = $1',
      [storeId],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.STORE_NOT_FOUND, 'Store not found');
    return rows[0];
  }

  private async getUser(userId: string, role?: UserRole) {
    const { rows } = await query<{ id: string; role: UserRole }>(
      'SELECT id, role FROM pd_user WHERE id = $1',
      [userId],
    );
    if (!rows[0] || (role && rows[0].role !== role)) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'User not found');
    }
    return rows[0];
  }

  private async resolveBuyerSellerTarget(buyerId: string, input: ChatCreateInput) {
    let storeId = input.store_id ?? null;
    let productTitle: string | null = null;

    if (input.product_id) {
      const { rows } = await query<{ id: string; title: string; store_id: string }>(
        'SELECT id, title, store_id FROM pd_product WHERE id = $1',
        [input.product_id],
      );
      if (!rows[0]) throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Product not found');
      if (storeId && rows[0].store_id !== storeId) {
        throw new PdValidationError('Product does not belong to the selected store');
      }
      storeId = rows[0].store_id;
      productTitle = rows[0].title;
    }

    if (input.order_id) {
      const params: unknown[] = [input.order_id, buyerId];
      let storeClause = '';
      if (storeId) {
        params.push(storeId);
        storeClause = `AND oi.store_id = $${params.length}`;
      }
      const { rows } = await query<{ store_id: string; owner_id: string; name: string; product_title: string | null }>(
        `SELECT DISTINCT oi.store_id, s.owner_id, s.name, MIN(p.title) AS product_title
         FROM pd_order o
         JOIN pd_order_item oi ON oi.order_id = o.id
         JOIN pd_store s ON s.id = oi.store_id
         LEFT JOIN pd_product p ON p.id = oi.product_id
         WHERE o.id = $1 AND o.customer_id = $2 ${storeClause}
         GROUP BY oi.store_id, s.owner_id, s.name`,
        params,
      );
      if (rows.length === 0) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Order store not found');
      if (!storeId && rows.length > 1) {
        throw new PdValidationError('This order contains multiple stores. Please provide store_id.');
      }
      storeId = rows[0].store_id;
      productTitle = productTitle ?? rows[0].product_title;
    }

    if (!storeId) {
      throw new PdValidationError('A store, product, or order is required to start a chat');
    }

    const store = await this.getStore(storeId);
    return {
      store_id: store.id,
      seller_id: store.owner_id,
      store_name: store.name,
      product_title: productTitle,
    };
  }

  private async resolveSellerBuyerTarget(storeId: string, input: ChatCreateInput) {
    let buyerId = input.buyer_id ?? null;
    let productTitle: string | null = null;

    if (input.order_id) {
      const { rows } = await query<{ customer_id: string; product_title: string | null }>(
        `SELECT o.customer_id, MIN(p.title) AS product_title
         FROM pd_order o
         JOIN pd_order_item oi ON oi.order_id = o.id
         LEFT JOIN pd_product p ON p.id = oi.product_id
         WHERE o.id = $1 AND oi.store_id = $2
         GROUP BY o.customer_id`,
        [input.order_id, storeId],
      );
      if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Order not found for this store');
      buyerId = rows[0].customer_id;
      productTitle = rows[0].product_title;
    }

    if (input.product_id) {
      const { rows } = await query<{ title: string; store_id: string }>(
        'SELECT title, store_id FROM pd_product WHERE id = $1',
        [input.product_id],
      );
      if (!rows[0] || rows[0].store_id !== storeId) {
        throw new PdNotFoundError(PdErrorCode.PRODUCT_NOT_FOUND, 'Product not found');
      }
      productTitle = rows[0].title;
    }

    if (!buyerId) throw new PdValidationError('A buyer or order is required to start this chat');

    const { rows: buyerRows } = await query<{ id: string; role: UserRole }>(
      'SELECT id, role FROM pd_user WHERE id = $1',
      [buyerId],
    );
    if (!buyerRows[0] || buyerRows[0].role !== UserRole.Customer) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Buyer not found');
    }

    return { buyer_id: buyerId, product_title: productTitle };
  }

  private async findConversation(type: ChatConversationType, params: { store_id?: string | null; buyer_id?: string | null; created_by?: string | null; order_id?: string | null; product_id?: string | null; subject?: string | null }) {
    if (type === 'buyer_seller') {
      const { rows } = await query<ChatConversationRow>(
        `${CHAT_SELECT}
         WHERE c.type = 'buyer_seller'
           AND c.status = 'open'
           AND c.store_id = $1
           AND c.buyer_id = $2
           AND c.order_id IS NOT DISTINCT FROM $3::varchar
           AND c.product_id IS NOT DISTINCT FROM $4::varchar
         LIMIT 1`,
        [params.store_id, params.buyer_id, params.order_id ?? null, params.product_id ?? null],
      );
      return rows[0] ?? null;
    }

    if (type === 'buyer_admin') {
      const { rows } = await query<ChatConversationRow>(
        `${CHAT_SELECT}
         WHERE c.type = 'buyer_admin'
           AND c.status = 'open'
           AND c.buyer_id = $1
           AND LOWER(c.subject) = LOWER($2)
         LIMIT 1`,
        [params.buyer_id, params.subject],
      );
      return rows[0] ?? null;
    }

    if (type === 'seller_seller') {
      const { rows } = await query<ChatConversationRow>(
        `${CHAT_SELECT}
         WHERE c.type = 'seller_seller'
           AND c.status = 'open'
           AND c.store_id = $1
           AND c.created_by = $2
           AND LOWER(c.subject) = LOWER($3)
         LIMIT 1`,
        [params.store_id, params.created_by, params.subject],
      );
      return rows[0] ?? null;
    }

    const { rows } = await query<ChatConversationRow>(
      `${CHAT_SELECT}
       WHERE c.type = 'seller_admin'
         AND c.status = 'open'
         AND c.store_id = $1
         AND LOWER(c.subject) = LOWER($2)
       LIMIT 1`,
      [params.store_id, params.subject],
    );
    return rows[0] ?? null;
  }

  private async findAnyBuyerSellerConversation(storeId: string, buyerId: string) {
    const { rows } = await query<ChatConversationRow>(
      `${CHAT_SELECT}
       WHERE c.type = 'buyer_seller'
         AND c.status = 'open'
         AND c.store_id = $1
         AND c.buyer_id = $2
       ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
       LIMIT 1`,
      [storeId, buyerId],
    );
    return rows[0] ?? null;
  }

  private async addParticipant(conversationId: string, userId: string, role: UserRole, storeId?: string | null, markRead = false) {
    await query(
      `INSERT INTO pd_chat_participant (conversation_id, user_id, role, store_id, last_read_at)
       VALUES ($1, $2, $3, $4, CASE WHEN $5::boolean THEN NOW() ELSE NULL END)
       ON CONFLICT (conversation_id, user_id)
       DO UPDATE SET role = EXCLUDED.role, store_id = EXCLUDED.store_id`,
      [conversationId, userId, role, storeId ?? null, markRead],
    );
  }

  private async createConversation(input: {
    type: ChatConversationType;
    store_id?: string | null;
    buyer_id?: string | null;
    seller_id?: string | null;
    order_id?: string | null;
    product_id?: string | null;
    subject: string;
    created_by: string;
    created_by_role?: UserRole;
    created_by_store_id?: string | null;
  }) {
    const id = pdId('chat');
    const conversation = await transaction(async (client) => {
      const { rows } = await client.query<ChatConversationRow>(
        `INSERT INTO pd_chat_conversation
          (id, type, store_id, buyer_id, seller_id, order_id, product_id, subject, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [
          id,
          input.type,
          input.store_id ?? null,
          input.buyer_id ?? null,
          input.seller_id ?? null,
          input.order_id ?? null,
          input.product_id ?? null,
          input.subject,
          input.created_by,
        ],
      );
      await client.query(
        `INSERT INTO pd_chat_participant (conversation_id, user_id, role, store_id, last_read_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (conversation_id, user_id) DO NOTHING`,
        [
          id,
          input.created_by,
          input.created_by_role ?? (input.type === 'buyer_admin' || (input.type === 'buyer_seller' && input.created_by === input.buyer_id) ? UserRole.Customer : UserRole.Vendor),
          input.created_by_store_id ?? input.store_id ?? null,
        ],
      );
      if (input.buyer_id && input.buyer_id !== input.created_by) {
        await client.query(
          `INSERT INTO pd_chat_participant (conversation_id, user_id, role, store_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (conversation_id, user_id) DO NOTHING`,
          [id, input.buyer_id, UserRole.Customer, null],
        );
      }
      if (input.seller_id && input.seller_id !== input.created_by) {
        await client.query(
          `INSERT INTO pd_chat_participant (conversation_id, user_id, role, store_id)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (conversation_id, user_id) DO NOTHING`,
          [id, input.seller_id, UserRole.Vendor, input.store_id],
        );
      }
      return rows[0];
    });
    return conversation;
  }

  async createBuyerSellerConversation(buyerId: string, input: ChatCreateInput) {
    const target = await this.resolveBuyerSellerTarget(buyerId, input);
    const subject = normalizeSubject(subjectFromContext({ ...input, product_title: target.product_title, store_name: target.store_name }));
    const existing = input.check_existing && !input.force_new
      ? await this.findAnyBuyerSellerConversation(target.store_id, buyerId)
      : await this.findConversation('buyer_seller', {
        store_id: target.store_id,
        buyer_id: buyerId,
        order_id: input.order_id ?? null,
        product_id: input.product_id ?? null,
      });
    if (existing && input.check_existing && !input.force_new) {
      return { ...(await this.getBuyerConversation(existing.id, buyerId)), existing: true };
    }
    const shouldCreateNew = Boolean(existing && input.force_new);
    if (existing && input.force_new) {
      await this.updateStatus(existing.id, 'closed');
    }
    const conversation = !shouldCreateNew && existing ? existing : await this.createConversation({
      type: 'buyer_seller',
      store_id: target.store_id,
      buyer_id: buyerId,
      seller_id: target.seller_id,
      order_id: input.order_id ?? null,
      product_id: input.product_id ?? null,
      subject,
      created_by: buyerId,
    });
    if (input.body?.trim() || input.attachments?.length) {
      await this.addBuyerMessage(conversation.id, buyerId, input.body, input.attachments);
    }
    return this.getBuyerConversation(conversation.id, buyerId);
  }

  async createStoreBuyerConversation(actor: ChatActorContext, input: ChatCreateInput) {
    if (!actor.store_id) throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Store is required');
    const store = await this.getStore(actor.store_id);
    const target = await this.resolveSellerBuyerTarget(store.id, input);
    const subject = normalizeSubject(subjectFromContext({ ...input, product_title: target.product_title, store_name: store.name }));
    const existing = await this.findConversation('buyer_seller', {
      store_id: store.id,
      buyer_id: target.buyer_id,
      order_id: input.order_id ?? null,
      product_id: input.product_id ?? null,
    });
    const conversation = existing ?? await this.createConversation({
      type: 'buyer_seller',
      store_id: store.id,
      buyer_id: target.buyer_id,
      seller_id: actor.id,
      order_id: input.order_id ?? null,
      product_id: input.product_id ?? null,
      subject,
      created_by: actor.id,
    });
    if (input.body?.trim() || input.attachments?.length) {
      await this.addStoreMessage(conversation.id, actor, input.body, input.attachments);
    }
    return this.getStoreConversation(conversation.id, store.id);
  }

  async createSellerAdminConversation(actor: ChatActorContext, input: ChatCreateInput) {
    if (!actor.store_id) throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Store is required');
    const store = await this.getStore(actor.store_id);
    const subject = normalizeSubject(input.subject, 'Support request');
    const existing = await this.findConversation('seller_admin', { store_id: store.id, subject });
    const conversation = existing ?? await this.createConversation({
      type: 'seller_admin',
      store_id: store.id,
      buyer_id: null,
      seller_id: actor.id,
      subject,
      created_by: actor.id,
    });
    if (input.body?.trim() || input.attachments?.length) {
      await this.addStoreMessage(conversation.id, actor, input.body, input.attachments);
    }
    return this.getStoreConversation(conversation.id, store.id);
  }

  async createBuyerAdminConversation(buyerId: string, input: ChatCreateInput) {
    const subject = normalizeSubject(input.subject, 'Marketplace support');
    const existing = await this.findConversation('buyer_admin', { buyer_id: buyerId, subject });
    const conversation = existing ?? await this.createConversation({
      type: 'buyer_admin',
      store_id: null,
      buyer_id: buyerId,
      seller_id: null,
      subject,
      created_by: buyerId,
    });
    if (input.body?.trim() || input.attachments?.length) {
      await this.addBuyerMessage(conversation.id, buyerId, input.body, input.attachments);
    }
    return this.getBuyerConversation(conversation.id, buyerId);
  }

  async createSellerSellerConversation(actor: ChatActorContext, input: ChatCreateInput) {
    if (!actor.store_id) throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Store is required');
    if (!input.store_id) throw new PdValidationError('Target store is required');
    if (input.store_id === actor.store_id) throw new PdValidationError('Use your seller inbox for your own store');
    const targetStore = await this.getStore(input.store_id);
    const subject = normalizeSubject(input.subject, `Seller chat with ${targetStore.name}`);
    const existing = await this.findConversation('seller_seller', { store_id: targetStore.id, created_by: actor.id, subject });
    const conversation = existing ?? await this.createConversation({
      type: 'seller_seller',
      store_id: targetStore.id,
      buyer_id: null,
      seller_id: targetStore.owner_id,
      product_id: input.product_id ?? null,
      subject,
      created_by: actor.id,
      created_by_role: actor.role,
      created_by_store_id: actor.store_id,
    });
    if (input.body?.trim() || input.attachments?.length) {
      await this.addStoreMessage(conversation.id, actor, input.body, input.attachments);
    }
    return this.getStoreConversation(conversation.id, actor.store_id, actor.id);
  }

  async createAdminSellerConversation(actor: ChatActorContext, input: ChatCreateInput) {
    if (!isAdminRole(actor.role)) throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Admin role required');
    if (!input.store_id) throw new PdValidationError('Store is required');
    const store = await this.getStore(input.store_id);
    const subject = normalizeSubject(input.subject, `Support with ${store.name}`);
    const existing = await this.findConversation('seller_admin', { store_id: store.id, subject });
    const conversation = existing ?? await this.createConversation({
      type: 'seller_admin',
      store_id: store.id,
      buyer_id: null,
      seller_id: store.owner_id,
      product_id: input.product_id ?? null,
      subject,
      created_by: actor.id,
      created_by_role: actor.role,
      created_by_store_id: null,
    });
    if (input.body?.trim() || input.attachments?.length) {
      await this.addAdminMessage(conversation.id, actor, input.body, input.attachments);
    }
    return this.getAdminConversation(conversation.id);
  }

  async createAdminBuyerConversation(actor: ChatActorContext, input: ChatCreateInput) {
    if (!isAdminRole(actor.role)) throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Admin role required');
    if (!input.buyer_id) throw new PdValidationError('Buyer is required');
    await this.getUser(input.buyer_id, UserRole.Customer);
    const subject = normalizeSubject(input.subject, 'Marketplace support');
    const existing = await this.findConversation('buyer_admin', { buyer_id: input.buyer_id, subject });
    const conversation = existing ?? await this.createConversation({
      type: 'buyer_admin',
      store_id: null,
      buyer_id: input.buyer_id,
      seller_id: null,
      subject,
      created_by: actor.id,
      created_by_role: actor.role,
      created_by_store_id: null,
    });
    if (input.body?.trim() || input.attachments?.length) {
      await this.addAdminMessage(conversation.id, actor, input.body, input.attachments);
    }
    return this.getAdminConversation(conversation.id);
  }

  async searchAdminChatTargets(kind: 'seller' | 'buyer', search: string) {
    const term = `%${search.trim()}%`;
    if (kind === 'buyer') {
      const { rows } = await query(
        `SELECT id, email,
                COALESCE(NULLIF(TRIM(CONCAT(COALESCE(first_name, ''), ' ', COALESCE(last_name, ''))), ''), email) AS name
         FROM pd_user
         WHERE role = $1
           AND ($2 = '%%' OR id ILIKE $2 OR email ILIKE $2 OR COALESCE(first_name, '') ILIKE $2 OR COALESCE(last_name, '') ILIKE $2)
         ORDER BY created_at DESC
         LIMIT 5`,
        [UserRole.Customer, term],
      );
      return rows;
    }
    const { rows } = await query(
      `SELECT s.id, s.name, s.subdomain, s.owner_id, u.email AS owner_email,
              COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email) AS owner_name
       FROM pd_store s
       LEFT JOIN pd_user u ON u.id = s.owner_id
       WHERE $1 = '%%'
          OR s.id ILIKE $1
          OR s.name ILIKE $1
          OR COALESCE(s.subdomain, '') ILIKE $1
          OR COALESCE(u.email, '') ILIKE $1
       ORDER BY s.created_at DESC
       LIMIT 5`,
      [term],
    );
    return rows;
  }

  async listBuyerConversations(buyerId: string, opts: { page?: number; limit?: number; status?: ChatConversationStatus; type?: ChatConversationType; search?: string } = {}) {
    return this.listConversations({ audience: 'buyer', actorId: buyerId, buyerId, ...opts });
  }

  async listStoreConversations(storeId: string, actorId: string, opts: { page?: number; limit?: number; status?: ChatConversationStatus; type?: ChatConversationType; search?: string } = {}) {
    return this.listConversations({ audience: 'seller', actorId, storeId, ...opts });
  }

  async listAdminConversations(adminId: string, opts: { page?: number; limit?: number; status?: ChatConversationStatus; type?: ChatConversationType; search?: string } = {}) {
    return this.listConversations({ audience: 'admin', actorId: adminId, ...opts });
  }

  private async listConversations(opts: {
    audience: 'buyer' | 'seller' | 'admin';
    actorId: string;
    buyerId?: string;
    storeId?: string;
    type?: ChatConversationType;
    status?: ChatConversationStatus;
    search?: string;
    page?: number;
    limit?: number;
  }) {
    const page = Math.max(1, opts.page ?? 1);
    const limit = Math.min(100, Math.max(1, opts.limit ?? 20));
    const offset = (page - 1) * limit;
    const params: unknown[] = [];
    const conditions: string[] = [];

    if (opts.audience === 'buyer') {
      params.push(opts.buyerId);
      conditions.push(`c.type IN ('buyer_seller', 'buyer_admin') AND c.buyer_id = $${params.length}`);
    } else if (opts.audience === 'seller') {
      params.push(opts.storeId);
      const storeParam = params.length;
      params.push(opts.actorId);
      const actorParam = params.length;
      conditions.push(`(
        c.store_id = $${storeParam}
        OR (
          c.type = 'seller_seller'
          AND EXISTS (
            SELECT 1 FROM pd_chat_participant sp
            WHERE sp.conversation_id = c.id AND sp.user_id = $${actorParam}
          )
        )
      )`);
    } else {
      conditions.push(`c.type IN ('seller_admin', 'buyer_admin')`);
    }

    if (opts.type) {
      params.push(opts.type);
      conditions.push(`c.type = $${params.length}`);
    }
    if (opts.status) {
      params.push(opts.status);
      conditions.push(`c.status = $${params.length}`);
    }
    if (opts.search?.trim()) {
      params.push(`%${opts.search.trim()}%`);
      conditions.push(`(
        c.subject ILIKE $${params.length}
        OR COALESCE(s.name, '') ILIKE $${params.length}
        OR COALESCE(buyer.email, '') ILIKE $${params.length}
        OR COALESCE(seller.email, '') ILIKE $${params.length}
        OR COALESCE(c.order_id, '') ILIKE $${params.length}
      )`);
    }

    const where = `WHERE ${conditions.join(' AND ')}`;
    const unreadCondition = opts.audience === 'admin'
      ? "m.sender_role NOT IN ('admin', 'super_admin')"
      : `m.sender_id IS DISTINCT FROM $${params.length + 1}`;

    const listParams = [...params, opts.actorId, limit, offset];
    const actorParamIndex = params.length + 1;
    const limitParamIndex = params.length + 2;
    const offsetParamIndex = params.length + 3;
    const { rows } = await query<ChatConversationRow & { unread_count: string }>(
      `${CHAT_SELECT}
       LEFT JOIN pd_chat_participant cp ON cp.conversation_id = c.id AND cp.user_id = $${actorParamIndex}
       ${where}
       ORDER BY COALESCE(c.last_message_at, c.created_at) DESC
       LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`.replace(
        'SELECT\n    c.*,',
        `SELECT\n    c.*,\n    COALESCE((\n      SELECT COUNT(*)\n      FROM pd_chat_message m\n      WHERE m.conversation_id = c.id\n        AND m.deleted_at IS NULL\n        AND ${unreadCondition}\n        AND m.created_at > COALESCE(cp.last_read_at, 'epoch'::timestamp)\n    ), 0)::text AS unread_count,`,
      ),
      listParams,
    );

    const { rows: countRows } = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM pd_chat_conversation c
       LEFT JOIN pd_store s ON s.id = c.store_id
       LEFT JOIN pd_user buyer ON buyer.id = c.buyer_id
       LEFT JOIN pd_user seller ON seller.id = c.seller_id
       ${where}`,
      params,
    );

    const total = parseInt(countRows[0]?.count ?? '0', 10);
    return {
      data: rows.map(parseUnreadCount),
      meta: { page, limit, total, total_pages: Math.ceil(total / limit) },
    };
  }

  private async getConversationById(id: string) {
    const { rows } = await query<ChatConversationRow>(`${CHAT_SELECT} WHERE c.id = $1 LIMIT 1`, [id]);
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Conversation not found');
    return rows[0];
  }

  private async listMessages(conversationId: string) {
    const { rows } = await query<ChatMessageRow>(
      `SELECT
         m.*,
         u.email AS sender_email,
         COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email) AS sender_name
       FROM pd_chat_message m
       LEFT JOIN pd_user u ON u.id = m.sender_id
       WHERE m.conversation_id = $1 AND m.deleted_at IS NULL
       ORDER BY m.created_at ASC`,
      [conversationId],
    );
    return rows;
  }

  private async details(conversation: ChatConversationRow): Promise<ChatDetails> {
    return { conversation, messages: await this.listMessages(conversation.id) };
  }

  async getBuyerConversation(id: string, buyerId: string) {
    const conversation = await this.getConversationById(id);
    if (!['buyer_seller', 'buyer_admin'].includes(conversation.type) || conversation.buyer_id !== buyerId) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Conversation not found');
    }
    return this.details(conversation);
  }

  private async hasParticipant(conversationId: string, userId: string) {
    const { rows } = await query<{ exists: boolean }>(
      `SELECT EXISTS (
        SELECT 1 FROM pd_chat_participant WHERE conversation_id = $1 AND user_id = $2
      ) AS exists`,
      [conversationId, userId],
    );
    return Boolean(rows[0]?.exists);
  }

  async getStoreConversation(id: string, storeId: string, actorId?: string) {
    const conversation = await this.getConversationById(id);
    if (conversation.store_id !== storeId && !(actorId && conversation.type === 'seller_seller' && await this.hasParticipant(conversation.id, actorId))) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Conversation not found');
    }
    return this.details(conversation);
  }

  async getAdminConversation(id: string) {
    const conversation = await this.getConversationById(id);
    if (!['seller_admin', 'buyer_admin'].includes(conversation.type)) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Conversation not found');
    }
    return this.details(conversation);
  }

  async addBuyerMessage(conversationId: string, buyerId: string, body?: string | null, attachments?: ChatAttachmentInput[]) {
    const conversation = await this.getConversationById(conversationId);
    if (!['buyer_seller', 'buyer_admin'].includes(conversation.type) || conversation.buyer_id !== buyerId) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Conversation not found');
    }
    await this.insertMessage(conversation, { id: buyerId, role: UserRole.Customer }, body, attachments);
    return this.getBuyerConversation(conversationId, buyerId);
  }

  async addStoreMessage(conversationId: string, actor: ChatActorContext, body?: string | null, attachments?: ChatAttachmentInput[]) {
    if (!actor.store_id) throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Store is required');
    const conversation = await this.getConversationById(conversationId);
    if (conversation.store_id !== actor.store_id && !(conversation.type === 'seller_seller' && await this.hasParticipant(conversation.id, actor.id))) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Conversation not found');
    }
    await this.insertMessage(conversation, actor, body, attachments);
    return this.getStoreConversation(conversationId, actor.store_id, actor.id);
  }

  async addAdminMessage(conversationId: string, actor: ChatActorContext, body?: string | null, attachments?: ChatAttachmentInput[]) {
    if (!isAdminRole(actor.role)) throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Admin role required');
    const conversation = await this.getConversationById(conversationId);
    if (!['seller_admin', 'buyer_admin'].includes(conversation.type)) {
      throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Conversation not found');
    }
    await this.insertMessage(conversation, actor, body, attachments);
    return this.getAdminConversation(conversationId);
  }

  private async insertMessage(conversation: ChatConversationRow, actor: ChatActorContext, body?: string | null, attachments?: ChatAttachmentInput[]) {
    if (conversation.status === 'closed') {
      throw new PdValidationError('This conversation is closed');
    }
    const limits = await this.getChatLimits();
    await this.assertMessageRateLimit(actor, limits);
    const messageId = pdId('chat_msg');
    const normalizedAttachments = normalizeAttachments(attachments, actor, limits);
    const normalizedBody = normalizeMessageBody(body, normalizedAttachments.length > 0, limits.maxMessageLength);
    await transaction(async (client) => {
      await client.query(
        `INSERT INTO pd_chat_message (id, conversation_id, sender_id, sender_role, body, attachments)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)`,
        [messageId, conversation.id, actor.id, actor.role, normalizedBody, JSON.stringify(normalizedAttachments)],
      );
      await client.query(
        `UPDATE pd_chat_conversation
         SET last_message_at = NOW(), updated_at = NOW()
         WHERE id = $1`,
        [conversation.id],
      );
      await client.query(
        `INSERT INTO pd_chat_participant (conversation_id, user_id, role, store_id, last_read_at)
         VALUES ($1, $2, $3, $4, NOW())
         ON CONFLICT (conversation_id, user_id)
         DO UPDATE SET last_read_at = NOW(), role = EXCLUDED.role, store_id = EXCLUDED.store_id`,
        [conversation.id, actor.id, actor.role, actor.store_id ?? null],
      );
    });

    const { rows } = await query<ChatMessageRow>(
      `SELECT m.*, u.email AS sender_email,
              COALESCE(NULLIF(TRIM(CONCAT(COALESCE(u.first_name, ''), ' ', COALESCE(u.last_name, ''))), ''), u.email) AS sender_name
       FROM pd_chat_message m
       LEFT JOIN pd_user u ON u.id = m.sender_id
       WHERE m.id = $1`,
      [messageId],
    );
    const message = rows[0];
    this.emitMessage(conversation, message);
    return message;
  }

  private emitMessage(conversation: ChatConversationRow, message: ChatMessageRow) {
    const payload = {
      conversation_id: conversation.id,
      type: conversation.type,
      store_id: conversation.store_id,
      buyer_id: conversation.buyer_id,
      sender_id: message.sender_id,
      message,
    };

    if (conversation.type === 'buyer_seller') {
      if (message.sender_id === conversation.buyer_id) {
        if (conversation.store_id) socketGateway.emitToStore(conversation.store_id, 'chat_message', payload);
        if (conversation.seller_id) socketGateway.emitToUser(conversation.seller_id, 'chat_message', payload);
      } else if (conversation.buyer_id) {
        socketGateway.emitToUser(conversation.buyer_id, 'chat_message', payload);
      }
      return;
    }

    if (conversation.type === 'buyer_admin') {
      if (message.sender_role === UserRole.Admin || message.sender_role === UserRole.SuperAdmin) {
        if (conversation.buyer_id) socketGateway.emitToUser(conversation.buyer_id, 'chat_message', payload);
      } else {
        socketGateway.emitToAdmins('chat_message', payload);
      }
      return;
    }

    if (conversation.type === 'seller_seller') {
      if (message.sender_id === conversation.seller_id) {
        if (conversation.created_by) socketGateway.emitToUser(conversation.created_by, 'chat_message', payload);
      } else {
        if (conversation.store_id) socketGateway.emitToStore(conversation.store_id, 'chat_message', payload);
        if (conversation.seller_id) socketGateway.emitToUser(conversation.seller_id, 'chat_message', payload);
      }
      return;
    }

    if (message.sender_role === UserRole.Admin || message.sender_role === UserRole.SuperAdmin) {
      if (conversation.store_id) socketGateway.emitToStore(conversation.store_id, 'chat_message', payload);
      if (conversation.seller_id) socketGateway.emitToUser(conversation.seller_id, 'chat_message', payload);
    } else {
      socketGateway.emitToAdmins('chat_message', payload);
    }
  }

  async canAccessAttachmentKey(actor: ChatActorContext, key: string) {
    const normalizedKey = key.replace(/^\/+/, '');
    if (!normalizedKey.startsWith('chat/') || normalizedKey.includes('..')) return false;
    const isAdmin = isAdminRole(actor.role);
    const attachmentFilter = JSON.stringify([{ file_key: normalizedKey }]);
    const { rows } = await query<{ allowed: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM pd_chat_message m
         JOIN pd_chat_conversation c ON c.id = m.conversation_id
         WHERE m.deleted_at IS NULL
           AND m.attachments @> $1::jsonb
           AND (
             EXISTS (
               SELECT 1
               FROM pd_chat_participant cp
               WHERE cp.conversation_id = c.id
                 AND cp.user_id = $2
             )
             OR ($3::boolean = true AND c.type IN ('seller_admin', 'buyer_admin'))
             OR ($4::varchar IS NOT NULL AND c.store_id = $4)
           )
       ) AS allowed`,
      [attachmentFilter, actor.id, isAdmin, actor.store_id ?? null],
    );
    return Boolean(rows[0]?.allowed);
  }
  async markBuyerRead(conversationId: string, buyerId: string) {
    await this.getBuyerConversation(conversationId, buyerId);
    await this.addParticipant(conversationId, buyerId, UserRole.Customer, null, true);
    return { success: true };
  }

  async markStoreRead(conversationId: string, actor: ChatActorContext) {
    if (!actor.store_id) throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Store is required');
    await this.getStoreConversation(conversationId, actor.store_id, actor.id);
    await this.addParticipant(conversationId, actor.id, actor.role, actor.store_id, true);
    return { success: true };
  }

  async markAdminRead(conversationId: string, actor: ChatActorContext) {
    if (!isAdminRole(actor.role)) throw new PdForbiddenError(PdErrorCode.PERM_FORBIDDEN, 'Admin role required');
    await this.getAdminConversation(conversationId);
    await this.addParticipant(conversationId, actor.id, actor.role, null, true);
    return { success: true };
  }

  async updateStatusForBuyer(conversationId: string, buyerId: string, status: ChatConversationStatus) {
    await this.getBuyerConversation(conversationId, buyerId);
    return this.updateStatus(conversationId, status);
  }

  async updateStatusForStore(conversationId: string, storeId: string, status: ChatConversationStatus, actorId?: string) {
    await this.getStoreConversation(conversationId, storeId, actorId);
    return this.updateStatus(conversationId, status);
  }

  async updateStatusForAdmin(conversationId: string, status: ChatConversationStatus) {
    await this.getAdminConversation(conversationId);
    return this.updateStatus(conversationId, status);
  }

  private async updateStatus(conversationId: string, status: ChatConversationStatus) {
    const { rows } = await query<ChatConversationRow>(
      `UPDATE pd_chat_conversation
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [conversationId, status],
    );
    if (!rows[0]) throw new PdNotFoundError(PdErrorCode.NOT_FOUND, 'Conversation not found');
    return rows[0];
  }
}

export const chatService = new ChatService();
