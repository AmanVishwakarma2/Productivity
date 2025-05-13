import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { useProgress } from "../contexts/progressContext";

const PRESETS = {
  beginner: {
    name: "Beginner",
    workDuration: 25 * 60, // 25 minutes in seconds
    breakDuration: 5 * 60, // 5 minutes in seconds
    cycles: 8,
    message: "Great job! You've completed your beginner session.",
  },
  intermediate: {
    name: "Intermediate",
    workDuration: 50 * 60, // 50 minutes in seconds
    breakDuration: 10 * 60, // 10 minutes in seconds
    cycles: 4,
    message: "Take a well-deserved long break!",
  },
  flow: {
    name: "Flow State",
    workDuration: 150 * 60, // 2.5 hours in seconds
    breakDuration: 30 * 60, // 30 minutes in seconds
    cycles: 2,
    message: "Amazing focus! Time to recharge.",
  },
};

function PomodoroTimer() {
  const [preset, setPreset] = useState(PRESETS.beginner);
  const [timeLeft, setTimeLeft] = useState(preset.workDuration);
  const [isRunning, setIsRunning] = useState(false);
  const [isBreak, setIsBreak] = useState(false);
  const [cycle, setCycle] = useState(1);
  const { updateTask } = useProgress();
  const timerRef = useRef(null);

  // Load timer state from localStorage on mount
  useEffect(() => {
    const savedTimerState = localStorage.getItem('pomodoroState');
    if (savedTimerState) {
      const state = JSON.parse(savedTimerState);
      
      // Check if the saved state is from a previous day
      const savedDate = new Date(state.timestamp || 0);
      const currentDate = new Date();
      const isSameDay = 
        savedDate.getDate() === currentDate.getDate() &&
        savedDate.getMonth() === currentDate.getMonth() &&
        savedDate.getFullYear() === currentDate.getFullYear();
      
      // Only restore state if it's from the same day
      if (isSameDay && state.isBreak) {
        setIsBreak(true);
        setTimeLeft(state.timeLeft);
        setCycle(state.cycle);
        setPreset(PRESETS[state.presetName]);
        setIsRunning(true); // Auto-resume break
      } else {
        // Reset if it's a new day (after midnight)
        localStorage.removeItem('pomodoroState');
      }
    }

    // Cleanup function
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Save timer state to localStorage when it changes
  useEffect(() => {
    // Check if a global break is active - if so, don't save this timer's state
    if (window.pomodoroBreakActive) {
      return;
    }

    if (isBreak) {
      localStorage.setItem('pomodoroState', JSON.stringify({
        isBreak,
        timeLeft,
        cycle,
        presetName: preset.name.toLowerCase(),
        timestamp: new Date().toISOString() // Add timestamp to track date
      }));
    } else if (!isBreak && timeLeft === preset.workDuration) {
      // Clear saved state when starting fresh
      localStorage.removeItem('pomodoroState');
    }
  }, [isBreak, timeLeft, cycle, preset]);

  useEffect(() => {
    // Don't run this timer if the global break timer is active
    if (window.pomodoroBreakActive) {
      setIsRunning(false);
      return;
    }

    // Clear any existing interval
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (isRunning && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((time) => {
          if (time <= 1) {
            // Clear interval when time is up
            clearInterval(timerRef.current);
            timerRef.current = null;
            
            // Handle completion in the next tick to avoid state update during render
            setTimeout(() => {
              setIsRunning(false);
              if (isBreak) {
                if (cycle < preset.cycles) {
                  setCycle((c) => c + 1);
                  setTimeLeft(preset.workDuration);
                  setIsBreak(false);
                } else {
                  updateTask("pomodoro", true);
                  alert(preset.message);
                  setCycle(1);
                }
              } else {
                setTimeLeft(preset.breakDuration);
                setIsBreak(true);
              }
            }, 0);
            
            return 0;
          }
          return time - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isRunning, isBreak, cycle, preset, updateTask]);

  // Prevent closing browser during break
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isBreak) {
        e.preventDefault();
        e.returnValue = "Complete your break first!";
        return e.returnValue;
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isBreak]);

  const formatTime = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;

    if (hours > 0) {
      // For durations >= 1 hour, include seconds (h:mm:ss format)
      return `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
    } else {
      // For durations < 1 hour, display mm:ss format
      return format(new Date(0, 0, 0, 0, minutes, remainingSeconds), "mm:ss");
    }
  };

  const progress = isBreak
    ? ((preset.breakDuration - timeLeft) / preset.breakDuration) * 100
    : ((preset.workDuration - timeLeft) / preset.workDuration) * 100;

  return (
    <div className="bg-white rounded-lg shadow-md p-6 max-w-md mx-auto">
      <h2 className="text-2xl font-bold mb-4">Pomodoro Timer</h2>
      
      <div className="mb-4">
        <label htmlFor="preset" className="block text-sm font-medium text-gray-700 mb-1 hover:shadow-lg transition-shadow shadow-2xl">
          Timer Preset
        </label>
        <select
          id="preset"
          className="block w-full p-2 border border-gray-300 rounded-md hover:shadow-lg transition-shadow shadow-2xl"
          value={preset.name.toLowerCase()}
          onChange={(e) => {
            setPreset(PRESETS[e.target.value]);
            setTimeLeft(PRESETS[e.target.value].workDuration);
            setIsBreak(false);
            setCycle(1);
            setIsRunning(false);
          }}
          disabled={isRunning}
        >
          {Object.entries(PRESETS).map(([key, preset]) => (
            <option key={key} value={key}>
              {preset.name}
            </option>
          ))}
        </select>
      </div>

      <div className="text-center my-6 hover:shadow-lg transition-shadow shadow-2xl">
        <div className="text-5xl font-mono mb-2 hover:shadow-lg transition-shadow shadow-">{formatTime(timeLeft)}</div>
        <div className="text-sm text-gray-600 hover:shadow-lg transition-shadow shadow-">
          {isBreak ? "Break Time" : "Work Time"} - Cycle {cycle}/{preset.cycles}
        </div>
      </div>

      <div className="w-full bg-gray-200 rounded-full h-2.5 mb-6 hover:shadow-lg transition-shadow shadow-2xl">
        <div 
          className={`h-2.5 rounded-full hover:shadow-lg transition-shadow shadow- ${isBreak ? 'bg-green-600' : 'bg-blue-600'}`}
          style={{ width: `${progress}%` }}
        ></div>
      </div>

      <div className="flex justify-center gap-4 hover:shadow-lg transition-shadow shadow-2xl">
        <button
          className={`px-4 py-2 rounded-md ${
            isRunning 
              ? 'bg-gray-200 text-gray-800 hover:bg-gray-300' 
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
          onClick={() => setIsRunning(!isRunning)}
          disabled={window.pomodoroBreakActive}
        >
          {isRunning ? "Pause" : "Start"}
        </button>
        <button
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 hover:shadow-lg transition-shadow shadow-2xl"
          onClick={() => {
            setTimeLeft(preset.workDuration);
            setIsBreak(false);
            setCycle(1);
            setIsRunning(false);
          }}
          disabled={window.pomodoroBreakActive}
        >
          Reset
        </button>
      </div>
    </div>
  );
}

export default PomodoroTimer; 