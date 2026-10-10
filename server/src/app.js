import express from 'express';
import cors from 'cors';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { IS_EPHEMERAL } from './db.js';
import { readToken } from './auth.js';
import { HttpError } from './util.js';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/students.js';
import companyRoutes from './routes/companies.js';
import internshipRoutes from './routes/internships.js';
import applicationRoutes from './routes/applications.js';
import interviewRoutes from './routes/interviews.js';
import notificationRoutes from './routes/notifications.js';
import reportRoutes from './routes/reports.js';
import { ensureSeed } from './seed.js';

const here = path.dirname(fileURLToPath(import.meta.url));
// First run on a clean machine: fill the database with demo data so the
// app is usable the moment it boots.
ensureSeed();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(readToken);

app.get('/api/health', (_req, res) =>
  res.json({
    ok: true,
    service: 'internship-management-system',
    storage: IS_EPHEMERAL ? 'ephemeral (demo)' : 'persistent',
    time: new Date().toISOString(),
  }),
);

app.use('/api/auth', authRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/companies', companyRoutes);
app.use('/api/internships', internshipRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/reports', reportRoutes);

app.use('/api', (_req, res) => res.status(404).json({ error: 'Unknown API endpoint.' }));

// ------------------------------------------------- serve the built frontend
// On a traditional host one process serves the API and the UI on a single
// port. On Vercel the CDN serves web/dist and this module runs only as the
// /api function, so the static block is skipped.
const dist = path.join(here, '..', '..', 'web', 'dist');
if (!IS_EPHEMERAL && fs.existsSync(dist)) {
  app.use(express.static(dist));
  app.get('*', (_req, res) => res.sendFile(path.join(dist, 'index.html')));
} else if (!IS_EPHEMERAL) {
  app.get('/', (_req, res) =>
    res
      .status(200)
      .send(
        '<h1>Internship Management System API</h1>' +
          '<p>The API is running. Start the frontend with <code>npm run dev</code>, ' +
          'or build it with <code>npm run build</code> to have it served from this port.</p>',
      ),
  );
}

// ------------------------------------------------------------ error handler
app.use((err, _req, res, _next) => {
  const status = err instanceof HttpError ? err.status : err.status || 500;
  if (status >= 500) console.error(err);
  const message =
    err.code === 'LIMIT_FILE_SIZE'
      ? 'That file is too large (5 MB maximum).'
      : err.message || 'Something went wrong.';
  res.status(status).json({ error: message });
});

export default app;
export { dist };
