import { useState } from 'react';
import { useAuth } from '../../lib/auth';
import { api } from '../../lib/api';
import { useAsync, useDebounced } from '../../lib/useAsync';
import type { Company } from '../../lib/types';
import { PageHeader } from '../../components/Shell';
import {
  Badge, Button, EmptyState, ErrorState, Field, Input, Modal, Skeleton, Textarea, toast,
} from '../../components/ui';
import { IconBuilding, IconPlus, IconSearch } from '../../components/icons';

const blank: Partial<Company> = {
  name: '', industry: '', website: '', location: '', about: '', hr_name: '', hr_email: '', verified: 0,
};

export default function Companies() {
  const [q, setQ] = useState('');
  const [editing, setEditing] = useState<Partial<Company> | null>(null);
  const search = useDebounced(q, 250);

  const { data, loading, error, reload } = useAsync(
    () => api.get<Company[]>('/companies', { q: search }), [search],
  );
  const rows = data ?? [];

  return (
    <>
      <PageHeader
        title="Companies"
        description="Recruiting organisations participating in the placement process."
        actions={
          <Button icon={<IconPlus className="h-4 w-4" />} onClick={() => setEditing({ ...blank })}>
            Add company
          </Button>
        }
      />

      <div className="card mb-4 p-3">
        <div className="relative">
          <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9"
                 placeholder="Search by name or industry" aria-label="Search companies" />
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}

      {loading ? (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} className="h-40" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={<IconBuilding className="h-8 w-8" />} title="No companies yet"
                    action={<Button onClick={() => setEditing({ ...blank })}>Add the first one</Button>} />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          {rows.map((c) => (
            <article key={c.id} className="card flex flex-col p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="truncate font-semibold text-ink">{c.name}</h3>
                  <p className="truncate text-sm text-ink-muted">{c.industry || 'Industry not set'}</p>
                </div>
                {c.verified ? <Badge tone="good">Verified</Badge> : <Badge tone="warn">Unverified</Badge>}
              </div>

              {c.about && <p className="mt-2 line-clamp-2 text-xs text-ink-muted">{c.about}</p>}

              <dl className="mt-3 grid grid-cols-3 gap-2 border-t border-line pt-3 text-center">
                {[
                  ['Postings', c.internship_count ?? 0],
                  ['Applicants', c.application_count ?? 0],
                  ['Placed', c.selected_count ?? 0],
                ].map(([k, v]) => (
                  <div key={String(k)}>
                    <dt className="text-[11px] text-ink-subtle">{k}</dt>
                    <dd className="text-sm font-semibold tabular-nums text-ink">{v}</dd>
                  </div>
                ))}
              </dl>

              <div className="mt-3 flex items-center gap-2 pt-1">
                <Button size="sm" variant="secondary" className="flex-1" onClick={() => setEditing(c)}>Edit</Button>
                {c.website && (
                  <a href={c.website} target="_blank" rel="noreferrer noopener" className="flex-1">
                    <Button size="sm" variant="ghost" className="w-full">Website</Button>
                  </a>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      {editing && (
        <CompanyForm value={editing} onClose={() => setEditing(null)}
                     onSaved={async () => { setEditing(null); await reload(); }} />
      )}
    </>
  );
}

export function CompanyForm({
  value, onClose, onSaved, selfService = false,
}: {
  value: Partial<Company>; onClose: () => void;
  onSaved: () => void | Promise<void>; selfService?: boolean;
}) {
  const [form, setForm] = useState(value);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof Company, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    if (!form.name) { toast.error('A company name is required.'); return; }
    setBusy(true);
    try {
      if (form.id) await api.put(`/companies/${form.id}`, form);
      else await api.post('/companies', form);
      toast.success('Company saved.');
      await onSaved();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not save.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open onClose={onClose}
      title={form.id ? form.name ?? 'Edit company' : 'Add a company'}
      description="Details shown to students browsing internships."
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy}>Save</Button>
        </>
      }
    >
      <div className="space-y-4">
        <Field label="Company name" required>
          <Input value={form.name ?? ''} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Industry">
            <Input value={form.industry ?? ''} onChange={(e) => set('industry', e.target.value)}
                   placeholder="Software Services" />
          </Field>
          <Field label="Location">
            <Input value={form.location ?? ''} onChange={(e) => set('location', e.target.value)}
                   placeholder="Pune" />
          </Field>
        </div>
        <Field label="Website">
          <Input value={form.website ?? ''} onChange={(e) => set('website', e.target.value)}
                 placeholder="https://company.com" />
        </Field>
        <Field label="About">
          <Textarea rows={3} value={form.about ?? ''} onChange={(e) => set('about', e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="HR contact name">
            <Input value={form.hr_name ?? ''} onChange={(e) => set('hr_name', e.target.value)} />
          </Field>
          <Field label="HR contact email">
            <Input type="email" value={form.hr_email ?? ''} onChange={(e) => set('hr_email', e.target.value)} />
          </Field>
        </div>
        {!selfService && (
          <label className="flex cursor-pointer items-center gap-2.5 rounded-lg border border-line p-3">
            <input
              type="checkbox" checked={Boolean(form.verified)}
              onChange={(e) => set('verified', e.target.checked ? 1 : 0)}
              className="h-4 w-4 rounded border-line text-navy-700 focus:ring-navy-500"
            />
            <span>
              <span className="block text-sm font-medium text-ink">Verified company</span>
              <span className="block text-xs text-ink-muted">
                Verified companies carry a badge on their postings.
              </span>
            </span>
          </label>
        )}
      </div>
    </Modal>
  );
}

/** The recruiter's own company page reuses the same form. */
export function CompanyProfile() {
  const { company, refresh } = useAuth();
  const [editing, setEditing] = useState(false);

  if (!company) return <Skeleton className="h-64" />;

  return (
    <>
      <PageHeader title="Company profile"
                  description="How your organisation appears to students browsing internships."
                  actions={<Button onClick={() => setEditing(true)}>Edit details</Button>} />

      <div className="card max-w-2xl p-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-ink">{company.name}</h2>
            <p className="text-sm text-ink-muted">{company.industry || 'Industry not set'}</p>
          </div>
          {company.verified ? <Badge tone="good">Verified</Badge> : <Badge tone="warn">Pending verification</Badge>}
        </div>

        {company.about && <p className="mt-4 text-sm leading-relaxed text-ink-muted">{company.about}</p>}

        <dl className="mt-5 grid gap-4 border-t border-line pt-5 sm:grid-cols-2">
          {[
            ['Location', company.location || '--'],
            ['Website', company.website || '--'],
            ['HR contact', company.hr_name || '--'],
            ['HR email', company.hr_email || '--'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-ink-muted">{k}</dt>
              <dd className="mt-0.5 truncate text-sm font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        <dl className="mt-5 grid grid-cols-3 gap-3 border-t border-line pt-5 text-center">
          {[
            ['Postings', company.internship_count ?? 0],
            ['Applications', company.application_count ?? 0],
            ['Selected', company.selected_count ?? 0],
          ].map(([k, v]) => (
            <div key={String(k)}>
              <dt className="text-xs text-ink-subtle">{k}</dt>
              <dd className="text-xl font-semibold tabular-nums text-ink">{v}</dd>
            </div>
          ))}
        </dl>
      </div>

      {editing && (
        <CompanyForm value={company} selfService onClose={() => setEditing(false)}
                     onSaved={async () => { setEditing(false); await refresh(); }} />
      )}
    </>
  );
}
