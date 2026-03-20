export interface User {
  id: string
  username: string
  email?: string
  role: 'user' | 'staff' | 'admin' | 'superadmin'
  must_change_password: boolean
  created_at: string
  is_active: boolean
}

export interface PersonalInfo {
  full_name: string
  job_title: string
  email: string
  phone: string
  location: string
  linkedin: string
  github: string
  portfolio: string
  website: string
}

export interface ExperienceItem {
  company: string
  role: string
  start_date: string
  end_date: string
  current: boolean
  description: string
  achievements: string[]
}

export interface EducationItem {
  institution: string
  degree: string
  field: string
  start_date: string
  end_date: string
  grade: string
  description: string
}

export interface CertificationItem {
  name: string
  issuer: string
  date: string
  expiry: string
  credential_id: string
  url: string
}

export interface ProjectItem {
  name: string
  description: string
  technologies: string[]
  url: string
  start_date: string
  end_date: string
}

export interface AwardItem {
  title: string
  issuer: string
  date: string
  description: string
}

export interface LanguageItem {
  language: string
  proficiency: string
}

export interface VolunteerItem {
  organization: string
  role: string
  start_date: string
  end_date: string
  description: string
}

export interface CVData {
  personal_info: PersonalInfo
  summary: string
  skills: string[]
  experience: ExperienceItem[]
  education: EducationItem[]
  certifications: CertificationItem[]
  projects: ProjectItem[]
  awards: AwardItem[]
  languages: LanguageItem[]
  volunteer: VolunteerItem[]
  job_description: string
}

export interface CV {
  id: string
  owner_id: string
  owner_username: string
  title: string
  data: CVData
  is_public: boolean
  theme: string
  template: string        // ← new: layout template
  page_count: number
  slug?: string
  created_at: string
  updated_at: string
  rating?: number
}

export const EMPTY_CV_DATA: CVData = {
  personal_info: {
    full_name: '', job_title: '', email: '', phone: '',
    location: '', linkedin: '', github: '', portfolio: '', website: ''
  },
  summary: '',
  skills: [],
  experience: [],
  education: [],
  certifications: [],
  projects: [],
  awards: [],
  languages: [],
  volunteer: [],
  job_description: '',
}

export const EMPTY_EXPERIENCE: ExperienceItem = {
  company: '', role: '', start_date: '', end_date: '', current: false, description: '', achievements: []
}

export const EMPTY_EDUCATION: EducationItem = {
  institution: '', degree: '', field: '', start_date: '', end_date: '', grade: '', description: ''
}

export const EMPTY_CERT: CertificationItem = {
  name: '', issuer: '', date: '', expiry: '', credential_id: '', url: ''
}

export const EMPTY_PROJECT: ProjectItem = {
  name: '', description: '', technologies: [], url: '', start_date: '', end_date: ''
}

export const EMPTY_AWARD: AwardItem = {
  title: '', issuer: '', date: '', description: ''
}

export const EMPTY_LANGUAGE: LanguageItem = {
  language: '', proficiency: ''
}

export const EMPTY_VOLUNTEER: VolunteerItem = {
  organization: '', role: '', start_date: '', end_date: '', description: ''
}

export type CVTheme = 'minimal' | 'classic' | 'sharp' | 'executive' | 'nordic' | 'terracotta' | 'forest' | 'royal'