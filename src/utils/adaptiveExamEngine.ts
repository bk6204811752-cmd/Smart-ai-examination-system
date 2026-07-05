/**
 * Adaptive Exam Engine
 * Implements real-time difficulty adjustment based on student performance
 * Tracks streaks, adjusts difficulty dynamically, and provides personalized feedback
 */

export type DifficultyLevel = 'Easy' | 'Medium' | 'Hard';

export interface AdaptiveQuestion {
  id: string;
  difficulty: DifficultyLevel;
  category: string;
  pointMultiplier: number;
}

export interface PerformanceMetrics {
  correctStreak: number;
  incorrectStreak: number;
  totalCorrect: number;
  totalIncorrect: number;
  currentDifficulty: DifficultyLevel;
  difficultyHistory: DifficultyLevel[];
  performanceByDifficulty: {
    Easy: { correct: number; total: number };
    Medium: { correct: number; total: number };
    Hard: { correct: number; total: number };
  };
}

export interface WeakArea {
  category: string;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  averageDifficulty: DifficultyLevel;
  needsImprovement: boolean;
}

export interface LearningPathRecommendation {
  category: string;
  priority: 'High' | 'Medium' | 'Low';
  weakAreas: string[];
  suggestedTopics: string[];
  estimatedStudyHours: number;
  resources: {
    type: 'Practice Test' | 'Video Tutorial' | 'Reading Material' | 'Interactive Quiz';
    title: string;
    difficulty: DifficultyLevel;
  }[];
}

class AdaptiveExamEngine {
  private metrics: PerformanceMetrics;
  private readonly CORRECT_STREAK_THRESHOLD = 3; // Increase difficulty after 3 correct
  private readonly INCORRECT_STREAK_THRESHOLD = 2; // Decrease difficulty after 2 incorrect
  private readonly DIFFICULTY_MULTIPLIERS = {
    Easy: 1.0,
    Medium: 1.5,
    Hard: 2.0,
  };

  constructor(initialDifficulty: DifficultyLevel = 'Medium') {
    this.metrics = {
      correctStreak: 0,
      incorrectStreak: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      currentDifficulty: initialDifficulty,
      difficultyHistory: [initialDifficulty],
      performanceByDifficulty: {
        Easy: { correct: 0, total: 0 },
        Medium: { correct: 0, total: 0 },
        Hard: { correct: 0, total: 0 },
      },
    };
  }

  /**
   * Process a student's answer and adjust difficulty dynamically
   */
  processAnswer(isCorrect: boolean, questionDifficulty: DifficultyLevel): void {
    // Update performance by difficulty
    this.metrics.performanceByDifficulty[questionDifficulty].total++;
    
    if (isCorrect) {
      this.metrics.totalCorrect++;
      this.metrics.correctStreak++;
      this.metrics.incorrectStreak = 0;
      this.metrics.performanceByDifficulty[questionDifficulty].correct++;

      // Increase difficulty after correct streak
      if (this.metrics.correctStreak >= this.CORRECT_STREAK_THRESHOLD) {
        this.increaseDifficulty();
        this.metrics.correctStreak = 0; // Reset streak after adjustment
      }
    } else {
      this.metrics.totalIncorrect++;
      this.metrics.incorrectStreak++;
      this.metrics.correctStreak = 0;

      // Decrease difficulty after incorrect streak
      if (this.metrics.incorrectStreak >= this.INCORRECT_STREAK_THRESHOLD) {
        this.decreaseDifficulty();
        this.metrics.incorrectStreak = 0; // Reset streak after adjustment
      }
    }
  }

  /**
   * Increase difficulty level if not already at maximum
   */
  private increaseDifficulty(): void {
    if (this.metrics.currentDifficulty === 'Easy') {
      this.metrics.currentDifficulty = 'Medium';
      this.metrics.difficultyHistory.push('Medium');
    } else if (this.metrics.currentDifficulty === 'Medium') {
      this.metrics.currentDifficulty = 'Hard';
      this.metrics.difficultyHistory.push('Hard');
    }
    // Already at Hard, no change
  }

  /**
   * Decrease difficulty level if not already at minimum
   */
  private decreaseDifficulty(): void {
    if (this.metrics.currentDifficulty === 'Hard') {
      this.metrics.currentDifficulty = 'Medium';
      this.metrics.difficultyHistory.push('Medium');
    } else if (this.metrics.currentDifficulty === 'Medium') {
      this.metrics.currentDifficulty = 'Easy';
      this.metrics.difficultyHistory.push('Easy');
    }
    // Already at Easy, no change
  }

  /**
   * Get the current recommended difficulty level
   */
  getCurrentDifficulty(): DifficultyLevel {
    return this.metrics.currentDifficulty;
  }

  /**
   * Get complete performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Calculate points for a question based on difficulty
   */
  calculatePoints(difficulty: DifficultyLevel, isCorrect: boolean): number {
    if (!isCorrect) return 0;
    return this.DIFFICULTY_MULTIPLIERS[difficulty];
  }

  /**
   * Get performance percentage for a specific difficulty
   */
  getAccuracyByDifficulty(difficulty: DifficultyLevel): number {
    const stats = this.metrics.performanceByDifficulty[difficulty];
    if (stats.total === 0) return 0;
    return (stats.correct / stats.total) * 100;
  }

  /**
   * Analyze weak areas from exam performance
   */
  analyzeWeakAreas(
    answers: Array<{
      category: string;
      difficulty: DifficultyLevel;
      isCorrect: boolean;
    }>
  ): WeakArea[] {
    const categoryStats = new Map<string, {
      correct: number;
      total: number;
      difficulties: DifficultyLevel[];
    }>();

    // Aggregate statistics by category
    answers.forEach(({ category, difficulty, isCorrect }) => {
      if (!categoryStats.has(category)) {
        categoryStats.set(category, { correct: 0, total: 0, difficulties: [] });
      }
      const stats = categoryStats.get(category)!;
      stats.total++;
      stats.difficulties.push(difficulty);
      if (isCorrect) stats.correct++;
    });

    // Convert to WeakArea objects
    const weakAreas: WeakArea[] = [];
    categoryStats.forEach((stats, category) => {
      const accuracy = (stats.correct / stats.total) * 100;
      const avgDifficulty = this.calculateAverageDifficulty(stats.difficulties);
      
      weakAreas.push({
        category,
        totalQuestions: stats.total,
        correctAnswers: stats.correct,
        accuracy,
        averageDifficulty: avgDifficulty,
        needsImprovement: accuracy < 60, // Below 60% needs improvement
      });
    });

    // Sort by accuracy (lowest first)
    return weakAreas.sort((a, b) => a.accuracy - b.accuracy);
  }

  /**
   * Calculate average difficulty level
   */
  private calculateAverageDifficulty(difficulties: DifficultyLevel[]): DifficultyLevel {
    const difficultyValues = { Easy: 1, Medium: 2, Hard: 3 };
    const sum = difficulties.reduce((acc, d) => acc + difficultyValues[d], 0);
    const avg = sum / difficulties.length;

    if (avg <= 1.5) return 'Easy';
    if (avg <= 2.5) return 'Medium';
    return 'Hard';
  }

  /**
   * Generate personalized learning path recommendations
   */
  generateLearningPath(weakAreas: WeakArea[]): LearningPathRecommendation[] {
    const recommendations: LearningPathRecommendation[] = [];

    weakAreas.forEach(area => {
      if (!area.needsImprovement) return;

      const priority = this.determinePriority(area.accuracy);
      const suggestedTopics = this.getSuggestedTopics(area.category, area.averageDifficulty);
      const resources = this.getRecommendedResources(area.category, area.averageDifficulty);
      const estimatedHours = this.calculateStudyHours(area.accuracy, area.totalQuestions);

      recommendations.push({
        category: area.category,
        priority,
        weakAreas: this.identifySpecificWeaknesses(area.category),
        suggestedTopics,
        estimatedStudyHours: estimatedHours,
        resources,
      });
    });

    // Sort by priority (High > Medium > Low)
    const priorityOrder = { High: 3, Medium: 2, Low: 1 };
    return recommendations.sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);
  }

  /**
   * Determine priority based on accuracy
   */
  private determinePriority(accuracy: number): 'High' | 'Medium' | 'Low' {
    if (accuracy < 40) return 'High';
    if (accuracy < 60) return 'Medium';
    return 'Low';
  }

  /**
   * Get suggested topics based on category and difficulty
   */
  private getSuggestedTopics(category: string, difficulty: DifficultyLevel): string[] {
    const topicMap: Record<string, Record<DifficultyLevel, string[]>> = {
      Mathematics: {
        Easy: ['Basic Arithmetic', 'Number Systems', 'Percentages', 'Ratios'],
        Medium: ['Algebra', 'Geometry', 'Trigonometry', 'Statistics'],
        Hard: ['Calculus', 'Complex Numbers', 'Linear Algebra', 'Probability'],
      },
      Science: {
        Easy: ['Basic Physics', 'Chemistry Fundamentals', 'Biology Basics', 'Scientific Method'],
        Medium: ['Mechanics', 'Organic Chemistry', 'Cell Biology', 'Thermodynamics'],
        Hard: ['Quantum Physics', 'Biochemistry', 'Genetics', 'Advanced Chemistry'],
      },
      'General Knowledge': {
        Easy: ['Current Affairs', 'Basic Geography', 'Famous Personalities', 'Sports'],
        Medium: ['World History', 'Political Science', 'Economics', 'International Relations'],
        Hard: ['Advanced Politics', 'Global Economics', 'Geopolitics', 'Strategic Studies'],
      },
      History: {
        Easy: ['Ancient Civilizations', 'Medieval Period', 'Famous Events', 'Historical Figures'],
        Medium: ['World Wars', 'Independence Movements', 'Renaissance', 'Industrial Revolution'],
        Hard: ['Cold War', 'Modern Geopolitics', 'Economic History', 'Historiography'],
      },
      English: {
        Easy: ['Grammar Basics', 'Vocabulary', 'Comprehension', 'Sentence Formation'],
        Medium: ['Advanced Grammar', 'Essay Writing', 'Literature Analysis', 'Rhetoric'],
        Hard: ['Critical Analysis', 'Literary Theory', 'Advanced Composition', 'Linguistics'],
      },
      Reasoning: {
        Easy: ['Pattern Recognition', 'Basic Logic', 'Analogies', 'Series Completion'],
        Medium: ['Syllogisms', 'Blood Relations', 'Coding-Decoding', 'Data Interpretation'],
        Hard: ['Complex Puzzles', 'Advanced Logic', 'Critical Reasoning', 'Analytical Thinking'],
      },
    };

    return topicMap[category]?.[difficulty] || ['Review fundamentals', 'Practice regularly'];
  }

  /**
   * Get recommended resources for study
   */
  private getRecommendedResources(
    category: string,
    difficulty: DifficultyLevel
  ): LearningPathRecommendation['resources'] {
    const baseResources = [
      {
        type: 'Practice Test' as const,
        title: `${category} - ${difficulty} Level Practice Set`,
        difficulty,
      },
      {
        type: 'Video Tutorial' as const,
        title: `${category} Fundamentals Video Series`,
        difficulty: 'Easy' as DifficultyLevel,
      },
      {
        type: 'Reading Material' as const,
        title: `${category} Concept Guide`,
        difficulty,
      },
      {
        type: 'Interactive Quiz' as const,
        title: `${category} Quick Quiz - Build Confidence`,
        difficulty: difficulty === 'Hard' ? 'Medium' : 'Easy' as DifficultyLevel,
      },
    ];

    return baseResources;
  }

  /**
   * Identify specific weaknesses within a category
   */
  private identifySpecificWeaknesses(category: string): string[] {
    const weaknessMap: Record<string, string[]> = {
      Mathematics: ['Problem-solving speed', 'Formula application', 'Calculation accuracy'],
      Science: ['Concept understanding', 'Practical application', 'Theory recall'],
      'General Knowledge': ['Current affairs awareness', 'Fact retention', 'Quick recall'],
      History: ['Date memorization', 'Event correlation', 'Timeline understanding'],
      English: ['Grammar rules', 'Vocabulary range', 'Comprehension speed'],
      Reasoning: ['Pattern identification', 'Logical thinking', 'Time management'],
    };

    return weaknessMap[category] || ['General understanding', 'Practice needed'];
  }

  /**
   * Calculate estimated study hours needed
   */
  private calculateStudyHours(accuracy: number, totalQuestions: number): number {
    // Base hours on how far from 80% target
    const targetAccuracy = 80;
    const gap = Math.max(0, targetAccuracy - accuracy);
    
    // More questions attempted = more specific data = more targeted study
    const questionsWeight = Math.min(totalQuestions / 20, 1); // Normalize to max 1
    
    // Calculate hours (1 hour per 10% gap, adjusted by questions)
    const baseHours = (gap / 10) * (1 + questionsWeight);
    
    return Math.ceil(Math.max(1, baseHours)); // Minimum 1 hour
  }

  /**
   * Get performance trend (improving/declining/stable)
   */
  getPerformanceTrend(): 'Improving' | 'Declining' | 'Stable' {
    const recentHistory = this.metrics.difficultyHistory.slice(-5);
    if (recentHistory.length < 3) return 'Stable';

    const difficultyValues = { Easy: 1, Medium: 2, Hard: 3 };
    const values = recentHistory.map(d => difficultyValues[d]);
    
    const first = values.slice(0, Math.floor(values.length / 2)).reduce((a, b) => a + b, 0);
    const last = values.slice(Math.ceil(values.length / 2)).reduce((a, b) => a + b, 0);

    if (last > first) return 'Improving';
    if (last < first) return 'Declining';
    return 'Stable';
  }

  /**
   * Reset the engine for a new exam
   */
  reset(initialDifficulty: DifficultyLevel = 'Medium'): void {
    this.metrics = {
      correctStreak: 0,
      incorrectStreak: 0,
      totalCorrect: 0,
      totalIncorrect: 0,
      currentDifficulty: initialDifficulty,
      difficultyHistory: [initialDifficulty],
      performanceByDifficulty: {
        Easy: { correct: 0, total: 0 },
        Medium: { correct: 0, total: 0 },
        Hard: { correct: 0, total: 0 },
      },
    };
  }
}

export default AdaptiveExamEngine;
