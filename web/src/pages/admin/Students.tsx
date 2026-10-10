import { useState } from 'react';
import { api, getToken } from '../../lib/api';
import { useAsync, useDebounced } from '../../lib/useAsync';
import { BRANCHES } from '../../lib/format';
import type { Student } from '../../lib/types';
import { PageHeader } from '../../components/Shell';
import {
  Avatar, Badge, Button, EmptyState, ErrorState, Input, Modal, Select, Skeleton,
} from '../../components/ui';
import { IconDownload, IconSearch, IconUsers } from '../../components/icons';

export default function Students() {
  const [q, setQ] = useState('');
  const [branch, setBranch] = useState('');
  const [year, setYear] = useState('');
  const [minCgpa, setMinCgpa] = useState('');
  const [detail, setDetail] = useState<Student | null>(null);
  const search = useDebounced(q, 250);

  const { data, loading, error, reload } = useAsync(
    () => api.get<Student[]>('/students', { q: search, branch, year, minCgpa }),
    [search, branch, year, minCgpa],
  );
  const rows = data ?? [];

  return (
    <>
      <PageHeader
        title="Students"
        description="Every registered student, their academic standing and resume."
        actions={
          <Button variant="secondary" icon={<IconDownload className="h-4 w-4" />}
                  onClick={() => api.download('/reports/export/students', 'students.csv')}>
            Export CSV
          </Button>
        }
      />

      <div className="card mb-4 p-3">
        <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative lg:col-span-2">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9"
                   placeholder="Name, email, enrolment number or skill" aria-label="Search students" />
          </div>
          <Select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="Branch">
            <option value="">All branches</option>
            {BRANCHES.map((b) => <option key={b}>{b}</option>)}
          </Select>
          <div className="grid grid-cols-2 gap-2.5">
            <Select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Year">
              <option value="">All years</option>
              {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
            </Select>
            <Input type="number" step="0.5" min="0" max="10" value={minCgpa}
                   onChange={(e) => setMinCgpa(e.target.value)} placeholder="Min CGPA" aria-label="Minimum CGPA" />
          </div>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={reload} />}

      {loading ? <Skeleton className="h-96" />
        : rows.length === 0 ? (
          <EmptyState icon={<IconUsers className="h-8 w-8" />} title="No students match those filters" />
        ) : (
          <div className="card overflow-hidden">
            <div className="scroll-thin max-h-[70vh] overflow-auto">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th className="hidden sm:table-cell">Branch</th>
                    <th className="hidden md:table-cell">Division</th>
                    <th>CGPA</th>
                    <th className="hidden lg:table-cell">Backlogs</th>
                    <th className="hidden lg:table-cell">Skills</th>
                    <th>Resume</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.user_id} className="cursor-pointer" onClick={() => setDetail(s)}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          <Avatar name={s.name} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">{s.name}</p>
                            <p className="truncate text-xs text-ink-subtle">{s.enrollment_no}</p>
                          </div>
                        </div>
                      </td>
                      <td className="hidden sm:table-cell text-ink-muted">{s.branch}</td>
                      <td className="hidden md:table-cell text-ink-muted">{s.division}</td>
                      <td className="tabular-nums text-ink-muted">{s.cgpa.toFixed(2)}</td>
                      <td className="hidden lg:table-cell">
                        <Badge tone={s.backlogs === 0 ? 'good' : 'warn'}>{s.backlogs}</Badge>
                      </td>
                      <td className="hidden lg:table-cell">
                        <span className="text-xs text-ink-muted">{s.skills.slice(0, 3).join(', ')}
                          {s.skills.length > 3 && ` +${s.skills.length - 3}`}</span>
                      </td>
                      <td>
                        {s.hasResume
                          ? <Badge tone="good">Uploaded</Badge>
                          : <Badge tone="neutral">Missing</Badge>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      {detail && <StudentModal student={detail} onClose={() => setDetail(null)} />}
    </>
  );
}

function StudentModal({ student: s, onClose }: { student: Student; onClose: () => void }) {
  return (
    <Modal open onClose={onClose} width="lg" title={s.name}
           description={`${s.enrollment_no} · ${s.branch} ${s.division} · Year ${s.year}`}>
      <div className="space-y-5">
        <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            ['CGPA', s.cgpa.toFixed(2)],
            ['Backlogs', String(s.backlogs)],
            ['Phone', s.phone || '--'],
            ['Location', s.location || '--'],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-xs text-ink-muted">{k}</dt>
              <dd className="mt-0.5 text-sm font-medium text-ink">{v}</dd>
            </div>
          ))}
        </dl>

        {s.bio && <p className="text-sm text-ink-muted">{s.bio}</p>}

        <section>
          <h3 className="mb-2 text-sm font-semibold">Skills</h3>
          <div className="flex flex-wrap gap-1.5">
            {s.skills.length === 0 && <p className="text-sm text-ink-subtle">None listed.</p>}
            {s.skills.map((k) => <Badge key={k}>{k}</Badge>)}
          </div>
        </section>

        {s.projects.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold">Projects</h3>
            <ul className="space-y-2">
              {s.projects.map((p) => (
                <li key={p.title} className="rounded-lg border border-line p-3">
                  <p className="text-sm font-medium text-ink">{p.title}</p>
                  <p className="mt-0.5 text-xs text-ink-muted">{p.description}</p>
                </li>
              ))}
            </ul>
          </section>
        )}

        {s.certifications.length > 0 && (
          <section>
            <h3 className="mb-2 text-sm font-semibold">Certifications</h3>
            <ul className="space-y-1.5">
              {s.certifications.map((c) => (
                <li key={c.name} className="text-sm text-ink-muted">
                  {c.name} <span className="text-ink-subtle">&mdash; {c.issuer}, {c.year}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
          <a href={`mailto:${s.email}`} className="text-sm text-navy-700 hover:underline dark:text-navy-300">{s.email}</a>
          {s.hasResume && (
            <Button size="sm" variant="secondary" icon={<IconDownload className="h-4 w-4" />}
              onClick={async () => {
                const res = await fetch(`/api/students/${s.user_id}/resume`, {
                  headers: { Authorization: `Bearer ${getToken()}` },
                });
                window.open(URL.createObjectURL(await res.blob()), '_blank');
              }}>
              Resume
            </Button>
          )}
        </section>
      </div>
    </Modal>
  );
}
