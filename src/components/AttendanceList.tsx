import React, { useState, useEffect } from 'react';
import { 
  UserCheck, 
  Download, 
  Calendar, 
  Filter, 
  Trash2, 
  CheckCircle, 
  Edit2, 
  X, 
  Save, 
  FileText,
  AlertCircle
} from 'lucide-react';
import { localDb } from '../lib/firebase';
import { EventItem, AttendanceRecord, UserProfile, AttendanceStatus } from '../types';
import jsPDF from 'jspdf';

interface AttendanceListProps {
  currentUser: UserProfile;
}

export default function AttendanceList({ currentUser }: AttendanceListProps) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  
  // Filtering & Selected Event States
  const [selectedEventId, setSelectedEventId] = useState<string>('all');
  
  // Editing Mode States (Pengurus only)
  const [editingRecord, setEditingRecord] = useState<AttendanceRecord | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('hadir');
  const [editNotes, setEditNotes] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  const isUserPengurus = currentUser.role === 'pengurus';

  const loadData = () => {
    setEvents(localDb.getEvents());
    setAttendance(localDb.getAttendance());
    setUsers(localDb.getUsers());
  };

  useEffect(() => {
    loadData();

    const handleStorageChange = () => {
      loadData();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localDbUpdate', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localDbUpdate', handleStorageChange);
    };
  }, []);

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  // Filter attendance records
  const filteredRecords = selectedEventId === 'all' 
    ? attendance 
    : attendance.filter(r => r.eventId === selectedEventId);

  // Group stats for filtered records
  const hadirCount = filteredRecords.filter(r => r.status === 'hadir').length;
  const sakitCount = filteredRecords.filter(r => r.status === 'sakit').length;
  const izinCount = filteredRecords.filter(r => r.status === 'izin').length;
  const alfaCount = filteredRecords.filter(r => r.status === 'alfa').length;

  // Open Edit Dialog for Pengurus
  const handleOpenEdit = (record: AttendanceRecord) => {
    if (!isUserPengurus) return;
    setEditingRecord(record);
    setEditStatus(record.status);
    setEditNotes(record.notes || '');
  };

  // Save modified record
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUserPengurus || !editingRecord) return;

    const updatedAttendance = attendance.map(rec => 
      rec.id === editingRecord.id 
        ? { ...rec, status: editStatus, notes: editNotes } 
        : rec
    );

    localDb.saveAttendance(updatedAttendance);
    setAttendance(updatedAttendance);
    setEditingRecord(null);
    showNotification("Sukses memperbarui status absensi anggota.");
    window.dispatchEvent(new Event('localDbUpdate'));
  };

  // Delete attendance record
  const handleDeleteRecord = (id: string) => {
    if (!isUserPengurus) return;
    if (confirm("Hapus catatan absensi ini?")) {
      const updatedAttendance = attendance.filter(rec => rec.id !== id);
      localDb.saveAttendance(updatedAttendance);
      setAttendance(updatedAttendance);
      showNotification("Catatan absensi dihapus.");
      window.dispatchEvent(new Event('localDbUpdate'));
    }
  };

  // EXPORT AUTOMATIC PDF REPORT
  const handleExportPDF = () => {
    // Generate beautiful PDF with jsPDF
    const doc = new jsPDF();
    const eventDetails = events.find(e => e.id === selectedEventId);
    
    // Header styling
    doc.setFillColor(15, 23, 42); // dark background header slate-900
    doc.rect(0, 0, 210, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("REKAP ABSENSI DIGITAL MAHASISWA", 15, 18);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(200, 200, 200);
    doc.text("Laporan Kehadiran Rapat & Kegiatan Organisasi Mahasiswa", 15, 25);
    doc.text(`Dicetak pada: ${new Date().toLocaleDateString('id-ID')} | Operator: ${currentUser.name}`, 15, 32);

    // Event Info Section
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    
    let startY = 50;
    if (eventDetails) {
      doc.text(`KEGIATAN: ${eventDetails.title.toUpperCase()}`, 15, startY);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(`Kategori: ${eventDetails.category}  |  Tanggal: ${eventDetails.date}  |  Waktu: ${eventDetails.time} WIB`, 15, startY + 6);
      doc.text(`Tempat: ${eventDetails.location}`, 15, startY + 11);
      startY += 18;
    } else {
      doc.text("REKAP KESELURUHAN KEGIATAN", 15, startY);
      startY += 10;
    }

    // Attendance Summary Box
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(15, startY, 180, 15, 2, 2, 'F');
    
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 23, 42);
    doc.text(`Total Baris Catatan: ${filteredRecords.length}`, 20, startY + 9);
    doc.setTextColor(16, 185, 129); // green
    doc.text(`Hadir: ${hadirCount}`, 75, startY + 9);
    doc.setTextColor(59, 130, 246); // blue
    doc.text(`Sakit: ${sakitCount}`, 110, startY + 9);
    doc.setTextColor(245, 158, 11); // amber
    doc.text(`Izin: ${izinCount}`, 140, startY + 9);
    doc.setTextColor(239, 68, 68); // red
    doc.text(`Alfa: ${alfaCount}`, 170, startY + 9);

    startY += 25;

    // Grid Table Headers
    doc.setFillColor(51, 65, 85); // slate-700
    doc.rect(15, startY, 180, 8, 'F');
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(255, 255, 255);
    doc.text("No", 18, startY + 5.5);
    doc.text("Nama Anggota", 28, startY + 5.5);
    doc.text("Divisi", 80, startY + 5.5);
    doc.text("Status", 135, startY + 5.5);
    doc.text("Keterangan", 155, startY + 5.5);

    startY += 8;

    // Grid Table Data Rows
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);

    filteredRecords.forEach((record, index) => {
      // Background shading for zebra effect
      if (index % 2 === 1) {
        doc.setFillColor(250, 250, 250);
        doc.rect(15, startY, 180, 8, 'F');
      }

      // Draw bottom line
      doc.setDrawColor(230, 230, 230);
      doc.line(15, startY + 8, 195, startY + 8);

      doc.text((index + 1).toString(), 18, startY + 5.5);
      doc.text(record.userName, 28, startY + 5.5);
      
      // Handle division text clipping
      let divText = record.userDivision;
      if (divText.length > 25) divText = divText.substring(0, 23) + '..';
      doc.text(divText, 80, startY + 5.5);

      // Color status code
      if (record.status === 'hadir') {
        doc.setTextColor(16, 185, 129);
      } else if (record.status === 'sakit') {
        doc.setTextColor(59, 130, 246);
      } else if (record.status === 'izin') {
        doc.setTextColor(245, 158, 11);
      } else {
        doc.setTextColor(239, 68, 68);
      }
      doc.setFont("helvetica", "bold");
      doc.text(record.status.toUpperCase(), 135, startY + 5.5);
      
      doc.setFont("helvetica", "normal");
      doc.setTextColor(100, 100, 100);
      let noteText = record.notes || '-';
      if (noteText.length > 25) noteText = noteText.substring(0, 23) + '..';
      doc.text(noteText, 155, startY + 5.5);

      startY += 8;

      // Handle page break
      if (startY > 270) {
        doc.addPage();
        startY = 20;
        // Reprint header row
        doc.setFillColor(51, 65, 85);
        doc.rect(15, startY, 180, 8, 'F');
        doc.setFont("helvetica", "bold");
        doc.setTextColor(255, 255, 255);
        doc.text("No", 18, startY + 5.5);
        doc.text("Nama Anggota", 28, startY + 5.5);
        doc.text("Divisi", 80, startY + 5.5);
        doc.text("Status", 135, startY + 5.5);
        doc.text("Keterangan", 155, startY + 5.5);
        startY += 8;
        doc.setFont("helvetica", "normal");
        doc.setTextColor(50, 50, 50);
      }
    });

    // Save report
    const filename = eventDetails 
      ? `Rekap_Absen_${eventDetails.title.replace(/\s+/g, '_')}.pdf`
      : 'Rekap_Absensi_Keseluruhan.pdf';
    doc.save(filename);
    showNotification("Sukses mengunduh laporan PDF!");
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-indigo-500 animate-slide-in z-50">
          <CheckCircle size={18} />
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* Header section */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans">Digital Absensi Log</h2>
          <p className="text-xs sm:text-sm text-slate-400">Arsip data absensi jajaran pengurus dan anggota rapat mahasiswa</p>
        </div>

        <button
          onClick={handleExportPDF}
          id="btn-export-pdf"
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-600/15"
        >
          <Download size={16} />
          Ekspor Laporan (PDF)
        </button>
      </div>

      {/* Filter and Overview Cards Section */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* Left Card: Filter by Event */}
        <div className="glass-panel rounded-2xl p-5 flex flex-col justify-between shadow-lg">
          <div>
            <h3 className="font-display font-semibold text-white mb-3 flex items-center gap-2 text-sm sm:text-base">
              <Filter size={16} className="text-blue-400" />
              Saring Kegiatan
            </h3>
            <p className="text-xs text-slate-400 mb-4 leading-relaxed">
              Pilih kegiatan tertentu untuk memantau rekap statistik kehadiran dan mencetak laporan khusus.
            </p>
          </div>
          
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            id="select-filter-event"
            className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
          >
            <option value="all" className="bg-[#0e1320] text-white">Semua Kegiatan</option>
            {events.map(e => (
              <option key={e.id} value={e.id} className="bg-[#0e1320] text-white">{e.date} - {e.title}</option>
            ))}
          </select>
        </div>

        {/* Dynamic Stats Overview Columns */}
        <div className="lg:col-span-3 grid grid-cols-2 sm:grid-cols-4 gap-4">
          {/* Hadir Box */}
          <div className="p-4 glass-panel rounded-2xl flex flex-col justify-between shadow-lg">
            <span className="text-xs font-semibold text-slate-400">Total Hadir</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-emerald-400">{hadirCount}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md font-bold">HADIR</span>
            </div>
          </div>
          {/* Sakit Box */}
          <div className="p-4 glass-panel rounded-2xl flex flex-col justify-between shadow-lg">
            <span className="text-xs font-semibold text-slate-400">Sakit</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-blue-400">{sakitCount}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-md font-bold">SAKIT</span>
            </div>
          </div>
          {/* Izin Box */}
          <div className="p-4 glass-panel rounded-2xl flex flex-col justify-between shadow-lg">
            <span className="text-xs font-semibold text-slate-400">Izin Tugas</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-amber-400">{izinCount}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-400 rounded-md font-bold">IZIN</span>
            </div>
          </div>
          {/* Alfa Box */}
          <div className="p-4 glass-panel rounded-2xl flex flex-col justify-between shadow-lg">
            <span className="text-xs font-semibold text-slate-400">Tanpa Keterangan</span>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-red-400">{alfaCount}</span>
              <span className="text-[10px] px-1.5 py-0.5 bg-red-500/10 text-red-400 rounded-md font-bold">ALFA</span>
            </div>
          </div>
        </div>

      </div>

      {/* Main Table logs listing */}
      <div className="glass-panel rounded-2xl overflow-hidden shadow-xl border border-white/10">
        <div className="px-5 py-4 border-b border-white/10 flex items-center justify-between bg-white/3">
          <h3 className="font-display font-semibold text-white text-sm">Log Entri Absensi Digital</h3>
          <span className="text-xs text-slate-400">Ditemukan {filteredRecords.length} Catatan</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-white/10 text-[11px] font-bold text-slate-400 bg-white/3 uppercase tracking-wider">
                <th className="py-3 px-5">Nama Anggota</th>
                <th className="py-3 px-4">Divisi / Jabatan</th>
                <th className="py-3 px-4">Kegiatan</th>
                <th className="py-3 px-4">Waktu Presensi</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-5">Keterangan / Alasan</th>
                {isUserPengurus && <th className="py-3 px-4 text-center">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 text-xs sm:text-sm text-slate-300">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={isUserPengurus ? 7 : 6} className="py-10 text-center text-slate-500 italic">
                    Belum ada data absensi untuk filter ini
                  </td>
                </tr>
              ) : (
                filteredRecords.map((record) => (
                  <tr key={record.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-5 font-semibold text-white">{record.userName}</td>
                    <td className="py-3 px-4 text-slate-400">{record.userDivision}</td>
                    <td className="py-3 px-4 max-w-[150px] truncate" title={record.eventTitle}>{record.eventTitle}</td>
                    <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                      {record.timestamp 
                        ? new Date(record.timestamp).toLocaleTimeString('id-ID', {hour: '2-digit', minute:'2-digit'}) + ' WIB'
                        : '-'
                      }
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                        record.status === 'hadir' 
                          ? 'bg-emerald-500/10 text-emerald-400' 
                          : record.status === 'sakit' 
                          ? 'bg-blue-500/10 text-blue-400' 
                          : record.status === 'izin' 
                          ? 'bg-amber-500/10 text-amber-400' 
                          : 'bg-red-500/10 text-red-400'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                    <td className="py-3 px-5 text-slate-400 italic max-w-[180px] truncate" title={record.notes}>
                      {record.notes || '-'}
                    </td>
                    {isUserPengurus && (
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(record)}
                            className="p-1 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 rounded cursor-pointer transition-colors"
                            title="Edit Status"
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDeleteRecord(record.id)}
                            className="p-1 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded cursor-pointer transition-colors"
                            title="Hapus Catatan"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Attendance Record Dialog (Pengurus only) */}
      {editingRecord && isUserPengurus && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-white/10 animate-scale-up">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/3">
              <h3 className="font-display font-bold text-white text-sm sm:text-base flex items-center gap-2">
                <UserCheck size={18} className="text-blue-400" />
                Edit Kehadiran Anggota
              </h3>
              <button onClick={() => setEditingRecord(null)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              <div>
                <p className="text-xs text-slate-400 mb-1">Anggota:</p>
                <p className="text-sm font-bold text-white">{editingRecord.userName}</p>
                <p className="text-[10px] text-slate-500">{editingRecord.userDivision}</p>
              </div>

              <div>
                <p className="text-xs text-slate-400 mb-1">Agenda Rapat:</p>
                <p className="text-xs text-blue-400 font-medium">{editingRecord.eventTitle}</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Status Kehadiran</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as AttendanceStatus)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="hadir" className="bg-[#0e1320] text-white">Hadir (Siswa Datang Rapat)</option>
                  <option value="sakit" className="bg-[#0e1320] text-white">Sakit (Ada Surat Dokter)</option>
                  <option value="izin" className="bg-[#0e1320] text-white">Izin (Tugas Kampus/Ujian)</option>
                  <option value="alfa" className="bg-[#0e1320] text-white">Alfa (Tanpa Keterangan)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Keterangan / Alasan</label>
                <input
                  type="text"
                  placeholder="Keterangan terlambat atau izin..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 bg-white/5 text-slate-300 border border-white/10 rounded-xl text-xs sm:text-sm font-semibold hover:bg-white/10 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  <Save size={14} />
                  Simpan Perubahan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
