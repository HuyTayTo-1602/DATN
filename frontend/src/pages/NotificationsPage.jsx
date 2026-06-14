import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { useAuth } from '../context/AuthContext'
import { notificationsApi } from '../services/api'
import { LABEL, timeAgo } from '../utils/format'

const typeIcon = (type = '') =>
  type.includes('accepted') ? 'check'
    : type.includes('rejected') ? 'x'
    : type.includes('submitted') ? 'user'
    : type.includes('match') ? 'sparkles'
    : type === 'job_invitation' ? 'briefcase'
    : 'info'

const NotificationsPage = () => {
  const navigate = useNavigate()
  const { role, setUnreadCount } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)

  const load = () => {
    setLoading(true)
    return notificationsApi.list(50, 0)
      .then((data) => setItems(Array.isArray(data) ? data : (data?.items || [])))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const markAllRead = async () => {
    setMarking(true)
    try {
      await notificationsApi.markAllRead()
      setItems((ns) => ns.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    } catch {
      // ignore
    } finally {
      setMarking(false)
    }
  }

  const clickItem = async (n) => {
    if (!n.is_read) {
      try {
        await notificationsApi.markRead(n.id)
        setItems((ns) => ns.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)))
        setUnreadCount((c) => Math.max(0, c - 1))
      } catch {
        // ignore
      }
    }
    if (n.related_type === 'job_application') {
      if (role === 'recruiter' && n.related_id) {
        navigate(`/recruiter/jobs/${n.related_id}/applicants`)
      } else {
        navigate('/my-applications')
      }
    } else if (n.related_type === 'job' && n.related_id) {
      navigate(`/jobs/${n.related_id}`)
    }
  }

  const unreadCount = items.filter((n) => !n.is_read).length

  return (
    <div className="container" style={{ padding: '32px 0 64px', maxWidth: 760 }}>
      <div className="page-head">
        <div>
          <h1>Thông báo</h1>
          <p className="text-secondary mb-0">{unreadCount > 0 ? `Bạn có ${unreadCount} thông báo chưa đọc` : 'Bạn đã đọc hết thông báo'}</p>
        </div>
        {unreadCount > 0 && (
          <button className="btn btn-outline" onClick={markAllRead} disabled={marking}>
            <Icon name="check" size={14} />Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      {loading ? (
        <Spinner />
      ) : items.length === 0 ? (
        <EmptyState icon="bell" title="Chưa có thông báo nào" description="Các cập nhật về đơn ứng tuyển và việc làm mới sẽ xuất hiện ở đây." />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {items.map((n) => (
            <div
              key={n.id}
              className="card card-hover"
              style={{ display: 'flex', gap: 14, alignItems: 'flex-start', cursor: 'pointer', borderLeft: !n.is_read ? '3px solid var(--color-primary)' : '3px solid transparent' }}
              onClick={() => clickItem(n)}
            >
              <span style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary-light)', color: 'var(--color-primary)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon name={typeIcon(n.type)} size={16} />
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: !n.is_read ? 700 : 600 }}>{n.title || LABEL[n.type] || 'Thông báo'}</div>
                <div className="text-sm text-secondary" style={{ marginTop: 2 }}>{n.message}</div>
                <div className="text-xs text-muted" style={{ marginTop: 6 }}>{timeAgo(n.created_at)}</div>
              </div>
              {!n.is_read && <span className="dot" style={{ background: 'var(--color-primary)', width: 8, height: 8, borderRadius: '50%', marginTop: 6 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default NotificationsPage
