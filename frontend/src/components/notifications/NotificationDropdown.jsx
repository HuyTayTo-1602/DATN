import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { notificationsApi } from '../../services/api'

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

export default function NotificationDropdown({ onClose, onCountChange }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      const data = await notificationsApi.list(10, 0)
      setItems(data)
    } catch {
      /* ignore */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  async function handleClick(item) {
    if (!item.is_read) {
      try {
        await notificationsApi.markRead(item.id)
        setItems(prev => prev.map(n => n.id === item.id ? { ...n, is_read: true } : n))
        onCountChange?.(-1)
      } catch { /* ignore */ }
    }
    onClose()
    if (item.related_type === 'job_application' && item.related_id) {
      if (item.type === 'application_submitted') {
        // recruiter → go to applicants page
        navigate('/my-jobs')
      } else {
        // candidate → go to my applications
        navigate('/my-applications')
      }
    }
  }

  async function handleMarkAll() {
    try {
      const res = await notificationsApi.markAllRead()
      setItems(prev => prev.map(n => ({ ...n, is_read: true })))
      onCountChange?.(-(res.marked || 0))
    } catch { /* ignore */ }
  }

  const unreadCount = items.filter(n => !n.is_read).length

  return (
    <div style={{
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: 8,
      width: 360,
      background: 'var(--card-bg)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius)',
      boxShadow: 'var(--shadow-lg)',
      zIndex: 1000,
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        borderBottom: '1px solid var(--border)',
      }}>
        <span style={{ fontWeight: 600, color: 'var(--text)' }}>Thông báo</span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAll}
              style={{
                fontSize: '0.75rem',
                color: 'var(--primary)',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Đọc tất cả
            </button>
          )}
          <button
            onClick={() => { onClose(); navigate('/notifications') }}
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            Xem tất cả
          </button>
        </div>
      </div>

      {/* List */}
      <div style={{ maxHeight: 360, overflowY: 'auto' }}>
        {loading && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Đang tải...
          </div>
        )}
        {!loading && items.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Chưa có thông báo nào
          </div>
        )}
        {items.map(item => (
          <div
            key={item.id}
            onClick={() => handleClick(item)}
            style={{
              display: 'flex',
              gap: 12,
              padding: '12px 16px',
              cursor: 'pointer',
              background: item.is_read ? 'transparent' : 'var(--primary-bg)',
              borderBottom: '1px solid var(--border-light)',
              transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
            onMouseLeave={e => e.currentTarget.style.background = item.is_read ? 'transparent' : 'var(--primary-bg)'}
          >
            <span style={{ fontSize: '1.2rem', flexShrink: 0 }}>
              {TYPE_ICON[item.type] || '🔔'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.85rem',
                fontWeight: item.is_read ? 400 : 600,
                color: 'var(--text)',
                marginBottom: 2,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {item.title}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                {item.message}
              </div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                {timeAgo(item.created_at)}
              </div>
            </div>
            {!item.is_read && (
              <div style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: 'var(--primary)',
                flexShrink: 0,
                marginTop: 6,
              }} />
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
