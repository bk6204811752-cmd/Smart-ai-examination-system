import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { Trophy, Award, Star, Target, Zap, TrendingUp, Medal, Crown, Flame, CheckCircle, Lock } from 'lucide-react'
import { toast } from 'sonner'

interface Achievement {
  id: string
  title: string
  description: string
  icon: 'trophy' | 'star' | 'medal' | 'crown' | 'zap' | 'target' | 'flame'
  points: number
  unlocked: boolean
  unlockedDate?: string
  progress: number
  maxProgress: number
  category: 'exam' | 'practice' | 'streak' | 'mastery' | 'special'
  rarity: 'common' | 'rare' | 'epic' | 'legendary'
}

interface Badge {
  id: string
  name: string
  description: string
  imageUrl: string
  earnedDate: string
  level: number
}

interface LeaderboardEntry {
  rank: number
  userId: string
  username: string
  avatar?: string
  totalPoints: number
  level: number
  achievements: number
  trend: 'up' | 'down' | 'same'
  rankChange: number
}

export default function GamificationPage() {
  const { user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'overview' | 'achievements' | 'badges' | 'leaderboard'>('overview')
  const [achievements, setAchievements] = useState<Achievement[]>([])
  const [badges, setBadges] = useState<Badge[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [userStats, setUserStats] = useState({
    totalPoints: 4850,
    level: 12,
    nextLevelPoints: 5000,
    currentLevelPoints: 4500,
    rank: 8,
    achievementsUnlocked: 24,
    totalAchievements: 48,
    currentStreak: 7,
    longestStreak: 15,
    badges: 12
  })

  useEffect(() => {
    loadGamificationData()
  }, [])

  const loadGamificationData = async () => {
    // Simulated achievement data
    const mockAchievements: Achievement[] = [
      {
        id: 'first_exam',
        title: 'First Steps',
        description: 'Complete your first exam',
        icon: 'trophy',
        points: 50,
        unlocked: true,
        unlockedDate: '2024-01-15',
        progress: 1,
        maxProgress: 1,
        category: 'exam',
        rarity: 'common'
      },
      {
        id: 'perfect_score',
        title: 'Perfect Score',
        description: 'Achieve 100% on any exam',
        icon: 'star',
        points: 200,
        unlocked: true,
        unlockedDate: '2024-02-01',
        progress: 1,
        maxProgress: 1,
        category: 'exam',
        rarity: 'rare'
      },
      {
        id: 'exam_master',
        title: 'Exam Master',
        description: 'Complete 50 exams',
        icon: 'crown',
        points: 500,
        unlocked: false,
        progress: 32,
        maxProgress: 50,
        category: 'exam',
        rarity: 'epic'
      },
      {
        id: 'streak_week',
        title: '7-Day Streak',
        description: 'Practice for 7 consecutive days',
        icon: 'flame',
        points: 150,
        unlocked: true,
        unlockedDate: '2024-02-10',
        progress: 7,
        maxProgress: 7,
        category: 'streak',
        rarity: 'common'
      },
      {
        id: 'streak_month',
        title: '30-Day Streak',
        description: 'Practice for 30 consecutive days',
        icon: 'flame',
        points: 1000,
        unlocked: false,
        progress: 7,
        maxProgress: 30,
        category: 'streak',
        rarity: 'legendary'
      },
      {
        id: 'speed_demon',
        title: 'Speed Demon',
        description: 'Complete an exam in under 10 minutes',
        icon: 'zap',
        points: 100,
        unlocked: true,
        unlockedDate: '2024-01-28',
        progress: 1,
        maxProgress: 1,
        category: 'special',
        rarity: 'rare'
      },
      {
        id: 'practice_100',
        title: 'Practice Makes Perfect',
        description: 'Complete 100 practice questions',
        icon: 'target',
        points: 300,
        unlocked: false,
        progress: 67,
        maxProgress: 100,
        category: 'practice',
        rarity: 'rare'
      },
      {
        id: 'subject_master',
        title: 'Subject Mastery',
        description: 'Achieve 90%+ average in a subject',
        icon: 'medal',
        points: 250,
        unlocked: true,
        unlockedDate: '2024-02-15',
        progress: 1,
        maxProgress: 1,
        category: 'mastery',
        rarity: 'epic'
      }
    ]

    const mockBadges: Badge[] = [
      { id: 'b1', name: 'Early Adopter', description: 'One of the first 100 users', imageUrl: '', earnedDate: '2024-01-10', level: 1 },
      { id: 'b2', name: 'Top Performer', description: 'Ranked in top 10%', imageUrl: '', earnedDate: '2024-02-01', level: 2 },
      { id: 'b3', name: 'Helpful Student', description: 'Helped 5 other students', imageUrl: '', earnedDate: '2024-02-10', level: 1 }
    ]

    const mockLeaderboard: LeaderboardEntry[] = [
      { rank: 1, userId: '1', username: 'AlexChen', totalPoints: 12450, level: 25, achievements: 45, trend: 'same', rankChange: 0 },
      { rank: 2, userId: '2', username: 'SarahM', totalPoints: 11200, level: 23, achievements: 42, trend: 'up', rankChange: 1 },
      { rank: 3, userId: '3', username: 'MikeJ', totalPoints: 10800, level: 22, achievements: 40, trend: 'down', rankChange: -1 },
      { rank: 4, userId: '4', username: 'EmilyR', totalPoints: 9500, level: 20, achievements: 38, trend: 'up', rankChange: 2 },
      { rank: 5, userId: '5', username: 'DavidL', totalPoints: 8900, level: 19, achievements: 35, trend: 'same', rankChange: 0 },
      { rank: 6, userId: '6', username: 'LisaW', totalPoints: 7800, level: 17, achievements: 32, trend: 'up', rankChange: 3 },
      { rank: 7, userId: '7', username: 'TomH', totalPoints: 6500, level: 15, achievements: 28, trend: 'down', rankChange: -2 },
      { rank: 8, userId: user?._id || '8', username: user?.full_name || 'You', totalPoints: 4850, level: 12, achievements: 24, trend: 'up', rankChange: 1 },
      { rank: 9, userId: '9', username: 'JennaK', totalPoints: 4200, level: 11, achievements: 22, trend: 'down', rankChange: -1 },
      { rank: 10, userId: '10', username: 'ChrisP', totalPoints: 3800, level: 10, achievements: 20, trend: 'same', rankChange: 0 }
    ]

    setAchievements(mockAchievements)
    setBadges(mockBadges)
    setLeaderboard(mockLeaderboard)
  }

  const getAchievementIcon = (icon: Achievement['icon']) => {
    switch (icon) {
      case 'trophy': return <Trophy className="w-6 h-6" />
      case 'star': return <Star className="w-6 h-6" />
      case 'medal': return <Medal className="w-6 h-6" />
      case 'crown': return <Crown className="w-6 h-6" />
      case 'zap': return <Zap className="w-6 h-6" />
      case 'target': return <Target className="w-6 h-6" />
      case 'flame': return <Flame className="w-6 h-6" />
    }
  }

  const getRarityColor = (rarity: Achievement['rarity']) => {
    switch (rarity) {
      case 'common': return 'from-gray-500 to-gray-600'
      case 'rare': return 'from-blue-500 to-blue-600'
      case 'epic': return 'from-purple-500 to-purple-600'
      case 'legendary': return 'from-yellow-500 to-orange-600'
    }
  }

  const getCategoryColor = (category: Achievement['category']) => {
    switch (category) {
      case 'exam': return 'bg-blue-100 text-blue-700'
      case 'practice': return 'bg-green-100 text-green-700'
      case 'streak': return 'bg-orange-100 text-orange-700'
      case 'mastery': return 'bg-purple-100 text-purple-700'
      case 'special': return 'bg-pink-100 text-pink-700'
    }
  }

  const levelProgress = ((userStats.totalPoints - userStats.currentLevelPoints) / (userStats.nextLevelPoints - userStats.currentLevelPoints)) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-yellow-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-orange-600 rounded-xl shadow-xl p-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-3">
                <Trophy className="w-10 h-10" />
                Gamification Hub
              </h1>
              <p className="text-white/90">Track your progress, unlock achievements, and compete with others!</p>
            </div>
            <div className="text-center bg-white/20 backdrop-blur-sm rounded-xl p-6">
              <div className="text-4xl font-bold">{userStats.level}</div>
              <div className="text-sm opacity-90">Level</div>
            </div>
          </div>

          {/* Level Progress Bar */}
          <div className="mt-6">
            <div className="flex justify-between text-sm mb-2">
              <span>Level {userStats.level}</span>
              <span>{userStats.totalPoints} / {userStats.nextLevelPoints} XP</span>
            </div>
            <div className="bg-white/20 rounded-full h-4 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-yellow-300 to-orange-300 h-full rounded-full transition-all duration-500"
                style={{ width: `${levelProgress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{userStats.totalPoints}</div>
                <div className="text-sm text-gray-600">Total XP</div>
              </div>
              <Star className="w-8 h-8 text-yellow-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">#{userStats.rank}</div>
                <div className="text-sm text-gray-600">Global Rank</div>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{userStats.achievementsUnlocked}/{userStats.totalAchievements}</div>
                <div className="text-sm text-gray-600">Achievements</div>
              </div>
              <Trophy className="w-8 h-8 text-purple-500" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-gray-900">{userStats.currentStreak} Days</div>
                <div className="text-sm text-gray-600">Current Streak</div>
              </div>
              <Flame className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg p-2 flex gap-2">
          {[
            { id: 'overview', label: 'Overview', icon: Star },
            { id: 'achievements', label: 'Achievements', icon: Trophy },
            { id: 'badges', label: 'Badges', icon: Award },
            { id: 'leaderboard', label: 'Leaderboard', icon: TrendingUp }
          ].map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            )
          })}
        </div>

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Achievements */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Recent Achievements</h3>
              <div className="space-y-3">
                {achievements.filter(a => a.unlocked).slice(0, 5).map(achievement => (
                  <div key={achievement.id} className="flex items-center gap-4 p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                    <div className={`bg-gradient-to-br ${getRarityColor(achievement.rarity)} text-white p-3 rounded-lg`}>
                      {getAchievementIcon(achievement.icon)}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-gray-900">{achievement.title}</div>
                      <div className="text-xs text-gray-600">{achievement.description}</div>
                      <div className="text-xs text-green-600 mt-1">+{achievement.points} XP</div>
                    </div>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                ))}
              </div>
            </div>

            {/* In Progress */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">In Progress</h3>
              <div className="space-y-4">
                {achievements.filter(a => !a.unlocked).slice(0, 4).map(achievement => (
                  <div key={achievement.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`bg-gradient-to-br ${getRarityColor(achievement.rarity)} opacity-50 text-white p-2 rounded-lg`}>
                        {getAchievementIcon(achievement.icon)}
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-gray-900">{achievement.title}</div>
                        <div className="text-xs text-gray-600">{achievement.description}</div>
                      </div>
                      <Lock className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-xs text-gray-600">
                        <span>Progress</span>
                        <span>{achievement.progress}/{achievement.maxProgress}</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div 
                          className={`bg-gradient-to-r ${getRarityColor(achievement.rarity)} h-full rounded-full transition-all`}
                          style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'achievements' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {achievements.map(achievement => (
              <div 
                key={achievement.id}
                className={`bg-white rounded-xl shadow-lg p-6 border-2 ${
                  achievement.unlocked ? 'border-green-300' : 'border-gray-200'
                } ${!achievement.unlocked && 'opacity-75'}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className={`bg-gradient-to-br ${getRarityColor(achievement.rarity)} ${!achievement.unlocked && 'opacity-50'} text-white p-4 rounded-xl`}>
                    {getAchievementIcon(achievement.icon)}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-bold ${getCategoryColor(achievement.category)}`}>
                      {achievement.category}
                    </span>
                    {achievement.unlocked && (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                  </div>
                </div>

                <h3 className="text-lg font-bold text-gray-900 mb-1">{achievement.title}</h3>
                <p className="text-sm text-gray-600 mb-4">{achievement.description}</p>

                {!achievement.unlocked ? (
                  <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>Progress</span>
                      <span>{achievement.progress}/{achievement.maxProgress}</span>
                    </div>
                    <div className="bg-gray-200 rounded-full h-2 overflow-hidden">
                      <div 
                        className={`bg-gradient-to-r ${getRarityColor(achievement.rarity)} h-full rounded-full transition-all`}
                        style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">
                    Unlocked on {new Date(achievement.unlockedDate!).toLocaleDateString()}
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Reward</span>
                    <span className="text-lg font-bold text-purple-600">+{achievement.points} XP</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'badges' && (
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {badges.map(badge => (
              <div key={badge.id} className="bg-white rounded-xl shadow-lg p-6 text-center">
                <div className="bg-gradient-to-br from-yellow-400 to-orange-500 w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center">
                  <Award className="w-10 h-10 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 mb-1">{badge.name}</h3>
                <p className="text-xs text-gray-600 mb-3">{badge.description}</p>
                <div className="inline-block bg-purple-100 text-purple-700 text-xs px-3 py-1 rounded-full font-medium">
                  Level {badge.level}
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  Earned: {new Date(badge.earnedDate).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'leaderboard' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 bg-gradient-to-r from-purple-600 to-pink-600 text-white">
              <h3 className="text-xl font-bold">Global Leaderboard</h3>
              <p className="text-sm opacity-90">Top performers this month</p>
            </div>
            
            <div className="divide-y divide-gray-200">
              {leaderboard.map((entry) => (
                <div 
                  key={entry.userId}
                  className={`p-6 flex items-center gap-6 hover:bg-gray-50 transition-colors ${
                    entry.userId === user?._id ? 'bg-purple-50 border-l-4 border-purple-600' : ''
                  }`}
                >
                  {/* Rank */}
                  <div className="text-center min-w-[60px]">
                    <div className={`text-2xl font-bold ${
                      entry.rank === 1 ? 'text-yellow-500' :
                      entry.rank === 2 ? 'text-gray-400' :
                      entry.rank === 3 ? 'text-orange-600' :
                      'text-gray-700'
                    }`}>
                      {entry.rank <= 3 ? (
                        entry.rank === 1 ? <Crown className="w-8 h-8 mx-auto" /> :
                        entry.rank === 2 ? <Medal className="w-8 h-8 mx-auto" /> :
                        <Trophy className="w-8 h-8 mx-auto" />
                      ) : (
                        `#${entry.rank}`
                      )}
                    </div>
                    {entry.trend !== 'same' && (
                      <div className={`text-xs mt-1 ${entry.trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                        {entry.trend === 'up' ? '↑' : '↓'} {Math.abs(entry.rankChange)}
                      </div>
                    )}
                  </div>

                  {/* Avatar */}
                  <div className="bg-gradient-to-br from-purple-400 to-pink-400 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold">
                    {entry.username[0].toUpperCase()}
                  </div>

                  {/* User Info */}
                  <div className="flex-1">
                    <div className="font-bold text-gray-900 flex items-center gap-2">
                      {entry.username}
                      {entry.userId === user?._id && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full">You</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600">
                      Level {entry.level} • {entry.achievements} achievements
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-right">
                    <div className="text-2xl font-bold text-purple-600">{entry.totalPoints.toLocaleString()}</div>
                    <div className="text-xs text-gray-600">XP</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
