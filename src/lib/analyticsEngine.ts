/**
 * Advanced Analytics and Insights Engine
 * Provides predictive analytics and personalized recommendations
 */

export interface StudentPerformanceData {
  studentId: string
  examHistory: {
    examId: string
    score: number
    timeSpent: number
    difficulty: string
    category: string
    date: Date
  }[]
  practiceHistory: {
    category: string
    questionsAttempted: number
    correctAnswers: number
    avgTimePerQuestion: number
  }[]
  studyTime: {
    date: Date
    minutes: number
    topic: string
  }[]
}

export interface PredictiveInsight {
  type: 'strength' | 'weakness' | 'improvement' | 'warning' | 'recommendation'
  category: string
  confidence: number
  message: string
  actionItems: string[]
  predictedOutcome?: {
    metric: string
    value: number
    timeline: string
  }
}

export interface LearningPattern {
  bestStudyTime: 'morning' | 'afternoon' | 'evening' | 'night'
  averageStudyDuration: number
  preferredDifficulty: string
  strongCategories: string[]
  weakCategories: string[]
  learningVelocity: number // improvement rate
  consistency: number // 0-100
}

class AdvancedAnalyticsEngine {
  /**
   * Analyze student performance and generate insights
   */
  analyzePerformance(data: StudentPerformanceData): PredictiveInsight[] {
    const insights: PredictiveInsight[] = []

    // 1. Identify strengths
    const strengths = this.identifyStrengths(data)
    insights.push(...strengths)

    // 2. Identify weaknesses
    const weaknesses = this.identifyWeaknesses(data)
    insights.push(...weaknesses)

    // 3. Detect improvement trends
    const trends = this.detectTrends(data)
    insights.push(...trends)

    // 4. Generate predictions
    const predictions = this.generatePredictions(data)
    insights.push(...predictions)

    // 5. Personalized recommendations
    const recommendations = this.generateRecommendations(data)
    insights.push(...recommendations)

    return insights
  }

  /**
   * Identify student strengths
   */
  private identifyStrengths(data: StudentPerformanceData): PredictiveInsight[] {
    const insights: PredictiveInsight[] = []

    // Group exams by category
    const categoryPerformance = this.groupByCategory(data.examHistory)

    Object.entries(categoryPerformance).forEach(([category, exams]) => {
      const avgScore = exams.reduce((sum, e) => sum + e.score, 0) / exams.length

      if (avgScore >= 85) {
        insights.push({
          type: 'strength',
          category,
          confidence: Math.min(95, avgScore),
          message: `Excellent performance in ${category}! You're scoring ${avgScore.toFixed(1)}% on average.`,
          actionItems: [
            'Consider tutoring peers in this subject',
            'Challenge yourself with harder questions',
            'Maintain this excellence in upcoming exams',
          ],
        })
      }
    })

    return insights
  }

  /**
   * Identify weaknesses and areas for improvement
   */
  private identifyWeaknesses(data: StudentPerformanceData): PredictiveInsight[] {
    const insights: PredictiveInsight[] = []

    const categoryPerformance = this.groupByCategory(data.examHistory)

    Object.entries(categoryPerformance).forEach(([category, exams]) => {
      const avgScore = exams.reduce((sum, e) => sum + e.score, 0) / exams.length

      if (avgScore < 60) {
        const urgency = avgScore < 40 ? 'critical' : 'moderate'

        insights.push({
          type: 'weakness',
          category,
          confidence: 100 - avgScore,
          message: `${category} needs attention. Current average: ${avgScore.toFixed(1)}%`,
          actionItems: [
            `Schedule ${urgency === 'critical' ? '2-3' : '1-2'} hours daily for ${category}`,
            'Review fundamental concepts',
            'Practice with easier questions first',
            'Seek help from instructors or AI tutor',
          ],
          predictedOutcome: {
            metric: 'Expected improvement',
            value: 15,
            timeline: '2 weeks with consistent practice',
          },
        })
      }
    })

    return insights
  }

  /**
   * Detect performance trends
   */
  private detectTrends(data: StudentPerformanceData): PredictiveInsight[] {
    const insights: PredictiveInsight[] = []

    if (data.examHistory.length < 5) return insights

    const recentExams = data.examHistory.slice(-5)
    const scores = recentExams.map(e => e.score)

    // Calculate trend (linear regression)
    const trend = this.calculateTrend(scores)

    if (trend > 5) {
      insights.push({
        type: 'improvement',
        category: 'Overall Performance',
        confidence: 85,
        message: 'Great progress! Your scores are improving consistently.',
        actionItems: [
          'Keep up your current study routine',
          'Gradually increase difficulty level',
          "Track what's working and do more of it",
        ],
        predictedOutcome: {
          metric: 'Predicted score increase',
          value: trend * 2,
          timeline: 'next month',
        },
      })
    } else if (trend < -5) {
      insights.push({
        type: 'warning',
        category: 'Overall Performance',
        confidence: 80,
        message: "Your recent scores show a declining trend. Let's address this!",
        actionItems: [
          'Review your study schedule - are you studying enough?',
          'Identify specific topics causing difficulty',
          'Consider joining study groups',
          'Take breaks to avoid burnout',
        ],
        predictedOutcome: {
          metric: 'Risk of further decline',
          value: Math.abs(trend) * 1.5,
          timeline: 'within 2 weeks if not addressed',
        },
      })
    }

    return insights
  }

  /**
   * Generate predictive insights
   */
  private generatePredictions(data: StudentPerformanceData): PredictiveInsight[] {
    const insights: PredictiveInsight[] = []

    // Predict exam readiness
    const categoryPerformance = this.groupByCategory(data.examHistory)

    Object.entries(categoryPerformance).forEach(([category, exams]) => {
      const recentExams = exams.slice(-3)
      if (recentExams.length < 2) return

      const avgRecent = recentExams.reduce((sum, e) => sum + e.score, 0) / recentExams.length
      const consistency = this.calculateConsistency(recentExams.map(e => e.score))

      if (avgRecent >= 70 && consistency >= 70) {
        insights.push({
          type: 'recommendation',
          category,
          confidence: Math.min(95, (avgRecent + consistency) / 2),
          message: `Ready for advanced ${category} topics!`,
          actionItems: [
            'Move to harder difficulty levels',
            'Explore advanced concepts',
            'Help others struggling in this area',
          ],
          predictedOutcome: {
            metric: 'Success probability',
            value: Math.min(95, avgRecent),
            timeline: 'in next exam',
          },
        })
      }
    })

    return insights
  }

  /**
   * Generate personalized recommendations
   */
  private generateRecommendations(data: StudentPerformanceData): PredictiveInsight[] {
    const insights: PredictiveInsight[] = []

    // Study pattern analysis
    const pattern = this.analyzeLearningPattern(data)

    // Recommend optimal study schedule
    if (pattern.consistency < 50) {
      insights.push({
        type: 'recommendation',
        category: 'Study Habits',
        confidence: 90,
        message: 'Irregular study patterns detected. Consistency is key to better retention.',
        actionItems: [
          `Set a fixed study time in the ${pattern.bestStudyTime}`,
          'Start with just 30 minutes daily',
          'Use calendar reminders',
          'Track your study streak',
        ],
        predictedOutcome: {
          metric: 'Expected performance boost',
          value: 20,
          timeline: 'within 4 weeks of consistent study',
        },
      })
    }

    // Recommend practice areas
    if (pattern.weakCategories.length > 0) {
      insights.push({
        type: 'recommendation',
        category: 'Practice Focus',
        confidence: 85,
        message: 'Targeted practice in weak areas will yield best results.',
        actionItems: pattern.weakCategories.map(cat => `Practice ${cat} for 20-30 minutes daily`),
        predictedOutcome: {
          metric: 'Improvement potential',
          value: 25,
          timeline: '3 weeks',
        },
      })
    }

    return insights
  }

  /**
   * Analyze learning patterns
   */
  analyzeLearningPattern(data: StudentPerformanceData): LearningPattern {
    // Determine best study time
    const studyTimeDistribution = { morning: 0, afternoon: 0, evening: 0, night: 0 }
    data.studyTime.forEach(session => {
      const hour = session.date.getHours()
      if (hour < 12) studyTimeDistribution.morning += session.minutes
      else if (hour < 17) studyTimeDistribution.afternoon += session.minutes
      else if (hour < 21) studyTimeDistribution.evening += session.minutes
      else studyTimeDistribution.night += session.minutes
    })

    const bestStudyTime = Object.entries(studyTimeDistribution).sort(
      (a, b) => b[1] - a[1]
    )[0][0] as LearningPattern['bestStudyTime']

    // Calculate average study duration
    const avgStudyDuration =
      data.studyTime.length > 0
        ? data.studyTime.reduce((sum, s) => sum + s.minutes, 0) / data.studyTime.length
        : 0

    // Identify strong/weak categories
    const categoryPerformance = this.groupByCategory(data.examHistory)
    const strongCategories = Object.entries(categoryPerformance)
      .filter(([, exams]) => {
        const avg = exams.reduce((sum, e) => sum + e.score, 0) / exams.length
        return avg >= 75
      })
      .map(([cat]) => cat)

    const weakCategories = Object.entries(categoryPerformance)
      .filter(([, exams]) => {
        const avg = exams.reduce((sum, e) => sum + e.score, 0) / exams.length
        return avg < 60
      })
      .map(([cat]) => cat)

    // Calculate learning velocity (improvement rate)
    const learningVelocity = this.calculateLearningVelocity(data.examHistory)

    // Calculate consistency
    const consistency = this.calculateStudyConsistency(data.studyTime)

    return {
      bestStudyTime,
      averageStudyDuration: avgStudyDuration,
      preferredDifficulty: 'medium', // Can be calculated based on performance
      strongCategories,
      weakCategories,
      learningVelocity,
      consistency,
    }
  }

  /**
   * Helper: Group exams by category
   */
  private groupByCategory(exams: StudentPerformanceData['examHistory']) {
    return exams.reduce(
      (acc, exam) => {
        if (!acc[exam.category]) acc[exam.category] = []
        acc[exam.category].push(exam)
        return acc
      },
      {} as Record<string, typeof exams>
    )
  }

  /**
   * Helper: Calculate trend (simple linear regression slope)
   */
  private calculateTrend(scores: number[]): number {
    const n = scores.length
    if (n < 2) return 0

    const xMean = (n - 1) / 2
    const yMean = scores.reduce((sum, s) => sum + s, 0) / n

    let numerator = 0
    let denominator = 0

    scores.forEach((score, i) => {
      numerator += (i - xMean) * (score - yMean)
      denominator += Math.pow(i - xMean, 2)
    })

    return denominator === 0 ? 0 : numerator / denominator
  }

  /**
   * Helper: Calculate consistency (inverse of standard deviation)
   */
  private calculateConsistency(scores: number[]): number {
    if (scores.length < 2) return 100

    const mean = scores.reduce((sum, s) => sum + s, 0) / scores.length
    const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / scores.length
    const stdDev = Math.sqrt(variance)

    // Convert to 0-100 scale (lower stdDev = higher consistency)
    return Math.max(0, 100 - stdDev)
  }

  /**
   * Helper: Calculate learning velocity
   */
  private calculateLearningVelocity(exams: StudentPerformanceData['examHistory']): number {
    if (exams.length < 5) return 0

    const first5 = exams.slice(0, 5)
    const last5 = exams.slice(-5)

    const avgFirst = first5.reduce((sum, e) => sum + e.score, 0) / 5
    const avgLast = last5.reduce((sum, e) => sum + e.score, 0) / 5

    return avgLast - avgFirst
  }

  /**
   * Helper: Calculate study consistency
   */
  private calculateStudyConsistency(studyTime: StudentPerformanceData['studyTime']): number {
    if (studyTime.length < 7) return 0

    // Check for gaps in study days
    const dates = studyTime.map(s => s.date.toDateString())
    const uniqueDates = new Set(dates)

    // Calculate days studied vs total days in range
    const firstDate = new Date(Math.min(...studyTime.map(s => s.date.getTime())))
    const lastDate = new Date(Math.max(...studyTime.map(s => s.date.getTime())))
    const totalDays = Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))

    const studyDays = uniqueDates.size
    const consistency = totalDays > 0 ? (studyDays / totalDays) * 100 : 0

    return Math.min(100, consistency)
  }

  /**
   * Generate performance report
   */
  generateReport(data: StudentPerformanceData) {
    const insights = this.analyzePerformance(data)
    const pattern = this.analyzeLearningPattern(data)

    return {
      summary: {
        totalExams: data.examHistory.length,
        avgScore: data.examHistory.reduce((sum, e) => sum + e.score, 0) / data.examHistory.length,
        strongAreas: pattern.strongCategories.length,
        weakAreas: pattern.weakCategories.length,
        consistency: pattern.consistency,
        learningVelocity: pattern.learningVelocity,
      },
      insights,
      learningPattern: pattern,
      recommendations: insights.filter(i => i.type === 'recommendation'),
    }
  }
}

export const analyticsEngine = new AdvancedAnalyticsEngine()
