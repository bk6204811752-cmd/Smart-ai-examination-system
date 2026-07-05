/**
 * Intelligent Exam Scheduler
 * AI-powered exam scheduling with conflict resolution, optimization, and recommendations
 */

export interface ExamScheduleRequest {
  examId: string
  examTitle: string
  duration: number // minutes
  estimatedDifficulty: 'Easy' | 'Medium' | 'Hard'
  subject: string
  targetStudents: string[]
  preferredTimeSlots?: TimeSlot[]
  deadline?: Date
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
}

export interface TimeSlot {
  start: Date
  end: Date
  dayOfWeek: number // 0-6 (Sunday-Saturday)
}

export interface ScheduleConflict {
  type: 'EXAM_OVERLAP' | 'STUDY_LOAD' | 'HOLIDAY' | 'WEEKEND' | 'LATE_NIGHT' | 'MAINTENANCE'
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  affectedStudents: number
  resolution?: string
}

export interface OptimalSchedule {
  recommendedSlot: TimeSlot
  confidence: number // 0-100
  conflicts: ScheduleConflict[]
  metrics: ScheduleMetrics
  alternativeSlots: TimeSlot[]
  reasoning: string[]
}

export interface ScheduleMetrics {
  studentAvailability: number // 0-100
  cognitiveOptimality: number // 0-100 (based on time of day)
  workloadBalance: number // 0-100
  fairness: number // 0-100 (distribution across week)
  overallScore: number // 0-100
}

export interface StudentSchedule {
  studentId: string
  scheduledExams: ScheduledExam[]
  studyBlocks: StudyBlock[]
  availabilityPattern: boolean[][] // [day][hour] availability matrix
  peakPerformanceHours: number[] // Hours when student performs best
  currentWorkload: number // 0-100
}

export interface ScheduledExam {
  examId: string
  examTitle: string
  subject: string
  scheduledTime: Date
  duration: number
  difficulty: string
  preparationTime: number // hours needed
}

export interface StudyBlock {
  start: Date
  end: Date
  subject: string
  type: 'REVISION' | 'PRACTICE' | 'TUTORIAL' | 'SELF_STUDY'
}

export interface BatchSchedulingResult {
  scheduled: ScheduledExam[]
  failed: {
    exam: ExamScheduleRequest
    reason: string
  }[]
  overallMetrics: {
    successRate: number
    averageStudentLoad: number
    conflictCount: number
  }
}

class IntelligentExamScheduler {
  private holidays: Set<string> = new Set()
  private maintenanceWindows: TimeSlot[] = []
  private globalExamLimit = 3 // Max exams per day system-wide
  
  // Cognitive performance by hour (0-23)
  private readonly COGNITIVE_PERFORMANCE = [
    30, 30, 20, 20, 20, 30, 40, 50,  // 0-7 AM
    70, 85, 90, 95, 95, 90, 85, 80,  // 8 AM - 3 PM
    75, 70, 65, 60, 50, 40, 35, 30   // 4 PM - 11 PM
  ]
  
  constructor() {
    this.initializeHolidays()
  }
  
  /**
   * Find optimal schedule for a single exam
   */
  async findOptimalSchedule(
    request: ExamScheduleRequest,
    studentSchedules: StudentSchedule[]
  ): Promise<OptimalSchedule> {
    const possibleSlots = this.generatePossibleSlots(request)
    const rankedSlots: Array<{ slot: TimeSlot; score: number; conflicts: ScheduleConflict[] }> = []
    
    for (const slot of possibleSlots) {
      const evaluation = await this.evaluateTimeSlot(
        slot,
        request,
        studentSchedules
      )
      
      rankedSlots.push({
        slot,
        score: evaluation.metrics.overallScore,
        conflicts: evaluation.conflicts
      })
    }
    
    // Sort by score (highest first)
    rankedSlots.sort((a, b) => b.score - a.score)
    
    const best = rankedSlots[0]
    const alternatives = rankedSlots.slice(1, 4).map(r => r.slot)
    
    const reasoning = this.generateReasoning(best, request, studentSchedules)
    
    return {
      recommendedSlot: best.slot,
      confidence: Math.round(best.score),
      conflicts: best.conflicts,
      metrics: await this.calculateMetrics(best.slot, request, studentSchedules),
      alternativeSlots: alternatives,
      reasoning
    }
  }
  
  /**
   * Schedule multiple exams with optimization
   */
  async batchSchedule(
    requests: ExamScheduleRequest[],
    studentSchedules: StudentSchedule[]
  ): Promise<BatchSchedulingResult> {
    // Sort by priority and deadline
    const sorted = this.prioritizeRequests(requests)
    
    const scheduled: ScheduledExam[] = []
    const failed: Array<{ exam: ExamScheduleRequest; reason: string }> = []
    const tempSchedules = [...studentSchedules]
    
    for (const request of sorted) {
      try {
        const optimal = await this.findOptimalSchedule(request, tempSchedules)
        
        // Check if acceptable (score > 60 and no CRITICAL conflicts)
        const criticalConflicts = optimal.conflicts.filter(c => c.severity === 'CRITICAL')
        
        if (optimal.confidence >= 60 && criticalConflicts.length === 0) {
          const exam: ScheduledExam = {
            examId: request.examId,
            examTitle: request.examTitle,
            subject: request.subject,
            scheduledTime: optimal.recommendedSlot.start,
            duration: request.duration,
            difficulty: request.estimatedDifficulty,
            preparationTime: this.calculatePrepTime(request)
          }
          
          scheduled.push(exam)
          
          // Update temp schedules
          tempSchedules.forEach(s => {
            if (request.targetStudents.includes(s.studentId)) {
              s.scheduledExams.push(exam)
              s.currentWorkload += this.calculateWorkloadImpact(exam)
            }
          })
        } else {
          failed.push({
            exam: request,
            reason: criticalConflicts.length > 0
              ? `Critical conflicts: ${criticalConflicts.map(c => c.description).join(', ')}`
              : `Low confidence score: ${optimal.confidence}%`
          })
        }
      } catch (error) {
        failed.push({
          exam: request,
          reason: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }
    
    // Calculate overall metrics
    const overallMetrics = {
      successRate: (scheduled.length / requests.length) * 100,
      averageStudentLoad: this.calculateAverageLoad(tempSchedules),
      conflictCount: scheduled.reduce((sum, exam) => {
        const conflicts = this.detectConflicts(exam, tempSchedules)
        return sum + conflicts.length
      }, 0)
    }
    
    return { scheduled, failed, overallMetrics }
  }
  
  /**
   * Generate possible time slots
   */
  private generatePossibleSlots(request: ExamScheduleRequest): TimeSlot[] {
    const slots: TimeSlot[] = []
    const now = new Date()
    const deadline = request.deadline || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
    
    // Use preferred slots if provided
    if (request.preferredTimeSlots && request.preferredTimeSlots.length > 0) {
      return request.preferredTimeSlots
    }
    
    // Generate slots for next 30 days
    const current = new Date(now)
    current.setHours(8, 0, 0, 0) // Start at 8 AM
    
    while (current < deadline) {
      const hour = current.getHours()
      const day = current.getDay()
      
      // Business hours only (8 AM - 8 PM)
      if (hour >= 8 && hour <= 20) {
        // Skip weekends for regular exams
        if (request.priority !== 'URGENT' && (day === 0 || day === 6)) {
          current.setHours(hour + 2)
          continue
        }
        
        // Skip holidays
        const dateStr = current.toISOString().split('T')[0]
        if (this.holidays.has(dateStr)) {
          current.setDate(current.getDate() + 1)
          current.setHours(8)
          continue
        }
        
        const endTime = new Date(current.getTime() + request.duration * 60000)
        
        slots.push({
          start: new Date(current),
          end: endTime,
          dayOfWeek: day
        })
      }
      
      current.setHours(hour + 2) // 2-hour intervals
    }
    
    return slots.slice(0, 50) // Limit to 50 slots for performance
  }
  
  /**
   * Evaluate a specific time slot
   */
  private async evaluateTimeSlot(
    slot: TimeSlot,
    request: ExamScheduleRequest,
    studentSchedules: StudentSchedule[]
  ): Promise<{ metrics: ScheduleMetrics; conflicts: ScheduleConflict[] }> {
    const conflicts = this.detectConflicts(
      {
        examId: request.examId,
        examTitle: request.examTitle,
        subject: request.subject,
        scheduledTime: slot.start,
        duration: request.duration,
        difficulty: request.estimatedDifficulty,
        preparationTime: 0
      },
      studentSchedules
    )
    
    const metrics = await this.calculateMetrics(slot, request, studentSchedules)
    
    return { metrics, conflicts }
  }
  
  /**
   * Calculate scheduling metrics
   */
  private async calculateMetrics(
    slot: TimeSlot,
    request: ExamScheduleRequest,
    studentSchedules: StudentSchedule[]
  ): Promise<ScheduleMetrics> {
    const hour = slot.start.getHours()
    const day = slot.start.getDay()
    
    // Student availability (% of students available)
    const availableStudents = studentSchedules.filter(s => 
      request.targetStudents.includes(s.studentId) &&
      s.availabilityPattern[day] &&
      s.availabilityPattern[day][hour]
    ).length
    const studentAvailability = (availableStudents / request.targetStudents.length) * 100
    
    // Cognitive optimality (based on time of day)
    const cognitiveOptimality = this.COGNITIVE_PERFORMANCE[hour]
    
    // Workload balance (check if students aren't overloaded)
    const avgWorkload = studentSchedules
      .filter(s => request.targetStudents.includes(s.studentId))
      .reduce((sum, s) => sum + s.currentWorkload, 0) / request.targetStudents.length
    const workloadBalance = Math.max(0, 100 - avgWorkload)
    
    // Fairness (even distribution across week)
    const dayDistribution = this.calculateDayDistribution(studentSchedules, day)
    const fairness = Math.max(0, 100 - (dayDistribution * 10))
    
    // Overall score (weighted average)
    const overallScore = 
      studentAvailability * 0.35 +
      cognitiveOptimality * 0.25 +
      workloadBalance * 0.25 +
      fairness * 0.15
    
    return {
      studentAvailability,
      cognitiveOptimality,
      workloadBalance,
      fairness,
      overallScore: Math.round(overallScore)
    }
  }
  
  /**
   * Detect scheduling conflicts
   */
  private detectConflicts(
    exam: ScheduledExam,
    studentSchedules: StudentSchedule[]
  ): ScheduleConflict[] {
    const conflicts: ScheduleConflict[] = []
    const examEnd = new Date(exam.scheduledTime.getTime() + exam.duration * 60000)
    const day = exam.scheduledTime.getDay()
    const hour = exam.scheduledTime.getHours()
    
    // Check for exam overlaps
    let overlappingStudents = 0
    studentSchedules.forEach(schedule => {
      const hasOverlap = schedule.scheduledExams.some(e => {
        const eEnd = new Date(e.scheduledTime.getTime() + e.duration * 60000)
        return (
          (exam.scheduledTime >= e.scheduledTime && exam.scheduledTime < eEnd) ||
          (examEnd > e.scheduledTime && examEnd <= eEnd) ||
          (exam.scheduledTime <= e.scheduledTime && examEnd >= eEnd)
        )
      })
      if (hasOverlap) overlappingStudents++
    })
    
    if (overlappingStudents > 0) {
      conflicts.push({
        type: 'EXAM_OVERLAP',
        severity: 'CRITICAL',
        description: `${overlappingStudents} students have conflicting exams`,
        affectedStudents: overlappingStudents,
        resolution: 'Reschedule to different time slot'
      })
    }
    
    // Check for high study load
    const overloadedStudents = studentSchedules.filter(s => s.currentWorkload > 80).length
    if (overloadedStudents > studentSchedules.length * 0.3) {
      conflicts.push({
        type: 'STUDY_LOAD',
        severity: 'HIGH',
        description: `${overloadedStudents} students are overloaded`,
        affectedStudents: overloadedStudents,
        resolution: 'Extend deadline or redistribute exams'
      })
    }
    
    // Check for holidays
    const dateStr = exam.scheduledTime.toISOString().split('T')[0]
    if (this.holidays.has(dateStr)) {
      conflicts.push({
        type: 'HOLIDAY',
        severity: 'MEDIUM',
        description: 'Scheduled on a holiday',
        affectedStudents: studentSchedules.length,
        resolution: 'Move to next working day'
      })
    }
    
    // Check for weekends
    if (day === 0 || day === 6) {
      conflicts.push({
        type: 'WEEKEND',
        severity: 'LOW',
        description: 'Scheduled on weekend',
        affectedStudents: studentSchedules.length,
        resolution: 'Consider weekday slot'
      })
    }
    
    // Check for late night/early morning
    if (hour < 8 || hour > 20) {
      conflicts.push({
        type: 'LATE_NIGHT',
        severity: 'MEDIUM',
        description: 'Scheduled outside business hours',
        affectedStudents: studentSchedules.length,
        resolution: 'Schedule between 8 AM - 8 PM'
      })
    }
    
    // Check for maintenance windows
    const inMaintenance = this.maintenanceWindows.some(window =>
      exam.scheduledTime >= window.start && exam.scheduledTime < window.end
    )
    
    if (inMaintenance) {
      conflicts.push({
        type: 'MAINTENANCE',
        severity: 'CRITICAL',
        description: 'System maintenance scheduled',
        affectedStudents: studentSchedules.length,
        resolution: 'Avoid maintenance window'
      })
    }
    
    return conflicts
  }
  
  /**
   * Generate human-readable reasoning
   */
  private generateReasoning(
    best: { slot: TimeSlot; score: number; conflicts: ScheduleConflict[] },
    request: ExamScheduleRequest,
    studentSchedules: StudentSchedule[]
  ): string[] {
    const reasons: string[] = []
    const hour = best.slot.start.getHours()
    const day = best.slot.start.getDay()
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
    
    // Time of day reasoning
    if (hour >= 9 && hour <= 11) {
      reasons.push('Morning slot optimal for cognitive performance')
    } else if (hour >= 14 && hour <= 16) {
      reasons.push('Afternoon slot suitable for sustained focus')
    }
    
    // Day of week reasoning
    if (day >= 1 && day <= 5) {
      reasons.push(`${dayNames[day]} minimizes weekend conflicts`)
    }
    
    // Student availability
    const availableCount = studentSchedules.filter(s =>
      s.availabilityPattern[day] && s.availabilityPattern[day][hour]
    ).length
    const availabilityPct = (availableCount / studentSchedules.length) * 100
    
    if (availabilityPct > 90) {
      reasons.push(`${availabilityPct.toFixed(0)}% student availability`)
    } else if (availabilityPct > 70) {
      reasons.push(`Good student availability (${availabilityPct.toFixed(0)}%)`)
    }
    
    // Workload balance
    const avgWorkload = studentSchedules.reduce((sum, s) => sum + s.currentWorkload, 0) / studentSchedules.length
    if (avgWorkload < 50) {
      reasons.push('Students have capacity for exam preparation')
    } else if (avgWorkload < 70) {
      reasons.push('Balanced workload distribution')
    }
    
    // Conflicts
    if (best.conflicts.length === 0) {
      reasons.push('No scheduling conflicts detected')
    } else {
      const severeConflicts = best.conflicts.filter(c => c.severity === 'HIGH' || c.severity === 'CRITICAL')
      if (severeConflicts.length === 0) {
        reasons.push('Only minor conflicts can be easily resolved')
      }
    }
    
    return reasons
  }
  
  /**
   * Prioritize exam requests
   */
  private prioritizeRequests(requests: ExamScheduleRequest[]): ExamScheduleRequest[] {
    const priorityScores = {
      'URGENT': 4,
      'HIGH': 3,
      'MEDIUM': 2,
      'LOW': 1
    }
    
    return requests.sort((a, b) => {
      // First by priority
      const priorityDiff = priorityScores[b.priority] - priorityScores[a.priority]
      if (priorityDiff !== 0) return priorityDiff
      
      // Then by deadline
      if (a.deadline && b.deadline) {
        return a.deadline.getTime() - b.deadline.getTime()
      }
      
      // Then by number of students (fewer students = easier to schedule)
      return a.targetStudents.length - b.targetStudents.length
    })
  }
  
  /**
   * Calculate preparation time needed
   */
  private calculatePrepTime(request: ExamScheduleRequest): number {
    const baseHours = {
      'Easy': 4,
      'Medium': 8,
      'Hard': 12
    }
    
    return baseHours[request.estimatedDifficulty] || 8
  }
  
  /**
   * Calculate workload impact
   */
  private calculateWorkloadImpact(exam: ScheduledExam): number {
    const difficultyMultiplier: Record<string, number> = {
      'Easy': 1,
      'Medium': 1.5,
      'Hard': 2
    }
    
    const multiplier = difficultyMultiplier[exam.difficulty] || 1
    return (exam.preparationTime / 12) * 100 * multiplier // Normalize to 0-100
  }
  
  /**
   * Calculate average student workload
   */
  private calculateAverageLoad(schedules: StudentSchedule[]): number {
    if (schedules.length === 0) return 0
    return schedules.reduce((sum, s) => sum + s.currentWorkload, 0) / schedules.length
  }
  
  /**
   * Calculate day distribution (how many exams already on this day)
   */
  private calculateDayDistribution(schedules: StudentSchedule[], day: number): number {
    let examsOnDay = 0
    schedules.forEach(s => {
      examsOnDay += s.scheduledExams.filter(e => 
        e.scheduledTime.getDay() === day
      ).length
    })
    return examsOnDay / schedules.length
  }
  
  /**
   * Initialize holidays
   */
  private initializeHolidays() {
    // Add common holidays (can be customized per institution)
    const currentYear = new Date().getFullYear()
    
    // Example holidays (ISO format YYYY-MM-DD)
    this.holidays.add(`${currentYear}-01-01`) // New Year
    this.holidays.add(`${currentYear}-01-26`) // Republic Day (India)
    this.holidays.add(`${currentYear}-08-15`) // Independence Day (India)
    this.holidays.add(`${currentYear}-10-02`) // Gandhi Jayanti
    this.holidays.add(`${currentYear}-12-25`) // Christmas
  }
  
  /**
   * Add custom holiday
   */
  addHoliday(date: Date) {
    const dateStr = date.toISOString().split('T')[0]
    this.holidays.add(dateStr)
  }
  
  /**
   * Add maintenance window
   */
  addMaintenanceWindow(window: TimeSlot) {
    this.maintenanceWindows.push(window)
  }
}

// Export singleton instance
export const intelligentScheduler = new IntelligentExamScheduler()
