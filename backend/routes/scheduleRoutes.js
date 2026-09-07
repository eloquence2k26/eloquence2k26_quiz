import express from 'express';
import { 
  getQuizzesFromDB, 
  insertQuizToDB, 
  updateQuizInDB, 
  deleteQuizFromDB,
  getUsersFromDB,
  loadAttempts
} from '../config/db.js';

const router = express.Router();

/**
 * In-memory active presence tracker for logged-in participants
 * Key: userId -> { userId, name, username, email, phone, lastSeen, currentQuizId, role }
 */
const activeSessions = new Map();

// Periodic cleanup of stale sessions older than 2 minutes
setInterval(() => {
  const now = Date.now();
  for (const [userId, session] of activeSessions.entries()) {
    if (now - session.lastSeenTimestamp > 120000) {
      activeSessions.delete(userId);
    }
  }
}, 30000);

/**
 * Helper to compute timing status
 */
const computeStatus = (quiz) => {
  if (!quiz) return 'Scheduled';
  if (quiz.status === 'Published' || quiz.status === 'Live') {
    const now = new Date();
    const end = quiz.end_date_time || quiz.end_time ? new Date(quiz.end_date_time || quiz.end_time) : null;
    if (end && now > end) {
      return 'Closed';
    }
    return 'Published';
  }
  if (quiz.status === 'Closed') return 'Closed';
  if (quiz.status === 'Draft') return 'Draft';
  return 'Scheduled';
};

// GET /api/schedule - Fetch all scheduled events
router.get('/', async (req, res) => {
  try {
    const quizzes = await getQuizzesFromDB();
    
    // Enrich with computed status and active participant count
    const enriched = quizzes.map((q) => {
      const liveStatus = computeStatus(q);
      
      // Count participants currently taking this quiz or active
      const attempts = loadAttempts ? loadAttempts() : [];
      const activeAttempts = attempts.filter(
        (a) => String(a.quiz_id) === String(q.id) && (a.status === 'IN_PROGRESS' || !a.submitted_at)
      );

      return {
        ...q,
        start_date_time: q.start_date_time || q.start_time || '',
        end_date_time: q.end_date_time || q.end_time || '',
        duration: parseInt(q.duration, 10) || 30,
        computedStatus: liveStatus,
        activeAttendeesCount: activeAttempts.length
      };
    });

    res.json({ success: true, events: enriched });
  } catch (err) {
    console.error('Error fetching schedule:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/schedule - Create and schedule a new event
router.post('/', async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      start_date_time,
      end_date_time,
      duration,
      total_questions,
      marks_per_question,
      status
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ error: 'Event title is required' });
    }

    const durationMin = parseInt(duration, 10) || 30;
    const startIso = start_date_time ? new Date(start_date_time).toISOString() : new Date().toISOString();
    
    // Calculate end time if not explicitly passed
    let endIso = end_date_time ? new Date(end_date_time).toISOString() : null;
    if (!endIso) {
      const endD = new Date(new Date(startIso).getTime() + durationMin * 60000);
      endIso = endD.toISOString();
    }

    const newEvent = await insertQuizToDB({
      title: title.trim(),
      description: description || '',
      event_id: 'evt_eloquence_2026',
      category: category || 'General Technology',
      start_date_time: startIso,
      end_date_time: endIso,
      duration: durationMin,
      total_questions: parseInt(total_questions, 10) || 30,
      marks_per_question: parseFloat(marks_per_question) || 1,
      status: status || 'Scheduled',
      questions: []
    });

    res.status(201).json({ success: true, event: newEvent });
  } catch (err) {
    console.error('Error creating scheduled event:', err);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/schedule/:id - Edit event date, time, and duration
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      title, 
      category, 
      description, 
      start_date_time, 
      end_date_time, 
      duration, 
      status 
    } = req.body;

    const updates = {};
    if (title !== undefined) updates.title = title;
    if (category !== undefined) updates.category = category;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;

    let durationMin = duration !== undefined ? parseInt(duration, 10) : undefined;
    if (durationMin !== undefined) updates.duration = durationMin;

    if (start_date_time !== undefined) {
      const startIso = new Date(start_date_time).toISOString();
      updates.start_date_time = startIso;
      updates.start_time = startIso;

      // If duration is known, recompute end_date_time unless explicitly provided
      if (end_date_time) {
        const endIso = new Date(end_date_time).toISOString();
        updates.end_date_time = endIso;
        updates.end_time = endIso;
      } else if (durationMin) {
        const endIso = new Date(new Date(startIso).getTime() + durationMin * 60000).toISOString();
        updates.end_date_time = endIso;
        updates.end_time = endIso;
      }
    } else if (end_date_time !== undefined) {
      const endIso = new Date(end_date_time).toISOString();
      updates.end_date_time = endIso;
      updates.end_time = endIso;
    }

    const updated = await updateQuizInDB(id, updates);
    if (!updated) {
      return res.status(404).json({ error: 'Scheduled event not found' });
    }

    res.json({ success: true, event: updated });
  } catch (err) {
    console.error('Error updating scheduled event:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/schedule/:id/start - Manual start button to publish event
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const quizzes = await getQuizzesFromDB();
    const existing = quizzes.find((q) => String(q.id) === String(id));

    if (!existing) {
      return res.status(404).json({ error: 'Scheduled event not found' });
    }

    const now = new Date();
    const durationMin = parseInt(existing.duration, 10) || 30;
    const end = new Date(now.getTime() + durationMin * 60000);

    const updates = {
      status: 'Published',
      start_date_time: now.toISOString(),
      start_time: now.toISOString(),
      end_date_time: end.toISOString(),
      end_time: end.toISOString()
    };

    const updated = await updateQuizInDB(id, updates);
    res.json({ 
      success: true, 
      message: `Event "${existing.title}" is now Published and Started!`, 
      event: updated 
    });
  } catch (err) {
    console.error('Error starting scheduled event:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/schedule/presence - Ingest participant heartbeat ping
router.post('/presence', async (req, res) => {
  try {
    const { userId, name, username, email, phone, role, quizId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const now = Date.now();
    activeSessions.set(String(userId), {
      userId: String(userId),
      name: name || username || 'Participant',
      username: username || name || (email ? email.split('@')[0] : `user_${userId.slice(0, 5)}`),
      email: email || '',
      phone: phone || '',
      role: role || 'user',
      currentQuizId: quizId || null,
      lastSeen: new Date().toISOString(),
      lastSeenTimestamp: now
    });

    res.json({ success: true, activeCount: activeSessions.size });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/schedule/:id/active-users - Get live attendees and usernames for scheduled event
router.get('/:id/active-users', async (req, res) => {
  try {
    const { id } = req.params;
    const now = Date.now();

    // 1. Fetch registered users from DB to enrich details
    const allUsers = await getUsersFromDB();
    const userMap = new Map();
    allUsers.forEach((u) => userMap.set(String(u.id), u));

    // 2. Fetch quiz attempts for this specific quiz
    const attempts = loadAttempts ? loadAttempts() : [];
    const quizAttempts = attempts.filter((a) => String(a.quiz_id) === String(id));
    const attemptingUserIds = new Set(quizAttempts.map((a) => String(a.participant_id)));

    // 3. Find active online users from presence within last 90 seconds
    const activeParticipants = [];
    const processedUserIds = new Set();

    for (const [userId, session] of activeSessions.entries()) {
      if (now - session.lastSeenTimestamp <= 90000) {
        // User is currently active
        const dbUser = userMap.get(userId);
        const attempt = quizAttempts.find((a) => String(a.participant_id) === String(userId));

        // Format username
        const cleanUsername = session.username || (dbUser && dbUser.name) || (session.email ? session.email.split('@')[0] : `user_${userId.slice(0, 5)}`);

        activeParticipants.push({
          id: userId,
          name: session.name || (dbUser && dbUser.name) || cleanUsername,
          username: cleanUsername,
          email: session.email || (dbUser && dbUser.email) || '',
          phone: session.phone || (dbUser && dbUser.phone) || '',
          role: session.role || (dbUser && dbUser.role) || 'user',
          lastSeen: session.lastSeen,
          isAttempting: Boolean(attempt),
          attemptStatus: attempt ? attempt.status : 'ONLINE',
          startedAt: attempt ? attempt.started_at : null
        });

        processedUserIds.add(userId);
      }
    }

    // 4. Also include users who have an IN_PROGRESS attempt on this quiz even if heartbeat was brief
    quizAttempts.forEach((a) => {
      const pId = String(a.participant_id);
      if (!processedUserIds.has(pId) && a.status === 'IN_PROGRESS') {
        const dbUser = userMap.get(pId);
        const username = (dbUser && dbUser.name) || (dbUser && dbUser.email ? dbUser.email.split('@')[0] : `user_${pId.slice(0, 5)}`);

        activeParticipants.push({
          id: pId,
          name: (dbUser && dbUser.name) || username,
          username: username,
          email: (dbUser && dbUser.email) || '',
          phone: (dbUser && dbUser.phone) || '',
          role: (dbUser && dbUser.role) || 'user',
          lastSeen: a.started_at || new Date().toISOString(),
          isAttempting: true,
          attemptStatus: a.status,
          startedAt: a.started_at
        });

        processedUserIds.add(pId);
      }
    });

    res.json({
      success: true,
      quizId: id,
      count: activeParticipants.length,
      users: activeParticipants
    });
  } catch (err) {
    console.error('Error fetching active users for schedule:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/schedule/:id - Delete a scheduled event
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await deleteQuizFromDB(id);
    res.json({ success: true, message: 'Scheduled event deleted successfully' });
  } catch (err) {
    console.error('Error deleting scheduled event:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
