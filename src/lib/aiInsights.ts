/**
 * AI-Powered Student Insights and Recommendations
 * Analyzes performance and provides personalized learning suggestions
 */

export interface PerformanceData {
  examId: string
  score: number
  totalQuestions: number
  correctAnswers: number
  timeSpent: number
  category: string
  difficulty: string
  answers: Array<{
    questionId: number
    isCorrect: boolean
    timeSpent: number
    difficulty: string
    topic: string
  }>
}

export interface StudentInsight {
  type: 'strength' | 'weakness' | 'improvement' | 'recommendation'
  category: string
  message: string
  confidence: number
  actionItems: string[]
  priority: 'high' | 'medium' | 'low'
}

export interface LearningRecommendation {
  title: string
  description: string
  topics: string[]
  estimatedTime: string
  difficulty: string
  resources: Array<{
    type: 'video' | 'article' | 'practice' | 'quiz'
    title: string
    url: string
  }>
}

class AIInsightsEngine {
  /**
   * Generate comprehensive insights from performance data
   */
  generateInsights(performanceHistory: PerformanceData[]): StudentInsight[] {
    const insights: StudentInsight[] = []

    if (performanceHistory.length === 0) {
      return insights
    }

    // Analyze strengths
    insights.push(...this.analyzeStrengths(performanceHistory))

    // Analyze weaknesses
    insights.push(...this.analyzeWeaknesses(performanceHistory))

    // Detect improvement trends
    insights.push(...this.analyzeImprovementTrends(performanceHistory))

    // Generate study recommendations
    insights.push(...this.generateStudyRecommendations(performanceHistory))

    // Sort by priority and confidence
    return insights.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 }
      if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      }
      return b.confidence - a.confidence
    })
  }

  /**
   * Analyze student strengths
   */
  private analyzeStrengths(history: PerformanceData[]): StudentInsight[] {
    const insights: StudentInsight[] = []
    const categoryPerformance = this.calculateCategoryPerformance(history)

    // Find categories with >80% accuracy
    for (const [category, data] of Object.entries(categoryPerformance)) {
      if (data.accuracy > 0.8 && data.totalQuestions >= 5) {
        insights.push({
          type: 'strength',
          category,
          message: `You excel in ${category} with ${Math.round(data.accuracy * 100)}% accuracy!`,
          confidence: Math.min(data.accuracy, 1),
          actionItems: [
            `Consider mentoring others in ${category}`,
            `Challenge yourself with advanced ${category} topics`,
            `Maintain this strength with regular practice`,
          ],
          priority: 'low',
        })
      }
    }

    return insights
  }

  /**
   * Analyze student weaknesses
   */
  private analyzeWeaknesses(history: PerformanceData[]): StudentInsight[] {
    const insights: StudentInsight[] = []
    const categoryPerformance = this.calculateCategoryPerformance(history)
    const topicPerformance = this.calculateTopicPerformance(history)

    // Find categories with <60% accuracy
    for (const [category, data] of Object.entries(categoryPerformance)) {
      if (data.accuracy < 0.6 && data.totalQuestions >= 3) {
        const weakTopics = Object.entries(topicPerformance)
          .filter(([, perf]) => perf.category === category && perf.accuracy < 0.6)
          .map(([topic]) => topic)

        insights.push({
          type: 'weakness',
          category,
          message: `${category} needs improvement (${Math.round(data.accuracy * 100)}% accuracy)`,
          confidence: 1 - data.accuracy,
          actionItems: [
            `Review fundamentals of ${category}`,
            `Practice more ${category} questions`,
            weakTopics.length > 0
              ? `Focus on: ${weakTopics.slice(0, 3).join(', ')}`
              : 'Study core concepts',
            `Allocate 30-45 minutes daily for ${category}`,
          ],
          priority: data.accuracy < 0.5 ? 'high' : 'medium',
        })
      }
    }

    return insights
  }

  /**
   * Analyze improvement trends
   */
  private analyzeImprovementTrends(history: PerformanceData[]): StudentInsight[] {
    const insights: StudentInsight[] = []

    if (history.length < 3) return insights

    // Sort by time
    const sorted = [...history].sort(
      (a, b) => new Date(a.examId).getTime() - new Date(b.examId).getTime()
    )

    // Calculate improvement rate
    const recent = sorted.slice(-3)
    const older = sorted.slice(0, -3)

    if (older.length > 0) {
      const recentAvg =
        recent.reduce((sum, exam) => sum + exam.correctAnswers / exam.totalQuestions, 0) /
        recent.length
      const olderAvg =
        older.reduce((sum, exam) => sum + exam.correctAnswers / exam.totalQuestions, 0) /
        older.length

      const improvement = recentAvg - olderAvg

      if (improvement > 0.1) {
        insights.push({
          type: 'improvement',
          category: 'Overall Performance',
          message: `Great progress! Your scores improved by ${Math.round(improvement * 100)}%`,
          confidence: Math.min(improvement * 5, 1),
          actionItems: [
            'Keep up the excellent work!',
            'Your study strategy is working',
            'Consider increasing difficulty level',
          ],
          priority: 'medium',
        })
      } else if (improvement < -0.1) {
        insights.push({
          type: 'improvement',
          category: 'Overall Performance',
          message: `Scores declined by ${Math.round(Math.abs(improvement) * 100)}%. Let's get back on track!`,
          confidence: Math.min(Math.abs(improvement) * 5, 1),
          actionItems: [
            'Review recent study habits',
            'Ensure adequate rest before exams',
            'Focus on weak areas identified above',
            'Consider taking a short break to avoid burnout',
          ],
          priority: 'high',
        })
      }
    }

    return insights
  }

  /**
   * Generate personalized study recommendations
   */
  private generateStudyRecommendations(history: PerformanceData[]): StudentInsight[] {
    const insights: StudentInsight[] = []
    this.calculateCategoryPerformance(history)

    // Time management recommendation
    const avgTimePerQuestion =
      history.reduce((sum, exam) => sum + exam.timeSpent / exam.totalQuestions, 0) / history.length

    if (avgTimePerQuestion > 120) {
      // More than 2 minutes per question
      insights.push({
        type: 'recommendation',
        category: 'Time Management',
        message: 'You spend significant time per question. Speed practice recommended.',
        confidence: 0.8,
        actionItems: [
          'Practice timed mock exams',
          'Learn to eliminate wrong answers quickly',
          'Set time limits for each question',
          'Practice mental math for faster calculations',
        ],
        priority: 'medium',
      })
    }

    // Difficulty progression
    const difficultyDist = this.calculateDifficultyDistribution(history)
    if (difficultyDist.easy > 0.7 && difficultyDist.hard < 0.1) {
      insights.push({
        type: 'recommendation',
        category: 'Challenge Level',
        message: "You're ready for harder questions to accelerate growth",
        confidence: 0.85,
        actionItems: [
          'Attempt medium and hard difficulty questions',
          'Challenge yourself with advanced topics',
          'Join study groups for peer learning',
        ],
        priority: 'low',
      })
    }

    return insights
  }

  /**
   * Generate personalized learning path
   */
  generateLearningPath(insights: StudentInsight[]): LearningRecommendation[] {
    const recommendations: LearningRecommendation[] = []

    // Get weak categories
    const weakCategories = insights
      .filter(i => i.type === 'weakness')
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })

    for (const weakness of weakCategories) {
      recommendations.push({
        title: `Master ${weakness.category}`,
        description: `Comprehensive study plan to improve your ${weakness.category} skills`,
        topics: weakness.actionItems
          .filter(item => item.includes('Focus on:'))
          .map(item => item.replace('Focus on: ', '')),
        estimatedTime: '2-3 weeks',
        difficulty: 'Beginner to Intermediate',
        resources: this.generateResources(weakness.category),
      })
    }

    return recommendations
  }

  /**
   * Calculate performance by category
   */
  private calculateCategoryPerformance(
    history: PerformanceData[]
  ): Record<string, { accuracy: number; totalQuestions: number }> {
    const categoryStats: Record<string, { correct: number; total: number }> = {}

    for (const exam of history) {
      if (!categoryStats[exam.category]) {
        categoryStats[exam.category] = { correct: 0, total: 0 }
      }
      categoryStats[exam.category].correct += exam.correctAnswers
      categoryStats[exam.category].total += exam.totalQuestions
    }

    const result: Record<string, { accuracy: number; totalQuestions: number }> = {}
    for (const [category, stats] of Object.entries(categoryStats)) {
      result[category] = {
        accuracy: stats.correct / stats.total,
        totalQuestions: stats.total,
      }
    }

    return result
  }

  /**
   * Calculate performance by topic
   */
  private calculateTopicPerformance(
    history: PerformanceData[]
  ): Record<string, { accuracy: number; category: string }> {
    const topicStats: Record<string, { correct: number; total: number; category: string }> = {}

    for (const exam of history) {
      for (const answer of exam.answers) {
        if (!topicStats[answer.topic]) {
          topicStats[answer.topic] = { correct: 0, total: 0, category: exam.category }
        }
        if (answer.isCorrect) {
          topicStats[answer.topic].correct++
        }
        topicStats[answer.topic].total++
      }
    }

    const result: Record<string, { accuracy: number; category: string }> = {}
    for (const [topic, stats] of Object.entries(topicStats)) {
      result[topic] = {
        accuracy: stats.correct / stats.total,
        category: stats.category,
      }
    }

    return result
  }

  /**
   * Calculate difficulty distribution
   */
  private calculateDifficultyDistribution(history: PerformanceData[]): Record<string, number> {
    const total = history.reduce((sum, exam) => sum + exam.totalQuestions, 0)
    const distribution: Record<string, number> = { easy: 0, medium: 0, hard: 0 }

    for (const exam of history) {
      for (const answer of exam.answers) {
        const difficulty = answer.difficulty.toLowerCase()
        distribution[difficulty] = (distribution[difficulty] || 0) + 1
      }
    }

    return {
      easy: distribution.easy / total,
      medium: distribution.medium / total,
      hard: distribution.hard / total,
    }
  }

  /**
   * Generate learning resources
   */
  private generateResources(
    category: string
  ): Array<{ type: 'video' | 'article' | 'practice' | 'quiz'; title: string; url: string }> {
    // This would normally fetch from a database or API
    return [
      {
        type: 'video',
        title: `${category} Fundamentals - Complete Course`,
        url: `/resources/videos/${category.toLowerCase()}-fundamentals`,
      },
      {
        type: 'article',
        title: `Understanding ${category} - Study Guide`,
        url: `/resources/guides/${category.toLowerCase()}`,
      },
      {
        type: 'practice',
        title: `${category} Practice Questions (100+)`,
        url: `/practice/${category.toLowerCase()}`,
      },
      {
        type: 'quiz',
        title: `${category} Quick Assessment`,
        url: `/quiz/${category.toLowerCase()}`,
      },
    ]
  }

  /**
   * Calculate optimal study schedule
   */
  calculateStudySchedule(
    insights: StudentInsight[],
    availableHoursPerWeek: number
  ): Array<{
    day: string
    topic: string
    duration: number
    priority: string
  }> {
    const schedule: Array<{ day: string; topic: string; duration: number; priority: string }> = []
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']

    // Sort topics by priority
    const topics = insights
      .filter(i => i.type === 'weakness' || i.type === 'recommendation')
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 }
        return priorityOrder[b.priority] - priorityOrder[a.priority]
      })

    const hoursPerDay = availableHoursPerWeek / 7
    let dayIndex = 0

    for (const topic of topics) {
      const hours = topic.priority === 'high' ? 2 : topic.priority === 'medium' ? 1.5 : 1

      schedule.push({
        day: days[dayIndex % 7],
        topic: topic.category,
        duration: Math.min(hours, hoursPerDay),
        priority: topic.priority,
      })

      dayIndex++
    }

    return schedule
  }
}

export const aiInsightsEngine = new AIInsightsEngine()

// Expose in development
if (import.meta.env.DEV) {
  (window as any).aiInsightsEngine = aiInsightsEngine
}
