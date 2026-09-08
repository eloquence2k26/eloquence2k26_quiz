import express from 'express';
import { supabase } from '../config/supabase.js';
import { 
  getQuizzesFromDB, 
  getQuizByIdFromDB,
  insertQuizToDB, 
  updateQuizInDB, 
  deleteQuizFromDB,
  getUsersFromDB,
  allowLateJoinInDB,
  revokeLateJoinInDB,
  checkLateJoinPermission,
  getLateJoinPermissionsForQuiz,
  lateJoinCache
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
 * Automatically starts / marks event as 'Published' when start time has arrived!
 */
const computeStatus = (quiz) => {
  if (!quiz) return 'Scheduled';

  const now = new Date();
  const start = quiz.start_date_time || quiz.start_time ? new Date(quiz.start_date_time || quiz.start_time) : null;
  const end = quiz.end_date_time || quiz.end_time ? new Date(quiz.end_date_time || quiz.end_time) : null;

  // If window has closed
  if (end && now > end) {
    return 'Closed';
  }

  // Auto-start: If current time has reached or passed the scheduled start time
  if (start && now >= start && (!end || now <= end)) {
    return 'Published';
  }

  // If manually started / published
  if (quiz.status === 'Published' || quiz.status === 'Live') {
    return 'Published';
  }

  if (quiz.status === 'Closed') return 'Closed';
  if (quiz.status === 'Draft') return 'Draft';
  return 'Scheduled';
};

// Periodic auto-start worker: Automatically updates DB status to 'Published' when start time arrives
setInterval(async () => {
  try {
    const quizzes = await getQuizzesFromDB();
    const now = new Date();

    for (const q of quizzes) {
      if (q.status === 'Scheduled') {
        const start = q.start_date_time || q.start_time ? new Date(q.start_date_time || q.start_time) : null;
        const end = q.end_date_time || q.end_time ? new Date(q.end_date_time || q.end_time) : null;

        if (start && now >= start && (!end || now <= end)) {
          console.log(`⏱️ [Auto-Start] Scheduled time reached for "${q.title}". Automatically publishing!`);
          await updateQuizInDB(q.id, { status: 'Published' });
        }
      }
    }
  } catch (err) {
    console.error('Error in schedule auto-start background worker:', err);
  }
}, 10000);

// GET /api/schedule - Fetch all scheduled events
router.get('/', async (req, res) => {
  try {
    const quizzes = await getQuizzesFromDB();
    const now = new Date();
    
    // Enrich with computed status and active participant count
    const enriched = await Promise.all(quizzes.map(async (q) => {
      let liveStatus = computeStatus(q);

      // If scheduled time has arrived but DB still says Scheduled, update DB to Published
      if (liveStatus === 'Published' && q.status === 'Scheduled') {
        updateQuizInDB(q.id, { status: 'Published' }).catch(() => {});
      }
      
      // Count participants currently taking this quiz or active
      let activeAttendeesCount = 0;
      for (const [, session] of activeSessions.entries()) {
        if (Date.now() - session.lastSeenTimestamp <= 90000 && String(session.currentQuizId) === String(q.id)) {
          activeAttendeesCount++;
        }
      }

      return {
        ...q,
        start_date_time: q.start_date_time || q.start_time || '',
        end_date_time: q.end_date_time || q.end_time || '',
        duration: parseInt(q.duration, 10) || 30,
        computedStatus: liveStatus,
        activeAttendeesCount
      };
    }));

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
    let quizAttempts = [];
    if (supabase) {
      try {
        const { data: attData } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('quiz_id', id);
        quizAttempts = attData || [];
      } catch (e) {
        quizAttempts = [];
      }
    }

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

    // 5. Check 5-Minute Joining Window for Event
    const quiz = await getQuizByIdFromDB(id);
    const startTime = quiz ? new Date(quiz.start_date_time || quiz.start_time).getTime() : 0;
    const isStarted = startTime > 0 && now >= startTime;
    const joinWindowEnd = startTime + 5 * 60 * 1000;
    const isJoinWindowClosed = isStarted && now > joinWindowEnd;
    const secondsRemaining = isStarted && !isJoinWindowClosed ? Math.max(0, Math.floor((joinWindowEnd - now) / 1000)) : 0;

    // 6. Enrich each participant with late-joining status
    const enrichedParticipants = await Promise.all(
      activeParticipants.map(async (attendee) => {
        const hasStarted = Boolean(attendee.isAttempting && attendee.attemptStatus !== 'NOT_STARTED');
        const lateAllowed = await checkLateJoinPermission(id, [attendee.id, attendee.email, attendee.phone]);
        const isLateLocked = isJoinWindowClosed && !hasStarted && !lateAllowed;

        return {
          ...attendee,
          hasStarted,
          lateAllowed,
          isLateLocked,
          minutesLate: isJoinWindowClosed ? Math.ceil((now - joinWindowEnd) / 60000) : 0
        };
      })
    );

    res.json({
      success: true,
      quizId: id,
      count: enrichedParticipants.length,
      users: enrichedParticipants,
      joinWindow: {
        isStarted,
        isJoinWindowClosed,
        secondsRemaining,
        joinWindowDurationMinutes: 5,
        startTime: startTime ? new Date(startTime).toISOString() : null,
        joinWindowEnd: startTime ? new Date(joinWindowEnd).toISOString() : null
      },
      lateJoinAllowedAll: lateJoinCache.has(`${id}__ALL`)
    });
  } catch (err) {
    console.error('Error fetching active users for schedule:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/schedule/:id/allow-late-join - Admin permits late entry for participant or ALL
router.post('/:id/allow-late-join', async (req, res) => {
  try {
    const { id } = req.params;
    const { participantId, adminMessage } = req.body;
    const result = await allowLateJoinInDB(id, participantId || 'ALL', adminMessage);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/schedule/:id/revoke-late-join - Admin revokes late entry
router.post('/:id/revoke-late-join', async (req, res) => {
  try {
    const { id } = req.params;
    const { participantId } = req.body;
    const result = await revokeLateJoinInDB(id, participantId || 'ALL');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/schedule/:id/late-permissions - Get list of late-permitted participants
router.get('/:id/late-permissions', async (req, res) => {
  try {
    const { id } = req.params;
    const permissions = await getLateJoinPermissionsForQuiz(id);
    res.json({
      success: true,
      permissions,
      allowedAll: lateJoinCache.has(`${id}__ALL`)
    });
  } catch (err) {
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
