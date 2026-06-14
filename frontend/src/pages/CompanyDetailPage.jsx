import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Icon from '../components/Icon'
import { CompanyLogo } from '../components/Avatar'
import JobCard from '../components/jobs/JobCard'
import EmptyState from '../components/EmptyState'
import { Spinner, SkeletonJobCard } from '../components/Spinner'
import { companiesApi, jobsApi } from '../services/api'
import { LABEL } from '../utils/format'

const CompanyDetailPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [company, setCompany] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [jobsLoading, setJobsLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setNotFound(false)
    companiesApi.get(id)
      .then((data) => { if (active) setCompany(data) })
      .catch(() => { if (active) setNotFound(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [id])

  useEffect(() => {
    if (!company) return
    let active = true
    setJobsLoading(true)
    jobsApi.list({ company_name: company.name, only_active_deadline: true, page: 1, page_size: 24 })
      .then((data) => { if (active) setJobs((data?.items || []).filter((j) => j.company?.id === company.id)) })
      .catch(() => {})
      .finally(() => { if (active) setJobsLoading(false) })
    return () => { active = false }
  }, [company])

  if (loading) {
    return (
      <div className="container" style={{ padding: '64px 0', display: 'flex', justifyContent: 'center' }}>
        <Spinner />
      </div>
    )
  }

  if (notFound || !company) {
    return (
      <div className="container">
        <EmptyState icon="building" title="Không tìm thấy công ty" description="Công ty này có thể đã bị gỡ hoặc không tồn tại." action={<button className="btn btn-primary" onClick={() => navigate('/companies')}>Quay lại danh sách công ty</button>} />
      </div>
    )
  }

  return (
    <div className="container">
      <div style={{ padding: '32px 0 64px' }}>
        <div className="card" style={{ padding: 32, marginBottom: 24, position: 'relative', overflow: 'hidden' }}>
          <div className="row" style={{ gap: 24, position: 'relative' }}>
            <CompanyLogo company={company} size={88} />
            <div style={{ flex: 1 }}>
              <div className="row" style={{ gap: 10, marginBottom: 8 }}>
                <h1 style={{ fontSize: 'var(--text-3xl)' }}>{company.name}</h1>
              </div>
              <div className="row" style={{ gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {company.size && <span className="badge badge-primary">{LABEL[company.size] || company.size}</span>}
              </div>
              <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', fontSize: 'var(--text-sm)', color: 'var(--color-text-secondary)' }}>
                {company.address && <span className="row gap-sm"><Icon name="map-pin" size={14} />{company.address}</span>}
                {company.website && <span className="row gap-sm"><Icon name="globe" size={14} />{company.website}</span>}
              </div>
            </div>
          </div>
        </div>

        {company.description && (
          <div className="card" style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 'var(--text-lg)', marginBottom: 12, fontFamily: 'var(--font-display)' }}>Giới thiệu</h3>
            <p style={{ lineHeight: 1.7, color: 'var(--color-text-primary)', whiteSpace: 'pre-line' }}>{company.description}</p>
          </div>
        )}

        <div className="section-head" style={{ marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: 'var(--text-2xl)' }}>Tin tuyển dụng đang mở</h2>
            <p>{jobsLoading ? 'Đang tải...' : `${jobs.length} vị trí đang chờ bạn`}</p>
          </div>
        </div>
        {jobsLoading ? (
          <div className="job-grid">{[1, 2, 3].map((i) => <SkeletonJobCard key={i} />)}</div>
        ) : jobs.length === 0 ? (
          <EmptyState icon="briefcase" title="Hiện chưa có vị trí nào đang tuyển" description="Hãy quay lại sau để xem các tin tuyển dụng mới." />
        ) : (
          <div className="job-grid">
            {jobs.map((j) => <JobCard key={j.id} job={j} />)}
          </div>
        )}
      </div>
    </div>
  )
}

export default CompanyDetailPage
