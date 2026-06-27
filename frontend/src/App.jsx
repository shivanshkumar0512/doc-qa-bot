import { useState } from 'react'
import Upload from './Upload'
import Chat from './Chat'

export default function App() {
  const [docId, setDocId] = useState(null)
  const [filename, setFilename] = useState('')

  function handleUploaded(id, name) {
    setDocId(id)
    setFilename(name)
  }

  function handleReset() {
    setDocId(null)
    setFilename('')
  }

  return docId
    ? <Chat docId={docId} filename={filename} onReset={handleReset} />
    : <Upload onUploaded={handleUploaded} />
}