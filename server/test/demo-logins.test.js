/**
 * The sign-in page advertises three one-click demo accounts. Those addresses
 * are derived from company names inside the seed, so a change to either side
 * can silently break the buttons -- this pins them together.
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const loginPage = fs.readFileSync(
  path.join(here, '..', '..', 'web', 'src', 'pages', 'Login.tsx'),
  'utf8',
);

/** Every email the sign-in page offers as a demo account. */
const advertised = [...loginPage.matchAll(/email:\s*'([^']+)'/g)].map((m) => m[1]);

describe('demo accounts', () => {
  test('the sign-in page advertises three accounts', () => {
    assert.equal(advertised.length, 3);
  });

  test('every advertised account exists in the seeded database', async () => {
    // Build a throwaway database so the test never touches a real one.
    const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'ims-test-'));
    process.env.DATA_DIR = tmp;
    process.env.UPLOAD_DIR = path.join(tmp, 'uploads');
    process.env.DB_PATH = path.join(tmp, 'test.db');

    const { db } = await import('../src/db.js');
    const { seed } = await import('../src/seed.js');
    seed();

    for (const email of advertised) {
      const user = db.prepare('SELECT email, role FROM users WHERE email = ?').get(email);
      assert.ok(user, `demo login "${email}" is offered on the sign-in page but not seeded`);
    }

    // And the three cover one of each role, which is the point of the buttons.
    const roles = advertised
      .map((e) => db.prepare('SELECT role FROM users WHERE email = ?').get(e).role)
      .sort();
    assert.deepEqual(roles, ['admin', 'recruiter', 'student']);

    db.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  });
});
