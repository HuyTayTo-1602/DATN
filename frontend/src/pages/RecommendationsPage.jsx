import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import Icon from '../components/Icon'
import JobCard from '../components/jobs/JobCard'
import EmptyState from '../components/EmptyState'
import { SkeletonJobCard } from '../components/Spinner'
import { jobsApi } from '../services/api'

const RecommendationsPage = () => {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    jobsApi.recommendations(20)
      .then((data) => { if (active) setJobs(data?.items || []) })
      .catch(() => { if (active) setError(true) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [])

  return (
    <div className="container" style={{ paddingTop: 32, paddingBottom: 64 }}>
      <div className="page-head">
        <div>
          <h1>Việc làm phù hợp với bạn</h1>
          <p className="text-secondary mb-0">Gợi ý cá nhân hóa dựa trên CV và hồ sơ kỹ năng</p>
        </div>
      </div>

      {loading ? (
        <div className="job-grid">{[1, 2, 3, 4, 5, 6].map((i) => <SkeletonJobCard key={i} />)}</div>
      ) : error || jobs.length === 0 ? (
        <EmptyState
          icon="sparkles"
          title="Chưa có gợi ý phù hợp"
          description="Hãy hoàn thiện hồ sơ và tải lên CV để hệ thống có thể gợi ý việc làm phù hợp nhất với bạn."
          action={<Link to="/my-cvs" className="btn btn-primary">Quản lý CV <Icon name="arrow-right" size={14} /></Link>}
        />
      ) : (
        <div className="job-grid">
          {jobs.map((j) => <JobCard key={j.id} job={j} />)}
        </div>
      )}
    </div>
  )
}

export default RecommendationsPage
