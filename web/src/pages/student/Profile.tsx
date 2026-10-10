import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../../lib/auth';
import { api, getToken } from '../../lib/api';
import { BRANCHES } from '../../lib/format';
import type { Student } from '../../lib/types';
import { PageHeader } from '../../components/Shell';
import {
  Avatar, Badge, Button, Field, Input, Select, Skeleton, TagInput, Textarea, toast,
} from '../../components/ui';
import { IconDownload, IconFile, IconPlus, IconX } from '../../components/icons';

const SKILL_SUGGESTIONS = [
  'React', 'Node.js', 'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'SQL',
  'MongoDB', 'Express', 'HTML', 'CSS', 'Tailwind CSS', 'Git', 'Docker', 'AWS',
  'Machine Learning', 'Pandas', 'NumPy', 'TensorFlow', 'Figma', 'REST API',
  'Data Structures', 'Flutter', 'Kotlin', 'Power BI', 'Excel', 'Linux',
];

export default function Profile() {
  const { user, student, refresh } = useAuth();
  const [form, setForm] = useState<Student | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (student) setForm({ ...student }); }, [student]);

  if (!form || !user) {
    return <div className="space-y-3"><Skeleton className="h-10 w-48" /><Skeleton className="h-96" /></div>;
  }

  const set = <K extends keyof Student>(k: K, v: Student[K]) => setForm((f) => f && { ...f, [k]: v });

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/students/${user.id}`, {
        name: form.name, phone: form.phone, branch: form.branch, division: form.division,
        year: form.year, cgpa: form.cgpa, backlogs: form.backlogs, location: form.location,
        bio: form.bio, skills: form.skills, certifications: form.certifications,
        projects: form.projects, linkedin: form.linkedin, github: form.github,
      });
      await refresh();
      toast.success('Profile saved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  const uploadResume = async (file: File) => {
    setUploading(true);
    try {
      const body = new FormData();
      body.append('resume', file);
      await api.post(`/students/${user.id}/resume`, body);
      await refresh();
      toast.success('Resume uploaded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={save}>
      <PageHeader
        title="My profile"
        description="Recruiters see this when you apply. Eligibility is checked against your academic details."
        actions={<Button type="submit" loading={saving}>Save changes</Button>}
      />

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {/* Basics */}
          <section className="card p-5">
            <h2 className="mb-4 text-sm font-semibold">Personal details</h2>
            <div className="flex items-center gap-4">
              <Avatar name={form.name} size="lg" />
              <div className="min-w-0 flex-1">
                <Field label="Full name">
                  <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
                </Field>
              </div>
            </div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <Field label="Email" hint="Your email cannot be changed.">
                <Input value={form.email} disabled />
              </Field>
              <Field label="Phone">
                <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="9876543210" />
              </Field>
              <Field label="Location">
                <Input value={form.location} onChange={(e) => set('location', e.target.value)} placeholder="Pune, Maharashtra" />
              </Field>
              <Field label="Enrolment number" hint="Set at registration.">
                <Input value={form.enrollment_no} disabled />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="About you" hint="Two or three lines on what you are interested in.">
                <Textarea rows={3} value={form.bio} onChange={(e) => set('bio', e.target.value)} />
              </Field>
            </div>
          </section>

          {/* Academics */}
          <section className="card p-5">
            <h2 className="mb-1 text-sm font-semibold">Academic details</h2>
            <p className="mb-4 text-xs text-ink-muted">
              These decide which internships you are eligible for, so keep them accurate.
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <Field label="Branch">
                <Select value={form.branch} onChange={(e) => set('branch', e.target.value)}>
                  {BRANCHES.map((b) => <option key={b}>{b}</option>)}
                </Select>
              </Field>
              <Field label="Division">
                <Input value={form.division} onChange={(e) => set('division', e.target.value)} />
              </Field>
              <Field label="Year">
                <Select value={form.year} onChange={(e) => set('year', Number(e.target.value))}>
                  {[1, 2, 3, 4].map((y) => <option key={y} value={y}>Year {y}</option>)}
                </Select>
              </Field>
              <Field label="CGPA">
                <Input type="number" step="0.01" min="0" max="10" value={form.cgpa}
                       onChange={(e) => set('cgpa', Number(e.target.value))} />
              </Field>
              <Field label="Active backlogs">
                <Input type="number" min="0" value={form.backlogs}
                       onChange={(e) => set('backlogs', Number(e.target.value))} />
              </Field>
            </div>
          </section>

          {/* Skills */}
          <section className="card p-5">
            <h2 className="mb-1 text-sm font-semibold">Skills</h2>
            <p className="mb-3 text-xs text-ink-muted">
              Used to compute your match score against each internship.
            </p>
            <TagInput value={form.skills} onChange={(v) => set('skills', v)} suggestions={SKILL_SUGGESTIONS} />
          </section>

          {/* Projects */}
          <RepeatableSection
            title="Projects"
            hint="Show what you have built."
            items={form.projects}
            onChange={(v) => set('projects', v)}
            blank={{ title: '', description: '', link: '' }}
            render={(item, update) => (
              <>
                <Field label="Title">
                  <Input value={item.title} onChange={(e) => update({ ...item, title: e.target.value })}
                         placeholder="Campus Event Portal" />
                </Field>
                <Field label="Description">
                  <Textarea rows={2} value={item.description}
                            onChange={(e) => update({ ...item, description: e.target.value })}
                            placeholder="What it does and what you built." />
                </Field>
                <Field label="Link">
                  <Input value={item.link} onChange={(e) => update({ ...item, link: e.target.value })}
                         placeholder="https://github.com/..." />
                </Field>
              </>
            )}
          />

          {/* Certifications */}
          <RepeatableSection
            title="Certifications"
            hint="Courses and credentials you have completed."
            items={form.certifications}
            onChange={(v) => set('certifications', v)}
            blank={{ name: '', issuer: '', year: new Date().getFullYear() }}
            render={(item, update) => (
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Name">
                  <Input value={item.name} onChange={(e) => update({ ...item, name: e.target.value })} />
                </Field>
                <Field label="Issuer">
                  <Input value={item.issuer} onChange={(e) => update({ ...item, issuer: e.target.value })} />
                </Field>
                <Field label="Year">
                  <Input type="number" value={item.year}
                         onChange={(e) => update({ ...item, year: Number(e.target.value) })} />
                </Field>
              </div>
            )}
          />
        </div>

        {/* Sidebar: resume + links */}
        <aside className="space-y-5 lg:sticky lg:top-20 lg:self-start">
          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold">Resume</h2>
            {form.hasResume ? (
              <div className="flex items-start gap-3 rounded-lg border border-line bg-surface-sunken p-3">
                <IconFile className="mt-0.5 h-5 w-5 shrink-0 text-ink-muted" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{form.resume_name}</p>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetch(`/api/students/${user.id}/resume`, {
                        headers: { Authorization: `Bearer ${getToken()}` },
                      });
                      const url = URL.createObjectURL(await res.blob());
                      window.open(url, '_blank');
                    }}
                    className="mt-0.5 inline-flex items-center gap-1 text-xs font-medium text-navy-700 hover:underline dark:text-navy-300"
                  >
                    <IconDownload className="h-3.5 w-3.5" /> Download
                  </button>
                </div>
              </div>
            ) : (
              <p className="rounded-lg border border-dashed border-line px-3 py-4 text-center text-sm text-ink-subtle">
                No resume uploaded yet.
              </p>
            )}
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.doc,.docx"
              hidden
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadResume(f);
                e.target.value = '';
              }}
            />
            <Button
              type="button"
              variant="secondary"
              className="mt-3 w-full"
              loading={uploading}
              onClick={() => fileRef.current?.click()}
            >
              {form.hasResume ? 'Replace resume' : 'Upload resume'}
            </Button>
            <p className="mt-2 text-xs text-ink-subtle">PDF or Word, up to 5 MB.</p>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-sm font-semibold">Links</h2>
            <div className="space-y-3">
              <Field label="LinkedIn">
                <Input value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)}
                       placeholder="https://linkedin.com/in/..." />
              </Field>
              <Field label="GitHub">
                <Input value={form.github} onChange={(e) => set('github', e.target.value)}
                       placeholder="https://github.com/..." />
              </Field>
            </div>
          </section>

          <div className="card p-5">
            <h2 className="mb-2 text-sm font-semibold">Profile strength</h2>
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={form.skills.length >= 3 ? 'good' : 'neutral'}>{form.skills.length} skills</Badge>
              <Badge tone={form.projects.length > 0 ? 'good' : 'neutral'}>{form.projects.length} projects</Badge>
              <Badge tone={form.hasResume ? 'good' : 'neutral'}>{form.hasResume ? 'Resume added' : 'No resume'}</Badge>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile save bar */}
      <div className="sticky bottom-0 z-20 -mx-4 mt-5 border-t border-line bg-surface/90 px-4 py-3 backdrop-blur lg:hidden">
        <Button type="submit" loading={saving} className="w-full" size="lg">Save changes</Button>
      </div>
    </form>
  );
}

/** Add/remove list editor shared by Projects and Certifications. */
function RepeatableSection<T>({
  title, hint, items, onChange, blank, render,
}: {
  title: string; hint: string; items: T[]; onChange: (v: T[]) => void;
  blank: T; render: (item: T, update: (v: T) => void) => React.ReactNode;
}) {
  return (
    <section className="card p-5">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{title}</h2>
          <p className="text-xs text-ink-muted">{hint}</p>
        </div>
        <Button type="button" size="sm" variant="secondary" icon={<IconPlus className="h-4 w-4" />}
                onClick={() => onChange([...items, { ...blank }])}>
          Add
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line px-3 py-5 text-center text-sm text-ink-subtle">
          Nothing added yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {items.map((item, idx) => (
            <li key={idx} className="relative space-y-3 rounded-lg border border-line p-3.5 pr-10">
              {render(item, (v) => onChange(items.map((x, i) => (i === idx ? v : x))))}
              <button
                type="button"
                onClick={() => onChange(items.filter((_, i) => i !== idx))}
                className="absolute right-2.5 top-2.5 rounded-md p-1 text-ink-subtle transition hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950"
                aria-label={`Remove ${title.toLowerCase()} ${idx + 1}`}
              >
                <IconX className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
