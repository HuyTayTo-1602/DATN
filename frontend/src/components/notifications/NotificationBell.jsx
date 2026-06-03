import { useState, useEffect, useRef, useCallback } from 'react'
import { notificationsApi } from '../../services/api'
import { createNotificationSocket } from '../../services/notificationSocket'
import { useAuth } from '../../context/AuthContext'
import NotificationDropdown from './NotificationDropdown'

export default function NotificationBell() {
  const { user } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const [open, setOpen] = useState(false)
  const dropdownRef = useRef(null)
  const socketRef = useRef(null)

  const fetchCount = useCallback(async () => {
    try {
      const data = await notificationsApi.unreadCount()
      setUnreadCount(data.count)
    } catch {
      /* ignore */
    }
  }, [])

  // Fetch initial unread count
  useEffect(() => {
    if (!user) return
    fetchCount()
  }, [user, fetchCount])

  // WebSocket connection for realtime badge updates
  useEffect(() => {
    if (!user) return

    socketRef.current = createNotificationSocket({
      onMessage: () => {
        setUnreadCount(prev => prev + 1)
      },
    })

    return () => {
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [user])

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!open) return
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  function handleCountChange(delta) {
    setUnreadCount(prev => Math.max(0, prev + delta))
  }

  if (!user) return null

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          position: 'relative',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 6px',
          borderRadius: 'var(--radius-sm)',
          color: 'var(--text)',
          fontSize: '1.2rem',
          lineHeight: 1,
          transition: 'background 0.15s',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface)'}
        onMouseLeave={e => e.currentTarget.style.background = 'none'}
        title="Thông báo"
        aria-label="Thông báo"
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: -2,
            right: -2,
            minWidth: 16,
            height: 16,
            padding: '0 3px',
            background: 'var(--danger)',
            color: '#fff',
            borderRadius: 8,
            fontSize: '0.65rem',
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <NotificationDropdown
          onClose={() => setOpen(false)}
          onCountChange={handleCountChange}
        />
      )}
    </div>
  )
}
