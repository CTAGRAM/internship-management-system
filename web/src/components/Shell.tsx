import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { relative } from '../lib/format';
import type { Notification } from '../lib/types';
import { Avatar, Badge, Button, cx } from './ui';
import {
  IconBell, IconBriefcase, IconBuilding, IconCalendar, IconChart, IconFile,
  IconHome, IconLogout, IconMegaphone, IconMenu, IconMoon, IconSearch,
  IconSun, IconUser, IconUsers, IconX,
} from './icons';

type NavItem = { to: string; label: string; icon: (p: { className?: string }) => JSX.Element; end?: boolean };

const NAV: Record<string, NavItem[]> = {
  student: [
    { to: '/dashboard', label: 'Overview', icon: IconHome, end: true },
    { to: '/internships', label: 'Find internships', icon: IconSearch },
    { to: '/applications', label: 'My applications', icon: IconBriefcase },
    { to: '/interviews', label: 'Interviews', icon: IconCalendar },
    { to: '/profile', label: 'My profile', icon: IconUser },
    { to: '/announcements', label: 'Announcements', icon: IconMegaphone },
  ],
  recruiter: [
    { to: '/recruiter', label: 'Overview', icon: IconHome, end: true },
    { to: '/postings', label: 'My postings', icon: IconBriefcase },
    { to: '/candidates', label: 'Candidates', icon: IconUsers },
    { to: '/interviews', label: 'Interviews', icon: IconCalendar },
    { to: '/company', label: 'Company profile', icon: IconBuilding },
  ],
  admin: [
    { to: '/admin', label: 'Overview', icon: IconHome, end: true },
    { to: '/admin/students', label: 'Students', icon: IconUsers },
    { to: '/admin/companies', label: 'Companies', icon: IconBuilding },
    { to: '/admin/internships', label: 'Internships', icon: IconBriefcase },
    { to: '/admin/applications', label: 'Applications', icon: IconFile },
    { to: '/interviews', label: 'Interviews', icon: IconCalendar },
    { to: '/admin/reports', label: 'Reports', icon: IconChart },
    { to: '/announcements', label: 'Announcements', icon: IconMegaphone },
  ],
};

const ROLE_LABEL = {
  student: 'Student', recruiter: 'Recruiter', admin: 'Placement Officer',
} as const;

/* ------------------------------------------------------------ theme toggle */
function useTheme() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('ims.theme');
    if (saved) return saved === 'dark';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    localStorage.setItem('ims.theme', dark ? 'dark' : 'light');
  }, [dark]);
  return [dark, setDark] as const;
}

/* ------------------------------------------------------------ notifications */
function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [unread, setUnread] = useState(0);
  const navigate = useNavigate();

  const load = async () => {
    try {
      const res = await api.get<{ items: Notification[]; unread: number }>('/notifications');
      setItems(res.items);
      setUnread(res.unread);
    } catch { /* a failed poll should never break the page */ }
  };

  useEffect(() => {
    void load();
    const t = setInterval(load, 30_000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!open) return;
    const close = () => setOpen(false);
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);

  return (
    <div className="relative" onClick={(e) => e.stopPropagation()}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-ink-muted transition hover:bg-surface-sunken hover:text-ink"
        aria-label={`Notifications${unread ? `, ${unread} unread` : ''}`}
      >
        <IconBell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-40 mt-2 w-[min(22rem,calc(100vw-2rem))] overflow-hidden rounded-xl border border-line bg-surface-raised shadow-pop animate-fade-up">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <h3 className="text-sm font-semibold">Notifications</h3>
            {unread > 0 && (
              <button
                className="text-xs font-medium text-navy-700 hover:underline dark:text-navy-300"
                onClick={async () => { await api.patch('/notifications/read-all'); void load(); }}
              >
                Mark all read
              </button>
            )}
          </div>
          <ul className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-ink-subtle">You are all caught up.</li>
            )}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  onClick={async () => {
                    if (!n.read) await api.patch(`/notifications/${n.id}/read`);
                    setOpen(false);
                    void load();
                    if (n.link) navigate(n.link);
                  }}
                  className={cx(
                    'flex w-full gap-2.5 border-b border-line/60 px-4 py-3 text-left transition last:border-b-0 hover:bg-surface-sunken',
                    !n.read && 'bg-navy-50/50 dark:bg-navy-900/30',
                  )}
                >
                  <span className={cx('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
                    n.read ? 'bg-transparent' : 'bg-navy-600 dark:bg-navy-400')} />
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-ink">{n.title}</span>
                    {n.body && <span className="mt-0.5 block text-xs text-ink-muted">{n.body}</span>}
                    <span className="mt-1 block text-[11px] text-ink-subtle">{relative(n.created_at)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------- demo-mode notice */
/**
 * The serverless deployment stores its database in temporary storage, so the
 * data resets whenever a cold instance starts. Say so plainly rather than
 * letting someone lose work they thought was saved.
 */
function DemoNotice() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem('ims.demoNoticeDismissed')) return;
    fetch('/api/health')
      .then((r) => r.json())
      .then((d) => setShow(String(d.storage ?? '').startsWith('ephemeral')))
      .catch(() => {});
  }, []);

  if (!show) return null;
  return (
    <div className="flex items-start gap-2.5 border-b border-gold-300 bg-gold-50 px-4 py-2 text-sm text-gold-900 dark:border-gold-800 dark:bg-gold-900/40 dark:text-gold-100 sm:px-6">
      <span className="min-w-0 flex-1">
        <strong className="font-semibold">Live demo.</strong>{' '}
        This deployment uses temporary storage, so anything you change resets when the server
        restarts. Run it locally for a database that persists.
      </span>
      <button
        onClick={() => {
          sessionStorage.setItem('ims.demoNoticeDismissed', '1');
          setShow(false);
        }}
        className="-m-1 shrink-0 rounded p-1 transition hover:bg-gold-200/60 dark:hover:bg-gold-800/60"
        aria-label="Dismiss demo notice"
      >
        <IconX className="h-4 w-4" />
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------- Shell */
export function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout, student, company } = useAuth();
  const [dark, setDark] = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  if (!user) return null;
  const items = NAV[user.role] ?? [];
  const subtitle = user.role === 'student' ? student?.enrollment_no
    : user.role === 'recruiter' ? company?.name
    : 'Training & Placement Cell';

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-3">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.end}
          className={({ isActive }) => cx(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition',
            isActive
              ? 'bg-navy-800 text-white shadow-sm dark:bg-navy-600'
              : 'text-navy-100/70 hover:bg-white/10 hover:text-white',
          )}
        >
          <item.icon className="h-[18px] w-[18px] shrink-0" />
          {item.label}
        </NavLink>
      ))}

      <div className="mt-auto space-y-1 border-t border-white/10 pt-3">
        <div className="flex items-center gap-2.5 rounded-lg px-3 py-2">
          <Avatar name={user.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white">{user.name}</p>
            <p className="truncate text-xs text-navy-200/70">{subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => { logout(); navigate('/login'); }}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-navy-100/70 transition hover:bg-white/10 hover:text-white"
        >
          <IconLogout className="h-[18px] w-[18px]" />
          Sign out
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex min-h-dvh bg-surface">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col bg-navy-900 lg:flex">
        <Link to={items[0].to} className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-400 text-sm font-bold text-navy-950">
            IMS
          </span>
          <span className="leading-tight">
            <span className="block text-sm font-semibold text-white">Internship</span>
            <span className="block text-xs text-navy-200/70">Management System</span>
          </span>
        </Link>
        {sidebar}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-navy-950/60 backdrop-blur-sm animate-fade-in"
                  onClick={() => setMobileOpen(false)} aria-label="Close menu" />
          <aside className="absolute inset-y-0 left-0 flex w-[17rem] flex-col bg-navy-900 shadow-pop animate-fade-up">
            <div className="flex items-center justify-between px-5 py-4">
              <span className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gold-400 text-sm font-bold text-navy-950">IMS</span>
                <span className="text-sm font-semibold text-white">Internship MS</span>
              </span>
              <button onClick={() => setMobileOpen(false)} className="rounded-lg p-1.5 text-navy-200 hover:bg-white/10" aria-label="Close menu">
                <IconX className="h-5 w-5" />
              </button>
            </div>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <DemoNotice />
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-line bg-surface/85 px-3 backdrop-blur-md sm:px-5">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-ink-muted transition hover:bg-surface-sunken lg:hidden"
            aria-label="Open menu"
          >
            <IconMenu className="h-5 w-5" />
          </button>

          <span className="flex items-center gap-2 lg:hidden">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-navy-800 text-[11px] font-bold text-gold-300">IMS</span>
          </span>

          <div className="ml-auto flex items-center gap-1">
            <Badge tone="navy" className="hidden sm:inline-flex">{ROLE_LABEL[user.role]}</Badge>
            <button
              onClick={() => setDark(!dark)}
              className="rounded-lg p-2 text-ink-muted transition hover:bg-surface-sunken hover:text-ink"
              aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}
            >
              {dark ? <IconSun className="h-5 w-5" /> : <IconMoon className="h-5 w-5" />}
            </button>
            <NotificationBell />
          </div>
        </header>

        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 sm:px-6 sm:py-7">{children}</main>

        <footer className="border-t border-line px-4 py-4 text-center text-xs text-ink-subtle sm:px-6">
          Internship Management System &middot; MIT School of Computing, MIT ADT University
        </footer>
      </div>
    </div>
  );
}

/** Standard page heading with optional actions on the right. */
export function PageHeader({
  title, description, actions,
}: { title: string; description?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-ink-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export { Button };
