import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsApi } from '../services/api'

const TYPE_ICON = {
  application_submitted: '📋',
  application_accepted: '✅',
  application_rejected: '❌',
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000)
  if (diff < 60) return 'vừa xong'
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  return `${Math.floor(diff / 86400)} ngày trước`
}

const PAGE_SIZE = 20

export default function NotificationPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const navigate = useNavigate()

  const load = useCallback(async (reset = false) => {
    setLoading(true)
    const currentOffset = reset ? 0 : offset
    try {
      const data = await notificationsApi.list(PAGE_SIZE, currentOffset)
      setItems(prev => reset ? data : [...prev, ...data])
      setHasMore(data.length === PAGE_SIZE)
      if (!reset) setOffset(currentOffset + PAGE_SIZE)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [offset])

  useEffect(() => { load(true) }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  async function handleMarkAll() {
    try {
      await notificationsApi.markAllRead()
      setItems(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch { /* ignore */ }
  }

  async function handleClick(item) {
    if (!item.is_read) {
      try {
        await notificationsApi.markRead(item.id)
        setItems(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n))
      } catch { /* ignore */ }
    }
    if (item.related_type === 'job_application') {
      if (item.type === 'application_submitted') {
        navigate('/my-jobs')
      } else {
        navigate('/my-applications')
      }
    }
  }

  const unreadCount = items.filter(n => !n.is_read).length

  return (
    <div style={{ maxWidth: 720, margin: '32px auto', padding: '0 16px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <h1 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text)', margin: 0 }}>
          Thông báo
        </h1>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            className="btn btn-ghost btn-sm"
          >
            Đánh dấu tất cả đã đọc ({unreadCount})
          </button>
        )}
      </div>

      <div style={{ background: 'var(--card-bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', overflow: 'hidden' }}>
        {!loading && items.length === 0 && (
          <div style={{ padding: 48, textAlign: 'center', color: 'var(--text-muted)' }}>
            Chưa có thông báo nào
          </div>
        )}

        {items.map(item => (
          <div
            key={item.id}
            onClick={() => handleClick(item)}
            style={{
              display: 'flex',
              gap: 16,
              padding: '16px 20px',
              cursor: 'pointer',
              background: item.is_read ? 'transparent' : 'var(--primary-bg)',
              borderBottom: '1px solid var(--border-light)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
            onMouseLeave={e => e.currentTarget.style.background = item.is_read ? 'transparent' : 'var(--primary-bg)'}
          >
            <span style={{ fontSize: '1.5rem', flexShrink: 0, paddingTop: 2 }}>
              {TYPE_ICON[item.type] || '🔔'}
            </span>
            <div style={{ flex: 1 }}>
              <div style={{
                fontWeight: item.is_read ? 400 : 600,
                color: 'var(--text)',
                marginBottom: 4,
              }}>
                {item.title}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: 6 }}>
                {item.message}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.78rem' }}>
                {timeAgo(item.created_at)}
              </div>
            </div>
            {!item.is_read && (
              <div style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: 'var(--primary)',
                flexShrink: 0,
                marginTop: 8,
              }} />
            )}
          </div>
        ))}

        {loading && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Đang tải...
          </div>
        )}

        {!loading && hasMore && (
          <div style={{ padding: 16, textAlign: 'center' }}>
            <button
              className="btn btn-ghost btn-sm"
              onClick={() => load(false)}
            >
              Tải thêm
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
