import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { jobsApi } from '../services/api'
import { useAuth } from '../context/AuthContext'
import Spinner from '../components/Spinner'
import { useNavigate } from 'react-router-dom'

export default function MyJobsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleting, setDeleting] = useState(null)

  useEffect(() => {
    if (user?.role !== 'recruiter') return
    jobsApi.myJobs()
      .then(setJobs)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [user])

  const handleDelete = async (jobId) => {
    if (!window.confirm('Bạn có chắc muốn xóa tin tuyển dụng này?')) return
    setDeleting(jobId)
    try {
      await jobsApi.delete(jobId)
      setJobs((prev) => prev.filter((j) => j.id !== jobId))
    } catch (err) {
      alert('Lỗi: ' + err.message)
    } finally {
      setDeleting(null)
    }
  }

  if (!user || user.role !== 'recruiter') {
    return (
      <div className="container" style={{ padding: '60px 20px', textAlign: 'center' }}>
        <div className="alert alert-error" style={{ maxWidth: 440, margin: '0 auto' }}>
          ⚠️ Trang này chỉ dành cho nhà tuyển dụng.
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="page-header">
        <div className="container flex justify-between items-center">
          <div>
            <h1>Quản lý tin tuyển dụng</h1>
            <p>Theo dõi và quản lý các tin đã đăng</p>
          </div>
          <Link to="/post-job" className="btn btn-primary">
            + Đăng tin mới
          </Link>
        </div>
      </div>

      <div className="container section" style={{ paddingTop: 28 }}>
        {error && <div className="alert alert-error">{error}</div>}

        {loading ? (
          <Spinner />
        ) : jobs.length === 0 ? (
          <div className="empty">
            <div className="empty-icon">📢</div>
            <h3>Chưa có tin tuyển dụng nào</h3>
            <p>Đăng tin đầu tiên để tiếp cận ứng viên tiềm năng</p>
            <Link to="/post-job" className="btn btn-primary" style={{ display: 'inline-flex', marginTop: 16 }}>
              Đăng tin ngay
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>STT</th>
                  <th>Vị trí</th>
                  <th>Công ty</th>
                  <th>Địa điểm</th>
                  <th>Cấp bậc</th>
                  <th>Trạng thái</th>
                  <th>Ứng viên</th>
                  <th>Hạn nộp</th>
                  <th>Hành động</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((job, i) => (
                  <tr key={job.id}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td>
                      <Link to={`/jobs/${job.id}`} style={{ fontWeight: 600, color: 'var(--primary-light)' }}>
                        {job.title}
                      </Link>
                    </td>
                    <td>{job.company?.name || '—'}</td>
                    <td>{job.location || '—'}</td>
                    <td>
                      {job.level ? (
                        <span className="badge badge-blue">{job.level}</span>
                      ) : '—'}
                    </td>
                    <td>
                      <span className={`status-badge status-${job.status}`}>
                        {job.status === 'active' ? 'Đang tuyển' :
                         job.status === 'closed' ? 'Đã đóng' : 'Nháp'}
                      </span>
                    </td>
                    <td>
                      <button
                        className="btn btn-ghost btn-sm"
                        style={{ fontWeight: 600 }}
                        onClick={() => navigate(`/my-jobs/${job.id}/applicants`)}
                      >
                        👥 {job.applicant_count ?? 0}
                      </button>
                    </td>
                    <td style={{ color: 'var(--text-muted)' }}>
                      {job.deadline
                        ? new Date(job.deadline).toLocaleDateString('vi-VN')
                        : '—'}
                    </td>
                    <td>
                      <div className="flex gap-2">
                        <Link to={`/jobs/${job.id}`} className="btn btn-ghost btn-sm">
                          Xem
                        </Link>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDelete(job.id)}
                          disabled={deleting === job.id}
                        >
                          {deleting === job.id ? '...' : 'Xóa'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
