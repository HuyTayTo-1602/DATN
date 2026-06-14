import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Icon from '../../components/Icon'
import { StatusBadge } from '../../components/Badges'
import { Spinner } from '../../components/Spinner'
import { jobsApi } from '../../services/api'
import { formatDateVN } from '../../utils/format'

const RecruiterDashboardPage = () => {
  const navigate = useNavigate()
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    jobsApi.myJobs()
      .then((jobsData) => {
        if (!active) return
        setJobs(Array.isArray(jobsData) ? jobsData : (jobsData?.items || []))
      })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  if (loading) {
    return (
      <div className="container" style={{ padding: '64px 0', display: 'flex', justifyContent: 'center' }}>
        <Spinner />
      </div>
    )
  }

  const activeJobs = jobs.filter((j) => j.status === 'active').length
  const expiredJobs = jobs.filter((j) => j.deadline && new Date(j.deadline) < new Date()).length

  return (
    <div className="container" style={{ padding: '32px 0 64px' }}>
      <div className="page-head">
        <div>
          <h1>Chào mừng trở lại, nhà tuyển dụng</h1>
          <p className="text-secondary mb-0">Đây là tổng quan tuyển dụng của bạn</p>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/recruiter/jobs')}><Icon name="plus" size={14} />Đăng tin mới</button>
      </div>

      <div className="kpi-grid">
        <div className="kpi">
          <div className="kpi-label">Tin đang tuyển</div>
          <div className="kpi-num">{activeJobs}</div>
          <span className="text-xs text-muted">Trên tổng {jobs.length} tin đã đăng</span>
        </div>
        <div className="kpi">
          <div className="kpi-label">Tin hết hạn</div>
          <div className="kpi-num">{expiredJobs}</div>
          <span className="text-xs text-muted">Đã quá hạn nộp hồ sơ</span>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h3>Tin tuyển dụng của tôi</h3>
          <a onClick={() => navigate('/recruiter/jobs')} style={{ cursor: 'pointer', fontSize: 'var(--text-sm)' }}>Quản lý tất cả <Icon name="arrow-right" size={12} /></a>
        </div>
        {jobs.length === 0 ? (
          <div className="text-secondary text-sm" style={{ padding: 24, textAlign: 'center' }}>Bạn chưa đăng tin tuyển dụng nào.</div>
        ) : (
          <div className="table-wrap" style={{ borderRadius: 'var(--radius-md)' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th style={{ textAlign: 'center' }}>Ứng viên</th>
                  <th>Trạng thái</th>
                  <th>Hạn nộp</th>
                </tr>
              </thead>
              <tbody>
                {jobs.slice(0, 8).map((j) => (
                  <tr key={j.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/recruiter/jobs/${j.id}/applicants`)}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{j.title}</div>
                      <div className="text-xs text-muted">{j.company?.name}</div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 600 }}>{j.applicant_count ?? 0}</td>
                    <td><StatusBadge status={j.status} ctx="job" /></td>
                    <td className="text-sm">{formatDateVN(j.deadline)}</td>
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

export default RecruiterDashboardPage
