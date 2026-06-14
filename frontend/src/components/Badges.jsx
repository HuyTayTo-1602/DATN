export const statusInfo = (status, ctx) => {
  if (ctx === 'job') {
    if (status === 'active') return { label: 'Đang tuyển', cls: 'badge-success' }
    if (status === 'expired') return { label: 'Hết hạn', cls: 'badge-error' }
    if (status === 'closed') return { label: 'Đã đóng', cls: 'badge-error' }
  }
  if (ctx === 'user') {
    if (status === 'active') return { label: 'Hoạt động', cls: 'badge-success' }
    if (status === 'inactive') return { label: 'Không hoạt động', cls: 'badge-neutral' }
    if (status === 'banned') return { label: 'Đã khóa', cls: 'badge-error' }
  }
  // applications / cv parse
  if (status === 'pending') return { label: 'Chờ xét', cls: 'badge-warning' }
  if (status === 'accepted') return { label: 'Đồng ý', cls: 'badge-success' }
  if (status === 'rejected') return { label: 'Từ chối', cls: 'badge-error' }
  if (status === 'success') return { label: 'Đã phân tích', cls: 'badge-success' }
  if (status === 'failed') return { label: 'Phân tích thất bại', cls: 'badge-error' }
  return { label: status, cls: 'badge-neutral' }
}

export const StatusBadge = ({ status, ctx }) => {
  const info = statusInfo(status, ctx)
  return (
    <span className={`badge ${info.cls}`}>
      <span className="dot" />
      {info.label}
    </span>
  )
}

const LEVEL_MAP = {
  Fresher: { cls: 'level-fresher', label: 'Fresher' },
  Junior: { cls: 'level-junior', label: 'Junior' },
  Mid: { cls: 'level-mid', label: 'Mid' },
  Senior: { cls: 'level-senior', label: 'Senior' },
  Manager: { cls: 'level-manager', label: 'Manager' },
}

export const LevelBadge = ({ level }) => {
  const info = LEVEL_MAP[level] || LEVEL_MAP.Mid
  return <span className={`badge ${info.cls}`}>{info.label}</span>
}
