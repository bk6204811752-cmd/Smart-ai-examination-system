import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function formatDateTime(date: string | Date): string {
  return new Date(date).toLocaleString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const secs = seconds % 60

  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`
  }
  return `${secs}s`
}

export function calculatePercentage(score: number, total: number): number {
  if (total === 0) return 0
  return Math.round((score / total) * 100)
}

export function getGrade(percentage: number): string {
  if (percentage >= 90) return 'A+'
  if (percentage >= 80) return 'A'
  if (percentage >= 70) return 'B+'
  if (percentage >= 60) return 'B'
  if (percentage >= 50) return 'C'
  if (percentage >= 40) return 'D'
  return 'F'
}

export function getTrustScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600'
  if (score >= 70) return 'text-yellow-600'
  if (score >= 50) return 'text-orange-600'
  return 'text-red-600'
}

export function getProgramColor(program: string): string {
  const colors: Record<string, string> = {
    'BBA': 'bg-blue-100 text-blue-800',
    'BCA': 'bg-purple-100 text-purple-800',
    'B.Tech': 'bg-green-100 text-green-800',
    'MBA': 'bg-amber-100 text-amber-800',
    'MCA': 'bg-pink-100 text-pink-800',
  }
  return colors[program] || 'bg-gray-100 text-gray-800'
}

export function getDifficultyColor(difficulty: string): string {
  const colors: Record<string, string> = {
    'easy': 'text-green-600',
    'medium': 'text-yellow-600',
    'hard': 'text-red-600',
  }
  return colors[difficulty] || 'text-gray-600'
}
