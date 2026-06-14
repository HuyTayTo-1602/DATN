import { useEffect, useRef, useState } from 'react'
import Icon from '../components/Icon'
import EmptyState from '../components/EmptyState'
import { Spinner } from '../components/Spinner'
import { useToast } from '../components/Toast'
import { cvApi } from '../services/api'
import { formatDateVN } from '../utils/format'

const PARSE_INFO = {
  success: { label: 'Đã phân tích', cls: 'badge-success', icon: 'check' },
  pending: { label: 'Đang phân tích...', cls: 'badge-warning', icon: 'clock' },
  failed: { label: 'Không đọc được', cls: 'badge-error', icon: 'warning' },
}
const parseInfo = (s) => PARSE_INFO[s] || PARSE_INFO.pending

const MyCvsPage = () => {
  const toast = useToast()
  const fileInputRef = useRef(null)
  const [cvs, setCvs] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [busyId, setBusyId] = useState(null)

  const load = () => {
    setLoading(true)
    return cvApi.mine()
      .then((data) => setCvs(Array.isArray(data) ? data : (data?.items || [])))
      .catch(() => setCvs([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleUploadClick = () => fileInputRef.current?.click()

  const handleFiles = async (files) => {
    if (!files || !files.length) return
    const file = files[0]
    if (file.type !== 'application/pdf') { toast.error('Chỉ chấp nhận file PDF'); return }
    if (file.size > 10 * 1024 * 1024) { toast.error('File vượt quá dung lượng tối đa 10MB'); return }
    setUploading(true)
    try {
      await cvApi.upload(file)
      toast.success('Đã tải lên CV thành công')
      await load()
    } catch (err) {
      toast.error(err.message || 'Không thể tải lên CV')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const handleActivate = async (id) => {
    setBusyId(id)
    try {
      await cvApi.activate(id)
      toast.success('Đã đặt làm CV chính')
      await load()
    } catch (err) {
      toast.error(err.message || 'Không thể kích hoạt CV')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div className="page-head">
        <div>
          <h1>CV của tôi</h1>
          <p className="text-secondary mb-0">Quản lý và đặt CV chính để dùng khi ứng tuyển</p>
        </div>
        <button className="btn btn-primary" onClick={handleUploadClick} disabled={uploading}>
          <Icon name="upload" size={14} />{uploading ? 'Đang tải lên...' : 'Tải CV mới'}
        </button>
        <input ref={fileInputRef} type="file" accept="application/pdf" style={{ display: 'none' }} onChange={(e) => handleFiles(e.target.files)} />
      </div>

      <div className="upload-zone" onClick={handleUploadClick}>
        <Icon name="upload" size={32} />
        <h4>Kéo thả file PDF vào đây</h4>
        <p className="text-sm text-secondary mb-0">hoặc <span style={{ color: 'var(--color-primary)', fontWeight: 600 }}>chọn file từ máy tính</span> · tối đa 10MB</p>
      </div>

      {loading ? (
        <Spinner />
      ) : cvs.length === 0 ? (
        <EmptyState icon="cv" title="Chưa có CV nào" description="Hãy tải lên CV (định dạng PDF) để bắt đầu ứng tuyển và nhận gợi ý việc làm phù hợp." />
      ) : (
        <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {cvs.map((cv) => {
            const parse = parseInfo(cv.parse_status)
            return (
              <div className="cv-item" key={cv.id}>
                <div className="cv-icon"><Icon name="file" size={22} /></div>
                <div className="cv-info">
                  <div className="cv-name">
                    {cv.file_name}
                    {cv.is_active && <span className="badge badge-primary"><Icon name="star" size={11} />CV chính</span>}
                  </div>
                  <div className="cv-meta">
                    <span>Ngày tải: {formatDateVN(cv.uploaded_at)}</span>
                    <span>·</span>
                    <span>{(cv.file_size / 1024).toFixed(0)} KB</span>
                    <span>·</span>
                    <span className={`badge ${parse.cls}`} style={{ fontSize: 11 }}><Icon name={parse.icon} size={10} />{parse.label}</span>
                  </div>
                </div>
                <div className="cv-actions">
                  {!cv.is_active && (
                    <button className="btn btn-outline btn-sm" onClick={() => handleActivate(cv.id)} disabled={busyId === cv.id}>
                      <Icon name="star" size={12} />{busyId === cv.id ? 'Đang xử lý...' : 'Đặt làm chính'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MyCvsPage
