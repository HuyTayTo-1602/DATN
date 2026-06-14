export const LABEL = {
  // role
  job_seeker: 'Ứng viên',
  recruiter: 'Nhà tuyển dụng',
  admin: 'Quản trị viên',
  // user status
  active: 'Hoạt động',
  inactive: 'Không hoạt động',
  banned: 'Đã khóa',
  // level
  Junior: 'Junior',
  Mid: 'Mid',
  Senior: 'Senior',
  Manager: 'Manager',
  Fresher: 'Fresher',
  // job status
  closed: 'Đã đóng',
  // app status
  pending: 'Chờ xét',
  accepted: 'Được chọn',
  rejected: 'Không được chọn',
  // company size
  '1-50': '1–50 nhân viên',
  '51-200': '51–200 nhân viên',
  '200+': '200+ nhân viên',
  '11-50': '11–50 nhân viên',
  '201-500': '201–500 nhân viên',
  '500+': '500+ nhân viên',
  // notification types
  application_submitted: 'Có ứng viên mới nộp đơn',
  application_accepted: 'Đơn ứng tuyển được đồng ý',
  application_rejected: 'Đơn ứng tuyển bị từ chối',
  job_match: 'Việc làm mới phù hợp',
  job_invitation: 'Lời mời ứng tuyển',
}

export const formatDateVN = (iso) => {
  if (!iso) return '—'
  const parts = String(iso).slice(0, 10).split('-')
  if (parts.length !== 3) return iso
  const [y, m, d] = parts
  return `${d}/${m}/${y}`
}

export const daysUntil = (iso) => {
  if (!iso) return null
  const d = new Date(iso)
  const t = new Date()
  t.setHours(0, 0, 0, 0)
  d.setHours(0, 0, 0, 0)
  return Math.ceil((d - t) / (24 * 3600 * 1000))
}

export const timeAgo = (iso) => {
  if (!iso) return ''
  const d = new Date(iso)
  const diffMs = Date.now() - d.getTime()
  const sec = Math.floor(diffMs / 1000)
  if (sec < 60) return 'Vừa xong'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} phút trước`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr} giờ trước`
  const day = Math.floor(hr / 24)
  if (day === 1) return 'Hôm qua'
  if (day < 7) return `${day} ngày trước`
  return formatDateVN(iso)
}

export const initials = (name = '') => (name || '?').trim().charAt(0).toUpperCase()

const PALETTE = ['#2D6A8A', '#4AABB8', '#7849B8', '#2D8A6A', '#C47F1A', '#B84A4A', '#2D5FA8', '#475569', '#0F4C9A', '#A50064']
export const colorFromString = (str = '') => {
  let hash = 0
  for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash)
  return PALETTE[Math.abs(hash) % PALETTE.length]
}
