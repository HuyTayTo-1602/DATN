import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { chatApi } from '../services/api'
import ChatSidebar from '../components/chat/ChatSidebar'
import ChatWindow from '../components/chat/ChatWindow'
import ChatInput from '../components/chat/ChatInput'

// Persist thread per user in sessionStorage so refresh keeps context.
function getOrCreateThreadId(userId) {
  const key = `chat_thread_${userId}`
  let id = sessionStorage.getItem(key)
  if (!id) {
    id = crypto.randomUUID()
    sessionStorage.setItem(key, id)
  }
  return id
}

function clearThreadId(userId) {
  const key = `chat_thread_${userId}`
  sessionStorage.removeItem(key)
  return crypto.randomUUID()
}

let _msgCounter = 0
function nextId() { return ++_msgCounter }

export default function ChatPage() {
  const { user } = useAuth()
  const [searchParams] = useSearchParams()

  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Recruiter state
  const [jobs, setJobs] = useState([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState(null)

  // Thread management
  const [threadId, setThreadId] = useState(() =>
    user ? getOrCreateThreadId(user.id || user.email) : crypto.randomUUID()
  )

  // Auto-select job_id from URL param (?job_id=42) — for "Phân tích ứng viên" button
  useEffect(() => {
    const paramJobId = searchParams.get('job_id')
    if (paramJobId) setSelectedJobId(Number(paramJobId))
  }, [searchParams])

  // Load jobs for recruiter
  useEffect(() => {
    if (user?.role !== 'recruiter') return
    setLoadingJobs(true)
    chatApi.myJobs()
      .then(setJobs)
      .catch(() => {})
      .finally(() => setLoadingJobs(false))
  }, [user])

  // Load existing history on mount
  useEffect(() => {
    if (!threadId) return
    chatApi.history(threadId)
      .then((history) => {
        if (history && history.length > 0) {
          setMessages(history.map((h) => ({
            id: nextId(),
            role: h.role,
            content: h.content,
          })))
        }
      })
      .catch(() => {}) // Ignore — empty or 403 means fresh thread
  }, [threadId])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return

    setInput('')
    setError('')
    setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: text }])
    setIsLoading(true)

    try {
      const res = await chatApi.sendMessage(text, selectedJobId, threadId)
      setMessages((prev) => [...prev, {
        id: nextId(),
        role: 'assistant',
        content: res.answer || 'Không có câu trả lời.',
      }])
      // Use thread_id from server response (in case it was auto-generated)
      if (res.thread_id && res.thread_id !== threadId) {
        setThreadId(res.thread_id)
        if (user) {
          sessionStorage.setItem(`chat_thread_${user.id || user.email}`, res.thread_id)
        }
      }
    } catch (err) {
      const msg = err.message || 'Có lỗi xảy ra. Vui lòng thử lại.'
      setError(msg)
      setMessages((prev) => [...prev, {
        id: nextId(),
        role: 'assistant',
        content: `⚠️ ${msg}`,
      }])
    } finally {
      setIsLoading(false)
    }
  }, [input, isLoading, selectedJobId, threadId, user])

  const handleNewThread = () => {
    const newId = clearThreadId(user?.id || user?.email || 'guest')
    setThreadId(newId)
    setMessages([])
    setError('')
    setInput('')
  }

  const handleHintClick = (hint) => {
    setInput(hint)
  }

  const isMobileView = window.innerWidth < 768

  return (
    <div className="chat-layout">
      {/* Sidebar — hidden on mobile */}
      {!isMobileView && (
        <ChatSidebar
          role={user?.role}
          jobs={jobs}
          selectedJobId={selectedJobId}
          onSelectJob={setSelectedJobId}
          onHintClick={handleHintClick}
          onNewThread={handleNewThread}
          loadingJobs={loadingJobs}
        />
      )}

      {/* Main chat area */}
      <div className="chat-main">
        {/* Mobile top bar */}
        {isMobileView && user?.role === 'recruiter' && jobs.length > 0 && (
          <div className="chat-mobile-bar">
            <select
              className="chat-mobile-select"
              value={selectedJobId ?? ''}
              onChange={(e) => setSelectedJobId(e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">-- Chọn tin tuyển dụng --</option>
              {jobs.map((j) => (
                <option key={j.id} value={j.id}>{j.title}</option>
              ))}
            </select>
          </div>
        )}

        {/* Header */}
        <div className="chat-header">
          <span className="chat-header-title">AI Assistant</span>
          {selectedJobId && user?.role === 'recruiter' && (
            <span className="chat-header-badge">
              Đang hỏi về: <strong>{jobs.find((j) => j.id === selectedJobId)?.title}</strong>
            </span>
          )}
          {isMobileView && (
            <button
              className="btn btn-ghost btn-sm"
              onClick={handleNewThread}
              style={{ marginLeft: 'auto' }}
            >
              Mới
            </button>
          )}
        </div>

        {error && (
          <div className="chat-error-bar">{error}</div>
        )}

        <ChatWindow messages={messages} isLoading={isLoading} />

        <ChatInput
          value={input}
          onChange={setInput}
          onSend={handleSend}
          disabled={isLoading}
        />
      </div>
    </div>
  )
}
