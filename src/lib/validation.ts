/**
 * Frontend Input Validation Utilities
 * Client-side validation matching backend validation
 */

// Email validation
export function validateEmail(email: string): { valid: boolean; error?: string } {
  if (!email || !email.trim()) {
    return { valid: false, error: 'Email is required' }
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' }
  }
  
  return { valid: true }
}

// Password validation
export function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password) {
    return { valid: false, error: 'Password is required' }
  }
  
  if (password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters' }
  }
  
  if (password.length > 100) {
    return { valid: false, error: 'Password must be less than 100 characters' }
  }
  
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' }
  }
  
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' }
  }
  
  if (!/\d/.test(password)) {
    return { valid: false, error: 'Password must contain at least one digit' }
  }
  
  return { valid: true }
}

// Name validation
export function validateName(name: string): { valid: boolean; error?: string } {
  if (!name || !name.trim()) {
    return { valid: false, error: 'Name is required' }
  }
  
  const trimmed = name.trim()
  
  if (trimmed.length < 2) {
    return { valid: false, error: 'Name must be at least 2 characters' }
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'Name must be less than 100 characters' }
  }
  
  // Check for invalid characters
  if (/[<>{}]/.test(trimmed)) {
    return { valid: false, error: 'Name contains invalid characters' }
  }
  
  return { valid: true }
}

// Sanitize HTML
export function sanitizeHTML(text: string): string {
  if (!text) return text
  
  const div = document.createElement('div')
  div.textContent = text
  return div.innerHTML
}

// Validate exam title
export function validateExamTitle(title: string): { valid: boolean; error?: string } {
  if (!title || !title.trim()) {
    return { valid: false, error: 'Exam title is required' }
  }
  
  if (title.length < 5) {
    return { valid: false, error: 'Exam title must be at least 5 characters' }
  }
  
  if (title.length > 200) {
    return { valid: false, error: 'Exam title must be less than 200 characters' }
  }
  
  return { valid: true }
}

// Validate exam duration
export function validateDuration(duration: number): { valid: boolean; error?: string } {
  if (!duration || duration <= 0) {
    return { valid: false, error: 'Duration must be greater than 0' }
  }
  
  if (duration < 5) {
    return { valid: false, error: 'Duration must be at least 5 minutes' }
  }
  
  if (duration > 300) {
    return { valid: false, error: 'Duration cannot exceed 300 minutes (5 hours)' }
  }
  
  return { valid: true }
}

// Validate semester
export function validateSemester(semester: number): { valid: boolean; error?: string } {
  if (!semester) {
    return { valid: false, error: 'Semester is required' }
  }
  
  if (semester < 1 || semester > 8) {
    return { valid: false, error: 'Semester must be between 1 and 8' }
  }
  
  return { valid: true }
}

// File upload validation
export function validateImageUpload(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg']
  const maxSize = 5 * 1024 * 1024 // 5MB
  
  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: 'Only JPG and PNG images are allowed' }
  }
  
  if (file.size > maxSize) {
    return { valid: false, error: 'Image size must be less than 5MB' }
  }
  
  return { valid: true }
}

// Comprehensive form validation
export function validateRegistrationForm(data: {
  email: string
  password: string
  confirmPassword: string
  fullName: string
  semester?: number
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  
  const emailValidation = validateEmail(data.email)
  if (!emailValidation.valid) {
    errors.email = emailValidation.error!
  }
  
  const passwordValidation = validatePassword(data.password)
  if (!passwordValidation.valid) {
    errors.password = passwordValidation.error!
  }
  
  if (data.password !== data.confirmPassword) {
    errors.confirmPassword = 'Passwords do not match'
  }
  
  const nameValidation = validateName(data.fullName)
  if (!nameValidation.valid) {
    errors.fullName = nameValidation.error!
  }
  
  if (data.semester) {
    const semesterValidation = validateSemester(data.semester)
    if (!semesterValidation.valid) {
      errors.semester = semesterValidation.error!
    }
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}

export function validateLoginForm(data: {
  email: string
  password: string
}): { valid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {}
  
  const emailValidation = validateEmail(data.email)
  if (!emailValidation.valid) {
    errors.email = emailValidation.error!
  }
  
  if (!data.password) {
    errors.password = 'Password is required'
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  }
}
