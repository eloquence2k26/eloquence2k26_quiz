-- =============================================================================
-- ELOQUENCE '26 SYMPOSIUM MCQ / ONLINE QUIZ EXAMINATION SYSTEM
-- SEED DATA & INITIAL SETUP
-- =============================================================================

-- 1. SYSTEM SETTINGS
INSERT INTO public.system_settings (key, value)
VALUES
    ('security_config', '{
        "max_violations": 3,
        "fullscreen_required": true,
        "clipboard_monitoring": true,
        "tab_switch_monitoring": true,
        "window_blur_monitoring": true,
        "desktop_only": false,
        "auto_submit_on_expiry": true,
        "show_detailed_results": true
    }'::jsonb),
    ('event_config', '{
        "event_title": "Eloquence ''26 National Technical Symposium",
        "college_name": "Department of Computer Science & Engineering",
        "academic_year": "2025-2026",
        "contact_email": "symposium@eloquence2026.edu"
    }'::jsonb)
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;

-- 2. CREATE DEFAULT ADMIN USER (Password: 'admin123')
INSERT INTO public.users (id, email, password_hash, role, is_active)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'admin@eloquence.com',
    '$2a$10$Xn2MkXCYNMW6Pc0sYhVUReZqYXz11wVvgaDNRkpvJjvbp6sdVQLxG', -- admin123
    'ADMIN',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.profiles (id, full_name, mobile, avatar_url)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Chief Symposium Admin',
    '+91 9876543210',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.admins (id, full_name, email, admin_level)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'Chief Symposium Admin',
    'admin@eloquence.com',
    'SUPER_ADMIN'
)
ON CONFLICT (id) DO NOTHING;

-- 3. CREATE SAMPLE PARTICIPANTS (Password: 'participant123')
-- Participant 1
INSERT INTO public.users (id, email, password_hash, role, is_active)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'alex.chen@university.edu',
    '$2a$10$pEHrgO9kAXdhzEBXhdtieOtkhFUZNy.MaJ143U52ypTexumYPTg5i', -- participant123
    'PARTICIPANT',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.profiles (id, full_name, mobile)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'Alex Chen',
    '+91 9123456780'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.participants (
    id, participant_id, full_name, email, mobile, college, department, year, event, registration_number, round_1_selected
)
VALUES (
    'b0000000-0000-0000-0000-000000000001',
    'ELQ-2026-001',
    'Alex Chen',
    'alex.chen@university.edu',
    '+91 9123456780',
    'MIT Campus, Anna University',
    'Computer Science & Engineering',
    '3rd Year',
    'Technical Quiz',
    'REG-CS-8901',
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- Participant 2
INSERT INTO public.users (id, email, password_hash, role, is_active)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'priya.sharma@college.edu',
    '$2a$10$pEHrgO9kAXdhzEBXhdtieOtkhFUZNy.MaJ143U52ypTexumYPTg5i',
    'PARTICIPANT',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.profiles (id, full_name, mobile)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'Priya Sharma',
    '+91 9123456781'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.participants (
    id, participant_id, full_name, email, mobile, college, department, year, event, registration_number, round_1_selected
)
VALUES (
    'b0000000-0000-0000-0000-000000000002',
    'ELQ-2026-002',
    'Priya Sharma',
    'priya.sharma@college.edu',
    '+91 9123456781',
    'PSG College of Technology',
    'Information Technology',
    '4th Year',
    'Technical Quiz',
    'REG-IT-4421',
    FALSE
)
ON CONFLICT (id) DO NOTHING;

-- Participant 3
INSERT INTO public.users (id, email, password_hash, role, is_active)
VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'rahul.verma@tech.ac.in',
    '$2a$10$pEHrgO9kAXdhzEBXhdtieOtkhFUZNy.MaJ143U52ypTexumYPTg5i',
    'PARTICIPANT',
    TRUE
)
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.profiles (id, full_name, mobile)
VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'Rahul Verma',
    '+91 9123456782'
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.participants (
    id, participant_id, full_name, email, mobile, college, department, year, event, registration_number, round_1_selected
)
VALUES (
    'b0000000-0000-0000-0000-000000000003',
    'ELQ-2026-003',
    'Rahul Verma',
    'rahul.verma@tech.ac.in',
    '+91 9123456782',
    'SSN College of Engineering',
    'Artificial Intelligence & Data Science',
    '2nd Year',
    'Technical Quiz',
    'REG-AI-9012',
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- 4. CREATE SYMPOSIUM EVENT & ROUNDS
INSERT INTO public.events (id, title, code, description, is_active)
VALUES (
    'c0000000-0000-0000-0000-000000000001',
    'Eloquence ''26 Grand Technical Symposium',
    'ELQ26',
    'Flagship Annual National Level Symposium Quiz Competition for Engineering Scholars.',
    TRUE
)
ON CONFLICT (code) DO NOTHING;

INSERT INTO public.rounds (id, event_id, round_number, round_name, description, is_active, is_published)
VALUES
    ('d0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001', 1, 'Round 1: Screening & Core Fundamentals', 'Comprehensive MCQ screening round evaluating core CS concepts.', TRUE, TRUE),
    ('d0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001', 2, 'Round 2: Grand Finals & Advanced Mastery', 'High-stakes speed and architecture mastery for Round 1 selected finalists.', TRUE, FALSE)
ON CONFLICT (event_id, round_number) DO NOTHING;

-- 5. CREATE QUESTIONS BANK
INSERT INTO public.questions (id, question_text, option_a, option_b, option_c, option_d, correct_answer, marks, negative_marks, explanation, category, difficulty)
VALUES
    (
        'e0000000-0000-0000-0000-000000000001',
        'What is the worst-case time complexity of searching an element in a Balanced Binary Search Tree (AVL / Red-Black Tree)?',
        'O(1)',
        'O(log n)',
        'O(n)',
        'O(n log n)',
        'B',
        2.00,
        0.50,
        'In a balanced binary search tree with n nodes, the maximum height is bounded by O(log n), so search is O(log n).',
        'Data Structures',
        'Easy'
    ),
    (
        'e0000000-0000-0000-0000-000000000002',
        'Which HTTP status code represents "429"?',
        'Service Unavailable',
        'Unauthorized Access',
        'Too Many Requests',
        'Precondition Failed',
        'C',
        2.00,
        0.50,
        'HTTP 429 Too Many Requests indicates the user has sent too many requests in a given amount of time (rate limiting).',
        'Web Architecture',
        'Easy'
    ),
    (
        'e0000000-0000-0000-0000-000000000003',
        'In JavaScript, what will `console.log([] + {})` output in standard ECMA specifications?',
        '"[object Object]"',
        '"undefined"',
        'NaN',
        'TypeError',
        'A',
        2.00,
        0.50,
        'The empty array converts to empty string `""` and the object converts to `"[object Object]"`, resulting in concatenation to `"[object Object]"`.',
        'Programming Languages',
        'Medium'
    ),
    (
        'e0000000-0000-0000-0000-000000000004',
        'Which of the following database isolation levels prevents phantom reads in standard ANSI SQL?',
        'Read Committed',
        'Repeatable Read',
        'Serializable',
        'Read Uncommitted',
        'C',
        2.00,
        0.50,
        'Serializable is the highest isolation level and strictly prevents dirty reads, non-repeatable reads, and phantom reads.',
        'Database Management',
        'Medium'
    ),
    (
        'e0000000-0000-0000-0000-000000000005',
        'What is the primary objective of the TLS 1.3 0-RTT Handshake resumption?',
        'To encrypt data with symmetric RSA keys',
        'To allow client data to be sent on the first flight without round-trip delay',
        'To bypass certificate verification',
        'To compress packet payloads',
        'B',
        3.00,
        1.00,
        '0-RTT resumption allows clients to send application data immediately in the ClientHello when reconnecting to a known server.',
        'Networking & Security',
        'Hard'
    ),
    (
        'e0000000-0000-0000-0000-000000000006',
        'Which memory management concept handles the issue of external fragmentation in OS memory allocators?',
        'Paging',
        'Contiguous Partitioning',
        'Static Relocation',
        'Swapping only',
        'A',
        2.00,
        0.50,
        'Paging divides virtual and physical memory into fixed-sized blocks (pages and frames), completely eliminating external fragmentation.',
        'Operating Systems',
        'Medium'
    ),
    (
        'e0000000-0000-0000-0000-000000000007',
        'In React 18, what is the key advantage of the `useDeferredValue` hook?',
        'It converts synchronous state to Redux store',
        'It defers updating a part of the UI that is computationally heavy until critical updates render',
        'It enforces immediate DOM mutations',
        'It caches network requests automatically',
        'B',
        2.00,
        0.50,
        'useDeferredValue lets you defer updating a non-urgent part of the UI to keep input and animations smooth.',
        'Frontend Frameworks',
        'Medium'
    ),
    (
        'e0000000-0000-0000-0000-000000000008',
        'Which algorithm is commonly used for finding Strongly Connected Components (SCC) in a directed graph?',
        'Dijkstra Algorithm',
        'Tarjan or Kosaraju Algorithm',
        'Kruskal Algorithm',
        'Floyd-Warshall Algorithm',
        'B',
        3.00,
        1.00,
        'Tarjan and Kosaraju algorithms both compute strongly connected components in linear O(V + E) time.',
        'Algorithms',
        'Hard'
    )
ON CONFLICT (id) DO NOTHING;

-- 6. CREATE SAMPLE QUIZZES
INSERT INTO public.quizzes (
    id, event_id, round_id, title, description, event_name, round_number,
    total_questions, duration_minutes, start_date, start_time, end_date, end_time,
    max_marks, pass_percentage, negative_marking, negative_mark_value, max_attempts,
    status, desktop_only, fullscreen_required, max_violations, shuffle_questions, shuffle_options
)
VALUES (
    'f0000000-0000-0000-0000-000000000001',
    'c0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000001',
    'Symposium Technical Quiz – Round 1',
    'Official Round 1 Preliminary screening for all registered engineering scholars. Covers Algorithms, Web Systems, OS, and Architecture.',
    'Eloquence 2026',
    1,
    8,
    30,
    CURRENT_DATE,
    '09:00:00',
    CURRENT_DATE + INTERVAL '7 days',
    '23:59:59',
    18.00,
    40.00,
    TRUE,
    0.50,
    1,
    'Live',
    FALSE,
    TRUE,
    3,
    TRUE,
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- Round 2 Quiz
INSERT INTO public.quizzes (
    id, event_id, round_id, title, description, event_name, round_number,
    total_questions, duration_minutes, start_date, start_time, end_date, end_time,
    max_marks, pass_percentage, negative_marking, negative_mark_value, max_attempts,
    status, desktop_only, fullscreen_required, max_violations, shuffle_questions, shuffle_options
)
VALUES (
    'f0000000-0000-0000-0000-000000000002',
    'c0000000-0000-0000-0000-000000000001',
    'd0000000-0000-0000-0000-000000000002',
    'Symposium Technical Quiz – Round 2 (Grand Finals)',
    'Advanced High-Intensity Finalist Examination for selected candidates.',
    'Eloquence 2026',
    2,
    5,
    20,
    CURRENT_DATE + INTERVAL '1 day',
    '10:00:00',
    CURRENT_DATE + INTERVAL '8 days',
    '18:00:00',
    15.00,
    50.00,
    TRUE,
    1.00,
    1,
    'Scheduled',
    FALSE,
    TRUE,
    2,
    TRUE,
    TRUE
)
ON CONFLICT (id) DO NOTHING;

-- 7. MAP QUESTIONS TO QUIZ 1
INSERT INTO public.quiz_questions (quiz_id, question_id, display_order)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000001', 1),
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000002', 2),
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000003', 3),
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000004', 4),
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000005', 5),
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000006', 6),
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000007', 7),
    ('f0000000-0000-0000-0000-000000000001', 'e0000000-0000-0000-0000-000000000008', 8)
ON CONFLICT (quiz_id, question_id) DO NOTHING;

-- 8. ASSIGN PARTICIPANTS TO QUIZ 1
INSERT INTO public.quiz_assignments (quiz_id, participant_id, status)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'ASSIGNED'),
    ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000002', 'ASSIGNED'),
    ('f0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000003', 'ASSIGNED')
ON CONFLICT (quiz_id, participant_id) DO NOTHING;

-- 9. SAMPLE ANNOUNCEMENTS
INSERT INTO public.announcements (title, message, target_type)
VALUES
    ('Welcome to Eloquence ''26!', 'Please ensure you are connected to a stable high-speed internet connection and read all instructions before launching Round 1.', 'ALL'),
    ('Round 1 Active Screening', 'The Round 1 Technical Quiz is now Live! Fullscreen mode is strictly enforced.', 'ROUND_1')
ON CONFLICT DO NOTHING;
