# 📄 Document Q&A Bot

A full-stack AI-powered application that lets you upload any PDF and ask natural language questions about it. Built using Retrieval-Augmented Generation (RAG) — combining semantic search with a large language model to give accurate, document-grounded answers.

> **Live demo:** _add your deployed URL here_
> **Tech stack:** FastAPI · ChromaDB · Gemini Embeddings · OpenRouter LLM · React · Vite · Tailwind CSS

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Architecture](#2-architecture)
3. [Folder Structure](#3-folder-structure)
4. [Tech Stack & Why Each Was Chosen](#4-tech-stack--why-each-was-chosen)
5. [Getting Started (Local Setup)](#5-getting-started-local-setup)
6. [API Reference](#6-api-reference)
7. [Errors Encountered & How They Were Fixed](#7-errors-encountered--how-they-were-fixed)
8. [Security Implementation](#8-security-implementation)
9. [System Design & Scalability](#9-system-design--scalability)
10. [Interview Q&A](#10-interview-qa)
11. [Deployment Guide](#11-deployment-guide)
12. [Future Improvements](#12-future-improvements)

---

## 1. Project Overview

### What it does

1. User uploads a PDF through the React frontend
2. The backend extracts text, splits it into overlapping chunks, and generates vector embeddings using Gemini
3. Embeddings and chunks are stored in ChromaDB (a local vector database)
4. When the user asks a question, the question is embedded and the top 3 most semantically similar chunks are retrieved
5. Those chunks are sent as context to an LLM (via OpenRouter), which generates a grounded answer
6. The answer is returned to the frontend along with the source chunks for transparency

### What is RAG?

**Retrieval-Augmented Generation (RAG)** solves the problem that LLMs have no knowledge of your private documents. Instead of fine-tuning (expensive), RAG retrieves the relevant parts of your document at query time and injects them into the prompt as context. The LLM then answers based on that context rather than hallucinating from training data.

```
Without RAG:  User question → LLM → answer (may hallucinate)
With RAG:     User question → retrieve relevant chunks → LLM + context → grounded answer
```

---

## 2. Architecture

### Ingestion Pipeline (runs once on upload)

```
PDF Upload
    │
    ▼
Extract Text (PyMuPDF)
    │
    ▼
Split into Chunks (~500 words, 50-word overlap)
    │
    ▼
Embed each chunk (Gemini text-embedding-001)
    │
    ▼
Store chunks + embeddings in ChromaDB
    │
    ▼
Return doc_id to frontend
```

### Query Pipeline (runs on every question)

```
User Question
    │
    ▼
Embed question (Gemini text-embedding-001, task: RETRIEVAL_QUERY)
    │
    ▼
Similarity search in ChromaDB (top 3 chunks)
    │
    ▼
Build prompt: context + question
    │
    ▼
Send to LLM via OpenRouter (gpt-oss-20b:free)
    │
    ▼
Return answer + source chunks to frontend
```

### Why overlapping chunks?

Chunks overlap by 50 words so that context at chunk boundaries is never lost. Without overlap, a sentence split across two chunks would lose its meaning in both.

---

## 3. Folder Structure

```
doc-qa-bot/
├── backend/
│   ├── main.py           # FastAPI app, endpoints, security middleware
│   ├── ingest.py         # PDF extraction, chunking, embedding, ChromaDB storage
│   ├── query.py          # Retrieval and LLM answer generation
│   ├── config.py         # All config and env vars in one place
│   ├── requirements.txt  # Python dependencies
│   ├── .env              # API keys (never committed)
│   └── .gitignore
└── frontend/
    ├── src/
    │   ├── App.jsx        # Root component, manages upload vs chat state
    │   ├── Upload.jsx     # Drag-and-drop PDF uploader
    │   ├── Chat.jsx       # Chat interface with source chunk display
    │   └── api.js         # All backend API calls in one place
    ├── index.css
    ├── tailwind.config.js
    └── package.json
```

---

## 4. Tech Stack & Why Each Was Chosen

| Layer | Tool | Why |
|---|---|---|
| Backend framework | FastAPI | Async Python, auto-generates `/docs`, Pydantic validation |
| PDF parsing | PyMuPDF (fitz) | Fast, handles complex PDFs, pure Python |
| Embeddings | Gemini text-embedding-001 | Free tier, high quality 3072-dim embeddings |
| Vector database | ChromaDB | Runs locally as a file, zero config, perfect for learning |
| LLM generation | OpenRouter (gpt-oss-20b:free) | Free, no credit card, easy model switching |
| Rate limiting | slowapi | Redis-free rate limiting for FastAPI |
| Frontend | React + Vite | Fast dev server, modern tooling |
| Styling | Tailwind CSS | Utility-first, no CSS files to manage |
| HTTP client | Axios | Clean API, good error handling |
| Deployment (backend) | Render | Free tier, GitHub auto-deploy, persistent disk |
| Deployment (frontend) | Vercel | One-click deploy, free SSL, CDN |

---

## 5. Getting Started (Local Setup)

### Prerequisites

- Python 3.10+
- Node.js 18+
- VS Code (recommended)
- A free Google AI Studio account (for Gemini API key)
- A free OpenRouter account (for LLM API key)

### Backend setup

```bash
# Clone the repo
git clone https://github.com/yourusername/doc-qa-bot.git
cd doc-qa-bot/backend

# Create and activate virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
source venv/bin/activate     # macOS/Linux

# Install dependencies
pip install -r requirements.txt

# Create .env file
echo GEMINI_API_KEY=your_key_here > .env
echo OPENROUTER_API_KEY=your_key_here >> .env

# Start the server
uvicorn main:app --reload
```

Backend runs at `http://localhost:8000`
Interactive API docs at `http://localhost:8000/docs`

### Frontend setup

```bash
cd ../frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:5173`

### requirements.txt

```
fastapi
uvicorn
python-multipart
pymupdf
chromadb
google-genai
python-dotenv
slowapi
pydantic
httpx
```

---

## 6. API Reference

### `GET /`

Health check.

**Response**
```json
{ "status": "Document Q&A API is running" }
```

---

### `POST /upload`

Upload and process a PDF.

**Request** — `multipart/form-data`

| Field | Type | Description |
|---|---|---|
| file | File | PDF file, max 10MB |

**Response 200**
```json
{
  "doc_id": "doc_a3f9c1b2",
  "message": "Document uploaded and processed successfully"
}
```

**Error responses**

| Code | Reason |
|---|---|
| 400 | Not a PDF, or file too large |
| 422 | PDF has no extractable text (scanned image) |
| 429 | Rate limit exceeded (5 uploads/minute) |

---

### `POST /ask`

Ask a question about an uploaded document.

**Request body**
```json
{
  "doc_id": "doc_a3f9c1b2",
  "question": "What is the main argument of this document?"
}
```

**Response 200**
```json
{
  "answer": "The main argument is...",
  "sources": [
    "chunk text 1...",
    "chunk text 2...",
    "chunk text 3..."
  ]
}
```

**Error responses**

| Code | Reason |
|---|---|
| 400 | Empty question or question over 1000 characters |
| 429 | Rate limit exceeded (20 questions/minute) or LLM quota exhausted |
| 500 | Internal error during retrieval or generation |

---

## 7. Errors Encountered & How They Were Fixed

### Error 1 — Deprecated `google-generativeai` package

**Symptom:** Warning on import: _"All support for the `google.generativeai` package has ended"_

**Root cause:** Google deprecated the old SDK in favour of `google-genai`.

**Fix:**
```bash
pip uninstall google-generativeai -y
pip install google-genai
```

Updated all imports from `import google.generativeai as genai` to `from google import genai` and updated the client initialisation to `genai.Client(api_key=...)`.

---

### Error 2 — 404 NOT_FOUND on embedding model

**Symptom:**
```
google.genai.errors.ClientError: 404 NOT_FOUND
models/text-embedding-004 is not found for API version v1beta
```

**Root cause:** The model name `text-embedding-004` is not valid in the new SDK. Model names must be prefixed with `models/` and use the correct slug for the current API version.

**Fix:** Listed available models programmatically:
```python
for m in client.models.list():
    if 'embed' in m.name.lower():
        print(m.name)
```

Output showed `models/gemini-embedding-001` as the correct name. Updated `config.py`:
```python
EMBEDDING_MODEL = "models/gemini-embedding-001"
```

---

### Error 3 — 422 Unprocessable Content on `/ask`

**Symptom:** Swagger UI returned 422 when testing `/ask`.

**Root cause:** Swagger's default example body had invalid placeholder JSON (`"string"` values for all fields) instead of a real JSON object.

**Fix:** Manually replaced the request body in Swagger's "Try it out" with a proper object:
```json
{
  "doc_id": "doc_a3f9c1b2",
  "question": "What is this document about?"
}
```

---

### Error 4 — 429 RESOURCE_EXHAUSTED from Gemini LLM

**Symptom:**
```
google.genai.errors.ClientError: 429 RESOURCE_EXHAUSTED
Quota exceeded for quota metric 'generate_content_request_count'. Limit: 0
```

**Root cause:** The Gemini free tier for `gemini-1.5-flash` had a `limit: 0` on the account, meaning generation was completely blocked despite embeddings working fine.

**Fix:** Migrated the generation layer to OpenRouter while keeping Gemini for embeddings:
```python
import httpx

response = httpx.post(
    "https://openrouter.ai/api/v1/chat/completions",
    headers={"Authorization": f"Bearer {OPENROUTER_API_KEY}"},
    json={
        "model": "openai/gpt-oss-20b:free",
        "messages": [{"role": "user", "content": prompt}]
    }
)
```

---

### Error 5 — 404 on multiple OpenRouter free models

**Symptom:** Several free model slugs on OpenRouter (Mistral, Gemma variants) returned 404.

**Root cause:** Free models on OpenRouter are frequently deprecated, renamed, or taken offline.

**Fix:** Tested multiple slugs and found `openai/gpt-oss-20b:free` to be active and working. Added a note in `config.py` to check `openrouter.ai/models?q=free` for the current list of free models.

---

## 8. Security Implementation

| Concern | Implementation |
|---|---|
| API key exposure | Stored in `.env`, loaded via `python-dotenv`, never in source code |
| `.env` in git | Added to `.gitignore` before first commit |
| File type validation | Extension check + content-type check — rejects anything not `.pdf` |
| File size limit | Reject files over 10MB before processing |
| Rate limiting | `slowapi` — 5 uploads/min, 20 questions/min per IP |
| CORS | Restricted to frontend origin only (`localhost:5173` in dev, Vercel URL in prod) |
| Input validation | Pydantic models on all request bodies — rejects malformed JSON automatically |
| Empty input | Explicit checks for empty questions and whitespace-only input |
| Error messages | Never expose internal stack traces to the client |

---

## 9. System Design & Scalability

### Current architecture (single server)

```
User → React (Vercel) → FastAPI (Render, 1 instance) → ChromaDB (local file) → Gemini / OpenRouter
```

This works for a personal project or small demo but has two hard limits:

- ChromaDB is a local file — only one server can access it
- The server is stateful — you can't run two instances

### Production-scale architecture

```
Users
  │
  ▼
CDN (Cloudflare)
  │
  ├── Static assets → Vercel / S3
  │
  └── API requests → Load Balancer
                          │
              ┌───────────┼───────────┐
              ▼           ▼           ▼
          FastAPI     FastAPI     FastAPI      ← stateless, horizontally scalable
          instance    instance    instance
              │
              ├── PostgreSQL (metadata, user sessions)
              ├── Redis (rate limiting, caching)
              ├── S3 (PDF file storage)
              └── Pinecone / Weaviate (hosted vector DB)
                          │
                    Gemini / OpenAI
```

### Key scaling decisions

**Stateless API servers**
Move all state out of the server (no local files, no in-memory sessions). Each request carries enough context (`doc_id`) to be handled by any instance. This enables horizontal scaling — add more servers behind a load balancer.

**Hosted vector database**
Swap ChromaDB (local file) for Pinecone or Weaviate (cloud-hosted). Same query API, but now all server instances share one vector store. Pinecone free tier supports 1 index with up to 100k vectors.

**Async job queue for ingestion**
PDF ingestion (embedding each chunk) is slow — 10–30 seconds for a typical document. In production, move this to a background worker using Celery + Redis:

```
POST /upload → return job_id immediately (202 Accepted)
     │
     └── Celery worker processes PDF in background
              │
              └── Client polls GET /status/{job_id} until done
```

**Caching**
Cache frequent questions per document in Redis with a TTL. If the same question is asked again within 1 hour, return the cached answer instantly without hitting the LLM.

**File storage**
Store uploaded PDFs in S3 instead of processing them in memory. This allows reprocessing without re-uploading and enables audit trails.

### Scalability comparison table

| Concern | Current (MVP) | Production |
|---|---|---|
| Vector DB | ChromaDB (local file) | Pinecone / Weaviate (hosted) |
| File storage | In-memory during request | AWS S3 |
| Ingestion | Synchronous (blocks request) | Celery + Redis (async) |
| Rate limiting | slowapi (in-process) | Redis-backed (shared across instances) |
| Servers | 1 instance | N instances behind load balancer |
| Auth | None | JWT tokens or API keys |
| Monitoring | Print statements | Sentry + Datadog / Grafana |

---

## 10. Interview Q&A

### Fundamentals

**Q: What is RAG and why use it instead of fine-tuning?**

RAG (Retrieval-Augmented Generation) retrieves relevant context from a document at query time and injects it into the LLM prompt. Fine-tuning bakes knowledge into the model weights permanently. RAG is preferred when: (1) the data changes frequently, (2) you need source attribution, (3) you want to avoid the cost of fine-tuning, or (4) you need the model to cite specific passages. Fine-tuning is better for teaching the model a new style or domain-specific reasoning pattern.

---

**Q: What is a vector embedding?**

A vector embedding is a list of floating point numbers (e.g. 3072 numbers) that represents the semantic meaning of a piece of text. Texts with similar meanings have embeddings that are close together in vector space (measured by cosine similarity). This allows us to find the most relevant chunks for a question without exact keyword matching.

---

**Q: Why do you split the PDF into chunks? Why not embed the whole document?**

Three reasons: (1) LLMs have context window limits — you can't send a 100-page PDF in one prompt. (2) Embedding the whole document loses granularity — a single vector can't represent all topics in a long document. (3) Retrieval works better with smaller, focused chunks — you retrieve the 3 most relevant paragraphs rather than the whole document.

---

**Q: What is cosine similarity and why use it for vector search?**

Cosine similarity measures the angle between two vectors, ranging from -1 to 1 (1 = identical direction = same meaning). It's preferred over Euclidean distance for embeddings because it measures orientation (meaning) not magnitude (length), and embedding magnitudes vary based on text length.

---

**Q: Why does the embedding model need to be the same at ingestion and query time?**

Each embedding model maps text to a different vector space. If you embed chunks with model A and the query with model B, the vectors live in different spaces and similarity search produces meaningless results. The model must be consistent across both steps.

---

### Backend & API

**Q: Why FastAPI over Flask?**

FastAPI is async by default (handles concurrent requests without blocking), has built-in request validation via Pydantic, auto-generates interactive API docs at `/docs`, and has better performance. Flask is simpler but requires more boilerplate for the same features.

**Q: What does the `task_type` parameter do in the embedding call?**

Gemini embedding models are trained with different objectives for different use cases. `RETRIEVAL_DOCUMENT` optimises embeddings for storage (chunks), while `RETRIEVAL_QUERY` optimises for lookup (questions). Using the correct task type improves retrieval accuracy.

**Q: How does rate limiting work in this project?**

`slowapi` wraps each endpoint with a decorator like `@limiter.limit("5/minute")`. It tracks request counts per IP address using an in-memory store. When the limit is exceeded it returns a 429 response automatically. In production this would use Redis so limits are shared across multiple server instances.

**Q: What does CORS do and why is it needed?**

CORS (Cross-Origin Resource Sharing) is a browser security mechanism that blocks JavaScript from making requests to a different domain than the page it loaded from. Since our frontend (`localhost:5173`) calls our backend (`localhost:8000`) they are different origins. We configure FastAPI to explicitly allow requests from our frontend's origin.

---

### System Design

**Q: How would you handle 10,000 concurrent users?**

- Horizontal scaling: run multiple stateless FastAPI instances behind a load balancer (AWS ALB or Nginx)
- Move ChromaDB to Pinecone (shared hosted vector DB all instances can access)
- Move ingestion to async Celery workers so uploads don't block
- Add Redis caching for repeated questions on the same document
- Use CDN (Cloudflare) to serve the React frontend from edge nodes globally

**Q: How would you add multi-user support so each user only sees their own documents?**

Add a `user_id` to every ChromaDB collection name (`doc_{user_id}_{doc_uuid}`). Add JWT authentication — each request carries a token, the backend decodes it to get `user_id`, and only queries collections belonging to that user. Store a mapping of `user_id → [doc_ids]` in PostgreSQL.

**Q: How would you make ingestion faster?**

- Batch embedding calls instead of one API call per chunk
- Move to async background workers (Celery) so the upload endpoint returns immediately
- Parallelize embedding with `asyncio.gather()` for multiple chunks at once
- Cache embeddings so re-uploading the same document skips the embedding step (hash the PDF first)

**Q: What are the failure modes of this system?**

- Gemini API down → embeddings fail → ingestion fails. Fix: retry with exponential backoff, fallback to a different embedding provider
- OpenRouter quota hit → answer generation fails. Fix: multiple LLM providers as fallback chain
- ChromaDB file corruption → all documents lost. Fix: periodic backups, or migrate to hosted vector DB with replication
- PDF with only scanned images → no extractable text. Fix: add OCR step using Tesseract or AWS Textract

**Q: How would you add streaming responses (like ChatGPT)?**

On the backend, use the LLM provider's streaming API and return a `StreamingResponse` from FastAPI. On the frontend, use the `EventSource` API or `fetch` with `ReadableStream` to consume tokens as they arrive and append them to the message in real time.

---

## 11. Deployment Guide

### Backend → Render (free)

1. Push code to GitHub (make sure `.env` is in `.gitignore`)
2. Go to render.com → New → Web Service → connect your GitHub repo
3. Set root directory to `backend`
4. Build command: `pip install -r requirements.txt`
5. Start command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
6. Add environment variables in Render dashboard:
   - `GEMINI_API_KEY`
   - `OPENROUTER_API_KEY`
7. Deploy — Render gives you a URL like `https://doc-qa-bot.onrender.com`

### Frontend → Vercel (free)

1. Go to vercel.com → New Project → import your GitHub repo
2. Set root directory to `frontend`
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add environment variable: `VITE_API_URL=https://doc-qa-bot.onrender.com`
6. Update `api.js` to use `import.meta.env.VITE_API_URL` instead of `localhost:8000`
7. Update CORS in `main.py` to allow your Vercel URL
8. Deploy — Vercel gives you a URL like `https://doc-qa-bot.vercel.app`

---

## 12. Future Improvements

| Feature | Description | Effort |
|---|---|---|
| Auth | JWT login so each user has their own documents | Medium |
| Multi-document | Upload multiple PDFs, switch between them in chat | Low |
| Streaming | Stream LLM responses token by token | Medium |
| Async ingestion | Return immediately on upload, poll for completion | Medium |
| OCR support | Handle scanned PDFs using Tesseract | Medium |
| Reranking | Add a reranker model to improve chunk selection | Medium |
| Conversation history | Send previous Q&A turns as context for follow-up questions | Low |
| Hosted vector DB | Swap ChromaDB for Pinecone for multi-instance support | Low |
| Usage analytics | Track queries per document, popular questions | High |

---

## License

MIT License — free to use, modify, and distribute.

---

_Built as a learning project to understand RAG, vector databases, and full-stack AI application development._
