from dotenv import load_dotenv
import os

load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
MAX_FILE_SIZE_MB = 10
CHUNK_SIZE = 500
CHUNK_OVERLAP = 50
TOP_K_RESULTS = 3
CHROMA_PATH = "chroma_db"
EMBEDDING_MODEL = "models/gemini-embedding-001"
GENERATION_MODEL = "gemini-1.0-flash"