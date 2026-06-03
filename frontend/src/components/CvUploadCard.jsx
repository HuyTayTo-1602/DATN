import { useRef, useState, useEffect } from 'react'
import { cvApi } from '../services/api'

const PARSE_LABEL = { pending: 'Đang xử lý', success: 'Đã trích xuất text', failed: 'Parse thất bại' }
const PARSE_COLOR = { pending: '#f59e0b', success: '#10b981', failed: '#ef4444' }
const MAX_MB = 10

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export default function CvUploadCard() {
  const [cvList, setCvList] = useState([])
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const fileRef = useRef()

  useEffect(() => { loadCvs() }, [])

  async function loadCvs() {
    try {
      const data = await cvApi.mine()
      setCvList(data)
    } catch {
      // silent — user may not have any CVs yet
    }
  }

  async function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    setSuccess('')

    if (file.type !== 'application/pdf') {
      setError('Chỉ chấp nhận file PDF.')
      fileRef.current.value = ''
      return
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`File quá lớn. Tối đa ${MAX_MB} MB.`)
      fileRef.current.value = ''
      return
    }

    setUploading(true)
    try {
      const res = await cvApi.upload(file)
      setSuccess(`Upload thành công: ${res.file_name}`)
      await loadCvs()
    } catch (err) {
      setError(err.message || 'Upload thất bại')
    } finally {
      setUploading(false)
      fileRef.current.value = ''
    }
  }

  async function handleActivate(cvId) {
    setError('')
    try {
      await cvApi.activate(cvId)
      await loadCvs()
    } catch (err) {
      setError(err.message || 'Kích hoạt thất bại')
    }
  }

  const cardStyle = {
    background: 'var(--card, #fff)',
    border: '1px solid var(--border, #e2e8f0)',
    borderRadius: 12,
    padding: '24px 28px',
    marginTop: 28,
  }
  const sectionTitle = {
    fontSize: '1rem',
    fontWeight: 700,
    color: 'var(--text, #1e293b)',
    marginBottom: 16,
  }
  const uploadBtn = {
    display: 'inline-block',
    padding: '9px 20px',
    background: uploading ? '#94a3b8' : 'var(--primary, #3b82f6)',
    color: '#fff',
    borderRadius: 8,
    cursor: uploading ? 'not-allowed' : 'pointer',
    fontSize: '0.9rem',
    fontWeight: 600,
    border: 'none',
    marginBottom: 12,
  }
  const tableRow = {
    display: 'grid',
    gridTemplateColumns: '1fr auto auto auto',
    gap: '0 12px',
    alignItems: 'center',
    padding: '10px 0',
    borderBottom: '1px solid var(--border, #f1f5f9)',
    fontSize: '0.88rem',
  }

  return (
    <div style={cardStyle}>
      <div style={sectionTitle}>Quản lý CV</div>

      {/* Upload button */}
      <label style={uploadBtn}>
        {uploading ? 'Đang upload...' : '+ Upload CV (PDF)'}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          disabled={uploading}
        />
      </label>
      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted, #94a3b8)', marginBottom: 12 }}>
        Tối đa {MAX_MB} MB · Chỉ PDF text-based
      </div>

      {error && (
        <div style={{ color: '#ef4444', background: '#fef2f2', borderRadius: 6, padding: '8px 14px', marginBottom: 10, fontSize: '0.875rem' }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ color: '#10b981', background: '#f0fdf4', borderRadius: 6, padding: '8px 14px', marginBottom: 10, fontSize: '0.875rem' }}>
          {success}
        </div>
      )}

      {/* CV list */}
      {cvList.length === 0 ? (
        <div style={{ color: 'var(--text-muted, #94a3b8)', fontStyle: 'italic', fontSize: '0.9rem' }}>
          Chưa có CV nào. Upload CV đầu tiên để bắt đầu.
        </div>
      ) : (
        <div>
          <div style={{ ...tableRow, fontWeight: 600, color: 'var(--text-muted, #64748b)', fontSize: '0.78rem', textTransform: 'uppercase' }}>
            <span>Tên file</span>
            <span>Kích thước</span>
            <span>Trạng thái</span>
            <span>Hành động</span>
          </div>
          {cvList.map((cv) => (
            <div key={cv.id} style={tableRow}>
              <span style={{ fontWeight: cv.is_active ? 600 : 400, color: cv.is_active ? 'var(--primary, #3b82f6)' : 'inherit' }}>
                {cv.file_name}
                {cv.is_active && (
                  <span style={{ marginLeft: 8, fontSize: '0.7rem', background: '#dbeafe', color: '#1d4ed8', borderRadius: 4, padding: '2px 6px' }}>
                    Active
                  </span>
                )}
              </span>
              <span style={{ color: 'var(--text-muted, #64748b)' }}>{formatBytes(cv.file_size)}</span>
              <span style={{ color: PARSE_COLOR[cv.parse_status] ?? '#64748b' }}>
                {PARSE_LABEL[cv.parse_status] ?? cv.parse_status}
              </span>
              {!cv.is_active && (
                <button
                  onClick={() => handleActivate(cv.id)}
                  style={{ padding: '4px 12px', fontSize: '0.8rem', borderRadius: 6, border: '1px solid var(--border, #e2e8f0)', background: 'transparent', cursor: 'pointer' }}
                >
                  Kích hoạt
                </button>
              )}
              {cv.is_active && <span />}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
