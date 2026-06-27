import { useState } from 'react'
import { uploadPDF } from './api'

export default function Upload({ onUploaded }) {
  const [dragging, setDragging] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleFile(file) {
    if (!file || !file.name.endsWith('.pdf')) {
      setError('Please upload a PDF file.')
      return
    }
    setError(null)
    setLoading(true)
    try {
      const data = await uploadPDF(file)
      onUploaded(data.doc_id, file.name)
    } catch (e) {
      setError(e.response?.data?.detail || 'Upload failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">

        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Document Q&A</h1>
          <p className="text-gray-400">Upload a PDF and ask questions about it</p>
        </div>

        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={e => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files[0]) }}
          className={`border-2 border-dashed rounded-2xl p-14 text-center transition-all cursor-pointer
            ${dragging ? 'border-blue-500 bg-blue-950/30' : 'border-gray-700 hover:border-gray-500 bg-gray-900'}`}
          onClick={() => document.getElementById('fileInput').click()}
        >
          <div className="text-5xl mb-4">📄</div>
          {loading ? (
            <div>
              <div className="text-white font-medium mb-2">Processing your PDF...</div>
              <div className="text-gray-400 text-sm">Chunking and embedding — this takes ~20 seconds</div>
              <div className="mt-4 flex justify-center">
                <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"/>
              </div>
            </div>
          ) : (
            <div>
              <div className="text-white font-medium mb-1">Drop your PDF here</div>
              <div className="text-gray-400 text-sm">or click to browse</div>
              <div className="text-gray-600 text-xs mt-3">Max 10MB · PDF only</div>
            </div>
          )}
        </div>

        <input
          id="fileInput"
          type="file"
          accept=".pdf"
          className="hidden"
          onChange={e => handleFile(e.target.files[0])}
        />

        {error && (
          <div className="mt-4 bg-red-950 border border-red-800 text-red-400 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

      </div>
    </div>
  )
}