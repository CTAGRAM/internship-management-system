import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useAsync } from '../../lib/useAsync';
import { BRANCHES, date, deadlineTone, money, relative } from '../../lib/format';
import type { Company, Internship } from '../../lib/types';
import { PageHeader } from '../../components/Shell';
import { StatTile } from '../../components/Charts';
import {
  Badge, Button, EmptyState, ErrorState, Field, Input, Modal, Select,
  Skeleton, TagInput, Textarea, cx, toast,
} from '../../components/ui';
import { IconBriefcase, IconPlus, IconUsers } from '../../components/icons';

const SKILLS = [
  'React', 'Node.js', 'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'SQL',
  'MongoDB', 'Express', 'HTML', 'CSS', 'Git', 'Docker', 'AWS', 'Machine Learning',
  'Figma', 'REST API', 'Data Structures', 'Flutter', 'Power BI', 'Excel', 'Linux',
];

const blank = {
  title: '', description: '', responsibilities: '', location: 'Pune',
  work_mode: 'onsite', duration_months: 3, stipend: 15000, openings: 1,
  skills: [] as string[], min_cgpa: 6, max_backlogs: 0,
  allowed_branches: [] as string[], allowed_years: [3, 4] as number[],
  deadline: '', status: 'open', company_id: '' as string | number,
};

export default function Postings() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [editing, setEditing] = useState<typeof blank & { id?: number } | null>(null);

  const { data, loading, error, reload } = useAsync(() => api.get<Internship[]>('/internships'), []);
  const companies = useAsync(
    () => (isAdmin ? api.get<Company[]>('/companies') : Promise.resolve([] as Company[])),
    [isAdmin],
  );

  const list = data ?? [];
  const open = list.filter((i) => i.status === 'open').length;
  const totalApps = list.reduce((n, i) => n + i.application_count, 0);

  return (
    <>
      <PageHeader
        title={isAdmin ? 'All internships' : 'My postings'}
        description="Create openings, set eligibility criteria and review who has applied."
        actions={
          <Button icon={<IconPlus className="h-4 w-4" />} onClick={() => setEditing({ ...blank })}>
            New posting
          </Button>
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-3">
        <StatTile label="Postings" value={list.length} sub={`${open} open`} />
        <StatTile label="Applications" value={totalApps} sub="across all postings" tone="navy" />
        <StatTile label="Openings" value={list.reduce((n, i) => n + i.openings, 0)} sub="seats available" tone="gold" />
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-32" />)}</div>
      ) : list.length === 0 ? (
        <EmptyState
          icon={<IconBriefcase className="h-8 w-8" />}
          title="No postings yet"
          description="Create your first internship opening. Every eligible student is notified automatically."
          action={<Button onClick={() => setEditing({ ...blank })}>Create a posting</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {list.map((i) => (
            <li key={i.id} className="card p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-semibold text-ink">{i.title}</h3>
                    <Badge tone={i.status === 'open' ? 'good' : 'neutral'}>
                      {i.status === 'open' ? 'Open' : 'Closed'}
                    </Badge>
                    {i.expired && <Badge tone="bad">Deadline passed</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-ink-muted">
                    {i.company_name} &middot; {i.location} &middot; {money(i.stipend)}/mo &middot; {i.duration_months} months
                  </p>
                </div>

                <div className="flex shrink-0 gap-2">
                  <Link to={`/pipeline/${i.id}`}>
                    <Button size="sm" icon={<IconUsers className="h-4 w-4" />}>
                      {i.application_count} candidate{i.application_count === 1 ? '' : 's'}
                    </Button>
                  </Link>
                  <Button
                    size="sm" variant="secondary"
                    onClick={() => setEditing({
                      ...blank, ...i, id: i.id,
                      company_id: i.company_id,
                      deadline: i.deadline.slice(0, 10),
                    })}
                  >
                    Edit
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <Badge>CGPA &ge; {i.min_cgpa.toFixed(1)}</Badge>
                <Badge>{i.max_backlogs >= 99 ? 'Backlogs allowed' : `Max ${i.max_backlogs} backlogs`}</Badge>
                <Badge>{i.allowed_branches.length ? i.allowed_branches.join(', ') : 'All branches'}</Badge>
                <span className={cx(
                  'ml-auto text-xs font-medium',
                  deadlineTone(i.deadline) === 'urgent' ? 'text-rose-600 dark:text-rose-400' : 'text-ink-subtle',
                )}>
                  Closes {date(i.deadline)} &middot; {relative(i.deadline)}
                </span>
              </div>
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <PostingForm
          value={editing}
          companies={companies.data ?? []}
          showCompany={isAdmin}
          onClose={() => setEditing(null)}
          onSaved={async () => { setEditing(null); await reload(); }}
        />
      )}
    </>
  );
}

function PostingForm({
  value, companies, showCompany, onClose, onSaved,
}: {
  value: typeof blank & { id?: number };
  companies: Company[];
  showCompany: boolean;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
}) {
  const [form, setForm] = useState(value);
  const [busy, setBusy] = useState(false);
  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.title || !form.deadline) {
      toast.error('A title and an application deadline are required.');
      return;
    }
    setBusy(true);
    try {
      const payload = {
        ...form,
        company_id: showCompany ? Number(form.company_id) || undefined : undefined,
        min_cgpa: Number(form.min_cgpa),
        max_backlogs: Number(form.max_backlogs),
        stipend: Number(form.stipend),
        openings: Number(form.openings),
        duration_months: Number(form.duration_months),
      };
      if (form.id) await api.put(`/internships/${form.id}`, payload);
      else await api.post('/internships', payload);
      toast.success(form.id ? 'Posting updated.' : 'Posting created. Eligible students have been notified.');
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  const toggleBranch = (b: string) =>
    set('allowed_branches', form.allowed_branches.includes(b)
      ? form.allowed_branches.filter((x) => x !== b)
      : [...form.allowed_branches, b]);

  const toggleYear = (y: number) =>
    set('allowed_years', form.allowed_years.includes(y)
      ? form.allowed_years.filter((x) => x !== y)
      : [...form.allowed_years, y]);

  return (
    <Modal
      open
      onClose={onClose}
      width="lg"
      title={form.id ? 'Edit posting' : 'New internship posting'}
      description="Eligibility criteria are enforced automatically when students apply."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy}>{form.id ? 'Save changes' : 'Publish posting'}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {showCompany && (
          <Field label="Company" required>
            <Select value={String(form.company_id)} onChange={(e) => set('company_id', e.target.value)}>
              <option value="">Select a company</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </Select>
          </Field>
        )}

        <Field label="Role title" required>
          <Input value={form.title} onChange={(e) => set('title', e.target.value)}
                 placeholder="Full Stack Developer Intern" />
        </Field>

        <Field label="About the role">
          <Textarea rows={3} value={form.description} onChange={(e) => set('description', e.target.value)}
                    placeholder="What the intern will work on and who they will work with." />
        </Field>

        <Field label="Responsibilities" hint="One per line.">
          <Textarea rows={4} value={form.responsibilities}
                    onChange={(e) => set('responsibilities', e.target.value)}
                    placeholder={'Build and test React components\nWrite REST endpoints'} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Location">
            <Input value={form.location} onChange={(e) => set('location', e.target.value)} />
          </Field>
          <Field label="Work mode">
            <Select value={form.work_mode} onChange={(e) => set('work_mode', e.target.value)}>
              <option value="onsite">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </Select>
          </Field>
          <Field label="Stipend per month" hint="0 for an unpaid internship.">
            <Input type="number" min="0" value={form.stipend} onChange={(e) => set('stipend', e.target.value)} />
          </Field>
          <Field label="Duration (months)">
            <Input type="number" min="1" max="24" value={form.duration_months}
                   onChange={(e) => set('duration_months', e.target.value)} />
          </Field>
          <Field label="Openings">
            <Input type="number" min="1" value={form.openings} onChange={(e) => set('openings', e.target.value)} />
          </Field>
          <Field label="Application deadline" required>
            <Input type="date" value={form.deadline} onChange={(e) => set('deadline', e.target.value)} />
          </Field>
        </div>

        <Field label="Skills required" hint="Used to score how well each applicant matches.">
          <TagInput value={form.skills} onChange={(v) => set('skills', v)} suggestions={SKILLS} />
        </Field>

        <fieldset className="rounded-lg border border-line p-4">
          <legend className="px-1.5 text-sm font-semibold">Eligibility criteria</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Minimum CGPA">
              <Input type="number" step="0.1" min="0" max="10" value={form.min_cgpa}
                     onChange={(e) => set('min_cgpa', e.target.value)} />
            </Field>
            <Field label="Maximum backlogs">
              <Input type="number" min="0" value={form.max_backlogs}
                     onChange={(e) => set('max_backlogs', e.target.value)} />
            </Field>
          </div>

          <div className="mt-3">
            <p className="label">Branches <span className="font-normal text-ink-subtle">(none selected = all)</span></p>
            <div className="flex flex-wrap gap-1.5">
              {BRANCHES.map((b) => (
                <button
                  key={b} type="button" onClick={() => toggleBranch(b)}
                  className={cx(
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition',
                    form.allowed_branches.includes(b)
                      ? 'border-navy-700 bg-navy-800 text-white'
                      : 'border-line bg-surface-raised text-ink-muted hover:border-navy-300',
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <p className="label">Years of study</p>
            <div className="flex flex-wrap gap-1.5">
              {[1, 2, 3, 4].map((y) => (
                <button
                  key={y} type="button" onClick={() => toggleYear(y)}
                  className={cx(
                    'rounded-md border px-2.5 py-1 text-xs font-medium transition',
                    form.allowed_years.includes(y)
                      ? 'border-navy-700 bg-navy-800 text-white'
                      : 'border-line bg-surface-raised text-ink-muted hover:border-navy-300',
                  )}
                >
                  Year {y}
                </button>
              ))}
            </div>
          </div>
        </fieldset>

        <Field label="Posting status">
          <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="open">Open - accepting applications</option>
            <option value="closed">Closed - no new applications</option>
          </Select>
        </Field>
      </div>
    </Modal>
  );
}
