import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api, getToken } from '../../lib/api';
import { useAsync, useDebounced } from '../../lib/useAsync';
import { relative, STATUS_LABEL } from '../../lib/format';
import type { Application, ApplicationStatus } from '../../lib/types';
import { PageHeader } from '../../components/Shell';
import { StatusPill } from '../../components/StatusPill';
import {
  Avatar, Badge, Button, EmptyState, ErrorState, Input, Select, Skeleton, cx, toast,
} from '../../components/ui';
import { IconDownload, IconFile, IconSearch } from '../../components/icons';

const BULK_ACTIONS: { id: ApplicationStatus; label: string }[] = [
  { id: 'shortlisted', label: 'Shortlist selected' },
  { id: 'rejected', label: 'Mark not selected' },
];

/**
 * Dense applicant table with search, status filter and bulk shortlisting.
 * Shared by the recruiter ("Candidates") and the placement officer.
 */
export default function ApplicationsTable({
  title, description,
}: { title: string; description: string }) {
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const search = useDebounced(q, 250);

  const { data, loading, error, reload } = useAsync(
    () => api.get<Application[]>('/applications', { q: search, status }),
    [search, status],
  );

  const rows = data ?? [];
  const allPicked = rows.length > 0 && picked.length === rows.length;

  const runBulk = async (next: ApplicationStatus) => {
    setBusy(true);
    try {
      const res = await api.patch<{ updated: number }>('/applications/bulk/status', {
        ids: picked, status: next,
      });
      toast.success(`${res.updated} application${res.updated === 1 ? '' : 's'} updated.`);
      setPicked([]);
      await reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not update.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title={title} description={description} />

      <div className="card mb-4 p-3">
        <div className="flex flex-col gap-2.5 sm:flex-row">
          <div className="relative flex-1">
            <IconSearch className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-subtle" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-9"
                   placeholder="Search by student, enrolment number, role or company"
                   aria-label="Search applications" />
          </div>
          <Select value={status} onChange={(e) => setStatus(e.target.value)} className="sm:w-52" aria-label="Filter by status">
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </Select>
        </div>
      </div>

      {/* Bulk action bar appears only with a selection. */}
      {picked.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-xl border border-navy-200 bg-navy-50 px-4 py-2.5 dark:border-navy-800 dark:bg-navy-900/50">
          <span className="text-sm font-medium text-ink">{picked.length} selected</span>
          <div className="ml-auto flex flex-wrap gap-2">
            {BULK_ACTIONS.map((a) => (
              <Button key={a.id} size="sm" variant={a.id === 'rejected' ? 'secondary' : 'primary'}
                      loading={busy} onClick={() => runBulk(a.id)}>
                {a.label}
              </Button>
            ))}
            <Button size="sm" variant="ghost" onClick={() => setPicked([])}>Clear</Button>
          </div>
        </div>
      )}

      {error && <ErrorState message={error} onRetry={reload} />}

      {loading ? (
        <Skeleton className="h-96" />
      ) : rows.length === 0 ? (
        <EmptyState icon={<IconFile className="h-8 w-8" />} title="No applications found"
                    description="Try a different search or clear the status filter." />
      ) : (
        <div className="card overflow-hidden">
          <div className="scroll-thin max-h-[70vh] overflow-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th className="w-10">
                    <input
                      type="checkbox"
                      checked={allPicked}
                      onChange={(e) => setPicked(e.target.checked ? rows.map((r) => r.id) : [])}
                      className="h-4 w-4 rounded border-line text-navy-700 focus:ring-navy-500"
                      aria-label="Select all"
                    />
                  </th>
                  <th>Student</th>
                  <th className="hidden md:table-cell">Branch</th>
                  <th className="hidden lg:table-cell">CGPA</th>
                  <th>Applied for</th>
                  <th className="hidden sm:table-cell">Match</th>
                  <th>Status</th>
                  <th className="hidden lg:table-cell">Updated</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => (
                  <tr key={a.id} className={cx(picked.includes(a.id) && 'bg-navy-50/60 dark:bg-navy-900/30')}>
                    <td>
                      <input
                        type="checkbox"
                        checked={picked.includes(a.id)}
                        onChange={(e) =>
                          setPicked((p) => (e.target.checked ? [...p, a.id] : p.filter((x) => x !== a.id)))}
                        className="h-4 w-4 rounded border-line text-navy-700 focus:ring-navy-500"
                        aria-label={`Select ${a.student_name}`}
                      />
                    </td>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={a.student_name} size="sm" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-ink">{a.student_name}</p>
                          <p className="truncate text-xs text-ink-subtle">{a.enrollment_no}</p>
                        </div>
                      </div>
                    </td>
                    <td className="hidden md:table-cell text-ink-muted">{a.branch}</td>
                    <td className="hidden lg:table-cell tabular-nums text-ink-muted">{a.cgpa.toFixed(2)}</td>
                    <td>
                      <p className="truncate font-medium text-ink">{a.title}</p>
                      <p className="truncate text-xs text-ink-subtle">{a.company_name}</p>
                    </td>
                    <td className="hidden sm:table-cell">
                      <Badge tone={a.match_score >= 60 ? 'good' : 'neutral'}>{a.match_score}%</Badge>
                    </td>
                    <td><StatusPill status={a.status} /></td>
                    <td className="hidden lg:table-cell whitespace-nowrap text-xs text-ink-subtle">
                      {relative(a.updated_at)}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                        {a.hasResume && (
                          <button
                            title={`Download ${a.student_name}'s resume`}
                            onClick={async () => {
                              const res = await fetch(`/api/students/${a.student_id}/resume`, {
                                headers: { Authorization: `Bearer ${getToken()}` },
                              });
                              window.open(URL.createObjectURL(await res.blob()), '_blank');
                            }}
                            className="rounded p-1.5 text-ink-subtle transition hover:bg-surface-sunken hover:text-ink"
                          >
                            <IconDownload className="h-4 w-4" />
                          </button>
                        )}
                        <Link
                          to={`/pipeline/${a.internship_id}`}
                          className="whitespace-nowrap rounded px-2 py-1 text-xs font-medium text-navy-700 transition hover:bg-surface-sunken dark:text-navy-300"
                        >
                          Pipeline
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
