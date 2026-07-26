import { pgTable, uuid, text, integer, vector, jsonb, timestamp, index } from 'drizzle-orm/pg-core';

// ─── Users (for Auth) ───────────────────────────────────
export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: text('username').notNull().unique(),
  password: text('password').notNull(),
  displayName: text('display_name'),
  role: text('role').default('admin').$type<'admin' | 'editor'>(),
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
  status: text('status').default('draft').$type<'draft' | 'published' | 'error'>(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  // Dashboard list filters (app/api/sop/route.ts).
  index('idx_sops_status').on(table.status),
  index('idx_sops_category').on(table.category),
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
  // Retrieval filters on status = 'published'.
  index('idx_documents_status').on(table.status),
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
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
}, (table) => [
  // Sidebar lists a visitor's conversations, most recently updated first.
  index('idx_chats_visitor_id').on(table.visitorId, table.updatedAt),
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
  isActive: text('is_active').default('false').$type<'true' | 'false'>(),
  updatedBy: uuid('updated_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

// ─── Relations helper type ──────────────────────────────
export type Document = typeof documents.$inferSelect;
export type Faq = typeof faqs.$inferSelect;
export type Sop = typeof sops.$inferSelect;
export type Chat = typeof chats.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type User = typeof users.$inferSelect;
export type AppConfig = typeof appConfig.$inferSelect;
