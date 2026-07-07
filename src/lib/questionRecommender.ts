/**
 * Intelligent Question Recommendation Engine
 * AI-powered question selection based on student performance, learning patterns,
 * and adaptive difficulty adjustment
 */

export interface Question {
  id: string
  text: string
  subject: string
  topic: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
  type: 'mcq' | 'true_false' | 'short_answer' | 'coding' | 'essay'
  points: number
  timeEstimate: number // seconds
  prerequisites: string[] // Topic IDs
  relatedTopics: string[]
  blooms_taxonomy: 'Remember' | 'Understand' | 'Apply' | 'Analyze' | 'Evaluate' | 'Create'
  tags: string[]
  metadata: QuestionMetadata
}

export interface QuestionMetadata {
  createdAt: Date
  updatedAt: Date
  usageCount: number
  averageScore: number
  averageTimeSpent: number
  discriminationIndex: number // -1 to 1 (how well it differentiates high/low performers)
  difficultyIndex: number // 0 to 1 (actual difficulty based on data)
  reliability: number // 0 to 1
}

export interface StudentProfile {
  studentId: string
  performanceHistory: PerformanceRecord[]
  masteredTopics: string[]
  weakTopics: string[]
  learningStyle: 'visual' | 'auditory' | 'kinesthetic' | 'reading'
  cognitiveProfile: CognitiveProfile
  studyPatterns: StudyPattern[]
}

export interface PerformanceRecord {
  questionId: string
  topic: string
  difficulty: string
  correct: boolean
  timeSpent: number
  timestamp: Date
  confidenceLevel: number // 0-100
}

export interface CognitiveProfile {
  memoryStrength: number // 0-100
  processingSpeed: number // 0-100
  analyticalThinking: number // 0-100
  creativeThinking: number // 0-100
  attentionSpan: number // minutes
  stressResilience: number // 0-100
}

export interface StudyPattern {
  topic: string
  hoursSpent: number
  resourcesUsed: string[]
  lastStudiedAt: Date
  retentionRate: number // 0-100
}

export interface RecommendationRequest {
  studentProfile: StudentProfile
  targetSubject: string
  targetTopics?: string[]
  numberOfQuestions: number
  examDuration: number // minutes
  examPurpose: 'PRACTICE' | 'ASSESSMENT' | 'ADAPTIVE' | 'REVISION' | 'CHALLENGE'
  constraints?: RecommendationConstraints
}

export interface RecommendationConstraints {
  minDifficulty?: 'Easy' | 'Medium' | 'Hard'
  maxDifficulty?: 'Easy' | 'Medium' | 'Hard'
  requiredTopics?: string[]
  excludeTopics?: string[]
  questionTypes?: string[]
  bloomsLevels?: string[]
  targetAccuracy?: number // 0-100 (ideal accuracy for optimal learning)
}

export interface QuestionRecommendation {
  question: Question
  score: number // 0-100 (relevance score)
  reasoning: string[]
  expectedDifficulty: number // 0-100 (personalized difficulty)
  learningValue: number // 0-100
  sequencePosition: number // Order in exam
}

export interface RecommendationResult {
  recommendations: QuestionRecommendation[]
  overallMetrics: {
    averageDifficulty: number
    topicCoverage: number
    learningProgression: number
    estimatedAccuracy: number
    confidenceScore: number
  }
  learningPath: {
    weaknessesToAddress: string[]
    strengtheningOpportunities: string[]
    challengeAreas: string[]
  }
}

class IntelligentQuestionRecommender {
  private questionDatabase: Map<string, Question> = new Map()
  private topicGraph: Map<string, string[]> = new Map() // topic -> prerequisite topics

  // Weights for scoring algorithm
  private readonly WEIGHTS = {
    DIFFICULTY_MATCH: 0.25,
    TOPIC_RELEVANCE: 0.2,
    LEARNING_VALUE: 0.2,
    WEAKNESS_COVERAGE: 0.15,
    PROGRESSIVE_DIFFICULTY: 0.1,
    QUESTION_QUALITY: 0.1,
  }

  /**
   * Generate personalized question recommendations
   */
  async recommend(request: RecommendationRequest): Promise<RecommendationResult> {
    const { studentProfile, numberOfQuestions, examPurpose } = request

    // Filter candidate questions
    const candidateQuestions = this.getCandidateQuestions(request)

    // Score each question
    const scored = await Promise.all(
      candidateQuestions.map(q => this.scoreQuestion(q, studentProfile, request))
    )

    // Sort by score
    scored.sort((a, b) => b.score - a.score)

    // Select questions with diversity
    const selected = this.selectDiverseQuestions(scored, numberOfQuestions, request)

    // Sequence questions optimally
    const sequenced = this.sequenceQuestions(selected, examPurpose)

    // Calculate overall metrics
    const metrics = this.calculateOverallMetrics(sequenced, studentProfile)

    // Generate learning path
    const learningPath = this.generateLearningPath(sequenced, studentProfile)

    return {
      recommendations: sequenced,
      overallMetrics: metrics,
      learningPath,
    }
  }

  /**
   * Get candidate questions based on filters
   */
  private getCandidateQuestions(request: RecommendationRequest): Question[] {
    const { targetSubject, targetTopics, constraints } = request
    let candidates: Question[] = []

    // Filter by subject
    this.questionDatabase.forEach(q => {
      if (q.subject === targetSubject) {
        candidates.push(q)
      }
    })

    // Filter by topics if specified
    if (targetTopics && targetTopics.length > 0) {
      candidates = candidates.filter(q => targetTopics.includes(q.topic))
    }

    // Apply constraints
    if (constraints) {
      if (constraints.requiredTopics) {
        candidates = candidates.filter(q => constraints.requiredTopics!.includes(q.topic))
      }

      if (constraints.excludeTopics) {
        candidates = candidates.filter(q => !constraints.excludeTopics!.includes(q.topic))
      }

      if (constraints.questionTypes) {
        candidates = candidates.filter(q => constraints.questionTypes!.includes(q.type))
      }

      if (constraints.bloomsLevels) {
        candidates = candidates.filter(q => constraints.bloomsLevels!.includes(q.blooms_taxonomy))
      }

      if (constraints.minDifficulty) {
        const minLevel = this.difficultyToNumber(constraints.minDifficulty)
        candidates = candidates.filter(q => this.difficultyToNumber(q.difficulty) >= minLevel)
      }

      if (constraints.maxDifficulty) {
        const maxLevel = this.difficultyToNumber(constraints.maxDifficulty)
        candidates = candidates.filter(q => this.difficultyToNumber(q.difficulty) <= maxLevel)
      }
    }

    return candidates
  }

  /**
   * Score a question for a specific student
   */
  private async scoreQuestion(
    question: Question,
    profile: StudentProfile,
    request: RecommendationRequest
  ): Promise<QuestionRecommendation> {
    const scores: Record<string, number> = {}
    const reasoning: string[] = []

    // 1. Difficulty Match Score
    const difficultyScore = this.calculateDifficultyMatch(question, profile)
    scores.difficultyMatch = difficultyScore
    if (difficultyScore > 70) {
      reasoning.push(`Optimal difficulty level for current skill`)
    } else if (difficultyScore < 40) {
      reasoning.push(`May be too ${question.difficulty.toLowerCase()} based on history`)
    }

    // 2. Topic Relevance Score
    const topicScore = this.calculateTopicRelevance(question, profile)
    scores.topicRelevance = topicScore
    if (profile.weakTopics.includes(question.topic)) {
      reasoning.push(`Addresses weak topic: ${question.topic}`)
    } else if (profile.masteredTopics.includes(question.topic)) {
      reasoning.push(`Reinforces mastered topic: ${question.topic}`)
    }

    // 3. Learning Value Score
    const learningValue = this.calculateLearningValue(question, profile)
    scores.learningValue = learningValue
    if (learningValue > 80) {
      reasoning.push(`High learning potential`)
    }

    // 4. Weakness Coverage Score
    const weaknessScore = this.calculateWeaknessCoverage(question, profile)
    scores.weaknessCoverage = weaknessScore
    if (weaknessScore > 70) {
      reasoning.push(`Targets identified weakness`)
    }

    // 5. Progressive Difficulty Score (based on exam purpose)
    const progressionScore = this.calculateProgressionScore(question, request.examPurpose)
    scores.progression = progressionScore

    // 6. Question Quality Score
    const qualityScore = this.calculateQuestionQuality(question)
    scores.quality = qualityScore
    if (question.metadata.discriminationIndex > 0.4) {
      reasoning.push(`High-quality discriminating question`)
    }

    // Calculate weighted total score
    const totalScore =
      scores.difficultyMatch * this.WEIGHTS.DIFFICULTY_MATCH +
      scores.topicRelevance * this.WEIGHTS.TOPIC_RELEVANCE +
      scores.learningValue * this.WEIGHTS.LEARNING_VALUE +
      scores.weaknessCoverage * this.WEIGHTS.WEAKNESS_COVERAGE +
      scores.progression * this.WEIGHTS.PROGRESSIVE_DIFFICULTY +
      scores.quality * this.WEIGHTS.QUESTION_QUALITY

    // Calculate expected difficulty (personalized)
    const expectedDifficulty = this.calculatePersonalizedDifficulty(question, profile)

    return {
      question,
      score: Math.round(totalScore),
      reasoning,
      expectedDifficulty,
      learningValue,
      sequencePosition: 0, // Will be set later
    }
  }

  /**
   * Calculate difficulty match score
   */
  private calculateDifficultyMatch(question: Question, profile: StudentProfile): number {
    const studentLevel = this.estimateStudentLevel(profile, question.topic)
    const questionLevel = this.difficultyToNumber(question.difficulty)

    // Ideal: question slightly above student level (zone of proximal development)
    const idealDifference = 0.2 // 20% above current level
    const actualDifference = questionLevel - studentLevel

    if (Math.abs(actualDifference - idealDifference) < 0.1) {
      return 100 // Perfect match
    } else if (actualDifference < 0) {
      // Too easy
      return Math.max(0, 60 - Math.abs(actualDifference) * 100)
    } else if (actualDifference > 0.5) {
      // Too hard
      return Math.max(0, 50 - (actualDifference - 0.5) * 100)
    } else {
      // Good range
      return 80 - Math.abs(actualDifference - idealDifference) * 100
    }
  }

  /**
   * Calculate topic relevance score
   */
  private calculateTopicRelevance(question: Question, profile: StudentProfile): number {
    let score = 50 // Base score

    // Bonus for weak topics (prioritize improvement)
    if (profile.weakTopics.includes(question.topic)) {
      score += 40
    }

    // Bonus for recently studied topics (reinforcement)
    const recentStudy = profile.studyPatterns.find(
      p =>
        p.topic === question.topic &&
        Date.now() - p.lastStudiedAt.getTime() < 7 * 24 * 60 * 60 * 1000 // Within 7 days
    )
    if (recentStudy) {
      score += 20
    }

    // Penalty for mastered topics (unless it's a challenge exam)
    if (profile.masteredTopics.includes(question.topic)) {
      score -= 20
    }

    return Math.min(100, Math.max(0, score))
  }

  /**
   * Calculate learning value
   */
  private calculateLearningValue(question: Question, profile: StudentProfile): number {
    let value = 50

    // Higher Bloom's taxonomy = higher learning value
    const bloomsValue = {
      Remember: 20,
      Understand: 40,
      Apply: 60,
      Analyze: 75,
      Evaluate: 85,
      Create: 95,
    }
    value += (bloomsValue[question.blooms_taxonomy] - 50) * 0.5

    // Prerequisites mastered = higher value
    const masteredPrereqs = question.prerequisites.filter(p => profile.masteredTopics.includes(p))
    const prereqCompleteness =
      question.prerequisites.length > 0 ? masteredPrereqs.length / question.prerequisites.length : 1
    value += prereqCompleteness * 30

    // Novel topics = learning opportunity
    const hasSeenTopic = profile.performanceHistory.some(p => p.topic === question.topic)
    if (!hasSeenTopic) {
      value += 15
    }

    return Math.min(100, Math.max(0, value))
  }

  /**
   * Calculate weakness coverage
   */
  private calculateWeaknessCoverage(question: Question, profile: StudentProfile): number {
    if (!profile.weakTopics.includes(question.topic)) {
      return 30 // Low score if doesn't address weakness
    }

    // Find performance in this topic
    const topicRecords = profile.performanceHistory.filter(p => p.topic === question.topic)
    if (topicRecords.length === 0) return 70

    const accuracy = topicRecords.filter(p => p.correct).length / topicRecords.length

    // Lower accuracy = higher priority to improve
    return Math.round(100 - accuracy * 50)
  }

  /**
   * Calculate progression score
   */
  private calculateProgressionScore(question: Question, purpose: string): number {
    // Different purposes prioritize different progression patterns
    switch (purpose) {
      case 'PRACTICE':
        return 70 // Moderate importance
      case 'ADAPTIVE':
        return 90 // High importance
      case 'REVISION':
        return 50 // Lower importance
      case 'CHALLENGE':
        return 60 // Moderate importance
      default:
        return 70
    }
  }

  /**
   * Calculate question quality
   */
  private calculateQuestionQuality(question: Question): number {
    const metadata = question.metadata
    let quality = 50

    // Discrimination index (good questions separate high/low performers)
    if (metadata.discriminationIndex > 0.4) quality += 25
    else if (metadata.discriminationIndex > 0.2) quality += 15
    else if (metadata.discriminationIndex < 0) quality -= 20

    // Reliability
    quality += metadata.reliability * 20

    // Usage validation (questions used more are generally better)
    if (metadata.usageCount > 100) quality += 10
    else if (metadata.usageCount > 50) quality += 5

    return Math.min(100, Math.max(0, quality))
  }

  /**
   * Select diverse set of questions
   */
  private selectDiverseQuestions(
    scored: QuestionRecommendation[],
    count: number,
    request: RecommendationRequest
  ): QuestionRecommendation[] {
    const selected: QuestionRecommendation[] = []
    const topicCounts = new Map<string, number>()
    const difficultyCounts = new Map<string, number>()

    for (const item of scored) {
      if (selected.length >= count) break

      const topic = item.question.topic
      const difficulty = item.question.difficulty

      // Ensure diversity across topics and difficulties
      const topicCount = topicCounts.get(topic) || 0
      const difficultyCount = difficultyCounts.get(difficulty) || 0

      // Allow max 40% from same topic
      if (topicCount >= Math.ceil(count * 0.4)) continue

      // Ensure difficulty distribution
      if (request.examPurpose !== 'ADAPTIVE') {
        if (difficultyCount >= Math.ceil(count * 0.5)) continue
      }

      selected.push(item)
      topicCounts.set(topic, topicCount + 1)
      difficultyCounts.set(difficulty, difficultyCount + 1)
    }

    return selected
  }

  /**
   * Sequence questions optimally
   */
  private sequenceQuestions(
    questions: QuestionRecommendation[],
    purpose: string
  ): QuestionRecommendation[] {
    let sequenced = [...questions]

    switch (purpose) {
      case 'PRACTICE':
      case 'ASSESSMENT':
        // Start easy, increase difficulty gradually
        sequenced.sort((a, b) => {
          const diffA = this.difficultyToNumber(a.question.difficulty)
          const diffB = this.difficultyToNumber(b.question.difficulty)
          return diffA - diffB
        })
        break

      case 'ADAPTIVE':
        // Start medium, adjust based on performance (will be done dynamically)
        sequenced.sort((a, b) => {
          const diffA = Math.abs(this.difficultyToNumber(a.question.difficulty) - 0.5)
          const diffB = Math.abs(this.difficultyToNumber(b.question.difficulty) - 0.5)
          return diffA - diffB
        })
        break

      case 'CHALLENGE':
        // Start hard to filter quickly
        sequenced.sort((a, b) => {
          const diffA = this.difficultyToNumber(a.question.difficulty)
          const diffB = this.difficultyToNumber(b.question.difficulty)
          return diffB - diffA
        })
        break

      case 'REVISION':
        // Mix difficulties for variety
        sequenced = this.shuffleWithConstraints(sequenced)
        break
    }

    // Set sequence positions
    sequenced.forEach((q, index) => {
      q.sequencePosition = index + 1
    })

    return sequenced
  }

  /**
   * Calculate overall metrics
   */
  private calculateOverallMetrics(
    recommendations: QuestionRecommendation[],
    profile: StudentProfile
  ) {
    const difficulties = recommendations.map(r => this.difficultyToNumber(r.question.difficulty))
    const averageDifficulty =
      (difficulties.reduce((sum, d) => sum + d, 0) / difficulties.length) * 100

    // Topic coverage
    const uniqueTopics = new Set(recommendations.map(r => r.question.topic))
    const topicCoverage =
      (uniqueTopics.size / Math.max(1, profile.weakTopics.length + profile.masteredTopics.length)) *
      100

    // Learning progression (increasing difficulty)
    const progressionScore = this.calculateProgressionMetric(recommendations)

    // Estimated accuracy
    const estimatedAccuracy =
      recommendations.reduce((sum, r) => sum + (100 - r.expectedDifficulty), 0) /
      recommendations.length

    // Confidence (based on data availability)
    const avgUsage =
      recommendations.reduce((sum, r) => sum + r.question.metadata.usageCount, 0) /
      recommendations.length
    const confidenceScore = Math.min(95, 50 + avgUsage / 10)

    return {
      averageDifficulty: Math.round(averageDifficulty),
      topicCoverage: Math.round(topicCoverage),
      learningProgression: Math.round(progressionScore),
      estimatedAccuracy: Math.round(estimatedAccuracy),
      confidenceScore: Math.round(confidenceScore),
    }
  }

  /**
   * Generate learning path
   */
  private generateLearningPath(recommendations: QuestionRecommendation[], profile: StudentProfile) {
    const weaknessesToAddress: string[] = []
    const strengtheningOpportunities: string[] = []
    const challengeAreas: string[] = []

    recommendations.forEach(r => {
      const topic = r.question.topic

      if (profile.weakTopics.includes(topic)) {
        if (!weaknessesToAddress.includes(topic)) {
          weaknessesToAddress.push(topic)
        }
      }

      if (profile.masteredTopics.includes(topic) && r.question.blooms_taxonomy === 'Create') {
        if (!challengeAreas.includes(topic)) {
          challengeAreas.push(topic)
        }
      }

      if (r.learningValue > 75) {
        if (!strengtheningOpportunities.includes(topic)) {
          strengtheningOpportunities.push(topic)
        }
      }
    })

    return {
      weaknessesToAddress: weaknessesToAddress.slice(0, 5),
      strengtheningOpportunities: strengtheningOpportunities.slice(0, 5),
      challengeAreas: challengeAreas.slice(0, 3),
    }
  }

  /**
   * Utility: Estimate student level in a topic
   */
  private estimateStudentLevel(profile: StudentProfile, topic: string): number {
    const topicRecords = profile.performanceHistory.filter(p => p.topic === topic)

    if (topicRecords.length === 0) {
      return 0.3 // Beginner
    }

    const recentRecords = topicRecords.slice(-10) // Last 10 questions
    const accuracy = recentRecords.filter(p => p.correct).length / recentRecords.length

    // Average difficulty of correctly answered questions
    const correctDifficulties = recentRecords
      .filter(p => p.correct)
      .map(p => this.difficultyToNumber(p.difficulty as any))

    if (correctDifficulties.length === 0) return 0.2

    const avgCorrectDifficulty =
      correctDifficulties.reduce((sum, d) => sum + d, 0) / correctDifficulties.length

    // Combine accuracy and difficulty
    return avgCorrectDifficulty * accuracy
  }

  /**
   * Utility: Calculate personalized difficulty
   */
  private calculatePersonalizedDifficulty(question: Question, profile: StudentProfile): number {
    const baselineDifficulty = this.difficultyToNumber(question.difficulty)
    const studentLevel = this.estimateStudentLevel(profile, question.topic)

    // Personalized difficulty is relative to student level
    const personalizedDifficulty = (baselineDifficulty - studentLevel) * 100

    return Math.min(100, Math.max(0, personalizedDifficulty))
  }

  /**
   * Utility: Calculate progression metric
   */
  private calculateProgressionMetric(recommendations: QuestionRecommendation[]): number {
    if (recommendations.length < 2) return 100

    let progressionCount = 0
    for (let i = 1; i < recommendations.length; i++) {
      const prevDiff = this.difficultyToNumber(recommendations[i - 1].question.difficulty)
      const currDiff = this.difficultyToNumber(recommendations[i].question.difficulty)

      if (currDiff >= prevDiff - 0.1) {
        // Allow slight decrease
        progressionCount++
      }
    }

    return (progressionCount / (recommendations.length - 1)) * 100
  }

  /**
   * Utility: Convert difficulty to number
   */
  private difficultyToNumber(difficulty: string): number {
    switch (difficulty) {
      case 'Easy':
        return 0.33
      case 'Medium':
        return 0.67
      case 'Hard':
        return 1.0
      default:
        return 0.5
    }
  }

  /**
   * Utility: Shuffle with constraints
   */
  private shuffleWithConstraints(items: QuestionRecommendation[]): QuestionRecommendation[] {
    const shuffled = [...items]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  /**
   * Load questions into database
   */
  loadQuestions(questions: Question[]) {
    questions.forEach(q => {
      this.questionDatabase.set(q.id, q)
    })
  }

  /**
   * Build topic dependency graph
   */
  buildTopicGraph(dependencies: Record<string, string[]>) {
    Object.entries(dependencies).forEach(([topic, prerequisites]) => {
      this.topicGraph.set(topic, prerequisites)
    })
  }
}

// Export singleton instance
export const questionRecommender = new IntelligentQuestionRecommender()
