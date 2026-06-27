from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from ingest import ingest_document
from query import answer_question
from config import MAX_FILE_SIZE_MB

# Rate limiter
limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="Document Q&A API")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS — only allow your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # update this when deployed
    allow_methods=["*"],
    allow_headers=["*"],
)

class QuestionRequest(BaseModel):
    doc_id: str
    question: str

@app.get("/")
def root():
    return {"status": "Document Q&A API is running"}

@app.post("/upload")
@limiter.limit("5/minute")
async def upload_pdf(request: Request, file: UploadFile = File(...)):
    # Validate file type
    if not file.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    file_bytes = await file.read()

    # Validate file size
    if len(file_bytes) > MAX_FILE_SIZE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"File too large. Max size is {MAX_FILE_SIZE_MB}MB")

    try:
        doc_id = ingest_document(file_bytes, file.filename)
        return {"doc_id": doc_id, "message": "Document uploaded and processed successfully"}
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

@app.post("/ask")
@limiter.limit("20/minute")
async def ask(request: Request, body: QuestionRequest):
    if not body.question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")
    if len(body.question) > 1000:
        raise HTTPException(status_code=400, detail="Question too long (max 1000 chars)")

    try:
        result = answer_question(body.doc_id, body.question)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating answer: {str(e)}")