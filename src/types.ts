export type UserRole = 'pengurus' | 'anggota';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  division: string;
  avatar: string;
  phone?: string;
  bio?: string;
  nim?: string;
  angkatan?: string;
  status?: 'Aktif' | 'Cuti' | 'Alumni';
  studyProgram?: string;
  twoFactorEnabled: boolean;
  twoFactorSecret?: string;
  registeredAt: string;
  notificationPreferences: {
    newEvents: boolean;
    beritaAcara: boolean;
    attendanceReminders: boolean;
    channel: 'browser' | 'email' | 'both';
  };
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  date: string;
  time: string;
  location: string;
  category: 'Rapat Anggota' | 'Rapat Pengurus' | 'Rapat Panitia' | 'Kegiatan Eksternal' | 'Seminar/Workshop' | 'Lainnya';
  attendanceOpen: boolean;
  attendanceCode?: string; // OTP code for attendance
  gcalSynced: boolean;
  gcalEventId?: string;
  createdAt: string;
}

export type AttendanceStatus = 'hadir' | 'sakit' | 'izin' | 'alfa';

export interface AttendanceRecord {
  id: string;
  eventId: string;
  eventTitle: string;
  eventDate: string;
  userId: string;
  userName: string;
  userDivision: string;
  timestamp: string;
  status: AttendanceStatus;
  notes?: string;
}

export interface BeritaAcara {
  id: string;
  eventId: string;
  eventTitle: string;
  title: string;
  content: string;
  date: string;
  authorName: string;
  authorRole: string;
  approvedBy?: string;
  fileUrl?: string; // simulated pdf/doc link
  tags: string[];
}

export interface ActivityDocumentation {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  date: string;
  uploaderName: string;
  location?: string;
  likes: number;
}

export interface SystemNotification {
  id: string;
  title: string;
  body: string;
  date: string;
  read: boolean;
  type: 'event' | 'minutes' | 'attendance' | 'system';
  targetRole: 'all' | 'pengurus' | 'anggota';
}

export interface KasTransaction {
  id: string;
  type: 'masuk' | 'keluar';
  amount: number;
  description: string;
  date: string; // YYYY-MM-DD
  category: string;
  recordedBy: string;
  memberName?: string;
  receiptUrl?: string;
}

export interface MemberKasRecord {
  userId: string;
  userName: string;
  division: string;
  avatar: string;
  payments: {
    [month: string]: 'lunas' | 'belum_bayar' | 'pending';
  };
  totalPaid: number;
}

export interface ProkerCommittee {
  role: string;
  userName: string;
  userId?: string;
}

export interface ProkerRundown {
  time: string;
  agenda: string;
  pic: string;
}

export interface ProkerAttendanceAttendee {
  userId?: string;
  userName: string;
  status: 'hadir' | 'sakit' | 'izin' | 'alfa';
  notes?: string;
}

export interface ProkerAttendanceSession {
  id: string;
  title: string;
  date: string;
  attendees: ProkerAttendanceAttendee[];
}

export interface ProkerMeetingMinute {
  id: string;
  title: string;
  date: string;
  content: string;
  writerName: string;
}

export interface ProkerDocument {
  id: string;
  title: string;
  type: 'Surat Masuk' | 'Surat Keluar' | 'Proposal' | 'LPJ' | 'Lainnya';
  fileUrlOrLink: string;
  uploadedAt: string;
}

export interface ProkerBudgetDetail {
  id: string;
  description: string;
  type: 'pemasukan' | 'pengeluaran';
  amount: number;
  date: string;
  status: 'Lunas' | 'Direncanakan' | 'Pending';
}

export interface ProkerItem {
  id: string;
  name: string;
  description: string;
  division: string;
  budget: number;
  status: 'Belum Mulai' | 'Berjalan' | 'Selesai';
  meetingsCount: number;
  committee: ProkerCommittee[];
  rundown: ProkerRundown[];
  createdAt: string;
  date?: string; // Target tanggal pelaksanaan kegiatan
  
  // NEW ADDITIONS FOR COMPREHENSIVE SPECIAL FILE SYSTEM
  attendanceSessions?: ProkerAttendanceSession[];
  meetingMinutes?: ProkerMeetingMinute[];
  documents?: ProkerDocument[];
  budgets?: ProkerBudgetDetail[];
}

