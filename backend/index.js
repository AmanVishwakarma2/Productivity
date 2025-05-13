import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import mongoose from 'mongoose';
import { setupAuth } from './auth.js';
import routes from './routes.js';

// Load environment variables
dotenv.config();
console.log('Server: Environment variables loaded');

// Create Express app
const app = express();
console.log('Server: Express app created');

// Load configuration
try {
  const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  console.log('Server: Configuration loaded successfully');
  
  // MongoDB Connection
  console.log('Server: Attempting to connect to MongoDB...');
  mongoose.connect(config.connectionString, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  })
    .then(() => console.log('Server: Connected to MongoDB Atlas'))
    .catch(err => console.error('Server: MongoDB connection error:', err));
  
  // MongoDB connection events
  mongoose.connection.on('error', err => {
    console.error('Server: MongoDB connection error:', err);
  });
  
  mongoose.connection.on('disconnected', () => {
    console.log('Server: MongoDB disconnected');
  });
  
  mongoose.connection.on('reconnected', () => {
    console.log('Server: MongoDB reconnected');
  });
} catch (error) {
  console.error('Server: Error loading configuration:', error);
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request timeout middleware
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    console.error(`Server: Request timeout: ${req.method} ${req.originalUrl}`);
    res.status(408).json({ error: 'Request timeout' });
  });
  next();
});

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  console.log(`Server: ${req.method} ${req.originalUrl} - Request received`);
  
  // Log response when finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`Server: ${req.method} ${req.originalUrl} - Response sent: ${res.statusCode} (${duration}ms)`);
  });
  
  next();
});

// Setup authentication
setupAuth(app);
console.log('Server: Authentication setup complete');

// Add a test endpoint for auth verification
app.get('/api/auth/test', (req, res) => {
  console.log('Server: Auth test endpoint called');
  res.json({ message: 'Auth routes are working!' });
});

// Register routes
app.use(routes);
console.log('Server: Routes registered');

// Health check endpoint
app.get('/health', (req, res) => {
  console.log('Server: Health check endpoint called');
  res.json({ 
    status: 'ok',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Server: Error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// Setup daily progress reset scheduler
function setupDailyResetScheduler() {
  console.log('Server: Setting up daily progress reset scheduler');
  
  // Function to calculate time until next midnight
  const getTimeUntilMidnight = () => {
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime() - now.getTime();
  };
  
  // Function to reset progress for all users
  const resetAllUsersProgress = async () => {
    try {
      console.log('Server: Running scheduled daily progress reset for all users');
      
      // Get all users from the database
      const UserModel = mongoose.model('User');
      const users = await UserModel.find({});
      
      console.log(`Server: Found ${users.length} users to reset progress`);
      
      // Import storage to use its methods
      const { storage } = await import('./storage.js');
      
      // Reset progress for each user
      for (const user of users) {
        console.log(`Server: Checking and updating streak for user ${user._id}`);
        await storage.checkAndUpdateStreak(user._id);
      }
      
      console.log('Server: Scheduled daily progress reset completed');
      
      // Schedule the next reset
      setTimeout(resetAllUsersProgress, getTimeUntilMidnight());
    } catch (error) {
      console.error('Server: Error in scheduled daily progress reset:', error);
      // Retry in 1 hour if there was an error
      setTimeout(resetAllUsersProgress, 60 * 60 * 1000);
    }
  };
  
  // Schedule the first reset
  const timeUntilMidnight = getTimeUntilMidnight();
  console.log(`Server: First daily progress reset scheduled in ${Math.round(timeUntilMidnight / 1000 / 60)} minutes`);
  setTimeout(resetAllUsersProgress, timeUntilMidnight);
}

// Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Server: Server running on port ${PORT}`);
  
  // Setup the daily reset scheduler
  setupDailyResetScheduler();
});
