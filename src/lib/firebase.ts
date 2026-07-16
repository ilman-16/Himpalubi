import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc, deleteDoc, getDocFromServer, setLogLevel } from 'firebase/firestore';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { 
  UserProfile, 
  EventItem, 
  AttendanceRecord, 
  BeritaAcara, 
  ActivityDocumentation, 
  SystemNotification,
  KasTransaction,
  MemberKasRecord,
  ProkerItem
} from '../types';

import firebaseConfig from '../../firebase-applet-config.json';

// Ensure we have fallback if apiKey is empty
const hasFirebaseConfig = !!(firebaseConfig && firebaseConfig.apiKey);

let app;
let db: any = null;
let auth: any = null;

if (hasFirebaseConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    const dbId = (firebaseConfig as any).firestoreDatabaseId;
    db = dbId ? getFirestore(app, dbId) : getFirestore(app);
    // Suppress verbose Firebase internal warning logs (e.g. while database is provisioning)
    setLogLevel('error');
    auth = getAuth(app);
  } catch (err) {
    console.error("Firebase initialization failed:", err);
  }
}

// --- FIREBASE SECURITY AND ERROR HANDLING ---
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider: any) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connectivity test
async function testConnection() {
  if (db && hasFirebaseConfig) {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (msg.includes('offline')) {
        console.warn("Firebase client appears to be offline. Local cache fallback will handle this gracefully.");
      } else if (msg.includes('not found') || msg.includes('configuration') || msg.includes('database')) {
        console.warn("Firebase Firestore is still provisioning in the Google Cloud platform. Seamlessly using secure LocalDB fallback.");
      }
    }
  }
}
testConnection();

// --- LOCAL STORAGE & OFFLINE PERSISTENCE WORKER ---
// This acts as a robust local database and sync layer.
// It ensures that even if Firestore is not provisioned or there is no internet, 
// the app works beautifully offline and saves changes.

const STORAGE_KEYS = {
  USERS: 'student_org_users',
  EVENTS: 'student_org_events',
  ATTENDANCE: 'student_org_attendance',
  MINUTES: 'student_org_minutes',
  DOCUMENTATION: 'student_org_documentation',
  NOTIFICATIONS: 'student_org_notifications',
  CURRENT_USER: 'student_org_current_user',
  GCAL_SYNCED_EVENTS: 'student_org_gcal_synced',
  KAS_TRANSACTIONS: 'student_org_kas_transactions',
  MEMBER_KAS: 'student_org_member_kas',
  PROKERS: 'student_org_prokers',
};

// --- REAL SEED DATA ---
const SEED_USERS: UserProfile[] = [
  {
    id: 'usr-1',
    name: 'Ilman Mubarok',
    email: 'ilmanmubarok16@gmail.com',
    role: 'pengurus',
    division: 'Badan Pengurus Harian (Ketua Umum)',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
    bio: 'Menjabat sebagai Ketua Umum HIMPALUBI periode 2026/2027. Berfokus pada digitalisasi organisasi dan sinergi inklusif.',
    phone: '081234567890',
    nim: '220511001',
    angkatan: '2022',
    status: 'Aktif',
    studyProgram: 'Pendidikan Luar Biasa',
    twoFactorEnabled: true,
    twoFactorSecret: 'K47XG38Z',
    registeredAt: '2026-01-10T08:00:00Z',
    notificationPreferences: {
      newEvents: true,
      beritaAcara: true,
      attendanceReminders: true,
      channel: 'both'
    }
  },
  {
    id: 'usr-2',
    name: 'Farhan Ramadhan',
    email: 'farhan.ramadhan@univ.ac.id',
    role: 'pengurus',
    division: 'Badan Pengurus Harian (Wakil Ketua Umum)',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
    bio: 'Wakil Ketua Umum HIMPALUBI. Mengkoordinir internal seluruh divisi organisasi.',
    phone: '081277889911',
    nim: '220511002',
    angkatan: '2022',
    status: 'Aktif',
    studyProgram: 'Pendidikan Luar Biasa',
    twoFactorEnabled: false,
    registeredAt: '2026-01-11T09:00:00Z',
    notificationPreferences: {
      newEvents: true,
      beritaAcara: true,
      attendanceReminders: true,
      channel: 'browser'
    }
  },
  {
    id: 'usr-3',
    name: 'Aditya Pratama',
    email: 'aditya.pratama@univ.ac.id',
    role: 'pengurus',
    division: 'Badan Pengurus Harian (Sekretaris)',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=120',
    bio: 'Sekretaris Umum HIMPALUBI. Bertanggung jawab atas administrasi, persuratan, dan dokumentasi rapat.',
    phone: '081298765432',
    nim: '220511003',
    angkatan: '2022',
    status: 'Aktif',
    studyProgram: 'Pendidikan Luar Biasa',
    twoFactorEnabled: false,
    registeredAt: '2026-01-11T09:30:00Z',
    notificationPreferences: {
      newEvents: true,
      beritaAcara: true,
      attendanceReminders: false,
      channel: 'browser'
    }
  },
  {
    id: 'usr-4',
    name: 'Siti Rahma',
    email: 'siti.rahma@univ.ac.id',
    role: 'pengurus',
    division: 'Badan Pengurus Harian (Bendahara)',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
    bio: 'Bendahara HIMPALUBI. Mengatur sirkulasi keuangan kas himpunan dan pelaporan transparansi dana.',
    phone: '085712345678',
    nim: '220511004',
    angkatan: '2022',
    status: 'Aktif',
    studyProgram: 'Pendidikan Luar Biasa',
    twoFactorEnabled: false,
    registeredAt: '2026-01-12T10:15:00Z',
    notificationPreferences: {
      newEvents: true,
      beritaAcara: false,
      attendanceReminders: true,
      channel: 'email'
    }
  },
  {
    id: 'usr-5',
    name: 'Amanda Putri',
    email: 'amanda.putri@univ.ac.id',
    role: 'pengurus',
    division: 'Divisi Penelitian dan Pengembangan (Litbang)',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120',
    bio: 'Koordinator Divisi Litbang. Melakukan riset keilmuan pendidikan luar biasa dan inklusi.',
    phone: '081344556677',
    nim: '230511010',
    angkatan: '2023',
    status: 'Aktif',
    studyProgram: 'Pendidikan Luar Biasa',
    twoFactorEnabled: false,
    registeredAt: '2026-02-02T11:00:00Z',
    notificationPreferences: {
      newEvents: true,
      beritaAcara: false,
      attendanceReminders: true,
      channel: 'browser'
    }
  },
  {
    id: 'usr-6',
    name: 'Rian Hidayat',
    email: 'rian.hidayat@univ.ac.id',
    role: 'pengurus',
    division: 'Divisi Public Relation',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
    bio: 'Staf Divisi Public Relation. Membangun jembatan komunikasi internal-eksternal kampus.',
    phone: '089876543210',
    nim: '230511020',
    angkatan: '2023',
    status: 'Aktif',
    studyProgram: 'Pendidikan Luar Biasa',
    twoFactorEnabled: false,
    registeredAt: '2026-02-01T14:00:00Z',
    notificationPreferences: {
      newEvents: true,
      beritaAcara: true,
      attendanceReminders: true,
      channel: 'browser'
    }
  },
  {
    id: 'usr-7',
    name: 'Laras Ati',
    email: 'laras.ati@univ.ac.id',
    role: 'pengurus',
    division: 'Divisi Pengabdian Masyarakat',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120',
    bio: 'Koordinator Pengabdian Masyarakat. Mewujudkan inklusivitas nyata di lingkungan sosial.',
    phone: '085244332211',
    nim: '230511030',
    angkatan: '2023',
    status: 'Aktif',
    studyProgram: 'Pendidikan Luar Biasa',
    twoFactorEnabled: false,
    registeredAt: '2026-02-07T09:00:00Z',
    notificationPreferences: {
      newEvents: true,
      beritaAcara: true,
      attendanceReminders: true,
      channel: 'browser'
    }
  },
  {
    id: 'usr-8',
    name: 'Dika Wijaya',
    email: 'dika.wijaya@univ.ac.id',
    role: 'pengurus',
    division: 'Divisi Pengembangan Sumber Daya Anggota (PSDA)',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=120',
    bio: 'Staf PSDA. Menjaga solidaritas dan peningkatan soft skill anggota aktif HIMPALUBI.',
    phone: '081299338877',
    nim: '230511040',
    angkatan: '2023',
    status: 'Aktif',
    studyProgram: 'Pendidikan Luar Biasa',
    twoFactorEnabled: false,
    registeredAt: '2026-02-08T10:00:00Z',
    notificationPreferences: {
      newEvents: true,
      beritaAcara: true,
      attendanceReminders: true,
      channel: 'browser'
    }
  },
  {
    id: 'usr-9',
    name: 'Rizky Fadillah',
    email: 'rizky.fadillah@univ.ac.id',
    role: 'pengurus',
    division: 'Divisi Information and Technology (Teknologi Informasi)',
    avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=120',
    bio: 'Koordinator Divisi IT. Mengelola website, media sosial, publikasi, dan digitalisasi data Himpalubi.',
    phone: '081255554444',
    nim: '240511050',
    angkatan: '2024',
    status: 'Aktif',
    studyProgram: 'Pendidikan Luar Biasa',
    twoFactorEnabled: false,
    registeredAt: '2026-02-09T11:00:00Z',
    notificationPreferences: {
      newEvents: true,
      beritaAcara: true,
      attendanceReminders: true,
      channel: 'browser'
    }
  },
  {
    id: 'usr-10',
    name: 'Anisa Rahmawati',
    email: 'anisa.rahma@univ.ac.id',
    role: 'pengurus',
    division: 'Divisi Sarana dan Prasarana',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=120',
    bio: 'Koordinator Sarpras. Menginventarisir dan menjaga fasilitas fisik milik HIMPALUBI.',
    phone: '081399001122',
    nim: '240511060',
    angkatan: '2024',
    status: 'Aktif',
    studyProgram: 'Pendidikan Luar Biasa',
    twoFactorEnabled: false,
    registeredAt: '2026-02-10T14:30:00Z',
    notificationPreferences: {
      newEvents: true,
      beritaAcara: true,
      attendanceReminders: true,
      channel: 'browser'
    }
  },
  {
    id: 'usr-11',
    name: 'Budi Santoso',
    email: 'budi.santoso@univ.ac.id',
    role: 'anggota',
    division: 'Anggota Biasa (Tanpa Divisi)',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=120',
    bio: 'Anggota aktif mahasiswa PLB Angkatan 2024. Senang berpartisipasi dalam agenda sosial.',
    phone: '087711223344',
    nim: '240511005',
    angkatan: '2024',
    status: 'Aktif',
    studyProgram: 'Pendidikan Luar Biasa',
    twoFactorEnabled: false,
    registeredAt: '2026-03-01T09:00:00Z',
    notificationPreferences: {
      newEvents: true,
      beritaAcara: false,
      attendanceReminders: true,
      channel: 'browser'
    }
  },
  {
    id: 'usr-12',
    name: 'Citra Lestari',
    email: 'citra.lestari@univ.ac.id',
    role: 'anggota',
    division: 'Anggota Biasa (Tanpa Divisi)',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=120',
    bio: 'Anggota aktif mahasiswa PLB Angkatan 2025. Tertarik belajar pengembangan inklusivitas anak berkebutuhan khusus.',
    phone: '089911223344',
    nim: '250511012',
    angkatan: '2025',
    status: 'Aktif',
    studyProgram: 'Pendidikan Luar Biasa',
    twoFactorEnabled: false,
    registeredAt: '2026-03-05T10:00:00Z',
    notificationPreferences: {
      newEvents: true,
      beritaAcara: true,
      attendanceReminders: true,
      channel: 'browser'
    }
  }
];

const SEED_EVENTS: EventItem[] = [
  {
    id: 'evt-1',
    title: 'Rapat Pleno Pengurus Bulanan',
    description: 'Rapat rutin bulanan pengurus untuk menyusun program kerja dan pembahasan internal organisasi. (Dihadiri khusus oleh Pengurus saja)',
    date: '2026-06-15',
    time: '13:00 - 16:00',
    location: 'Ruang Sidang Utama & Zoom Meeting',
    category: 'Rapat Pengurus',
    attendanceOpen: false,
    gcalSynced: true,
    gcalEventId: 'gcal_1',
    createdAt: '2026-06-01T08:00:00Z'
  },
  {
    id: 'evt-2',
    title: 'Seminar Nasional Tekno-Inovasi 2026',
    description: 'Seminar nasional bertajuk digitalisasi organisasi mahasiswa di era AI, mengundang pakar teknologi tingkat nasional.',
    date: '2026-07-02',
    time: '09:00 - 15:00',
    location: 'Aula Barat Universitas',
    category: 'Seminar/Workshop',
    attendanceOpen: false,
    gcalSynced: true,
    gcalEventId: 'gcal_2',
    createdAt: '2026-06-10T10:00:00Z'
  },
  {
    id: 'evt-3',
    title: 'Evaluasi Tengah Tahun & Re-bonding',
    description: 'Mengevaluasi program kerja yang berjalan, membahas kendala, serta dilanjutkan dengan sesi team-building outdoor.',
    date: '2026-07-10',
    time: '08:00 - 17:00',
    location: 'Villa Kaliurang, Yogyakarta',
    category: 'Kegiatan Eksternal',
    attendanceOpen: false,
    gcalSynced: false,
    createdAt: '2026-06-25T11:00:00Z'
  },
  {
    id: 'evt-4',
    title: 'Rapat Umum Anggota Dua Bulanan',
    description: 'Pertemuan akbar dua bulanan untuk menjaring aspirasi, sosialisasi proker terbaru, serta koordinasi umum. (Dihadiri oleh seluruh Pengurus dan Anggota)',
    date: '2026-07-16',
    time: '19:00 - 21:00',
    location: 'Sekretariat Himpunan & Google Meet',
    category: 'Rapat Anggota',
    attendanceOpen: true,
    attendanceCode: 'MEMBER99',
    gcalSynced: false,
    createdAt: '2026-07-12T09:00:00Z'
  },
  {
    id: 'evt-5',
    title: 'Workshop Cloud Computing & DevOps',
    description: 'Pelatihan internal khusus bagi divisi Riset dan Teknologi mengenai instalasi container dan cloud computing dasar.',
    date: '2026-07-28',
    time: '10:00 - 14:00',
    location: 'Laboratorium Rekayasa Perangkat Lunak',
    category: 'Seminar/Workshop',
    attendanceOpen: false,
    gcalSynced: false,
    createdAt: '2026-07-13T12:00:00Z'
  },
  {
    id: 'evt-6',
    title: 'Rapat Koordinasi Panitia Pelaksana',
    description: 'Rapat teknis persiapan acara Seminar Nasional yang dihadiri oleh seluruh pengurus dan anggota terpilih sebagai panitia pelaksana.',
    date: '2026-07-20',
    time: '15:30 - 17:30',
    location: 'Co-Working Space Perpustakaan',
    category: 'Rapat Panitia',
    attendanceOpen: true,
    attendanceCode: 'PANITIA88',
    gcalSynced: false,
    createdAt: '2026-07-14T08:00:00Z'
  }
];

const SEED_ATTENDANCE: AttendanceRecord[] = [
  // Attendance records for Event 1 (Raker Awal Semester)
  { id: 'att-1', eventId: 'evt-1', eventTitle: 'Rapat Kerja Awal Semester Genap', eventDate: '2026-06-15', userId: 'usr-1', userName: 'Ilman Mubarok', userDivision: 'Badan Pengurus Harian (Ketua)', timestamp: '2026-06-15T12:55:00Z', status: 'hadir' },
  { id: 'att-2', eventId: 'evt-1', eventTitle: 'Rapat Kerja Awal Semester Genap', eventDate: '2026-06-15', userId: 'usr-2', userName: 'Aditya Pratama', userDivision: 'Badan Pengurus Harian (Sekretaris)', timestamp: '2026-06-15T12:58:00Z', status: 'hadir' },
  { id: 'att-3', eventId: 'evt-1', eventTitle: 'Rapat Kerja Awal Semester Genap', eventDate: '2026-06-15', userId: 'usr-3', userName: 'Siti Rahma', userDivision: 'Badan Pengurus Harian (Bendahara)', timestamp: '2026-06-15T13:02:00Z', status: 'hadir' },
  { id: 'att-4', eventId: 'evt-1', eventTitle: 'Rapat Kerja Awal Semester Genap', eventDate: '2026-06-15', userId: 'usr-4', userName: 'Rian Hidayat', userDivision: 'Divisi Hubungan Masyarakat', timestamp: '2026-06-15T13:15:00Z', status: 'hadir', notes: 'Terlambat karena ada kuliah pengganti' },
  { id: 'att-5', eventId: 'evt-1', eventTitle: 'Rapat Kerja Awal Semester Genap', eventDate: '2026-06-15', userId: 'usr-5', userName: 'Amanda Putri', userDivision: 'Divisi Riset & Teknologi', timestamp: '2026-06-15T12:50:00Z', status: 'hadir' },
  { id: 'att-6', eventId: 'evt-1', eventTitle: 'Rapat Kerja Awal Semester Genap', eventDate: '2026-06-15', userId: 'usr-6', userName: 'Farhan Azhar', userDivision: 'Divisi Riset & Teknologi', timestamp: '', status: 'izin', notes: 'Sakit Demam berdarah' },
  { id: 'att-7', eventId: 'evt-1', eventTitle: 'Rapat Kerja Awal Semester Genap', eventDate: '2026-06-15', userId: 'usr-7', userName: 'Laras Ati', userDivision: 'Divisi Minat & Bakat', timestamp: '', status: 'alfa' },

  // Attendance records for Event 2 (Seminar Nasional)
  { id: 'att-8', eventId: 'evt-2', eventTitle: 'Seminar Nasional Tekno-Inovasi 2026', eventDate: '2026-07-02', userId: 'usr-1', userName: 'Ilman Mubarok', userDivision: 'Badan Pengurus Harian (Ketua)', timestamp: '2026-07-02T08:30:00Z', status: 'hadir' },
  { id: 'att-9', eventId: 'evt-2', eventTitle: 'Seminar Nasional Tekno-Inovasi 2026', eventDate: '2026-07-02', userId: 'usr-2', userName: 'Aditya Pratama', userDivision: 'Badan Pengurus Harian (Sekretaris)', timestamp: '2026-07-02T08:45:00Z', status: 'hadir' },
  { id: 'att-10', eventId: 'evt-2', eventTitle: 'Seminar Nasional Tekno-Inovasi 2026', eventDate: '2026-07-02', userId: 'usr-3', userName: 'Siti Rahma', userDivision: 'Badan Pengurus Harian (Bendahara)', timestamp: '2026-07-02T08:40:00Z', status: 'hadir' },
  { id: 'att-11', eventId: 'evt-2', eventTitle: 'Seminar Nasional Tekno-Inovasi 2026', eventDate: '2026-07-02', userId: 'usr-4', userName: 'Rian Hidayat', userDivision: 'Divisi Hubungan Masyarakat', timestamp: '2026-07-02T08:35:00Z', status: 'hadir' },
  { id: 'att-12', eventId: 'evt-2', eventTitle: 'Seminar Nasional Tekno-Inovasi 2026', eventDate: '2026-07-02', userId: 'usr-5', userName: 'Amanda Putri', userDivision: 'Divisi Riset & Teknologi', timestamp: '2026-07-02T08:50:00Z', status: 'hadir' },
  { id: 'att-13', eventId: 'evt-2', eventTitle: 'Seminar Nasional Tekno-Inovasi 2026', eventDate: '2026-07-02', userId: 'usr-6', userName: 'Farhan Azhar', userDivision: 'Divisi Riset & Teknologi', timestamp: '2026-07-02T08:52:00Z', status: 'hadir' },
  { id: 'att-14', eventId: 'evt-2', eventTitle: 'Seminar Nasional Tekno-Inovasi 2026', eventDate: '2026-07-02', userId: 'usr-7', userName: 'Laras Ati', userDivision: 'Divisi Minat & Bakat', timestamp: '', status: 'izin', notes: 'Menjadi delegasi universitas dalam lomba paduan suara' },

  // Attendance records for Event 3 (Evaluasi Tengah Tahun)
  { id: 'att-15', eventId: 'evt-3', eventTitle: 'Evaluasi Tengah Tahun & Re-bonding', eventDate: '2026-07-10', userId: 'usr-1', userName: 'Ilman Mubarok', userDivision: 'Badan Pengurus Harian (Ketua)', timestamp: '2026-07-10T07:45:00Z', status: 'hadir' },
  { id: 'att-16', eventId: 'evt-3', eventTitle: 'Evaluasi Tengah Tahun & Re-bonding', eventDate: '2026-07-10', userId: 'usr-2', userName: 'Aditya Pratama', userDivision: 'Badan Pengurus Harian (Sekretaris)', timestamp: '2026-07-10T07:50:00Z', status: 'hadir' },
  { id: 'att-17', eventId: 'evt-3', eventTitle: 'Evaluasi Tengah Tahun & Re-bonding', eventDate: '2026-07-10', userId: 'usr-3', userName: 'Siti Rahma', userDivision: 'Badan Pengurus Harian (Bendahara)', timestamp: '2026-07-10T08:00:00Z', status: 'hadir' },
  { id: 'att-18', eventId: 'evt-3', eventTitle: 'Evaluasi Tengah Tahun & Re-bonding', eventDate: '2026-07-10', userId: 'usr-4', userName: 'Rian Hidayat', userDivision: 'Divisi Hubungan Masyarakat', timestamp: '', status: 'sakit', notes: 'Surat dokter terlampir' },
  { id: 'att-19', eventId: 'evt-3', eventTitle: 'Evaluasi Tengah Tahun & Re-bonding', eventDate: '2026-07-10', userId: 'usr-5', userName: 'Amanda Putri', userDivision: 'Divisi Riset & Teknologi', timestamp: '2026-07-10T07:30:00Z', status: 'hadir' },
  { id: 'att-20', eventId: 'evt-3', eventTitle: 'Evaluasi Tengah Tahun & Re-bonding', eventDate: '2026-07-10', userId: 'usr-6', userName: 'Farhan Azhar', userDivision: 'Divisi Riset & Teknologi', timestamp: '2026-07-10T07:40:00Z', status: 'hadir' },
  { id: 'att-21', eventId: 'evt-3', eventTitle: 'Evaluasi Tengah Tahun & Re-bonding', eventDate: '2026-07-10', userId: 'usr-7', userName: 'Laras Ati', userDivision: 'Divisi Minat & Bakat', timestamp: '2026-07-10T07:55:00Z', status: 'hadir' }
];

const SEED_MINUTES: BeritaAcara[] = [
  {
    id: 'min-1',
    eventId: 'evt-1',
    eventTitle: 'Rapat Kerja Awal Semester Genap',
    title: 'Berita Acara Raker Semester Genap 2026',
    content: `## Berita Acara Hasil Rapat Kerja

**Hari/Tanggal:** Senin, 15 Juni 2026
**Waktu:** 13:00 - 16:00 WIB
**Tempat:** Ruang Sidang Utama & Zoom Meeting
**Pimpinan Rapat:** Ilman Mubarok (Ketua Umum)
**Notulis:** Aditya Pratama (Sekretaris Umum)

### Agenda Rapat:
1. Pemaparan rancangan Program Kerja (Proker) dari masing-masing divisi.
2. Sinkronisasi timeline kegiatan agar tidak bentrok.
3. Alokasi dana anggaran kemahasiswaan oleh Bendahara Umum.

### Keputusan dan Hasil Rapat:
1. **Divisi Humas:** Disetujui pelaksanaan proker *Humas Sharing Session* pada pertengahan September 2026 dengan estimasi anggaran Rp 1.500.000.
2. **Divisi Riset & Teknologi:** Disetujui proker *Portal Digital Organisasi* dan *Seminar Nasional Tekno-Inovasi* pada awal Juli 2026 dengan anggaran Rp 4.500.000.
3. **Divisi Minat & Bakat:** Disetujui pelaksanaan kompetisi internal *Art & Sports Weeks* di bulan November 2026 dengan anggaran Rp 3.000.000.
4. **Anggaran Total:** Alokasi total pengeluaran disetujui sebesar Rp 9.000.000, dengan sisa cadangan Rp 1.000.000 di kas BPH.

### Rencana Tindak Lanjut:
- Sekretaris membuat surat keputusan pembagian tugas divisi.
- Bendahara melakukan pencairan tahap pertama untuk Seminar Nasional paling lambat tanggal 22 Juni 2026.`,
    date: '2026-06-15',
    authorName: 'Aditya Pratama',
    authorRole: 'Sekretaris Umum',
    approvedBy: 'Ilman Mubarok',
    tags: ['Raker', 'Anggaran', 'Program Kerja']
  },
  {
    id: 'min-2',
    eventId: 'evt-2',
    eventTitle: 'Seminar Nasional Tekno-Inovasi 2026',
    title: 'Laporan Pertanggungjawaban Seminar Nasional 2026',
    content: `## Berita Acara & Evaluasi Kegiatan Seminar Nasional

**Hari/Tanggal:** Kamis, 2 Juli 2026
**Waktu:** 09:00 - 15:00 WIB
**Tempat:** Aula Barat Universitas
**Pimpinan Evaluasi:** Amanda Putri (Divisi Riset & Teknologi)
**Notulis:** Aditya Pratama (Sekretaris Umum)

### Laporan Pelaksanaan:
- **Jumlah Peserta:** Terdaftar 245 mahasiswa (target awal 200). Kehadiran fisik 189 peserta dan online 56 peserta.
- **Pembicara:** Dr. Hermawan (Ahli AI UI) dan Budi Santoso (VP Engineer GoTo).
- **Keuangan:** Pemasukan total Rp 5.000.000 (Sponsor + HTM). Pengeluaran total Rp 4.800.000. Saldo surplus Rp 200.000 dialihkan ke Kas Himpunan.

### Catatan Evaluasi:
1. **Fasilitas:** Konsumsi bagi peserta luring sempat terlambat 15 menit dari jadwal istirahat.
2. **Sinyal/Streaming:** Sinyal audio streaming sempat terputus sekitar 3 menit pada pembicara pertama, diselesaikan dengan pergantian modem backup.
3. **Sinergi:** Divisi Humas bekerja sangat baik dalam hal branding sosial media sehingga jumlah pendaftar melebihi target.`,
    date: '2026-07-03',
    authorName: 'Aditya Pratama',
    authorRole: 'Sekretaris Umum',
    approvedBy: 'Ilman Mubarok',
    tags: ['Seminar', 'LPJ', 'Evaluasi']
  }
];

const SEED_DOCUMENTATION: ActivityDocumentation[] = [
  {
    id: 'doc-1',
    title: 'Pembukaan Rapat Kerja Semester Genap',
    description: 'Foto bersama seluruh jajaran pengurus dan anggota divisi setelah memaparkan program kerja unggulan di Ruang Sidang Utama.',
    imageUrl: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=600',
    date: '2026-06-15',
    uploaderName: 'Aditya Pratama',
    location: 'Ruang Sidang Utama',
    likes: 12
  },
  {
    id: 'doc-2',
    title: 'Sesi Diskusi Panel Seminar Nasional',
    description: 'Bapak Dr. Hermawan menjelaskan materi peran Generative AI di depan ratusan mahasiswa yang berkumpul di Aula Barat.',
    imageUrl: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=600',
    date: '2026-07-02',
    uploaderName: 'Ilman Mubarok',
    location: 'Aula Barat Universitas',
    likes: 24
  },
  {
    id: 'doc-3',
    title: 'Keseruan Outbound Team-Building',
    description: 'Momen kebersamaan bermain game kerjasama tim untuk mempererat rasa kekeluargaan dan melatih skill kepemimpinan pengurus.',
    imageUrl: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=600',
    date: '2026-07-10',
    uploaderName: 'Siti Rahma',
    location: 'Villa Kaliurang',
    likes: 18
  }
];

const SEED_NOTIFICATIONS: SystemNotification[] = [
  {
    id: 'notif-1',
    title: 'Jadwal Rakor Baru Ditambahkan!',
    body: 'Rapat Koordinasi Mingguan dijadwalkan pada Kamis, 16 Juli jam 19.00 WIB. Jangan lupa siapkan laporan divisi.',
    date: '2026-07-12T09:00:00Z',
    read: false,
    type: 'event',
    targetRole: 'all'
  },
  {
    id: 'notif-2',
    title: 'Berita Acara Seminar Dirilis',
    body: 'Berita acara & Laporan Pertanggungjawaban Seminar Nasional Tekno-Inovasi 2026 telah diunggah oleh Sekretaris.',
    date: '2026-07-03T10:00:00Z',
    read: true,
    type: 'minutes',
    targetRole: 'all'
  },
  {
    id: 'notif-3',
    title: 'Sistem Keamanan 2FA Baru Aktif',
    body: 'Dukung keamanan organisasi dengan mengaktifkan Two-Factor Authentication di profil akun Anda sekarang.',
    date: '2026-07-01T08:00:00Z',
    read: true,
    type: 'system',
    targetRole: 'all'
  }
];

const SEED_KAS_TRANSACTIONS: KasTransaction[] = [
  {
    id: 'tx-1',
    type: 'masuk',
    amount: 5000000,
    description: 'Sponsorship dari Dana Kemahasiswaan Kampus',
    date: '2026-06-10',
    category: 'Sponsor',
    recordedBy: 'Siti Rahma'
  },
  {
    id: 'tx-2',
    type: 'keluar',
    amount: 3500000,
    description: 'Biaya Sewa Tempat & Pembicara Seminar Nasional',
    date: '2026-07-02',
    category: 'Perlengkapan',
    recordedBy: 'Siti Rahma'
  },
  {
    id: 'tx-3',
    type: 'masuk',
    amount: 200000,
    description: 'Sisa Kelebihan Anggaran Kegiatan Seminar',
    date: '2026-07-03',
    category: 'Sisa Kegiatan',
    recordedBy: 'Siti Rahma'
  },
  {
    id: 'tx-4',
    type: 'masuk',
    amount: 20000,
    description: 'Uang Kas Bulan Juni 2026',
    date: '2026-06-16',
    category: 'Uang Kas Bulanan',
    recordedBy: 'Siti Rahma',
    memberName: 'Ilman Mubarok'
  },
  {
    id: 'tx-5',
    type: 'masuk',
    amount: 20000,
    description: 'Uang Kas Bulan Juni 2026',
    date: '2026-06-17',
    category: 'Uang Kas Bulanan',
    recordedBy: 'Siti Rahma',
    memberName: 'Aditya Pratama'
  },
  {
    id: 'tx-6',
    type: 'masuk',
    amount: 20000,
    description: 'Uang Kas Bulan Juni 2026',
    date: '2026-06-18',
    category: 'Uang Kas Bulanan',
    recordedBy: 'Siti Rahma',
    memberName: 'Siti Rahma'
  },
  {
    id: 'tx-7',
    type: 'keluar',
    amount: 150000,
    description: 'Konsumsi Snack Rapat Kerja Pengurus',
    date: '2026-06-15',
    category: 'Konsumsi',
    recordedBy: 'Siti Rahma'
  }
];

const SEED_MEMBER_KAS: MemberKasRecord[] = [
  {
    userId: 'usr-1',
    userName: 'Ilman Mubarok',
    division: 'Badan Pengurus Harian (Ketua)',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
    payments: { '2026-06': 'lunas', '2026-07': 'lunas', '2026-08': 'belum_bayar' },
    totalPaid: 40000
  },
  {
    userId: 'usr-2',
    userName: 'Aditya Pratama',
    division: 'Badan Pengurus Harian (Sekretaris)',
    avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&q=80&w=120',
    payments: { '2026-06': 'lunas', '2026-07': 'pending', '2026-08': 'belum_bayar' },
    totalPaid: 20000
  },
  {
    userId: 'usr-3',
    userName: 'Siti Rahma',
    division: 'Badan Pengurus Harian (Bendahara)',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=120',
    payments: { '2026-06': 'lunas', '2026-07': 'lunas', '2026-08': 'belum_bayar' },
    totalPaid: 40000
  },
  {
    userId: 'usr-4',
    userName: 'Rian Hidayat',
    division: 'Divisi Hubungan Masyarakat',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=120',
    payments: { '2026-06': 'belum_bayar', '2026-07': 'belum_bayar', '2026-08': 'belum_bayar' },
    totalPaid: 0
  },
  {
    userId: 'usr-5',
    userName: 'Amanda Putri',
    division: 'Divisi Riset & Teknologi',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=120',
    payments: { '2026-06': 'lunas', '2026-07': 'belum_bayar', '2026-08': 'belum_bayar' },
    totalPaid: 20000
  },
  {
    userId: 'usr-6',
    userName: 'Farhan Azhar',
    division: 'Divisi Riset & Teknologi',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=120',
    payments: { '2026-06': 'pending', '2026-07': 'belum_bayar', '2026-08': 'belum_bayar' },
    totalPaid: 0
  },
  {
    userId: 'usr-7',
    userName: 'Laras Ati',
    division: 'Divisi Minat & Bakat',
    avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=120',
    payments: { '2026-06': 'belum_bayar', '2026-07': 'belum_bayar', '2026-08': 'belum_bayar' },
    totalPaid: 0
  }
];

const SEED_PROKERS: ProkerItem[] = [
  {
    id: 'pro-1',
    name: 'Seminar Nasional Tekno-Inovasi 2026',
    description: 'Seminar akbar mengenai kontribusi teknologi asisten dalam proses pembelajaran inklusif bagi anak berkebutuhan khusus.',
    division: 'Divisi Information and Technology (Teknologi Informasi)',
    budget: 4500000,
    status: 'Berjalan',
    meetingsCount: 4,
    committee: [
      { role: 'Ketua Panitia', userName: 'Rizky Fadillah', userId: 'usr-9' },
      { role: 'Sekretaris Panitia', userName: 'Aditya Pratama', userId: 'usr-3' },
      { role: 'Bendahara Panitia', userName: 'Siti Rahma', userId: 'usr-4' },
      { role: 'Koordinator Sie Acara', userName: 'Amanda Putri', userId: 'usr-5' },
      { role: 'Koordinator Sie Humas & Dokpub', userName: 'Rian Hidayat', userId: 'usr-6' },
      { role: 'Koordinator Sie Konsumsi', userName: 'Citra Lestari', userId: 'usr-12' },
      { role: 'Koordinator Sie Sarana Perlengkapan', userName: 'Anisa Rahmawati', userId: 'usr-10' }
    ],
    rundown: [
      { time: '08:00 - 08:30', agenda: 'Registrasi Peserta & Pembagian Konsumsi Pagi', pic: 'Citra Lestari (Sie Konsumsi)' },
      { time: '08:30 - 09:00', agenda: 'Pembukaan oleh MC & Sambutan Ketua Umum HIMPALUBI', pic: 'Ilman Mubarok (Ketua Umum)' },
      { time: '09:00 - 10:30', agenda: 'Materi I: Peran Generative AI dalam Pendidikan Khusus', pic: 'Dr. Hermawan (Narasumber Utama)' },
      { time: '10:30 - 12:00', agenda: 'Materi II: Implementasi Sistem Pembelajaran Inklusif Berbasis Web', pic: 'Budi Santoso (VP Engineer GoTo)' },
      { time: '12:00 - 13:00', agenda: 'Istirahat, Sholat, Makan Siang (ISHOMA)', pic: 'Laras Ati (Sie Acara)' },
      { time: '13:00 - 14:30', agenda: 'Sesi Tanya Jawab, Talkshow Interaktif & Simulasi Alat Bantu', pic: 'Amanda Putri (Litbang)' },
      { time: '14:30 - 15:00', agenda: 'Doorprize, Foto Bersama & Penutupan Acara', pic: 'Rizky Fadillah (Ketua Panitia)' }
    ],
    createdAt: '2026-06-10T10:00:00Z',
    date: '2026-07-28'
  },
  {
    id: 'pro-2',
    name: 'Pengabdian Masyarakat Inklusif (Abdimas PLB)',
    description: 'Kegiatan pengabdian masyarakat di Sekolah Luar Biasa (SLB) berupa penyuluhan gizi, terapi bermain kreatif, dan donasi alat tulis.',
    division: 'Divisi Pengabdian Masyarakat',
    budget: 3500000,
    status: 'Belum Mulai',
    meetingsCount: 1,
    committee: [
      { role: 'Ketua Panitia', userName: 'Laras Ati', userId: 'usr-7' },
      { role: 'Sekretaris', userName: 'Aditya Pratama', userId: 'usr-3' },
      { role: 'Bendahara', userName: 'Siti Rahma', userId: 'usr-4' },
      { role: 'Sie Acara & Edukasi', userName: 'Amanda Putri', userId: 'usr-5' },
      { role: 'Sie Logistik', userName: 'Anisa Rahmawati', userId: 'usr-10' }
    ],
    rundown: [
      { time: '07:30 - 08:00', agenda: 'Kumpul di Sekretariat Himpunan & Briefing Keberangkatan', pic: 'Laras Ati' },
      { time: '08:00 - 08:45', agenda: 'Perjalanan Menuju SLB Negeri Pembina', pic: 'Anisa Rahmawati' },
      { time: '09:00 - 09:30', agenda: 'Sambutan Kepala Sekolah SLB & Ketua HIMPALUBI', pic: 'Ilman Mubarok' },
      { time: '09:30 - 11:30', agenda: 'Sesi Kelas Kreatif (Mewarnai, Menyanyi, Terapi Sensorik Terbuka)', pic: 'Amanda Putri' },
      { time: '11:30 - 12:00', agenda: 'Penyerahan Simbolis Donasi Alat Bantu Ajar & Sesi Foto', pic: 'Laras Ati' }
    ],
    createdAt: '2026-07-01T08:00:00Z',
    date: '2026-08-10'
  }
];

// --- STORAGE IMPLEMENTATION WRAPPER WITH OFFLINE SUPPORT ---
class LocalDB {
  private isFirebaseReady(): boolean {
    return !!(db && hasFirebaseConfig && auth && auth.currentUser);
  }

  private initStore<T>(key: string, seed: T[]): T[] {
    const data = localStorage.getItem(key);
    if (!data) {
      localStorage.setItem(key, JSON.stringify(seed));
      return seed;
    }
    return JSON.parse(data);
  }

  getUsers(): UserProfile[] {
    return this.initStore(STORAGE_KEYS.USERS, SEED_USERS);
  }

  saveUsers(users: UserProfile[]) {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    if (this.isFirebaseReady()) {
      users.forEach(async (user) => {
        try {
          await setDoc(doc(db, 'users', user.id), user);
        } catch (err) {
          console.warn("Firestore saveUsers failed (could be offline):", err);
        }
      });
    }
  }

  getEvents(): EventItem[] {
    return this.initStore(STORAGE_KEYS.EVENTS, SEED_EVENTS);
  }

  saveEvents(events: EventItem[]) {
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(events));
    if (this.isFirebaseReady()) {
      events.forEach(async (event) => {
        try {
          await setDoc(doc(db, 'events', event.id), event);
        } catch (err) {
          console.warn("Firestore saveEvents failed (could be offline):", err);
        }
      });
    }
  }

  getAttendance(): AttendanceRecord[] {
    return this.initStore(STORAGE_KEYS.ATTENDANCE, SEED_ATTENDANCE);
  }

  saveAttendance(records: AttendanceRecord[]) {
    localStorage.setItem(STORAGE_KEYS.ATTENDANCE, JSON.stringify(records));
    if (this.isFirebaseReady()) {
      records.forEach(async (record) => {
        try {
          await setDoc(doc(db, 'attendance', record.id), record);
        } catch (err) {
          console.warn("Firestore saveAttendance failed (could be offline):", err);
        }
      });
    }
  }

  getMinutes(): BeritaAcara[] {
    return this.initStore(STORAGE_KEYS.MINUTES, SEED_MINUTES);
  }

  saveMinutes(minutes: BeritaAcara[]) {
    localStorage.setItem(STORAGE_KEYS.MINUTES, JSON.stringify(minutes));
    if (this.isFirebaseReady()) {
      minutes.forEach(async (minute) => {
        try {
          await setDoc(doc(db, 'minutes', minute.id), minute);
        } catch (err) {
          console.warn("Firestore saveMinutes failed (could be offline):", err);
        }
      });
    }
  }

  getDocumentation(): ActivityDocumentation[] {
    return this.initStore(STORAGE_KEYS.DOCUMENTATION, SEED_DOCUMENTATION);
  }

  saveDocumentation(docs: ActivityDocumentation[]) {
    localStorage.setItem(STORAGE_KEYS.DOCUMENTATION, JSON.stringify(docs));
    if (this.isFirebaseReady()) {
      docs.forEach(async (docItem) => {
        try {
          await setDoc(doc(db, 'documentation', docItem.id), docItem);
        } catch (err) {
          console.warn("Firestore saveDocumentation failed (could be offline):", err);
        }
      });
    }
  }

  getNotifications(): SystemNotification[] {
    return this.initStore(STORAGE_KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
  }

  saveNotifications(notifs: SystemNotification[]) {
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifs));
    if (this.isFirebaseReady()) {
      notifs.forEach(async (notif) => {
        try {
          await setDoc(doc(db, 'notifications', notif.id), notif);
        } catch (err) {
          console.warn("Firestore saveNotifications failed (could be offline):", err);
        }
      });
    }
  }

  getKasTransactions(): KasTransaction[] {
    return this.initStore(STORAGE_KEYS.KAS_TRANSACTIONS, SEED_KAS_TRANSACTIONS);
  }

  saveKasTransactions(txs: KasTransaction[]) {
    localStorage.setItem(STORAGE_KEYS.KAS_TRANSACTIONS, JSON.stringify(txs));
    if (this.isFirebaseReady()) {
      txs.forEach(async (tx) => {
        try {
          await setDoc(doc(db, 'kas_transactions', tx.id), tx);
        } catch (err) {
          console.warn("Firestore saveKasTransactions failed (could be offline):", err);
        }
      });
    }
  }

  getMemberKas(): MemberKasRecord[] {
    return this.initStore(STORAGE_KEYS.MEMBER_KAS, SEED_MEMBER_KAS);
  }

  saveMemberKas(records: MemberKasRecord[]) {
    localStorage.setItem(STORAGE_KEYS.MEMBER_KAS, JSON.stringify(records));
    if (this.isFirebaseReady()) {
      records.forEach(async (record) => {
        try {
          await setDoc(doc(db, 'member_kas', record.userId), record);
        } catch (err) {
          console.warn("Firestore saveMemberKas failed (could be offline):", err);
        }
      });
    }
  }

  getProkers(): ProkerItem[] {
    return this.initStore(STORAGE_KEYS.PROKERS, SEED_PROKERS);
  }

  saveProkers(prokers: ProkerItem[]) {
    localStorage.setItem(STORAGE_KEYS.PROKERS, JSON.stringify(prokers));
    if (this.isFirebaseReady()) {
      prokers.forEach(async (proker) => {
        try {
          await setDoc(doc(db, 'prokers', proker.id), proker);
        } catch (err) {
          console.warn("Firestore saveProkers failed (could be offline):", err);
        }
      });
    }
  }

  getCurrentUser(): UserProfile | null {
    const cached = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
    if (!cached) {
      return null;
    }
    return JSON.parse(cached);
  }

  setCurrentUser(user: UserProfile | null) {
    if (user) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
  }

  async syncFromFirestore() {
    if (!this.isFirebaseReady()) return;
    try {
      const collectionsList = [
        { path: 'users', key: STORAGE_KEYS.USERS },
        { path: 'events', key: STORAGE_KEYS.EVENTS },
        { path: 'attendance', key: STORAGE_KEYS.ATTENDANCE },
        { path: 'minutes', key: STORAGE_KEYS.MINUTES },
        { path: 'documentation', key: STORAGE_KEYS.DOCUMENTATION },
        { path: 'notifications', key: STORAGE_KEYS.NOTIFICATIONS },
        { path: 'kas_transactions', key: STORAGE_KEYS.KAS_TRANSACTIONS },
        { path: 'member_kas', key: STORAGE_KEYS.MEMBER_KAS },
        { path: 'prokers', key: STORAGE_KEYS.PROKERS }
      ];

      for (const col of collectionsList) {
        const querySnapshot = await getDocs(collection(db, col.path));
        if (!querySnapshot.empty) {
          const items = querySnapshot.docs.map(doc => doc.data());
          localStorage.setItem(col.key, JSON.stringify(items));
        }
      }
      
      // Dispatch storage update so UI refreshes
      window.dispatchEvent(new Event('localDbUpdate'));
    } catch (err) {
      console.warn("Sync from Firestore failed:", err);
    }
  }

  async seedFirestore() {
    if (!this.isFirebaseReady()) return;
    try {
      // Check if users collection is empty in Firestore
      const usersSnap = await getDocs(collection(db, 'users'));
      if (usersSnap.empty) {
        console.log("Seeding Firestore with default data...");
        
        const seeds = [
          { path: 'users', items: SEED_USERS },
          { path: 'events', items: SEED_EVENTS },
          { path: 'attendance', items: SEED_ATTENDANCE },
          { path: 'minutes', items: SEED_MINUTES },
          { path: 'documentation', items: SEED_DOCUMENTATION },
          { path: 'notifications', items: SEED_NOTIFICATIONS },
          { path: 'kas_transactions', items: SEED_KAS_TRANSACTIONS },
          { path: 'member_kas', items: SEED_MEMBER_KAS },
          { path: 'prokers', items: SEED_PROKERS }
        ];

        for (const seed of seeds) {
          for (const item of seed.items) {
            await setDoc(doc(db, seed.path, (item as any).id || (item as any).userId), item);
          }
        }
        console.log("Seeding Firestore completed successfully.");
      }
    } catch (err) {
      console.error("Failed to seed Firestore:", err);
    }
  }

  clearAll() {
    Object.values(STORAGE_KEYS).forEach(k => localStorage.removeItem(k));
  }
}

export const localDb = new LocalDB();
export { db, auth, hasFirebaseConfig };
