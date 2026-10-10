-- Internship Management System - relational schema
-- One file, executed on boot. Safe to run repeatedly.

PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------- users
-- One row per login. role decides which dashboard the user lands on.
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  role          TEXT    NOT NULL CHECK (role IN ('student','recruiter','admin')),
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------- students
-- Module 1: Student Registration & Profile
CREATE TABLE IF NOT EXISTS students (
  user_id        INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  enrollment_no  TEXT    NOT NULL UNIQUE,
  phone          TEXT    NOT NULL DEFAULT '',
  branch         TEXT    NOT NULL DEFAULT 'CSE',
  division       TEXT    NOT NULL DEFAULT '',
  year           INTEGER NOT NULL DEFAULT 3,
  cgpa           REAL    NOT NULL DEFAULT 0,
  backlogs       INTEGER NOT NULL DEFAULT 0,
  location       TEXT    NOT NULL DEFAULT '',
  bio            TEXT    NOT NULL DEFAULT '',
  skills         TEXT    NOT NULL DEFAULT '[]',   -- JSON array of strings
  certifications TEXT    NOT NULL DEFAULT '[]',   -- JSON array of {name, issuer, year}
  projects       TEXT    NOT NULL DEFAULT '[]',   -- JSON array of {title, description, link}
  linkedin       TEXT    NOT NULL DEFAULT '',
  github         TEXT    NOT NULL DEFAULT '',
  resume_path    TEXT,
  resume_name    TEXT,
  updated_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- ------------------------------------------------------------ companies
-- Module 2: Company Management
CREATE TABLE IF NOT EXISTS companies (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT    NOT NULL UNIQUE,
  industry   TEXT    NOT NULL DEFAULT '',
  website    TEXT    NOT NULL DEFAULT '',
  location   TEXT    NOT NULL DEFAULT '',
  about      TEXT    NOT NULL DEFAULT '',
  hr_name    TEXT    NOT NULL DEFAULT '',
  hr_email   TEXT    NOT NULL DEFAULT '',
  verified   INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Links a recruiter login to the company they represent.
CREATE TABLE IF NOT EXISTS company_users (
  user_id    INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE
);

-- ---------------------------------------------------------- internships
-- Module 3: Internship Management + Module 4 eligibility criteria
CREATE TABLE IF NOT EXISTS internships (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  company_id       INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  title            TEXT    NOT NULL,
  description      TEXT    NOT NULL DEFAULT '',
  responsibilities TEXT    NOT NULL DEFAULT '',
  location         TEXT    NOT NULL DEFAULT '',
  work_mode        TEXT    NOT NULL DEFAULT 'onsite' CHECK (work_mode IN ('onsite','remote','hybrid')),
  duration_months  INTEGER NOT NULL DEFAULT 3,
  stipend          INTEGER NOT NULL DEFAULT 0,       -- per month, INR. 0 = unpaid
  openings         INTEGER NOT NULL DEFAULT 1,
  skills           TEXT    NOT NULL DEFAULT '[]',    -- JSON array, used for match scoring
  min_cgpa         REAL    NOT NULL DEFAULT 0,
  max_backlogs     INTEGER NOT NULL DEFAULT 99,
  allowed_branches TEXT    NOT NULL DEFAULT '[]',    -- JSON array, empty = all branches
  allowed_years    TEXT    NOT NULL DEFAULT '[]',    -- JSON array, empty = all years
  deadline         TEXT    NOT NULL,                 -- YYYY-MM-DD
  status           TEXT    NOT NULL DEFAULT 'open' CHECK (status IN ('open','closed')),
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_internships_company ON internships(company_id);
CREATE INDEX IF NOT EXISTS idx_internships_status  ON internships(status);

-- --------------------------------------------------------- applications
-- Modules 5-8: apply, shortlist, interview, select & offer
CREATE TABLE IF NOT EXISTS applications (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  internship_id      INTEGER NOT NULL REFERENCES internships(id) ON DELETE CASCADE,
  student_id         INTEGER NOT NULL REFERENCES students(user_id) ON DELETE CASCADE,
  status             TEXT    NOT NULL DEFAULT 'applied'
                     CHECK (status IN ('applied','shortlisted','interview_scheduled',
                                       'selected','rejected','offer_accepted',
                                       'offer_declined','completed')),
  cover_note         TEXT    NOT NULL DEFAULT '',
  match_score        INTEGER NOT NULL DEFAULT 0,  -- snapshot of skill match at apply time
  offer_stipend      INTEGER,
  offer_joining_date TEXT,
  offer_note         TEXT,
  applied_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT    NOT NULL DEFAULT (datetime('now')),
  UNIQUE (internship_id, student_id)
);
CREATE INDEX IF NOT EXISTS idx_applications_student    ON applications(student_id);
CREATE INDEX IF NOT EXISTS idx_applications_internship ON applications(internship_id);

-- Every status transition, so the student sees a real timeline. (Application Tracking)
CREATE TABLE IF NOT EXISTS application_events (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  from_status    TEXT,
  to_status      TEXT    NOT NULL,
  note           TEXT    NOT NULL DEFAULT '',
  actor_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_events_application ON application_events(application_id);

-- ----------------------------------------------------------- interviews
-- Module 7: Interview Management
CREATE TABLE IF NOT EXISTS interviews (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  application_id INTEGER NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  round          TEXT    NOT NULL DEFAULT 'Technical',
  scheduled_at   TEXT    NOT NULL,              -- ISO datetime
  mode           TEXT    NOT NULL DEFAULT 'online' CHECK (mode IN ('online','offline')),
  venue          TEXT    NOT NULL DEFAULT '',
  meeting_link   TEXT    NOT NULL DEFAULT '',
  notes          TEXT    NOT NULL DEFAULT '',
  outcome        TEXT    NOT NULL DEFAULT 'pending'
                 CHECK (outcome IN ('pending','passed','failed')),
  created_at     TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_interviews_application ON interviews(application_id);

-- -------------------------------------------------------- notifications
-- Module 9: Notification
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title      TEXT    NOT NULL,
  body       TEXT    NOT NULL DEFAULT '',
  link       TEXT    NOT NULL DEFAULT '',
  read       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

-- Placement-office broadcasts, visible to everyone.
CREATE TABLE IF NOT EXISTS announcements (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT    NOT NULL,
  body       TEXT    NOT NULL DEFAULT '',
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT    NOT NULL DEFAULT (datetime('now'))
);
