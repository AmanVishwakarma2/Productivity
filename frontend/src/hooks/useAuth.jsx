import * as React from 'react';
const { createContext, useContext, useState, useEffect } = React;
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useLocation, useRoute } from 'wouter';

const AuthContext = createContext(null);

// Helper to store and retrieve token from localStorage
const TOKEN_KEY = 'productivity_app_token';
const TOKEN_EXPIRY_KEY = 'productivity_app_token_expiry';
const USER_DATA_KEY = 'productivity_app_user';

const storeToken = (token) => {
  localStorage.setItem(TOKEN_KEY, token);
  
  // Set token expiry to 2 days from now
  const expiryDate = new Date();
  expiryDate.setDate(expiryDate.getDate() + 2);
  localStorage.setItem(TOKEN_EXPIRY_KEY, expiryDate.toISOString());
};

const storeUser = (user) => {
  localStorage.setItem(USER_DATA_KEY, JSON.stringify(user));
};

const getUser = () => {
  const userData = localStorage.getItem(USER_DATA_KEY);
  return userData ? JSON.parse(userData) : null;
};

const getToken = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
  
  // Check if token is expired
  if (token && expiry) {
    const expiryDate = new Date(expiry);
    const now = new Date();
    
    if (now > expiryDate) {
      // Token is expired, remove it
      removeToken();
      return null;
    }
  }
  
  return token;
};

const removeToken = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(TOKEN_EXPIRY_KEY);
  localStorage.removeItem(USER_DATA_KEY);
};

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    // Initialize with token check on first render
    const token = getToken();
    return !!token;
  });
  const [user, setUser] = useState(() => {
    // Initialize with stored user on first render
    return getUser();
  });
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();
  const [location, setLocation] = useLocation();
  const [match, params] = useRoute('/auth');

  // Check if user is authenticated on mount
  useEffect(() => {
    async function checkAuth() {
      try {
        // First check if we have a token
        const token = getToken();
        const storedUser = getUser();
        
        if (!token) {
          setIsAuthenticated(false);
          setUser(null);
          setIsLoading(false);
          return;
        }
        
        // If we have a token and user data, set them immediately
        if (storedUser) {
          setUser(storedUser);
          setIsAuthenticated(true);
        }
        
        // Then verify with the server in the background
        try {
          console.log('Verifying token with server...');
          let response = await fetch('/api/auth/user', {
            credentials: 'include',
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          // If the endpoint returns 404, try the alternative endpoint
          if (response.status === 404) {
            console.log('Auth endpoint not found, trying alternative endpoint...');
            response = await fetch('/api/user', {
              credentials: 'include',
              headers: {
                'Authorization': `Bearer ${token}`
              }
            });
          }
          
          if (response.ok) {
            const data = await response.json();
            setUser(data.user);
            storeUser(data.user);
            setIsAuthenticated(true);
          } else {
            console.warn('Token verification failed:', response.status);
            // Only clear if it's an auth error (401/403)
            // Don't clear on 404 errors - the endpoint might just be missing
            if (response.status === 401 || response.status === 403) {
              removeToken();
              setIsAuthenticated(false);
              setUser(null);
            }
          }
        } catch (error) {
          console.error('Error verifying token:', error);
          // Don't clear auth on network errors
          if (error.message.includes('Failed to fetch') && getToken() && getUser()) {
            console.warn('Network error, but keeping user logged in with stored credentials');
          }
        }
      } catch (error) {
        console.error('Error in checkAuth:', error);
      } finally {
        setIsLoading(false);
      }
    }

    checkAuth();
  }, []);

  // Handle redirect after login/register
  useEffect(() => {
    if (isAuthenticated && !isLoading && match) {
      const searchParams = new URLSearchParams(window.location.search);
      const returnTo = searchParams.get('returnTo') || '/';
      setLocation(returnTo);
    }
  }, [isAuthenticated, isLoading, match, setLocation]);

  // Login mutation
  const loginMutation = useMutation({
    mutationFn: async (credentials) => {
      console.log('Attempting login...');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(credentials),
      });

      if (!response.ok) {
        console.error('Login failed:', response.status);
        let errorMessage = 'Login failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        
        if (response.status === 401) {
          throw new Error('Invalid email or password. Please try again.');
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Login successful');
      return data;
    },
    onSuccess: (data) => {
      // Store the JWT token and user data
      if (data.token) {
        storeToken(data.token);
        storeUser(data.user);
      }
      
      setUser(data.user);
      setIsAuthenticated(true);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      
      // Redirect if on auth page
      if (match) {
        const searchParams = new URLSearchParams(window.location.search);
        const returnTo = searchParams.get('returnTo') || '/';
        setLocation(returnTo);
      }
    },
  });

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: async (userData) => {
      console.log('Attempting registration...');
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
      });

      if (!response.ok) {
        console.error('Registration failed:', response.status);
        let errorMessage = 'Registration failed';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          console.error('Error parsing error response:', e);
        }
        throw new Error(errorMessage);
      }

      const data = await response.json();
      console.log('Registration successful');
      return data;
    },
    onSuccess: (data) => {
      // Store the JWT token and user data
      if (data.token) {
        storeToken(data.token);
        storeUser(data.user);
      }
      
      setUser(data.user);
      setIsAuthenticated(true);
      queryClient.invalidateQueries({ queryKey: ['user'] });
      
      // Redirect if on auth page
      if (match) {
        const searchParams = new URLSearchParams(window.location.search);
        const returnTo = searchParams.get('returnTo') || '/';
        setLocation(returnTo);
      }
    },
  });

  // Logout mutation
  const logoutMutation = useMutation({
    mutationFn: async () => {
      try {
        console.log('Attempting logout...');
        const token = getToken();
        const response = await fetch('/api/auth/logout', {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Authorization': token ? `Bearer ${token}` : ''
          }
        });
  
        if (!response.ok) {
          console.warn('Logout request failed, but proceeding with local logout');
        } else {
          console.log('Logout successful on server');
        }
      } catch (error) {
        console.warn('Error during logout request, but proceeding with local logout:', error);
      }
      
      return true;
    },
    onSuccess: () => {
      // Remove the JWT token and user data
      removeToken();
      
      setUser(null);
      setIsAuthenticated(false);
      queryClient.clear();
      
      // Redirect to login page
      setLocation('/auth');
    },
  });

  // Create an axios-like interceptor for all fetch requests
  useEffect(() => {
    const originalFetch = window.fetch;
    
    window.fetch = async function(url, options = {}) {
      // If we have a token, add it to the headers
      const token = getToken();
      if (token) {
        options.headers = {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        };
      }
      
      // Make the request
      try {
        const response = await originalFetch(url, options);
        
        // If we get a 401 (Unauthorized), clear the token and user state
        if (response.status === 401) {
          // Only logout if this is an API request, not for static assets
          if (url.includes('/api/')) {
            console.warn('Received 401 from API, logging out');
            removeToken();
            setUser(null);
            setIsAuthenticated(false);
            
            // Only redirect to auth page if not already there
            if (!window.location.pathname.includes('/auth')) {
              setLocation('/auth');
            }
          }
        }
        
        return response;
      } catch (error) {
        console.error('Fetch error:', error);
        // Don't logout on network errors
        throw error;
      }
    };
    
    // Cleanup function to restore original fetch
    return () => {
      window.fetch = originalFetch;
    };
  }, [setLocation]);

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        isLoading,
        login: (credentials, options) => loginMutation.mutate(credentials, options),
        register: (userData, options) => registerMutation.mutate(userData, options),
        logout: (options) => logoutMutation.mutate(undefined, options),
        loginError: loginMutation.error,
        registerError: registerMutation.error,
        isLoginLoading: loginMutation.isPending,
        isRegisterLoading: registerMutation.isPending,
        isLogoutLoading: logoutMutation.isPending,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 