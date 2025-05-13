import * as React from 'react';
const { useEffect } = React;
import { useLocation, Route } from 'wouter';
import { useAuth } from '../hooks/useAuth';

function ProtectedRoute({ component: Component, ...rest }) {
  const { isAuthenticated, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Redirect to login page with return URL
      setLocation(`/auth?returnTo=${encodeURIComponent(location)}`);
    }
  }, [isLoading, isAuthenticated, location, setLocation]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-indigo-500"></div>
        <span className="ml-3 text-gray-700">Loading...</span>
      </div>
    );
  }

  // Don't render anything while redirecting
  if (!isAuthenticated) {
    return null;
  }

  // Return the component directly without wrapping it with Layout
  return <Route {...rest} component={Component} />;
}

export default ProtectedRoute;
