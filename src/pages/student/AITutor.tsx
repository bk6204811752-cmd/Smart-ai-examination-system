import { useState, useEffect, useRef } from 'react'
import { useAuthStore } from '../../store/globalStore'
import {
  Send,
  Bot,
  User,
  Sparkles,
  BookOpen,
  Code,
  Calculator,
  Brain,
  MessageSquare,
  Trash2,
  Lightbulb,
} from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  type?: 'text' | 'code' | 'math' | 'concept'
}

interface ConversationHistory {
  id: string
  title: string
  messages: Message[]
  subject: string
  lastUpdated: Date
}

export default function AITutorPage() {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [selectedSubject, setSelectedSubject] = useState<string>('general')
  const [conversations, setConversations] = useState<ConversationHistory[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [showHistory, setShowHistory] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const subjects = [
    { value: 'general', label: 'General', icon: MessageSquare },
    { value: 'programming', label: 'Programming', icon: Code },
    { value: 'mathematics', label: 'Mathematics', icon: Calculator },
    { value: 'concepts', label: 'Concepts', icon: Brain },
    { value: 'dbms', label: 'DBMS', icon: BookOpen },
  ]

  useEffect(() => {
    loadConversationHistory()
    // Welcome message
    if (messages.length === 0) {
      addMessage({
        id: Date.now().toString(),
        role: 'assistant',
        content: `Hello ${user?.full_name?.split(' ')[0] || 'there'}! 👋 I'm your AI tutor. I can help you with:\n\n• Programming concepts and code examples\n• Mathematical problems and explanations\n• Database queries and design\n• General academic questions\n• Exam preparation tips\n\nWhat would you like to learn about today?`,
        timestamp: new Date(),
        type: 'text',
      })
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const loadConversationHistory = () => {
    // Mock conversation history
    const mockHistory: ConversationHistory[] = [
      {
        id: '1',
        title: 'Binary Search Trees',
        subject: 'programming',
        messages: [],
        lastUpdated: new Date('2024-10-30'),
      },
      {
        id: '2',
        title: 'SQL Joins Explained',
        subject: 'dbms',
        messages: [],
        lastUpdated: new Date('2024-10-29'),
      },
    ]
    setConversations(mockHistory)
  }

  const addMessage = (message: Message) => {
    setMessages(prev => [...prev, message])
  }

  const handleSend = async () => {
    if (!input.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
      type: 'text',
    }

    addMessage(userMessage)
    setInput('')
    setIsTyping(true)

    // Simulate AI response
    setTimeout(() => {
      const aiResponse = generateAIResponse(input)
      addMessage(aiResponse)
      setIsTyping(false)
    }, 1500)
  }

  const generateAIResponse = (query: string): Message => {
    // Mock AI responses based on query
    const lowerQuery = query.toLowerCase()

    let response = ''
    let type: 'text' | 'code' | 'math' | 'concept' = 'text'

    if (lowerQuery.includes('binary search') || lowerQuery.includes('bst')) {
      type = 'code'
      response = `Great question about Binary Search Trees! Let me explain:\n\n**Binary Search Tree (BST)** is a node-based binary tree with these properties:\n• Left subtree contains nodes with keys less than parent\n• Right subtree contains nodes with keys greater than parent\n• Both subtrees are also BSTs\n\n**Code Example (Python):**\n\`\`\`python
class TreeNode:
    def __init__(self, val):
        self.val = val
        self.left = None
        self.right = None

class BST:
    def insert(self, root, val):
        if not root:
            return TreeNode(val)
        if val < root.val:
            root.left = self.insert(root.left, val)
        else:
            root.right = self.insert(root.right, val)
        return root
\`\`\`\n\n**Time Complexity:**\n• Average: O(log n)\n• Worst: O(n)\n\nWould you like to know about BST traversals or balancing?`
    } else if (lowerQuery.includes('sql') || lowerQuery.includes('join')) {
      type = 'code'
      response = `Let me explain SQL JOINs! 🔗\n\n**Types of JOINs:**\n\n1. **INNER JOIN**: Returns matching rows from both tables\n\`\`\`sql
SELECT orders.id, customers.name
FROM orders
INNER JOIN customers ON orders.customer_id = customers.id;
\`\`\`\n\n2. **LEFT JOIN**: All rows from left table + matching from right\n\`\`\`sql
SELECT * FROM students
LEFT JOIN enrollments ON students.id = enrollments.student_id;
\`\`\`\n\n3. **RIGHT JOIN**: All rows from right table + matching from left\n\n4. **FULL OUTER JOIN**: All rows from both tables\n\n**Pro Tip**: Use INNER JOIN when you only want matching records!\n\nNeed help with a specific query?`
    } else if (lowerQuery.includes('time complexity') || lowerQuery.includes('big o')) {
      type = 'concept'
      response = `Time Complexity (Big O Notation) 📊\n\nCommon complexities from fastest to slowest:\n\n• **O(1)** - Constant: Array access, hash lookup\n• **O(log n)** - Logarithmic: Binary search, balanced BST\n• **O(n)** - Linear: Array traversal, linear search\n• **O(n log n)** - Linearithmic: Merge sort, quick sort\n• **O(n²)** - Quadratic: Nested loops, bubble sort\n• **O(2ⁿ)** - Exponential: Recursive Fibonacci\n• **O(n!)** - Factorial: Permutations\n\n**Example:**\n\`\`\`python
# O(1) - Constant time
def get_first(arr):
    return arr[0]\n
# O(n) - Linear time
def find_max(arr):
    max_val = arr[0]
    for num in arr:
        if num > max_val:
            max_val = num
    return max_val
\`\`\`\n\nWant to analyze a specific algorithm?`
    } else if (lowerQuery.includes('sort') && lowerQuery.includes('algorithm')) {
      type = 'code'
      response = `Sorting Algorithms Comparison! 🔄\n\n**Quick Sort** (Most Popular)\n\`\`\`python
def quicksort(arr):
    if len(arr) <= 1:
        return arr
    pivot = arr[len(arr) // 2]
    left = [x for x in arr if x < pivot]
    middle = [x for x in arr if x == pivot]
    right = [x for x in arr if x > pivot]
    return quicksort(left) + middle + quicksort(right)
\`\`\`\n• Time: O(n log n) average, O(n²) worst\n• Space: O(log n)\n• In-place: No\n\n**Merge Sort** (Stable)\n• Time: O(n log n) always\n• Space: O(n)\n• Stable: Yes\n\n**Bubble Sort** (Simple)\n• Time: O(n²)\n• Good for: Small datasets, nearly sorted data\n\nWhich one would you like to explore?`
    } else if (lowerQuery.includes('react') || lowerQuery.includes('hook')) {
      type = 'code'
      response = `React Hooks Essentials! ⚛️\n\n**useState** - State management\n\`\`\`jsx
const [count, setCount] = useState(0);
\`\`\`\n\n**useEffect** - Side effects\n\`\`\`jsx
useEffect(() => {
  // Runs after render
  document.title = \`Count: \${count}\`;
  
  // Cleanup
  return () => {
    // Cleanup code
  };
}, [count]); // Dependencies
\`\`\`\n\n**useContext** - Context API\n\`\`\`jsx
const theme = useContext(ThemeContext);
\`\`\`\n\n**Custom Hook Example:**\n\`\`\`jsx
function useLocalStorage(key, initial) {
  const [value, setValue] = useState(() => {
    return localStorage.getItem(key) || initial;
  });
  
  useEffect(() => {
    localStorage.setItem(key, value);
  }, [key, value]);
  
  return [value, setValue];
}
\`\`\`\n\nNeed help with a specific hook?`
    } else if (
      lowerQuery.includes('exam') ||
      lowerQuery.includes('preparation') ||
      lowerQuery.includes('tips')
    ) {
      response = `Exam Preparation Tips! 📚✨\n\n**Before the Exam:**\n✓ Review key concepts daily (30-45 mins)\n✓ Practice with previous year questions\n✓ Create mind maps for complex topics\n✓ Join study groups for discussions\n✓ Get 7-8 hours sleep before exam\n\n**During the Exam:**\n✓ Read all questions first\n✓ Answer easy questions first\n✓ Manage time: allocate per section\n✓ Double-check your answers\n✓ Stay calm and focused\n\n**Subject-Specific Tips:**\n• **Programming**: Practice code by hand\n• **DBMS**: Understand normalization & queries\n• **DSA**: Know time/space complexity\n• **Theory**: Use acronyms to remember\n\nWhich subject do you need help with?`
    } else {
      response = `I understand you're asking about "${query}". Let me help you with that!\n\nCould you provide more details? For example:\n• What specific aspect are you struggling with?\n• Do you need code examples or theoretical explanation?\n• Is this for an upcoming exam or general learning?\n\nFeel free to ask about:\n✓ Programming concepts (Python, Java, C++, JavaScript)\n✓ Data Structures & Algorithms\n✓ Database Management (SQL, normalization)\n✓ Web Development\n✓ Mathematics & Problem Solving\n\nI'm here to help! 😊`
    }

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: response,
      timestamp: new Date(),
      type,
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const clearChat = () => {
    setMessages([
      {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Chat cleared! How can I help you today?',
        timestamp: new Date(),
        type: 'text',
      },
    ])
  }

  const suggestedQuestions = [
    'Explain binary search trees with code',
    'What are SQL joins?',
    'Time complexity of sorting algorithms',
    'React hooks tutorial',
    'Exam preparation tips',
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar - Conversation History */}
      <div
        className={`${showHistory ? 'w-64' : 'w-0'} bg-white border-r transition-all duration-300 overflow-hidden`}
      >
        <div className="p-4 border-b">
          <h3 className="font-semibold text-gray-900">Conversations</h3>
        </div>
        <div className="p-2 space-y-2">
          {conversations.map(conv => (
            <button
              key={conv.id}
              onClick={() => setCurrentConversationId(conv.id)}
              className={`w-full text-left p-3 rounded-lg hover:bg-gray-50 transition ${
                currentConversationId === conv.id ? 'bg-blue-50 border border-blue-200' : ''
              }`}
            >
              <p className="font-medium text-sm text-gray-900 truncate">{conv.title}</p>
              <p className="text-xs text-gray-500">{conv.subject}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-blue-500 rounded-xl flex items-center justify-center">
                <Bot className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold flex items-center">
                  AI Tutor <Sparkles className="w-5 h-5 ml-2 text-yellow-500" />
                </h1>
                <p className="text-sm text-gray-600">Your personal learning assistant</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition text-sm"
              >
                History
              </button>
              <button
                onClick={clearChat}
                className="p-2 text-gray-600 hover:text-red-600 transition"
                title="Clear chat"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Subject Selector */}
          <div className="flex items-center space-x-2 mt-4 overflow-x-auto pb-2">
            {subjects.map(subject => {
              const Icon = subject.icon
              return (
                <button
                  key={subject.value}
                  onClick={() => setSelectedSubject(subject.value)}
                  className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition whitespace-nowrap ${
                    selectedSubject === subject.value
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-sm font-medium">{subject.label}</span>
                </button>
              )
            })}
          </div>
        </header>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map(message => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`flex space-x-3 max-w-3xl ${message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
              >
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    message.role === 'user'
                      ? 'bg-blue-600'
                      : 'bg-gradient-to-br from-purple-600 to-blue-500'
                  }`}
                >
                  {message.role === 'user' ? (
                    <User className="w-5 h-5 text-white" />
                  ) : (
                    <Bot className="w-5 h-5 text-white" />
                  )}
                </div>

                {/* Message Content */}
                <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                  <div
                    className={`inline-block px-4 py-3 rounded-2xl ${
                      message.role === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white border border-gray-200'
                    }`}
                  >
                    <div className="whitespace-pre-wrap break-words">
                      {message.content.split('```').map((part, idx) => {
                        if (idx % 2 === 1) {
                          // Code block
                          const [lang, ...codeLines] = part.split('\n')
                          const code = codeLines.join('\n')
                          return (
                            <div
                              key={idx}
                              className="my-2 bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto"
                            >
                              <div className="text-xs text-gray-400 mb-2">{lang}</div>
                              <pre className="text-sm">
                                <code>{code}</code>
                              </pre>
                            </div>
                          )
                        }
                        return <span key={idx}>{part}</span>
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 mt-1 px-2">
                    {message.timestamp.toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              </div>
            </div>
          ))}

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex space-x-3 max-w-3xl">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-600 to-blue-500 flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div className="bg-white border border-gray-200 px-4 py-3 rounded-2xl">
                  <div className="flex space-x-2">
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '0ms' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '150ms' }}
                    ></div>
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: '300ms' }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Questions */}
        {messages.length <= 1 && (
          <div className="px-6 py-4 bg-gradient-to-b from-transparent to-gray-50">
            <p className="text-sm text-gray-600 mb-3 flex items-center">
              <Lightbulb className="w-4 h-4 mr-2 text-yellow-500" />
              Suggested questions:
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestedQuestions.map((question, idx) => (
                <button
                  key={idx}
                  onClick={() => setInput(question)}
                  className="px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t bg-white p-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-end space-x-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask me anything... (Press Enter to send, Shift+Enter for new line)"
                  className="w-full px-4 py-3 pr-12 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                  rows={3}
                />
              </div>
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Send className="w-5 h-5" />
                <span className="font-medium">Send</span>
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              AI responses are generated for educational purposes. Always verify important
              information.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
