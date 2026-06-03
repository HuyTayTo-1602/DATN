import { useEffect, useRef } from 'react'
import ChatMessage from './ChatMessage'

function TypingIndicator() {
  return (
    <div className="chat-msg chat-msg-bot">
      <div className="chat-avatar chat-avatar-bot">🤖</div>
      <div className="chat-bubble chat-bubble-bot chat-bubble-typing">
        <span className="dot" />
        <span className="dot" />
        <span className="dot" />
      </div>
    </div>
  )
}

export default function ChatWindow({ messages, isLoading }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isLoading])

  return (
    <div className="chat-window">
      {messages.length === 0 && !isLoading && (
        <div className="chat-empty">
          <div className="chat-empty-icon">🤖</div>
          <div className="chat-empty-title">Xin chào! Tôi có thể giúp gì cho bạn?</div>
          <div className="chat-empty-sub">
            Hỏi về tuyển dụng, thị trường lao động, kỹ năng, lương thưởng, CV…
          </div>
        </div>
      )}

      {messages.map((msg) => (
        <ChatMessage key={msg.id} role={msg.role} content={msg.content} />
      ))}

      {isLoading && <TypingIndicator />}

      <div ref={bottomRef} />
    </div>
  )
}
