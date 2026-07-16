import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { UserProfile, KasTransaction, MemberKasRecord } from '../types';

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/spreadsheets');

let cachedToken: string | null = null;

// Initialize auth state listener
export const initSheetsAuth = (
  onSuccess: (user: User, token: string) => void,
  onFailure: () => void
) => {
  return onAuthStateChanged(auth, async (user) => {
    if (user && cachedToken) {
      onSuccess(user, cachedToken);
    } else {
      onFailure();
    }
  });
};

// Google sign in helper specifically requesting Sheets scope
export const signInForSheets = async (): Promise<{ user: User; token: string } | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken || null;
    if (!token) {
      throw new Error('Gagal mendapatkan token akses Google dari Firebase Auth');
    }
    cachedToken = token;
    return { user: result.user, token };
  } catch (error) {
    console.error('Error signing in with Google Sheets scope:', error);
    throw error;
  }
};

export const getCachedToken = () => cachedToken;
export const clearCachedToken = () => { cachedToken = null; };

// CREATE a Google Spreadsheet
export const createSpreadsheet = async (token: string, title: string): Promise<string> => {
  const response = await fetch('https://sheets.googleapis.com/v1/spreadsheets', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: { title },
      sheets: [
        { properties: { title: 'Buku Kas Besar Himpunan' } },
        { properties: { title: 'Iuran Kas Bulanan Anggota' } },
        { properties: { title: 'Daftar Anggota per Angkatan' } }
      ]
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || 'Gagal membuat Google Spreadsheet baru');
  }
  return data.spreadsheetId;
};

// WRITE values to a sheet range
export const writeSheetValues = async (
  token: string,
  spreadsheetId: string,
  range: string,
  values: any[][]
) => {
  const response = await fetch(
    `https://sheets.googleapis.com/v1/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        range,
        majorDimension: 'ROWS',
        values
      })
    }
  );

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || `Gagal menulis data ke range ${range}`);
  }
  return data;
};

// SYNC ALL DATA to Google Sheets
export const syncAllDataToGoogleSheets = async (
  token: string,
  users: UserProfile[],
  transactions: KasTransaction[],
  memberKasRecords: MemberKasRecord[]
): Promise<string> => {
  try {
    const period = localStorage.getItem('HIMPALUBI_PERIODE') || '2026/2027';
    const title = `DATA KEUANGAN & ANGGOTA HIMPALUBI (${period})`;
    const spreadsheetId = await createSpreadsheet(token, title);

    // 1. Prepare Buku Kas Besar data
    const kasHeaders = ['ID Transaksi', 'Tanggal', 'Tipe', 'Kategori', 'Deskripsi', 'Jumlah (IDR)', 'Pencatat'];
    const kasRows = transactions.map(t => [
      t.id,
      t.date,
      t.type === 'masuk' ? 'Pemasukan (+)' : 'Pengeluaran (-)',
      t.category,
      t.description,
      t.amount,
      t.recordedBy
    ]);
    const kasData = [kasHeaders, ...kasRows];

    // 2. Prepare Iuran Kas Bulanan Anggota data
    // Dues period months: June 2026 to August 2026
    const iuranHeaders = ['NIM', 'Nama Anggota', 'Angkatan', 'Total Terbayar (IDR)', 'Juni 2026', 'Juli 2026', 'Agustus 2026'];
    const iuranRows = memberKasRecords.map(record => {
      const u = users.find(user => user.id === record.userId);
      return [
        u?.nim || '-',
        record.userName,
        u?.angkatan || '-',
        record.totalPaid,
        record.payments['2026-06'] === 'lunas' ? 'LUNAS' : record.payments['2026-06'] === 'pending' ? 'PENDING' : 'Belum Bayar',
        record.payments['2026-07'] === 'lunas' ? 'LUNAS' : record.payments['2026-07'] === 'pending' ? 'PENDING' : 'Belum Bayar',
        record.payments['2026-08'] === 'lunas' ? 'LUNAS' : record.payments['2026-08'] === 'pending' ? 'PENDING' : 'Belum Bayar'
      ];
    });
    const iuranData = [iuranHeaders, ...iuranRows];

    // 3. Prepare Daftar Anggota per Angkatan data
    const anggotaHeaders = ['NIM', 'Nama', 'Email', 'No. Telepon', 'Program Studi', 'Angkatan', 'Status', 'Jabatan / Divisi'];
    const anggotaRows = users.map(u => [
      u.nim || '-',
      u.name,
      u.email,
      u.phone || '-',
      u.studyProgram || '-',
      u.angkatan || '-',
      u.status || 'Aktif',
      u.role === 'pengurus' ? u.division : 'Anggota Biasa'
    ]);
    const anggotaData = [anggotaHeaders, ...anggotaRows];

    // Write all sheets
    await writeSheetValues(token, spreadsheetId, 'Buku Kas Besar Himpunan!A1', kasData);
    await writeSheetValues(token, spreadsheetId, 'Iuran Kas Bulanan Anggota!A1', iuranData);
    await writeSheetValues(token, spreadsheetId, 'Daftar Anggota per Angkatan!A1', anggotaData);

    return `https://docs.google.com/spreadsheets/d/${spreadsheetId}`;
  } catch (error) {
    console.error('Error syncing all data to Sheets:', error);
    throw error;
  }
};
