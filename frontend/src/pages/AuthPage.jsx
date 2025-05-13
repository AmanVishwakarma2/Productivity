import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocation } from 'wouter';
import PasswordInput from '../components/Notes/PasswordInput';

function AuthPage() {
  const [activeTab, setActiveTab] = useState('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [email, setEmail] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [formErrors, setFormErrors] = useState({});
  const { login, register, isLoginLoading, isRegisterLoading, loginError, registerError } = useAuth();
  const [, navigate] = useLocation();

  // Detect system theme preference on component mount
  useEffect(() => {
    // Check if theme is already stored (user preference)
    const storedTheme = localStorage.getItem('theme');
    
    // Only apply system preference if no explicit choice is stored
    if (!storedTheme) {
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      // Apply the theme based on system preference
      if (prefersDarkMode) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
      
      // Listen for system theme changes
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      
      const handleThemeChange = (e) => {
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      };
      
      // Add event listener with browser compatibility
      if (mediaQuery.addEventListener) {
        mediaQuery.addEventListener('change', handleThemeChange);
      } else {
        // Fallback for older browsers
        mediaQuery.addListener(handleThemeChange);
      }
      
      // Cleanup
      return () => {
        if (mediaQuery.removeEventListener) {
          mediaQuery.removeEventListener('change', handleThemeChange);
        } else {
          // Fallback for older browsers
          mediaQuery.removeListener(handleThemeChange);
        }
      };
    }
  }, []);

  const validateForm = () => {
    const errors = {};
    
    if (activeTab === 'register') {
      if (!username.trim()) {
        errors.username = 'Username is required';
      }
      
      if (!email.trim()) {
        errors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.email = 'Invalid email format';
      }
      
      if (!password) {
        errors.password = 'Password is required';
      } else if (password.length < 8) {
        errors.password = 'Password must be at least 8 characters';
      }
      
      if (password !== confirmPassword) {
        errors.confirmPassword = 'Passwords do not match';
      }
    } else {
      // Login validation
      if (!email.trim()) {
        errors.email = 'Email is required';
      }
      
      if (!password) {
        errors.password = 'Password is required';
      }
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    if (activeTab === 'login') {
      login({ email, password }, {
        onSuccess: () => {
          navigate('/');
        },
        onError: (error) => {
          console.error('Login failed:', error);
          // Remove setting general error for login
          // Instead only set field-specific errors
          if (activeTab === 'login') {
            // Just log the error but don't set general errors
            console.error('Login error:', error);
          } else {
            setFormErrors({ general: error.message || 'Registration failed. Please try again.' });
          }
        }
      });
    } else {
      register({ username, email, password, confirmPassword }, {
        onSuccess: () => {
          navigate('/');
        },
        onError: (error) => {
          console.error('Registration failed:', error);
          setFormErrors({ general: error.message || 'Registration failed. Please try again.' });
        }
      });
    }
  };

  return (
    <div className="min-h-screen flex dark:bg-gray-900">
      <div className="w-full md:w-1/2 flex flex-col justify-center items-center p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold mb-2 dark:text-white">Welcome to Productivity+</h1>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 w-full">
            <div className="flex border-b mb-6 dark:border-gray-700">
              <button
                className={`flex-1 py-2 text-center ${activeTab === 'login' ? 'border-b-2 border-blue-500 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setActiveTab('login')}
              >
                Login
              </button>
              <button
                className={`flex-1 py-2 text-center ${activeTab === 'register' ? 'border-b-2 border-blue-500 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'}`}
                onClick={() => setActiveTab('register')}
              >
                Register
              </button>
            </div>
            
            {formErrors.general && activeTab === 'register' && (
              <div className="mb-4 p-2 bg-red-100 text-red-700 rounded dark:bg-red-900 dark:bg-opacity-20 dark:text-red-400">
                {formErrors.general}
              </div>
            )}
            
            <form onSubmit={handleSubmit}>
              {activeTab === 'register' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-1 dark:text-white">Username</label>
                  <input
                    type="text"
                    value={username}
                    placeholder='Enter your username'
                    onChange={(e) => setUsername(e.target.value)}
                    className={`w-full p-2 border ${formErrors.username || (registerError && activeTab === 'register') ? 'border-red-500' : 'border-gray-300 dark:border-black'} rounded dark:bg-gray-700 dark:text-white`}
                    required
                  />
                  {formErrors.username && (
                    <p className="text-red-500 text-xs mt-1 dark:text-red-400">{formErrors.username}</p>
                  )}
                  {registerError && activeTab === 'register' && registerError.message && registerError.message.toLowerCase().includes('username') && (
                    <p className="text-red-500 text-xs mt-1 dark:text-red-400">{registerError.message}</p>
                  )}
                </div>
              )}
              
              <div className="mb-4 relative">
                <label className="block text-sm font-medium mb-1 dark:text-white">Email</label>
                <div className="flex items-center">
                  <input
                    type="email"
                    value={email}
                    placeholder='Enter your email'
                    onChange={(e) => setEmail(e.target.value)}
                    className={`w-full p-2 border ${formErrors.email || (loginError && activeTab === 'login') || (registerError && activeTab === 'register') ? 'border-red-500' : 'border-gray-300 dark:border-black'} rounded dark:bg-gray-700 dark:text-white`}
                    required
                  />
                </div>
                {formErrors.email && (
                  <p className="text-red-500 text-xs mt-1 dark:text-red-400">{formErrors.email}</p>
                )}
                {loginError && activeTab === 'login' && !formErrors.email && (
                  <p className="text-red-500 text-xs mt-1 dark:text-red-400">Invalid email</p>
                )}
                {registerError && activeTab === 'register' && registerError.message && registerError.message.toLowerCase().includes('email') && (
                  <p className="text-red-500 text-xs mt-1 dark:text-red-400">{registerError.message}</p>
                )}
              </div>
              
              <div className="mb-4 relative">
                <label className="block text-sm font-medium mb-1 dark:text-white">Password</label>
                <PasswordInput
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  error={formErrors.password || (loginError && activeTab === 'login') || (registerError && activeTab === 'register' && registerError.message && registerError.message.toLowerCase().includes('password'))}
                  placeholder="Enter your password"
                />
                {formErrors.password && (
                  <p className="text-red-500 text-xs mt-1 dark:text-red-400">{formErrors.password}</p>
                )}
                {loginError && activeTab === 'login' && !formErrors.password && !formErrors.email && (
                  <p className="text-red-500 text-xs mt-1 dark:text-red-400">Wrong password</p>
                )}
                {registerError && activeTab === 'register' && registerError.message && registerError.message.toLowerCase().includes('password') && !registerError.message.toLowerCase().includes('confirm') && (
                  <p className="text-red-500 text-xs mt-1 dark:text-red-400">{registerError.message}</p>
                )}
              </div>
              
              {activeTab === 'register' && (
                <div className="mb-6 relative">
                  <label className="block text-sm font-medium mb-1 dark:text-white">Confirm Password</label>
                  <PasswordInput
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    error={formErrors.confirmPassword || (registerError && activeTab === 'register' && registerError.message && registerError.message.toLowerCase().includes('confirm'))}
                    placeholder="Confirm your password"
                  />
                  {formErrors.confirmPassword && (
                    <p className="text-red-500 text-xs mt-1 dark:text-red-400">{formErrors.confirmPassword}</p>
                  )}
                  {registerError && activeTab === 'register' && registerError.message && registerError.message.toLowerCase().includes('confirm') && (
                    <p className="text-red-500 text-xs mt-1 dark:text-red-400">{registerError.message}</p>
                  )}
                </div>
              )}
              
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded font-medium hover:bg-blue-700"
                disabled={isLoginLoading || isRegisterLoading}
              >
                {activeTab === 'login' ? (
                  isLoginLoading ? 'Logging in...' : 'Login'
                ) : (
                  isRegisterLoading ? 'Registering...' : 'Register'
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
      
      <div className="hidden md:block md:w-1/2 bg-gray-200 dark:bg-gray-800">
        <div className="h-full flex flex-col justify-center items-center p-8 bg-gray-100 dark:bg-gray-700">
          <h2 className="text-3xl font-bold mb-6 dark:text-white">Boost Your Productivity</h2>
          <ul className="space-y-4 dark:text-gray-200">
            <li className="flex items-center">
              <span className="mr-2">✨</span>
              <span>Track daily gratitude</span>
            </li>
            <li className="flex items-center">
              <span className="mr-2">⏱️</span>
              <span>Focus with Pomodoro timer</span>
            </li>
            <li className="flex items-center">
              <span className="mr-2">🔥</span>
              <span>Build productive streaks</span>
            </li>
            <li className="flex items-center">
              <span className="mr-2">📊</span>
              <span>Visualize your progress</span>
            </li>
            <li className="flex items-center">
              <span className="mr-2">📝</span>
              <span>Organize your notes</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default AuthPage; 