import { useAuth } from '../hooks/useAuth';
import { Link } from 'wouter';
import Layout from '../components/Layout';
import DailyProgress from '../components/DailyProgress';
import BreakRedirect from '../components/BreakRedirect';
import { CheckCircle, Clock, BookOpen, ListChecks, FileText } from 'lucide-react';

function HomePage() {
  const { user } = useAuth();

  return (
        <Layout>
      <BreakRedirect />
      
      <div className="text-center mb-8 dark:bg-gray-800 text-gray-800 dark:text-white hover:shadow-lg transition-shadow shadow-xl">
        <h1 className="text-3xl font-bold">Welcome, {user?.username || 'User'}!</h1>
        <p className="text-gray-600 mt-2">Choose an activity to boost your productivity</p>
      </div>
      
      <DailyProgress />
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 dark:bg-gray-800 text-gray-800 dark:text-white ">
        <Link href="/gratitude">
          <div className="bg-white border rounded-lg p-6 cursor-pointer  hover:shadow-lg transition-shadow shadow-xl dark:bg-gray-800 text-gray-800 dark:text-white dark:border-black">
            <div className="flex items-center">
              <div className="mr-4 text-green-500">
                <CheckCircle className="h-10 w-10" />
              </div>
              <div >
                <h3 className="text-lg font-semibold ">Daily Gratitude</h3>
                <p className="text-gray-600 text-sm">Record what you're thankful for today</p>
              </div>
            </div>
          </div>
        </Link>
        
        <Link href="/pomodoro">
          <div className="bg-white border rounded-lg p-6 cursor-pointer dark:bg-gray-800 text-gray-800 dark:text-white dark:border-black hover:shadow-lg transition-shadow shadow-2xl">
            <div className="flex items-center">
              <div className="mr-4 text-blue-500">
                <Clock className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Pomodoro Timer</h3>
                <p className="text-gray-600 text-sm">Stay focused with timed work sessions</p>
              </div>
            </div>
          </div>
        </Link>
        
        <Link href="/journal">
          <div className="bg-white border rounded-lg p-6 cursor-pointer  dark:bg-gray-800 text-gray-800 dark:text-white dark:border-black hover:shadow-lg transition-shadow shadow-2xl">
            <div className="flex items-center">
              <div className="mr-4 text-purple-500">
                <BookOpen className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Journal</h3>
                <p className="text-gray-600 text-sm">Write and reflect on your thoughts</p>
              </div>
            </div>
          </div>
        </Link>
        
        <Link href="/todo">
          <div className="bg-white border rounded-lg p-6 cursor-pointer  dark:bg-gray-800 text-gray-800 dark:text-white dark:border-black hover:shadow-lg transition-shadow shadow-2xl">
            <div className="flex items-center">
              <div className="mr-4 text-orange-500">
                <ListChecks className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Todo List</h3>
                <p className="text-gray-600 text-sm">Track your daily tasks</p>
              </div>
            </div>
          </div>
        </Link>
        
        <Link href="/notes">
          <div className="bg-white border rounded-lg p-6 cursor-pointer    dark:bg-gray-800 text-gray-800 dark:text-white dark:border-black hover:shadow-lg transition-shadow shadow-2xl">
            <div className="flex items-center">
              <div className="mr-4 text-teal-500">
                <FileText className="h-10 w-10" />
              </div>
              <div>
                <h3 className="text-lg font-semibold">Notes</h3>
                <p className="text-gray-600 text-sm">Organize your thoughts and ideas</p>
              </div>
            </div>
          </div>
        </Link>
      </div>
    </Layout>
  );
}

export default HomePage;
