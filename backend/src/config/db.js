const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const supabase = require('./supabase');

const DATA_FILE = path.join(__dirname, '../../data/store.json');

// Default initial dataset
const getDefaultData = () => {
  const passwordHash = bcrypt.hashSync('admin123', 10);
  const participantHash = bcrypt.hashSync('participant123', 10);

  return {
    users: [
      {
        id: 'a0000000-0000-0000-0000-000000000001',
        email: 'admin@eloquence.com',
        password_hash: passwordHash,
        role: 'ADMIN',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'b0000000-0000-0000-0000-000000000001',
        email: 'alex.chen@university.edu',
        password_hash: participantHash,
        role: 'PARTICIPANT',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'b0000000-0000-0000-0000-000000000002',
        email: 'priya.sharma@college.edu',
        password_hash: participantHash,
        role: 'PARTICIPANT',
        is_active: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'b0000000-0000-0000-0000-000000000003',
        email: 'rahul.verma@tech.ac.in',
        password_hash: participantHash,
        role: 'PARTICIPANT',
        is_active: true,
        created_at: new Date().toISOString()
      }
    ],
    profiles: [
      {
        id: 'a0000000-0000-0000-0000-000000000001',
        full_name: 'Chief Symposium Admin',
        mobile: '+91 9876543210',
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'
      },
      {
        id: 'b0000000-0000-0000-0000-000000000001',
        full_name: 'Alex Chen',
        mobile: '+91 9123456780'
      },
      {
        id: 'b0000000-0000-0000-0000-000000000002',
        full_name: 'Priya Sharma',
        mobile: '+91 9123456781'
      },
      {
        id: 'b0000000-0000-0000-0000-000000000003',
        full_name: 'Rahul Verma',
        mobile: '+91 9123456782'
      }
    ],
    participants: [
      {
        id: 'b0000000-0000-0000-0000-000000000001',
        participant_id: 'ELQ-2026-001',
        full_name: 'Alex Chen',
        email: 'alex.chen@university.edu',
        mobile: '+91 9123456780',
        college: 'MIT Campus, Anna University',
        department: 'Computer Science & Engineering',
        year: '3rd Year',
        event: 'Technical Quiz',
        registration_number: 'REG-CS-8901',
        round_1_selected: false,
        round_2_selected: false,
        is_disabled: false,
        created_at: new Date().toISOString()
      },
      {
        id: 'b0000000-0000-0000-0000-000000000002',
        participant_id: 'ELQ-2026-002',
        full_name: 'Priya Sharma',
        email: 'priya.sharma@college.edu',
        mobile: '+91 9123456781',
        college: 'PSG College of Technology',
        department: 'Information Technology',
        year: '4th Year',
        event: 'Technical Quiz',
        registration_number: 'REG-IT-4421',
        round_1_selected: false,
        round_2_selected: false,
        is_disabled: false,
        created_at: new Date().toISOString()
      },
      {
        id: 'b0000000-0000-0000-0000-000000000003',
        participant_id: 'ELQ-2026-003',
        full_name: 'Rahul Verma',
        email: 'rahul.verma@tech.ac.in',
        mobile: '+91 9123456782',
        college: 'SSN College of Engineering',
        department: 'Artificial Intelligence & Data Science',
        year: '2nd Year',
        event: 'Technical Quiz',
        registration_number: 'REG-AI-9012',
        round_1_selected: false,
        round_2_selected: false,
        is_disabled: false,
        created_at: new Date().toISOString()
      }
    ],
    admins: [
      {
        id: 'a0000000-0000-0000-0000-000000000001',
        full_name: 'Chief Symposium Admin',
        email: 'admin@eloquence.com',
        admin_level: 'SUPER_ADMIN'
      }
    ],
    events: [],
    rounds: [],
    questions: [],
    quizzes: [],
    quiz_questions: [],
    quiz_assignments: [],
    exam_attempts: [],
    question_orders: [],
    attempt_answers: [],
    results: [],
    round_selections: [],
    security_violations: [],
    exam_sessions: [],
    announcements: [
      {
        id: 'ann-001',
        title: "Welcome to Eloquence '26 Examination Portal",
        message: 'All participants must ensure a stable internet connection and browser fullscreen permissions prior to launching an examination.',
        target_type: 'ALL',
        created_at: new Date().toISOString()
      },
      {
        id: 'ann-002',
        title: 'Round 1 MCQ Screening is LIVE',
        message: 'Round 1 is open for all registered engineering scholars. Complete your attempt within the allotted duration.',
        target_type: 'ROUND_1',
        created_at: new Date().toISOString()
      }
    ],
    audit_logs: [
      {
        id: uuidv4(),
        admin_id: 'a0000000-0000-0000-0000-000000000001',
        action: 'SYSTEM_INITIALIZATION',
        entity_type: 'SYSTEM',
        entity_id: 'ROOT',
        timestamp: new Date().toISOString(),
        metadata: { info: 'System booted with default seeds and symposium rounds.' }
      }
    ],
    system_settings: {
      max_violations: 3,
      fullscreen_required: true,
      clipboard_monitoring: true,
      tab_switch_monitoring: true,
      window_blur_monitoring: true,
      desktop_only: false,
      auto_submit_on_expiry: true,
      show_detailed_results: true
    }
  };
};

class DBStore {
  constructor() {
    this.data = getDefaultData();
    this.init();
  }

  init() {
    try {
      const dataDir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      if (fs.existsSync(DATA_FILE)) {
        const content = fs.readFileSync(DATA_FILE, 'utf8');
        this.data = JSON.parse(content);
      } else {
        this.save();
      }
    } catch (err) {
      console.warn('Local file store init notice, using memory data:', err.message);
    }
  }

  save() {
    try {
      const dataDir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(DATA_FILE, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (err) {
      console.error('Error saving local store:', err.message);
    }
  }

  get(collection) {
    return this.data[collection] || [];
  }

  set(collection, items) {
    this.data[collection] = items;
    this.save();
    return this.data[collection];
  }

  find(collection, predicate) {
    const list = this.get(collection);
    return list.find(predicate);
  }

  filter(collection, predicate) {
    const list = this.get(collection);
    return list.filter(predicate);
  }

  insert(collection, item) {
    if (!item.id) item.id = uuidv4();
    if (!item.created_at) item.created_at = new Date().toISOString();
    if (!this.data[collection]) this.data[collection] = [];
    this.data[collection].push(item);
    this.save();
    return item;
  }

  update(collection, predicate, updates) {
    const list = this.get(collection);
    const index = list.findIndex(predicate);
    if (index === -1) return null;
    list[index] = { ...list[index], ...updates, updated_at: new Date().toISOString() };
    this.save();
    return list[index];
  }

  remove(collection, predicate) {
    const list = this.get(collection);
    const initialLen = list.length;
    this.data[collection] = list.filter((item) => !predicate(item));
    this.save();
    return this.data[collection].length !== initialLen;
  }
}

const db = new DBStore();
module.exports = db;
