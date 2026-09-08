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
    events: [
      {
        id: 'c0000000-0000-0000-0000-000000000001',
        title: "Eloquence '26 National Technical Symposium",
        code: 'ELQ26',
        description: 'Flagship Annual National Level Symposium Quiz Competition for Engineering Scholars.',
        is_active: true
      }
    ],
    rounds: [
      {
        id: 'd0000000-0000-0000-0000-000000000001',
        event_id: 'c0000000-0000-0000-0000-000000000001',
        round_number: 1,
        round_name: 'Round 1: Screening & Core Fundamentals',
        description: 'Comprehensive MCQ screening round evaluating core CS concepts.',
        is_active: true,
        is_published: true
      },
      {
        id: 'd0000000-0000-0000-0000-000000000002',
        event_id: 'c0000000-0000-0000-0000-000000000001',
        round_number: 2,
        round_name: 'Round 2: Grand Finals & Advanced Mastery',
        description: 'High-stakes speed and architecture mastery for Round 1 selected finalists.',
        is_active: true,
        is_published: false
      }
    ],
    questions: [
      {
        id: 'e0000000-0000-0000-0000-000000000001',
        question_text: 'What is the worst-case time complexity of searching an element in a Balanced Binary Search Tree (AVL / Red-Black Tree)?',
        option_a: 'O(1)',
        option_b: 'O(log n)',
        option_c: 'O(n)',
        option_d: 'O(n log n)',
        correct_answer: 'B',
        marks: 2.0,
        negative_marks: 0.5,
        explanation: 'In a balanced binary search tree with n nodes, the maximum height is bounded by O(log n), so search is O(log n).',
        category: 'Data Structures',
        difficulty: 'Easy'
      },
      {
        id: 'e0000000-0000-0000-0000-000000000002',
        question_text: 'Which HTTP status code represents "Too Many Requests"?',
        option_a: '403 Forbidden',
        option_b: '408 Request Timeout',
        option_c: '429 Too Many Requests',
        option_d: '503 Service Unavailable',
        correct_answer: 'C',
        marks: 2.0,
        negative_marks: 0.5,
        explanation: 'HTTP 429 indicates that the client has sent too many requests in a given amount of time (rate limiting).',
        category: 'Web Architecture',
        difficulty: 'Easy'
      },
      {
        id: 'e0000000-0000-0000-0000-000000000003',
        question_text: 'In JavaScript, what will `console.log([] + {})` output in standard ECMAScript engines?',
        option_a: '"[object Object]"',
        option_b: '"undefined"',
        option_c: 'NaN',
        option_d: 'TypeError',
        correct_answer: 'A',
        marks: 2.0,
        negative_marks: 0.5,
        explanation: 'The empty array converts to empty string `""` and the object converts to `"[object Object]"`, resulting in concatenation to `"[object Object]"`.',
        category: 'Programming Languages',
        difficulty: 'Medium'
      },
      {
        id: 'e0000000-0000-0000-0000-000000000004',
        question_text: 'Which of the following database isolation levels strictly prevents phantom reads in standard ANSI SQL?',
        option_a: 'Read Committed',
        option_b: 'Repeatable Read',
        option_c: 'Serializable',
        option_d: 'Read Uncommitted',
        correct_answer: 'C',
        marks: 2.0,
        negative_marks: 0.5,
        explanation: 'Serializable is the highest isolation level and strictly prevents dirty reads, non-repeatable reads, and phantom reads.',
        category: 'Database Management',
        difficulty: 'Medium'
      },
      {
        id: 'e0000000-0000-0000-0000-000000000005',
        question_text: 'What is the primary architectural benefit of TLS 1.3 0-RTT Handshake resumption?',
        option_a: 'To encrypt symmetric session keys with RSA 4096',
        option_b: 'To allow client application data to be sent on the initial flight without round-trip delay',
        option_c: 'To completely bypass server certificate validation',
        option_d: 'To compress TCP headers at Layer 4',
        correct_answer: 'B',
        marks: 3.0,
        negative_marks: 1.0,
        explanation: '0-RTT resumption allows clients to send application data immediately in the ClientHello when reconnecting to a known server.',
        category: 'Networking & Security',
        difficulty: 'Hard'
      },
      {
        id: 'e0000000-0000-0000-0000-000000000006',
        question_text: 'Which memory management technique resolves external fragmentation in modern operating systems?',
        option_a: 'Paging',
        option_b: 'Contiguous Dynamic Partitioning',
        option_c: 'Static Relocation Only',
        option_d: 'Simple Swapping',
        correct_answer: 'A',
        marks: 2.0,
        negative_marks: 0.5,
        explanation: 'Paging divides memory into fixed-size physical frames and logical pages, avoiding external fragmentation.',
        category: 'Operating Systems',
        difficulty: 'Medium'
      },
      {
        id: 'e0000000-0000-0000-0000-000000000007',
        question_text: 'In React 18 Concurrent Mode, what is the primary purpose of `useDeferredValue`?',
        option_a: 'It converts components to server components',
        option_b: 'It defers re-rendering non-urgent UI subtrees during high-priority user interactions',
        option_c: 'It triggers immediate synchronous layout effects',
        option_d: 'It automatically caches REST API queries',
        correct_answer: 'B',
        marks: 2.0,
        negative_marks: 0.5,
        explanation: 'useDeferredValue lets you defer updating a part of the UI to ensure input responsiveness.',
        category: 'Frontend Frameworks',
        difficulty: 'Medium'
      },
      {
        id: 'e0000000-0000-0000-0000-000000000008',
        question_text: 'Which algorithm computes Strongly Connected Components (SCC) in a directed graph in linear O(V + E) time?',
        option_a: 'Dijkstra Algorithm',
        option_b: 'Tarjan or Kosaraju Algorithm',
        option_c: 'Kruskal Algorithm',
        option_d: 'Floyd-Warshall Algorithm',
        correct_answer: 'B',
        marks: 3.0,
        negative_marks: 1.0,
        explanation: 'Tarjan and Kosaraju algorithms both compute strongly connected components in linear O(V + E) time.',
        category: 'Algorithms',
        difficulty: 'Hard'
      }
    ],
    quizzes: [
      {
        id: 'f0000000-0000-0000-0000-000000000001',
        event_id: 'c0000000-0000-0000-0000-000000000001',
        round_id: 'd0000000-0000-0000-0000-000000000001',
        title: 'Symposium Technical Quiz – Round 1',
        description: 'Official Round 1 Preliminary screening for all registered engineering scholars. Covers Algorithms, Web Systems, OS, and Architecture.',
        event_name: 'Eloquence 2026',
        round_number: 1,
        total_questions: 8,
        duration_minutes: 30,
        start_date: new Date().toISOString().split('T')[0],
        start_time: '00:00:00',
        end_date: new Date(Date.now() + 86400000 * 14).toISOString().split('T')[0],
        end_time: '23:59:59',
        max_marks: 18.0,
        pass_percentage: 40.0,
        negative_marking: true,
        negative_mark_value: 0.5,
        max_attempts: 1,
        status: 'Live',
        desktop_only: false,
        fullscreen_required: true,
        max_violations: 3,
        shuffle_questions: true,
        shuffle_options: true,
        show_detailed_results: true,
        created_at: new Date().toISOString()
      },
      {
        id: 'f0000000-0000-0000-0000-000000000002',
        event_id: 'c0000000-0000-0000-0000-000000000001',
        round_id: 'd0000000-0000-0000-0000-000000000002',
        title: 'Symposium Technical Quiz – Round 2 (Grand Finals)',
        description: 'Advanced High-Intensity Finalist Examination for Round 1 selected candidates.',
        event_name: 'Eloquence 2026',
        round_number: 2,
        total_questions: 5,
        duration_minutes: 20,
        start_date: new Date(Date.now() + 86400000).toISOString().split('T')[0],
        start_time: '10:00:00',
        end_date: new Date(Date.now() + 86400000 * 15).toISOString().split('T')[0],
        end_time: '18:00:00',
        max_marks: 15.0,
        pass_percentage: 50.0,
        negative_marking: true,
        negative_mark_value: 1.0,
        max_attempts: 1,
        status: 'Scheduled',
        desktop_only: false,
        fullscreen_required: true,
        max_violations: 2,
        shuffle_questions: true,
        shuffle_options: true,
        show_detailed_results: true,
        created_at: new Date().toISOString()
      }
    ],
    quiz_questions: [
      { id: uuidv4(), quiz_id: 'f0000000-0000-0000-0000-000000000001', question_id: 'e0000000-0000-0000-0000-000000000001', display_order: 1 },
      { id: uuidv4(), quiz_id: 'f0000000-0000-0000-0000-000000000001', question_id: 'e0000000-0000-0000-0000-000000000002', display_order: 2 },
      { id: uuidv4(), quiz_id: 'f0000000-0000-0000-0000-000000000001', question_id: 'e0000000-0000-0000-0000-000000000003', display_order: 3 },
      { id: uuidv4(), quiz_id: 'f0000000-0000-0000-0000-000000000001', question_id: 'e0000000-0000-0000-0000-000000000004', display_order: 4 },
      { id: uuidv4(), quiz_id: 'f0000000-0000-0000-0000-000000000001', question_id: 'e0000000-0000-0000-0000-000000000005', display_order: 5 },
      { id: uuidv4(), quiz_id: 'f0000000-0000-0000-0000-000000000001', question_id: 'e0000000-0000-0000-0000-000000000006', display_order: 6 },
      { id: uuidv4(), quiz_id: 'f0000000-0000-0000-0000-000000000001', question_id: 'e0000000-0000-0000-0000-000000000007', display_order: 7 },
      { id: uuidv4(), quiz_id: 'f0000000-0000-0000-0000-000000000001', question_id: 'e0000000-0000-0000-0000-000000000008', display_order: 8 },

      { id: uuidv4(), quiz_id: 'f0000000-0000-0000-0000-000000000002', question_id: 'e0000000-0000-0000-0000-000000000003', display_order: 1 },
      { id: uuidv4(), quiz_id: 'f0000000-0000-0000-0000-000000000002', question_id: 'e0000000-0000-0000-0000-000000000004', display_order: 2 },
      { id: uuidv4(), quiz_id: 'f0000000-0000-0000-0000-000000000002', question_id: 'e0000000-0000-0000-0000-000000000005', display_order: 3 },
      { id: uuidv4(), quiz_id: 'f0000000-0000-0000-0000-000000000002', question_id: 'e0000000-0000-0000-0000-000000000007', display_order: 4 },
      { id: uuidv4(), quiz_id: 'f0000000-0000-0000-0000-000000000002', question_id: 'e0000000-0000-0000-0000-000000000008', display_order: 5 }
    ],
    quiz_assignments: [
      { id: uuidv4(), quiz_id: 'f0000000-0000-0000-0000-000000000001', participant_id: 'b0000000-0000-0000-0000-000000000001', status: 'ASSIGNED' },
      { id: uuidv4(), quiz_id: 'f0000000-0000-0000-0000-000000000001', participant_id: 'b0000000-0000-0000-0000-000000000002', status: 'ASSIGNED' },
      { id: uuidv4(), quiz_id: 'f0000000-0000-0000-0000-000000000001', participant_id: 'b0000000-0000-0000-0000-000000000003', status: 'ASSIGNED' }
    ],
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
