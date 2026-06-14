import { Link } from 'react-router-dom'
import Icon from '../Icon'
import { CompanyLogo } from '../Avatar'
import { LevelBadge } from '../Badges'
import { daysUntil, formatDateVN } from '../../utils/format'

const JobCard = ({ job }) => {
  const company = job.company || {}
  const dleft = job.deadline ? daysUntil(job.deadline) : null
  const expiring = dleft != null && dleft >= 0 && dleft <= 3
  const expired = dleft != null && dleft < 0

  return (
    <Link to={`/jobs/${job.id}`} className="job-card" style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="job-card-head">
        <CompanyLogo company={company} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 className="job-title">{job.title}</h3>
          <p className="company-name">{company.name || 'Công ty ẩn danh'}</p>
        </div>
      </div>
      <div className="job-pills">
        {job.location && (
          <span className="pill">
            <Icon name="map-pin" size={11} />
            {job.location}
          </span>
        )}
        {job.salary && (
          <span className="pill pill-money">
            <Icon name="money" size={11} />
            {job.salary}
          </span>
        )}
        {job.level && <LevelBadge level={job.level} />}
        {expiring && (
          <span className="badge badge-warning">
            <Icon name="clock" size={11} />
            Sắp hết hạn
          </span>
        )}
        {expired && <span className="badge badge-error">Hết hạn</span>}
      </div>
      <div className="job-card-foot">
        {job.deadline && (
          <span className="pill pill-date">
            <Icon name="calendar" size={11} />
            {formatDateVN(job.deadline)}
          </span>
        )}
        {/* {job.match_score != null && job.match_score > 0 && (
          <span className="badge badge-primary">
            <Icon name="sparkles" size={11} />
            Phù hợp {job.match_score}%
          </span>
        )} */}
      </div>
    </Link>
  )
}

export default JobCard
