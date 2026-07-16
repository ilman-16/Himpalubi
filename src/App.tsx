import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Calendar, 
  FileText, 
  Image as ImageIcon, 
  Bell, 
  ShieldAlert, 
  User, 
  ShieldCheck, 
  Menu, 
  X, 
  Lock, 
  Unlock, 
  Volume2, 
  Wifi, 
  WifiOff, 
  TrendingUp,
  LayoutDashboard,
  CheckCircle,
  HelpCircle,
  RefreshCw,
  LogOut,
  ChevronDown,
  Coins,
  Briefcase
} from 'lucide-react';

import { localDb, auth } from './lib/firebase';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { UserProfile, SystemNotification } from './types';

// Import modular sub-components
import Dashboard from './components/Dashboard';
import Structure from './components/Structure';
import Events from './components/Events';
import AttendanceList from './components/AttendanceList';
import Minutes from './components/Minutes';
import Documentation from './components/Documentation';
import KasPayment from './components/KasPayment';
import TwoFactorModal from './components/TwoFactorModal';
import Login from './components/Login';
import UserGuide from './components/UserGuide';
import ProkerHub from './components/ProkerHub';

export default function App() {
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('HIMPALUBI_THEME_COLOR') || 'blue');
  const [orgLogo, setOrgLogo] = useState(() => localStorage.getItem('HIMPALUBI_ORG_LOGO') || '');
  
  // Dynamic Real-Time Ticking Clock & Date State
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatIndonesianDateTime = (date: Date) => {
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const months = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    
    const dayName = days[date.getDay()];
    const day = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    
    return `${dayName}, ${day} ${monthName} ${year} • ${hours}:${minutes}:${seconds}`;
  };
  
  // Custom dropdown to switch users/roles for easy client-side demo testing
  const [isUserSwitcherOpen, setIsUserSwitcherOpen] = useState(false);

  // Modals / Overlays States
  const [is2FaOpen, setIs2FaOpen] = useState(false);
  
  // Animated in-app real-time custom Push Alert state
  const [activePushAlert, setActivePushAlert] = useState<{ title: string; body: string } | null>(null);

  // Sound effect toggle for push alerts
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Sync / Online check
  useEffect(() => {
    // Set initial user if none exist, or get from Cache
    const current = localDb.getCurrentUser();
    setCurrentUser(current);
    setAllUsers(localDb.getUsers());

    // Set up Firebase Auth state observer to restore sessions securely
    let unsubscribeAuth: any = null;
    if (auth) {
      unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
        if (firebaseUser && firebaseUser.email) {
          const emailAddress = firebaseUser.email.toLowerCase().trim();
          const users = localDb.getUsers();
          const matchedUser = users.find(u => u.email.toLowerCase() === emailAddress);
          if (matchedUser) {
            localDb.setCurrentUser(matchedUser);
            setCurrentUser(matchedUser);
            try {
              // Now that we are signed in, seed and sync safely
              await localDb.seedFirestore();
              await localDb.syncFromFirestore();
            } catch (err) {
              console.warn("Firestore start sync failed:", err);
            }
          }
        }
      });
    }

    // Connection checks
    setIsOffline(!navigator.onLine);
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen for custom push triggers from other tabs/sub-components
    const handleSimulatedPush = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail) {
        // Trigger push state
        setActivePushAlert({ title: detail.title, body: detail.body });
        
        // Play simple audio alert beeps using Web Audio API (completely safe & no external assets required)
        if (soundEnabled) {
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); // high pitched elegant beep
            gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.15);
          } catch (err) {
            console.log("AudioContext blocked or failed to load inside sandbox:", err);
          }
        }

        // Auto dismiss after 5 seconds
        setTimeout(() => {
          setActivePushAlert(null);
        }, 5500);
      }
    };

    window.addEventListener('simulatePush', handleSimulatedPush);

    // Setup localDb modification updates
    const handleStorageUpdate = () => {
      setAllUsers(localDb.getUsers());
      setCurrentUser(localDb.getCurrentUser());
      setThemeColor(localStorage.getItem('HIMPALUBI_THEME_COLOR') || 'blue');
      setOrgLogo(localStorage.getItem('HIMPALUBI_ORG_LOGO') || '');
    };
    window.addEventListener('localDbUpdate', handleStorageUpdate);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('simulatePush', handleSimulatedPush);
      window.removeEventListener('localDbUpdate', handleStorageUpdate);
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [soundEnabled]);

  const handleSwitchUser = (user: UserProfile) => {
    localDb.setCurrentUser(user);
    setCurrentUser(user);
    setIsUserSwitcherOpen(false);
    
    // Quick notification trigger for user toggle feedback
    const pushEvent = new CustomEvent('simulatePush', { 
      detail: { 
        title: `Selamat Datang, ${user.name}!`, 
        body: `Anda sekarang masuk sebagai peran: ${user.role.toUpperCase()} (${user.division}).` 
      } 
    });
    window.dispatchEvent(pushEvent);
    window.dispatchEvent(new Event('localDbUpdate'));
  };

  const toggleOfflineSim = () => {
    setIsOffline(!isOffline);
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dasbor Analisis', icon: LayoutDashboard },
    { id: 'proker', label: 'Program & Kepanitiaan', icon: Briefcase },
    { id: 'structure', label: 'Struktur & Pengurus', icon: Users },
    { id: 'events', label: 'Jadwal & Presensi', icon: Calendar },
    { id: 'attendance', label: 'Rekap Absensi', icon: FileText },
    { id: 'minutes', label: 'Berita Acara Rapat', icon: FileText },
    { id: 'docs', label: 'Dokumentasi', icon: ImageIcon },
    { id: 'kas', label: 'Kas Organisasi', icon: Coins },
    { id: 'guide', label: 'Buku Petunjuk', icon: HelpCircle },
  ];

  if (!currentUser) {
    return <Login onLogin={(user) => setCurrentUser(user)} />;
  }

  return (
    <div className="relative min-h-screen bg-[#05060f] text-slate-100 flex flex-col font-sans selection:bg-indigo-500/30 selection:text-white overflow-x-hidden">
      
      {/* Background Glows for Frosted Glass Theme */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[45%] h-[45%] bg-blue-600/15 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] bg-indigo-600/15 blur-[140px] rounded-full"></div>
        <div className="absolute top-[30%] right-[20%] w-[35%] h-[35%] bg-purple-600/8 blur-[100px] rounded-full"></div>
      </div>

      {/* Top Real-Time In-App Push Notification banner */}
      {activePushAlert && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 w-[90%] max-w-md bg-slate-900/90 backdrop-blur-xl border-2 border-blue-500/80 rounded-2xl p-4 shadow-2xl shadow-blue-500/10 flex items-start gap-3 z-50 animate-slide-down">
          <div className="p-2 bg-blue-500/15 text-blue-400 rounded-xl">
            <Bell size={20} className="animate-bounce" />
          </div>
          <div className="flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight">{activePushAlert.title}</h4>
            <p className="text-[11px] sm:text-xs text-slate-300 mt-0.5 leading-relaxed">{activePushAlert.body}</p>
          </div>
          <button 
            onClick={() => setActivePushAlert(null)}
            aria-label="Tutup Notifikasi"
            className="p-1 text-slate-500 hover:text-white rounded-lg"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <header className="sticky top-0 bg-white/2 backdrop-blur-md border-b border-white/10 px-4 sm:px-6 py-3 flex items-center justify-between z-30 relative">
        <div className="flex items-center gap-3">
          {/* Mobile hamburger menu toggle */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            aria-label="Menu Navigasi Mobile"
            className="lg:hidden p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl cursor-pointer transition-colors"
          >
            {isMobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>

          {/* Logo */}
          <div className="flex items-center gap-2.5">
            {orgLogo ? (
              <img 
                src={orgLogo} 
                alt="Logo HIMPALUBI" 
                className="w-10 h-10 object-contain rounded-xl border border-white/10 p-0.5 bg-slate-900" 
                referrerPolicy="no-referrer"
              />
            ) : (
              <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20">
                <ShieldCheck size={20} />
              </span>
            )}
            <div>
              <h1 className="font-display font-bold text-white text-sm sm:text-base tracking-tight">HIMPALUBI PORTAL</h1>
              <p className="text-[10px] text-blue-400 font-medium">Digital Org Hub</p>
            </div>
          </div>
        </div>

        {/* Live Date & Time Clock Pill (Ticking Realtime) */}
        <div className="hidden lg:flex items-center gap-2 px-3.5 py-1.5 bg-blue-500/5 border border-blue-500/15 rounded-xl text-blue-400 font-mono text-xs shadow-md">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>Waktu Live: {formatIndonesianDateTime(currentTime)}</span>
        </div>

        {/* User Account Controls & Interactive Demo Role Switcher */}
        <div className="flex items-center gap-4">
          
          {/* Sound Alert Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`p-2 rounded-xl border cursor-pointer hidden sm:block transition-colors ${
              soundEnabled ? 'bg-white/5 border-white/10 text-blue-400' : 'bg-white/5 border-white/10 text-slate-500'
            }`}
            title={soundEnabled ? "Nonaktifkan Suara Alarm" : "Aktifkan Suara Alarm"}
          >
            <Volume2 size={16} />
          </button>

          {/* SIMULATED ROLE SWITCHER (For Testing Roles requested by user) */}
          <div className="relative">
            <button
              onClick={() => setIsUserSwitcherOpen(!isUserSwitcherOpen)}
              id="btn-role-switcher"
              className="flex items-center gap-2.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-left cursor-pointer transition-colors"
            >
              <img 
                src={currentUser.avatar} 
                alt={currentUser.name} 
                className="w-7 h-7 rounded-full object-cover border border-blue-500/30" 
                referrerPolicy="no-referrer"
              />
              <div className="hidden md:block max-w-[120px]">
                <h4 className="text-xs font-bold text-white truncate">{currentUser.name}</h4>
                <p className="text-[9px] text-blue-400 font-medium truncate uppercase tracking-wider">{currentUser.role}</p>
              </div>
              <ChevronDown size={14} className="text-slate-400" />
            </button>

            {isUserSwitcherOpen && (
              <div className="absolute right-0 mt-2 w-64 glass-modal rounded-2xl shadow-2xl py-2 z-40 animate-scale-up">
                <div className="px-3 py-1.5 border-b border-white/10">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Ganti Akun Demo (Uji Coba)</span>
                  <p className="text-[10px] text-blue-400 font-medium mt-0.5">Uji peran Pengurus vs Anggota:</p>
                </div>

                <div className="max-h-[200px] overflow-y-auto divide-y divide-white/5">
                  {allUsers.map(user => (
                    <button
                      key={user.id}
                      onClick={() => handleSwitchUser(user)}
                      className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-white/5 transition-colors ${
                        currentUser.id === user.id ? 'bg-white/5' : ''
                      }`}
                    >
                      <img src={user.avatar} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-white truncate max-w-[110px]">{user.name}</span>
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded uppercase ${
                            user.role === 'pengurus' ? 'bg-blue-500/10 text-blue-400' : 'bg-white/10 text-slate-400'
                          }`}>
                            {user.role}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-400 truncate">{user.division}</p>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Quick actions inside dropdown */}
                <div className="border-t border-white/10 pt-1.5 px-2 mt-1 flex flex-col gap-1">
                  <button
                    onClick={() => { setIs2FaOpen(true); setIsUserSwitcherOpen(false); }}
                    className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-white/5 text-[11px] text-slate-300 flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck size={12} className="text-blue-400" />
                    Setup Keamanan 2FA
                  </button>
                  <button
                    onClick={async () => {
                      if (auth) {
                        try {
                          await signOut(auth);
                        } catch (err) {
                          console.warn("Firebase Auth sign out failed:", err);
                        }
                      }
                      localDb.setCurrentUser(null);
                      setCurrentUser(null);
                      setIsUserSwitcherOpen(false);
                    }}
                    className="w-full text-left py-1.5 px-2 rounded-lg hover:bg-red-500/10 text-[11px] text-red-400 flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut size={12} />
                    Keluar Akun (Logout)
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Structural Layout */}
      <div className="flex-1 flex flex-col lg:flex-row relative z-10">
        
        {/* Navigation Sidebar (Desktop view) */}
        <aside className="hidden lg:flex w-64 bg-white/5 border-r border-white/10 backdrop-blur-xl flex-col justify-between p-4 shrink-0">
          <div className="space-y-6">
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3">Navigasi Hub</span>
              <nav className="space-y-1 pt-1">
                {menuItems.map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      id={`sidebar-tab-${item.id}`}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                        activeTab === item.id 
                          ? 'bg-white/10 border border-white/15 text-blue-400 shadow-lg' 
                          : 'border border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon size={16} />
                      {item.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Bottom user profile and Offline state */}
          <div className="p-3 bg-white/5 border border-white/10 rounded-2xl space-y-3">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <User size={13} className="text-blue-400" />
              <span>Hak Akses Anda:</span>
            </div>
            
            <div className="flex items-center gap-1.5">
              {currentUser.role === 'pengurus' ? (
                <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Unlock size={10} />
                  Pengurus (Bisa Edit)
                </span>
              ) : (
                <span className="px-2 py-0.5 bg-white/10 text-slate-400 border border-white/10 rounded-md text-[9px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Lock size={10} />
                  Anggota (Melihat)
                </span>
              )}
            </div>

            <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 flex items-center justify-between">
              <span>Keamanan 2FA:</span>
              <span className={currentUser.twoFactorEnabled ? "text-emerald-400 font-bold" : "text-amber-500"}>
                {currentUser.twoFactorEnabled ? "Aktif" : "Belum Aktif"}
              </span>
            </div>
          </div>
        </aside>

        {/* Mobile menu navigation drawer overlays */}
        {isMobileMenuOpen && (
          <div className="lg:hidden fixed inset-0 bg-slate-950/40 backdrop-blur-sm z-40" onClick={() => setIsMobileMenuOpen(false)}>
            <div className="w-64 max-w-[80%] bg-[#05060f]/90 h-full border-r border-white/10 backdrop-blur-2xl p-4 flex flex-col justify-between" onClick={e => e.stopPropagation()}>
              <div className="space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <h3 className="font-bold text-white text-sm">Navigasi Portal</h3>
                  <button onClick={() => setIsMobileMenuOpen(false)} aria-label="Tutup Menu" className="p-1 text-slate-400 hover:text-white rounded">
                    <X size={18} />
                  </button>
                </div>
                
                <nav className="space-y-1">
                  {menuItems.map(item => {
                    const Icon = item.icon;
                    return (
                      <button
                        key={item.id}
                        onClick={() => { setActiveTab(item.id); setIsMobileMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                          activeTab === item.id 
                            ? 'bg-white/10 text-blue-400 shadow-md' 
                            : 'text-slate-400 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon size={16} />
                        {item.label}
                      </button>
                    );
                  })}
                </nav>
              </div>

              {/* Mobile bottom profile */}
              <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs space-y-2">
                <p className="text-[10px] text-slate-400 font-bold uppercase">Akses: {currentUser.role.toUpperCase()}</p>
                <div className="flex items-center gap-2">
                  <img src={currentUser.avatar} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                  <span className="font-bold text-white truncate text-[11px]">{currentUser.name}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Core Content Render Frame */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto max-w-7xl mx-auto w-full relative z-10">
          
          {/* Main Active Tab Rendering */}
          <div className="animate-fade-in">
            {activeTab === 'dashboard' && (
              <Dashboard 
                isOffline={isOffline} 
                toggleOffline={toggleOfflineSim} 
                activeTab={activeTab} 
                setActiveTab={setActiveTab} 
              />
            )}
            {activeTab === 'structure' && <Structure currentUser={currentUser} />}
            {activeTab === 'events' && <Events currentUser={currentUser} setActiveTab={setActiveTab} />}
            {activeTab === 'attendance' && <AttendanceList currentUser={currentUser} />}
            {activeTab === 'minutes' && <Minutes currentUser={currentUser} />}
            {activeTab === 'docs' && <Documentation currentUser={currentUser} />}
            {activeTab === 'kas' && <KasPayment currentUser={currentUser} />}
            {activeTab === 'proker' && <ProkerHub currentUser={currentUser} />}
            {activeTab === 'guide' && <UserGuide />}
          </div>
          
        </main>

      </div>

      {/* Shared Modals */}
      <TwoFactorModal
        currentUser={currentUser}
        isOpen={is2FaOpen}
        onClose={() => setIs2FaOpen(false)}
        onSuccess={() => {
          setIs2FaOpen(false);
          // Get newly updated current user
          setCurrentUser(localDb.getCurrentUser());
        }}
      />
    </div>
  );
}
