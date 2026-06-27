import chromadb
from google import genai
from openai import OpenAI
from google.genai import types
from config import (
    GEMINI_API_KEY,
    CHROMA_PATH,
    TOP_K_RESULTS,
    EMBEDDING_MODEL,
    OPENROUTER_API_KEY
)

# Gemini client (for embeddings only)
client_ai = genai.Client(api_key=GEMINI_API_KEY)

# OpenRouter client (for answer generation)
client_llm = OpenAI(
    base_url="https://openrouter.ai/api/v1",
    api_key=OPENROUTER_API_KEY
)

# ChromaDB client
client_db = chromadb.PersistentClient(path=CHROMA_PATH)


def embed_query(question: str) -> list[float]:
    result = client_ai.models.embed_content(
        model=EMBEDDING_MODEL,
        contents=question,
        config=types.EmbedContentConfig(
            task_type="RETRIEVAL_QUERY"
        )
    )
    return result.embeddings[0].values


def retrieve_chunks(doc_id: str, question: str) -> list[str]:
    collection = client_db.get_collection(name=doc_id)

    query_embedding = embed_query(question)

    results = collection.query(
        query_embeddings=[query_embedding],
        n_results=TOP_K_RESULTS
    )

    return results["documents"][0]


def build_prompt(question: str, chunks: list[str]) -> str:
    context = "\n\n---\n\n".join(chunks)

    return f"""
You are a helpful assistant. Answer the user's question using ONLY the context below.
If the answer is not present in the context, reply exactly:
"I couldn't find that in the document."

Context:
{context}

Question:
{question}

Answer:
"""


def answer_question(doc_id: str, question: str) -> dict:
    chunks = retrieve_chunks(doc_id, question)

    if not chunks:
        return {
            "answer": "No relevant information found in the document.",
            "sources": []
        }

    prompt = build_prompt(question, chunks)

    response = client_llm.chat.completions.create(
        model="openai/gpt-oss-20b:free",
        messages=[
            {
                "role": "user",
                "content": prompt
            }
        ]
    )

    return {
        "answer": response.choices[0].message.content,
        "sources": chunks
    }