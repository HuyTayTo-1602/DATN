function Badge({ count, urgent }) {
  const hasIssue = count > 0
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 24, height: 24, borderRadius: 12, padding: '0 7px',
      fontSize: '0.78rem', fontWeight: 700,
      background: hasIssue ? (urgent ? '#ef444425' : '#f59e0b20') : '#4ade8015',
      color: hasIssue ? (urgent ? '#f87171' : '#fbbf24') : '#4ade80',
      border: `1px solid ${hasIssue ? (urgent ? '#ef444440' : '#f59e0b40') : '#4ade8030'}`,
    }}>
      {count}
    </span>
  )
}

export default function AttentionWidget({ attention, onNavigate }) {
  const { draft_jobs = 0, overdue_applications = 0, inactive_users = 0 } = attention ?? {}
  const allGood = draft_jobs === 0 && overdue_applications === 0 && inactive_users === 0

  const items = [
    {
      icon: '📋',
      label: 'Tin đang ở trạng thái Draft',
      count: draft_jobs,
      urgent: false,
      actionLabel: 'Xem tin',
      onAction: () => onNavigate?.('jobs', 'draft'),
    },
    {
      icon: '⏰',
      label: 'Đơn ứng tuyển chờ phản hồi > 7 ngày',
      count: overdue_applications,
      urgent: overdue_applications > 10,
      actionLabel: 'Xem đơn',
      onAction: () => onNavigate?.('applications'),
    },
    {
      icon: '🚫',
      label: 'Tài khoản không hoạt động / bị khoá',
      count: inactive_users,
      urgent: false,
      actionLabel: 'Xem người dùng',
      onAction: () => onNavigate?.('users', 'inactive'),
    },
  ]

  return (
    <div style={{
      background: 'var(--bg-card, #1a2236)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '18px 20px',
    }}>
      <div style={{ fontWeight: 700, marginBottom: 16, fontSize: '0.88rem', color: '#f0f4ff' }}>
        Cần xử lý
      </div>

      {allGood ? (
        <div style={{ padding: '20px 0', textAlign: 'center' }}>
          <div style={{ fontSize: '1.8rem', marginBottom: 6 }}>✅</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>Không có mục nào cần xử lý</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {items.map(({ icon, label, count, urgent, actionLabel, onAction }) => (
            <div key={label} style={{
              display: 'flex', alignItems: 'center', gap: 12,
              padding: '10px 12px', borderRadius: 8,
              background: count > 0 ? 'rgba(255,255,255,0.03)' : 'transparent',
              border: `1px solid ${count > 0 ? 'rgba(255,255,255,0.07)' : 'transparent'}`,
            }}>
              <span style={{ fontSize: '1.1rem', flexShrink: 0 }}>{icon}</span>
              <span style={{ flex: 1, fontSize: '0.8rem', color: count > 0 ? '#d1d9f0' : 'var(--text-muted)' }}>
                {label}
              </span>
              <Badge count={count} urgent={urgent} />
              {count > 0 && (
                <button
                  onClick={onAction}
                  style={{
                    padding: '4px 10px', borderRadius: 6,
                    border: '1px solid var(--primary)',
                    background: 'transparent',
                    color: 'var(--primary-light, #818cf8)',
                    fontSize: '0.74rem', fontWeight: 600,
                    cursor: 'pointer', flexShrink: 0,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {actionLabel}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
