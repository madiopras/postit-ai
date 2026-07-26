# PostIt AI - Chatbot RAG Setup & Deployment Guide

> **Project:** PostIt AI — Chatbot RAG untuk FAQ & SOP  
> **Stack:** Next.js 16 + Drizzle ORM + pgvector (PostgreSQL 16) + 9router (embedding/LLM)

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- Docker & Docker Compose
- PostgreSQL 16 (via Docker)
- Environment variables configured

### 1. Installation

```bash
# Clone repository
git clone <repo-url>
cd simpleai

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local
# Edit .env.local with your configuration
```

### 2. Database Setup

```bash
# Start PostgreSQL with pgvector
docker-compose up -d

# Run Drizzle migrations
npx drizzle-kit push

# (Optional) Seed initial data
npm run seed
```

### 3. Environment Configuration

Create `.env.local`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/postit_ai

# Auth
AUTH_SECRET=your-secret-key-here

# Embedding Service (9router)
NEXT_PUBLIC_ROUTER_EMBEDDING=http://localhost:8001
EMBEDDING_API_KEY=your-embedding-api-key

# LLM Service (9router)
NEXT_PUBLIC_ROUTER_LLM=http://localhost:8002
LLM_API_KEY=your-llm-api-key
```

### 4. Development

```bash
# Start development server
npm run dev

# Open browser
open http://localhost:3000
```

## 📋 Project Structure

```
simpleai/
├── app/
│   ├── api/
│   │   ├── auth/              # Authentication
│   │   ├── chat/              # Chat with RAG
│   │   ├── config/            # Config management
│   │   ├── faq/               # FAQ CRUD
│   │   ├── sop/               # SOP CRUD
│   │   ├── documents/         # Documents monitoring
│   │   └── embed/             # Embedding service
│   ├── dashboard/
│   │   ├── config/            # Config UI
│   │   ├── faq/               # FAQ management
│   │   ├── sop/               # SOP management
│   │   └── documents/         # Documents monitoring
│   ├── login/                 # Login page
│   ├── page.tsx               # Chat interface
│   └── layout.tsx             # Root layout
├── components/
│   ├── ui/                    # Shadcn UI components
│   ├── chat-*                 # Chat components
│   ├── error-boundary.tsx     # Error handling
│   └── ...
├── lib/
│   ├── auth.ts                # Authentication
│   ├── config.ts              # Config management
│   ├── db.ts                  # Database client
│   ├── embedding.ts           # Embedding service
│   ├── llm.ts                 # LLM service
│   ├── rag.ts                 # RAG pipeline
│   ├── chunking.ts            # Text chunking
│   ├── vector-sync.ts         # Vector store sync
│   └── schema.ts              # Database schema
├── middleware.ts              # Auth middleware
├── drizzle.config.ts          # Drizzle config
└── package.json
```

## 🔐 Authentication

### Login
- URL: `http://localhost:3000/login`
- Default user: `admin` / `admin123`

### Protected Routes
- `/dashboard/*` - Admin dashboard (protected)
- Middleware redirects to login if not authenticated

## 🧠 Core Features

### 1. Configuration Management
**Endpoint:** `GET/PUT /api/config`
- Manage embedding & LLM models dynamically
- Test connectivity before applying
- No redeployment needed

### 2. FAQ Management
**Endpoints:** `GET/POST/PUT/DELETE /api/faq`
- Full CRUD operations
- Automatic vector embedding
- Search, filter, pagination
- Status tracking (draft/published/error)

**UI:** Dashboard → FAQ
- Create/edit/delete forms
- Search & filter
- Manual resync
- Pagination

### 3. SOP Management
**Endpoints:** `GET/POST/PUT/DELETE /api/sop`
- Full CRUD operations
- Content chunking with preview
- Automatic vector sync
- Status tracking

**UI:** Dashboard → SOP
- Chunk preview visualization
- Create/edit/delete forms
- Content size monitoring
- Manual resync

### 4. Chat Interface
**Endpoint:** `POST /api/chat` (streaming)
- RAG-powered responses
- Real-time streaming
- Source attribution
- Session history

**UI:** Home page (`/`)
- Real-time chat
- Sources panel
- Session management

### 5. Documents Monitoring
**Endpoints:** `GET /api/documents`, `POST /api/documents/[id]/resync`
- Real-time vector store status
- Statistics dashboard
- Error recovery
- Advanced filtering

**UI:** Dashboard → Documents
- Statistics cards
- Status filtering
- Manual resync controls
- Pagination

## 🗄️ Database Schema

### Key Tables
- `users` - Admin authentication
- `faqs` - FAQ content
- `sops` - SOP content
- `documents` - Vector embeddings
- `chats` - Chat sessions
- `messages` - Chat messages
- `app_config` - AI model configuration

### Data Types
- `embedding` - pgvector (1536 dimensions)
- `status` - 'draft' | 'published' | 'error'
- `type` - 'faq' | 'sop'

## 🔄 RAG Pipeline

### Flow
1. **Content Creation** - FAQ/SOP created in dashboard
2. **Chunking** - Content split into ~800 token chunks
3. **Embedding** - Each chunk converted to vector
4. **Storage** - Vectors stored in pgvector with metadata
5. **Query** - User question embedded and searched
6. **Retrieval** - Top-K similar documents found
7. **Generation** - LLM generates response with context

### Configuration
- Chunk size: ~800 tokens (3.2KB)
- Chunk overlap: 400 characters
- Search limit: 5 documents
- Min similarity score: 0.5

## ✅ Phase Completion Checklist

### Phase 1-4: Core Infrastructure ✓
- [x] Project initialization & database
- [x] Authentication & middleware
- [x] Config system with dynamic models
- [x] Core RAG pipeline
- [x] Chat UI with streaming

### Phase 5-6: Content Management ✓
- [x] FAQ CRUD & vector sync
- [x] SOP CRUD with chunking
- [x] Import/export CSV support

### Phase 7-8: Monitoring & Polish ✓
- [x] Documents monitoring dashboard
- [x] Error recovery with manual resync
- [x] Error boundaries for UI
- [x] Skeleton loading states
- [x] Toast notifications
- [x] Responsive mobile design

## 🧪 Testing

### Health Checks
```bash
# API health
curl http://localhost:3000/api/config

# Test embedding
curl -X POST http://localhost:3000/api/config/test \
  -H "Content-Type: application/json" \
  -d '{"type":"embedding"}'

# Test LLM
curl -X POST http://localhost:3000/api/config/test \
  -H "Content-Type: application/json" \
  -d '{"type":"llm"}'
```

### Manual Test Flow
1. Login with admin credentials
2. Configure embedding & LLM services
3. Create sample FAQs
4. Create sample SOPs
5. Test chat with RAG
6. Verify documents syncing
7. Test error recovery

## 📊 Performance

### Caching
- Config cached in memory (1-hour TTL)
- Next.js response caching
- Database query optimization

### Vector Search
- Cosine similarity via pgvector
- Top-K retrieval (default: 5)
- Fast indexed lookups

### Pagination
- Default: 10 items per page
- Efficient offset-based pagination
- Configurable page size

## 🚀 Production Deployment

### Build & Deploy
```bash
# Production build
npm run build

# Start production server
npm start
```

### Environment Setup
- Set `AUTH_SECRET` to secure random value
- Configure `DATABASE_URL` for production DB
- Set embedding & LLM endpoints
- Use environment variables for API keys

### Database Migrations
```bash
# Run migrations in production
npx drizzle-kit push:pg
```

### Monitoring
- Check error logs in dashboard
- Monitor document sync status
- Track chat usage & feedback
- Review API response times

## 🐛 Troubleshooting

### Database Connection Error
```
Solution: Check DATABASE_URL and PostgreSQL is running
docker-compose ps  # Verify containers
```

### Embedding Service Not Found
```
Solution: Configure NEXT_PUBLIC_ROUTER_EMBEDDING
Check 9router service is running on correct port
```

### LLM Service Timeout
```
Solution: Configure NEXT_PUBLIC_ROUTER_LLM
Increase timeout in lib/llm.ts if needed
```

### Vector Search No Results
```
Solution: Check documents are synced in Documents page
Run manual resync on failed documents
```

## 📚 API Documentation

### Chat API
```
POST /api/chat
Content-Type: application/json

{
  "message": "How to...",
  "sessionId": "uuid"
}

Response: Server-Sent Events (streaming)
```

### FAQ CRUD
```
GET /api/faq?search=...&category=...&status=...&page=1&pageSize=10
POST /api/faq { question, answer, category }
PUT /api/faq/{id} { question?, answer?, category?, status? }
DELETE /api/faq/{id}
```

### SOP CRUD
```
GET /api/sop?search=...&category=...&status=...&page=1&pageSize=10
POST /api/sop { title, content, category }
PUT /api/sop/{id} { title?, content?, category?, status? }
DELETE /api/sop/{id}
```

### Documents API
```
GET /api/documents?search=...&type=...&status=...&page=1&pageSize=10
POST /api/documents/{id}/resync
```

### Config API
```
GET /api/config
PUT /api/config { embeddingBaseUrl, embeddingModel, llmBaseUrl, llmModel }
POST /api/config/test { type: 'embedding' | 'llm' }
```

## 📝 License

PostIt AI - Open Source RAG Chatbot

## 🤝 Support

For issues or questions, please check:
- Phase plan: `enhancement/go1/phase-plan.md`
- Architecture: `enhancement/go1/architecture.md`
- PRD: `enhancement/go1/prd.md`