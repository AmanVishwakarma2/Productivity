import session from 'express-session';
import createMemoryStore from 'memorystore';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import fs from 'fs';

// Load environment variables
dotenv.config();
console.log('Storage module: Environment loaded');

// Load MongoDB connection string from config.json
try {
  const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
  console.log('Storage module: Config loaded successfully');

  // MongoDB Connection
  mongoose.connect(config.connectionString, {
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  })
    .then(() => console.log('Storage module: Connected to MongoDB Atlas'))
    .catch(err => console.error('Storage module: MongoDB connection error:', err));
} catch (error) {
  console.error('Storage module: Error loading config:', error);
}

const MemoryStore = createMemoryStore(session);

// MongoDB Schemas
const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  streak: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  completedTasks: {
    gratitude: { type: Boolean, default: false },
    pomodoro: { type: Boolean, default: false },
    todo: { type: Boolean, default: false },
    journal: { type: Boolean, default: false }
  },
  progress: { type: Number, default: 0 },
  lastStreakUpdate: { type: Date, default: null }
});

const JournalEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

const GratitudeEntrySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  entries: [String],
  date: { type: Date, default: Date.now }
});

const PomodoroSessionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String, enum: ['beginner', 'intermediate', 'flow_state'], required: true },
  completedCycles: { type: Number, default: 0 },
  isBreak: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

const TodoSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  completed: { type: Boolean, default: false },
  date: { type: Date, default: Date.now }
});

// Note Schema
const NoteSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  content: { type: String, required: true },
  tags: { type: [String], default: [] },
  isPinned: { type: Boolean, default: false },
  createdOn: { type: Date, default: Date.now }
});

// Create models
const UserModel = mongoose.model('User', UserSchema);
const JournalEntryModel = mongoose.model('JournalEntry', JournalEntrySchema);
const GratitudeEntryModel = mongoose.model('GratitudeEntry', GratitudeEntrySchema);
const PomodoroSessionModel = mongoose.model('PomodoroSession', PomodoroSessionSchema);
const TodoModel = mongoose.model('Todo', TodoSchema);
const Note = mongoose.model('Note', NoteSchema);

class MongoStorage {
  constructor() {
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000, // 1 day
    });
    console.log('Storage module: MongoStorage initialized');
  }

  // User methods
  async getUser(id) {
    try {
      console.log(`Storage module: Getting user by ID: ${id}`);
      return await UserModel.findById(id).lean();
    } catch (error) {
      console.error('Storage module: Error getting user:', error);
      return null;
    }
  }

  async getUserByUsername(username) {
    try {
      console.log(`Storage module: Getting user by username: ${username}`);
      return await UserModel.findOne({ username }).lean();
    } catch (error) {
      console.error('Storage module: Error getting user by username:', error);
      return null;
    }
  }

  async getUserByEmail(email) {
    try {
      console.log(`Storage module: Getting user by email: ${email}`);
      return await UserModel.findOne({ email }).lean();
    } catch (error) {
      console.error('Storage module: Error getting user by email:', error);
      return null;
    }
  }

  async createUser({ username, email, password }) {
    try {
      console.log(`Storage module: Creating user with username: ${username}, email: ${email}`);
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      console.log('Storage module: Password salt generated');
      
      const hashedPassword = await bcrypt.hash(password, salt);
      console.log('Storage module: Password hashed');
      
      // Create new user
      const newUser = new UserModel({
        username,
        email,
        password: hashedPassword,
        streak: 0,
        lastActive: new Date(),
        completedTasks: {
          gratitude: false,
          pomodoro: false,
          todo: false,
          journal: false
        },
        progress: 0,
        lastStreakUpdate: null
      });
      
      console.log('Storage module: Saving user to database');
      const savedUser = await newUser.save();
      console.log(`Storage module: User created with ID: ${savedUser._id}`);
      
      return savedUser.toObject();
    } catch (error) {
      console.error('Storage module: Error creating user:', error);
      throw error;
    }
  }

  async updateUserStreak(id, streak) {
    try {
      console.log(`Storage module: Updating streak for user ${id} to ${streak}`);
      await UserModel.findByIdAndUpdate(id, { 
        streak,
        lastStreakUpdate: new Date()
      });
      console.log('Storage module: Streak updated successfully');
    } catch (error) {
      console.error('Storage module: Error updating user streak:', error);
    }
  }

  async updateLastActive(id) {
    try {
      console.log(`Storage module: Updating last active time for user ${id}`);
      await UserModel.findByIdAndUpdate(id, { lastActive: new Date() });
      console.log('Storage module: Last active time updated successfully');
    } catch (error) {
      console.error('Storage module: Error updating last active:', error);
    }
  }

  // Progress tracking methods
  async updateTaskCompletion(userId, taskType, isCompleted) {
    try {
      console.log(`Storage module: Updating task completion for user ${userId}, task: ${taskType}, completed: ${isCompleted}`);
      
      const user = await UserModel.findById(userId);
      if (!user) {
        console.log(`Storage module: User ${userId} not found`);
        return null;
      }
      
      // Update the specific task
      user.completedTasks[taskType] = isCompleted;
      console.log(`Storage module: Task ${taskType} updated to ${isCompleted}`);
      
      // Calculate progress (25% per task)
      const completedCount = Object.values(user.completedTasks).filter(Boolean).length;
      user.progress = (completedCount / 4) * 100;
      console.log(`Storage module: Progress updated to ${user.progress}%`);
      
      // Update last active time
      user.lastActive = new Date();
      
      // Check if all tasks are completed to update streak
      const allCompleted = Object.values(user.completedTasks).every(Boolean);
      if (allCompleted) {
        console.log('Storage module: All tasks completed, checking streak update');
        
        // Check if streak was already updated today
        const today = new Date().setHours(0, 0, 0, 0);
        const lastUpdate = user.lastStreakUpdate ? new Date(user.lastStreakUpdate).setHours(0, 0, 0, 0) : null;
        
        if (lastUpdate !== today) {
          // Increment streak
          user.streak += 1;
          user.lastStreakUpdate = new Date();
          console.log(`Storage module: Streak incremented to ${user.streak}`);
        } else {
          console.log('Storage module: Streak already updated today');
        }
      }
      
      await user.save();
      console.log('Storage module: User progress saved successfully');
      
      return {
        completedTasks: user.completedTasks,
        progress: user.progress,
        streak: user.streak,
        allTasksCompleted: allCompleted
      };
    } catch (error) {
      console.error('Storage module: Error updating task completion:', error);
      return null;
    }
  }

  async resetDailyProgress(userId) {
    try {
      console.log(`Storage module: Resetting daily progress for user ${userId}`);
      
      const user = await UserModel.findById(userId);
      if (!user) {
        console.log(`Storage module: User ${userId} not found`);
        return null;
      }
      
      user.completedTasks = {
        gratitude: false,
        pomodoro: false,
        todo: false,
        journal: false
      };
      user.progress = 0;
      
      await user.save();
      console.log('Storage module: Daily progress reset successfully');
      
      return {
        completedTasks: user.completedTasks,
        progress: user.progress,
        streak: user.streak
      };
    } catch (error) {
      console.error('Storage module: Error resetting daily progress:', error);
      return null;
    }
  }

  async checkAndUpdateStreak(userId) {
    try {
      console.log(`Storage module: Checking and updating streak for user ${userId}`);
      
      const user = await UserModel.findById(userId);
      if (!user) {
        console.log(`Storage module: User ${userId} not found`);
        return null;
      }
      
      const now = new Date();
      const lastActive = new Date(user.lastActive);
      const today = new Date().setHours(0, 0, 0, 0);
      const lastActiveDay = new Date(lastActive).setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      yesterday.setHours(0, 0, 0, 0);
      
      // Calculate days since last activity
      const daysSinceLastActive = Math.floor((now - lastActive) / (1000 * 60 * 60 * 24));
      console.log(`Storage module: Days since last active: ${daysSinceLastActive}`);
      
      // Check if we need to reset daily progress (it's a new day)
      if (lastActiveDay < today) {
        console.log('Storage module: New day detected, resetting daily progress');
        await this.resetDailyProgress(userId);
        
        // If more than 1 day has passed or the user didn't complete all tasks yesterday, reset streak
        const allTasksCompletedYesterday = user.lastStreakUpdate && 
          new Date(user.lastStreakUpdate).setHours(0, 0, 0, 0) === yesterday.getTime();
          
        if (daysSinceLastActive > 1 || !allTasksCompletedYesterday) {
          console.log('Storage module: Streak conditions not met, resetting streak');
          user.streak = 0;
          user.lastStreakUpdate = null;
          await user.save();
          
          return { 
            streak: 0, 
            progress: 0,
            completedTasks: {
              gratitude: false,
              pomodoro: false,
              todo: false,
              journal: false
            },
            allTasksCompleted: false
          };
        }
      }
      
      // Update last active time
      user.lastActive = now;
      await user.save();
      console.log('Storage module: Last active time updated successfully');
      
      // Check if all tasks are currently completed
      const allTasksCompleted = Object.values(user.completedTasks).every(Boolean);
      
      return {
        streak: user.streak,
        progress: user.progress,
        completedTasks: user.completedTasks,
        allTasksCompleted
      };
    } catch (error) {
      console.error('Storage module: Error checking and updating streak:', error);
      return null;
    }
  }

  // Gratitude Journal methods
  async getGratitudeEntries(userId) {
    try {
      console.log(`Storage module: Getting gratitude entries for user ${userId}`);
      return await GratitudeEntryModel.find({ userId }).sort({ date: -1 }).lean();
    } catch (error) {
      console.error('Storage module: Error getting gratitude entries:', error);
      return [];
    }
  }

  async createGratitudeEntry(userId, entries) {
    try {
      console.log(`Storage module: Creating gratitude entry for user ${userId}`);
      
      const newEntry = new GratitudeEntryModel({
        userId,
        entries,
        date: new Date()
      });
      
      const savedEntry = await newEntry.save();
      console.log(`Storage module: Gratitude entry created with ID: ${savedEntry._id}`);
      
      // Mark gratitude task as completed
      await this.updateTaskCompletion(userId, 'gratitude', true);
      
      return savedEntry.toObject();
    } catch (error) {
      console.error('Storage module: Error creating gratitude entry:', error);
      throw error;
    }
  }

  // Journal methods
  async getJournalEntries(userId) {
    try {
      console.log(`Storage module: Getting journal entries for user ${userId}`);
      return await JournalEntryModel.find({ userId }).sort({ date: -1 }).lean();
    } catch (error) {
      console.error('Storage module: Error getting journal entries:', error);
      return [];
    }
  }

  async getJournalEntryById(userId, entryId) {
    try {
      console.log(`Storage module: Getting journal entry ${entryId} for user ${userId}`);
      return await JournalEntryModel.findOne({ _id: entryId, userId }).lean();
    } catch (error) {
      console.error('Storage module: Error getting journal entry by id:', error);
      return null;
    }
  }

  async createJournalEntry(userId, { title, content }) {
    try {
      console.log(`Storage module: Creating journal entry for user ${userId}`);
      
      const newEntry = new JournalEntryModel({
        userId,
        title,
        content,
        date: new Date()
      });
      
      const savedEntry = await newEntry.save();
      console.log(`Storage module: Journal entry created with ID: ${savedEntry._id}`);
      
      // Mark journal task as completed
      await this.updateTaskCompletion(userId, 'journal', true);
      
      return savedEntry.toObject();
    } catch (error) {
      console.error('Storage module: Error creating journal entry:', error);
      throw error;
    }
  }

  async updateJournalEntry(userId, entryId, { title, content }) {
    try {
      console.log(`Storage module: Updating journal entry ${entryId} for user ${userId}`);
      
      const updatedEntry = await JournalEntryModel.findOneAndUpdate(
        { _id: entryId, userId },
        { title, content },
        { new: true }
      ).lean();
      
      console.log('Storage module: Journal entry updated successfully');
      return updatedEntry;
    } catch (error) {
      console.error('Storage module: Error updating journal entry:', error);
      throw error;
    }
  }

  async deleteJournalEntry(userId, entryId) {
    try {
      console.log(`Storage module: Deleting journal entry ${entryId} for user ${userId}`);
      
      await JournalEntryModel.findOneAndDelete({ _id: entryId, userId });
      console.log('Storage module: Journal entry deleted successfully');
      
      // Check if there are any remaining entries
      const remainingEntries = await JournalEntryModel.countDocuments({ userId });
      console.log(`Storage module: Remaining journal entries: ${remainingEntries}`);
      
      // If no entries left, mark journal task as incomplete
      if (remainingEntries === 0) {
        console.log('Storage module: No journal entries left, marking task as incomplete');
        await this.updateTaskCompletion(userId, 'journal', false);
      }
    } catch (error) {
      console.error('Storage module: Error deleting journal entry:', error);
      throw error;
    }
  }

  // Pomodoro methods
  async getPomodoroSessions(userId) {
    try {
      console.log(`Storage module: Getting pomodoro sessions for user ${userId}`);
      return await PomodoroSessionModel.find({ userId }).sort({ date: -1 }).lean();
    } catch (error) {
      console.error('Storage module: Error getting pomodoro sessions:', error);
      return [];
    }
  }

  async createPomodoroSession(userId, { type, completedCycles, isBreak }) {
    try {
      console.log(`Storage module: Creating pomodoro session for user ${userId}`);
      
      const newSession = new PomodoroSessionModel({
        userId,
        type,
        completedCycles,
        isBreak,
        date: new Date()
      });
      
      const savedSession = await newSession.save();
      console.log(`Storage module: Pomodoro session created with ID: ${savedSession._id}`);
      
      // Mark pomodoro task as completed
      await this.updateTaskCompletion(userId, 'pomodoro', true);
      
      return savedSession.toObject();
    } catch (error) {
      console.error('Storage module: Error creating pomodoro session:', error);
      throw error;
    }
  }

  // Todo methods
  async getTodoItems(userId) {
    try {
      console.log(`Storage module: Getting todo items for user ${userId}`);
      return await TodoModel.find({ userId }).sort({ date: -1 }).lean();
    } catch (error) {
      console.error('Storage module: Error getting todo items:', error);
      return [];
    }
  }

  async createTodoItem(userId, { text }) {
    try {
      console.log(`Storage module: Creating todo item for user ${userId}`);
      
      const newItem = new TodoModel({
        userId,
        text,
        completed: false,
        date: new Date()
      });
      
      const savedItem = await newItem.save();
      console.log(`Storage module: Todo item created with ID: ${savedItem._id}`);
      
      // Check if all todos are completed
      await this.checkTodoCompletion(userId);
      
      return savedItem.toObject();
    } catch (error) {
      console.error('Storage module: Error creating todo item:', error);
      throw error;
    }
  }

  async updateTodoItem(userId, itemId, { text, completed }) {
    try {
      console.log(`Storage module: Updating todo item ${itemId} for user ${userId}`);
      
      const updateData = {};
      if (text !== undefined) updateData.text = text;
      if (completed !== undefined) updateData.completed = completed;
      
      const updatedItem = await TodoModel.findOneAndUpdate(
        { _id: itemId, userId },
        updateData,
        { new: true }
      ).lean();
      
      console.log('Storage module: Todo item updated successfully');
      
      // Check if all todos are completed
      await this.checkTodoCompletion(userId);
      
      return updatedItem;
    } catch (error) {
      console.error('Storage module: Error updating todo item:', error);
      throw error;
    }
  }

  async deleteTodoItem(userId, itemId) {
    try {
      console.log(`Storage module: Deleting todo item ${itemId} for user ${userId}`);
      
      await TodoModel.findOneAndDelete({ _id: itemId, userId });
      console.log('Storage module: Todo item deleted successfully');
      
      // Check if all todos are completed
      await this.checkTodoCompletion(userId);
    } catch (error) {
      console.error('Storage module: Error deleting todo item:', error);
      throw error;
    }
  }
  
  async checkTodoCompletion(userId) {
    try {
      console.log(`Storage module: Checking todo completion for user ${userId}`);
      
      const items = await TodoModel.find({ userId }).lean();
      console.log(`Storage module: Found ${items.length} todo items`);
      
      // If no items, todo task is not completed
      if (items.length === 0) {
        console.log('Storage module: No todo items, marking task as incomplete');
        await this.updateTaskCompletion(userId, 'todo', false);
        return false;
      }
      
      // Check if all items are completed
      const allCompleted = items.every(item => item.completed);
      console.log(`Storage module: All todo items completed: ${allCompleted}`);
      
      await this.updateTaskCompletion(userId, 'todo', allCompleted);
      
      return allCompleted;
    } catch (error) {
      console.error('Storage module: Error checking todo completion:', error);
      return false;
    }
  }

  // Notes functions
  async getNotes(userId) {
    console.log(`Storage: Getting notes for user ${userId}`);
    try {
      const notes = await Note.find({ userId }).sort({ isPinned: -1, createdOn: -1 });
      console.log(`Storage: Retrieved ${notes.length} notes for user ${userId}`);
      return notes;
    } catch (error) {
      console.error('Storage: Error getting notes:', error);
      throw error;
    }
  }

  async getNote(noteId, userId) {
    console.log(`Storage: Getting note ${noteId} for user ${userId}`);
    try {
      const note = await Note.findOne({ _id: noteId, userId });
      return note;
    } catch (error) {
      console.error('Storage: Error getting note:', error);
      throw error;
    }
  }

  async createNote(noteData) {
    console.log(`Storage: Creating note for user ${noteData.userId}`);
    try {
      const note = new Note(noteData);
      await note.save();
      console.log(`Storage: Note created with ID: ${note._id}`);
      return note;
    } catch (error) {
      console.error('Storage: Error creating note:', error);
      throw error;
    }
  }

  async updateNote(noteId, userId, updateData) {
    console.log(`Storage: Updating note ${noteId} for user ${userId}`);
    try {
      const note = await Note.findOne({ _id: noteId, userId });
      
      if (!note) {
        console.log(`Storage: Note ${noteId} not found for user ${userId}`);
        return null;
      }
      
      // Update only the fields that are provided
      if (updateData.title !== undefined) note.title = updateData.title;
      if (updateData.content !== undefined) note.content = updateData.content;
      if (updateData.tags !== undefined) note.tags = updateData.tags;
      if (updateData.isPinned !== undefined) note.isPinned = updateData.isPinned;
      
      await note.save();
      console.log(`Storage: Note ${noteId} updated for user ${userId}`);
      return note;
    } catch (error) {
      console.error('Storage: Error updating note:', error);
      throw error;
    }
  }

  async deleteNote(noteId, userId) {
    console.log(`Storage: Deleting note ${noteId} for user ${userId}`);
    try {
      const result = await Note.deleteOne({ _id: noteId, userId });
      console.log(`Storage: Delete result for note ${noteId}:`, result);
      return result.deletedCount > 0;
    } catch (error) {
      console.error('Storage: Error deleting note:', error);
      throw error;
    }
  }

  async searchNotes(userId, query) {
    console.log(`Storage: Searching notes for user ${userId} with query: ${query}`);
    try {
      const notes = await Note.find({
        userId,
        $or: [
          { title: { $regex: new RegExp(query, 'i') } },
          { content: { $regex: new RegExp(query, 'i') } },
          { tags: { $in: [new RegExp(query, 'i')] } }
        ]
      }).sort({ isPinned: -1, createdOn: -1 });
      
      console.log(`Storage: Found ${notes.length} notes matching query for user ${userId}`);
      return notes;
    } catch (error) {
      console.error('Storage: Error searching notes:', error);
      throw error;
    }
  }
}

export const storage = new MongoStorage(); 