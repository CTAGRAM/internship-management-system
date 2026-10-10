/**
 * Demo data. Runs automatically the first time the server boots on a clean
 * database, so a fresh clone is immediately usable. Re-run by hand with:
 *   npm run seed     (only if empty)
 *   npm run reset    (wipe and rebuild)
 */
import { db } from './db.js';
import { hashPassword } from './auth.js';
import { skillMatchScore, notify } from './util.js';

// Deterministic PRNG so every clone gets the same demo database.
let seedState = 20260810;
const rand = () => ((seedState = (seedState * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (arr) => arr[Math.floor(rand() * arr.length)];
const pickMany = (arr, n) => [...arr].sort(() => rand() - 0.5).slice(0, n);
const int = (min, max) => min + Math.floor(rand() * (max - min + 1));

const daysFromNow = (d) => {
  const t = new Date();
  t.setDate(t.getDate() + d);
  return t.toISOString().slice(0, 10);
};
const hoursFromNow = (h) => {
  const t = new Date();
  t.setHours(t.getHours() + h, 0, 0, 0);
  return t.toISOString().slice(0, 16);
};
const daysAgoStamp = (d) => {
  const t = new Date();
  t.setDate(t.getDate() - d);
  return t.toISOString().slice(0, 19).replace('T', ' ');
};

const DEMO_PASSWORD = 'password123';

const BRANCHES = ['CSE', 'AI & DS', 'IT', 'ENTC', 'Mechanical'];
const DIVISIONS = ['TY FCC-1', 'TY FCC-2', 'TY FCC-3'];

const SKILL_POOL = [
  'React', 'Node.js', 'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'SQL',
  'MongoDB', 'Express', 'HTML', 'CSS', 'Tailwind CSS', 'Git', 'Docker', 'AWS',
  'Machine Learning', 'Pandas', 'NumPy', 'TensorFlow', 'Figma', 'REST API',
  'Data Structures', 'Flutter', 'Kotlin', 'Power BI', 'Excel', 'Linux',
];

const FIRST = ['Aarav','Diya','Rohan','Sneha','Arjun','Ishita','Kabir','Ananya','Vivaan','Meera',
  'Aditya','Riya','Karan','Tanvi','Nikhil','Pooja','Siddharth','Shreya','Omkar','Neha',
  'Rahul','Sanya','Yash','Prachi','Harsh','Gauri','Soham','Mitali','Varun','Aditi'];
const LAST = ['Sharma','Patil','Deshmukh','Joshi','Kulkarni','Iyer','Nair','Singh','Gupta','Mehta',
  'Bhosale','Jadhav','Chavan','Shinde','Pawar','Rao','Reddy','Agarwal','Bhanushali','Kumar'];

const COMPANIES = [
  { name: 'Persistent Systems', industry: 'Software Services', location: 'Pune', website: 'https://persistent.com',
    about: 'Global digital engineering firm headquartered in Pune, working on cloud, data and product engineering.' },
  { name: 'Infosys', industry: 'IT Consulting', location: 'Pune', website: 'https://infosys.com',
    about: 'One of India’s largest IT services companies, with a large early-careers internship programme.' },
  { name: 'Quick Heal Technologies', industry: 'Cybersecurity', location: 'Pune', website: 'https://quickheal.com',
    about: 'Cybersecurity product company building endpoint and network security for enterprises.' },
  { name: 'Bajaj Finserv', industry: 'Financial Services', location: 'Pune', website: 'https://bajajfinserv.in',
    about: 'Financial services group with a growing in-house technology and analytics division.' },
  { name: 'Zensar Technologies', industry: 'Digital Engineering', location: 'Pune', website: 'https://zensar.com',
    about: 'Digital solutions and technology services company serving global clients.' },
  { name: 'Tata Consultancy Services', industry: 'IT Services', location: 'Mumbai', website: 'https://tcs.com',
    about: 'India’s largest IT services organisation with structured internship tracks.' },
  { name: 'Nvidia Graphics', industry: 'Semiconductors / AI', location: 'Bengaluru', website: 'https://nvidia.com',
    about: 'Accelerated computing company working on GPUs, AI frameworks and autonomous systems.' },
  { name: 'Swiggy', industry: 'Consumer Internet', location: 'Bengaluru', website: 'https://swiggy.com',
    about: 'On-demand delivery platform with large-scale distributed systems and ML problems.' },
];

const POSTINGS = [
  { company: 'Persistent Systems', title: 'Full Stack Developer Intern', work_mode: 'hybrid', location: 'Pune',
    stipend: 25000, duration_months: 6, openings: 4, min_cgpa: 7.0, max_backlogs: 0,
    skills: ['React', 'Node.js', 'JavaScript', 'SQL', 'Git'],
    branches: ['CSE', 'AI & DS', 'IT'], years: [3, 4], deadlineIn: 21,
    description: 'Work alongside a product team building customer-facing web applications used by enterprise clients. You will own small features end to end, from the React UI through the Node.js service layer to the database.',
    responsibilities: 'Build and test React components\nWrite REST endpoints in Node.js/Express\nParticipate in code reviews and daily stand-ups\nFix defects reported by QA' },

  { company: 'Infosys', title: 'Software Engineering Intern', work_mode: 'onsite', location: 'Pune',
    stipend: 20000, duration_months: 6, openings: 10, min_cgpa: 6.5, max_backlogs: 1,
    skills: ['Java', 'SQL', 'Data Structures', 'Git'],
    branches: [], years: [3, 4], deadlineIn: 14,
    description: 'A structured internship covering enterprise Java development, relational databases and agile delivery practices, with a mentor assigned to every intern.',
    responsibilities: 'Complete the Java and SQL training track\nContribute to an internal delivery project\nDocument modules you work on\nPresent a capstone at the end of the term' },

  { company: 'Quick Heal Technologies', title: 'Security Research Intern', work_mode: 'onsite', location: 'Pune',
    stipend: 22000, duration_months: 4, openings: 2, min_cgpa: 7.5, max_backlogs: 0,
    skills: ['Python', 'Linux', 'C++', 'Data Structures'],
    branches: ['CSE', 'IT'], years: [4], deadlineIn: 9,
    description: 'Join the threat research team analysing malware samples and writing detection logic. Strong fundamentals in operating systems and scripting are essential.',
    responsibilities: 'Analyse malware samples in a sandbox\nWrite Python tooling for automated triage\nMaintain detection signatures\nSummarise findings in weekly reports' },

  { company: 'Bajaj Finserv', title: 'Data Analytics Intern', work_mode: 'hybrid', location: 'Pune',
    stipend: 18000, duration_months: 3, openings: 3, min_cgpa: 7.0, max_backlogs: 0,
    skills: ['Python', 'SQL', 'Pandas', 'Power BI', 'Excel'],
    branches: ['CSE', 'AI & DS', 'IT'], years: [3, 4], deadlineIn: 18,
    description: 'Support the risk analytics team with reporting, dashboards and exploratory analysis on lending data.',
    responsibilities: 'Build Power BI dashboards for business teams\nWrite SQL queries against the data warehouse\nClean and validate incoming datasets\nAutomate recurring reports in Python' },

  { company: 'Zensar Technologies', title: 'Frontend Developer Intern', work_mode: 'remote', location: 'Remote',
    stipend: 15000, duration_months: 3, openings: 5, min_cgpa: 6.0, max_backlogs: 2,
    skills: ['HTML', 'CSS', 'JavaScript', 'React', 'Tailwind CSS'],
    branches: [], years: [2, 3, 4], deadlineIn: 25,
    description: 'Build responsive interfaces for client-facing products. A good fit if you enjoy design detail and care about accessibility.',
    responsibilities: 'Translate Figma designs into responsive components\nImprove page performance and accessibility\nWrite reusable UI primitives\nCollaborate with designers on reviews' },

  { company: 'Tata Consultancy Services', title: 'Cloud Engineering Intern', work_mode: 'onsite', location: 'Mumbai',
    stipend: 21000, duration_months: 6, openings: 6, min_cgpa: 6.5, max_backlogs: 1,
    skills: ['AWS', 'Docker', 'Linux', 'Python', 'Git'],
    branches: ['CSE', 'IT', 'ENTC'], years: [3, 4], deadlineIn: 30,
    description: 'Work with the cloud migration practice, helping move client workloads onto managed infrastructure.',
    responsibilities: 'Write infrastructure automation scripts\nContainerise legacy applications\nMonitor deployments and triage alerts\nMaintain runbooks' },

  { company: 'Nvidia Graphics', title: 'Machine Learning Research Intern', work_mode: 'hybrid', location: 'Bengaluru',
    stipend: 60000, duration_months: 6, openings: 2, min_cgpa: 8.5, max_backlogs: 0,
    skills: ['Python', 'Machine Learning', 'TensorFlow', 'NumPy', 'C++'],
    branches: ['CSE', 'AI & DS'], years: [4], deadlineIn: 12,
    description: 'Research internship on model optimisation and inference performance. Expect to read papers, reproduce results and run large-scale experiments.',
    responsibilities: 'Reproduce published model results\nProfile and optimise inference pipelines\nRun ablation experiments on GPU clusters\nWrite up findings for the team' },

  { company: 'Swiggy', title: 'Backend Engineering Intern', work_mode: 'onsite', location: 'Bengaluru',
    stipend: 50000, duration_months: 6, openings: 3, min_cgpa: 8.0, max_backlogs: 0,
    skills: ['Java', 'SQL', 'Data Structures', 'REST API', 'Docker'],
    branches: ['CSE', 'IT', 'AI & DS'], years: [3, 4], deadlineIn: 16,
    description: 'Build services that handle millions of orders a day. You will work on real production systems with an assigned mentor.',
    responsibilities: 'Design and ship REST APIs\nWrite unit and integration tests\nDebug production issues with the on-call team\nImprove service latency' },

  { company: 'Persistent Systems', title: 'Mobile App Developer Intern', work_mode: 'remote', location: 'Remote',
    stipend: 18000, duration_months: 4, openings: 3, min_cgpa: 6.5, max_backlogs: 1,
    skills: ['Flutter', 'Kotlin', 'REST API', 'Git'],
    branches: ['CSE', 'IT', 'AI & DS'], years: [3, 4], deadlineIn: 20,
    description: 'Develop cross-platform mobile features for a healthcare client using Flutter.',
    responsibilities: 'Build Flutter screens from designs\nIntegrate REST APIs\nWrite widget tests\nShip builds to internal testers' },

  { company: 'Infosys', title: 'UI/UX Design Intern', work_mode: 'hybrid', location: 'Pune',
    stipend: 14000, duration_months: 3, openings: 2, min_cgpa: 6.0, max_backlogs: 2,
    skills: ['Figma', 'HTML', 'CSS'],
    branches: [], years: [2, 3, 4], deadlineIn: 28,
    description: 'Support the design system team with research, wireframes and high-fidelity mockups.',
    responsibilities: 'Run usability reviews on existing screens\nProduce wireframes and prototypes in Figma\nMaintain the component library\nHand off specs to engineering' },

  { company: 'Bajaj Finserv', title: 'QA Automation Intern', work_mode: 'onsite', location: 'Pune',
    stipend: 16000, duration_months: 3, openings: 2, min_cgpa: 6.0, max_backlogs: 2,
    skills: ['Python', 'SQL', 'Git', 'Linux'],
    branches: ['CSE', 'IT', 'ENTC'], years: [3, 4], deadlineIn: 7,
    description: 'Write automated regression tests for internal lending applications.',
    responsibilities: 'Write and maintain automated test suites\nLog and verify defects\nSupport release validation\nReport coverage metrics' },

  { company: 'Zensar Technologies', title: 'Business Analyst Intern', work_mode: 'hybrid', location: 'Pune',
    stipend: 13000, duration_months: 3, openings: 2, min_cgpa: 6.5, max_backlogs: 1,
    skills: ['Excel', 'SQL', 'Power BI'],
    branches: [], years: [3, 4], deadlineIn: -3, status: 'closed',
    description: 'Closed posting, retained for placement records and reporting.',
    responsibilities: 'Gather requirements from stakeholders\nMaintain process documentation\nPrepare reporting packs' },
];

const ANNOUNCEMENTS = [
  { title: 'Placement drive calendar for this semester is live',
    body: 'The consolidated drive calendar has been published. Students must keep their profile and resume updated before the first week of the drive. Eligibility is locked at the time of application.' },
  { title: 'Resume review workshop - Friday, 4 PM, Seminar Hall 2',
    body: 'The Training & Placement cell is running a resume clinic. Bring a printed copy. Priority will be given to final-year students appearing in the first drive.' },
  { title: 'Reminder: zero backlogs required for several core postings',
    body: 'Multiple recruiters this term have set a zero-backlog criterion. Clear pending backlogs before applying, as the system enforces eligibility automatically.' },
];

// --------------------------------------------------------------------- seed
export function seed({ reset = false } = {}) {
  if (reset) {
    // PRAGMA has to be its own statement, outside the exec batch, to take effect.
    db.pragma('foreign_keys = OFF');
    db.exec(`
      DELETE FROM application_events; DELETE FROM interviews; DELETE FROM applications;
      DELETE FROM internships; DELETE FROM company_users; DELETE FROM companies;
      DELETE FROM notifications; DELETE FROM announcements;
      DELETE FROM students; DELETE FROM users;
      DELETE FROM sqlite_sequence;`);
    db.pragma('foreign_keys = ON');
    seedState = 20260810;
  }

  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)',
  );
  const pw = hashPassword(DEMO_PASSWORD);

  // ------------------------------------------------------- placement office
  const adminId = Number(
    insertUser.run('Dr. Rajani Sajjan', 'tpo@mitadt.edu.in', pw, 'admin').lastInsertRowid,
  );

  // --------------------------------------------------- companies + recruiters
  const companyIds = {};
  for (const c of COMPANIES) {
    const slug = c.name.toLowerCase().replace(/[^a-z]+/g, '').slice(0, 14);
    const hrName = `${pick(FIRST)} ${pick(LAST)}`;
    const hrEmail = `hr@${slug}.com`;
    const id = Number(
      db
        .prepare(
          `INSERT INTO companies (name, industry, website, location, about, hr_name, hr_email, verified)
           VALUES (?,?,?,?,?,?,?,1)`,
        )
        .run(c.name, c.industry, c.website, c.location, c.about, hrName, hrEmail).lastInsertRowid,
    );
    companyIds[c.name] = id;

    const recruiterId = Number(insertUser.run(hrName, hrEmail, pw, 'recruiter').lastInsertRowid);
    db.prepare('INSERT INTO company_users (user_id, company_id) VALUES (?, ?)').run(recruiterId, id);
  }

  // ------------------------------------------------------------- the 4 authors
  // The project team from the synopsis, as real logins.
  const team = [
    { name: 'Bhaskar Kumar',     enroll: 'ADT24SOCB0314', div: 'TY FCC-3', email: 'bhaskar.kumar@mitadt.edu.in' },
    { name: 'Arman Singh',       enroll: 'ADT24SOCB0201', div: 'TY FCC-2', email: 'arman.singh@mitadt.edu.in' },
    { name: 'Ayush',             enroll: 'ADT24SOCB0291', div: 'TY FCC-3', email: 'ayush@mitadt.edu.in' },
    { name: 'Diksha Bhanushali', enroll: 'ADT24SOCB0376', div: 'TY FCC-3', email: 'diksha.bhanushali@mitadt.edu.in' },
  ];

  const studentIds = [];
  const addStudent = ({ name, email, enroll, div, branch, year, cgpa, backlogs, skills }) => {
    const uid = Number(insertUser.run(name, email, pw, 'student').lastInsertRowid);
    db.prepare(
      `INSERT INTO students (user_id, enrollment_no, phone, branch, division, year, cgpa, backlogs,
         location, bio, skills, certifications, projects, linkedin, github)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    ).run(
      uid, enroll, `9${int(100000000, 999999999)}`, branch, div, year, cgpa, backlogs,
      'Pune, Maharashtra',
      `${year === 4 ? 'Final' : 'Third'}-year ${branch} student at MIT School of Computing. Interested in ${skills.slice(0, 2).join(' and ')}.`,
      JSON.stringify(skills),
      JSON.stringify(
        pickMany(
          [
            { name: 'AWS Cloud Practitioner', issuer: 'Amazon Web Services', year: 2025 },
            { name: 'Google Data Analytics', issuer: 'Coursera', year: 2025 },
            { name: 'Meta Front-End Developer', issuer: 'Coursera', year: 2024 },
            { name: 'NPTEL Data Structures', issuer: 'NPTEL', year: 2025 },
          ],
          int(0, 2),
        ),
      ),
      JSON.stringify(
        pickMany(
          [
            { title: 'Campus Event Portal', description: 'Full-stack portal for managing college events and registrations.', link: '' },
            { title: 'Handwriting Recognition', description: 'CNN model trained on the EMNIST dataset, 94% test accuracy.', link: '' },
            { title: 'Expense Tracker App', description: 'Cross-platform expense tracker with offline sync.', link: '' },
            { title: 'Library Management System', description: 'CRUD system with role-based access and overdue reporting.', link: '' },
          ],
          int(1, 2),
        ),
      ),
      `https://linkedin.com/in/${name.toLowerCase().replace(/[^a-z]+/g, '-')}`,
      `https://github.com/${name.toLowerCase().replace(/[^a-z]+/g, '')}`,
    );
    studentIds.push(uid);
    return uid;
  };

  for (const t of team) {
    addStudent({
      ...t, div: t.div, branch: 'CSE', year: 3,
      cgpa: Number((7.4 + rand() * 1.8).toFixed(2)),
      backlogs: 0,
      skills: pickMany(SKILL_POOL, int(6, 9)),
    });
  }

  // ----------------------------------------------------- the rest of the cohort
  const used = new Set(team.map((t) => t.email));
  for (let i = 0; i < 34; i += 1) {
    const name = `${pick(FIRST)} ${pick(LAST)}`;
    let email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}@mitadt.edu.in`;
    let n = 1;
    while (used.has(email)) email = `${name.toLowerCase().replace(/[^a-z]+/g, '.')}${++n}@mitadt.edu.in`;
    used.add(email);

    addStudent({
      name, email,
      enroll: `ADT24SOCB${String(400 + i).padStart(4, '0')}`,
      div: pick(DIVISIONS),
      branch: pick(BRANCHES),
      year: rand() > 0.35 ? 3 : 4,
      cgpa: Number((5.8 + rand() * 3.8).toFixed(2)),
      backlogs: rand() > 0.82 ? int(1, 3) : 0,
      skills: pickMany(SKILL_POOL, int(4, 9)),
    });
  }

  // ------------------------------------------------------------- internships
  const internshipIds = [];
  for (const p of POSTINGS) {
    const companyId = companyIds[p.company];
    const creator = db
      .prepare('SELECT user_id FROM company_users WHERE company_id = ? LIMIT 1')
      .get(companyId);
    const id = Number(
      db
        .prepare(
          `INSERT INTO internships
            (company_id, title, description, responsibilities, location, work_mode,
             duration_months, stipend, openings, skills, min_cgpa, max_backlogs,
             allowed_branches, allowed_years, deadline, status, created_by, created_at)
           VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
        )
        .run(
          companyId, p.title, p.description, p.responsibilities, p.location, p.work_mode,
          p.duration_months, p.stipend, p.openings, JSON.stringify(p.skills),
          p.min_cgpa, p.max_backlogs, JSON.stringify(p.branches), JSON.stringify(p.years),
          daysFromNow(p.deadlineIn), p.status || 'open', creator?.user_id ?? adminId,
          daysAgoStamp(int(3, 40)),
        ).lastInsertRowid,
    );
    internshipIds.push(id);
  }

  // ------------------------------------------------------------ applications
  /** Creates one application with its event trail, interview and offer. */
  const createApplication = (internship, student, status, appliedDaysAgo) => {
    const appliedAt = daysAgoStamp(appliedDaysAgo);
    const info = db
      .prepare(
        `INSERT OR IGNORE INTO applications
          (internship_id, student_id, status, cover_note, match_score, applied_at, updated_at)
         VALUES (?,?,?,?,?,?,?)`,
      )
      .run(
        internship.id, student.user_id, status,
        'I am keen to work on this role and believe my coursework and projects line up well with what the team needs.',
        skillMatchScore(student, internship), appliedAt, appliedAt,
      );
    // On a skipped INSERT OR IGNORE, lastInsertRowid still holds a previous
    // row's id -- `changes` is the only reliable signal that we inserted.
    if (info.changes === 0) return null; // this student already applied
    const appId = Number(info.lastInsertRowid);

    const trail = {
      applied: ['applied'],
      shortlisted: ['applied', 'shortlisted'],
      interview_scheduled: ['applied', 'shortlisted', 'interview_scheduled'],
      selected: ['applied', 'shortlisted', 'interview_scheduled', 'selected'],
      rejected: ['applied', 'shortlisted', 'rejected'],
      offer_accepted: ['applied', 'shortlisted', 'interview_scheduled', 'selected', 'offer_accepted'],
    }[status] || ['applied', status];

    const NOTES = {
      applied: 'Application submitted',
      shortlisted: 'Profile shortlisted by the recruiter',
      interview_scheduled: 'Interview round scheduled',
      selected: 'Candidate selected',
      rejected: 'Not shortlisted for the next round',
      offer_accepted: 'Offer accepted by the student',
    };

    let prev = null;
    trail.forEach((stage, idx) => {
      db.prepare(
        `INSERT INTO application_events (application_id, from_status, to_status, note, actor_id, created_at)
         VALUES (?,?,?,?,?,?)`,
      ).run(
        appId, prev, stage, NOTES[stage] ?? '', adminId,
        daysAgoStamp(Math.max(0, appliedDaysAgo - idx * 2)),
      );
      prev = stage;
    });

    if (['interview_scheduled', 'selected', 'offer_accepted'].includes(status)) {
      const online = internship.work_mode !== 'onsite';
      db.prepare(
        `INSERT INTO interviews (application_id, round, scheduled_at, mode, venue, meeting_link, notes, outcome)
         VALUES (?,?,?,?,?,?,?,?)`,
      ).run(
        appId,
        pick(['Technical', 'Technical', 'HR', 'Managerial']),
        status === 'interview_scheduled' ? hoursFromNow(int(12, 240)) : hoursFromNow(-int(24, 360)),
        online ? 'online' : 'offline',
        online ? '' : 'Campus Placement Cell, Block B',
        online ? 'https://meet.google.com/ims-demo-link' : '',
        'Bring a printed copy of your resume and a government ID.',
        status === 'interview_scheduled' ? 'pending' : 'passed',
      );
    }

    if (['selected', 'offer_accepted'].includes(status)) {
      db.prepare(
        'UPDATE applications SET offer_stipend = ?, offer_joining_date = ?, offer_note = ? WHERE id = ?',
      ).run(
        internship.stipend, daysFromNow(int(20, 60)),
        'Offer letter will be shared over email by the HR team.', appId,
      );
    }
    return appId;
  };

  const allInternships = db.prepare('SELECT * FROM internships').all();
  const isEligible = (s, i) => {
    const br = JSON.parse(i.allowed_branches);
    const yr = JSON.parse(i.allowed_years);
    return (
      s.cgpa >= i.min_cgpa && s.backlogs <= i.max_backlogs &&
      (!br.length || br.includes(s.branch)) && (!yr.length || yr.includes(s.year))
    );
  };

  // The four project authors get a deliberate spread of stages, so the demo
  // logins show a full pipeline instead of whatever the shuffle produced.
  const SCRIPT = {
    ADT24SOCB0314: ['interview_scheduled', 'shortlisted', 'applied', 'selected', 'rejected'],
    ADT24SOCB0201: ['offer_accepted', 'shortlisted', 'applied'],
    ADT24SOCB0291: ['applied', 'rejected', 'shortlisted'],
    ADT24SOCB0376: ['shortlisted', 'interview_scheduled', 'applied', 'applied'],
  };
  for (const [enroll, stages] of Object.entries(SCRIPT)) {
    const student = db.prepare('SELECT * FROM students WHERE enrollment_no = ?').get(enroll);
    const options = allInternships.filter((i) => isEligible(student, i) && i.status === 'open');
    stages.forEach((status, idx) => {
      const internship = options[idx % options.length];
      if (internship) createApplication(internship, student, status, 22 - idx * 4);
    });
  }

  // Everyone else fills the pipeline out so the reports have real volume.
  const STAGES = [
    'applied', 'applied', 'applied', 'shortlisted', 'shortlisted',
    'interview_scheduled', 'interview_scheduled', 'selected', 'rejected', 'offer_accepted',
  ];
  const allStudents = db.prepare('SELECT * FROM students').all();
  for (const internship of allInternships) {
    const candidates = allStudents.filter((s) => isEligible(s, internship));
    for (const s of pickMany(candidates, Math.min(candidates.length, int(3, 9)))) {
      createApplication(internship, s, pick(STAGES), int(1, 25));
    }
  }

  // ----------------------------------------------------------- announcements
  for (const a of ANNOUNCEMENTS) {
    db.prepare('INSERT INTO announcements (title, body, created_by) VALUES (?,?,?)')
      .run(a.title, a.body, adminId);
  }

  // A couple of unread notifications for the demo student accounts.
  for (const t of team.slice(0, 2)) {
    const u = db.prepare('SELECT id FROM users WHERE email = ?').get(t.email);
    notify(u.id, 'Resume review workshop on Friday',
      'The Training & Placement cell is running a resume clinic in Seminar Hall 2 at 4 PM.', '/announcements');
  }

  const count = (t) => db.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n;
  return {
    users: count('users'), students: count('students'), companies: count('companies'),
    internships: count('internships'), applications: count('applications'),
    interviews: count('interviews'),
  };
}

/** Seeds only when the database is empty. Called on every server boot. */
export function ensureSeed() {
  const { n } = db.prepare('SELECT COUNT(*) n FROM users').get();
  if (n > 0) return null;
  console.log('  Empty database detected - loading demo data...');
  const stats = seed();
  console.log(`  Seeded ${stats.students} students, ${stats.companies} companies, ` +
              `${stats.internships} internships, ${stats.applications} applications.`);
  return stats;
}

// Run directly: `node src/seed.js [--reset]`
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  const reset = process.argv.includes('--reset');
  const existing = db.prepare('SELECT COUNT(*) n FROM users').get().n;
  if (existing > 0 && !reset) {
    console.log(`Database already has ${existing} users. Use "npm run reset" to wipe and reseed.`);
  } else {
    const stats = seed({ reset });
    console.log('Seeded:', stats);
    console.log(`\nDemo logins (password: ${DEMO_PASSWORD})`);
    console.log('  Placement officer  tpo@mitadt.edu.in');
    console.log('  Student            bhaskar.kumar@mitadt.edu.in');
    console.log('  Recruiter          see companies table, e.g. hr@persistentsy.com');
  }
}
