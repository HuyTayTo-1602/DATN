// ============================================================
// services/api.js – Tập trung toàn bộ lời gọi API
// Backend: http://localhost:8000/api/v1  (proxied qua /api)
// ============================================================

const BASE = '/api/v1'

function getToken() {
  return localStorage.getItem('access_token')
}

function getRefreshToken() {
  return localStorage.getItem('refresh_token')
}

function setTokens({ access_token, refresh_token }) {
  if (access_token) localStorage.setItem('access_token', access_token)
  if (refresh_token) localStorage.setItem('refresh_token', refresh_token)
}

export function clearTokens() {
  localStorage.removeItem('access_token')
  localStorage.removeItem('refresh_token')
}

let refreshPromise = null

async function tryRefreshToken() {
  const refreshToken = getRefreshToken()
  if (!refreshToken) return false
  if (!refreshPromise) {
    refreshPromise = fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    })
      .then(async (res) => {
        if (!res.ok) return false
        const data = await res.json().catch(() => null)
        if (!data?.access_token) return false
        setTokens({ access_token: data.access_token })
        return true
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null
      })
  }
  return refreshPromise
}

function buildErrorMessage(data) {
  if (typeof data?.detail === 'string') return data.detail
  if (Array.isArray(data?.detail)) return data.detail.map((e) => e.msg).join(', ')
  return 'Đã có lỗi xảy ra'
}

async function request(method, path, body = null, auth = false, _retried = false) {
  const headers = {}

  if (body) headers['Content-Type'] = 'application/json'
  if (auth) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 204) return null

  if (res.status === 401 && auth && !_retried) {
    const refreshed = await tryRefreshToken()
    if (refreshed) return request(method, path, body, auth, true)
    clearTokens()
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) throw new Error(buildErrorMessage(data))

  return data
}

// ── AUTH ────────────────────────────────────────────────────
export const authApi = {
  login: (email, password) => request('POST', '/auth/login', { email, password }),

  register: (email, password, role) =>
    request('POST', '/auth/register', { email, password, role }),

  me: () => request('GET', '/auth/me', null, true),

  refresh: (refreshToken) => request('POST', '/auth/refresh', { refresh_token: refreshToken }),

  saveSession: (data) => setTokens(data),
}

// ── JOBS ────────────────────────────────────────────────────
export const jobsApi = {
  list: ({ keyword, location, province, district, level, salary_min, salary_max, company_name, only_active_deadline, page = 1, page_size = 9 } = {}) => {
    const params = new URLSearchParams()
    if (keyword) params.append('keyword', keyword)
    if (location) params.append('location', location)
    if (province) params.append('province', province)
    if (district) params.append('district', district)
    if (level) params.append('level', level)
    if (salary_min != null && salary_min !== '') params.append('salary_min', salary_min)
    if (salary_max != null && salary_max !== '') params.append('salary_max', salary_max)
    if (company_name) params.append('company_name', company_name)
    if (only_active_deadline) params.append('only_active_deadline', 'true')
    params.append('page', page)
    params.append('page_size', page_size)
    return request('GET', `/jobs?${params}`)
  },

  get: (id) => request('GET', `/jobs/${id}`),

  myJobs: () => request('GET', '/jobs/my', null, true),

  create: (data) => request('POST', '/jobs', data, true),

  update: (id, data) => request('PUT', `/jobs/${id}`, data, true),

  delete: (id) => request('DELETE', `/jobs/${id}`, null, true),

  recommendations: (topN = 10) =>
    request('GET', `/jobs/recommendations?top_n=${topN}`, null, true),
}

// ── COMPANIES ───────────────────────────────────────────────
export const companiesApi = {
  get: (id) => request('GET', `/companies/${id}`),
  myCompany: () => request('GET', '/companies/my', null, true),
  create: (data) => request('POST', '/companies', data, true),
  update: (id, data) => request('PUT', `/companies/${id}`, data, true),
}

// ── PROFILE ──────────────────────────────────────────────────
export const profileApi = {
  get: () => request('GET', '/users/profile', null, true),
  update: (data) => request('PUT', '/users/profile', data, true),
}

// ── ADMIN ────────────────────────────────────────────────────
export const adminApi = {
  // Users
  listUsers: ({ page = 1, page_size = 10, role, status, search } = {}) => {
    const p = new URLSearchParams({ page, page_size })
    if (role) p.append('role', role)
    if (status) p.append('status', status)
    if (search) p.append('search', search)
    return request('GET', `/admin/users?${p}`, null, true)
  },
  createUser: (data) => request('POST', '/admin/users', data, true),
  updateUser: (id, data) => request('PUT', `/admin/users/${id}`, data, true),
  deleteUser: (id) => request('DELETE', `/admin/users/${id}`, null, true),

  // Companies
  listCompanies: ({ page = 1, page_size = 10, search } = {}) => {
    const p = new URLSearchParams({ page, page_size })
    if (search) p.append('search', search)
    return request('GET', `/admin/companies?${p}`, null, true)
  },
  createCompany: (data) => request('POST', '/admin/companies', data, true),
  updateCompany: (id, data) => request('PUT', `/admin/companies/${id}`, data, true),
  deleteCompany: (id) => request('DELETE', `/admin/companies/${id}`, null, true),

  // Jobs
  listJobs: ({ page = 1, page_size = 10, status, search } = {}) => {
    const p = new URLSearchParams({ page, page_size })
    if (status) p.append('status', status)
    if (search) p.append('search', search)
    return request('GET', `/admin/jobs?${p}`, null, true)
  },
  createJob: (data) => request('POST', '/admin/jobs', data, true),
  updateJob: (id, data) => request('PUT', `/admin/jobs/${id}`, data, true),
  deleteJob: (id) => request('DELETE', `/admin/jobs/${id}`, null, true),

  // Dashboard
  getDashboardSummary: (period = '30d') =>
    request('GET', `/admin/dashboard/summary?period=${encodeURIComponent(period)}`, null, true),
}

// ── CV ───────────────────────────────────────────────────────
async function uploadFile(path, file) {
  const token = getToken()
  const form = new FormData()
  form.append('file', file)
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: form,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(buildErrorMessage(data))
  return data
}

export const cvApi = {
  upload: (file) => uploadFile('/cvs/upload', file),
  mine: () => request('GET', '/cvs/me', null, true),
  activate: (cvId) => request('POST', `/cvs/${cvId}/activate`, null, true),
}

// ── CHATBOT ──────────────────────────────────────────────────
export const chatApi = {
  sendMessage: (message, jobId, threadId) =>
    request('POST', '/chatbot/message', {
      message,
      job_id: jobId ?? null,
      thread_id: threadId ?? null,
    }, true),

  myJobs: () => request('GET', '/chatbot/my-jobs', null, true),

  history: (threadId) =>
    request('GET', `/chatbot/history?thread_id=${encodeURIComponent(threadId)}`, null, true),
}

// ── NOTIFICATIONS ────────────────────────────────────────────
export const notificationsApi = {
  list: (limit = 50, offset = 0) =>
    request('GET', `/notifications?limit=${limit}&offset=${offset}`, null, true),

  unreadCount: () => request('GET', '/notifications/unread-count', null, true),

  markRead: (id) => request('POST', `/notifications/${id}/read`, null, true),

  markAllRead: () => request('POST', '/notifications/read-all', null, true),
}

// ── CANDIDATE SEARCH (recruiter / admin) ─────────────────────
async function streamFile(path) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(typeof data.detail === 'string' ? data.detail : 'Không thể tải CV')
  }
  return res.blob()
}

export const candidateApi = {
  search: ({ q = '', page = 1, page_size = 10 } = {}) => {
    const params = new URLSearchParams({ page, page_size })
    if (q) params.append('q', q)
    return request('GET', `/recruiter/candidates/search?${params}`, null, true)
  },

  matchForJob: (jobId, topN = 5) =>
    request('GET', `/recruiter/candidates/match/${jobId}?top_n=${topN}`, null, true),

  invite: (userId, { jobId, message }) =>
    request('POST', `/recruiter/candidates/${userId}/invite`, { job_id: jobId, message: message || '' }, true),

  streamCv: (userId) => streamFile(`/recruiter/candidates/${userId}/cv`),
}

// ── APPLICATIONS ─────────────────────────────────────────────
export const applicationsApi = {
  apply: (jobId, coverLetter, cvId) =>
    request('POST', `/applications/${jobId}`, { cover_letter: coverLetter || null, cv_id: cvId || null }, true),

  mine: () => request('GET', '/applications/mine', null, true),

  forJob: (jobId) => request('GET', `/applications/job/${jobId}`, null, true),

  updateStatus: (appId, status) =>
    request('PUT', `/applications/${appId}/status`, { status }, true),

  streamCv: (appId) => streamFile(`/applications/${appId}/cv`),
}
