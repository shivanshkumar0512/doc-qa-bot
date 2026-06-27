import fitz
import chromadb
from google import genai
from google.genai import types
from config import GEMINI_API_KEY, CHUNK_SIZE, CHUNK_OVERLAP, CHROMA_PATH, EMBEDDING_MODEL
import uuid

client_ai = genai.Client(api_key=GEMINI_API_KEY)
client_db = chromadb.PersistentClient(path=CHROMA_PATH)

def get_or_create_collection(doc_id: str):
    return client_db.get_or_create_collection(name=doc_id)

def extract_text_from_pdf(file_bytes: bytes) -> str:
    doc = fitz.open(stream=file_bytes, filetype="pdf")
    full_text = ""
    for page in doc:
        full_text += page.get_text()
    return full_text

def chunk_text(text: str) -> list[str]:
    words = text.split()
    chunks = []
    start = 0
    while start < len(words):
        end = start + CHUNK_SIZE
        chunk = " ".join(words[start:end])
        chunks.append(chunk)
        start += CHUNK_SIZE - CHUNK_OVERLAP
    return chunks

def embed_texts(texts: list[str]) -> list[list[float]]:
    embeddings = []
    for text in texts:
        result = client_ai.models.embed_content(
            model=EMBEDDING_MODEL,
            contents=text,
            config=types.EmbedContentConfig(task_type="RETRIEVAL_DOCUMENT")
        )
        embeddings.append(result.embeddings[0].values)
    return embeddings

def ingest_document(file_bytes: bytes, filename: str) -> str:
    text = extract_text_from_pdf(file_bytes)
    if not text.strip():
        raise ValueError("PDF appears to be empty or scanned (no extractable text)")

    chunks = chunk_text(text)
    embeddings = embed_texts(chunks)

    doc_id = f"doc_{uuid.uuid4().hex[:8]}"
    collection = get_or_create_collection(doc_id)
    collection.add(
        documents=chunks,
        embeddings=embeddings,
        ids=[f"chunk_{i}" for i in range(len(chunks))]
    )

    print(f"✅ Ingested '{filename}' → {len(chunks)} chunks → collection '{doc_id}'")
    return doc_id