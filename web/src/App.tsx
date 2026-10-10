import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, homeFor, useAuth } from './lib/auth';
import type { Role } from './lib/types';
import { Shell } from './components/Shell';
import { Toaster } from './components/ui';

import Login from './pages/Login';
import Register from './pages/Register';

import StudentDashboard from './pages/student/Dashboard';
import Internships, { InternshipDetail } from './pages/student/Internships';
import StudentApplications, { ApplicationDetail } from './pages/student/Applications';
import Profile from './pages/student/Profile';

import RecruiterDashboard from './pages/recruiter/Dashboard';
import Postings from './pages/recruiter/Postings';
import Pipeline from './pages/recruiter/Pipeline';

import AdminDashboard from './pages/admin/Dashboard';
import AdminStudents from './pages/admin/Students';
import AdminCompanies, { CompanyProfile } from './pages/admin/Companies';
import Reports from './pages/admin/Reports';

import ApplicationsTable from './pages/shared/ApplicationsTable';
import Interviews from './pages/shared/Interviews';
import Announcements from './pages/shared/Announcements';

/** Full-page spinner while the session is being restored. */
function Booting() {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-3">
        <span className="flex h-12 w-12 animate-pulse items-center justify-center rounded-xl bg-navy-800 font-bold text-gold-300">
          IMS
        </span>
        <p className="text-sm text-ink-subtle">Loading your dashboard...</p>
      </div>
    </div>
  );
}

/** Blocks a route unless the signed-in user holds one of `roles`. */
function Protected({ roles, children }: { roles: Role[]; children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <Booting />;
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Shell>{children}</Shell>;
}

const ALL: Role[] = ['student', 'recruiter', 'admin'];

function Root() {
  const { user, loading } = useAuth();
  if (loading) return <Booting />;
  return <Navigate to={user ? homeFor(user.role) : '/login'} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Root />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* ------------------------------------------------------- student */}
          <Route path="/dashboard" element={<Protected roles={['student']}><StudentDashboard /></Protected>} />
          <Route path="/internships" element={<Protected roles={['student']}><Internships /></Protected>} />
          <Route path="/internships/:id" element={<Protected roles={['student']}><InternshipDetail /></Protected>} />
          <Route path="/applications" element={<Protected roles={['student']}><StudentApplications /></Protected>} />
          <Route path="/applications/:id" element={<Protected roles={['student']}><ApplicationDetail /></Protected>} />
          <Route path="/profile" element={<Protected roles={['student']}><Profile /></Protected>} />

          {/* ----------------------------------------------------- recruiter */}
          <Route path="/recruiter" element={<Protected roles={['recruiter']}><RecruiterDashboard /></Protected>} />
          <Route path="/postings" element={<Protected roles={['recruiter', 'admin']}><Postings /></Protected>} />
          <Route path="/pipeline/:id" element={<Protected roles={['recruiter', 'admin']}><Pipeline /></Protected>} />
          <Route path="/company" element={<Protected roles={['recruiter']}><CompanyProfile /></Protected>} />
          <Route
            path="/candidates"
            element={
              <Protected roles={['recruiter']}>
                <ApplicationsTable
                  title="Candidates"
                  description="Everyone who has applied to your postings. Shortlist in bulk or open a pipeline."
                />
              </Protected>
            }
          />

          {/* --------------------------------------------- placement officer */}
          <Route path="/admin" element={<Protected roles={['admin']}><AdminDashboard /></Protected>} />
          <Route path="/admin/students" element={<Protected roles={['admin']}><AdminStudents /></Protected>} />
          <Route path="/admin/companies" element={<Protected roles={['admin']}><AdminCompanies /></Protected>} />
          <Route path="/admin/internships" element={<Protected roles={['admin']}><Postings /></Protected>} />
          <Route path="/admin/reports" element={<Protected roles={['admin']}><Reports /></Protected>} />
          <Route
            path="/admin/applications"
            element={
              <Protected roles={['admin']}>
                <ApplicationsTable
                  title="All applications"
                  description="Every application across the department, with bulk shortlisting."
                />
              </Protected>
            }
          />

          {/* --------------------------------------------------------- shared */}
          <Route path="/interviews" element={<Protected roles={ALL}><Interviews /></Protected>} />
          <Route path="/announcements" element={<Protected roles={ALL}><Announcements /></Protected>} />

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <Toaster />
      </AuthProvider>
    </BrowserRouter>
  );
}
