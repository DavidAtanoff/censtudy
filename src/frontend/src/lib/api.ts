import axios from 'axios'

export const API_BASE = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:3000' : '')

const api = axios.create({
  baseURL: API_BASE,
  withCredentials: true,
})

export interface User {
  id: number
  microsoft_id: string
  email: string
  display_name?: string | null
  created_at: string
}

export interface AuthConfig {
  enabled: boolean
  provider: 'microsoft'
  allowed_email_domain?: string | null
}

export interface Course {
  id: number
  title: string
  description?: string
  created_by: number
  created_at: string
  updated_at: string
}

export interface Unit {
  id: number
  course_id: number
  title: string
  description?: string | null
  order_index: number
  created_at: string
}

export interface Content {
  id: number
  unit_id: number
  content_type: 'study-guide' | 'quiz' | 'flashcard-deck' | 'test'
  title: string
  studyml_content: string
  created_by: number
  created_at: string
  updated_at: string
}

export interface FlashcardStats {
  total: number
  mastered: number
  learning: number
  new: number
}

export interface QuizAttempt {
  id: number
  user_id: number
  content_id: number
  score: number
  wrong_questions: string
  completed_at: string
}

export interface Resource {
  id: number
  unit_id: number
  resource_type: 'file' | 'link'
  title: string
  url: string
  file_id?: number
  created_at: string
}

export interface FileMetadata {
  id: number
  filename: string
  original_filename: string
  file_type: string
  file_size: number
  storage_path: string
  uploaded_by: number
  created_at: string
}

export interface UserStats {
  total_time_spent: number
  courses_started: number
  flashcards_mastered: number
  quizzes_completed: number
  average_quiz_score: number
  current_streak: number
  content_stats: ContentStat[]
}

export interface ContentStat {
  content_id: number
  content_title: string
  time_spent_seconds: number
  mastery_level: number
  last_accessed: string | null
}

export interface LeaderboardEntry {
  user_id: number
  display_name: string
  total_time_spent: number
  flashcards_mastered: number
  average_quiz_score: number
}

export interface AuditLog {
  id: number
  user_id: number
  action: string
  entity_type: string
  entity_id: number
  details: string | null
  created_at: string
}

// Auth
export const getAuthConfig = () => api.get<AuthConfig>('/auth/config')
export const getCurrentUser = () => api.get<User | null>('/auth/me')
export const logout = () => api.post('/auth/logout')

// Courses
export const getCourses = () => api.get<Course[]>('/api/courses')
export const getCourse = (id: number) => api.get<Course>(`/api/courses/${id}`)
export const createCourse = (data: { title: string; description?: string }) =>
  api.post<Course>('/api/courses', data)
export const updateCourse = (id: number, data: { title: string; description?: string }) =>
  api.put<Course>(`/api/courses/${id}`, data)
export const deleteCourse = (id: number) => api.delete(`/api/courses/${id}`)

// Units
export const getUnits = (courseId: number) => api.get<Unit[]>(`/api/courses/${courseId}/units`)
export const getUnit = (id: number) => api.get<Unit>(`/api/units/${id}`)
export const createUnit = (courseId: number, data: { title: string; description?: string; order_index: number }) =>
  api.post<Unit>(`/api/courses/${courseId}/units`, data)
export const updateUnit = (id: number, data: { title: string; description?: string; order_index: number }) =>
  api.put<Unit>(`/api/units/${id}`, data)
export const deleteUnit = (id: number) => api.delete(`/api/units/${id}`)

// Content
export const getContent = (unitId: number) => api.get<Content[]>(`/api/units/${unitId}/content`)
export const getContentById = (id: number) => api.get<Content>(`/api/content/${id}`)
export const createContent = (unitId: number, data: { content_type: string; title: string; studyml_content: string }) =>
  api.post<Content>(`/api/units/${unitId}/content`, data)
export const updateContent = (id: number, data: { content_type: string; title: string; studyml_content: string }) =>
  api.put<Content>(`/api/content/${id}`, data)
export const deleteContent = (id: number) => api.delete(`/api/content/${id}`)

// Flashcards
export const getNextFlashcard = (deckId: number, practice: boolean = false) => 
  api.get(`/api/flashcards/${deckId}/next?t=${Date.now()}${practice ? '&practice=true' : ''}`)
export const submitFlashcardReview = (deckId: number, data: { flashcard_index: number; quality: number }) =>
  api.post(`/api/flashcards/${deckId}/review`, data)
export const getFlashcardStats = (deckId: number) => api.get<FlashcardStats>(`/api/flashcards/${deckId}/stats?t=${Date.now()}`)

// Quiz
export const submitQuiz = (quizId: number, data: { answers: Array<{ question_index: number; answer: string; score: number; missing?: string[] }> }) =>
  api.post<QuizAttempt>(`/api/quiz/${quizId}/submit`, data)
export const getQuizAttempts = (quizId: number) => api.get<QuizAttempt[]>(`/api/quiz/${quizId}/attempts?t=${Date.now()}`)

// AI
export const gradeAnswer = (data: { user_answer: string; correct_answer: string; keywords: string[] }) =>
  api.post<{ score: number; feedback: string; missing_concepts: string[] }>('/api/ai/grade', data)
export const chatTutor = (unitId: number, data: { messages: Array<{ role: string; content: string }> }) =>
  api.post<{ response: string }>(`/api/units/${unitId}/chat`, data)

// Resources
export const getResources = (unitId: number) => api.get<Resource[]>(`/api/units/${unitId}/resources`)
export const createResource = (unitId: number, data: { resource_type: string; title: string; url: string; file_id?: number }) =>
  api.post<Resource>(`/api/units/${unitId}/resources`, data)
export const deleteResource = (id: number) => api.delete(`/api/resources/${id}`)

// Files
export const uploadFile = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api.post<FileMetadata>('/api/files', formData).then(response => {
    const fileUrl = `${API_BASE}/api/files/${response.data.id}/download`
    return { ...response, data: { ...response.data, fileUrl } }
  })
}

// Stats
export const updateUserStats = (userId: number, contentId: number, data: { time_spent_seconds: number; mastery_level?: number }) =>
  api.post(`/api/stats/${userId}/${contentId}`, data)
export const getUserStats = (userId: number) => api.get<UserStats>(`/api/stats/${userId}`)
export const getLeaderboard = () => api.get<LeaderboardEntry[]>('/api/leaderboard')
export const getKnowledgeGaps = (userId: number) =>
  api.get<Array<{ concept: string; count: number }>>(`/api/stats/${userId}/gaps`)

// Audit
export const getAuditLogs = () => api.get<AuditLog[]>('/api/audit')

export default api
