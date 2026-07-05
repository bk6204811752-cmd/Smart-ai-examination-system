// Comprehensive Question Bank for Practice Tests
export interface Question {
  id: number
  text: string
  type: 'mcq' | 'multiple-answer' | 'true-false' | 'short-answer'
  options?: string[]
  correctAnswer: string | string[]
  points: number
  explanation: string
  difficulty: 'Easy' | 'Medium' | 'Hard'
}

// MATHEMATICS QUESTIONS
export const mathematicsQuestions: Question[] = [
  // Algebra - Easy
  {
    id: 1,
    text: 'What is the value of x in the equation: 2x + 5 = 15?',
    type: 'mcq',
    options: ['5', '10', '7.5', '2.5'],
    correctAnswer: '5',
    points: 2,
    difficulty: 'Easy',
    explanation: '2x + 5 = 15 → 2x = 10 → x = 5'
  },
  {
    id: 2,
    text: 'Simplify: 3x + 2x - x',
    type: 'mcq',
    options: ['4x', '5x', '6x', '2x'],
    correctAnswer: '4x',
    points: 2,
    difficulty: 'Easy',
    explanation: 'Combine like terms: 3x + 2x - x = (3+2-1)x = 4x'
  },
  {
    id: 3,
    text: 'If x = 3, what is the value of 2x² + 1?',
    type: 'mcq',
    options: ['19', '18', '13', '7'],
    correctAnswer: '19',
    points: 2,
    difficulty: 'Easy',
    explanation: '2(3)² + 1 = 2(9) + 1 = 18 + 1 = 19'
  },
  
  // Algebra - Medium
  {
    id: 4,
    text: 'Simplify: (x + 3)(x - 3)',
    type: 'mcq',
    options: ['x² - 9', 'x² + 9', 'x² - 6x - 9', 'x² + 6x + 9'],
    correctAnswer: 'x² - 9',
    points: 3,
    difficulty: 'Medium',
    explanation: 'Using the difference of squares formula: (a+b)(a-b) = a² - b²'
  },
  {
    id: 5,
    text: 'If f(x) = 2x + 1, what is f(3)?',
    type: 'mcq',
    options: ['5', '6', '7', '8'],
    correctAnswer: '7',
    points: 3,
    difficulty: 'Medium',
    explanation: 'f(3) = 2(3) + 1 = 6 + 1 = 7'
  },
  {
    id: 6,
    text: 'The slope of a line passing through (2,3) and (4,7) is:',
    type: 'mcq',
    options: ['1', '2', '3', '4'],
    correctAnswer: '2',
    points: 3,
    difficulty: 'Medium',
    explanation: 'Slope = (y₂-y₁)/(x₂-x₁) = (7-3)/(4-2) = 4/2 = 2'
  },
  
  // Geometry - Easy
  {
    id: 7,
    text: 'The sum of angles in a triangle is:',
    type: 'mcq',
    options: ['90°', '180°', '270°', '360°'],
    correctAnswer: '180°',
    points: 2,
    difficulty: 'Easy',
    explanation: 'The sum of all interior angles in any triangle always equals 180 degrees.'
  },
  {
    id: 8,
    text: 'What is the area of a rectangle with length 5 cm and width 3 cm?',
    type: 'mcq',
    options: ['8 cm²', '15 cm²', '16 cm²', '25 cm²'],
    correctAnswer: '15 cm²',
    points: 2,
    difficulty: 'Easy',
    explanation: 'Area = length × width = 5 × 3 = 15 cm²'
  },
  
  // Trigonometry - Medium
  {
    id: 9,
    text: 'What is sin(90°)?',
    type: 'mcq',
    options: ['0', '0.5', '1', '√3/2'],
    correctAnswer: '1',
    points: 3,
    difficulty: 'Medium',
    explanation: 'sin(90°) = 1, this is a fundamental trigonometric value'
  },
  {
    id: 10,
    text: 'In a right triangle, if one angle is 30°, what is the other acute angle?',
    type: 'mcq',
    options: ['30°', '45°', '60°', '90°'],
    correctAnswer: '60°',
    points: 2,
    difficulty: 'Easy',
    explanation: '90° + 30° + x = 180° → x = 60°'
  },
  
  // Calculus - Hard
  {
    id: 11,
    text: 'What is the derivative of x³?',
    type: 'mcq',
    options: ['x²', '2x²', '3x²', '3x'],
    correctAnswer: '3x²',
    points: 4,
    difficulty: 'Hard',
    explanation: 'Using power rule: d/dx(xⁿ) = nxⁿ⁻¹, so d/dx(x³) = 3x²'
  },
  {
    id: 12,
    text: 'The integral of 2x dx is:',
    type: 'mcq',
    options: ['x² + C', '2x² + C', 'x²/2 + C', '2x + C'],
    correctAnswer: 'x² + C',
    points: 4,
    difficulty: 'Hard',
    explanation: '∫2x dx = 2(x²/2) + C = x² + C'
  }
]

// SCIENCE QUESTIONS
export const scienceQuestions: Question[] = [
  // Physics - Easy
  {
    id: 1,
    text: 'What is the SI unit of force?',
    type: 'mcq',
    options: ['Joule', 'Newton', 'Watt', 'Pascal'],
    correctAnswer: 'Newton',
    points: 2,
    difficulty: 'Easy',
    explanation: 'The SI unit of force is Newton (N), named after Isaac Newton.'
  },
  {
    id: 2,
    text: 'The speed of light in vacuum is approximately:',
    type: 'mcq',
    options: ['3 × 10⁶ m/s', '3 × 10⁸ m/s', '3 × 10¹⁰ m/s', '3 × 10¹² m/s'],
    correctAnswer: '3 × 10⁸ m/s',
    points: 2,
    difficulty: 'Easy',
    explanation: 'The speed of light in vacuum is approximately 299,792,458 m/s ≈ 3 × 10⁸ m/s'
  },
  {
    id: 3,
    text: 'An object at rest will remain at rest unless acted upon by an external force. This is:',
    type: 'mcq',
    options: ["Newton's First Law", "Newton's Second Law", "Newton's Third Law", "Law of Conservation of Energy"],
    correctAnswer: "Newton's First Law",
    points: 2,
    difficulty: 'Easy',
    explanation: "This describes Newton's First Law of Motion, also known as the Law of Inertia."
  },
  
  // Chemistry - Medium
  {
    id: 4,
    text: 'What is the chemical formula for water?',
    type: 'mcq',
    options: ['H₂O', 'CO₂', 'O₂', 'H₂O₂'],
    correctAnswer: 'H₂O',
    points: 2,
    difficulty: 'Easy',
    explanation: 'Water consists of 2 hydrogen atoms and 1 oxygen atom: H₂O'
  },
  {
    id: 5,
    text: 'The atomic number of an element represents:',
    type: 'mcq',
    options: ['Number of neutrons', 'Number of protons', 'Number of electrons', 'Atomic mass'],
    correctAnswer: 'Number of protons',
    points: 3,
    difficulty: 'Medium',
    explanation: 'The atomic number is the number of protons in the nucleus of an atom.'
  },
  {
    id: 6,
    text: 'Which of the following is a noble gas?',
    type: 'mcq',
    options: ['Oxygen', 'Nitrogen', 'Helium', 'Hydrogen'],
    correctAnswer: 'Helium',
    points: 2,
    difficulty: 'Easy',
    explanation: 'Helium is a noble gas in Group 18 of the periodic table.'
  },
  
  // Biology - Easy
  {
    id: 7,
    text: 'What is the powerhouse of the cell?',
    type: 'mcq',
    options: ['Nucleus', 'Ribosome', 'Mitochondria', 'Golgi apparatus'],
    correctAnswer: 'Mitochondria',
    points: 2,
    difficulty: 'Easy',
    explanation: 'Mitochondria produce ATP through cellular respiration, hence called the powerhouse.'
  },
  {
    id: 8,
    text: 'DNA stands for:',
    type: 'mcq',
    options: ['Deoxyribonucleic Acid', 'Dinitrogen Acid', 'Dynamic Nuclear Acid', 'Dextrose Nucleic Acid'],
    correctAnswer: 'Deoxyribonucleic Acid',
    points: 2,
    difficulty: 'Easy',
    explanation: 'DNA is Deoxyribonucleic Acid, which carries genetic information.'
  },
  {
    id: 9,
    text: 'Photosynthesis occurs in which part of the plant cell?',
    type: 'mcq',
    options: ['Nucleus', 'Mitochondria', 'Chloroplast', 'Vacuole'],
    correctAnswer: 'Chloroplast',
    points: 2,
    difficulty: 'Easy',
    explanation: 'Chloroplasts contain chlorophyll and are the site of photosynthesis.'
  },
  
  // Physics - Medium
  {
    id: 10,
    text: 'If an object is moving at constant velocity, its acceleration is:',
    type: 'mcq',
    options: ['Positive', 'Negative', 'Zero', 'Undefined'],
    correctAnswer: 'Zero',
    points: 3,
    difficulty: 'Medium',
    explanation: 'Constant velocity means no change in speed or direction, so acceleration = 0'
  },
  {
    id: 11,
    text: 'The formula for kinetic energy is:',
    type: 'mcq',
    options: ['mgh', '½mv²', 'Fd', 'Pt'],
    correctAnswer: '½mv²',
    points: 3,
    difficulty: 'Medium',
    explanation: 'Kinetic Energy = ½ × mass × velocity²'
  },
  
  // Chemistry - Hard
  {
    id: 12,
    text: 'What is the pH of a neutral solution at 25°C?',
    type: 'mcq',
    options: ['0', '7', '10', '14'],
    correctAnswer: '7',
    points: 3,
    difficulty: 'Medium',
    explanation: 'A pH of 7 indicates a neutral solution (neither acidic nor basic).'
  }
]

// GENERAL KNOWLEDGE QUESTIONS
export const generalKnowledgeQuestions: Question[] = [
  {
    id: 1,
    text: 'Who is the current Prime Minister of India (as of 2024)?',
    type: 'mcq',
    options: ['Narendra Modi', 'Rahul Gandhi', 'Amit Shah', 'Manmohan Singh'],
    correctAnswer: 'Narendra Modi',
    points: 2,
    difficulty: 'Easy',
    explanation: 'Narendra Modi has been serving as Prime Minister since 2014.'
  },
  {
    id: 2,
    text: 'What is the capital of Australia?',
    type: 'mcq',
    options: ['Sydney', 'Melbourne', 'Canberra', 'Brisbane'],
    correctAnswer: 'Canberra',
    points: 2,
    difficulty: 'Medium',
    explanation: 'Canberra is the capital city of Australia, not Sydney or Melbourne.'
  },
  {
    id: 3,
    text: 'The largest ocean in the world is:',
    type: 'mcq',
    options: ['Atlantic Ocean', 'Indian Ocean', 'Arctic Ocean', 'Pacific Ocean'],
    correctAnswer: 'Pacific Ocean',
    points: 2,
    difficulty: 'Easy',
    explanation: 'The Pacific Ocean is the largest and deepest ocean on Earth.'
  },
  {
    id: 4,
    text: 'Mount Everest is located in which mountain range?',
    type: 'mcq',
    options: ['Alps', 'Andes', 'Himalayas', 'Rockies'],
    correctAnswer: 'Himalayas',
    points: 2,
    difficulty: 'Easy',
    explanation: 'Mount Everest, the highest peak, is in the Himalayan mountain range.'
  },
  {
    id: 5,
    text: 'The Statue of Liberty was a gift from which country?',
    type: 'mcq',
    options: ['England', 'France', 'Spain', 'Italy'],
    correctAnswer: 'France',
    points: 2,
    difficulty: 'Easy',
    explanation: 'France gifted the Statue of Liberty to the United States in 1886.'
  },
  {
    id: 6,
    text: 'How many continents are there on Earth?',
    type: 'mcq',
    options: ['5', '6', '7', '8'],
    correctAnswer: '7',
    points: 2,
    difficulty: 'Easy',
    explanation: 'The 7 continents are: Asia, Africa, North America, South America, Antarctica, Europe, and Australia.'
  },
  {
    id: 7,
    text: 'The currency of Japan is:',
    type: 'mcq',
    options: ['Yuan', 'Won', 'Yen', 'Ringgit'],
    correctAnswer: 'Yen',
    points: 2,
    difficulty: 'Easy',
    explanation: 'The Japanese Yen (¥) is the official currency of Japan.'
  },
  {
    id: 8,
    text: 'Which country hosted the 2024 Summer Olympics?',
    type: 'mcq',
    options: ['Tokyo', 'Paris', 'Los Angeles', 'London'],
    correctAnswer: 'Paris',
    points: 2,
    difficulty: 'Easy',
    explanation: 'The 2024 Summer Olympics were held in Paris, France.'
  },
  {
    id: 9,
    text: 'The United Nations headquarters is located in:',
    type: 'mcq',
    options: ['Geneva', 'Paris', 'New York', 'London'],
    correctAnswer: 'New York',
    points: 2,
    difficulty: 'Easy',
    explanation: 'The UN headquarters is in New York City, USA.'
  },
  {
    id: 10,
    text: 'Who invented the telephone?',
    type: 'mcq',
    options: ['Thomas Edison', 'Alexander Graham Bell', 'Nikola Tesla', 'Benjamin Franklin'],
    correctAnswer: 'Alexander Graham Bell',
    points: 2,
    difficulty: 'Easy',
    explanation: 'Alexander Graham Bell patented the first practical telephone in 1876.'
  }
]

// HISTORY QUESTIONS
export const historyQuestions: Question[] = [
  {
    id: 1,
    text: 'In which year did India gain independence?',
    type: 'mcq',
    options: ['1942', '1945', '1947', '1950'],
    correctAnswer: '1947',
    points: 2,
    difficulty: 'Easy',
    explanation: 'India gained independence from British rule on August 15, 1947.'
  },
  {
    id: 2,
    text: 'Who was the first Prime Minister of India?',
    type: 'mcq',
    options: ['Mahatma Gandhi', 'Jawaharlal Nehru', 'Sardar Patel', 'Subhas Chandra Bose'],
    correctAnswer: 'Jawaharlal Nehru',
    points: 2,
    difficulty: 'Easy',
    explanation: 'Jawaharlal Nehru served as the first Prime Minister from 1947 to 1964.'
  },
  {
    id: 3,
    text: 'The Quit India Movement was launched in:',
    type: 'mcq',
    options: ['1940', '1942', '1944', '1946'],
    correctAnswer: '1942',
    points: 2,
    difficulty: 'Medium',
    explanation: 'The Quit India Movement was launched on August 8, 1942 by Mahatma Gandhi.'
  },
  {
    id: 4,
    text: 'World War II ended in which year?',
    type: 'mcq',
    options: ['1943', '1944', '1945', '1946'],
    correctAnswer: '1945',
    points: 2,
    difficulty: 'Easy',
    explanation: 'World War II ended in 1945 with the surrender of Japan in September.'
  },
  {
    id: 5,
    text: 'The French Revolution began in:',
    type: 'mcq',
    options: ['1776', '1789', '1799', '1804'],
    correctAnswer: '1789',
    points: 2,
    difficulty: 'Medium',
    explanation: 'The French Revolution began in 1789 with the storming of the Bastille.'
  },
  {
    id: 6,
    text: 'Who was the first President of the United States?',
    type: 'mcq',
    options: ['Thomas Jefferson', 'John Adams', 'George Washington', 'Benjamin Franklin'],
    correctAnswer: 'George Washington',
    points: 2,
    difficulty: 'Easy',
    explanation: 'George Washington served as the first US President from 1789 to 1797.'
  },
  {
    id: 7,
    text: 'The Battle of Plassey was fought in:',
    type: 'mcq',
    options: ['1707', '1757', '1857', '1947'],
    correctAnswer: '1757',
    points: 3,
    difficulty: 'Medium',
    explanation: 'The Battle of Plassey (1757) marked the beginning of British rule in India.'
  },
  {
    id: 8,
    text: 'The Berlin Wall fell in which year?',
    type: 'mcq',
    options: ['1985', '1987', '1989', '1991'],
    correctAnswer: '1989',
    points: 2,
    difficulty: 'Medium',
    explanation: 'The Berlin Wall fell on November 9, 1989, symbolizing the end of the Cold War.'
  }
]

// ENGLISH QUESTIONS
export const englishQuestions: Question[] = [
  {
    id: 1,
    text: 'What is the plural of "child"?',
    type: 'mcq',
    options: ['Childs', 'Children', 'Childes', 'Childrens'],
    correctAnswer: 'Children',
    points: 2,
    difficulty: 'Easy',
    explanation: 'Children is the irregular plural form of child.'
  },
  {
    id: 2,
    text: 'Which is the correct spelling?',
    type: 'mcq',
    options: ['Recieve', 'Receive', 'Receeve', 'Receve'],
    correctAnswer: 'Receive',
    points: 2,
    difficulty: 'Easy',
    explanation: 'The correct spelling is "receive" (i before e except after c).'
  },
  {
    id: 3,
    text: 'A synonym for "happy" is:',
    type: 'mcq',
    options: ['Sad', 'Joyful', 'Angry', 'Worried'],
    correctAnswer: 'Joyful',
    points: 2,
    difficulty: 'Easy',
    explanation: 'Joyful means feeling great pleasure and happiness.'
  },
  {
    id: 4,
    text: 'Identify the verb in: "The cat sleeps on the mat."',
    type: 'mcq',
    options: ['Cat', 'Sleeps', 'Mat', 'The'],
    correctAnswer: 'Sleeps',
    points: 2,
    difficulty: 'Easy',
    explanation: 'Sleeps is the action word (verb) in the sentence.'
  },
  {
    id: 5,
    text: 'What type of sentence is: "Please close the door."?',
    type: 'mcq',
    options: ['Declarative', 'Interrogative', 'Imperative', 'Exclamatory'],
    correctAnswer: 'Imperative',
    points: 3,
    difficulty: 'Medium',
    explanation: 'An imperative sentence gives a command or makes a request.'
  },
  {
    id: 6,
    text: 'An antonym for "difficult" is:',
    type: 'mcq',
    options: ['Hard', 'Easy', 'Tough', 'Complex'],
    correctAnswer: 'Easy',
    points: 2,
    difficulty: 'Easy',
    explanation: 'Easy is the opposite (antonym) of difficult.'
  },
  {
    id: 7,
    text: 'The past tense of "run" is:',
    type: 'mcq',
    options: ['Runned', 'Ran', 'Runed', 'Running'],
    correctAnswer: 'Ran',
    points: 2,
    difficulty: 'Easy',
    explanation: 'Ran is the irregular past tense form of run.'
  },
  {
    id: 8,
    text: 'Who wrote "Romeo and Juliet"?',
    type: 'mcq',
    options: ['Charles Dickens', 'William Shakespeare', 'Jane Austen', 'Mark Twain'],
    correctAnswer: 'William Shakespeare',
    points: 2,
    difficulty: 'Easy',
    explanation: 'William Shakespeare wrote the tragic play Romeo and Juliet.'
  }
]

// LOGICAL REASONING QUESTIONS
export const reasoningQuestions: Question[] = [
  {
    id: 1,
    text: 'Complete the series: 2, 4, 6, 8, ?',
    type: 'mcq',
    options: ['9', '10', '11', '12'],
    correctAnswer: '10',
    points: 2,
    difficulty: 'Easy',
    explanation: 'The series increases by 2 each time: 8 + 2 = 10'
  },
  {
    id: 2,
    text: 'If all Bloops are Razzies and all Razzies are Lazzies, then all Bloops are definitely Lazzies.',
    type: 'true-false',
    correctAnswer: 'True',
    points: 2,
    difficulty: 'Medium',
    explanation: 'This is a valid syllogism. If A⊆B and B⊆C, then A⊆C.'
  },
  {
    id: 3,
    text: 'What comes next in the pattern: A, C, E, G, ?',
    type: 'mcq',
    options: ['H', 'I', 'J', 'K'],
    correctAnswer: 'I',
    points: 2,
    difficulty: 'Easy',
    explanation: 'The pattern skips one letter each time: G + 2 letters = I'
  },
  {
    id: 4,
    text: 'If 5 workers can complete a task in 10 days, how many days will 10 workers take?',
    type: 'mcq',
    options: ['5 days', '10 days', '15 days', '20 days'],
    correctAnswer: '5 days',
    points: 3,
    difficulty: 'Medium',
    explanation: 'Inverse proportion: more workers = less time. 10 workers = half the time = 5 days'
  },
  {
    id: 5,
    text: 'Which number is the odd one out: 2, 4, 6, 9, 10?',
    type: 'mcq',
    options: ['2', '4', '9', '10'],
    correctAnswer: '9',
    points: 2,
    difficulty: 'Easy',
    explanation: '9 is the only odd number in the series.'
  },
  {
    id: 6,
    text: 'If APPLE is coded as BQQMF, how is ORANGE coded?',
    type: 'mcq',
    options: ['PSBOHF', 'PQBOHF', 'PSBMHF', 'OQBOHF'],
    correctAnswer: 'PSBOHF',
    points: 3,
    difficulty: 'Medium',
    explanation: 'Each letter is shifted by +1 in the alphabet.'
  },
  {
    id: 7,
    text: 'Complete: 1, 1, 2, 3, 5, 8, ?',
    type: 'mcq',
    options: ['11', '13', '15', '16'],
    correctAnswer: '13',
    points: 3,
    difficulty: 'Medium',
    explanation: 'Fibonacci sequence: each number is the sum of the previous two (5 + 8 = 13)'
  },
  {
    id: 8,
    text: 'A bat and ball cost $1.10 in total. The bat costs $1 more than the ball. How much does the ball cost?',
    type: 'mcq',
    options: ['$0.05', '$0.10', '$0.15', '$0.20'],
    correctAnswer: '$0.05',
    points: 4,
    difficulty: 'Hard',
    explanation: 'If ball = x, then bat = x + 1. So x + (x + 1) = 1.10, therefore x = 0.05'
  }
]

// Helper function to get questions by category and difficulty
export function getQuestionsByCategory(category: string, difficulty?: string, count?: number): Question[] {
  let questions: Question[] = []
  
  switch (category) {
    case 'mathematics':
      questions = mathematicsQuestions
      break
    case 'science':
      questions = scienceQuestions
      break
    case 'general-knowledge':
      questions = generalKnowledgeQuestions
      break
    case 'history':
      questions = historyQuestions
      break
    case 'english':
      questions = englishQuestions
      break
    case 'reasoning':
      questions = reasoningQuestions
      break
    default:
      questions = []
  }
  
  // Filter by difficulty if specified
  if (difficulty) {
    questions = questions.filter(q => q.difficulty === difficulty)
  }
  
  // Limit count if specified
  if (count && count < questions.length) {
    questions = questions.slice(0, count)
  }
  
  return questions
}

/**
 * Get questions by difficulty level with shuffling
 * Used by adaptive exam engine
 */
export function getQuestionsByDifficulty(
  category: string,
  difficulty: 'Easy' | 'Medium' | 'Hard',
  count: number = 5
): Question[] {
  const allQuestions = getQuestionsByCategory(category, difficulty)
  
  // Shuffle using Fisher-Yates algorithm
  const shuffled = [...allQuestions]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  
  return shuffled.slice(0, count)
}
