import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Smartphone, 
  Mail, 
  Settings, 
  CheckCircle, 
  Volume2, 
  Eye, 
  ShieldAlert,
  Send,
  Zap,
  Clock
} from 'lucide-react';
import { UserProfile, SystemNotification } from '../types';
import { localDb } from '../lib/firebase';

interface NotificationSettingsProps {
  currentUser: UserProfile;
}

export default function NotificationSettings({ currentUser }: NotificationSettingsProps) {
  const [preferences, setPreferences] = useState(currentUser.notificationPreferences);
  const [browserPermission, setBrowserPermission] = useState('default');
  const [notifsList, setNotifsList] = useState<SystemNotification[]>([]);
  
  // Custom Push Notification Trigger State (for simulating custom push alerts)
  const [customPushForm, setCustomPushForm] = useState({
    title: 'Pengingat Rapat Penting!',
    body: 'Rapat koordinasi dimulai dalam 15 menit. Silakan buka aplikasi untuk check-in presensi digital.',
    type: 'event' as any
  });

  const [notification, setNotification] = useState<string | null>(null);

  const loadNotifs = () => {
    setNotifsList(localDb.getNotifications());
    setBrowserPermission(Notification.permission);
  };

  useEffect(() => {
    loadNotifs();

    const handleStorageChange = () => {
      loadNotifs();
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

  const handleTogglePreference = (key: 'newEvents' | 'beritaAcara' | 'attendanceReminders') => {
    const updatedPrefs = {
      ...preferences,
      [key]: !preferences[key]
    };
    setPreferences(updatedPrefs);

    // Save back to user
    const updatedUser = {
      ...currentUser,
      notificationPreferences: updatedPrefs
    };
    localDb.setCurrentUser(updatedUser);

    // Update user in users list
    const users = localDb.getUsers().map(u => u.id === currentUser.id ? updatedUser : u);
    localDb.saveUsers(users);

    showNotification("Konfigurasi notifikasi berhasil diperbarui!");
    window.dispatchEvent(new Event('localDbUpdate'));
  };

  const handleChangeChannel = (channel: 'browser' | 'email' | 'both') => {
    const updatedPrefs = {
      ...preferences,
      channel
    };
    setPreferences(updatedPrefs);

    const updatedUser = {
      ...currentUser,
      notificationPreferences: updatedPrefs
    };
    localDb.setCurrentUser(updatedUser);

    const users = localDb.getUsers().map(u => u.id === currentUser.id ? updatedUser : u);
    localDb.saveUsers(users);

    showNotification("Saluran penerima notifikasi diperbarui.");
    window.dispatchEvent(new Event('localDbUpdate'));
  };

  // Request browser notification permission
  const handleRequestPermission = () => {
    if (!('Notification' in window)) {
      alert("Browser ini tidak mendukung notifikasi push desktop.");
      return;
    }

    Notification.requestPermission().then(permission => {
      setBrowserPermission(permission);
      if (permission === 'granted') {
        showNotification("Notifikasi push browser berhasil diaktifkan!");
        
        // Trigger a test notification
        try {
          new Notification("Portal Organisasi Mahasiswa", {
            body: "Halo! Notifikasi pengingat jadwal real-time Anda sekarang aktif.",
            icon: currentUser.avatar
          });
        } catch (e) {
          console.log("Iframe restricts standard desktop notifications. In-app simulation is loaded.");
        }
      }
    });
  };

  // Trigger CUSTOM customizable Push Notification Simulation
  const handleSimulateCustomPush = (e: React.FormEvent) => {
    e.preventDefault();

    // Create a new notification object to save in history
    const newNotif: SystemNotification = {
      id: `notif-${Date.now()}`,
      title: customPushForm.title,
      body: customPushForm.body,
      date: new Date().toISOString(),
      read: false,
      type: customPushForm.type,
      targetRole: 'all'
    };

    const updatedNotifs = [newNotif, ...notifsList];
    localDb.saveNotifications(updatedNotifs);
    setNotifsList(updatedNotifs);

    // Trigger standard browser push if allowed
    if (browserPermission === 'granted') {
      try {
        new Notification(customPushForm.title, {
          body: customPushForm.body,
          icon: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120'
        });
      } catch (err) {
        console.log("Iframe desktop push is sandboxed. Dispatched in-app toast instead.");
      }
    }

    // Trigger in-app top slider notification (dispatched via event for App.tsx to catch and animate)
    const pushEvent = new CustomEvent('simulatePush', { 
      detail: { title: customPushForm.title, body: customPushForm.body } 
    });
    window.dispatchEvent(pushEvent);

    showNotification("Mengirim notifikasi push real-time ke jajaran anggota!");
    window.dispatchEvent(new Event('localDbUpdate'));
  };

  const handleMarkAllRead = () => {
    const updatedNotifs = notifsList.map(n => ({ ...n, read: true }));
    localDb.saveNotifications(updatedNotifs);
    setNotifsList(updatedNotifs);
    showNotification("Semua notifikasi ditandai telah dibaca.");
    window.dispatchEvent(new Event('localDbUpdate'));
  };

  const handleClearNotifs = () => {
    localDb.saveNotifications([]);
    setNotifsList([]);
    showNotification("Riwayat notifikasi berhasil dibersihkan.");
    window.dispatchEvent(new Event('localDbUpdate'));
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

      {/* Action Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Pengaturan Notifikasi Push</h2>
        <p className="text-xs sm:text-sm text-slate-400">Konfigurasikan pengingat kegiatan real-time dan kustomisasi alarm</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Columns: Config Panel & Custom Push Simulator */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Notification Permission Card */}
          <div className="p-5 glass-panel rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border border-white/10 shadow-lg">
            <div className="flex items-start gap-3">
              <span className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl mt-0.5"><Bell size={20} /></span>
              <div>
                <h3 className="font-semibold text-white text-sm sm:text-base">Notifikasi Push Browser</h3>
                <p className="text-xs text-slate-400 leading-relaxed mt-1">
                  Aktifkan push langsung di desktop atau smartphone Anda untuk pengingat jadwal instan saat browser ditutup.
                </p>
                <span className={`inline-block mt-2 text-[10px] font-bold px-2 py-0.5 rounded ${
                  browserPermission === 'granted' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                }`}>
                  Status Izin: {browserPermission === 'granted' ? 'DIIZINKAN' : 'BELUM DIIZINKAN'}
                </span>
              </div>
            </div>

            {browserPermission !== 'granted' && (
              <button
                onClick={handleRequestPermission}
                id="btn-request-permission"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition-colors shadow-lg shadow-blue-500/20"
              >
                Izinkan Push
              </button>
            )}
          </div>

          {/* Configuration Grid preferences */}
          <div className="p-5 glass-panel rounded-2xl space-y-4 border border-white/10 shadow-lg">
            <h3 className="font-display font-bold text-white text-sm sm:text-base flex items-center gap-2 border-b border-white/10 pb-2">
              <Settings size={16} className="text-blue-400" />
              Kustomisasi Kategori Notifikasi
            </h3>
            
            <div className="space-y-4 pt-1">
              {/* Category 1 */}
              <div className="flex items-center justify-between p-3 bg-white/3 border border-white/10 rounded-xl">
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white">Agenda & Rapat Baru</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Dapatkan pengingat real-time saat pengurus membuat jadwal rapat baru.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.newEvents}
                  onChange={() => handleTogglePreference('newEvents')}
                  className="w-4 h-4 text-blue-600 border-white/10 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Category 2 */}
              <div className="flex items-center justify-between p-3 bg-white/3 border border-white/10 rounded-xl">
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white">Rilis Berita Acara Rapat</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Notifikasi saat notulensi atau LPJ rapat selesai dipublikasikan.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.beritaAcara}
                  onChange={() => handleTogglePreference('beritaAcara')}
                  className="w-4 h-4 text-blue-600 border-white/10 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>

              {/* Category 3 */}
              <div className="flex items-center justify-between p-3 bg-white/3 border border-white/10 rounded-xl">
                <div>
                  <h4 className="text-xs sm:text-sm font-semibold text-white">Pengingat Presensi Digital</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Alarm otomatis 15 menit sebelum rapat untuk melakukan check-in.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.attendanceReminders}
                  onChange={() => handleTogglePreference('attendanceReminders')}
                  className="w-4 h-4 text-blue-600 border-white/10 rounded focus:ring-blue-500 cursor-pointer"
                />
              </div>
            </div>

            {/* Notification Channel Choice */}
            <div className="pt-4 border-t border-white/10">
              <label className="block text-xs font-semibold text-slate-400 mb-2">Saluran Penerima Notifikasi:</label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => handleChangeChannel('browser')}
                  className={`py-2 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    preferences.channel === 'browser'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-white/3 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <Smartphone size={13} />
                  Hanya Browser
                </button>
                
                <button
                  type="button"
                  onClick={() => handleChangeChannel('email')}
                  className={`py-2 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    preferences.channel === 'email'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-white/3 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <Mail size={13} />
                  Hanya Email
                </button>

                <button
                  type="button"
                  onClick={() => handleChangeChannel('both')}
                  className={`py-2 px-3 border rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-all ${
                    preferences.channel === 'both'
                      ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20'
                      : 'bg-white/3 border-white/10 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <Zap size={13} />
                  Keduanya (Aktif)
                </button>
              </div>
            </div>
          </div>

          {/* CUSTOMIZABLE PUSH NOTIFICATION SIMULATOR FORM */}
          <div className="p-5 glass-panel rounded-2xl space-y-4 border border-white/10 shadow-lg">
            <h3 className="font-display font-bold text-white text-sm sm:text-base flex items-center gap-2 border-b border-white/10 pb-2">
              <Zap size={16} className="text-amber-400" />
              Kirim Alarm Kustom Organisasi (Simulasi Push)
            </h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Tulis dan kirimkan notifikasi kustom ke seluruh jajaran anggota organisasi. Ini akan memicu push banner dan suara alert secara instan.
            </p>
            
            <form onSubmit={handleSimulateCustomPush} className="space-y-3 pt-1">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Judul Push Alert</label>
                <input
                  type="text"
                  required
                  value={customPushForm.title}
                  onChange={e => setCustomPushForm({ ...customPushForm, title: e.target.value })}
                  className="w-full glass-input rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 mb-1">Isi Pesan Notifikasi</label>
                <textarea
                  rows={2}
                  required
                  value={customPushForm.body}
                  onChange={e => setCustomPushForm({ ...customPushForm, body: e.target.value })}
                  className="w-full glass-input rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 resize-none leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Kategori Tipe</label>
                  <select
                    value={customPushForm.type}
                    onChange={e => setCustomPushForm({ ...customPushForm, type: e.target.value })}
                    className="w-full glass-input rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="event" className="bg-[#0e1320] text-white">Agenda Kegiatan</option>
                    <option value="minutes" className="bg-[#0e1320] text-white">Berita Acara</option>
                    <option value="attendance" className="bg-[#0e1320] text-white">Absensi / Presensi</option>
                    <option value="system" className="bg-[#0e1320] text-white">Sistem Darurat</option>
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-blue-500/20"
                  >
                    <Send size={12} />
                    Kirim Push Alert
                  </button>
                </div>
              </div>
            </form>
          </div>

        </div>

        {/* Right Columns: Push Notifications Inbox Logs */}
        <div className="lg:col-span-5 glass-panel rounded-2xl p-5 flex flex-col h-[560px] border border-white/10 shadow-lg">
          <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-2">
            <div>
              <h3 className="font-display font-bold text-white text-sm sm:text-base flex items-center gap-2">
                <Bell size={16} className="text-blue-400" />
                Riwayat Push Notifikasi
              </h3>
              <p className="text-[10px] text-slate-400">Arsip pesan notifikasi yang dikirim ke perangkat</p>
            </div>
            
            {notifsList.length > 0 && (
              <div className="flex items-center gap-2">
                <button 
                  onClick={handleMarkAllRead} 
                  className="text-[10px] text-blue-400 hover:text-blue-300 font-semibold cursor-pointer bg-transparent border-none"
                >
                  Baca Semua
                </button>
                <button 
                  onClick={handleClearNotifs} 
                  className="text-[10px] text-slate-500 hover:text-red-400 font-semibold cursor-pointer bg-transparent border-none"
                >
                  Hapus
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
            {notifsList.length === 0 ? (
              <div className="text-center py-20 text-slate-500 italic">
                <Bell size={32} className="mx-auto mb-2 opacity-35" />
                <p className="text-xs">Kotak riwayat notifikasi kosong</p>
              </div>
            ) : (
              notifsList.map(notif => (
                <div 
                  key={notif.id}
                  className={`p-3 rounded-xl border transition-all ${
                    notif.read 
                      ? 'bg-white/3 border-white/5 opacity-70' 
                      : 'bg-blue-500/5 border-blue-500/20 shadow-sm shadow-blue-500/5'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                      notif.type === 'event' 
                        ? 'bg-blue-500/10 text-blue-400' 
                        : notif.type === 'minutes' 
                        ? 'bg-purple-500/10 text-purple-400' 
                        : notif.type === 'attendance'
                        ? 'bg-emerald-500/10 text-emerald-400'
                        : 'bg-red-500/10 text-red-400'
                    }`}>
                      {notif.type}
                    </span>
                    <span className="text-[9px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock size={10} />
                      {new Date(notif.date).toLocaleDateString('id-ID')}
                    </span>
                  </div>

                  <h4 className={`text-xs font-bold text-white mt-1.5 ${notif.read ? 'opacity-80' : ''}`}>{notif.title}</h4>
                  <p className="text-[10px] text-slate-400 mt-1 leading-relaxed">{notif.body}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
