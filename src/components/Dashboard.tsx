import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  FileText, 
  Image as ImageIcon, 
  TrendingUp, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Wifi,
  WifiOff,
  Coins,
  MapPin
} from 'lucide-react';
import { localDb } from '../lib/firebase';
import { EventItem, AttendanceRecord, UserProfile, ProkerItem } from '../types';

interface DashboardProps {
  isOffline: boolean;
  toggleOffline: () => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Dashboard({ isOffline, toggleOffline, activeTab, setActiveTab }: DashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [prokers, setProkers] = useState<ProkerItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [minutesCount, setMinutesCount] = useState(0);
  const [docsCount, setDocsCount] = useState(0);
  const [kasBalance, setKasBalance] = useState(0);

  // Ticking time state inside dashboard
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const formatIndonesianLongDate = (date: Date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  };

  const calculateKasBalance = () => {
    const txs = localDb.getKasTransactions();
    const inc = txs.filter(t => t.type === 'masuk').reduce((sum, t) => sum + t.amount, 0);
    const exp = txs.filter(t => t.type === 'keluar').reduce((sum, t) => sum + t.amount, 0);
    return inc - exp;
  };

  useEffect(() => {
    // Load data from local DB
    setUsers(localDb.getUsers());
    setEvents(localDb.getEvents());
    setProkers(localDb.getProkers());
    setAttendance(localDb.getAttendance());
    setMinutesCount(localDb.getMinutes().length);
    setDocsCount(localDb.getDocumentation().length);
    setKasBalance(calculateKasBalance());

    // Set up storage listener for real-time synchronization
    const handleStorageChange = () => {
      setUsers(localDb.getUsers());
      setEvents(localDb.getEvents());
      setProkers(localDb.getProkers());
      setAttendance(localDb.getAttendance());
      setMinutesCount(localDb.getMinutes().length);
      setDocsCount(localDb.getDocumentation().length);
      setKasBalance(calculateKasBalance());
    };

    window.addEventListener('storage', handleStorageChange);
    // Custom event dispatch for same-tab updates
    window.addEventListener('localDbUpdate', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localDbUpdate', handleStorageChange);
    };
  }, []);

  // Calculate statistics
  const totalMembers = users.length;
  const totalEvents = events.length;
  
  // Average Attendance Rate
  // For completed events, count attendance
  const completedEvents = events.filter(e => {
    // Treat an event as completed if it is in the past
    const today = new Date().toISOString().split('T')[0];
    return e.date < today || !e.attendanceOpen;
  });

  const getAttendanceRate = () => {
    if (completedEvents.length === 0) return 0;
    
    let totalPresent = 0;
    let totalPossible = 0;

    completedEvents.forEach(evt => {
      const records = attendance.filter(a => a.eventId === evt.id);
      const presentCount = records.filter(r => r.status === 'hadir').length;
      totalPresent += presentCount;
      totalPossible += totalMembers; // each member could attend
    });

    return totalPossible > 0 ? Math.round((totalPresent / totalPossible) * 100) : 0;
  };

  const avgAttendanceRate = getAttendanceRate();

  // Active participation per member
  const memberParticipation = users.map(user => {
    const totalAttended = attendance.filter(a => a.userId === user.id && a.status === 'hadir').length;
    const totalPossible = completedEvents.length;
    const rate = totalPossible > 0 ? Math.round((totalAttended / totalPossible) * 100) : 0;
    return {
      name: user.name,
      role: user.role,
      division: user.division,
      avatar: user.avatar,
      attended: totalAttended,
      total: totalPossible,
      rate
    };
  }).sort((a, b) => b.rate - a.rate);

  // Custom SVG Bar Chart Data - Attendance rate for the last 5 events
  const lastFiveEvents = [...events]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-5);

  const chartData = lastFiveEvents.map(evt => {
    const records = attendance.filter(a => a.eventId === evt.id);
    const presentCount = records.filter(r => r.status === 'hadir').length;
    const rate = totalMembers > 0 ? Math.round((presentCount / totalMembers) * 100) : 0;
    return {
      title: evt.title.length > 20 ? evt.title.substring(0, 18) + '..' : evt.title,
      rate
    };
  });

  // Combine meetings/events and Prokers into countdown items
  const getUpcomingAgendas = () => {
    const list: Array<{
      id: string;
      title: string;
      date: string;
      time?: string;
      location?: string;
      type: 'meeting' | 'proker';
      category: string;
      daysLeft: number;
    }> = [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 1. Add meetings/events
    events.forEach(evt => {
      const eventDate = new Date(evt.date);
      eventDate.setHours(0, 0, 0, 0);
      const diffTime = eventDate.getTime() - today.getTime();
      const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Only include future/today events
      if (daysLeft >= 0) {
        list.push({
          id: evt.id,
          title: evt.title,
          date: evt.date,
          time: evt.time,
          location: evt.location,
          type: 'meeting',
          category: evt.category,
          daysLeft
        });
      }
    });

    // 2. Add prokers
    prokers.forEach(pro => {
      if (pro.date) {
        const proDate = new Date(pro.date);
        proDate.setHours(0, 0, 0, 0);
        const diffTime = proDate.getTime() - today.getTime();
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysLeft >= 0) {
          list.push({
            id: pro.id,
            title: pro.name,
            date: pro.date,
            type: 'proker',
            category: 'Program Kerja',
            daysLeft
          });
        }
      }
    });

    // Sort by daysLeft ascending
    return list.sort((a, b) => a.daysLeft - b.daysLeft);
  };

  const upcomingAgendas = getUpcomingAgendas();

  return (
    <div className="space-y-6">
      {/* Welcome & Live Real-Time Clock Header Card */}
      <div className="relative overflow-hidden rounded-2xl border border-blue-500/15 bg-[#0a0e1a]/85 p-6 sm:p-8 backdrop-blur-xl shadow-xl">
        <div className="absolute top-[-40%] right-[-10%] w-[35%] h-[150%] bg-blue-500/10 blur-[80px] rounded-full pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div>
            <span className="px-2.5 py-1 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-lg text-[10px] font-bold uppercase tracking-wider">
              Dasbor HIMPALUBI Portal
            </span>
            <h2 className="text-xl sm:text-2xl md:text-3xl font-display font-bold text-white tracking-tight mt-3">
              {getGreeting()}, Rekan Pengurus!
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-xl">
              Selamat datang kembali di pusat kendali digital HIMPALUBI. Seluruh data kas, presensi rapat, dan administrasi tersinkronisasi secara real-time.
            </p>
          </div>

          <div className="bg-white/3 border border-white/5 rounded-2xl p-4 min-w-[240px] text-center md:text-right flex flex-col justify-center">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Hari & Tanggal</span>
            <span className="text-xs sm:text-sm font-semibold text-blue-400 mt-0.5 block">{formatIndonesianLongDate(currentTime)}</span>
            <div className="mt-2 flex items-center justify-center md:justify-end gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-xl sm:text-2xl font-mono font-bold text-white tracking-wider">
                {currentTime.toTimeString().split(' ')[0]}
              </span>
              <span className="text-[10px] font-bold text-slate-400 font-mono">WIB</span>
            </div>
          </div>
        </div>
      </div>

      {/* Offline Status & Device Sync Card */}
      <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all duration-300 backdrop-blur-xl ${
        isOffline 
          ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' 
          : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-200'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${isOffline ? 'bg-amber-500/15' : 'bg-emerald-500/15'}`}>
            {isOffline ? <WifiOff size={22} className="text-amber-400 animate-pulse" /> : <Wifi size={22} className="text-emerald-400" />}
          </div>
          <div>
            <h3 className="font-display font-semibold text-sm sm:text-base">
              {isOffline ? 'Mode Offline Aktif (Simulasi)' : 'Sinkronisasi Cloud Aktif'}
            </h3>
            <p className="text-xs opacity-85">
              {isOffline 
                ? 'Perubahan disimpan lokal secara aman. Data akan disinkronisasi otomatis saat terhubung internet.'
                : 'Semua perangkat tersinkronisasi secara real-time melalui Firestore Database.'}
            </p>
          </div>
        </div>
        <button
          onClick={toggleOffline}
          id="btn-toggle-offline"
          className={`px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-sm ${
            isOffline 
              ? 'bg-amber-500 hover:bg-amber-600 text-slate-950' 
              : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950'
          }`}
        >
          {isOffline ? 'Hubungkan Online' : 'Simulasi Offline'}
        </button>
      </div>

      {/* Pengingat Kegiatan Terdekat (H- Countdown Alerts) */}
      <div id="upcoming-reminders" className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest block px-1">
            Pengingat Agenda & Kegiatan Terdekat (H- Countdown)
          </span>
          <span className="text-[10px] text-slate-500 font-mono">Real-Time Tracker</span>
        </div>
        
        {upcomingAgendas.length === 0 ? (
          <div className="p-6 bg-slate-900/40 border border-white/5 rounded-2xl text-center text-slate-400 text-xs">
            Tidak ada agenda rapat atau acara besar terdekat yang terjadwal.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {upcomingAgendas.slice(0, 3).map((agenda) => {
              const isToday = agenda.daysLeft === 0;
              const isUrgent = agenda.daysLeft <= 3;
              
              return (
                <div 
                  key={agenda.id}
                  className={`p-4 rounded-xl border relative overflow-hidden transition-all hover:scale-[1.01] flex flex-col justify-between ${
                    isToday
                      ? 'bg-red-500/10 border-red-500/30 text-white shadow-lg shadow-red-500/5'
                      : isUrgent
                      ? 'bg-amber-500/10 border-amber-500/20 text-white shadow-lg shadow-amber-500/5'
                      : 'bg-white/3 border border-white/5 text-slate-300'
                  }`}
                >
                  <div className="absolute top-0 right-0 p-3">
                    <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      isToday
                        ? 'bg-red-500 text-white animate-pulse'
                        : isUrgent
                        ? 'bg-amber-500 text-slate-950 font-extrabold'
                        : 'bg-blue-600/20 text-blue-400 border border-blue-500/20'
                    }`}>
                      {isToday ? 'HARI INI' : `H - ${agenda.daysLeft}`}
                    </span>
                  </div>

                  <div className="space-y-1.5 relative z-10 pr-16">
                    <span className="text-[9px] font-semibold text-slate-400 uppercase block font-mono">
                      {agenda.category}
                    </span>
                    <h4 className="font-bold text-xs sm:text-sm text-white tracking-tight line-clamp-1">
                      {agenda.title}
                    </h4>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                      <Clock size={11} className="text-slate-500" />
                      <span>{new Date(agenda.date).toLocaleDateString('id-ID', {weekday: 'short', day: 'numeric', month: 'short'})}</span>
                      {agenda.time && <span className="font-semibold text-slate-300">• {agenda.time}</span>}
                    </p>
                    {agenda.location && (
                      <p className="text-[10px] text-slate-400 flex items-center gap-1.5 truncate">
                        <MapPin size={11} className="text-slate-500" />
                        <span>{agenda.location}</span>
                      </p>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500">
                    <span>Tipe: {agenda.type === 'meeting' ? 'Rapat/Pertemuan' : 'Kegiatan Utama'}</span>
                    <button 
                      onClick={() => setActiveTab(agenda.type === 'meeting' ? 'events' : 'prokers')}
                      className="text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
                    >
                      Buka Detail
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Grid Statistik Utama */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Stat Card 1 */}
        <div id="stat-members" className="p-4 sm:p-5 glass-panel rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs sm:text-sm font-medium text-slate-400">Total Anggota</span>
            <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg"><Users size={16} /></span>
          </div>
          <div className="mt-4">
            <h4 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">{totalMembers}</h4>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-medium">100%</span> terdaftar di sistem
            </p>
          </div>
        </div>

        {/* Stat Card 2 */}
        <div id="stat-events" className="p-4 sm:p-5 glass-panel rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs sm:text-sm font-medium text-slate-400">Total Kegiatan</span>
            <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg"><Calendar size={16} /></span>
          </div>
          <div className="mt-4">
            <h4 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">{totalEvents}</h4>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-blue-400 font-medium">{events.filter(e => e.attendanceOpen).length} Aktif</span> absen digital dibuka
            </p>
          </div>
        </div>

        {/* Stat Card 3 */}
        <div id="stat-attendance" className="p-4 sm:p-5 glass-panel rounded-2xl flex flex-col justify-between shadow-lg">
          <div className="flex justify-between items-start">
            <span className="text-xs sm:text-sm font-medium text-slate-400">Rata-rata Presensi</span>
            <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg"><TrendingUp size={16} /></span>
          </div>
          <div className="mt-4">
            <h4 className="text-2xl sm:text-3xl font-display font-bold text-white tracking-tight">{avgAttendanceRate}%</h4>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-medium">Sangat Aktif</span> bulan ini
            </p>
          </div>
        </div>

        {/* Stat Card 4 */}
        <div id="stat-kas" onClick={() => setActiveTab('kas')} className="p-4 sm:p-5 glass-panel rounded-2xl flex flex-col justify-between shadow-lg cursor-pointer hover:border-blue-500/30 transition-all group">
          <div className="flex justify-between items-start">
            <span className="text-xs sm:text-sm font-medium text-slate-400 group-hover:text-blue-400 transition-colors">Saldo Kas Himpunan</span>
            <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg group-hover:bg-blue-500/20 transition-all"><Coins size={16} /></span>
          </div>
          <div className="mt-4">
            <h4 className="text-lg sm:text-xl font-display font-bold text-white tracking-tight">Rp {kasBalance.toLocaleString('id-ID')}</h4>
            <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <span className="text-emerald-400 font-bold">Transparan</span> • klik untuk detail iuran
            </p>
          </div>
        </div>
      </div>

      {/* Grid Dashboard Utama */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Grafis Presensi Kegiatan (Custom SVG Chart) */}
        <div id="attendance-chart" className="lg:col-span-7 glass-panel rounded-2xl p-5 flex flex-col shadow-lg">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="font-display font-semibold text-white">Tingkat Kehadiran Rapat & Kegiatan</h3>
              <p className="text-xs text-slate-400">Persentase kehadiran anggota pada 5 kegiatan terakhir</p>
            </div>
          </div>

          <div className="flex-1 min-h-[220px] flex items-end justify-between gap-3 px-2 pt-4 border-b border-white/10 pb-2">
            {chartData.length === 0 ? (
              <div className="w-full text-center py-12 text-slate-400 text-sm">Belum ada data kegiatan untuk grafik</div>
            ) : (
              chartData.map((data, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center group relative">
                  {/* Tooltip */}
                  <div className="absolute -top-10 scale-0 group-hover:scale-100 transition-all duration-200 bg-slate-800 border border-white/10 text-white text-xs px-2 py-1 rounded shadow-lg z-10 pointer-events-none">
                    {data.rate}% Hadir
                  </div>
                  
                  {/* Bar */}
                  <div className="w-full bg-white/5 rounded-t-lg overflow-hidden flex items-end h-[160px] min-w-[28px] max-w-[50px]">
                    <div 
                      style={{ height: `${data.rate}%` }} 
                      className={`w-full rounded-t-md transition-all duration-500 group-hover:brightness-110 ${
                        data.rate >= 80 
                          ? 'bg-gradient-to-t from-emerald-500 to-emerald-400/80' 
                          : data.rate >= 60 
                          ? 'bg-gradient-to-t from-blue-500 to-blue-400/80' 
                          : 'bg-gradient-to-t from-amber-500 to-amber-400/80'
                      }`}
                    />
                  </div>

                  {/* Percentage label */}
                  <span className="text-xs font-bold text-white mt-2">{data.rate}%</span>
                  
                  {/* Title label */}
                  <span className="text-[10px] text-slate-400 mt-1 text-center truncate w-full hidden sm:block" title={data.title}>
                    {data.title}
                  </span>
                </div>
              ))
            )}
          </div>
          
          <div className="flex justify-center sm:justify-start gap-4 mt-4 text-[10px] text-slate-400">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> &gt;= 80% (Sangat Baik)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-400" /> 60-79% (Cukup)</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> &lt; 60% (Perlu Evaluasi)</span>
          </div>
        </div>

        {/* Pemantauan Partisipasi Aktif Anggota */}
        <div id="members-participation" className="lg:col-span-5 glass-panel rounded-2xl p-5 flex flex-col shadow-lg">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h3 className="font-display font-semibold text-white">Dasbor Partisipasi Bulanan</h3>
              <p className="text-xs text-slate-400">Peringkat keaktifan kehadiran anggota saat rapat</p>
            </div>
            <button 
              onClick={() => setActiveTab('attendance')} 
              id="btn-view-all-participation"
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold cursor-pointer"
            >
              Lihat Detail
            </button>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[250px] space-y-3 pr-1 scrollbar-thin">
            {memberParticipation.map((member, idx) => (
              <div key={idx} className="flex items-center justify-between p-2 rounded-xl bg-white/3 border border-white/5 hover:border-white/10 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <img 
                      src={member.avatar} 
                      alt={member.name} 
                      className="w-8 h-8 rounded-full object-cover border border-white/10"
                      referrerPolicy="no-referrer"
                    />
                    <span className={`absolute -bottom-1 -right-1 w-4 h-4 text-[9px] font-bold rounded-full flex items-center justify-center border border-[#05060f] ${
                      idx === 0 ? 'bg-amber-500 text-slate-950' : idx === 1 ? 'bg-slate-300 text-slate-950' : idx === 2 ? 'bg-amber-700 text-white' : 'bg-white/10 text-slate-300'
                    }`}>
                      {idx + 1}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-white truncate max-w-[120px] sm:max-w-[160px]">{member.name}</h4>
                    <p className="text-[10px] text-slate-400 truncate max-w-[150px]">{member.division}</p>
                  </div>
                </div>
                
                <div className="text-right">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    member.rate >= 80 ? 'bg-emerald-500/10 text-emerald-400' : member.rate >= 60 ? 'bg-blue-500/10 text-blue-400' : 'bg-amber-500/10 text-amber-400'
                  }`}>
                    {member.rate}%
                  </span>
                  <p className="text-[9px] text-slate-400 mt-0.5">{member.attended}/{member.total} Rapat</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Info Tambahan & Panduan Hak Akses */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl p-5 flex gap-4 shadow-lg">
          <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl h-fit">
            <CheckCircle size={24} />
          </div>
          <div>
            <h4 className="font-display font-semibold text-white mb-1">Informasi Hak Akses Khusus</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Sistem membagi peran menjadi <strong>Pengurus</strong> dan <strong>Anggota</strong>. 
              Hanya Pengurus (seperti Ketua, Sekretaris, Bendahara) yang memiliki hak akses penuh 
              untuk mengunggah berita acara, menambah dokumentasi, membuat agenda rapat, dan mengaktifkan absensi digital.
              Anggota hanya dapat melihat data dan melakukan absensi mandiri menggunakan kode verifikasi.
            </p>
          </div>
        </div>

        <div className="glass-panel rounded-2xl p-5 flex gap-4 shadow-lg">
          <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl h-fit">
            <Clock size={24} />
          </div>
          <div>
            <h4 className="font-display font-semibold text-white mb-1">Panduan Penggunaan Offline</h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Jangan khawatir kehilangan koneksi internet saat rapat. Aplikasi memiliki dukungan 
              <strong> sinkronisasi offline</strong> penuh. Anda tetap dapat membaca berita acara, 
              mengunggah data presensi, dan memeriksa struktur organisasi. Semua data disimpan secara lokal 
              dan disinkronkan ke server cloud secara otomatis saat sinyal kembali pulih.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
