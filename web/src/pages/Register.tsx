import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { homeFor, useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { BRANCHES } from '../lib/format';
import { Button, Field, Input, Select, cx } from '../components/ui';

export default function Register() {
  const { register, user, loading } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<'student' | 'recruiter'>('student');
  const [companies, setCompanies] = useState<{ id: number; name: string }[]>([]);
  const [form, setForm] = useState({
    name: '', email: '', password: '',
    enrollment_no: '', branch: 'CSE', division: 'TY FCC-1', year: 3, cgpa: '',
    company_id: '', company_name: '',
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<{ id: number; name: string }[]>('/companies/public')
      .then(setCompanies)
      .catch(() => setCompanies([]));
  }, []);

  if (!loading && user) return <Navigate to={homeFor(user.role)} replace />;

  const set = (k: string, v: string | number) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const payload: Record<string, unknown> = {
        role, name: form.name, email: form.email, password: form.password,
      };
      if (role === 'student') {
        Object.assign(payload, {
          enrollment_no: form.enrollment_no, branch: form.branch,
          division: form.division, year: Number(form.year), cgpa: Number(form.cgpa) || 0,
        });
      } else if (form.company_id) {
        payload.company_id = Number(form.company_id);
      } else {
        payload.company_name = form.company_name;
      }
      const u = await register(payload);
      navigate(homeFor(u.role), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col justify-center px-5 py-10">
      <Link to="/login" className="mb-6 inline-flex items-center gap-2 self-start text-sm text-ink-muted transition hover:text-ink">
        &larr; Back to sign in
      </Link>

      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1.5 text-sm text-ink-muted">
        Students register with their enrolment number. Recruiters register against a company.
      </p>

      {/* Role switch */}
      <div className="mt-6 grid grid-cols-2 gap-2 rounded-xl bg-surface-sunken p-1">
        {(['student', 'recruiter'] as const).map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRole(r)}
            className={cx(
              'rounded-lg px-4 py-2 text-sm font-medium capitalize transition',
              role === r ? 'bg-surface-raised text-ink shadow-sm' : 'text-ink-muted hover:text-ink',
            )}
          >
            {r}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Full name" required>
          <Input required value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Arman Singh" />
        </Field>

        <Field label="Email" required>
          <Input type="email" required value={form.email} onChange={(e) => set('email', e.target.value)}
                 placeholder={role === 'student' ? 'you@mitadt.edu.in' : 'hr@company.com'} />
        </Field>

        <Field label="Password" required hint="At least 6 characters.">
          <Input type="password" required minLength={6} value={form.password}
                 onChange={(e) => set('password', e.target.value)} />
        </Field>

        {role === 'student' ? (
          <>
            <Field label="Enrolment number" required>
              <Input required value={form.enrollment_no} onChange={(e) => set('enrollment_no', e.target.value)}
                     placeholder="ADT24SOCB0000" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Branch">
                <Select value={form.branch} onChange={(e) => set('branch', e.target.value)}>
                  {BRANCHES.map((b) => <option key={b}>{b}</option>)}
                </Select>
              </Field>
              <Field label="Division">
                <Select value={form.division} onChange={(e) => set('division', e.target.value)}>
                  {['TY FCC-1', 'TY FCC-2', 'TY FCC-3', 'BTech-1', 'BTech-2'].map((d) => <option key={d}>{d}</option>)}
                </Select>
              </Field>
              <Field label="Year of study">
                <Select value={form.year} onChange={(e) => set('year', Number(e.target.value))}>
                  {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
                </Select>
              </Field>
              <Field label="CGPA" hint="Out of 10.">
                <Input type="number" step="0.01" min="0" max="10" value={form.cgpa}
                       onChange={(e) => set('cgpa', e.target.value)} placeholder="7.80" />
              </Field>
            </div>
          </>
        ) : (
          <>
            <Field label="Company" hint="Pick your company, or leave blank and type a new one below.">
              <Select value={form.company_id} onChange={(e) => set('company_id', e.target.value)}>
                <option value="">-- Register a new company --</option>
                {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            {!form.company_id && (
              <Field label="New company name" required>
                <Input required value={form.company_name} onChange={(e) => set('company_name', e.target.value)}
                       placeholder="Acme Technologies" />
              </Field>
            )}
          </>
        )}

        {error && (
          <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-200">
            {error}
          </p>
        )}

        <Button type="submit" loading={busy} size="lg" className="w-full">Create account</Button>
      </form>
    </div>
  );
}
