import axios from 'axios'

const BASE = 'http://localhost:8000'

export async function uploadPDF(file) {
  const form = new FormData()
  form.append('file', file)
  const res = await axios.post(`${BASE}/upload`, form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
  return res.data // { doc_id, message }
}

export async function askQuestion(docId, question) {
  const res = await axios.post(`${BASE}/ask`, {
    doc_id: docId,
    question
  })
  return res.data // { answer, sources }
}