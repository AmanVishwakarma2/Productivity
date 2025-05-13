import { useEffect, useState } from 'react';
import { Flame } from 'lucide-react';
import { useProgress } from '../contexts/progressContext';

function StreakCounter() {
  const { streak, allTasksCompleted } = useProgress();
  const [animated, setAnimated] = useState(false);
  const [prevStreak, setPrevStreak] = useState(0);
  
  // Trigger animation when streak increases
  useEffect(() => {
    if (streak > prevStreak) {
      setAnimated(true);
      const timer = setTimeout(() => setAnimated(false), 2000);
      return () => clearTimeout(timer);
    }
    setPrevStreak(streak);
  }, [streak, prevStreak]);

  return (
    <div className={`flex items-center  ${animated ? 'animate-pulse' : ''}`} 
         title={allTasksCompleted 
           ? "You've completed all tasks today! Keep it up!" 
           : "Complete all tasks today to keep your streak going!"}>
      <div className="relative">
        <Flame 
          className={`h-5 w-5 mr-1 transition-all duration-300 ${
            allTasksCompleted 
              ? 'text-orange-500 animate-pulse' 
              : 'text-gray-400'
          }`} 
        />
        {allTasksCompleted && (
          <div className="absolute -inset-1 bg-orange-200 rounded-full opacity-30 animate-ping"></div>
        )}
      </div>
      <span 
        className={`text-sm font-medium transition-all duration-300 ${
          allTasksCompleted ? 'text-orange-500' : 'text-gray-500'
        }`}
      >
        {streak} {streak === 1 ? 'day' : 'days'}
      </span>
    </div>
  );
}

export default StreakCounter; 