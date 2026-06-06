import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import RecommendedJobsSection from './RecommendedJobsSection'

vi.mock('../../services/api', () => ({
  jobsApi: { recommendations: vi.fn() },
}))

import { jobsApi } from '../../services/api'

function wrap() {
  return render(<MemoryRouter><RecommendedJobsSection /></MemoryRouter>)
}

function makeJob(overrides = {}) {
  return {
    id: 1, title: 'Python Developer', level: 'Senior', salary: '20',
    location: 'Ha Noi', deadline: null, status: 'active',
    company: { id: 1, name: 'Tech Corp', logo_url: null },
    match_score: 5, match_reason: 'Matched: python, fastapi, backend',
    ...overrides,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('RecommendedJobsSection - loading', () => {
  it('hien thi skeleton khi dang fetch', () => {
    jobsApi.recommendations.mockReturnValue(new Promise(() => {}))
    wrap()
    expect(document.querySelectorAll('.skeleton-card').length).toBe(3)
  })
})

describe('RecommendedJobsSection - empty states', () => {
  it('hien thi CTA upload CV khi has_cv = false', async () => {
    jobsApi.recommendations.mockResolvedValue({ items: [], total: 0, has_cv: false, cv_parsed: false })
    wrap()
    expect(await screen.findByText(/Upload CV ngay/i)).toBeInTheDocument()
  })

  it('link upload CV tro den /profile', async () => {
    jobsApi.recommendations.mockResolvedValue({ items: [], total: 0, has_cv: false, cv_parsed: false })
    wrap()
    const link = await screen.findByRole('link', { name: /Upload CV ngay/i })
    expect(link.getAttribute('href')).toBe('/profile')
  })

  it('hien thi thong bao dang xu ly khi cv_parsed = false', async () => {
    jobsApi.recommendations.mockResolvedValue({ items: [], total: 0, has_cv: true, cv_parsed: false })
    wrap()
    expect(await screen.findByText(/CV dang duoc xu ly|CV đang được xử lý/i)).toBeInTheDocument()
  })

  it('hien thi thong bao khong tim duoc job khi items rong', async () => {
    jobsApi.recommendations.mockResolvedValue({ items: [], total: 0, has_cv: true, cv_parsed: true })
    wrap()
    expect(await screen.findByRole('link', { name: /tim kiem thu cong|tìm kiếm thủ công/i })).toBeInTheDocument()
  })
})

describe('RecommendedJobsSection - with results', () => {
  it('hien thi tieu de section', async () => {
    jobsApi.recommendations.mockResolvedValue({ items: [makeJob()], total: 1, has_cv: true, cv_parsed: true })
    wrap()
    expect(await screen.findByText(/viec lam goi y|Việc làm gợi ý/i)).toBeInTheDocument()
  })

  it('hien thi match_reason duoi moi job card', async () => {
    jobsApi.recommendations.mockResolvedValue({
      items: [makeJob({ match_reason: 'Matched: python, fastapi, backend' })],
      total: 1, has_cv: true, cv_parsed: true,
    })
    wrap()
    expect(await screen.findByText(/Matched: python, fastapi, backend/i)).toBeInTheDocument()
  })

  it('khong hien thi match_reason neu rong', async () => {
    jobsApi.recommendations.mockResolvedValue({ items: [makeJob({ match_reason: '' })], total: 1, has_cv: true, cv_parsed: true })
    wrap()
    await screen.findByText(/Python Developer/i)
    expect(screen.queryByText(/Matched:/i)).not.toBeInTheDocument()
  })

  it('hien thi dung so luong job card', async () => {
    const jobs = [1, 2, 3].map(i => makeJob({ id: i, title: `Job ${i}` }))
    jobsApi.recommendations.mockResolvedValue({ items: jobs, total: 3, has_cv: true, cv_parsed: true })
    wrap()
    await waitFor(() => {
      expect(screen.getByText('Job 1')).toBeInTheDocument()
      expect(screen.getByText('Job 2')).toBeInTheDocument()
      expect(screen.getByText('Job 3')).toBeInTheDocument()
    })
  })

  it('moi job card la link den trang detail', async () => {
    jobsApi.recommendations.mockResolvedValue({ items: [makeJob({ id: 42, title: 'Go Engineer' })], total: 1, has_cv: true, cv_parsed: true })
    wrap()
    const link = await screen.findByRole('link', { name: /Go Engineer/i })
    expect(link.getAttribute('href')).toBe('/jobs/42')
  })
})

describe('RecommendedJobsSection - error', () => {
  it('hien thi loi khi API that bai', async () => {
    jobsApi.recommendations.mockRejectedValue(new Error('Network error'))
    wrap()
    expect(await screen.findByText(/Khong the tai goi y|Không thể tải gợi ý/i)).toBeInTheDocument()
  })
})