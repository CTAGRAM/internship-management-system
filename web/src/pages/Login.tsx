import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../lib/auth';
import { Button, Field, Input } from '../components/ui';

/** One-click demo logins, so a reviewer never has to hunt for credentials. */
const DEMOS = [
  { role: 'Placement Officer', email: 'tpo@mitadt.edu.in', blurb: 'Full oversight, reports and analytics' },
  { role: 'Student', email: 'bhaskar.kumar@mitadt.edu.in', blurb: 'Browse, apply and track applications' },
  { role: 'Recruiter', email: 'hr@persistentsy.com', blurb: 'Post openings and shortlist candidates' },
];

export default function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (!loading && user) return <Navigate to={homeFor(user.role)} replace />;

  const submit = async (e: React.FormEvent, creds?: { email: string; password: string }) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const u = await login(creds?.email ?? email, creds?.password ?? password);
      navigate(homeFor(u.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-navy-900 p-10 lg:flex lg:flex-col lg:justify-between">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              'radial-gradient(circle at 20% 20%, #fff 1px, transparent 1px), radial-gradient(circle at 70% 60%, #fff 1px, transparent 1px)',
            backgroundSize: '44px 44px, 60px 60px',
          }}
        />
        <div className="relative flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gold-400 font-bold text-navy-950">IMS</span>
          <span className="leading-tight">
            <span className="block font-semibold text-white">MIT School of Computing</span>
            <span className="block text-sm text-navy-200/80">MIT ADT University, Pune</span>
          </span>
        </div>

        <div className="relative max-w-md">
          <h1 className="text-4xl font-semibold leading-tight tracking-tight text-white">
            Every internship,<br />one place.
          </h1>
          <p className="mt-4 text-navy-100/80">
            A centralized platform connecting students, recruiters and the placement
            office &mdash; from profile and eligibility through application, shortlisting,
            interviews and the final offer.
          </p>
          <ul className="mt-8 space-y-3">
            {[
              'Eligibility checked automatically before you apply',
              'Track every application from applied to selected',
              'Interviews, offers and records in a single dashboard',
            ].map((t) => (
              <li key={t} className="flex items-start gap-2.5 text-sm text-navy-100/90">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-gold-400">
                  <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none" stroke="#0b1227" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m2.5 6 2.5 2.5 4.5-5" />
                  </svg>
                </span>
                {t}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-navy-300/60">
          Department of Computer Science &amp; Engineering &middot; Under the guidance of Dr. Rajani Sajjan
        </p>
      </div>

      {/* Form panel */}
      <div className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-7 lg:hidden">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-navy-800 font-bold text-gold-300">IMS</span>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Sign in</h2>
          <p className="mt-1.5 text-sm text-ink-muted">
            New here?{' '}
            <Link to="/register" className="font-medium text-navy-700 underline underline-offset-2 dark:text-navy-300">
              Create an account
            </Link>
          </p>

          <form onSubmit={submit} className="mt-7 space-y-4">
            <Field label="Email">
              <Input type="email" autoComplete="username" required value={email}
                     onChange={(e) => setEmail(e.target.value)} placeholder="you@mitadt.edu.in" />
            </Field>
            <Field label="Password">
              <Input type="password" autoComplete="current-password" required value={password}
                     onChange={(e) => setPassword(e.target.value)} placeholder="Your password" />
            </Field>

            {error && (
              <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">
                {error}
              </p>
            )}

            <Button type="submit" loading={busy} className="w-full" size="lg">Sign in</Button>
          </form>

          <div className="my-7 flex items-center gap-3 text-xs text-ink-subtle">
            <span className="h-px flex-1 bg-line" />
            OR TRY A DEMO ACCOUNT
            <span className="h-px flex-1 bg-line" />
          </div>

          <div className="space-y-2">
            {DEMOS.map((d) => (
              <button
                key={d.email}
                disabled={busy}
                onClick={(e) => submit(e, { email: d.email, password: 'password123' })}
                className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-surface-raised px-3.5 py-2.5 text-left transition hover:border-navy-300 hover:bg-surface-sunken disabled:opacity-50"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-ink">{d.role}</span>
                  <span className="block truncate text-xs text-ink-subtle">{d.blurb}</span>
                </span>
                <span className="shrink-0 text-xs font-medium text-navy-700 dark:text-navy-300">Open &rarr;</span>
              </button>
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-ink-subtle">
            All demo accounts use the password <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono">password123</code>
          </p>
        </div>
      </div>
    </div>
  );
}
