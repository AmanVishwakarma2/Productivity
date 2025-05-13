import { Link } from 'wouter';
import Navbar from '../components/Navbar';

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-100">
      <Navbar />
      
      <main className="container mx-auto px-4 py-8">
        <div className="bg-white border rounded-lg p-6 text-center">
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">404 - Page Not Found</h2>
          <p className="text-gray-600 mb-6">
            The page you're looking for doesn't exist or has been moved.
          </p>
          <Link href="/">
            <button className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700">
              Return to Dashboard
            </button>
          </Link>
        </div>
      </main>
    </div>
  );
}

export default NotFoundPage;
