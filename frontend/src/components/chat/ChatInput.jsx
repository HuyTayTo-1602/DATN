import { useRef, useEffect } from 'react'

const MAX_LEN = 2000

export default function ChatInput({ value, onChange, onSend, disabled }) {
  const ref = useRef(null)

  // Auto-resize textarea
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }, [value])

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!disabled && value.trim()) onSend()
    }
  }

  const overLimit = value.length > MAX_LEN

  return (
    <div className="chat-input-area">
      <div className="chat-input-wrap">
        <textarea
          ref={ref}
          className="chat-textarea"
          placeholder="Nhập tin nhắn… (Enter để gửi, Shift+Enter xuống dòng)"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKey}
          disabled={disabled}
          rows={1}
          maxLength={MAX_LEN + 50}
        />
        {overLimit && (
          <div className="chat-char-warn">
            {value.length}/{MAX_LEN} ký tự — quá giới hạn
          </div>
        )}
      </div>
      <button
        className="btn btn-primary chat-send-btn"
        onClick={onSend}
        disabled={disabled || !value.trim() || overLimit}
        title="Gửi (Enter)"
      >
        ▶
      </button>
    </div>
  )
}
