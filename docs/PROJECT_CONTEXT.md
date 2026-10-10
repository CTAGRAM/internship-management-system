# Internship Management System — Complete Project Context

> **Purpose of this document.** A single self-contained briefing on this codebase: what it is,
> what it is built from, how every part works, why each decision was made, and what is
> deliberately missing. It is written to be handed to a person or to another AI assistant with no
> prior knowledge of the project, so that they can work on it immediately without reading the
> source first. Nothing here assumes access to the conversation that produced it.

| | |
| --- | --- |
| **Repository** | <https://github.com/CTAGRAM/internship-management-system> (public, MIT) |
| **Live demo** | <https://ims-mitadt.vercel.app> |
| **Default branch** | `main` |
| **Document revised** | 11 October 2026 |

---

## Table of contents

1. [What this project is](#1-what-this-project-is)
2. [Origin and requirements](#2-origin-and-requirements)
3. [Tech stack](#3-tech-stack)
4. [Architecture](#4-architecture)
5. [Repository layout](#5-repository-layout)
6. [Database schema](#6-database-schema)
7. [Authentication and authorization](#7-authentication-and-authorization)
8. [Core algorithms](#8-core-algorithms)
9. [Complete API reference](#9-complete-api-reference)
10. [Frontend architecture](#10-frontend-architecture)
11. [Design system](#11-design-system)
12. [Seed data](#12-seed-data)
13. [Running the project](#13-running-the-project)
14. [Deployment](#14-deployment)
15. [Testing](#15-testing)
16. [Design decisions and trade-offs](#16-design-decisions-and-trade-offs)
17. [Known limitations](#17-known-limitations)
18. [Bugs found and fixed during development](#18-bugs-found-and-fixed-during-development)
19. [How to extend it](#19-how-to-extend-it)
20. [Code conventions](#20-code-conventions)

---

## 1. What this project is

A web application that runs a college's internship and placement process end to end, for three
kinds of user:

- **Students** — build a profile, browse verified openings, see instantly whether they qualify for
  each one and why, apply, track every application through the pipeline, attend interviews, accept
  or decline offers.
- **Recruiters** — register a company, post openings with eligibility criteria, review applicants
  on a drag-and-drop board, schedule interviews, record selections and offers.
- **Placement officers (admin)** — oversee students, companies, postings and every application;
  broadcast announcements; read analytics; export records as CSV.

The pipeline a single application moves through is the spine of the whole system:

```
applied ──► shortlisted ──► interview_scheduled ──► selected ──► offer_accepted ──► completed
   │              │                   │                │
   └──────────────┴───────────────────┴──► rejected    └──► offer_declined
```

Every transition is appended to an event log, which is what renders the student's progress
timeline and the placement officer's activity feed.

### Scale of the codebase

| Area | Lines |
| --- | --- |
| `server/src` (API, schema, seed) | ~2,440 |
| `web/src` (React app) | ~5,240 |
| `server/test` | ~194 |
| **Total tracked code** | **~8,000** |

73 tracked files. Three production dependencies on the frontend, six on the backend.

---

## 2. Origin and requirements

This implements a Project-Based Learning submission for **MIT School of Computing, MIT ADT
University, Pune**, Department of Computer Science & Engineering.

- **Group ID:** TYCC306
- **Guide:** Dr. Rajani Sajjan
- **Semester:** Sem 1, A.Y. 2026-27

| Enrolment No. | Name | Division |
| --- | --- | --- |
| ADT24SOCB0201 | Arman Singh | TY FCC-2 |
| ADT24SOCB0376 | Diksha Bhanushali | TY FCC-3 |
| ADT24SOCB0291 | Ayush | TY FCC-3 |
| ADT24SOCB0314 | Bhaskar Kumar | TY FCC-3 |

The source material was a project synopsis and a poster. The synopsis specified ten modules; all
ten are implemented. The table below maps each to its location in the code — **this mapping is the
most useful thing in this document for anyone asked to modify a specific feature.**

| # | Synopsis module | Backend | Frontend |
| --- | --- | --- | --- |
| 1 | Student Registration & Profile | `routes/auth.js`, `routes/students.js` | `pages/Register.tsx`, `pages/student/Profile.tsx` |
| 2 | Company Management | `routes/companies.js` | `pages/admin/Companies.tsx` (incl. `CompanyProfile`) |
| 3 | Internship Management | `routes/internships.js` | `pages/recruiter/Postings.tsx` |
| 4 | Eligibility & Recommendation | `util.js` → `evaluateEligibility`, `skillMatchScore` | `pages/student/Internships.tsx` |
| 5 | Application Management | `routes/applications.js` | `pages/student/Applications.tsx` |
| 6 | Shortlisting | `routes/applications.js` → `PATCH /:id/status`, `/bulk/status` | `pages/recruiter/Pipeline.tsx`, `pages/shared/ApplicationsTable.tsx` |
| 7 | Interview Management | `routes/interviews.js` | `pages/shared/Interviews.tsx`, `ScheduleModal` in `Pipeline.tsx` |
| 8 | Selection & Offer | `routes/applications.js` (offer columns) | `ApplicationDetail` in `pages/student/Applications.tsx` |
| 9 | Notification | `util.js` → `notify`, `routes/notifications.js` | `NotificationBell` in `components/Shell.tsx`, `pages/shared/Announcements.tsx` |
| 10 | Dashboard & Reporting | `routes/reports.js` | `pages/admin/Dashboard.tsx`, `pages/admin/Reports.tsx` |

### Block diagram from the source poster

```
Student Registration & Login
          ↓
  Browse Internship Listings
          ↓
Apply Online & Upload Documents ──► Central Database
          ↓
Company Shortlists & Schedules Interview
          ↓
Placement Confirmed & Record Updated
```

---

## 3. Tech stack

### Backend

| Package | Version | Role |
| --- | --- | --- |
| `express` | 4.22.x | HTTP server and routing |
| `better-sqlite3` | 12.11.x | Synchronous SQLite driver |
| `jsonwebtoken` | 9.0.x | JWT signing and verification |
| `bcryptjs` | 2.4.x | Password hashing |
| `multer` | 1.4.5-lts | Multipart resume uploads |
| `cors` | 2.8.x | Cross-origin headers for dev |

Node.js **18+**, ES modules throughout (`"type": "module"`).

### Frontend

| Package | Version | Role |
| --- | --- | --- |
| `react`, `react-dom` | 18.3.x | UI runtime |
| `react-router-dom` | 6.30.x | Client-side routing |
| `typescript` | 5.9.x | Strict-mode type checking |
| `vite` | 5.4.x | Dev server and bundler |
| `tailwindcss` | 3.4.x | Styling |
| `postcss`, `autoprefixer` | — | Tailwind build chain |

**Three runtime dependencies total.** No component library, no state manager, no data-fetching
library, no charting library. Each of those was considered and rejected as unnecessary at this
size — see [§16](#16-design-decisions-and-trade-offs).

### Why these choices

- `bcryptjs` over `bcrypt`, and `better-sqlite3` over a server-based driver, because both install
  from pure JS or prebuilt binaries. **No compiler toolchain is needed on the user's machine.**
  This was verified before committing to the stack.
- `better-sqlite3` is synchronous, which suits a request-scoped SQL workload and removes all
  `async`/`await` noise from the route handlers.
- Vite over Create React App for build speed (a full production build takes roughly 1–4 seconds).

### Build output

| Asset | Raw | Gzipped |
| --- | --- | --- |
| JS bundle | ~305 KB | ~86 KB |
| CSS bundle | ~44 KB | ~8 KB |

---

## 4. Architecture

### One app, two entry points

The Express application is **constructed** in `server/src/app.js` and **exported**. Two thin
wrappers decide how it is served:

| Entry | Used by | Behaviour |
| --- | --- | --- |
| `server/src/index.js` | `npm start`, Docker, any normal host | Calls `app.listen(PORT)`. Also serves the built frontend from `web/dist`, so one process answers both the API and the UI on a single port. |
| `api/index.js` | Vercel | `export { default } from '../server/src/app.js'`. An Express app *is* a `(req, res)` handler, so Vercel runs it directly as a serverless function. Vercel's CDN serves `web/dist`, so the static-file block is skipped. |

This split exists only because of Vercel. Adding it required no change to any route.

### Request flow (production, single host)

```
Browser
  │
  ├── GET /  /internships  /admin/...   ─► express.static(web/dist)
  │                                        └─ unmatched paths fall back to index.html (SPA routing)
  │
  └── /api/*  ─► cors
                └─ express.json
                   └─ readToken ....... decodes the Bearer JWT into req.user (never rejects)
                      └─ route handler
                         ├─ requireAuth / requireRole ... 401 / 403
                         ├─ better-sqlite3 queries (synchronous)
                         └─ res.json
                            └─ error middleware ......... HttpError → { error: "..." }
```

### Request flow (Vercel)

```
Browser
  ├── static assets, index.html ─► Vercel CDN (web/dist)
  └── /api/*                    ─► serverless function (api/index.js → app.js)
                                    └─ SQLite in /tmp, reseeded on cold start
```

### Two deliberate architectural properties

**1. Authorization is enforced in the data layer, not the UI.** Every list endpoint narrows its
own SQL by role. A recruiter's `GET /api/internships` appends `WHERE i.company_id = ?` server-side.
There is no endpoint that returns another company's data and relies on the frontend to hide it.

**2. Status changes are an append-only log.** `applications.status` holds the current state, but
every transition also inserts into `application_events`. The timeline and activity feed read the
log, not the column, so history is never lost.

---

## 5. Repository layout

```
internship-management-system/
├── api/
│   └── index.js                 # Vercel serverless entry (8 lines, re-exports the app)
├── server/
│   ├── package.json
│   ├── src/
│   │   ├── app.js               # Builds and exports the Express app
│   │   ├── index.js             # Listens on a port (normal server entry)
│   │   ├── db.js                # SQLite connection, path resolution, parseJson helper
│   │   ├── schema.sql           # Full schema; executed on every boot, idempotent
│   │   ├── auth.js              # hashPassword, signToken, readToken, requireRole, companyIdFor
│   │   ├── util.js              # HttpError, wrap, eligibility, match score, notify, toCsv
│   │   ├── seed.js              # Deterministic demo data; ensureSeed() runs on boot
│   │   └── routes/
│   │       ├── auth.js          # register, login, me
│   │       ├── students.js      # profile CRUD, resume upload/download
│   │       ├── companies.js     # company CRUD
│   │       ├── internships.js   # posting CRUD, candidate board
│   │       ├── applications.js  # apply, status changes, bulk actions, withdraw
│   │       ├── interviews.js    # scheduling
│   │       ├── notifications.js # inbox and announcements
│   │       └── reports.js       # dashboards and CSV exports
│   ├── test/
│   │   ├── eligibility.test.js  # 17 tests on the eligibility and scoring rules
│   │   └── demo-logins.test.js  # 2 tests pinning the sign-in page to the seed
│   ├── data/                    # SQLite file — git-ignored, created on first run
│   └── uploads/                 # Resumes — git-ignored
├── web/
│   ├── index.html
│   ├── vite.config.ts           # Dev proxy /api → :4000
│   ├── tailwind.config.js       # Design tokens
│   ├── tsconfig.json            # strict, noUnusedLocals, noUnusedParameters
│   └── src/
│       ├── main.tsx             # Mount; applies saved theme before first paint
│       ├── App.tsx              # Router and route guards
│       ├── index.css            # CSS variables for light/dark, component classes
│       ├── lib/
│       │   ├── api.ts           # fetch wrapper, token storage, CSV download
│       │   ├── auth.tsx         # AuthProvider, useAuth, homeFor
│       │   ├── types.ts         # Shared TypeScript interfaces
│       │   ├── format.ts        # Currency, dates, status labels, avatar colours
│       │   └── useAsync.ts      # Data-fetching and debounce hooks
│       ├── components/
│       │   ├── ui.tsx           # Button, Field, Input, Modal, Badge, Tabs, Toaster…
│       │   ├── Shell.tsx        # Sidebar, mobile drawer, notifications, theme toggle
│       │   ├── Charts.tsx       # Funnel, grouped bars, bar list, trend area, stat tile
│       │   ├── StatusPill.tsx   # Status chip and four-step pipeline stepper
│       │   └── icons.tsx        # 23 inline SVG icons on a 20×20 grid
│       └── pages/
│           ├── Login.tsx · Register.tsx
│           ├── student/         # Dashboard, Internships, Applications, Profile
│           ├── recruiter/       # Dashboard, Postings, Pipeline
│           ├── admin/           # Dashboard, Students, Companies, Reports
│           └── shared/          # ApplicationsTable, Interviews, Announcements
├── docs/
│   ├── PROJECT_CONTEXT.md       # This file
│   └── screenshots/
├── Dockerfile · docker-compose.yml · .dockerignore
├── vercel.json · .vercelignore
├── .env.example · .gitignore · LICENSE · README.md
└── package.json                 # npm workspaces, top-level scripts
```

The repo is an **npm workspaces monorepo** with two packages, `@ims/server` and `@ims/web`. A
single `npm install` at the root installs both.

---

## 6. Database schema

Ten tables. Full definition with comments in `server/src/schema.sql`, executed on every boot and
safe to re-run (`CREATE TABLE IF NOT EXISTS` throughout). `PRAGMA foreign_keys = ON` is set on
every connection; WAL journaling is enabled.

```
users ──┬── students ───────────┐
        │                       ├── applications ──┬── application_events
        └── company_users       │                  └── interviews
                 │              │
            companies ─── internships

notifications (→ users)        announcements (→ users)
```

### `users` — 6 columns
`id`, `name`, `email` (unique, `COLLATE NOCASE`), `password_hash`, `role`, `created_at`
`role` is constrained to `'student' | 'recruiter' | 'admin'`.

### `students` — 18 columns
`user_id` (PK, FK → users), `enrollment_no` (unique), `phone`, `branch`, `division`, `year`,
`cgpa`, `backlogs`, `location`, `bio`, `skills`, `certifications`, `projects`, `linkedin`,
`github`, `resume_path`, `resume_name`, `updated_at`

`skills` is a JSON array of strings. `certifications` is `[{name, issuer, year}]`. `projects` is
`[{title, description, link}]`. SQLite has no array type; these are `TEXT` columns decoded by
`parseJson`.

### `companies` — 10 columns
`id`, `name` (unique), `industry`, `website`, `location`, `about`, `hr_name`, `hr_email`,
`verified`, `created_at`

### `company_users` — 2 columns
`user_id` (PK), `company_id`. Join table linking a recruiter login to the company they represent.
**This is the row every recruiter authorization check depends on** — `companyIdFor(userId)`.

### `internships` — 19 columns
`id`, `company_id`, `title`, `description`, `responsibilities`, `location`, `work_mode`,
`duration_months`, `stipend`, `openings`, `skills`, `min_cgpa`, `max_backlogs`,
`allowed_branches`, `allowed_years`, `deadline`, `status`, `created_by`, `created_at`

`work_mode` ∈ `onsite | remote | hybrid`. `status` ∈ `open | closed`. `stipend` is monthly INR
(0 = unpaid). `deadline` is `YYYY-MM-DD`. `allowed_branches` and `allowed_years` are JSON arrays
where **an empty array means "no restriction"** — a distinction the eligibility code relies on.

### `applications` — 11 columns
`id`, `internship_id`, `student_id`, `status`, `cover_note`, `match_score`, `offer_stipend`,
`offer_joining_date`, `offer_note`, `applied_at`, `updated_at`

`UNIQUE (internship_id, student_id)` prevents duplicate applications at the database level.
`match_score` is snapshotted at apply time so later profile edits do not rewrite history.
Offer details are columns here rather than a separate table, deliberately — see [§16](#16-design-decisions-and-trade-offs).

### `application_events` — 7 columns
`id`, `application_id`, `from_status`, `to_status`, `note`, `actor_id`, `created_at`
Append-only. One row per transition.

### `interviews` — 10 columns
`id`, `application_id`, `round`, `scheduled_at`, `mode`, `venue`, `meeting_link`, `notes`,
`outcome`, `created_at`
`mode` ∈ `online | offline`. `outcome` ∈ `pending | passed | failed`.

### `notifications` — 7 columns
`id`, `user_id`, `title`, `body`, `link`, `read`, `created_at`

### `announcements` — 5 columns
`id`, `title`, `body`, `created_by`, `created_at`

### Indexes

`idx_internships_company`, `idx_internships_status`, `idx_applications_student`,
`idx_applications_internship`, `idx_events_application`, `idx_interviews_application`,
`idx_notifications_user` (composite on `user_id, read`).

---

## 7. Authentication and authorization

### Mechanism

- Passwords hashed with **bcryptjs, 10 rounds**.
- Login returns a **JWT** carrying `{ id, role, email }`, expiring in **7 days**, signed with
  `JWT_SECRET` (falls back to a development value when unset).
- The client stores it in `localStorage` under `ims.token` and sends `Authorization: Bearer <token>`.
- A `401` response from any call clears the token and redirects to `/login` — handled centrally in
  `web/src/lib/api.ts`, not in each page.

### Middleware

| Function | Behaviour |
| --- | --- |
| `readToken` | Decodes the Bearer token and populates `req.user`. **Never rejects** — an invalid or absent token simply leaves the request anonymous. |
| `requireAuth` | 401 unless `req.user` is set. |
| `requireRole(...roles)` | 401 if anonymous, 403 if the role is not in the list. |
| `companyIdFor(userId)` | Looks up a recruiter's `company_id`, used by every ownership check. |

### The authorization rules, in full

| Actor | Can read | Can write |
| --- | --- | --- |
| **Student** | Own profile, own applications, own interviews, own notifications, all open internships, all companies | Own profile and resume; create applications; withdraw an application **only while `status = 'applied'`**; accept/decline an offer **only while `status = 'selected'`** |
| **Recruiter** | Own company only: its postings, their applicants (incl. student profiles and resumes), their interviews | Own company's postings and applications; schedule interviews; set any status **except** `offer_accepted` / `offer_declined` |
| **Admin** | Everything | Everything, plus companies, announcements, CSV exports, and the `verified` flag |

Three rules worth knowing because they are easy to break when editing:

1. **Only a student may set `offer_accepted` or `offer_declined`.** Staff attempting it get a 400.
   Conversely a student may set *only* those two.
2. **Only an admin may set `companies.verified`.** A recruiter editing their own company has that
   field silently preserved rather than rejected.
3. **Recruiters are scoped by `company_users`, not by `internships.created_by`.** An admin can
   create a posting on a company's behalf and that company's recruiters still manage it.

---

## 8. Core algorithms

### 8.1 Eligibility — `evaluateEligibility(student, internship)`

In `server/src/util.js`. Returns:

```js
{ eligible: boolean, reasons: string[], matchScore: number, matchedSkills: string[] }
```

Five criteria, each producing a human-readable reason when it fails:

| Criterion | Failure message |
| --- | --- |
| `student.cgpa >= internship.min_cgpa` | `Requires CGPA 7.00 (yours is 6.50)` |
| `student.backlogs <= internship.max_backlogs` | `Requires zero active backlogs` / `Allows at most N backlog(s), you have M` |
| branch in `allowed_branches` (empty = all) | `Open to CSE, IT only` |
| year in `allowed_years` (empty = all) | `Open to year 3, 4 only` |
| posting open and deadline not past | `This posting is closed` / `The application deadline has passed` |

**It collects every failing reason, not just the first.** This is intentional: a student sees the
complete picture rather than fixing one problem and discovering another.

**It runs in two places.** Once to decorate the browsing list, and again inside
`POST /api/applications` before the insert. The second is the one that matters — the UI can be
bypassed, the API cannot.

### 8.2 Skill matching — `skillMatchScore(student, internship)`

Percentage of the posting's required skills present on the student's profile, case-insensitive.
A posting with no listed skills scores 100 for everyone. Drives the "best match" sort for
students and the default ordering of the recruiter's candidate board.

### 8.3 Status transitions — `logStatusChange` and `notify`

Every status write does three things in one transaction:

1. `UPDATE applications SET status = ?, updated_at = datetime('now')`
2. `INSERT INTO application_events (...)` recording from, to, note and actor
3. `notify(...)` the counterparty — the student when staff act, the recruiters when a student
   responds to an offer

Scheduling an interview advances the application to `interview_scheduled` automatically.

### 8.4 Fan-out notification on a new posting

`POST /api/internships` loads every student and runs `evaluateEligibility` against each, notifying
only those who qualify. Fine at a college's scale (hundreds of students), but it is O(students) on
a synchronous request — see [§17](#17-known-limitations).

### 8.5 Chart colour selection

The categorical palette — blue `#2a78d6`, orange `#eb6834`, aqua `#1baf7a` — was chosen by running
a colour-separation validator rather than by eye. It clears all-pairs colour-blind (ΔE ≥ 8) and
normal-vision (ΔE ≥ 15) separation thresholds in both themes. The funnel uses a single-hue ordinal
blue ramp (`#86b6ef → #5598e7 → #2a78d6 → #1c5cab`) with monotone lightness. Aqua measures 2.74:1
against the light surface, below the 3:1 threshold, so **every bar carries a visible value label**
as the compensating measure.

---

## 9. Complete API reference

Base path `/api`. All endpoints require `Authorization: Bearer <token>` except `/auth/register`,
`/auth/login`, `/companies/public` and `/health`. Errors are always `{ "error": "message" }` with
an appropriate status.

### Health
| Method | Path | Notes |
| --- | --- | --- |
| `GET` | `/health` | `{ ok, service, storage, time }`. `storage` is `"persistent"` or `"ephemeral (demo)"` — the frontend reads this to decide whether to show the demo banner. |

### Authentication
| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| `POST` | `/auth/register` | public | Body: `name`, `email`, `password` (min 6), `role` (`student`\|`recruiter`). Students also send `enrollment_no`, `branch`, `division`, `year`, `cgpa`. Recruiters send `company_id` **or** `company_name` (creates it). Returns `{ token, user }`. |
| `POST` | `/auth/login` | public | Returns `{ token, user }`. |
| `GET` | `/auth/me` | any | `{ user, student? , company? }` depending on role. |

### Students
| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| `GET` | `/students` | admin, recruiter | Filters: `q`, `branch`, `year`, `minCgpa`. |
| `GET` | `/students/:id` | self, staff | |
| `PUT` | `/students/:id` | self, admin | Partial update; omitted fields keep their value. |
| `POST` | `/students/:id/resume` | self | `multipart/form-data`, field `resume`. PDF/DOC/DOCX, 5 MB max. Replaces and deletes the previous file. |
| `GET` | `/students/:id/resume` | self, staff | Streams the file as a download. |

### Companies
| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| `GET` | `/companies` | any | Includes `internship_count`, `application_count`, `selected_count`. |
| `GET` | `/companies/public` | **public** | `id` and `name` only, for the signup dropdown. |
| `GET` | `/companies/:id` | any | |
| `POST` | `/companies` | admin | |
| `PUT` | `/companies/:id` | admin, own recruiter | `verified` is admin-only. |
| `DELETE` | `/companies/:id` | admin | Cascades to postings and applications. |

### Internships
| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| `GET` | `/internships` | any | Filters: `q`, `mode`, `location`, `status`, `companyId`, `minStipend`, `eligibleOnly`, `sort` (`recent`\|`deadline`\|`stipend`\|`match`). **For students every row is decorated with `eligible`, `reasons`, `matchScore`, `matchedSkills`, `applicationId`, `applicationStatus`.** Recruiters are force-scoped to their own company. |
| `GET` | `/internships/:id` | any | Same decoration. |
| `POST` | `/internships` | recruiter, admin | Notifies every eligible student. |
| `PUT` | `/internships/:id` | owner, admin | |
| `DELETE` | `/internships/:id` | owner, admin | |
| `GET` | `/internships/:id/candidates` | owner, admin | `{ internship, candidates[] }` — the board payload, ordered by match score then apply date. |

### Applications
| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| `GET` | `/applications` | any | Scoped by role. Filters: `status`, `internshipId`, `q`. |
| `GET` | `/applications/:id` | own, staff | Includes `timeline[]` and `interviews[]`. |
| `POST` | `/applications` | student | Body: `internship_id`, `cover_note?`. **Re-checks eligibility and 400s with the reasons.** 409 on duplicate. |
| `PATCH` | `/applications/:id/status` | staff; student for offers | Body: `status`, `note?`, `offer_stipend?`, `offer_joining_date?`, `offer_note?`. |
| `PATCH` | `/applications/bulk/status` | recruiter, admin | Body: `ids[]`, `status`, `note?`. Returns `{ updated }`. |
| `DELETE` | `/applications/:id` | own (while `applied`), admin | Withdraw. |

### Interviews
| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| `GET` | `/interviews` | any | Scoped by role. `upcoming=true` filters to future. |
| `POST` | `/interviews` | recruiter, admin | Requires `application_id`, `scheduled_at`; `meeting_link` if online, `venue` if offline. Advances the application. |
| `PUT` | `/interviews/:id` | owner, admin | Re-notifies on a changed time. |
| `DELETE` | `/interviews/:id` | owner, admin | |

### Notifications and announcements
| Method | Path | Role | Notes |
| --- | --- | --- | --- |
| `GET` | `/notifications` | any | `{ items[], unread }`, newest 100. |
| `PATCH` | `/notifications/:id/read` | any | |
| `PATCH` | `/notifications/read-all` | any | |
| `GET` | `/notifications/announcements/all` | any | |
| `POST` | `/notifications/announcements` | admin | `audience`: `all` \| `students` \| `recruiters`. Fans out notifications. |

### Reports
| Method | Path | Role | Returns |
| --- | --- | --- | --- |
| `GET` | `/reports/summary` | admin | `totals`, `funnel`, `byStatus`, `byBranch`, `byCompany`, `topSkills`, `recentActivity`, `applicationsOverTime` |
| `GET` | `/reports/recruiter` | recruiter | `totals`, `perPosting` |
| `GET` | `/reports/student` | student | `totals`, `byStatus` |
| `GET` | `/reports/export/:kind` | admin | CSV. `kind` ∈ `applications` \| `placements` \| `students` \| `internships` |

---

## 10. Frontend architecture

### Routing and guards

`App.tsx` declares every route. A `<Protected roles={[...]}>` wrapper handles three cases in
order: still restoring the session → full-page loader; not signed in → redirect to `/login`;
wrong role → redirect to that role's home. Only then does it render inside `<Shell>`.

`homeFor(role)` maps `student → /dashboard`, `recruiter → /recruiter`, `admin → /admin`.

| Path | Roles |
| --- | --- |
| `/login`, `/register` | public (signed-in users are redirected away) |
| `/dashboard`, `/internships`, `/internships/:id`, `/applications`, `/applications/:id`, `/profile` | student |
| `/recruiter`, `/company`, `/candidates` | recruiter |
| `/postings`, `/pipeline/:id` | recruiter, admin |
| `/admin`, `/admin/students`, `/admin/companies`, `/admin/internships`, `/admin/applications`, `/admin/reports` | admin |
| `/interviews`, `/announcements` | all three |

### State management

There is none, by design. Three mechanisms cover everything:

1. **`AuthProvider`** (React context) — the only global state: `user`, `student`, `company`,
   `loading`, plus `login`, `register`, `logout`, `refresh`.
2. **`useAsync(fn, deps)`** — a ~50-line hook returning `{ data, error, loading, reload, setData }`.
   Guards against out-of-order responses with a run counter and against post-unmount writes with an
   `alive` ref. Every page fetches with this.
3. **`useState`** — local UI state.

No Redux, Zustand, React Query or SWR. At this size they would be more machinery than the problem
needs.

### The API client (`lib/api.ts`)

A ~77-line `fetch` wrapper exposing `get`, `post`, `put`, `patch`, `del` and `download`. It
attaches the bearer token, sets JSON headers (skipped automatically for `FormData`), parses errors
into `ApiError`, and centrally handles the 401-logout. `get` takes a params object and serialises
it, dropping empty values so filter state maps cleanly onto query strings.

### Notable UI behaviours

- **Notification polling** every 30 s in `Shell.tsx`. A failed poll is swallowed so a transient
  network error never breaks the page.
- **Search debouncing** at 250 ms via `useDebounced`.
- **Optimistic-free updates** — mutations call the API then `reload()`. Simpler than optimistic
  updates and fast enough at this scale.
- **Toasts** via a module-level `toast.success/error/info` that a mounted `<Toaster>` registers a
  handler for. Avoids threading a context through every component.
- **The pipeline board** supports both native HTML5 drag-and-drop and explicit "Advance"/reject
  buttons. The buttons are not a fallback — they are the accessible, touch-friendly path, since
  HTML5 DnD does not work on touch devices.

---

## 11. Design system

### Colour tokens

All colour is CSS custom properties on `:root` and `.dark` in `index.css`, surfaced to Tailwind in
`tailwind.config.js` with the `<alpha-value>` syntax. Light/dark swap in one place.

| Token | Light | Dark |
| --- | --- | --- |
| `--surface` | `252 252 251` | `20 22 28` |
| `--surface-raised` | `255 255 255` | `29 32 40` |
| `--surface-sunken` | `245 245 243` | `15 17 22` |
| `--ink` | `15 23 42` | `244 244 245` |
| `--ink-muted` | `82 81 78` | `180 182 190` |
| `--ink-subtle` | `128 128 124` | `134 137 146` |
| `--line` | `229 229 225` | `45 49 59` |

Brand palettes: **navy** 50–950 (primary, `navy-800 #16244a` drawn from the university poster) and
**gold** 50–900 (accent). Chart series are separate tokens, stepped per theme.

### Theme handling

`main.tsx` applies the saved theme **before React mounts**, so there is no flash of the wrong
theme. Preference order: `localStorage['ims.theme']` → `prefers-color-scheme` → light. Tailwind is
in `darkMode: 'class'`.

### Component inventory (`ui.tsx`)

`Button` (5 variants × 3 sizes, loading spinner), `Field`, `Input`, `Textarea`, `Select`,
`TagInput` (comma/Enter chips with suggestions), `Badge` (7 tones), `Avatar` (deterministic colour
per name), `Modal` (Escape, scroll lock, bottom-sheet on mobile), `Toaster`, `EmptyState`,
`Skeleton`, `ErrorState`, `Tabs`, `Progress`.

### Accessibility decisions

- **Status is never colour alone.** Every `StatusPill` carries a coloured dot *and* its text label.
- **Charts** ship legends for ≥2 series plus direct value labels; the branch chart is also
  mirrored by a data table on the Reports page.
- **Focus rings** use `:focus-visible`, so keyboard users get them and mouse users do not.
- **`aria-label`** on every icon-only control; `role="dialog"` + `aria-modal` on modals;
  `sr-only` text on the pipeline stepper stating the stage in words.
- **Responsive to 375 px** — sidebar becomes a drawer, tables drop columns progressively
  (`hidden sm:table-cell` etc.), the kanban scrolls horizontally, the profile page gets a sticky
  save bar.

---

## 12. Seed data

`server/src/seed.js`. **Deterministic** — a hand-rolled linear-congruential PRNG seeded with a
constant, so every clone produces an identical database.

`ensureSeed()` runs on every boot and does nothing unless `users` is empty.

| Entity | Count |
| --- | --- |
| Users | 47 (1 admin, 8 recruiters, 38 students) |
| Companies | 8 |
| Internships | 12 (11 open, 1 closed) |
| Applications | 81 |
| Application events | 186 |
| Interviews | 25 |
| Announcements | 3 |

Companies are real Pune/Bengaluru employers (Persistent Systems, Infosys, Quick Heal, Bajaj
Finserv, Zensar, TCS, Nvidia, Swiggy) with plausible postings, stipends ₹13,000–₹60,000, and
varied eligibility bars.

The **four project authors are seeded as real student logins** with scripted, deliberately varied
application stages, so each demo account shows a different slice of the pipeline rather than
whatever the shuffle produced.

### Demo accounts — password `password123` for all

| Role | Email |
| --- | --- |
| Placement Officer | `tpo@mitadt.edu.in` |
| Student | `bhaskar.kumar@mitadt.edu.in` |
| Recruiter | `hr@persistentsyst.com` |

Other students: `arman.singh@`, `ayush@`, `diksha.bhanushali@` `mitadt.edu.in`.
Other recruiters follow `hr@<company-slug>.com` where the slug is the lowercased company name
stripped of non-letters and **truncated to 14 characters** — hence `hr@persistentsyst.com` and
`hr@tataconsultanc.com`. This truncation is cosmetically odd; it is pinned by a test
(`demo-logins.test.js`) because it previously caused a broken demo button.

Seeding cost is dominated by a **single** bcrypt call — the hash is computed once and reused for
all 47 users, which is why a full seed takes ~280 ms rather than several seconds.

---

## 13. Running the project

Requires **Node.js 18+**. Nothing else — no database server, no Docker, no API keys.

```bash
git clone https://github.com/CTAGRAM/internship-management-system.git
cd internship-management-system
npm install
npm start           # → http://localhost:4000
```

| Command | Effect |
| --- | --- |
| `npm start` | Build the frontend, then serve API + UI on one port |
| `npm run dev` | API (4000) + Vite with HMR (5173), proxied |
| `npm run build` | Build the frontend into `web/dist` |
| `npm run seed` | Load demo data if the database is empty |
| `npm run reset` | Wipe and reload demo data |
| `npm test` | Run the test suite |

### Environment variables

Every value has a working default; the app runs with no `.env` at all.

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `4000` | Server port |
| `JWT_SECRET` | a development value | **Set in production.** Signs tokens |
| `DB_PATH` | `server/data/ims.db` | SQLite file location |
| `DATA_DIR` | `server/data` | Overrides the data directory |
| `UPLOAD_DIR` | `server/uploads` | Overrides the upload directory |
| `NODE_ENV` | `development` | Standard flag |

### Docker

```bash
docker compose up --build     # → http://localhost:4000
```

Named volumes persist `server/data` and `server/uploads`.

---

## 14. Deployment

### Vercel (the live demo)

`vercel.json` sets `buildCommand: npm run build`, `outputDirectory: web/dist`, declares
`api/index.js` as a function with `includeFiles: "server/src/**"` (needed because `schema.sql` is
read with `fs` and would otherwise not be traced into the bundle), and rewrites `/api/(.*)` to the
function ahead of an SPA catch-all that excludes `/assets/`.

> **⚠️ The Vercel deployment is a demo, not a persistent instance.**
>
> Serverless functions get a read-only project directory and an ephemeral `/tmp`. `db.js` detects
> this via `process.env.VERCEL` (or `AWS_LAMBDA_FUNCTION_NAME`), relocates the database and uploads
> to `/tmp`, and reseeds on cold start. Writes are real and immediate but vanish when the instance
> recycles, and two concurrent instances do not share data. The health endpoint reports
> `storage: "ephemeral (demo)"` and the UI shows a dismissible banner saying so.

Current state of the deployment:

- Deployed from the **Vercel CLI**, not from a Git integration — the Vercel account has no GitHub
  login connection, so **pushes to `main` do not auto-deploy**. Connect GitHub in Vercel account
  settings to enable that; until then redeploy with `vercel deploy --prod`.
- **Deployment Protection was disabled** so the URL is publicly reachable. It is on by default on
  this account.
- `JWT_SECRET` is set for production and preview.
- `ims-mitadt.vercel.app` is a manual alias and **must be re-pointed after each deploy**:
  `vercel alias set <new-deployment-url> ims-mitadt.vercel.app`.

### Persistent hosting (recommended for real use)

Any Node host with a writable disk works with **zero code changes** — Render, Railway, Fly.io, a
VPS, or the Docker image. Run `npm install && npm start` and mount a volume at `server/data` and
`server/uploads`.

### Making Vercel durable

Would require replacing SQLite with a network database. Lowest-friction option is **Turso**
(libSQL, SQLite-compatible, HTTP) — mostly a driver swap plus making the data layer async.
**Postgres** (Neon/Vercel Postgres) is more work: `datetime('now')` → `now()`,
`INSERT OR IGNORE` → `ON CONFLICT DO NOTHING`, `AUTOINCREMENT` → `GENERATED`/`SERIAL`, integer
booleans → `boolean`, and JSON `TEXT` columns → `jsonb`.

---

## 15. Testing

```bash
npm test     # 19 tests, node:test, no framework
```

| File | Covers |
| --- | --- |
| `eligibility.test.js` (17) | Each eligibility criterion in isolation; the "report every reason" behaviour; empty-list-means-all semantics; deadline and closed-posting rules; skill scoring incl. case-insensitivity, no-overlap, no-required-skills, and already-decoded arrays; `isPast`; CSV escaping of commas and quotes |
| `demo-logins.test.js` (2) | Reads the demo addresses out of `Login.tsx`, seeds a throwaway database, asserts each exists and that the three cover one of each role |

The second file exists because the demo-login bug ([§18](#18-bugs-found-and-fixed-during-development))
was invisible to type checking and to every other test. It was verified to fail when the old
address is restored.

**Not covered:** HTTP route handlers, authorization middleware, and React components. See
[§17](#17-known-limitations).

---

## 16. Design decisions and trade-offs

### SQLite instead of MongoDB or MySQL — the one deviation from the synopsis

The synopsis named MongoDB or MySQL. This uses SQLite: still a real relational database with the
same schema, foreign keys and SQL, but living in a file rather than a server process.

**Why:** `npm install && npm start` then works on any machine with no setup. No database to
install, no service to start, no connection string, nothing to fail during a demo or an
evaluation. For a project whose main audience is an evaluator cloning it once, that reliability
outweighs matching the synopsis literally.

**Cost:** single-writer concurrency (fine at this scale), and it does not survive on serverless
hosts. Every query is ordinary SQL in `routes/`, so a port is a driver swap plus dialect fixes.

### Three frontend dependencies

No component library, state manager, data-fetching library or charting library.

- **Component library** — the app needs ~15 components. `ui.tsx` is ~370 lines and exactly fits
  the design tokens.
- **State manager** — one context plus `useState` covers it.
- **Data fetching** — `useAsync` is ~50 lines and handles the race and unmount cases that actually
  matter here.
- **Charting** — Recharts or Chart.js would add 50–150 KB gzipped for five chart types.
  `Charts.tsx` is ~300 lines of SVG, and hand-rolling made the accessibility requirements
  (direct labels, validated palette) straightforward rather than a fight with defaults.

This is a deliberate trade: less code and a 86 KB bundle, against having to maintain the
primitives. At a larger scale the calculus reverses.

### Offer details as columns, not a table

`offer_stipend`, `offer_joining_date` and `offer_note` live on `applications`. An application has
at most one offer, so a separate table would add a join and a nullable relationship for no gain.
If offer *revisions* ever need tracking, promote it to a table then.

### Status both as a column and an event log

`applications.status` is denormalised against `application_events`. The column keeps the common
query (filter by status) a single indexed lookup; the log keeps history. The write path updates
both in one transaction, so they cannot diverge.

### Eligibility computed, not stored

Scores and eligibility are computed per request rather than cached, because they depend on a
student profile that changes. `match_score` *is* snapshotted onto the application at apply time —
that one is a historical record, not a live value.

### Synchronous database driver

`better-sqlite3` is synchronous, which in Node blocks the event loop. For a college-scale
workload with sub-millisecond local queries this is a non-issue and removes all async plumbing
from the routes. It would be the wrong choice under real concurrency.

---

## 17. Known limitations

Honest list of what is missing or weak. **Read this before promising a stakeholder anything.**

### Functional gaps
- **No password reset** and no email verification. There is no outbound email at all.
- **Notifications are in-app only.** The synopsis listed email/SMS as future scope; it remains so.
- **No pagination anywhere.** Every list endpoint returns the full result set. Fine at hundreds of
  rows, not at tens of thousands.
- **No file-content validation.** Resume uploads are checked by MIME type and size, not scanned.
- **No rate limiting** on login or any other endpoint.
- **No audit log** for admin actions (only application status changes are logged).
- **No soft deletes.** Deleting a company cascades to its postings and applications.
- **Interview conflicts are not detected** — two interviews can be scheduled at the same time for
  the same student.
- **`internship.openings` is not enforced.** More candidates can be marked `selected` than there
  are seats.

### Technical debt
- **`POST /api/internships` is O(students).** It loads every student and evaluates eligibility
  synchronously to fan out notifications. At a few thousand students this request gets slow; it
  should move to a queue or a set-based SQL query.
- **No HTTP-layer tests.** Routes and authorization middleware are covered only by manual
  verification. The authorization rules in [§7](#7-authentication-and-authorization) are the
  highest-value thing to add tests for.
- **No component tests.**
- **JWTs cannot be revoked** before their 7-day expiry — there is no denylist.
- **Token in `localStorage`** is readable by any XSS. An httpOnly cookie would be safer; this was
  chosen for simplicity and because the API is stateless.
- **`db.exec(schema.sql)` on every boot** is idempotent but there is **no migration system**.
  Changing a column type means editing the schema and resetting, which is fine pre-release and
  not fine afterwards.
- **The seed's email slug truncates at 14 characters**, producing `hr@persistentsyst.com` and
  similar. Cosmetic, but now pinned by a test.

### Deployment
- The Vercel demo is ephemeral and does not auto-deploy on push (both covered in
  [§14](#14-deployment)).

---

## 18. Bugs found and fixed during development

Recorded because each was silent — no crash, no type error, no failing test — and the same classes
of mistake are easy to reintroduce.

### 1. Every skill match score was 100%

`parseJson` received values that route code had **already decoded** into arrays. `JSON.parse` on an
array throws, the `catch` returned the `[]` fallback, and `skillMatchScore` treats "no required
skills" as a 100% match. Every posting therefore showed a perfect match.

**Fix:** `parseJson` now passes non-string values straight through. A regression test asserts the
helpers work on both raw and shaped rows.

### 2. Application events attached to the wrong record

The seed used `INSERT OR IGNORE ... .lastInsertRowid` to skip duplicate applications. When SQLite
*ignores* a row, `lastInsertRowid` still holds a **previous** statement's id rather than 0, so
duplicate applications silently wrote their event trail, interview and offer onto an unrelated
application. It surfaced only as a foreign-key error once ordering changed.

**Fix:** check `info.changes === 0`, which is the only reliable signal that nothing was inserted.

### 3. The Recruiter demo login was broken

The sign-in page and README advertised `hr@persistentsy.com`, but the seed derives recruiter emails
from a 14-character slug, producing `hr@persistentsyst.com`. The one-click Recruiter button failed
with "Incorrect email or password" in production.

**Fix:** corrected both references and added `demo-logins.test.js`, which parses the addresses out
of `Login.tsx` and asserts each exists in a freshly seeded database.

### 4. `PRAGMA foreign_keys = OFF` had no effect inside a batch

`npm run reset` issued the pragma as the first statement of a multi-statement `db.exec`, where it
does not take effect in time, so the deletes hit foreign-key constraints.

**Fix:** issue the pragma as its own `db.pragma()` call either side of the batch.

### 5. The funnel chart was unreadable in a narrow column

Fixed-width labels left roughly 60 px for the bars in a two-of-five grid column.

**Fix:** restructured to put labels above full-width bars.

---

## 19. How to extend it

### Add a field to the student profile
1. `server/src/schema.sql` — add the column with a default (so existing rows stay valid).
2. `routes/students.js` — add it to the `UPDATE` in `PUT /:id`.
3. `web/src/lib/types.ts` — add it to the `Student` interface.
4. `web/src/pages/student/Profile.tsx` — add a `<Field>`.
5. `npm run reset` to rebuild the demo database.

### Add an eligibility criterion
1. `server/src/util.js` — add the check inside `evaluateEligibility` with a clear failure message.
2. `schema.sql` — add the backing column on `internships`.
3. `routes/internships.js` — accept it in `POST` and `PUT`.
4. `web/src/pages/recruiter/Postings.tsx` — add it to the criteria fieldset.
5. Add a test in `eligibility.test.js`. The existing ones are a template.

### Add a role
`users.role` has a `CHECK` constraint — widen it. Then: `homeFor` in `lib/auth.tsx`, the `NAV` map
in `Shell.tsx`, the route guards in `App.tsx`, and every `requireRole` call that should include it.
**Audit each list endpoint's scoping clause** — that is where a new role most easily leaks data.

### Add a report
Add a query to `routes/reports.js` (`/summary` for admin), extend `AdminSummary` in `types.ts`,
render it in `pages/admin/Dashboard.tsx`. For a new CSV, add an entry to the `queries` map in
`/export/:kind` and to the `EXPORTS` array in `pages/admin/Reports.tsx`.

### Port to PostgreSQL
1. Replace `better-sqlite3` with `pg`; make `db.js` export an async query function.
2. `await` every call site — all queries are in `routes/`.
3. Dialect fixes: `datetime('now')` → `now()`, `INSERT OR IGNORE` → `ON CONFLICT DO NOTHING`,
   `AUTOINCREMENT` → `GENERATED ALWAYS AS IDENTITY`, `substr(x,1,10)` → `to_char`, integer
   booleans → `boolean`, JSON `TEXT` → `jsonb` (and drop `parseJson`).
4. Move resume storage to object storage (S3, Vercel Blob) — the filesystem assumption in
   `routes/students.js` is the other thing that blocks serverless.

### Add email notifications
`notify()` in `util.js` is the single choke point for every user-facing notification. Add the
email send there and every existing trigger is covered at once.

---

## 20. Code conventions

Follow these when editing, for consistency with what is there.

### Both sides
- **ES modules**, named exports preferred; default exports for React pages and the Express app.
- **Comments explain *why*, not *what*.** Non-obvious decisions are commented; self-evident code
  is not.
- **User-facing strings are full sentences with terminal punctuation**, phrased as plain English
  (`"You have already applied to this internship."`), never error codes.

### Backend
- One file per resource under `routes/`.
- Every handler wrapped in `wrap()` so rejections reach the error middleware.
- Failures throw `new HttpError(status, message)` rather than calling `res.status().json()`.
- Multi-step writes go in `db.transaction(() => { ... })()`.
- SQL lives in template literals in the route that uses it; shared `SELECT` shapes are hoisted to
  a file-level constant (`SELECT_APPLICATION`, `WITH_COUNTS`).
- Row → API shaping goes through a local `shape()` that decodes JSON columns.

### Frontend
- **TypeScript strict**, plus `noUnusedLocals` and `noUnusedParameters`. The build fails on unused
  variables, so clean up as you go.
- Shared types in `lib/types.ts`, mirroring the API response shape.
- Styling is Tailwind utilities; repeated patterns become a class in `index.css`
  (`.card`, `.input`, `.data-table`, `.label`).
- **Colour only via tokens** (`bg-surface`, `text-ink-muted`, `border-line`). Never a raw hex or a
  stock Tailwind grey, or dark mode breaks.
- `cx()` from `ui.tsx` for conditional classes.
- Every page handles all four states: loading (`Skeleton`), error (`ErrorState`), empty
  (`EmptyState`), and content.

### Git
Commit subjects are imperative and under ~70 characters, with a body explaining the reasoning
rather than restating the diff.
