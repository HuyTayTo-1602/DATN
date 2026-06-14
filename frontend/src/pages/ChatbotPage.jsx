import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'

const MD_IN_CODE = /^(#{1,6}\s|\s*[-*]\s|\*\*|__)/m

const mdComponents = {
  code({ node, inline, className, children, ...props }) {
    const raw = String(children).replace(/\n$/, '')
    if (!inline && MD_IN_CODE.test(raw)) {
      return (
        <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
          {raw}
        </ReactMarkdown>
      )
    }
    return inline
      ? <code className={className} {...props}>{children}</code>
      : <pre><code className={className} {...props}>{children}</code></pre>
  },
}
import Icon from '../components/Icon'
import { Avatar } from '../components/Avatar'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../components/Toast'
import { chatApi } from '../services/api'

const WELCOME = {
  recruiter: 'Xin chào! Tôi là trợ lý AI của CareerBridge. Tôi có thể giúp bạn:\n\n- Soạn mô tả công việc hấp dẫn\n- Đánh giá nhanh hồ sơ ứng viên\n- Phân tích thị trường lương cho từng vị trí\n\nBạn cần hỗ trợ gì hôm nay?',
  job_seeker: 'Xin chào! Tôi là trợ lý AI của CareerBridge. Tôi có thể giúp bạn:\n\n- Tìm việc làm phù hợp với hồ sơ\n- Cải thiện CV để nổi bật hơn\n- Chuẩn bị cho buổi phỏng vấn\n\nBạn muốn bắt đầu từ đâu?',
}

const welcomeFor = (role) => [{ role: 'bot', text: WELCOME[role] || WELCOME.job_seeker }]

const ChatbotPage = () => {
  const { user } = useAuth()
  const toast = useToast()
  const role = user?.role === 'recruiter' ? 'recruiter' : 'job_seeker'

  const [messages, setMessages] = useState(() => welcomeFor(role))
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [threadId, setThreadId] = useState(null)
  const [jobs, setJobs] = useState([])
  const [activeJob, setActiveJob] = useState('')
  const bodyRef = useRef(null)

  useEffect(() => {
    if (role === 'recruiter') {
      chatApi.myJobs().then((data) => setJobs(Array.isArray(data) ? data : [])).catch(() => {})
    }
  }, [role])

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight
  }, [messages, sending])

  const newConversation = () => {
    setThreadId(null)
    setActiveJob('')
    setMessages(welcomeFor(role))
  }

  const send = async () => {
    const text = input.trim()
    if (!text || sending) return
    setMessages((m) => [...m, { role: 'user', text }])
    setInput('')
    setSending(true)
    try {
      const jobId = activeJob ? Number(activeJob) : null
      const data = await chatApi.sendMessage(text, jobId, threadId)
      setThreadId(data?.thread_id || threadId)
      setMessages((m) => [...m, { role: 'bot', text: data?.answer || 'Không có câu trả lời' }])
    } catch (err) {
      toast.error(err.message || 'Không thể gửi tin nhắn, vui lòng thử lại')
      setMessages((m) => [...m, { role: 'bot', text: 'Xin lỗi, đã có lỗi xảy ra. Vui lòng thử lại sau.' }])
    } finally {
      setSending(false)
    }
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="chat-shell">
      <div className="chat-head">
        <div>
          <h1>Trợ lý AI CareerBridge</h1>
          <p>Hỗ trợ tìm việc, viết CV, soạn JD</p>
        </div>
        <div className="row gap-sm">
          {role === 'recruiter' && (
            <select className="select" style={{ width: 240 }} value={activeJob} onChange={(e) => setActiveJob(e.target.value)}>
              <option value="">Chọn tin tuyển dụng...</option>
              {jobs.map((j) => <option key={j.id} value={j.id}>{j.title}</option>)}
            </select>
          )}
          <button className="btn btn-outline btn-sm" onClick={newConversation}><Icon name="plus" size={12} />Cuộc hội thoại mới</button>
        </div>
      </div>

      <div className="chat-body" ref={bodyRef}>
        {messages.map((m, i) => (
          <div key={i} className={`bubble-row ${m.role}`}>
            {m.role === 'bot' && <div className="bot-avatar"><Icon name="sparkles" size={14} /></div>}
            <div className={`bubble ${m.role}${m.role === 'bot' ? ' bubble-md' : ''}`}>
              {m.role === 'bot'
                ? <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={mdComponents}>{m.text}</ReactMarkdown>
                : m.text}
            </div>
            {m.role === 'user' && <Avatar name={user?.full_name || user?.email} size="sm" />}
          </div>
        ))}
        {sending && (
          <div className="bubble-row bot">
            <div className="bot-avatar"><Icon name="sparkles" size={14} /></div>
            <div className="bubble bot">
              <div className="typing"><span /><span /><span /></div>
            </div>
          </div>
        )}
      </div>

      <div className="chat-input-row">
        <input
          className="input"
          placeholder="Nhập câu hỏi của bạn..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <button className="btn btn-primary" onClick={send} disabled={!input.trim() || sending}>
          <Icon name="send" size={14} />Gửi
        </button>
      </div>
    </div>
  )
}

export default ChatbotPage
