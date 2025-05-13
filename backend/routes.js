import express from 'express';
import { storage } from './storage.js';
import { verifyToken } from './auth.js';

console.log('Routes module: Initializing routes');
const router = express.Router();

// Middleware to log requests
router.use((req, res, next) => {
  console.log(`Routes: ${req.method} ${req.originalUrl}`);
  next();
});

// Test route
router.get('/test', (req, res) => {
  console.log('Routes: Test endpoint called');
  res.json({ message: 'API is working!' });
});

// Public routes that don't require authentication
// This section is added to bypass token verification for auth endpoints
router.use('/api/auth', (req, res, next) => {
  console.log('Routes: Public auth route accessed');
  // Skip token verification for auth routes
  next();
});

// Protected routes middleware
router.use('/api', verifyToken);

// Progress routes
router.get('/api/progress', async (req, res) => {
  try {
    console.log(`Routes: Getting progress for user ${req.userId}`);
    const user = await storage.getUser(req.userId);
    
    if (!user) {
      console.log(`Routes: User ${req.userId} not found`);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check and update streak if needed
    const progressData = await storage.checkAndUpdateStreak(req.userId);
    console.log(`Routes: Progress data retrieved for user ${req.userId}`);
    
    res.json({
      streak: progressData.streak,
      progress: progressData.progress,
      completedTasks: progressData.completedTasks,
      allTasksCompleted: progressData.allTasksCompleted || false
    });
  } catch (error) {
    console.error('Routes: Error getting progress:', error);
    res.status(500).json({ error: 'Failed to get progress' });
  }
});

router.post('/api/progress/:taskType', async (req, res) => {
  try {
    const { taskType } = req.params;
    const { completed } = req.body;
    
    console.log(`Routes: Updating task completion for user ${req.userId}, task: ${taskType}, completed: ${completed}`);
    
    if (!['gratitude', 'pomodoro', 'todo', 'journal'].includes(taskType)) {
      console.log(`Routes: Invalid task type: ${taskType}`);
      return res.status(400).json({ error: 'Invalid task type' });
    }
    
    const result = await storage.updateTaskCompletion(req.userId, taskType, completed);
    
    if (!result) {
      console.log(`Routes: Failed to update task completion for user ${req.userId}`);
      return res.status(500).json({ error: 'Failed to update task completion' });
    }
    
    console.log(`Routes: Task completion updated successfully for user ${req.userId}`);
    res.json(result);
  } catch (error) {
    console.error('Routes: Error updating task completion:', error);
    res.status(500).json({ error: 'Failed to update task completion' });
  }
});

router.post('/api/progress/reset', async (req, res) => {
  try {
    console.log(`Routes: Resetting daily progress for user ${req.userId}`);
    const result = await storage.resetDailyProgress(req.userId);
    
    if (!result) {
      console.log(`Routes: Failed to reset daily progress for user ${req.userId}`);
      return res.status(500).json({ error: 'Failed to reset daily progress' });
    }
    
    console.log(`Routes: Daily progress reset successfully for user ${req.userId}`);
    res.json(result);
  } catch (error) {
    console.error('Routes: Error resetting daily progress:', error);
    res.status(500).json({ error: 'Failed to reset daily progress' });
  }
});

// Gratitude routes
router.get('/api/gratitude', async (req, res) => {
  try {
    console.log(`Routes: Getting gratitude entries for user ${req.userId}`);
    const entries = await storage.getGratitudeEntries(req.userId);
    console.log(`Routes: Retrieved ${entries.length} gratitude entries`);
    res.json(entries);
  } catch (error) {
    console.error('Routes: Error getting gratitude entries:', error);
    res.status(500).json({ error: 'Failed to get gratitude entries' });
  }
});

router.post('/api/gratitude', async (req, res) => {
  try {
    const { entries } = req.body;
    
    console.log(`Routes: Creating gratitude entry for user ${req.userId}`);
    
    if (!entries || !Array.isArray(entries) || entries.length === 0) {
      console.log('Routes: Invalid gratitude entries');
      return res.status(400).json({ error: 'Invalid entries' });
    }
    
    const result = await storage.createGratitudeEntry(req.userId, entries);
    console.log(`Routes: Gratitude entry created successfully for user ${req.userId}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('Routes: Error creating gratitude entry:', error);
    res.status(500).json({ error: 'Failed to create gratitude entry' });
  }
});

// Journal routes
router.get('/api/journal', async (req, res) => {
  try {
    console.log(`Routes: Getting journal entries for user ${req.userId}`);
    const entries = await storage.getJournalEntries(req.userId);
    console.log(`Routes: Retrieved ${entries.length} journal entries`);
    res.json(entries);
  } catch (error) {
    console.error('Routes: Error getting journal entries:', error);
    res.status(500).json({ error: 'Failed to get journal entries' });
  }
});

router.get('/api/journal/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Routes: Getting journal entry ${id} for user ${req.userId}`);
    
    const entry = await storage.getJournalEntryById(req.userId, id);
    
    if (!entry) {
      console.log(`Routes: Journal entry ${id} not found for user ${req.userId}`);
      return res.status(404).json({ error: 'Journal entry not found' });
    }
    
    console.log(`Routes: Journal entry ${id} retrieved successfully`);
    res.json(entry);
  } catch (error) {
    console.error('Routes: Error getting journal entry:', error);
    res.status(500).json({ error: 'Failed to get journal entry' });
  }
});

router.post('/api/journal', async (req, res) => {
  try {
    const { title, content } = req.body;
    
    console.log(`Routes: Creating journal entry for user ${req.userId}`);
    
    if (!title || !content) {
      console.log('Routes: Missing title or content for journal entry');
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    const result = await storage.createJournalEntry(req.userId, { title, content });
    console.log(`Routes: Journal entry created successfully for user ${req.userId}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('Routes: Error creating journal entry:', error);
    res.status(500).json({ error: 'Failed to create journal entry' });
  }
});

router.put('/api/journal/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, content } = req.body;
    
    console.log(`Routes: Updating journal entry ${id} for user ${req.userId}`);
    
    if (!title || !content) {
      console.log('Routes: Missing title or content for journal entry update');
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
    const result = await storage.updateJournalEntry(req.userId, id, { title, content });
    
    if (!result) {
      console.log(`Routes: Journal entry ${id} not found for user ${req.userId}`);
      return res.status(404).json({ error: 'Journal entry not found' });
    }
    
    console.log(`Routes: Journal entry ${id} updated successfully`);
    res.json(result);
  } catch (error) {
    console.error('Routes: Error updating journal entry:', error);
    res.status(500).json({ error: 'Failed to update journal entry' });
  }
});

router.delete('/api/journal/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Routes: Deleting journal entry ${id} for user ${req.userId}`);
    
    await storage.deleteJournalEntry(req.userId, id);
    console.log(`Routes: Journal entry ${id} deleted successfully`);
    res.json({ success: true });
  } catch (error) {
    console.error('Routes: Error deleting journal entry:', error);
    res.status(500).json({ error: 'Failed to delete journal entry' });
  }
});

// Pomodoro routes
router.get('/api/pomodoro', async (req, res) => {
  try {
    console.log(`Routes: Getting pomodoro sessions for user ${req.userId}`);
    const sessions = await storage.getPomodoroSessions(req.userId);
    console.log(`Routes: Retrieved ${sessions.length} pomodoro sessions`);
    res.json(sessions);
  } catch (error) {
    console.error('Routes: Error getting pomodoro sessions:', error);
    res.status(500).json({ error: 'Failed to get pomodoro sessions' });
  }
});

router.post('/api/pomodoro', async (req, res) => {
  try {
    const { type, completedCycles, isBreak } = req.body;
    
    console.log(`Routes: Creating pomodoro session for user ${req.userId}`);
    
    if (!type || !['beginner', 'intermediate', 'flow_state'].includes(type)) {
      console.log(`Routes: Invalid pomodoro type: ${type}`);
      return res.status(400).json({ error: 'Invalid pomodoro type' });
    }
    
    if (typeof completedCycles !== 'number' || completedCycles < 0) {
      console.log(`Routes: Invalid completedCycles: ${completedCycles}`);
      return res.status(400).json({ error: 'Invalid completedCycles' });
    }
    
    const result = await storage.createPomodoroSession(req.userId, { 
      type, 
      completedCycles, 
      isBreak: !!isBreak 
    });
    
    console.log(`Routes: Pomodoro session created successfully for user ${req.userId}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('Routes: Error creating pomodoro session:', error);
    res.status(500).json({ error: 'Failed to create pomodoro session' });
  }
});

// Todo routes
router.get('/api/todo', async (req, res) => {
  try {
    console.log(`Routes: Getting todo items for user ${req.userId}`);
    const items = await storage.getTodoItems(req.userId);
    console.log(`Routes: Retrieved ${items.length} todo items`);
    res.json(items);
  } catch (error) {
    console.error('Routes: Error getting todo items:', error);
    res.status(500).json({ error: 'Failed to get todo items' });
  }
});

router.post('/api/todo', async (req, res) => {
  try {
    const { text } = req.body;
    
    console.log(`Routes: Creating todo item for user ${req.userId}`);
    
    if (!text || typeof text !== 'string' || text.trim() === '') {
      console.log('Routes: Invalid todo text');
      return res.status(400).json({ error: 'Text is required' });
    }
    
    const result = await storage.createTodoItem(req.userId, { text });
    console.log(`Routes: Todo item created successfully for user ${req.userId}`);
    res.status(201).json(result);
  } catch (error) {
    console.error('Routes: Error creating todo item:', error);
    res.status(500).json({ error: 'Failed to create todo item' });
  }
});

router.put('/api/todo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, completed } = req.body;
    
    console.log(`Routes: Updating todo item ${id} for user ${req.userId}`);
    
    if (text === '' || (text !== undefined && typeof text !== 'string')) {
      console.log('Routes: Invalid todo text for update');
      return res.status(400).json({ error: 'Invalid text' });
    }
    
    if (completed !== undefined && typeof completed !== 'boolean') {
      console.log(`Routes: Invalid completed value: ${completed}`);
      return res.status(400).json({ error: 'Invalid completed value' });
    }
    
    const result = await storage.updateTodoItem(req.userId, id, { text, completed });
    
    if (!result) {
      console.log(`Routes: Todo item ${id} not found for user ${req.userId}`);
      return res.status(404).json({ error: 'Todo item not found' });
    }
    
    console.log(`Routes: Todo item ${id} updated successfully`);
    res.json(result);
  } catch (error) {
    console.error('Routes: Error updating todo item:', error);
    res.status(500).json({ error: 'Failed to update todo item' });
  }
});

router.delete('/api/todo/:id', async (req, res) => {
  try {
    const { id } = req.params;
    console.log(`Routes: Deleting todo item ${id} for user ${req.userId}`);
    
    await storage.deleteTodoItem(req.userId, id);
    console.log(`Routes: Todo item ${id} deleted successfully`);
    res.json({ success: true });
  } catch (error) {
    console.error('Routes: Error deleting todo item:', error);
    res.status(500).json({ error: 'Failed to delete todo item' });
  }
});

// Notes routes
router.get('/api/notes', async (req, res) => {
  try {
    console.log(`Routes: Getting notes for user ${req.userId}`);
    const notes = await storage.getNotes(req.userId);
    console.log(`Routes: Retrieved ${notes.length} notes for user ${req.userId}`);
    res.json({ notes });
  } catch (error) {
    console.error('Routes: Error getting notes:', error);
    res.status(500).json({ error: 'Failed to get notes' });
  }
});

router.get('/api/notes/search', async (req, res) => {
  try {
    console.log(`Routes: Searching notes for user ${req.userId}`);
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({ 
        error: true, 
        message: "Search Query is Required" 
      });
    }
    
    const notes = await storage.searchNotes(req.userId, query);
    console.log(`Routes: Found ${notes.length} notes matching query for user ${req.userId}`);
    
    return res.json({
      error: false,
      notes: notes,
      message: "Notes matching the search query retrieved successfully"
    });
  } catch (error) {
    console.error('Routes: Error searching notes:', error);
    return res.status(500).json({ 
      error: true, 
      message: "Internal Server Error" 
    });
  }
});

router.post('/api/notes', async (req, res) => {
  try {
    console.log(`Routes: Creating note for user ${req.userId}`);
    const { title, content, tags } = req.body;
    
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    
    if (!content) {
      return res.status(400).json({ error: 'Content is required' });
    }
    
    const note = await storage.createNote({
      userId: req.userId,
      title,
      content,
      tags: tags || [],
    });
    
    console.log(`Routes: Note created with ID: ${note._id}`);
    res.status(201).json({ note });
  } catch (error) {
    console.error('Routes: Error creating note:', error);
    res.status(500).json({ error: 'Failed to create note' });
  }
});

router.get('/api/notes/:noteId', async (req, res) => {
  try {
    console.log(`Routes: Getting note ${req.params.noteId} for user ${req.userId}`);
    const note = await storage.getNote(req.params.noteId, req.userId);
    
    if (!note) {
      console.log(`Routes: Note ${req.params.noteId} not found for user ${req.userId}`);
      return res.status(404).json({ error: 'Note not found' });
    }
    
    console.log(`Routes: Note ${req.params.noteId} retrieved for user ${req.userId}`);
    res.json({ note });
  } catch (error) {
    console.error('Routes: Error getting note:', error);
    res.status(500).json({ error: 'Failed to get note' });
  }
});

router.put('/api/notes/:noteId', async (req, res) => {
  try {
    console.log(`Routes: Updating note ${req.params.noteId} for user ${req.userId}`);
    const { title, content, tags } = req.body;
    
    if (!title && !content && !tags) {
      return res.status(400).json({ error: 'No changes provided' });
    }
    
    const note = await storage.updateNote(req.params.noteId, req.userId, {
      title,
      content,
      tags,
    });
    
    if (!note) {
      console.log(`Routes: Note ${req.params.noteId} not found for user ${req.userId}`);
      return res.status(404).json({ error: 'Note not found' });
    }
    
    console.log(`Routes: Note ${req.params.noteId} updated for user ${req.userId}`);
    res.json({ note });
  } catch (error) {
    console.error('Routes: Error updating note:', error);
    res.status(500).json({ error: 'Failed to update note' });
  }
});

router.delete('/api/notes/:noteId', async (req, res) => {
  try {
    console.log(`Routes: Deleting note ${req.params.noteId} for user ${req.userId}`);
    const result = await storage.deleteNote(req.params.noteId, req.userId);
    
    if (!result) {
      console.log(`Routes: Note ${req.params.noteId} not found for user ${req.userId}`);
      return res.status(404).json({ error: 'Note not found' });
    }
    
    console.log(`Routes: Note ${req.params.noteId} deleted for user ${req.userId}`);
    res.json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.error('Routes: Error deleting note:', error);
    res.status(500).json({ error: 'Failed to delete note' });
  }
});

router.put('/api/notes/:noteId/pin', async (req, res) => {
  try {
    console.log(`Routes: Updating pin status for note ${req.params.noteId} for user ${req.userId}`);
    const { isPinned } = req.body;
    
    const note = await storage.updateNote(req.params.noteId, req.userId, {
      isPinned,
    });
    
    if (!note) {
      console.log(`Routes: Note ${req.params.noteId} not found for user ${req.userId}`);
      return res.status(404).json({ error: 'Note not found' });
    }
    
    console.log(`Routes: Pin status updated for note ${req.params.noteId} for user ${req.userId}`);
    res.json({ note });
  } catch (error) {
    console.error('Routes: Error updating pin status:', error);
    res.status(500).json({ error: 'Failed to update pin status' });
  }
});

console.log('Routes module: All routes registered');
export default router; 