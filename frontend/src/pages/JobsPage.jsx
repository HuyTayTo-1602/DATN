import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import Icon from '../components/Icon'
import JobCard from '../components/jobs/JobCard'
import EmptyState from '../components/EmptyState'
import Pagination from '../components/Pagination'
import { SkeletonJobCard } from '../components/Spinner'
import { jobsApi } from '../services/api'
import { PROVINCES, DISTRICTS_BY_PROVINCE } from '../utils/locations'

const SALARY_BUCKETS = [
  { value: 'lt10', label: 'Dưới 10 triệu', min: 0, max: 10 },
  { value: '10-20', label: '10 — 20 triệu', min: 10, max: 20 },
  { value: '20-40', label: '20 — 40 triệu', min: 20, max: 40 },
  { value: '40-70', label: '40 — 70 triệu', min: 40, max: 70 },
  { value: 'gt70', label: 'Trên 70 triệu', min: 70, max: undefined },
]

const PAGE_SIZE = 10

const emptyFilters = { keyword: '', province: '', district: '', level: '', salaryRange: '', company: '', activeOnly: true }

const JobsPage = () => {
  const [searchParams] = useSearchParams()
  const [filters, setFilters] = useState(() => ({ ...emptyFilters, keyword: searchParams.get('keyword') || '' }))
  const [draft, setDraft] = useState(() => ({ ...emptyFilters, keyword: searchParams.get('keyword') || '' }))
  const [page, setPage] = useState(1)
  const [result, setResult] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    setLoading(true)
    const bucket = SALARY_BUCKETS.find((b) => b.value === filters.salaryRange)
    jobsApi.list({
      keyword: filters.keyword || undefined,
      province: filters.province || undefined,
      district: filters.district || undefined,
      level: filters.level || undefined,
      salary_min: bucket?.min,
      salary_max: bucket?.max,
      company_name: filters.company || undefined,
      only_active_deadline: filters.activeOnly,
      page,
      page_size: PAGE_SIZE,
    })
      .then((data) => { if (active) setResult({ items: data?.items || [], total: data?.total || 0 }) })
      .catch(() => { if (active) setResult({ items: [], total: 0 }) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [filters, page])

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE))

  const applyFilters = (e) => {
    e?.preventDefault()
    setFilters({ ...draft })
    setPage(1)
  }

  const clearFilters = () => {
    setDraft({ ...emptyFilters })
    setFilters({ ...emptyFilters })
    setPage(1)
  }

  const setDraftField = (patch) => setDraft((f) => ({ ...f, ...patch }))

  return (
    <div className="container">
      <div className="section-head" style={{ marginTop: 24 }}>
        <div>
          <h1>Tìm việc làm</h1>
          <p>Khám phá hàng nghìn cơ hội việc làm phù hợp với bạn</p>
        </div>
      </div>
      <div className="jobs-layout">
        <aside className="filter-panel filter-panel-v2">
          <div className="filter-title">
            <span className="filter-title-icon"><Icon name="search" size={16} /></span>
            Bộ lọc tìm kiếm
          </div>
          <hr className="filter-divider" />

          <form onSubmit={applyFilters}>
            <div className="filter-group">
              <label className="filter-label-uc">Từ khóa</label>
              <input className="input" placeholder="Vị trí, kỹ năng, mô tả..." value={draft.keyword} onChange={(e) => setDraftField({ keyword: e.target.value })} />
            </div>

            <div className="filter-group">
              <label className="filter-label-uc">Tỉnh / Thành phố</label>
              <select className="select" value={draft.province} onChange={(e) => setDraftField({ province: e.target.value, district: '' })}>
                <option value="">—— Tất cả tỉnh/thành ——</option>
                {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label-uc">Quận / Huyện</label>
              <select className="select" value={draft.district} disabled={!draft.province} onChange={(e) => setDraftField({ district: e.target.value })}>
                <option value="">{draft.province ? '—— Tất cả quận/huyện ——' : '—— Chọn tỉnh trước ——'}</option>
                {(DISTRICTS_BY_PROVINCE[draft.province] || []).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label-uc">Cấp bậc</label>
              <select className="select" value={draft.level} onChange={(e) => setDraftField({ level: e.target.value })}>
                <option value="">Tất cả cấp bậc</option>
                <option value="Fresher">Fresher</option>
                <option value="Junior">Junior</option>
                <option value="Mid">Mid</option>
                <option value="Senior">Senior</option>
                <option value="Manager">Manager</option>
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label-uc">Mức lương</label>
              <select className="select" value={draft.salaryRange} onChange={(e) => setDraftField({ salaryRange: e.target.value })}>
                <option value="">Tất cả mức lương</option>
                {SALARY_BUCKETS.map((b) => <option key={b.value} value={b.value}>{b.label}</option>)}
              </select>
            </div>

            <div className="filter-group">
              <label className="filter-label-uc">Tên công ty</label>
              <input className="input" placeholder="VD: FPT, Viettel..." value={draft.company} onChange={(e) => setDraftField({ company: e.target.value })} />
            </div>

            <div className="filter-group">
              <label className="checkbox checkbox-uc">
                <input type="checkbox" checked={draft.activeOnly} onChange={(e) => setDraftField({ activeOnly: e.target.checked })} />
                Còn hạn nộp hồ sơ
              </label>
            </div>

            <button type="button" className="btn btn-primary btn-block btn-lg" style={{ marginTop: 4 }} onClick={applyFilters}>
              <Icon name="search" size={14} />Tìm kiếm
            </button>
            <button type="button" className="btn btn-ghost btn-sm btn-block" style={{ marginTop: 8 }} onClick={clearFilters}>
              Xóa bộ lọc
            </button>
          </form>
        </aside>

        <div>
          <div className="jobs-toolbar">
            <div className="jobs-count">Tìm thấy <strong>{result.total}</strong> việc làm</div>
          </div>
          {loading ? (
            <div className="job-grid job-grid-2col">{[1, 2, 3, 4].map((i) => <SkeletonJobCard key={i} />)}</div>
          ) : result.items.length === 0 ? (
            <EmptyState
              icon="search"
              title="Không tìm thấy việc làm phù hợp"
              description="Thử thay đổi bộ lọc hoặc từ khóa khác để xem thêm cơ hội."
              action={<button className="btn btn-outline" onClick={clearFilters}>Xóa bộ lọc</button>}
            />
          ) : (
            <div className="job-grid job-grid-2col">
              {result.items.map((j) => <JobCard key={j.id} job={j} />)}
            </div>
          )}
          {totalPages > 1 && <Pagination page={page} total={totalPages} onChange={setPage} withGoto />}
        </div>
      </div>
    </div>
  )
}

export default JobsPage
