import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';

function HelpPage() {
  const { user } = useAuth();
  const [expandedItem, setExpandedItem] = useState(null);

  const toggleItem = (item) => {
    if (expandedItem === item) {
      setExpandedItem(null);
    } else {
      setExpandedItem(item);
    }
  };

  const faqItems = [
    {
      id: 'pomodoro',
      question: 'How does the Pomodoro Timer work?',
      answer: 'The Pomodoro Timer offers three modes: Beginner (25 min work → 5 min break, 8 cycles), Intermediate (50 min work → 10 min break, 4 cycles), and Flow State (2.5h work → 30 min break, 2 cycles). Select your preferred mode and click Start to begin the timer.'
    },
    {
      id: 'gratitude',
      question: 'How do I use the Gratitude Journal?',
      answer: 'Write 5-10 things you\'re grateful for each day. Start each entry with "I am grateful to have..." You can add more entries using the + button, or remove them using the - button. Click Save Entries when you\'re done.'
    },
    {
      id: 'journal',
      question: 'How do I manage my Journal entries?',
      answer: 'Add new entries with a title and content. You can edit or delete entries using the buttons below each entry. Entries are automatically dated and organized chronologically.'
    },
    {
      id: 'progress',
      question: 'How does Progress Tracking work?',
      answer: 'Your daily progress is tracked across four activities: Gratitude Journal, Daily Journal, Pomodoro sessions, and Todo List. Complete all four to reach 100% progress for the day. Progress resets at midnight.'
    },
    {
      id: 'streaks',
      question: 'How do Streaks work?',
      answer: 'Maintain your streak by completing activities daily. Your streak resets if you\'re inactive for more than 24 hours. Keep the streak alive by staying active!'
    }
  ];

  return (
    <div className="min-h-screen bg-gray-100  dark:bg-gray-800 text-gray-800 dark:text-white ">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8 ">
        <div className="bg-white border rounded-lg dark:bg-gray-800 dark:border-black p-6   ">
          <h2 className="text-xl font-semibold mb-6">Help & FAQ</h2>
          
          <div className="space-y-4">
            {faqItems.map(item => (
              <div key={item.id} className="border-b pb-4">
                <button
                  className="flex justify-between items-center w-full text-left py-2"
                  onClick={() => toggleItem(item.id)}
                >
                  <span className="font-medium">{item.question}</span>
                  <svg
                    className={`w-5 h-5 transition-transform ${expandedItem === item.id ? 'transform rotate-180' : ''}`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {expandedItem === item.id && (
                  <div className="mt-2 text-gray-600 dark:text-white">
                    <p>{item.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}

export default HelpPage;
