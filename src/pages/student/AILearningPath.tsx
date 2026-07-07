import { useState, useEffect } from 'react'
import { Brain, Target, TrendingUp, Award, Zap, CheckCircle, Lock } from 'lucide-react'

interface LearningPath {
  student_id: string
  current_level: string
  mastery_score: number
  recommended_topics: Array<{
    topic: string
    priority: 'high' | 'medium' | 'low'
    estimated_time: number
    difficulty: string
    prerequisites: string[]
    resources: Array<{
      type: 'video' | 'article' | 'practice' | 'quiz'
      title: string
      duration: number
      url: string
    }>
    skills: string[]
    completed: boolean
  }>
  weak_areas: Array<{
    topic: string
    current_score: number
    target_score: number
    improvement_plan: string[]
  }>
  strengths: string[]
  next_milestone: {
    title: string
    requirements: string[]
    reward: string
  }
  ai_insights: string[]
}

export default function AILearningPathGenerator({ studentId = 'current' }: { studentId?: string }) {
  const [learningPath, setLearningPath] = useState<LearningPath | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedTopic, setSelectedTopic] = useState<number | null>(null)

  useEffect(() => {
    generateLearningPath()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studentId])

  const generateLearningPath = async () => {
    setLoading(true)
    try {
      // Simulated AI-generated learning path
      const mockPath: LearningPath = {
        student_id: studentId,
        current_level: 'Intermediate',
        mastery_score: 68,
        recommended_topics: [
          {
            topic: 'Data Structures - Advanced Trees',
            priority: 'high',
            estimated_time: 120,
            difficulty: 'medium',
            prerequisites: ['Basic Trees', 'Recursion'],
            resources: [
              {
                type: 'video',
                title: 'Binary Search Trees Explained',
                duration: 25,
                url: '#',
              },
              {
                type: 'article',
                title: 'AVL Trees: Complete Guide',
                duration: 15,
                url: '#',
              },
              {
                type: 'practice',
                title: 'Tree Traversal Exercises',
                duration: 45,
                url: '#',
              },
              {
                type: 'quiz',
                title: 'Trees Mastery Quiz',
                duration: 20,
                url: '#',
              },
            ],
            skills: ['Tree Balancing', 'AVL Rotations', 'Tree Traversals'],
            completed: false,
          },
          {
            topic: 'Algorithm Optimization',
            priority: 'high',
            estimated_time: 90,
            difficulty: 'hard',
            prerequisites: ['Time Complexity', 'Space Complexity'],
            resources: [
              {
                type: 'video',
                title: 'Dynamic Programming Fundamentals',
                duration: 30,
                url: '#',
              },
              {
                type: 'practice',
                title: 'DP Practice Problems',
                duration: 60,
                url: '#',
              },
            ],
            skills: ['Dynamic Programming', 'Memoization', 'Optimization'],
            completed: false,
          },
          {
            topic: 'Graph Algorithms',
            priority: 'medium',
            estimated_time: 150,
            difficulty: 'hard',
            prerequisites: ['Data Structures - Advanced Trees'],
            resources: [
              {
                type: 'video',
                title: 'Graph Theory Basics',
                duration: 40,
                url: '#',
              },
              {
                type: 'article',
                title: "Dijkstra's Algorithm",
                duration: 20,
                url: '#',
              },
              {
                type: 'practice',
                title: 'Graph Traversal Practice',
                duration: 60,
                url: '#',
              },
            ],
            skills: ['BFS', 'DFS', 'Shortest Path', 'MST'],
            completed: false,
          },
        ],
        weak_areas: [
          {
            topic: 'Sorting Algorithms',
            current_score: 45,
            target_score: 80,
            improvement_plan: [
              'Review QuickSort implementation',
              'Practice MergeSort variations',
              'Understand time complexity trade-offs',
            ],
          },
          {
            topic: 'Recursion',
            current_score: 52,
            target_score: 75,
            improvement_plan: [
              'Master base case identification',
              'Practice recursive tree problems',
              'Learn tail recursion optimization',
            ],
          },
        ],
        strengths: ['Arrays & Linked Lists', 'Basic Algorithms', 'Problem Solving'],
        next_milestone: {
          title: 'Advanced Data Structures Mastery',
          requirements: [
            'Complete all High Priority topics',
            'Score 80%+ on Tree algorithms',
            'Solve 20 medium-level problems',
          ],
          reward: 'Unlock Advanced Algorithm Challenges',
        },
        ai_insights: [
          "📈 You're improving fastest in tree-based problems. Keep practicing!",
          '🎯 Focus on algorithm optimization to bridge the gap to advanced level',
          '⚡ Your problem-solving speed is above average. Work on accuracy now',
          '🔍 Pattern recognition is your strength - leverage it for complex problems',
        ],
      }
      setLearningPath(mockPath)
    } catch (error) {
      console.error('Failed to generate learning path:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading || !learningPath) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600">AI is generating your personalized learning path...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-xl shadow-xl p-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Brain className="w-8 h-8" />
                AI Learning Path
              </h1>
              <p className="text-white/90 mt-2">Personalized roadmap powered by machine learning</p>
            </div>
            <div className="text-center bg-white/20 backdrop-blur-sm rounded-xl p-6">
              <div className="text-4xl font-bold text-white mb-1">
                {learningPath.mastery_score}%
              </div>
              <div className="text-sm text-white/90">Overall Mastery</div>
              <div className="text-xs text-white/70 mt-1">{learningPath.current_level} Level</div>
            </div>
          </div>
        </div>

        {/* AI Insights */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-600" />
            AI-Powered Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {learningPath.ai_insights.map((insight, index) => (
              <div
                key={index}
                className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200"
              >
                <p className="text-sm text-gray-700">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Recommended Topics */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                Recommended Learning Path
              </h3>
              <div className="space-y-4">
                {learningPath.recommended_topics.map((topic, index) => (
                  <div
                    key={index}
                    className={`border-2 rounded-xl overflow-hidden transition ${
                      selectedTopic === index ? 'border-purple-600 shadow-lg' : 'border-gray-200'
                    } ${topic.completed ? 'opacity-60' : ''}`}
                  >
                    <div
                      onClick={() => setSelectedTopic(selectedTopic === index ? null : index)}
                      className="p-4 cursor-pointer hover:bg-gray-50 transition"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            {topic.completed ? (
                              <CheckCircle className="w-5 h-5 text-green-600" />
                            ) : (
                              <div
                                className={`w-5 h-5 rounded-full border-2 ${
                                  topic.priority === 'high'
                                    ? 'border-red-500'
                                    : topic.priority === 'medium'
                                      ? 'border-yellow-500'
                                      : 'border-blue-500'
                                }`}
                              />
                            )}
                            <h4 className="font-bold text-gray-900">{topic.topic}</h4>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                topic.priority === 'high'
                                  ? 'bg-red-100 text-red-700'
                                  : topic.priority === 'medium'
                                    ? 'bg-yellow-100 text-yellow-700'
                                    : 'bg-blue-100 text-blue-700'
                              }`}
                            >
                              {topic.priority.toUpperCase()}
                            </span>
                            <span
                              className={`text-xs px-2 py-1 rounded-full ${
                                topic.difficulty === 'hard'
                                  ? 'bg-purple-100 text-purple-700'
                                  : topic.difficulty === 'medium'
                                    ? 'bg-orange-100 text-orange-700'
                                    : 'bg-green-100 text-green-700'
                              }`}
                            >
                              {topic.difficulty}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600">
                            ⏱️ {topic.estimated_time} minutes • 🎯 {topic.skills.length} skills
                          </p>
                          {topic.prerequisites.length > 0 && (
                            <div className="mt-2 flex items-center gap-2">
                              <Lock className="w-3 h-3 text-gray-400" />
                              <span className="text-xs text-gray-500">
                                Requires: {topic.prerequisites.join(', ')}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Expanded Content */}
                    {selectedTopic === index && (
                      <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-4">
                        {/* Skills */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-2">
                            Skills You'll Learn
                          </h5>
                          <div className="flex flex-wrap gap-2">
                            {topic.skills.map((skill, i) => (
                              <span
                                key={i}
                                className="bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full"
                              >
                                {skill}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Resources */}
                        <div>
                          <h5 className="text-sm font-semibold text-gray-700 mb-2">
                            Learning Resources
                          </h5>
                          <div className="space-y-2">
                            {topic.resources.map((resource, i) => (
                              <a
                                key={i}
                                href={resource.url}
                                className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-300 transition"
                              >
                                <div
                                  className={`p-2 rounded-lg ${
                                    resource.type === 'video'
                                      ? 'bg-red-100'
                                      : resource.type === 'article'
                                        ? 'bg-blue-100'
                                        : resource.type === 'practice'
                                          ? 'bg-green-100'
                                          : 'bg-purple-100'
                                  }`}
                                >
                                  {resource.type === 'video'
                                    ? '🎥'
                                    : resource.type === 'article'
                                      ? '📄'
                                      : resource.type === 'practice'
                                        ? '💪'
                                        : '📝'}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-medium text-gray-900">
                                    {resource.title}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {resource.duration} minutes
                                  </p>
                                </div>
                              </a>
                            ))}
                          </div>
                        </div>

                        <button className="w-full bg-purple-600 text-white py-3 rounded-lg font-medium hover:bg-purple-700 transition">
                          Start Learning
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Next Milestone */}
            <div className="bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center gap-2 mb-4">
                <Award className="w-6 h-6" />
                <h3 className="font-bold text-lg">Next Milestone</h3>
              </div>
              <h4 className="font-semibold mb-3">{learningPath.next_milestone.title}</h4>
              <div className="space-y-2 mb-4">
                {learningPath.next_milestone.requirements.map((req, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <div className="w-1.5 h-1.5 bg-white rounded-full mt-1.5" />
                    <span>{req}</span>
                  </div>
                ))}
              </div>
              <div className="bg-white/20 rounded-lg p-3 text-sm">
                🎁 {learningPath.next_milestone.reward}
              </div>
            </div>

            {/* Strengths */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-green-600" />
                Your Strengths
              </h3>
              <div className="space-y-2">
                {learningPath.strengths.map((strength, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-600" />
                    <span className="text-gray-700">{strength}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weak Areas */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-red-600" />
                Areas to Improve
              </h3>
              <div className="space-y-4">
                {learningPath.weak_areas.map((area, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-2">
                      <span className="font-medium text-gray-900">{area.topic}</span>
                      <span className="text-gray-600">
                        {area.current_score}% → {area.target_score}%
                      </span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-red-500 h-full rounded-full"
                        style={{ width: `${area.current_score}%` }}
                      />
                    </div>
                    <ul className="text-xs text-gray-600 space-y-1">
                      {area.improvement_plan.map((plan, j) => (
                        <li key={j} className="flex items-start gap-1">
                          <span>•</span>
                          <span>{plan}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
