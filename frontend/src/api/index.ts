import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: `${BASE}/api`,
  headers: { 'Content-Type': 'application/json' },
})

let _token: string | null = null
export function setToken(t: string | null) { _token = t }
export function getToken() { return _token }

api.interceptors.request.use((config) => {
  if (_token) config.headers.Authorization = `Bearer ${_token}`
  return config
})
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) { _token = null; window.dispatchEvent(new Event('axiom:logout')) }
    return Promise.reject(err)
  }
)

export const authApi = {
  register: (data: object) => api.post('/auth/register', data).then(r => r.data),
  login: (data: object) => api.post('/auth/login', data).then(r => r.data),
  me: () => api.get('/auth/me').then(r => r.data),
  changePassword: (data: object) => api.put('/auth/change-password', data).then(r => r.data),
  updateProfile: (data: object) => api.put('/auth/update-profile', data).then(r => r.data),
  forgotUsername: (email: string) => api.post('/auth/forgot-username', { email }).then(r => r.data),
  recoverAccount: (data: object) => api.post('/auth/recover-account', data).then(r => r.data),
  deleteAccount: () => api.delete('/auth/delete-account').then(r => r.data),
}

export const cvApi = {
  list: () => api.get('/cv').then(r => r.data),
  get: (id: string) => api.get(`/cv/${id}`).then(r => r.data),
  create: (data: object) => api.post('/cv', data).then(r => r.data),
  update: (id: string, data: object) => api.put(`/cv/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/cv/${id}`).then(r => r.data),
  duplicate: (id: string) => api.post(`/cv/${id}/duplicate`).then(r => r.data),
  history: (id: string) => api.get(`/cv/${id}/history`).then(r => r.data),
  rate: (id: string, score: number, comment?: string) => api.post(`/cv/${id}/rate`, { cv_id: id, score, comment }).then(r => r.data),
  aiChat: (message: string, cvData?: object, context?: string) => api.post('/cv/ai/chat', { message, cv_data: cvData, context }).then(r => r.data),
  aiGenerateSummary: (cvData: object) => api.post('/cv/ai/generate-summary', { message: '', cv_data: cvData }).then(r => r.data),
  aiEdit: (instruction: string, cvData: object, section?: string) => api.post('/cv/ai/edit', { instruction, cv_data: cvData, section }).then(r => r.data),
  aiMatchJob: (cvData: object, jobDescription: string) => api.post('/cv/ai/match-job', { cv_data: cvData, job_description: jobDescription }).then(r => r.data),
  aiInterview: (message: string, history: Array<{role: string; content: string}>) => api.post('/cv/ai/interview', { message, history }).then(r => r.data),
  uploadCV: (file: File) => { const fd = new FormData(); fd.append('file', file); return api.post('/cv/upload-cv', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data) },
}

export const exportApi = {
  downloadPDF: (cvId: string): Promise<Blob> => api.get(`/export/pdf/${cvId}`, { responseType: 'blob' }).then(r => r.data),
  downloadPublicPDF: (username: string, slug: string): Promise<Blob> => axios.get(`${BASE}/api/export/public-pdf/${username}/${slug}`, { responseType: 'blob' }).then(r => r.data),
}

export const publicApi = {
  getCV: (username: string, slug: string) => axios.get(`${BASE}/api/public/cv/${username}/${slug}`).then(r => r.data),
  getProfile: (username: string) => axios.get(`${BASE}/api/public/profile/${username}`).then(r => r.data),
}

export const adminApi = {
  stats: () => api.get('/admin/stats').then(r => r.data),
  users: (skip = 0, limit = 50) => api.get(`/admin/users?skip=${skip}&limit=${limit}`).then(r => r.data),
  setRole: (id: string, role: string) => api.put(`/admin/users/${id}/role`, { role }).then(r => r.data),
  deactivate: (id: string) => api.put(`/admin/users/${id}/deactivate`).then(r => r.data),
  activate: (id: string) => api.put(`/admin/users/${id}/activate`).then(r => r.data),
  deleteUser: (id: string) => api.delete(`/admin/users/${id}`).then(r => r.data),
  cvs: (skip = 0, limit = 50) => api.get(`/admin/cvs?skip=${skip}&limit=${limit}`).then(r => r.data),
  ratings: (skip = 0, limit = 50) => api.get(`/admin/ratings?skip=${skip}&limit=${limit}`).then(r => r.data),
}
