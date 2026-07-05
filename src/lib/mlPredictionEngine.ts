/**
 * ML Prediction Engine
 * Advanced machine learning-based predictions for student performance
 * Uses regression models, pattern recognition, and predictive analytics
 */

export interface StudentPerformanceData {
  studentId: string
  examHistory: ExamResult[]
  studyPatterns: StudyPattern[]
  demographicData: DemographicData
  behavioralMetrics: BehavioralMetrics
}

export interface ExamResult {
  examId: string
  examType: string
  subject: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  score: number
  maxScore: number
  timeSpent: number // seconds
  questionsAnswered: number
  totalQuestions: number
  proctoringViolations: number
  timestamp: Date
}

export interface StudyPattern {
  date: Date
  duration: number // minutes
  subject: string
  resources: string[]
  effectivenessScore: number // 0-100
}

export interface DemographicData {
  program: string
  semester: number
  gpa: number
  enrollmentDate: Date
}

export interface BehavioralMetrics {
  averageStudyDuration: number
  studyFrequency: number // days per week
  preferredStudyTime: 'morning' | 'afternoon' | 'evening' | 'night'
  procrastinationIndex: number // 0-100
  stressLevel: number // 0-100
  attentionSpan: number // minutes
}

export interface PerformancePrediction {
  predictedScore: number
  confidence: number // 0-100
  factors: PredictionFactor[]
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  recommendations: string[]
  timeline: {
    shortTerm: string[] // Next week
    midTerm: string[] // Next month
    longTerm: string[] // Next semester
  }
}

export interface PredictionFactor {
  name: string
  impact: number // -100 to +100
  weight: number // 0-1
  explanation: string
}

export interface DifficultyRecommendation {
  recommendedDifficulty: 'Easy' | 'Medium' | 'Hard'
  confidence: number
  reasoning: string[]
  alternativeDifficulties: {
    difficulty: string
    probability: number
  }[]
}

export interface CheatRiskPrediction {
  riskScore: number // 0-100
  factors: string[]
  preventiveMeasures: string[]
  monitoringLevel: 'LIGHT' | 'MEDIUM' | 'STRICT'
}

class MLPredictionEngine {
  private readonly WINDOW_SIZE = 10 // Last N exams to consider
  private readonly TIME_DECAY_FACTOR = 0.95 // Older data has less weight
  
  /**
   * Predict student performance on upcoming exam
   */
  predictPerformance(data: StudentPerformanceData, upcomingExam: {
    subject: string
    difficulty: string
    totalQuestions: number
  }): PerformancePrediction {
    const factors: PredictionFactor[] = []
    let predictedScore = 50 // Base prediction
    
    // Factor 1: Historical Performance (40% weight)
    const historicalScore = this.calculateHistoricalPerformance(data.examHistory, upcomingExam.subject)
    factors.push({
      name: 'Historical Performance',
      impact: historicalScore - 50,
      weight: 0.4,
      explanation: `Average performance in ${upcomingExam.subject}: ${historicalScore.toFixed(1)}%`
    })
    predictedScore += (historicalScore - 50) * 0.4
    
    // Factor 2: Learning Trajectory (25% weight)
    const trajectory = this.calculateLearningTrajectory(data.examHistory)
    factors.push({
      name: 'Learning Trajectory',
      impact: trajectory,
      weight: 0.25,
      explanation: trajectory > 0 
        ? `Improving trend (+${trajectory.toFixed(1)}% growth)`
        : `Declining trend (${trajectory.toFixed(1)}% decline)`
    })
    predictedScore += trajectory * 0.25
    
    // Factor 3: Study Patterns (20% weight)
    const studyEffectiveness = this.evaluateStudyPatterns(
      data.studyPatterns,
      upcomingExam.subject
    )
    factors.push({
      name: 'Study Effectiveness',
      impact: studyEffectiveness - 50,
      weight: 0.2,
      explanation: `Study pattern effectiveness: ${studyEffectiveness.toFixed(1)}%`
    })
    predictedScore += (studyEffectiveness - 50) * 0.2
    
    // Factor 4: Behavioral Metrics (10% weight)
    const behavioralImpact = this.analyzeBehavioralMetrics(data.behavioralMetrics)
    factors.push({
      name: 'Behavioral Factors',
      impact: behavioralImpact,
      weight: 0.1,
      explanation: this.getBehavioralExplanation(data.behavioralMetrics)
    })
    predictedScore += behavioralImpact * 0.1
    
    // Factor 5: Difficulty Adjustment (5% weight)
    const difficultyImpact = this.assessDifficultyImpact(
      upcomingExam.difficulty,
      data.examHistory
    )
    factors.push({
      name: 'Exam Difficulty',
      impact: difficultyImpact,
      weight: 0.05,
      explanation: `${upcomingExam.difficulty} difficulty adjustment`
    })
    predictedScore += difficultyImpact * 0.05
    
    // Normalize to 0-100 range
    predictedScore = Math.max(0, Math.min(100, predictedScore))
    
    // Calculate confidence based on data availability
    const confidence = this.calculateConfidence(data)
    
    // Determine risk level
    const riskLevel = this.determineRiskLevel(predictedScore)
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(
      predictedScore,
      factors,
      data
    )
    
    return {
      predictedScore: Math.round(predictedScore * 10) / 10,
      confidence,
      factors,
      riskLevel,
      recommendations: recommendations.immediate,
      timeline: {
        shortTerm: recommendations.shortTerm,
        midTerm: recommendations.midTerm,
        longTerm: recommendations.longTerm
      }
    }
  }
  
  /**
   * Calculate weighted historical performance
   */
  private calculateHistoricalPerformance(
    examHistory: ExamResult[],
    subject: string
  ): number {
    const relevantExams = examHistory
      .filter(e => e.subject === subject)
      .slice(-this.WINDOW_SIZE)
      .reverse()
    
    if (relevantExams.length === 0) {
      return 50 // Neutral score if no history
    }
    
    let totalWeightedScore = 0
    let totalWeight = 0
    
    relevantExams.forEach((exam, index) => {
      const recencyWeight = Math.pow(this.TIME_DECAY_FACTOR, index)
      const score = (exam.score / exam.maxScore) * 100
      totalWeightedScore += score * recencyWeight
      totalWeight += recencyWeight
    })
    
    return totalWeightedScore / totalWeight
  }
  
  /**
   * Calculate learning trajectory using linear regression
   */
  private calculateLearningTrajectory(examHistory: ExamResult[]): number {
    const recentExams = examHistory.slice(-this.WINDOW_SIZE)
    
    if (recentExams.length < 3) {
      return 0 // Not enough data
    }
    
    // Simple linear regression
    const n = recentExams.length
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0
    
    recentExams.forEach((exam, index) => {
      const x = index
      const y = (exam.score / exam.maxScore) * 100
      sumX += x
      sumY += y
      sumXY += x * y
      sumX2 += x * x
    })
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX)
    
    // Convert slope to percentage change
    return slope * (n / 2) // Projected change over half the window
  }
  
  /**
   * Evaluate study pattern effectiveness
   */
  private evaluateStudyPatterns(
    studyPatterns: StudyPattern[],
    subject: string
  ): number {
    const relevantPatterns = studyPatterns
      .filter(p => p.subject === subject)
      .slice(-20) // Last 20 study sessions
    
    if (relevantPatterns.length === 0) {
      return 40 // Low score if no study data
    }
    
    // Calculate average effectiveness
    const avgEffectiveness = relevantPatterns.reduce(
      (sum, p) => sum + p.effectivenessScore,
      0
    ) / relevantPatterns.length
    
    // Consider study frequency
    const daysStudied = new Set(
      relevantPatterns.map(p => p.date.toDateString())
    ).size
    const frequencyBonus = Math.min(15, daysStudied * 2)
    
    // Consider total study time
    const totalHours = relevantPatterns.reduce(
      (sum, p) => sum + p.duration,
      0
    ) / 60
    const timeBonus = Math.min(10, totalHours)
    
    return Math.min(100, avgEffectiveness + frequencyBonus + timeBonus)
  }
  
  /**
   * Analyze behavioral metrics impact
   */
  private analyzeBehavioralMetrics(metrics: BehavioralMetrics): number {
    let impact = 0
    
    // Study frequency impact (-20 to +20)
    if (metrics.studyFrequency >= 6) impact += 20
    else if (metrics.studyFrequency >= 4) impact += 10
    else if (metrics.studyFrequency >= 2) impact += 0
    else impact -= 15
    
    // Procrastination penalty (-15 to 0)
    impact -= (metrics.procrastinationIndex / 100) * 15
    
    // Stress level impact (-10 to 0)
    if (metrics.stressLevel > 70) impact -= 10
    else if (metrics.stressLevel > 50) impact -= 5
    
    // Attention span impact (-5 to +10)
    if (metrics.attentionSpan >= 45) impact += 10
    else if (metrics.attentionSpan >= 30) impact += 5
    else if (metrics.attentionSpan < 15) impact -= 5
    
    return impact
  }
  
  /**
   * Get behavioral explanation
   */
  private getBehavioralExplanation(metrics: BehavioralMetrics): string {
    const issues: string[] = []
    const strengths: string[] = []
    
    if (metrics.studyFrequency < 3) issues.push('low study frequency')
    if (metrics.procrastinationIndex > 60) issues.push('high procrastination')
    if (metrics.stressLevel > 70) issues.push('elevated stress')
    if (metrics.attentionSpan < 20) issues.push('short attention span')
    
    if (metrics.studyFrequency >= 5) strengths.push('consistent study habits')
    if (metrics.attentionSpan >= 40) strengths.push('good focus')
    
    if (issues.length > 0) {
      return `Challenges: ${issues.join(', ')}`
    } else if (strengths.length > 0) {
      return `Strengths: ${strengths.join(', ')}`
    }
    return 'Balanced behavioral profile'
  }
  
  /**
   * Assess difficulty impact
   */
  private assessDifficultyImpact(
    difficulty: string,
    examHistory: ExamResult[]
  ): number {
    const performanceByDifficulty = {
      Easy: [] as number[],
      Medium: [] as number[],
      Hard: [] as number[]
    }
    
    examHistory.forEach(exam => {
      const score = (exam.score / exam.maxScore) * 100
      if (exam.difficulty in performanceByDifficulty) {
        performanceByDifficulty[exam.difficulty].push(score)
      }
    })
    
    // Calculate average for each difficulty
    const averages = {
      Easy: this.average(performanceByDifficulty.Easy) || 75,
      Medium: this.average(performanceByDifficulty.Medium) || 60,
      Hard: this.average(performanceByDifficulty.Hard) || 45
    }
    
    // Return impact relative to medium difficulty
    switch (difficulty) {
      case 'Easy':
        return averages.Easy - 60
      case 'Hard':
        return averages.Hard - 60
      default:
        return 0
    }
  }
  
  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(data: StudentPerformanceData): number {
    let confidence = 50 // Base confidence
    
    // More exam history = higher confidence
    const historyBonus = Math.min(30, data.examHistory.length * 3)
    confidence += historyBonus
    
    // More study data = higher confidence
    const studyBonus = Math.min(15, data.studyPatterns.length * 0.5)
    confidence += studyBonus
    
    // Consistent performance = higher confidence
    const scores = data.examHistory.map(e => (e.score / e.maxScore) * 100)
    const variance = this.calculateVariance(scores)
    const consistencyBonus = Math.max(-10, 10 - variance / 5)
    confidence += consistencyBonus
    
    return Math.min(95, Math.max(20, confidence))
  }
  
  /**
   * Determine risk level
   */
  private determineRiskLevel(predictedScore: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (predictedScore >= 70) return 'LOW'
    if (predictedScore >= 50) return 'MEDIUM'
    if (predictedScore >= 35) return 'HIGH'
    return 'CRITICAL'
  }
  
  /**
   * Generate actionable recommendations
   */
  private generateRecommendations(
    predictedScore: number,
    factors: PredictionFactor[],
    data: StudentPerformanceData
  ) {
    const immediate: string[] = []
    const shortTerm: string[] = []
    const midTerm: string[] = []
    const longTerm: string[] = []
    
    // Identify weak factors
    const weakFactors = factors
      .filter(f => f.impact < -10)
      .sort((a, b) => a.impact - b.impact)
    
    // Historical Performance issues
    if (weakFactors.some(f => f.name === 'Historical Performance')) {
      immediate.push('Review fundamental concepts before the exam')
      shortTerm.push('Focus on practice tests in weak areas')
      midTerm.push('Build strong foundation through structured study plan')
    }
    
    // Learning Trajectory issues
    if (weakFactors.some(f => f.name === 'Learning Trajectory')) {
      immediate.push('Seek help from instructor or tutor immediately')
      shortTerm.push('Join study groups for collaborative learning')
      midTerm.push('Consider academic counseling for learning strategies')
    }
    
    // Study Effectiveness issues
    if (weakFactors.some(f => f.name === 'Study Effectiveness')) {
      immediate.push('Adopt active learning techniques (flashcards, practice problems)')
      shortTerm.push('Implement spaced repetition study schedule')
      midTerm.push('Experiment with different study methods to find what works')
    }
    
    // Behavioral issues
    if (data.behavioralMetrics.procrastinationIndex > 60) {
      immediate.push('Break study material into small, manageable chunks')
      shortTerm.push('Use Pomodoro technique (25min focus + 5min break)')
    }
    
    if (data.behavioralMetrics.stressLevel > 70) {
      immediate.push('Practice relaxation techniques before studying')
      longTerm.push('Develop stress management strategies')
    }
    
    // General recommendations based on predicted score
    if (predictedScore < 50) {
      immediate.push('Prioritize high-value topics based on exam weightage')
      immediate.push('Schedule daily study sessions (minimum 2 hours)')
      shortTerm.push('Complete all practice problems and past exams')
      midTerm.push('Consider reducing course load next semester')
    } else if (predictedScore < 70) {
      shortTerm.push('Focus on converting weak areas to strong areas')
      midTerm.push('Maintain consistent study schedule')
    } else {
      shortTerm.push('Challenge yourself with advanced problems')
      longTerm.push('Consider helping peers through tutoring')
    }
    
    return { immediate, shortTerm, midTerm, longTerm }
  }
  
  /**
   * Recommend optimal difficulty level
   */
  recommendDifficulty(data: StudentPerformanceData): DifficultyRecommendation {
    const recentPerformance = data.examHistory.slice(-5)
    const performanceByDifficulty = {
      Easy: [] as number[],
      Medium: [] as number[],
      Hard: [] as number[]
    }
    
    recentPerformance.forEach(exam => {
      const accuracy = (exam.score / exam.maxScore) * 100
      if (exam.difficulty in performanceByDifficulty) {
        performanceByDifficulty[exam.difficulty].push(accuracy)
      }
    })
    
    // Calculate success rates
    const successRates = {
      Easy: this.average(performanceByDifficulty.Easy) || 0,
      Medium: this.average(performanceByDifficulty.Medium) || 0,
      Hard: this.average(performanceByDifficulty.Hard) || 0
    }
    
    // Find sweet spot (70-85% success rate for optimal learning)
    let recommended: 'Easy' | 'Medium' | 'Hard' = 'Medium'
    const reasoning: string[] = []
    
    if (successRates.Hard >= 70 && successRates.Hard <= 85) {
      recommended = 'Hard'
      reasoning.push(`Strong performance on hard questions (${successRates.Hard.toFixed(1)}%)`)
      reasoning.push('Ready for advanced challenges')
    } else if (successRates.Hard > 85) {
      recommended = 'Hard'
      reasoning.push('Consistently excelling - needs more challenge')
    } else if (successRates.Medium >= 70 && successRates.Medium <= 85) {
      recommended = 'Medium'
      reasoning.push(`Optimal learning zone (${successRates.Medium.toFixed(1)}%)`)
    } else if (successRates.Medium < 60) {
      recommended = 'Easy'
      reasoning.push('Build confidence with easier questions first')
      reasoning.push(`Medium difficulty showing ${successRates.Medium.toFixed(1)}% success`)
    } else {
      recommended = 'Medium'
      reasoning.push('Balanced challenge appropriate for current level')
    }
    
    // Calculate alternative probabilities
    const total = successRates.Easy + successRates.Medium + successRates.Hard
    const alternatives = [
      { difficulty: 'Easy', probability: Math.round((successRates.Easy / total) * 100) },
      { difficulty: 'Medium', probability: Math.round((successRates.Medium / total) * 100) },
      { difficulty: 'Hard', probability: Math.round((successRates.Hard / total) * 100) }
    ].filter(a => a.difficulty !== recommended)
    
    return {
      recommendedDifficulty: recommended,
      confidence: Math.round(Math.max(60, Math.min(95, total / 3))),
      reasoning,
      alternativeDifficulties: alternatives
    }
  }
  
  /**
   * Predict cheating risk
   */
  predictCheatRisk(data: StudentPerformanceData, examContext: {
    isHighStakes: boolean
    proctored: boolean
    duration: number
  }): CheatRiskPrediction {
    let riskScore = 0
    const factors: string[] = []
    const preventiveMeasures: string[] = []
    
    // Factor 1: Performance inconsistency
    const scores = data.examHistory.map(e => (e.score / e.maxScore) * 100)
    const variance = this.calculateVariance(scores)
    if (variance > 400) {
      riskScore += 25
      factors.push('High performance variability detected')
      preventiveMeasures.push('Enable continuous identity verification')
    }
    
    // Factor 2: Historical violations
    const avgViolations = this.average(
      data.examHistory.map(e => e.proctoringViolations)
    )
    if (avgViolations > 3) {
      riskScore += 30
      factors.push(`Average ${avgViolations.toFixed(1)} violations per exam`)
      preventiveMeasures.push('Increase proctoring sensitivity')
    }
    
    // Factor 3: Exam type risk
    if (examContext.isHighStakes && !examContext.proctored) {
      riskScore += 20
      factors.push('High-stakes exam without proctoring')
      preventiveMeasures.push('Require camera and microphone monitoring')
    }
    
    // Factor 4: Behavioral red flags
    if (data.behavioralMetrics.procrastinationIndex > 80) {
      riskScore += 15
      factors.push('High procrastination may lead to desperation')
      preventiveMeasures.push('Provide study support resources')
    }
    
    // Factor 5: Time pressure
    if (examContext.duration < 60 && data.behavioralMetrics.stressLevel > 70) {
      riskScore += 10
      factors.push('High stress combined with time pressure')
    }
    
    // Determine monitoring level
    let monitoringLevel: 'LIGHT' | 'MEDIUM' | 'STRICT' = 'LIGHT'
    if (riskScore >= 50) {
      monitoringLevel = 'STRICT'
      preventiveMeasures.push('Enable AI behavioral analysis')
      preventiveMeasures.push('Implement random question ordering')
      preventiveMeasures.push('Limit tab switching and copy-paste')
    } else if (riskScore >= 25) {
      monitoringLevel = 'MEDIUM'
      preventiveMeasures.push('Enable standard proctoring features')
      preventiveMeasures.push('Monitor for suspicious patterns')
    }
    
    return {
      riskScore: Math.min(100, riskScore),
      factors,
      preventiveMeasures,
      monitoringLevel
    }
  }
  
  /**
   * Utility: Calculate average
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0
    return numbers.reduce((sum, n) => sum + n, 0) / numbers.length
  }
  
  /**
   * Utility: Calculate variance
   */
  private calculateVariance(numbers: number[]): number {
    if (numbers.length === 0) return 0
    const avg = this.average(numbers)
    const squaredDiffs = numbers.map(n => Math.pow(n - avg, 2))
    return this.average(squaredDiffs)
  }
}

// Export singleton instance
export const mlPredictionEngine = new MLPredictionEngine()
