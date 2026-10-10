export type Role = 'student' | 'recruiter' | 'admin';

export type ApplicationStatus =
  | 'applied' | 'shortlisted' | 'interview_scheduled' | 'selected'
  | 'rejected' | 'offer_accepted' | 'offer_declined' | 'completed';

export interface User { id: number; name: string; email: string; role: Role }

export interface Student {
  user_id: number; name: string; email: string; enrollment_no: string;
  phone: string; branch: string; division: string; year: number;
  cgpa: number; backlogs: number; location: string; bio: string;
  skills: string[];
  certifications: { name: string; issuer: string; year: number }[];
  projects: { title: string; description: string; link: string }[];
  linkedin: string; github: string; resume_name: string | null; hasResume: boolean;
  updated_at: string;
}

export interface Company {
  id: number; name: string; industry: string; website: string; location: string;
  about: string; hr_name: string; hr_email: string; verified: number;
  internship_count?: number; application_count?: number; selected_count?: number;
}

export interface Internship {
  id: number; company_id: number; company_name: string; company_industry: string;
  company_verified: number; title: string; description: string; responsibilities: string;
  location: string; work_mode: 'onsite' | 'remote' | 'hybrid'; duration_months: number;
  stipend: number; openings: number; skills: string[]; min_cgpa: number;
  max_backlogs: number; allowed_branches: string[]; allowed_years: number[];
  deadline: string; status: 'open' | 'closed'; application_count: number; expired: boolean;
  // student-only enrichment
  eligible?: boolean; reasons?: string[]; matchScore?: number; matchedSkills?: string[];
  applicationId?: number | null; applicationStatus?: ApplicationStatus | null;
}

export interface Application {
  id: number; internship_id: number; student_id: number; status: ApplicationStatus;
  status_label: string; cover_note: string; match_score: number;
  offer_stipend: number | null; offer_joining_date: string | null; offer_note: string | null;
  applied_at: string; updated_at: string;
  title: string; location: string; work_mode: string; stipend: number;
  duration_months: number; deadline: string; company_id: number; company_name: string;
  student_name: string; student_email: string; enrollment_no: string;
  branch: string; division: string; year: number; cgpa: number; backlogs: number;
  student_skills: string[]; internship_skills: string[]; phone: string; hasResume: boolean;
  timeline?: TimelineEvent[]; interviews?: Interview[];
}

export interface TimelineEvent {
  id: number; from_status: string | null; to_status: ApplicationStatus;
  note: string; actor_name: string | null; created_at: string;
}

export interface Interview {
  id: number; application_id: number; round: string; scheduled_at: string;
  mode: 'online' | 'offline'; venue: string; meeting_link: string; notes: string;
  outcome: 'pending' | 'passed' | 'failed';
  title?: string; company_name?: string; student_name?: string;
  enrollment_no?: string; branch?: string; internship_id?: number; student_id?: number;
}

export interface Candidate {
  id: number; student_id: number; name: string; email: string; enrollment_no: string;
  branch: string; division: string; year: number; cgpa: number; backlogs: number;
  skills: string[]; matchedSkills: string[]; match_score: number;
  status: ApplicationStatus; applied_at: string; hasResume: boolean; phone: string;
  cover_note: string;
}

export interface Notification {
  id: number; title: string; body: string; link: string; read: number; created_at: string;
}

export interface Announcement {
  id: number; title: string; body: string; author: string | null; created_at: string;
}

export interface AdminSummary {
  totals: Record<string, number>;
  funnel: { stage: string; count: number }[];
  byStatus: { status: string; count: number; label: string }[];
  byBranch: { branch: string; students: number; applied: number; placed: number }[];
  byCompany: { company: string; internships: number; applications: number; selected: number }[];
  topSkills: { skill: string; count: number }[];
  recentActivity: { to_status: string; label: string; created_at: string; student_name: string; title: string; company_name: string }[];
  applicationsOverTime: { day: string; count: number }[];
}
