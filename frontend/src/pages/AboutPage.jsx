import { useAuth } from '../hooks/useAuth';
import Navbar from '../components/Navbar';

function AboutPage() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white ">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white border rounded-lg p-6 dark:border-black dark:bg-gray-800">
          <h2 className="text-xl font-semibold mb-6">About Productivity+</h2>
          
          <div className="prose max-w-none">
            <p className="mb-4">
              Fresh is a productivity application designed to help you stay focused, organized, and mindful. 
              Our goal is to provide simple yet effective tools that enhance your productivity and well-being.
            </p>
            
            <h3 className="text-lg font-semibold mt-6 mb-4">Our Features</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="border rounded-lg p-4 dark:border-black  hover:shadow-md transition-shadow shadow-2xl">
                <h4 className="font-semibold mb-2">Pomodoro Timer</h4>
                <p className="text-sm text-gray-600 dark:text-white">
                  Based on the popular Pomodoro Technique, our timer helps you work in focused intervals 
                  followed by short breaks to maximize productivity and prevent burnout.
                </p>
              </div>
              
              <div className="border rounded-lg p-4 hover:shadow-md dark:border-black transition-shadow shadow-2xl">
                <h4 className="font-semibold mb-2">Todo List</h4>
                <p className="text-sm text-gray-600 dark:text-white">
                  Keep track of your tasks with our simple and intuitive todo list. Add, complete, and 
                  delete tasks as you progress through your day.
                </p>
              </div>
              
              <div className="border rounded-lg p-4 hover:shadow-md dark:border-black transition-shadow shadow-2xl">
                <h4 className="font-semibold mb-2">Journal</h4>
                <p className="text-sm text-gray-600 dark:text-white "> 
                  Capture your thoughts, ideas, and reflections in our digital journal. Writing regularly 
                  can help clarify thinking and reduce stress.
                </p>
              </div>
              
              <div className="border rounded-lg p-4 hover:shadow-md dark:border-black transition-shadow shadow-2xl">
                <h4 className="font-semibold mb-2">Gratitude Journal</h4>
                <p className="text-sm text-gray-600 dark:text-white">
                  Practice gratitude daily by recording things you're thankful for. Research shows that 
                  gratitude practices can significantly improve mental well-being.
                </p>
              </div>
            </div>
            
            <h3 className="text-lg font-semibold mt-6 mb-4">Our Philosophy</h3>
            
            <p className="mb-4">
              At Fresh, we believe that productivity isn't just about doing more—it's about doing what matters 
              most while maintaining balance and well-being. Our application is designed with these principles in mind:
            </p>
            
            <ul className="list-disc pl-5 space-y-2 mb-6">
              <li>
                <strong>Simplicity:</strong> We focus on clean, intuitive interfaces that don't get in your way.
              </li>
              <li>
                <strong>Balance:</strong> We encourage regular breaks and mindfulness practices alongside focused work.
              </li>
              <li>
                <strong>Privacy:</strong> Your data belongs to you. We prioritize your privacy and security.
              </li>
              <li>
                <strong>Consistency:</strong> Small, consistent actions lead to significant results over time.
              </li>
            </ul>
            
            <p>
              Thank you for choosing Fresh for your productivity needs. We're constantly working to improve 
              and expand our features based on user feedback.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

export default AboutPage; 