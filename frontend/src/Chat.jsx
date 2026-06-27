import { useState, useRef, useEffect } from 'react'
import { askQuestion } from './api'

function Message({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed
          ${isUser
            ? 'bg-blue-600 text-white rounded-br-sm'
            : 'bg-gray-800 text-gray-100 rounded-bl-sm'}`}>
          {msg.content}
        </div>

        {msg.sources && (
          <details className="mt-2 text-xs text-gray-500">
            <summary className="cursor-pointer hover:text-gray-400">
              View {msg.sources.length} source chunks
            </summary>
            <div className="mt-2 space-y-2">
              {msg.sources.map((s, i) => (
                <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-400">
                  {s.slice(0, 200)}...
                </div>
              ))}
            </div>
          </details>
        )}
      </div>
    </div>
  )
}

export default function Chat({ docId, filename, onReset }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: `Ready! Ask me anything about "${filename}".` }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function send() {
    const q = input.trim()
    if (!q || loading) return

    setMessages(prev => [...prev, { role: 'user', content: q }])
    setInput('')
    setLoading(true)

    try {
      const data = await askQuestion(docId, q)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.answer,
        sources: data.sources
      }])
    } catch (e) {
      const msg = e.response?.data?.detail || 'Something went wrong. Try again.'
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${msg}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">

      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-white font-semibold">Document Q&A</h1>
          <p className="text-gray-500 text-xs mt-0.5 truncate max-w-xs">{filename}</p>
        </div>
        <button
          onClick={onReset}
          className="text-gray-500 hover:text-gray-300 text-sm transition-colors"
        >
          ← Upload new PDF
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-3xl w-full mx-auto">
        {messages.map((msg, i) => <Message key={i} msg={msg} />)}
        {loading && (
          <div className="flex justify-start mb-4">
            <div className="bg-gray-800 rounded-2xl rounded-bl-sm px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'0ms'}}/>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'150ms'}}/>
                <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{animationDelay:'300ms'}}/>
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef}/>
      </div>

      {/* Input */}
      <div className="border-t border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex gap-3">
          <input
            className="flex-1 bg-gray-900 border border-gray-700 rounded-xl px-4 py-3 text-white text-sm
              placeholder-gray-500 focus:outline-none focus:border-blue-500 transition-colors"
            placeholder="Ask a question about your document..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && send()}
            disabled={loading}
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            className="bg-blue-600 hover:bg-blue-500 disabled:bg-gray-800 disabled:text-gray-600
              text-white px-5 py-3 rounded-xl text-sm font-medium transition-colors"
          >
            Send
          </button>
        </div>
      </div>

    </div>
  )
}