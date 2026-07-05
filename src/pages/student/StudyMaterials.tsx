import { useState, useEffect } from 'react'
import { useAuthStore } from '../../store/authStore'
import { 
  BookOpen, Video, FileText, Download, Search, Filter, 
  Star, BookmarkPlus, BookmarkCheck, Play, FileCode,
  Brain, Clock, TrendingUp, Award, ChevronRight, X
} from 'lucide-react'

interface Material {
  _id: string
  title: string
  type: 'document' | 'video' | 'flashcard' | 'quiz' | 'code'
  subject: string
  category: string
  description: string
  url?: string
  duration?: string
  downloads: number
  rating: number
  bookmarked: boolean
  thumbnail?: string
  tags: string[]
  uploadedBy: string
  uploadDate: string
}

export default function StudyMaterialsPage() {
  const { user } = useAuthStore()
  const [materials, setMaterials] = useState<Material[]>([])
  const [filteredMaterials, setFilteredMaterials] = useState<Material[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedSubject, setSelectedSubject] = useState<string>('all')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [showFilters, setShowFilters] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null)

  useEffect(() => {
    loadMaterials()
  }, [])

  useEffect(() => {
    filterMaterials()
  }, [searchQuery, selectedType, selectedSubject, selectedCategory, materials])

  const loadMaterials = async () => {
    // Mock data - replace with API call
    const mockMaterials: Material[] = [
      {
        _id: '1',
        title: 'Data Structures - Complete Notes',
        type: 'document',
        subject: 'Data Structures',
        category: 'Notes',
        description: 'Comprehensive notes covering arrays, linked lists, stacks, queues, trees, and graphs',
        url: '/materials/ds-notes.pdf',
        downloads: 1234,
        rating: 4.8,
        bookmarked: false,
        tags: ['DSA', 'Algorithms', 'Trees', 'Graphs'],
        uploadedBy: 'Dr. Sharma',
        uploadDate: '2024-10-15'
      },
      {
        _id: '2',
        title: 'Binary Search Tree Implementation',
        type: 'video',
        subject: 'Data Structures',
        category: 'Tutorial',
        description: 'Step-by-step video tutorial on BST operations with examples',
        url: 'https://youtube.com/watch?v=example',
        duration: '45 mins',
        downloads: 856,
        rating: 4.9,
        bookmarked: true,
        thumbnail: 'https://via.placeholder.com/300x169',
        tags: ['BST', 'Trees', 'Video'],
        uploadedBy: 'Prof. Kumar',
        uploadDate: '2024-10-20'
      },
      {
        _id: '3',
        title: 'DBMS Query Practice',
        type: 'quiz',
        subject: 'DBMS',
        category: 'Practice',
        description: '50 SQL queries with solutions for exam preparation',
        downloads: 2156,
        rating: 4.7,
        bookmarked: true,
        tags: ['SQL', 'Queries', 'Practice'],
        uploadedBy: 'Dr. Patel',
        uploadDate: '2024-10-18'
      },
      {
        _id: '4',
        title: 'Sorting Algorithms Flashcards',
        type: 'flashcard',
        subject: 'Data Structures',
        category: 'Revision',
        description: 'Quick revision cards for all sorting algorithms with time complexity',
        downloads: 945,
        rating: 4.6,
        bookmarked: false,
        tags: ['Sorting', 'Algorithms', 'Flashcards'],
        uploadedBy: 'Prof. Singh',
        uploadDate: '2024-10-22'
      },
      {
        _id: '5',
        title: 'React Hooks Code Examples',
        type: 'code',
        subject: 'Web Technology',
        category: 'Code',
        description: 'Practical examples of useState, useEffect, useContext, and custom hooks',
        url: '/materials/react-hooks.zip',
        downloads: 1567,
        rating: 4.9,
        bookmarked: false,
        tags: ['React', 'Hooks', 'JavaScript'],
        uploadedBy: 'Dr. Verma',
        uploadDate: '2024-10-25'
      },
      {
        _id: '6',
        title: 'Java OOP Concepts',
        type: 'document',
        subject: 'Java Programming',
        category: 'Notes',
        description: 'Object-oriented programming concepts with Java code examples',
        url: '/materials/java-oop.pdf',
        downloads: 1890,
        rating: 4.8,
        bookmarked: true,
        tags: ['Java', 'OOP', 'Programming'],
        uploadedBy: 'Prof. Gupta',
        uploadDate: '2024-10-12'
      },
      {
        _id: '7',
        title: 'Python for Data Science',
        type: 'video',
        subject: 'Python',
        category: 'Tutorial',
        description: 'Complete playlist for data science with NumPy, Pandas, and Matplotlib',
        url: 'https://youtube.com/playlist/example',
        duration: '3 hours',
        downloads: 3421,
        rating: 5.0,
        bookmarked: false,
        thumbnail: 'https://via.placeholder.com/300x169',
        tags: ['Python', 'Data Science', 'NumPy', 'Pandas'],
        uploadedBy: 'Dr. Reddy',
        uploadDate: '2024-10-28'
      },
      {
        _id: '8',
        title: 'Operating Systems MCQs',
        type: 'quiz',
        subject: 'Operating Systems',
        category: 'Practice',
        description: '100 multiple choice questions covering all OS topics',
        downloads: 2789,
        rating: 4.7,
        bookmarked: true,
        tags: ['OS', 'MCQ', 'Exam Prep'],
        uploadedBy: 'Prof. Joshi',
        uploadDate: '2024-10-30'
      }
    ]

    setMaterials(mockMaterials)
    setFilteredMaterials(mockMaterials)
    setLoading(false)
  }

  const filterMaterials = () => {
    let filtered = [...materials]

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(m => 
        m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
      )
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(m => m.type === selectedType)
    }

    // Subject filter
    if (selectedSubject !== 'all') {
      filtered = filtered.filter(m => m.subject === selectedSubject)
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(m => m.category === selectedCategory)
    }

    setFilteredMaterials(filtered)
  }

  const toggleBookmark = (materialId: string) => {
    setMaterials(materials.map(m => 
      m._id === materialId ? { ...m, bookmarked: !m.bookmarked } : m
    ))
  }

  const handleDownload = (material: Material) => {
    // Implement download logic
    console.log('Downloading:', material.title)
    setMaterials(materials.map(m => 
      m._id === material._id ? { ...m, downloads: m.downloads + 1 } : m
    ))
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="w-5 h-5" />
      case 'video': return <Video className="w-5 h-5" />
      case 'flashcard': return <Brain className="w-5 h-5" />
      case 'quiz': return <Award className="w-5 h-5" />
      case 'code': return <FileCode className="w-5 h-5" />
      default: return <BookOpen className="w-5 h-5" />
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'document': return 'bg-blue-100 text-blue-600'
      case 'video': return 'bg-red-100 text-red-600'
      case 'flashcard': return 'bg-purple-100 text-purple-600'
      case 'quiz': return 'bg-green-100 text-green-600'
      case 'code': return 'bg-orange-100 text-orange-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  const subjects = ['all', ...Array.from(new Set(materials.map(m => m.subject)))]
  const categories = ['all', ...Array.from(new Set(materials.map(m => m.category)))]

  const stats = {
    totalMaterials: materials.length,
    bookmarked: materials.filter(m => m.bookmarked).length,
    documents: materials.filter(m => m.type === 'document').length,
    videos: materials.filter(m => m.type === 'video').length,
    quizzes: materials.filter(m => m.type === 'quiz').length
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-500 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Study Materials</h1>
                <p className="text-sm text-gray-600">Your learning resources</p>
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              <Filter className="w-4 h-4" />
              <span>Filters</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Total Materials</p>
            <p className="text-2xl font-bold text-gray-900">{stats.totalMaterials}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Bookmarked</p>
            <p className="text-2xl font-bold text-yellow-600">{stats.bookmarked}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Documents</p>
            <p className="text-2xl font-bold text-blue-600">{stats.documents}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Videos</p>
            <p className="text-2xl font-bold text-red-600">{stats.videos}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-600 mb-1">Quizzes</p>
            <p className="text-2xl font-bold text-green-600">{stats.quizzes}</p>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-6">
          <div className="relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search materials by title, description, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">Filter Materials</h3>
              <button
                onClick={() => setShowFilters(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Types</option>
                  <option value="document">Documents</option>
                  <option value="video">Videos</option>
                  <option value="flashcard">Flashcards</option>
                  <option value="quiz">Quizzes</option>
                  <option value="code">Code Examples</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Subject</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {subjects.map(subject => (
                    <option key={subject} value={subject}>
                      {subject === 'all' ? 'All Subjects' : subject}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category === 'all' ? 'All Categories' : category}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setSelectedType('all')
                  setSelectedSubject('all')
                  setSelectedCategory('all')
                  setSearchQuery('')
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800"
              >
                Clear Filters
              </button>
            </div>
          </div>
        )}

        {/* Materials Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-blue-600 border-t-transparent"></div>
            <p className="mt-4 text-gray-600">Loading materials...</p>
          </div>
        ) : filteredMaterials.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-12 text-center">
            <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No materials found</h3>
            <p className="text-gray-600">Try adjusting your search or filters</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredMaterials.map((material) => (
              <div
                key={material._id}
                className="bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
              >
                {/* Thumbnail for videos */}
                {material.type === 'video' && material.thumbnail && (
                  <div className="relative h-40 bg-gray-200">
                    <img
                      src={material.thumbnail}
                      alt={material.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-30 flex items-center justify-center">
                      <Play className="w-12 h-12 text-white" />
                    </div>
                    {material.duration && (
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
                        {material.duration}
                      </div>
                    )}
                  </div>
                )}

                <div className="p-5">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={`p-2 rounded-lg ${getTypeColor(material.type)}`}>
                      {getTypeIcon(material.type)}
                    </div>
                    <button
                      onClick={() => toggleBookmark(material._id)}
                      className="text-gray-400 hover:text-yellow-500 transition"
                    >
                      {material.bookmarked ? (
                        <BookmarkCheck className="w-5 h-5 text-yellow-500 fill-current" />
                      ) : (
                        <BookmarkPlus className="w-5 h-5" />
                      )}
                    </button>
                  </div>

                  {/* Title & Description */}
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{material.title}</h3>
                  <p className="text-sm text-gray-600 mb-3 line-clamp-2">{material.description}</p>

                  {/* Meta Info */}
                  <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                    <span className="flex items-center">
                      <Download className="w-3 h-3 mr-1" />
                      {material.downloads}
                    </span>
                    <span className="flex items-center">
                      <Star className="w-3 h-3 mr-1 fill-current text-yellow-500" />
                      {material.rating}
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(material.uploadDate).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Tags */}
                  <div className="flex flex-wrap gap-1 mb-4">
                    {material.tags.slice(0, 3).map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedMaterial(material)}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition text-sm font-medium"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDownload(material)}
                      className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                    >
                      <Download className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Material Detail Modal */}
      {selectedMaterial && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-lg ${getTypeColor(selectedMaterial.type)}`}>
                  {getTypeIcon(selectedMaterial.type)}
                </div>
                <button
                  onClick={() => setSelectedMaterial(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">{selectedMaterial.title}</h2>
              <p className="text-gray-600 mb-4">{selectedMaterial.description}</p>

              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Subject</p>
                  <p className="font-semibold">{selectedMaterial.subject}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Category</p>
                  <p className="font-semibold">{selectedMaterial.category}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Uploaded By</p>
                  <p className="font-semibold">{selectedMaterial.uploadedBy}</p>
                </div>
                <div className="bg-gray-50 rounded-lg p-3">
                  <p className="text-sm text-gray-600">Upload Date</p>
                  <p className="font-semibold">
                    {new Date(selectedMaterial.uploadDate).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-6">
                <div className="flex items-center">
                  <Star className="w-5 h-5 text-yellow-500 fill-current mr-1" />
                  <span className="font-semibold">{selectedMaterial.rating}</span>
                  <span className="text-gray-500 text-sm ml-1">rating</span>
                </div>
                <div className="flex items-center">
                  <Download className="w-5 h-5 text-gray-500 mr-1" />
                  <span className="font-semibold">{selectedMaterial.downloads}</span>
                  <span className="text-gray-500 text-sm ml-1">downloads</span>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-sm text-gray-600 mb-2">Tags</p>
                <div className="flex flex-wrap gap-2">
                  {selectedMaterial.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1 bg-blue-100 text-blue-600 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDownload(selectedMaterial)}
                  className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium flex items-center justify-center"
                >
                  <Download className="w-5 h-5 mr-2" />
                  Download
                </button>
                <button
                  onClick={() => toggleBookmark(selectedMaterial._id)}
                  className="px-6 py-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
                >
                  {selectedMaterial.bookmarked ? (
                    <BookmarkCheck className="w-5 h-5 text-yellow-500 fill-current" />
                  ) : (
                    <BookmarkPlus className="w-5 h-5 text-gray-600" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
