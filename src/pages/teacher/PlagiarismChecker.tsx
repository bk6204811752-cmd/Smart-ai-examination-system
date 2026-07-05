import { useState } from 'react'
import { 
  Search, Upload, FileText, Code, AlertTriangle,
  Download, Filter, TrendingUp, Users, Eye, Copy, ExternalLink
} from 'lucide-react'

interface PlagiarismResult {
  id: string
  studentName: string
  studentId: string
  submissionDate: Date
  contentType: 'text' | 'code'
  similarityScore: number
  matches: Match[]
  status: 'clean' | 'suspicious' | 'flagged'
  originalText: string
}

interface Match {
  source: string
  sourceType: 'student' | 'internet' | 'database'
  similarity: number
  matchedText: string
  url?: string
  studentName?: string
}

export default function PlagiarismCheckerPage() {
  const [activeTab, setActiveTab] = useState<'check' | 'results' | 'batch'>('check')
  const [checkType, setCheckType] = useState<'text' | 'code'>('text')
  const [inputText, setInputText] = useState('')
  const [selectedLanguage, setSelectedLanguage] = useState('python')
  const [checking, setChecking] = useState(false)
  const [results, setResults] = useState<PlagiarismResult[]>([])
  const [selectedResult, setSelectedResult] = useState<PlagiarismResult | null>(null)

  // Mock plagiarism results
  const mockResults: PlagiarismResult[] = [
    {
      id: '1',
      studentName: 'Rahul Sharma',
      studentId: 'PCMT2021001',
      submissionDate: new Date('2024-10-28'),
      contentType: 'text',
      similarityScore: 78,
      status: 'flagged',
      originalText: 'Binary search is an efficient algorithm for finding an item from a sorted list...',
      matches: [
        {
          source: 'Wikipedia - Binary Search',
          sourceType: 'internet',
          similarity: 92,
          matchedText: 'Binary search is an efficient algorithm for finding an item from a sorted list of items',
          url: 'https://wikipedia.org/binary_search'
        },
        {
          source: 'Priya Patel',
          sourceType: 'student',
          similarity: 65,
          matchedText: 'Binary search algorithm works on sorted arrays...',
          studentName: 'Priya Patel'
        }
      ]
    },
    {
      id: '2',
      studentName: 'Anita Kumar',
      studentId: 'PCMT2021045',
      submissionDate: new Date('2024-10-29'),
      contentType: 'code',
      similarityScore: 23,
      status: 'clean',
      originalText: 'def binary_search(arr, target):\n    left, right = 0, len(arr) - 1...',
      matches: [
        {
          source: 'GitHub Repository',
          sourceType: 'internet',
          similarity: 23,
          matchedText: 'Standard implementation pattern',
          url: 'https://github.com/example'
        }
      ]
    },
    {
      id: '3',
      studentName: 'Vikram Singh',
      studentId: 'PCMT2021089',
      submissionDate: new Date('2024-10-30'),
      contentType: 'text',
      similarityScore: 45,
      status: 'suspicious',
      originalText: 'Database normalization is the process of organizing data...',
      matches: [
        {
          source: 'GeeksforGeeks Article',
          sourceType: 'internet',
          similarity: 58,
          matchedText: 'Database normalization is the process of organizing data to reduce redundancy',
          url: 'https://geeksforgeeks.org/normalization'
        }
      ]
    }
  ]

  const handleCheck = async () => {
    if (!inputText.trim()) return

    setChecking(true)
    
    // Simulate plagiarism check
    await new Promise(resolve => setTimeout(resolve, 3000))

    const similarity = Math.floor(Math.random() * 100)
    const newResult: PlagiarismResult = {
      id: Date.now().toString(),
      studentName: 'Current Check',
      studentId: 'N/A',
      submissionDate: new Date(),
      contentType: checkType,
      similarityScore: similarity,
      status: similarity > 70 ? 'flagged' : similarity > 40 ? 'suspicious' : 'clean',
      originalText: inputText,
      matches: [
        {
          source: 'Internet Source',
          sourceType: 'internet',
          similarity: similarity,
          matchedText: inputText.substring(0, 100),
          url: 'https://example.com'
        }
      ]
    }

    setResults([newResult, ...results])
    setSelectedResult(newResult)
    setChecking(false)
    setActiveTab('results')
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        setInputText(event.target?.result as string)
      }
      reader.readAsText(file)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'clean': return 'text-green-600 bg-green-100'
      case 'suspicious': return 'text-yellow-600 bg-yellow-100'
      case 'flagged': return 'text-red-600 bg-red-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  const getSimilarityColor = (score: number) => {
    if (score > 70) return 'text-red-600'
    if (score > 40) return 'text-yellow-600'
    return 'text-green-600'
  }

  const stats = {
    totalChecked: mockResults.length + results.length,
    flagged: [...mockResults, ...results].filter(r => r.status === 'flagged').length,
    avgSimilarity: Math.round(
      [...mockResults, ...results].reduce((sum, r) => sum + r.similarityScore, 0) / 
      ([...mockResults, ...results].length || 1)
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-red-600 to-orange-500 rounded-xl flex items-center justify-center">
                <Search className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Plagiarism Checker</h1>
                <p className="text-sm text-gray-600">Detect similarities in text and code submissions</p>
              </div>
            </div>
            <button
              onClick={() => {/* Export report */}}
              className="flex items-center space-x-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition"
            >
              <Download className="w-4 h-4" />
              <span>Export Report</span>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 mt-4 border-b">
            {[
              { id: 'check', label: 'New Check', icon: Search },
              { id: 'results', label: 'Results', icon: FileText },
              { id: 'batch', label: 'Batch Process', icon: Users }
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 px-4 py-2 border-b-2 transition ${
                    activeTab === tab.id
                      ? 'border-red-600 text-red-600'
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="font-medium">{tab.label}</span>
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistics */}
        <div className="grid md:grid-cols-3 gap-6 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Checked</p>
                <p className="text-3xl font-bold text-gray-900">{stats.totalChecked}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Flagged</p>
                <p className="text-3xl font-bold text-red-600">{stats.flagged}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Avg Similarity</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.avgSimilarity}%</p>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>
        </div>

        {/* New Check Tab */}
        {activeTab === 'check' && (
          <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Content to Check</h3>

                {/* Type Selection */}
                <div className="flex space-x-4 mb-4">
                  <button
                    onClick={() => setCheckType('text')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                      checkType === 'text'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Text/Essay</span>
                  </button>
                  <button
                    onClick={() => setCheckType('code')}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition ${
                      checkType === 'code'
                        ? 'bg-red-600 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Code className="w-4 h-4" />
                    <span>Code</span>
                  </button>
                </div>

                {/* Language Selection for Code */}
                {checkType === 'code' && (
                  <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Programming Language
                    </label>
                    <select
                      value={selectedLanguage}
                      onChange={(e) => setSelectedLanguage(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500"
                    >
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="javascript">JavaScript</option>
                      <option value="cpp">C++</option>
                      <option value="c">C</option>
                    </select>
                  </div>
                )}

                {/* File Upload */}
                <div className="mb-4">
                  <label className="block">
                    <input
                      type="file"
                      accept={checkType === 'code' ? '.py,.java,.js,.cpp,.c' : '.txt,.doc,.docx'}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-red-400 transition">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">
                        Click to upload file or paste content below
                      </p>
                    </div>
                  </label>
                </div>

                {/* Text Input */}
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={checkType === 'code' 
                    ? 'Paste your code here...' 
                    : 'Paste your text here...'}
                  className="w-full h-64 px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-red-500 font-mono text-sm"
                />

                <button
                  onClick={handleCheck}
                  disabled={!inputText.trim() || checking}
                  className="w-full mt-4 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {checking ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Checking for plagiarism...</span>
                    </>
                  ) : (
                    <>
                      <Search className="w-5 h-5" />
                      <span>Check Plagiarism</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Info Panel */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold mb-3">How It Works</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">1.</span>
                    <span>Paste or upload content to check</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">2.</span>
                    <span>System compares with database and internet</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">3.</span>
                    <span>Similarity score calculated</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-red-600 mr-2">4.</span>
                    <span>Detailed report with sources generated</span>
                  </li>
                </ul>
              </div>

              <div className="bg-white rounded-xl shadow-sm p-6">
                <h3 className="font-semibold mb-3">Similarity Thresholds</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">0-40%</span>
                    <span className="px-3 py-1 bg-green-100 text-green-600 rounded-full text-xs font-semibold">
                      Clean
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">41-70%</span>
                    <span className="px-3 py-1 bg-yellow-100 text-yellow-600 rounded-full text-xs font-semibold">
                      Suspicious
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">71-100%</span>
                    <span className="px-3 py-1 bg-red-100 text-red-600 rounded-full text-xs font-semibold">
                      Flagged
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && (
          <div className="grid md:grid-cols-3 gap-6">
            {/* Results List */}
            <div className="md:col-span-1 space-y-4">
              <div className="bg-white rounded-xl shadow-sm p-4">
                <div className="flex items-center space-x-2 mb-4">
                  <Filter className="w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search results..."
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              {[...results, ...mockResults].map((result) => (
                <div
                  key={result.id}
                  onClick={() => setSelectedResult(result)}
                  className={`bg-white rounded-xl shadow-sm p-4 cursor-pointer transition ${
                    selectedResult?.id === result.id ? 'ring-2 ring-red-600' : 'hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-semibold text-gray-900">{result.studentName}</h4>
                      <p className="text-xs text-gray-500">{result.studentId}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getStatusColor(result.status)}`}>
                      {result.status.toUpperCase()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">
                      {result.submissionDate.toLocaleDateString()}
                    </span>
                    <span className={`font-bold ${getSimilarityColor(result.similarityScore)}`}>
                      {result.similarityScore}% match
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* Result Detail */}
            <div className="md:col-span-2">
              {selectedResult ? (
                <div className="bg-white rounded-xl shadow-sm p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">{selectedResult.studentName}</h3>
                      <p className="text-sm text-gray-600">{selectedResult.studentId}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-4xl font-bold ${getSimilarityColor(selectedResult.similarityScore)}`}>
                        {selectedResult.similarityScore}%
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(selectedResult.status)}`}>
                        {selectedResult.status.toUpperCase()}
                      </span>
                    </div>
                  </div>

                  {/* Original Content */}
                  <div className="mb-6">
                    <h4 className="font-semibold mb-2 flex items-center">
                      <FileText className="w-4 h-4 mr-2" />
                      Original Content
                    </h4>
                    <div className="bg-gray-50 rounded-lg p-4 font-mono text-sm">
                      {selectedResult.originalText}
                    </div>
                  </div>

                  {/* Matches */}
                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <Copy className="w-4 h-4 mr-2" />
                      Similarity Matches ({selectedResult.matches.length})
                    </h4>
                    <div className="space-y-4">
                      {selectedResult.matches.map((match, idx) => (
                        <div key={idx} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h5 className="font-semibold text-gray-900">{match.source}</h5>
                              <p className="text-xs text-gray-500">
                                {match.sourceType === 'student' ? `Student: ${match.studentName}` : match.sourceType}
                              </p>
                            </div>
                            <span className={`text-lg font-bold ${getSimilarityColor(match.similarity)}`}>
                              {match.similarity}%
                            </span>
                          </div>
                          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded text-sm mb-2">
                            {match.matchedText}
                          </div>
                          {match.url && (
                            <a
                              href={match.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm text-blue-600 hover:underline flex items-center"
                            >
                              View Source <ExternalLink className="w-3 h-3 ml-1" />
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 mt-6 pt-6 border-t">
                    <button className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition">
                      <Download className="w-4 h-4 inline mr-2" />
                      Download Report
                    </button>
                    <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition">
                      Flag Submission
                    </button>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-12 text-center">
                  <Eye className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No Result Selected</h3>
                  <p className="text-gray-600">Select a result from the list to view details</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Batch Process Tab */}
        {activeTab === 'batch' && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h3 className="text-lg font-semibold mb-4">Batch Plagiarism Check</h3>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
              <Upload className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h4 className="text-xl font-semibold text-gray-900 mb-2">Upload Multiple Submissions</h4>
              <p className="text-gray-600 mb-4">
                Upload a ZIP file containing multiple student submissions for batch processing
              </p>
              <label className="inline-block">
                <input type="file" accept=".zip" className="hidden" />
                <span className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition cursor-pointer inline-block">
                  Choose ZIP File
                </span>
              </label>
            </div>

            <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h5 className="font-semibold text-blue-900 mb-2">Batch Processing Instructions</h5>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Each file should be named with student ID (e.g., PCMT2021001.txt)</li>
                <li>• Maximum 100 files per batch</li>
                <li>• Processing may take 5-10 minutes depending on file count</li>
                <li>• Results will be emailed upon completion</li>
              </ul>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
