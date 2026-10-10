/**
 * Tests for the eligibility and skill-matching rules -- the logic that decides
 * which internships a student may apply to (Module 4).
 *
 * Run with: npm test --workspace server
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { evaluateEligibility, skillMatchScore, isPast, toCsv } from '../src/util.js';

const future = () => {
  const d = new Date();
  d.setDate(d.getDate() + 30);
  return d.toISOString().slice(0, 10);
};
const past = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};

const student = (over = {}) => ({
  cgpa: 8.0, backlogs: 0, branch: 'CSE', year: 3,
  skills: JSON.stringify(['React', 'Node.js', 'SQL']),
  ...over,
});

const internship = (over = {}) => ({
  min_cgpa: 7.0, max_backlogs: 0,
  allowed_branches: JSON.stringify(['CSE', 'IT']),
  allowed_years: JSON.stringify([3, 4]),
  skills: JSON.stringify(['React', 'Node.js', 'Docker', 'AWS']),
  deadline: future(), status: 'open',
  ...over,
});

describe('evaluateEligibility', () => {
  test('a qualifying student is eligible with no reasons', () => {
    const r = evaluateEligibility(student(), internship());
    assert.equal(r.eligible, true);
    assert.deepEqual(r.reasons, []);
  });

  test('CGPA below the minimum blocks the application', () => {
    const r = evaluateEligibility(student({ cgpa: 6.5 }), internship());
    assert.equal(r.eligible, false);
    assert.match(r.reasons[0], /CGPA 7\.00/);
  });

  test('too many backlogs blocks the application', () => {
    const r = evaluateEligibility(student({ backlogs: 2 }), internship());
    assert.equal(r.eligible, false);
    assert.match(r.reasons.join(' '), /backlog/i);
  });

  test('a branch outside the allowed list blocks the application', () => {
    const r = evaluateEligibility(student({ branch: 'Mechanical' }), internship());
    assert.equal(r.eligible, false);
    assert.match(r.reasons.join(' '), /CSE, IT/);
  });

  test('a year outside the allowed list blocks the application', () => {
    const r = evaluateEligibility(student({ year: 1 }), internship());
    assert.equal(r.eligible, false);
    assert.match(r.reasons.join(' '), /year/i);
  });

  test('an empty branch list means every branch qualifies', () => {
    const r = evaluateEligibility(
      student({ branch: 'Civil' }),
      internship({ allowed_branches: '[]' }),
    );
    assert.equal(r.eligible, true);
  });

  test('a passed deadline blocks the application', () => {
    const r = evaluateEligibility(student(), internship({ deadline: past() }));
    assert.equal(r.eligible, false);
    assert.match(r.reasons.join(' '), /deadline/i);
  });

  test('a closed posting blocks the application', () => {
    const r = evaluateEligibility(student(), internship({ status: 'closed' }));
    assert.equal(r.eligible, false);
    assert.match(r.reasons.join(' '), /closed/i);
  });

  test('every failing reason is reported, not just the first', () => {
    const r = evaluateEligibility(
      student({ cgpa: 5, backlogs: 3, branch: 'Civil' }),
      internship(),
    );
    assert.equal(r.eligible, false);
    assert.equal(r.reasons.length, 3);
  });
});

describe('skillMatchScore', () => {
  test('scores the share of required skills the student has', () => {
    // Student has React and Node.js out of 4 required -> 50%.
    assert.equal(skillMatchScore(student(), internship()), 50);
  });

  test('is case-insensitive', () => {
    const s = student({ skills: JSON.stringify(['react', 'NODE.JS', 'docker', 'aws']) });
    assert.equal(skillMatchScore(s, internship()), 100);
  });

  test('a posting with no listed skills matches everyone', () => {
    assert.equal(skillMatchScore(student(), internship({ skills: '[]' })), 100);
  });

  test('no overlap scores zero', () => {
    const s = student({ skills: JSON.stringify(['Figma', 'Excel']) });
    assert.equal(skillMatchScore(s, internship()), 0);
  });

  test('accepts an already-decoded skills array', () => {
    // Routes shape rows before the helpers run; both forms must work.
    const s = { ...student(), skills: ['React', 'Node.js'] };
    const i = { ...internship(), skills: ['React', 'Node.js'] };
    assert.equal(skillMatchScore(s, i), 100);
  });
});

describe('helpers', () => {
  test('isPast only flags dates before today', () => {
    assert.equal(isPast(past()), true);
    assert.equal(isPast(future()), false);
    assert.equal(isPast(new Date().toISOString().slice(0, 10)), false);
  });

  test('toCsv quotes values containing commas and quotes', () => {
    const csv = toCsv([{ name: 'Patil, Aarav', note: 'said "hello"' }]);
    assert.equal(csv.split('\n')[0], 'name,note');
    assert.match(csv, /"Patil, Aarav"/);
    assert.match(csv, /"said ""hello"""/);
  });

  test('toCsv returns an empty string for no rows', () => {
    assert.equal(toCsv([]), '');
  });
});
