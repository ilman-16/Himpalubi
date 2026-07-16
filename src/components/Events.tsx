import React, { useState, useEffect } from 'react';
import { 
  Calendar, 
  Clock, 
  MapPin, 
  Plus, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Key, 
  Clipboard, 
  UserCheck, 
  Trash2,
  CalendarDays,
  ExternalLink,
  ChevronRight,
  Info,
  QrCode,
  ScanLine,
  ShieldAlert
} from 'lucide-react';
import { localDb } from '../lib/firebase';
import { EventItem, UserProfile, AttendanceRecord, AttendanceStatus } from '../types';

interface EventsProps {
  currentUser: UserProfile;
  setActiveTab: (tab: string) => void;
}

export default function Events({ currentUser, setActiveTab }: EventsProps) {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [isAddingEvent, setIsAddingEvent] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  
  // Google Calendar Integration Simulation States
  const [isSyncingGCal, setIsSyncingGCal] = useState(false);
  const [gcalConnected, setGcalConnected] = useState(false);

  // New Event Form State
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    category: 'Rapat Anggota' as any,
  });

  // Digital Attendance Code State (for Members)
  const [attendanceOtp, setAttendanceOtp] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState<AttendanceStatus>('hadir');
  const [attendanceNotes, setAttendanceNotes] = useState('');
  const [panitiaRole, setPanitiaRole] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  // QR Code & Scanning States
  const [qrModalEvent, setQrModalEvent] = useState<EventItem | null>(null);
  const [scannerModalEvent, setScannerModalEvent] = useState<EventItem | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [scanResultSuccess, setScanResultSuccess] = useState(false);

  const isUserPengurus = currentUser.role === 'pengurus';

  const loadData = () => {
    setEvents(localDb.getEvents());
    setAttendance(localDb.getAttendance());
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

  // Google Calendar Sync Flow
  const handleSyncGoogleCalendar = () => {
    setIsSyncingGCal(true);
    setTimeout(() => {
      setIsSyncingGCal(false);
      setGcalConnected(true);
      
      // Update all events to be synced
      const updatedEvents = events.map(e => ({ ...e, gcalSynced: true }));
      localDb.saveEvents(updatedEvents);
      setEvents(updatedEvents);
      
      showNotification("Selesai menyelaraskan jadwal dengan Google Calendar organisasi!");
      window.dispatchEvent(new Event('localDbUpdate'));
    }, 1500);
  };

  // Create Event (Pengurus only)
  const handleCreateEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUserPengurus) return;

    // Generate random OTP code for digital attendance
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let otp = '';
    for (let i = 0; i < 6; i++) {
      otp += characters.charAt(Math.floor(Math.random() * characters.length));
    }

    const newEvent: EventItem = {
      id: `evt-${Date.now()}`,
      title: eventForm.title,
      description: eventForm.description,
      date: eventForm.date,
      time: eventForm.time,
      location: eventForm.location,
      category: eventForm.category,
      attendanceOpen: true, // Default open for attendance
      attendanceCode: otp,
      gcalSynced: gcalConnected,
      createdAt: new Date().toISOString()
    };

    const updatedEvents = [newEvent, ...events];
    localDb.saveEvents(updatedEvents);
    
    // Auto-create blank or default attendance records or trigger a simulated push notification
    const notifications = localDb.getNotifications();
    const newNotif = {
      id: `notif-${Date.now()}`,
      title: `Agenda Baru: ${newEvent.title}`,
      body: `Kegiatan dijadwalkan pada tanggal ${newEvent.date} jam ${newEvent.time}. Silakan persiapkan kehadiran Anda.`,
      date: new Date().toISOString(),
      read: false,
      type: 'event' as any,
      targetRole: 'all' as any
    };
    localDb.saveNotifications([newNotif, ...notifications]);

    // Send push notification using standard Web Notification API if granted
    if (Notification.permission === 'granted') {
      try {
        new Notification(newNotif.title, { body: newNotif.body });
      } catch (err) {
        console.log("Push notification failed to fire due to frame restrictions, fallback to toast.");
      }
    }

    loadData();
    setIsAddingEvent(false);
    setEventForm({
      title: '',
      description: '',
      date: '',
      time: '',
      location: '',
      category: 'Rapat Anggota',
    });
    
    showNotification("Acara baru ditambahkan dan absen digital dibuka!");
    window.dispatchEvent(new Event('localDbUpdate'));
  };

  // Toggle Attendance Open/Close (Pengurus only)
  const handleToggleAttendance = (eventId: string, currentOpen: boolean) => {
    if (!isUserPengurus) return;

    const updatedEvents = events.map(e => 
      e.id === eventId 
        ? { ...e, attendanceOpen: !currentOpen } 
        : e
    );

    localDb.saveEvents(updatedEvents);
    setEvents(updatedEvents);
    showNotification(currentOpen ? "Absensi digital ditutup!" : "Absensi digital dibuka kembali!");
    window.dispatchEvent(new Event('localDbUpdate'));
  };

  // Delete Event (Pengurus only)
  const handleDeleteEvent = (eventId: string) => {
    if (!isUserPengurus) return;

    if (confirm("Apakah Anda yakin ingin menghapus kegiatan ini dan seluruh catatan absennya?")) {
      const updatedEvents = events.filter(e => e.id !== eventId);
      const updatedAttendance = attendance.filter(a => a.eventId !== eventId);
      
      localDb.saveEvents(updatedEvents);
      localDb.saveAttendance(updatedAttendance);
      
      loadData();
      showNotification("Kegiatan berhasil dihapus.");
      window.dispatchEvent(new Event('localDbUpdate'));
    }
  };

  // Member Check-In via Digital Code
  const handleMemberCheckIn = (e: React.FormEvent, event: EventItem) => {
    e.preventDefault();
    
    // Check eligibility
    if (event.category === 'Rapat Pengurus' && currentUser.role !== 'pengurus') {
      alert("Maaf, rapat ini dikhususkan bagi Pengurus saja. Anggota biasa tidak diizinkan melakukan presensi.");
      return;
    }
    
    if (attendanceOtp.trim().toUpperCase() !== event.attendanceCode?.toUpperCase()) {
      alert("Kode absensi salah! Silakan tanyakan kode OTP kepada Pengurus rapat.");
      return;
    }

    // Check if already checked in
    const alreadyCheckedIn = attendance.find(a => a.eventId === event.id && a.userId === currentUser.id);
    if (alreadyCheckedIn) {
      alert("Anda sudah terabsen untuk kegiatan ini!");
      return;
    }

    // Determine notes based on meeting type
    let finalNotes = attendanceNotes;
    if (event.category === 'Rapat Panitia') {
      finalNotes = panitiaRole ? `Panitia: ${panitiaRole}${attendanceNotes ? ` - ${attendanceNotes}` : ''}` : `Panitia Pelaksana${attendanceNotes ? ` - ${attendanceNotes}` : ''}`;
    }

    // Create attendance record
    const newRecord: AttendanceRecord = {
      id: `att-${Date.now()}`,
      eventId: event.id,
      eventTitle: event.title,
      eventDate: event.date,
      userId: currentUser.id,
      userName: currentUser.name,
      userDivision: currentUser.division,
      timestamp: new Date().toISOString(),
      status: attendanceStatus,
      notes: finalNotes
    };

    const updatedAttendance = [newRecord, ...attendance];
    localDb.saveAttendance(updatedAttendance);
    setAttendance(updatedAttendance);

    showNotification(`Sukses absen! Status: ${attendanceStatus.toUpperCase()}`);
    setAttendanceOtp('');
    setAttendanceNotes('');
    setPanitiaRole('');
    window.dispatchEvent(new Event('localDbUpdate'));
  };

  // Get current user's attendance status for an event
  const getUserAttendanceStatus = (eventId: string) => {
    const record = attendance.find(a => a.eventId === eventId && a.userId === currentUser.id);
    return record ? record.status : null;
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

      {/* Events Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight font-sans">Jadwal & Agenda Rapat</h2>
          <p className="text-xs sm:text-sm text-slate-400">Kelola dan hadiri pertemuan rutin himpunan mahasiswa secara digital</p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Google Calendar Sync Button */}
          <button
            onClick={handleSyncGoogleCalendar}
            disabled={isSyncingGCal}
            id="btn-sync-gcal"
            className={`px-4 py-2 border rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer backdrop-blur-md ${
              gcalConnected 
                ? 'bg-blue-600/10 border-blue-500/20 text-blue-400 hover:bg-blue-600/20 shadow-md shadow-blue-500/5' 
                : 'bg-white/5 border border-white/10 text-slate-300 hover:bg-white/10'
            }`}
          >
            <CalendarDays size={16} className={isSyncingGCal ? "animate-spin text-blue-400" : ""} />
            {isSyncingGCal ? 'Menyelaraskan..' : gcalConnected ? 'Google Calendar Tersinkron' : 'Sinkron Google Calendar'}
          </button>

          {isUserPengurus && (
            <button
              onClick={() => setIsAddingEvent(true)}
              id="btn-add-event"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/15"
            >
              <Plus size={16} />
              Tambah Agenda
            </button>
          )}
        </div>
      </div>

      {/* Grid List of Events */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        
        {/* Left/Middle Columns: Events Cards */}
        <div className="xl:col-span-2 space-y-4">
          {events.length === 0 ? (
            <div className="text-center py-12 glass-panel rounded-2xl text-slate-400">
              <Calendar size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm font-medium">Belum ada agenda rapat yang dijadwalkan</p>
            </div>
          ) : (
            events.map(event => {
              const myStatus = getUserAttendanceStatus(event.id);
              const presentCount = attendance.filter(a => a.eventId === event.id && a.status === 'hadir').length;
              const hasCheckInCode = !!event.attendanceCode;
              
              return (
                <div 
                  key={event.id} 
                  id={`event-card-${event.id}`}
                  className={`p-5 glass-panel rounded-2xl transition-all shadow-lg ${
                    event.attendanceOpen 
                      ? 'border-emerald-500/20 shadow-emerald-500/5' 
                      : 'border-white/10'
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                        event.category === 'Rapat Anggota' 
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                          : event.category === 'Rapat Pengurus'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          : event.category === 'Rapat Panitia'
                          ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                          : event.category === 'Seminar/Workshop' 
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/10'
                          : event.category === 'Kegiatan Eksternal'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/10'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/10'
                      }`}>
                        {event.category}
                      </span>
                      {event.gcalSynced && (
                        <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-[9px] flex items-center gap-1 font-medium">
                          GCal Synced
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {event.attendanceOpen ? (
                        <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          Absen Dibuka
                        </span>
                      ) : (
                        <span className="text-xs text-slate-500 font-medium">Absen Ditutup</span>
                      )}

                      {isUserPengurus && (
                        <div className="flex items-center gap-1.5 border-l border-white/10 pl-3">
                          <button
                            onClick={() => handleToggleAttendance(event.id, event.attendanceOpen)}
                            title={event.attendanceOpen ? "Tutup Absensi" : "Buka Absensi"}
                            className={`p-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                              event.attendanceOpen 
                                ? 'bg-amber-500/10 text-amber-400 hover:bg-amber-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                          >
                            {event.attendanceOpen ? 'Tutup Absen' : 'Buka Absen'}
                          </button>
                          
                          <button
                            onClick={() => handleDeleteEvent(event.id)}
                            title="Hapus Agenda"
                            className="p-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg cursor-pointer transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  <h3 className="text-base sm:text-lg font-display font-semibold text-white mb-2 leading-tight">{event.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-3 mb-3 leading-relaxed">{event.description}</p>

                  {/* Ketentuan & Jadwal Rapat Detail Badge */}
                  {(event.category === 'Rapat Anggota' || event.category === 'Rapat Pengurus' || event.category === 'Rapat Panitia') && (
                    <div className={`mb-4 p-3 rounded-xl text-xs flex items-start gap-2 border ${
                      event.category === 'Rapat Anggota'
                        ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-300'
                        : event.category === 'Rapat Pengurus'
                        ? 'bg-blue-500/5 border-blue-500/10 text-blue-300'
                        : 'bg-indigo-500/5 border-indigo-500/10 text-indigo-300'
                    }`}>
                      <Info size={14} className="shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <span className="font-semibold uppercase tracking-wider text-[9px] block">
                          Ketentuan & Frekuensi Pertemuan:
                        </span>
                        <p className="text-[11px] leading-relaxed">
                          {event.category === 'Rapat Anggota' && 'Rapat Anggota (Dua Bulanan): Terbuka dan wajib dihadiri oleh seluruh Pengurus & Anggota.'}
                          {event.category === 'Rapat Pengurus' && 'Rapat Pengurus (Setiap Bulan / Tanggal Tidak Pasti): Terbatas hanya dihadiri oleh Pengurus saja.'}
                          {event.category === 'Rapat Panitia' && 'Rapat Panitia (Kondisional): Dihadiri oleh Pengurus dan Anggota yang bertugas sebagai Panitia Pelaksana.'}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-slate-400 bg-white/3 p-3 rounded-xl border border-white/5 mb-4">
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-blue-400" />
                      <span>{event.date}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock size={14} className="text-blue-400" />
                      <span>{event.time} WIB</span>
                    </div>
                    <div className="flex items-center gap-2 truncate">
                      <MapPin size={14} className="text-blue-400" />
                      <span className="truncate" title={event.location}>{event.location}</span>
                    </div>
                  </div>

                  {/* Attendance Controls Context for Members & Admin */}
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pt-3 border-t border-white/10">
                    <div className="text-xs text-slate-400">
                      Terabsen: <strong className="text-white">{presentCount}</strong> Anggota
                    </div>

                    {/* Member Attendance Submission Module */}
                    {!isUserPengurus && event.attendanceOpen && (
                      <div className="flex-1 max-w-sm">
                        {event.category === 'Rapat Pengurus' ? (
                          <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-center gap-2 justify-center" title="Akses Khusus Pengurus">
                            <ShieldAlert size={15} className="shrink-0" />
                            <span className="font-semibold text-[11px]">Khusus Pengurus (Rapat Tertutup)</span>
                          </div>
                        ) : myStatus ? (
                          <div className="p-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs flex items-center gap-2 justify-center">
                            <CheckCircle size={14} />
                            <span>Anda sudah terabsen ({myStatus.toUpperCase()})</span>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-2">
                            {event.category === 'Rapat Panitia' && (
                              <div className="flex items-center gap-2 mb-1 bg-white/3 border border-white/5 p-1.5 rounded-lg">
                                <span className="text-[9px] text-indigo-400 font-bold uppercase shrink-0">Peran Panitia:</span>
                                <input
                                  type="text"
                                  placeholder="Contoh: Sie Acara / Keamanan"
                                  required
                                  value={panitiaRole}
                                  onChange={(e) => setPanitiaRole(e.target.value)}
                                  className="glass-input rounded px-2 py-1 text-[11px] text-white focus:outline-none focus:border-indigo-500 flex-1 placeholder:text-[9px] h-6"
                                />
                              </div>
                            )}
                            <form onSubmit={(e) => handleMemberCheckIn(e, event)} className="flex gap-1.5">
                              <input
                                type="text"
                                maxLength={8}
                                placeholder="KODE OTP"
                                required
                                value={attendanceOtp}
                                onChange={(e) => setAttendanceOtp(e.target.value)}
                                className="glass-input rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 w-24 text-center font-mono placeholder:text-[10px]"
                              />
                              <select
                                value={attendanceStatus}
                                onChange={(e) => setAttendanceStatus(e.target.value as any)}
                                className="glass-input rounded-lg px-1.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 text-center"
                              >
                                <option value="hadir" className="bg-[#0e1320] text-white">Hadir</option>
                                <option value="sakit" className="bg-[#0e1320] text-white">Sakit</option>
                                <option value="izin" className="bg-[#0e1320] text-white">Izin</option>
                              </select>
                              <button
                                type="submit"
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors shrink-0 shadow-lg shadow-emerald-500/10"
                              >
                                Kirim
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setScannerModalEvent(event);
                                  setIsScanning(false);
                                  setScanResultSuccess(false);
                                }}
                                className="bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 p-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors flex items-center justify-center shrink-0"
                                title="Scan QR Code"
                              >
                                <QrCode size={15} />
                              </button>
                            </form>
                          </div>
                        )}
                      </div>
                    )}

                    {!isUserPengurus && !event.attendanceOpen && (
                      <div className="text-xs font-medium">
                        {myStatus ? (
                          <span className="text-emerald-400 flex items-center gap-1"><CheckCircle size={12} /> Terabsen ({myStatus.toUpperCase()})</span>
                        ) : (
                          <span className="text-slate-500 flex items-center gap-1"><XCircle size={12} /> Anda tidak hadir / absen ditutup</span>
                        )}
                      </div>
                    )}

                    {isUserPengurus && event.attendanceOpen && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <div className="text-xs bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-xl text-emerald-400 flex items-center gap-2 font-mono">
                          <Key size={13} />
                          <span>Kode OTP: <strong className="text-white select-all">{event.attendanceCode}</strong></span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setQrModalEvent(event)}
                          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-md shadow-blue-600/10"
                        >
                          <QrCode size={13} />
                          Tampilkan QR
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Right Column: Google Calendar Integration Guide & Live Notifications */}
        <div className="space-y-6">
          {/* Calendar Sync Widget */}
          <div className="glass-panel rounded-2xl p-5 shadow-lg">
            <h3 className="font-display font-bold text-white mb-3 flex items-center gap-2">
              <CalendarDays size={18} className="text-blue-400" />
              Sinergi Google Calendar
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Jadwalkan rapat sekali, sinkronisasi ke mana saja. Integrasi Google Calendar organisasi 
              membantu mengingatkan pengurus dan anggota secara otomatis melalui email, widget handphone, dan reminder kalender Google.
            </p>
            
            <div className="space-y-3">
              <div className="p-3 bg-white/3 border border-white/5 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-400">Status Akun Kalender:</span>
                <span className={`text-xs font-semibold ${gcalConnected ? 'text-blue-400' : 'text-slate-500'}`}>
                  {gcalConnected ? 'Terhubung (OAuth 2.0)' : 'Belum Terhubung'}
                </span>
              </div>
              <div className="p-3 bg-white/3 border border-white/5 rounded-xl flex items-center justify-between">
                <span className="text-xs text-slate-400">Email Sinkron:</span>
                <span className="text-xs text-white truncate max-w-[150px]" title={currentUser.email}>{currentUser.email}</span>
              </div>
            </div>
          </div>

          {/* Quick Access to Attendance List */}
          <div className="glass-panel rounded-2xl p-5 shadow-lg">
            <h3 className="font-display font-bold text-white mb-2 flex items-center gap-2">
              <UserCheck size={18} className="text-blue-400" />
              Catatan Absensi Lengkap
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Butuh mengekspor laporan absensi atau melihat siapa saja yang berhalangan hadir pada rapat sebelumnya?
            </p>
            <button
              onClick={() => setActiveTab('attendance')}
              id="btn-goto-attendance"
              className="w-full py-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              Lihat Detail Rekap Absensi
              <ChevronRight size={14} />
            </button>
          </div>
        </div>

      </div>

      {/* Add Event Dialog Box Modal (Pengurus only) */}
      {isAddingEvent && isUserPengurus && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-white/10 animate-scale-up my-8">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/3">
              <h3 className="font-display font-bold text-white flex items-center gap-2">
                <Calendar size={18} className="text-blue-400" />
                Tambah Rapat / Kegiatan Baru
              </h3>
              <button 
                onClick={() => setIsAddingEvent(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>
            
            <form onSubmit={handleCreateEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Judul Rapat / Kegiatan</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Rapat Evaluasi Bulanan Divisi Humas"
                  value={eventForm.title}
                  onChange={e => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Deskripsi Kegiatan</label>
                <textarea 
                  rows={3}
                  required
                  placeholder="Jelaskan pokok bahasan rapat atau timeline kegiatan..."
                  value={eventForm.description}
                  onChange={e => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none animate-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Kategori</label>
                  <select 
                    value={eventForm.category}
                    onChange={e => setEventForm({ ...eventForm, category: e.target.value as any })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Rapat Anggota" className="bg-[#0e1320] text-white">Rapat Anggota (Dua Bulanan - Semua)</option>
                    <option value="Rapat Pengurus" className="bg-[#0e1320] text-white">Rapat Pengurus (Bulanan - Pengurus Saja)</option>
                    <option value="Rapat Panitia" className="bg-[#0e1320] text-white">Rapat Panitia (Pengurus & Panitia)</option>
                    <option value="Kegiatan Eksternal" className="bg-[#0e1320] text-white">Kegiatan Eksternal</option>
                    <option value="Seminar/Workshop" className="bg-[#0e1320] text-white">Seminar/Workshop</option>
                    <option value="Lainnya" className="bg-[#0e1320] text-white">Lainnya</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tanggal</label>
                  <input 
                    type="date" 
                    required
                    value={eventForm.date}
                    onChange={e => setEventForm({ ...eventForm, date: e.target.value })}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Jam Pelaksanaan (WIB)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: 19:00 - 21:00"
                    value={eventForm.time}
                    onChange={e => setEventForm({ ...eventForm, time: e.target.value })}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Tempat / Tautan Meeting</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Aula Barat / Google Meet Link"
                    value={eventForm.location}
                    onChange={e => setEventForm({ ...eventForm, location: e.target.value })}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingEvent(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  <CheckCircle size={16} />
                  Simpan Agenda
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin QR Code Modal */}
      {qrModalEvent && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-modal rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-white/10 p-6 space-y-4 animate-scale-up text-center relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500 to-transparent"></div>
            
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-display font-bold text-white text-sm flex items-center gap-1.5">
                <QrCode size={16} className="text-blue-400" />
                QR Code Presensi
              </h3>
              <button 
                onClick={() => setQrModalEvent(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white line-clamp-1">{qrModalEvent.title}</h4>
              <p className="text-[10px] text-slate-400">{qrModalEvent.date} • {qrModalEvent.time} WIB</p>
            </div>

            {/* Glowing High-Tech QR Frame */}
            <div className="relative mx-auto w-60 h-60 bg-white p-3 rounded-2xl shadow-inner border border-white/20 flex items-center justify-center overflow-hidden">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(JSON.stringify({ eventId: qrModalEvent.id, code: qrModalEvent.attendanceCode }))}`} 
                alt="Presensi QR Code"
                className="w-full h-full object-contain"
              />
              
              {/* Laser Line Scan effect */}
              <div className="absolute inset-x-0 h-[2px] bg-blue-500 shadow-[0_0_12px_#3b82f6] animate-scan-laser pointer-events-none"></div>
            </div>

            <div className="p-3 bg-white/3 border border-white/5 rounded-2xl">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold font-mono">Kode Alternatif OTP</p>
              <span className="text-lg font-bold text-blue-400 select-all font-mono tracking-wider">{qrModalEvent.attendanceCode}</span>
            </div>

            <p className="text-[10px] text-slate-400 leading-relaxed max-w-[280px] mx-auto">
              Minta anggota untuk membuka menu <strong>Jadwal & Presensi</strong>, klik tombol <strong>Scan QR</strong>, lalu arahkan kamera ke kode di atas.
            </p>
          </div>
        </div>
      )}

      {/* Member QR Scanner Modal */}
      {scannerModalEvent && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="glass-modal rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl border border-white/10 p-6 space-y-4 animate-scale-up relative">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500 to-transparent"></div>
            
            <div className="flex justify-between items-center border-b border-white/10 pb-3">
              <h3 className="font-display font-bold text-white text-sm flex items-center gap-1.5">
                <ScanLine size={16} className="text-emerald-400 animate-pulse" />
                Scan QR Presensi
              </h3>
              <button 
                onClick={() => setScannerModalEvent(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <XCircle size={18} />
              </button>
            </div>

            <div className="text-center space-y-1">
              <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">Target Kegiatan</span>
              <h4 className="text-xs sm:text-sm font-semibold text-white line-clamp-1 mt-1">{scannerModalEvent.title}</h4>
            </div>

            {/* Simulated Live Camera Scanner Container */}
            <div className="relative mx-auto w-64 h-64 bg-slate-950 border border-white/10 rounded-2xl overflow-hidden shadow-inner flex flex-col justify-center items-center">
              
              {scanResultSuccess ? (
                // Success Scan Overlay with Green celebration
                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-sm flex flex-col justify-center items-center text-center p-4 animate-fade-in z-20">
                  <div className="p-3.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full mb-3 shadow-lg shadow-emerald-500/10">
                    <CheckCircle size={32} />
                  </div>
                  <h4 className="text-sm font-bold text-white">QR Code Terdeteksi!</h4>
                  <p className="text-[11px] text-slate-300 mt-1">Berhasil memverifikasi tanda kehadiran Anda.</p>
                </div>
              ) : isScanning ? (
                // Scanning view with rotating/glowing laser
                <>
                  <div className="absolute inset-8 border border-emerald-500/30 rounded-xl pointer-events-none flex items-center justify-center">
                    {/* Corner Borders */}
                    <div className="absolute -top-[2px] -left-[2px] w-4 h-4 border-t-2 border-l-2 border-emerald-400"></div>
                    <div className="absolute -top-[2px] -right-[2px] w-4 h-4 border-t-2 border-r-2 border-emerald-400"></div>
                    <div className="absolute -bottom-[2px] -left-[2px] w-4 h-4 border-b-2 border-l-2 border-emerald-400"></div>
                    <div className="absolute -bottom-[2px] -right-[2px] w-4 h-4 border-b-2 border-r-2 border-emerald-400"></div>
                    
                    {/* Spinner */}
                    <RefreshCw size={24} className="text-emerald-500/40 animate-spin" />
                  </div>
                  
                  {/* Laser line slider */}
                  <div className="absolute inset-x-0 h-[2px] bg-emerald-400 shadow-[0_0_10px_#34d399] animate-scan-laser pointer-events-none"></div>
                  
                  <span className="text-[10px] text-emerald-400 font-bold font-mono tracking-wider absolute bottom-4 animate-pulse">MEMINDAI KAMERA...</span>
                </>
              ) : (
                // Idle Camera selector
                <div className="p-4 text-center space-y-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 mx-auto">
                    <ScanLine size={24} />
                  </div>
                  <div className="space-y-1">
                    <p className="text-[11px] text-slate-300">Kamera siap memindai QR Code.</p>
                    <p className="text-[9px] text-slate-500 leading-normal">Karena dijalankan dalam sandboxed iFrame, Anda bisa menyimulasikan pemindaian instan dengan tombol di bawah.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Simulation Options */}
            <div className="space-y-2">
              <button
                type="button"
                disabled={scanResultSuccess}
                onClick={() => {
                  setIsScanning(true);
                  // Play dynamic bip scan sound using Web Audio API!
                  try {
                    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                    const osc = audioCtx.createOscillator();
                    const gain = audioCtx.createGain();
                    osc.connect(gain);
                    gain.connect(audioCtx.destination);
                    osc.type = 'sine';
                    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5 note (warm start scan)
                    gain.gain.setValueAtTime(0.05, audioCtx.currentTime);
                    osc.start();
                    osc.stop(audioCtx.currentTime + 0.1);
                  } catch (e) {}

                  // Simulate processing
                  setTimeout(() => {
                    setScanResultSuccess(true);
                    
                    // Play double bip success sound!
                    try {
                      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
                      const osc1 = audioCtx.createOscillator();
                      const osc2 = audioCtx.createOscillator();
                      const gain = audioCtx.createGain();
                      osc1.connect(gain);
                      osc2.connect(gain);
                      gain.connect(audioCtx.destination);
                      osc1.type = 'sine';
                      osc1.frequency.setValueAtTime(659.25, audioCtx.currentTime); // E5
                      osc2.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5
                      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
                      osc1.start();
                      osc1.stop(audioCtx.currentTime + 0.08);
                      osc2.start(audioCtx.currentTime + 0.1);
                      osc2.stop(audioCtx.currentTime + 0.22);
                    } catch (e) {}

                    // Trigger check in with simulation
                    setTimeout(() => {
                      // Submit record
                      const newRecord: AttendanceRecord = {
                        id: `att-${Date.now()}`,
                        eventId: scannerModalEvent.id,
                        eventTitle: scannerModalEvent.title,
                        eventDate: scannerModalEvent.date,
                        userId: currentUser.id,
                        userName: currentUser.name,
                        userDivision: currentUser.division,
                        timestamp: new Date().toISOString(),
                        status: attendanceStatus,
                        notes: "Hadir via scan QR Code sukses"
                      };
                      const updatedAttendance = [newRecord, ...attendance];
                      localDb.saveAttendance(updatedAttendance);
                      setAttendance(updatedAttendance);
                      showNotification(`Sukses absen via QR! Status: ${attendanceStatus.toUpperCase()}`);
                      setScannerModalEvent(null);
                      setScanResultSuccess(false);
                      setIsScanning(false);
                      window.dispatchEvent(new Event('localDbUpdate'));
                    }, 1200);

                  }, 1800);
                }}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
              >
                <ScanLine size={14} />
                <span>{isScanning ? 'Mendeteksi QR...' : 'Deteksi QR Terdekat (Scan Instan)'}</span>
              </button>
              
              <div className="flex gap-2">
                <label className="flex-1 py-1.5 border border-white/10 hover:bg-white/5 text-slate-400 rounded-lg text-[10px] font-medium flex items-center justify-center gap-1 cursor-pointer transition-colors text-center">
                  <input type="file" accept="image/*" className="hidden" onChange={() => {
                    // Simulating parsing an uploaded image of a QR code
                    setIsScanning(true);
                    setTimeout(() => {
                      setScanResultSuccess(true);
                      setTimeout(() => {
                        const newRecord: AttendanceRecord = {
                          id: `att-${Date.now()}`,
                          eventId: scannerModalEvent.id,
                          eventTitle: scannerModalEvent.title,
                          eventDate: scannerModalEvent.date,
                          userId: currentUser.id,
                          userName: currentUser.name,
                          userDivision: currentUser.division,
                          timestamp: new Date().toISOString(),
                          status: attendanceStatus,
                          notes: "Hadir via upload QR Screenshot"
                        };
                        const updatedAttendance = [newRecord, ...attendance];
                        localDb.saveAttendance(updatedAttendance);
                        setAttendance(updatedAttendance);
                        showNotification(`Sukses absen via Screenshot QR! Status: ${attendanceStatus.toUpperCase()}`);
                        setScannerModalEvent(null);
                        setScanResultSuccess(false);
                        setIsScanning(false);
                        window.dispatchEvent(new Event('localDbUpdate'));
                      }, 1000);
                    }, 1500);
                  }} />
                  Unggah Gambar QR
                </label>
                <button
                  type="button"
                  onClick={() => setScannerModalEvent(null)}
                  className="px-4 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-lg text-[10px] font-semibold transition-colors cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
