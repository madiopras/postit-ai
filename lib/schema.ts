import { pgTable, uuid, text, integer, doublePrecision, vector, jsonb, timestamp, index, uniqueIndex, boolean, customType } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return 'bytea';
  },
});

export const USER_ROLES = ['super_admin', 'admin', 'user'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export const USER_STATUSES = ['active', 'inactive', 'blocked'] as const;
export type UserStatus = (typeof USER_STATUSES)[number];

// ─── Users (for Auth) ───────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  displayName: text('display_name'),
  role: text('role').notNull().default('user').$type<UserRole>(),
  status: text('status').notNull().default('active').$type<UserStatus>(),
  blockedAt: timestamp('blocked_at', { withTimezone: true }),
  blockedBy: uuid('blocked_by'),
  blockReason: text('block_reason'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── FAQs ────────────────────────────────────────────────
export const faqs = pgTable('faqs', {
  id: uuid('id').defaultRandom().primaryKey(),
  question: text('question').notNull(),
  answer: text('answer').notNull(),
  category: text('category'),
  status: text('status').default('draft').$type<'draft' | 'published' | 'error'>(),
  usageCount: integer('usage_count').default(0),
  accuracy: integer('accuracy').default(0),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  // Dashboard list filters (app/api/faq/route.ts).
  index('idx_faqs_status').on(table.status),
  index('idx_faqs_category').on(table.category),
]);

// ─── SOPs ────────────────────────────────────────────────
export const sops = pgTable('sops', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  category: text('category'),
  requiresLogin: boolean('requires_login').notNull().default(false),
  status: text('status').default('draft').$type<'draft' | 'published' | 'error'>(),
  publishedVersionId: uuid('published_version_id'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  // Dashboard list filters (app/api/sop/route.ts).
  index('idx_sops_status').on(table.status),
  index('idx_sops_category').on(table.category),
]);

// ─── Immutable SOP Versions ──────────────────────────────
export const sopVersions = pgTable('sop_versions', {
  id: uuid('id').defaultRandom().primaryKey(),
  sopId: uuid('sop_id').notNull().references(() => sops.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  indexingStatus: text('indexing_status').notNull().default('draft').$type<'draft' | 'ready' | 'error'>(),
  createdBy: uuid('created_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  publishedAt: timestamp('published_at', { withTimezone: true }),
}, (table) => [
  uniqueIndex('idx_sop_versions_sop_number').on(table.sopId, table.versionNumber),
  index('idx_sop_versions_sop_created').on(table.sopId, table.createdAt),
]);

// ─── SOP Version Attachments ─────────────────────────────
export const sopAttachments = pgTable('sop_attachments', {
  id: uuid('id').defaultRandom().primaryKey(),
  sopVersionId: uuid('sop_version_id').notNull().references(() => sopVersions.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  mediaType: text('media_type').notNull(),
  size: integer('size').notNull(),
  checksum: text('checksum').notNull(),
  data: bytea('data').notNull(),
  extractionStatus: text('extraction_status').notNull().default('pending').$type<'pending' | 'ready' | 'error'>(),
  extractedText: text('extracted_text'),
  extractionError: text('extraction_error'),
  extractedAt: timestamp('extracted_at', { withTimezone: true }),
  parserVersion: text('parser_version'),
  extractedCharacterCount: integer('extracted_character_count'),
  extractionMetadata: jsonb('extraction_metadata').$type<{
    sections: Array<{
      label: string;
      start: number;
      end: number;
      pageNumber?: number;
      sheetName?: string;
      slideNumber?: number;
    }>;
  }>(),
  uploadedBy: uuid('uploaded_by').references(() => users.id, { onDelete: 'set null' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  uniqueIndex('idx_sop_attachments_version_filename').on(table.sopVersionId, table.filename),
  index('idx_sop_attachments_version').on(table.sopVersionId),
  index('idx_sop_attachments_version_extraction').on(table.sopVersionId, table.extractionStatus),
]);

// ─── Documents (Vector Store) ────────────────────────────
export const documents = pgTable('documents', {
  id: uuid('id').defaultRandom().primaryKey(),
  type: text('type').notNull().$type<'faq' | 'sop'>(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  chunkIndex: integer('chunk_index').default(0),
  parentId: uuid('parent_id'),
  sourceId: uuid('source_id'),
  sopVersionId: uuid('sop_version_id').references(() => sopVersions.id, { onDelete: 'cascade' }),
  sopAttachmentId: uuid('sop_attachment_id').references(() => sopAttachments.id, { onDelete: 'cascade' }),
  embedding: vector('embedding', { dimensions: 1536 }),
  metadata: jsonb('metadata').$type<Record<string, unknown>>().default({}),
  status: text('status').default('draft').$type<'draft' | 'published' | 'error'>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  // Serves the ORDER BY in searchSimilarDocuments (lib/vector-sync.ts).
  // The opclass must match the distance operator used there (`<=>` = cosine);
  // an l2/ip index would simply be ignored by the planner.
  index('idx_documents_embedding').using('hnsw', table.embedding.op('vector_cosine_ops')),
  // Sync and delete paths look documents up by (type, source_id).
  index('idx_documents_type_source').on(table.type, table.sourceId),
  index('idx_documents_sop_version').on(table.sopVersionId),
  index('idx_documents_sop_attachment').on(table.sopAttachmentId),
  // Retrieval filters on status = 'published'.
  index('idx_documents_status').on(table.status),
  // Supports the lexical half of hybrid retrieval. The `simple` dictionary is
  // intentionally language-neutral because the knowledge base can contain
  // Indonesian, English, product codes, and organization-specific terms.
  index('idx_documents_search').using(
    'gin',
    sql`to_tsvector('simple', coalesce(${table.title}, '') || ' ' || coalesce(${table.content}, ''))`
  ),
]);

// ─── Chats ──────────────────────────────────────────────
// One row per *conversation*. `visitor_id` identifies the browser (a UUID kept
// in localStorage), so one visitor can hold many conversations. The previous
// `session_id` column conflated the two — the API looked up a chat by it with
// findFirst, which capped every visitor at a single conversation for life.
export const chats = pgTable('chats', {
  id: uuid('id').defaultRandom().primaryKey(),
  title: text('title').default('New Chat'),
  visitorId: text('visitor_id'),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  // Sidebar lists a visitor's conversations, most recently updated first.
  index('idx_chats_visitor_id').on(table.visitorId, table.updatedAt),
  index('idx_chats_user_id').on(table.userId, table.updatedAt),
]);

// ─── Messages ───────────────────────────────────────────
export const messages = pgTable('messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  chatId: uuid('chat_id').notNull().references(() => chats.id, { onDelete: 'cascade' }),
  role: text('role').notNull().$type<'user' | 'assistant'>(),
  content: text('content').notNull(),
  sources: jsonb('sources').default([]),
  feedback: text('feedback').$type<'thumbs_up' | 'thumbs_down'>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  // Loading a conversation reads every message for one chat, in order.
  index('idx_messages_chat_id').on(table.chatId, table.createdAt),
]);

// ─── App Config (AI Model Configuration) ─────────────────
export const appConfig = pgTable('app_config', {
  id: uuid('id').defaultRandom().primaryKey(),
  embeddingBaseUrl: text('embedding_base_url'),
  embeddingModel: text('embedding_model'),
  embeddingApiKey: text('embedding_api_key'),
  llmBaseUrl: text('llm_base_url'),
  llmModel: text('llm_model'),
  llmApiKey: text('llm_api_key'),
  aiPersona: text('ai_persona').notNull().default('You are a helpful assistant for PostIt AI.'),
  aiTone: text('ai_tone').notNull().default('professional').$type<'formal' | 'professional' | 'friendly'>(),
  aiDetailLevel: text('ai_detail_level').notNull().default('medium').$type<'concise' | 'medium' | 'detailed'>(),
  aiLanguage: text('ai_language').notNull().default('same_as_user').$type<'same_as_user' | 'id' | 'en'>(),
  aiUseEmoji: boolean('ai_use_emoji').notNull().default(false),
  responseKnowledgeOnly: boolean('response_knowledge_only').notNull().default(true),
  responseNoHallucination: boolean('response_no_hallucination').notNull().default(true),
  responseFallbackMessage: text('response_fallback_message').notNull().default(
    'Informasi belum tersedia dalam Knowledge Base. Silakan hubungi administrator atau pihak terkait.'
  ),
  responseForbiddenWords: jsonb('response_forbidden_words').notNull().default([]).$type<string[]>(),
  responseRequiredWords: jsonb('response_required_words').notNull().default([]).$type<
    Array<{ phrase: string; condition: string }>
  >(),
  retrievalTopK: integer('retrieval_top_k').notNull().default(5),
  retrievalSimilarityThreshold: doublePrecision('retrieval_similarity_threshold').notNull().default(0.5),
  retrievalSourcePriority: text('retrieval_source_priority').notNull().default('balanced').$type<
    'balanced' | 'faq_first' | 'sop_first'
  >(),
  retrievalSelectionRule: text('retrieval_selection_rule').notNull().default('highest_score').$type<
    'highest_score' | 'diverse_sources'
  >(),
  retrievalMaxContextDocuments: integer('retrieval_max_context_documents').notNull().default(5),
  isActive: text('is_active').default('false').$type<'true' | 'false'>(),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── Security Audit Log ──────────────────────────────────
export const auditLogs = pgTable('audit_logs', {
  id: uuid('id').defaultRandom().primaryKey(),
  actorId: uuid('actor_id').references(() => users.id, { onDelete: 'set null' }),
  actorUsername: text('actor_username').notNull(),
  actorRole: text('actor_role').notNull().$type<UserRole>(),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id'),
  metadata: jsonb('metadata').notNull().default({}).$type<Record<string, unknown>>(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_audit_logs_created_at').on(table.createdAt),
  index('idx_audit_logs_actor_created').on(table.actorId, table.createdAt),
  index('idx_audit_logs_entity_created').on(table.entityType, table.entityId, table.createdAt),
  index('idx_audit_logs_action_created').on(table.action, table.createdAt),
]);

// ─── Relations helper type ──────────────────────────────
export type Document = typeof documents.$inferSelect;
export type Faq = typeof faqs.$inferSelect;
export type Sop = typeof sops.$inferSelect;
export type SopVersion = typeof sopVersions.$inferSelect;
export type SopAttachment = typeof sopAttachments.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type User = typeof users.$inferSelect;
export type AppConfig = typeof appConfig.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
