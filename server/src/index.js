/**
 * Traditional server entry: listens on a port and serves both the API and the
 * built frontend. Vercel uses api/index.js instead, which imports the same app.
 */
import fs from 'node:fs';
import app, { dist } from './app.js';

const PORT = Number(process.env.PORT) || 4000;

app.listen(PORT, () => {
  console.log(`\n  Internship Management System`);
  console.log(`  API    http://localhost:${PORT}/api`);
  console.log(
    fs.existsSync(dist) ? `  App    http://localhost:${PORT}\n` : `  App    run "npm run dev" for the UI\n`,
  );
});
