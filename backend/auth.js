import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { storage } from './storage.js'; // Assuming storage.js handles DB operations
import express from 'express';

// Load environment variables
dotenv.config();
console.log('Auth module: Environment variables loaded');

// Get JWT secret from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
console.log('Auth module: JWT secret configured');

// Create router for auth routes
const router = express.Router();
console.log('Auth module: Router created');

// Register route
router.post('/api/auth/register', async (req, res) => {
  try {
    console.log('Auth module: Register request received');
    const { username, email, password, confirmPassword } = req.body;
    
    // Validate required fields
    if (!username || !email || !password || !confirmPassword) {
      console.log('Auth module: Missing required fields for registration');
      return res.status(400).json({ error: 'All fields are required' });
    }
    
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.log(`Auth module: Invalid email format: ${email}`);
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check if passwords match
    if (password !== confirmPassword) {
      console.log('Auth module: Passwords do not match');
      return res.status(400).json({ error: 'Passwords do not match' });
    }
    
    // Check password strength
    if (password.length < 8) {
      console.log('Auth module: Password too short');
      return res.status(400).json({ error: 'Password must be at least 8 characters long' });
    }
    
    // Check if username already exists
    const existingUsername = await storage.getUserByUsername(username);
    if (existingUsername) {
      console.log(`Auth module: Username already exists: ${username}`);
      return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Check if email already exists
    const existingEmail = await storage.getUserByEmail(email);
    if (existingEmail) {
      console.log(`Auth module: Email already exists: ${email}`);
      return res.status(400).json({ error: 'Email already exists' });
    }
    
    console.log('Auth module: Creating new user');
    // Create user
    const user = await storage.createUser({ username, email, password });
    console.log(`Auth module: User created with ID: ${user._id}`);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('Auth module: JWT token generated');
    
    // Return user info and token
    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('Auth module: Registration error:', error);
    res.status(500).json({ error: 'Registration failed', message: error.message });
  }
});

// Login route
router.post('/api/auth/login', async (req, res) => {
  try {
    console.log('Auth module: Login request received');
    const { email, password } = req.body;
    
    // Validate required fields
    if (!email || !password) {
      console.log('Auth module: Missing email or password for login');
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    // Find user by email
    const user = await storage.getUserByEmail(email);
    if (!user) {
      console.log(`Auth module: User not found with email: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log(`Auth module: Invalid password for user: ${email}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    console.log(`Auth module: User logged in: ${user.username}`);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, username: user.username, email: user.email },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    console.log('Auth module: JWT token generated');
    
    // Return user info and token
    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      },
      token
    });
  } catch (error) {
    console.error('Auth module: Login error:', error);
    res.status(500).json({ error: 'Login failed', message: error.message });
  }
});

// Logout route
router.post('/api/auth/logout', (req, res) => {
  console.log('Auth module: Logout request received');
  res.json({ message: 'Logged out successfully' });
});

// Get current user route
router.get('/api/user', verifyToken, async (req, res) => {
  try {
    console.log(`Auth module: Get current user request for ID: ${req.userId}`);
    const user = await storage.getUser(req.userId);
    
    if (!user) {
      console.log(`Auth module: User not found with ID: ${req.userId}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`Auth module: User found: ${user.username}`);
    res.json({ 
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Auth module: Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Add the missing /api/auth/user endpoint
router.get('/api/auth/user', verifyToken, async (req, res) => {
  try {
    console.log(`Auth module: Get current user request for ID: ${req.userId}`);
    const user = await storage.getUser(req.userId);
    
    if (!user) {
      console.log(`Auth module: User not found with ID: ${req.userId}`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    console.log(`Auth module: User found: ${user.username}`);
    res.json({ 
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Auth module: Error getting user:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Middleware to verify JWT token
export function verifyToken(req, res, next) {
  try {
    console.log('Auth module: Verifying token');
    
    // Skip token verification for auth routes
    if (req.originalUrl.startsWith('/api/auth/')) {
      console.log('Auth module: Skipping token verification for auth route');
      return next();
    }
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      console.log('Auth module: No authorization header');
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    if (!token) {
      console.log('Auth module: No token in authorization header');
      return res.status(401).json({ error: 'No token provided' });
    }
    
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.log('Auth module: Invalid token');
        return res.status(401).json({ error: 'Invalid token' });
      }
      
      console.log(`Auth module: Token verified for user ID: ${decoded.id}`);
      req.userId = decoded.id;
      next();
    });
  } catch (error) {
    console.error('Auth module: Token verification error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

// Setup auth routes
export function setupAuth(app) {
  console.log('Auth module: Setting up auth routes');
  
  // Register auth routes directly on the app
  app.use('/', router);
  
  console.log('Auth module: Auth routes registered');
}

export default router;