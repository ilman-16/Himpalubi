import React, { useState, useEffect } from 'react';
import { Mail, Lock, LogIn, ShieldAlert, ArrowRight, Check, ShieldCheck } from 'lucide-react';
import { localDb, auth } from '../lib/firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { UserProfile } from '../types';

interface LoginProps {
  onLogin: (user: UserProfile) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState<UserProfile[]>([]);

  useEffect(() => {
    // Load registered users from localDb
    setDemoUsers(localDb.getUsers());
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const users = localDb.getUsers();
      const matchedUser = users.find(u => u.email.toLowerCase() === email.trim().toLowerCase());

      if (!matchedUser) {
        setError('Email tidak terdaftar! Silakan pilih salah satu akun terdaftar di bawah.');
        setLoading(false);
        return;
      }

      // Successful login
      localDb.setCurrentUser(matchedUser);
      onLogin(matchedUser);
      setLoading(false);

      // Trigger custom push alert greeting
      const pushEvent = new CustomEvent('simulatePush', { 
        detail: { 
          title: `Selamat Datang, ${matchedUser.name}!`, 
          body: `Anda sekarang masuk sebagai peran: ${matchedUser.role.toUpperCase()} (${matchedUser.division}).` 
        } 
      });
      window.dispatchEvent(pushEvent);
    }, 600); // realistic slight delay
  };

  const handleGoogleSignIn = async () => {
    if (!auth) {
      setError('Firebase Authentication tidak aktif atau belum terkonfigurasi.');
      return;
    }
    setError(null);
    setLoading(true);

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const firebaseUser = result.user;

      if (firebaseUser && firebaseUser.email) {
        const emailAddress = firebaseUser.email.toLowerCase().trim();
        const users = localDb.getUsers();
        let matchedUser = users.find(u => u.email.toLowerCase() === emailAddress);

        if (!matchedUser) {
          // Buat profil anggota baru otomatis
          const newId = `usr-${Date.now()}`;
          matchedUser = {
            id: newId,
            name: firebaseUser.displayName || 'Anggota Baru',
            email: emailAddress,
            role: 'anggota',
            division: 'Anggota Biasa (Tanpa Divisi)',
            avatar: firebaseUser.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
            registeredAt: new Date().toISOString(),
            twoFactorEnabled: false,
            notificationPreferences: {
              newEvents: true,
              beritaAcara: true,
              attendanceReminders: true,
              channel: 'browser'
            }
          };
          
          const updatedUsers = [...users, matchedUser];
          localDb.saveUsers(updatedUsers);
        }

        localDb.setCurrentUser(matchedUser);
        onLogin(matchedUser);

        // Seed and sync Firestore
        try {
          await localDb.seedFirestore();
          await localDb.syncFromFirestore();
        } catch (err) {
          console.warn("Initial sync/seed failed:", err);
        }

        window.dispatchEvent(new Event('localDbUpdate'));

        const pushEvent = new CustomEvent('simulatePush', { 
          detail: { 
            title: `Selamat Datang, ${matchedUser.name}!`, 
            body: `Anda berhasil masuk aman menggunakan Google Auth sebagai peran: ${matchedUser.role.toUpperCase()} (${matchedUser.division}).` 
          } 
        });
        window.dispatchEvent(pushEvent);
      }
    } catch (err: any) {
      console.error("Google Sign-In Error:", err);
      setError(err?.message || 'Gagal masuk menggunakan Google.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (user: UserProfile) => {
    setEmail(user.email);
    setPassword('********');
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#05060f] text-slate-100 flex flex-col justify-center items-center p-4 relative font-sans overflow-y-auto">
      {/* Dynamic Background Glows */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[15%] left-[10%] w-[40%] h-[40%] bg-blue-600/15 blur-[120px] rounded-full"></div>
        <div className="absolute bottom-[15%] right-[10%] w-[45%] h-[45%] bg-indigo-600/15 blur-[140px] rounded-full"></div>
      </div>

      <div className="w-full max-w-lg z-10 space-y-6 my-8">
        {/* Header Branding */}
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-blue-500/10 text-blue-400 rounded-2xl border border-blue-500/20 mb-2">
            <LogIn size={32} className="animate-pulse" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-display font-bold tracking-tight text-white">
            PORTAL MAHASISWA
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-xs mx-auto">
            Masuk menggunakan email terdaftar untuk mengelola & memantau aktivitas organisasi
          </p>
        </div>

        {/* Login Card */}
        <div className="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl border border-white/10 relative overflow-hidden backdrop-blur-xl">
          <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent"></div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-start gap-2.5 animate-shake">
                <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold text-slate-400">Email Kampus / Organisasi</label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Mail size={16} />
                </span>
                <input
                  id="email"
                  type="email"
                  required
                  placeholder="nama@univ.ac.id atau email Anda"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white/2 border border-white/10 focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all font-sans"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="password" className="block text-xs font-semibold text-slate-400">Kata Sandi</label>
                <span className="text-[10px] text-blue-400 hover:underline cursor-pointer">Lupa Sandi?</span>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-500">
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  type="password"
                  required
                  placeholder="Masukkan kata sandi bebas"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white/2 border border-white/10 focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-all font-sans"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/20 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/25 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Masuk ke Portal</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>

            {auth && (
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/10 font-semibold rounded-xl text-xs sm:text-sm flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md disabled:opacity-50 mt-2"
              >
                <svg className="w-4 h-4 mr-1 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                <span>Masuk dengan Google</span>
              </button>
            )}
          </form>

          {/* Divider */}
          <div className="my-6 flex items-center gap-3">
            <div className="flex-1 h-[1px] bg-white/10"></div>
            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Uji Coba Demo Akun</span>
            <div className="flex-1 h-[1px] bg-white/10"></div>
          </div>

          {/* Quick Demo Fill Grid */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-bold text-slate-400 block uppercase">Pilih Akun Terdaftar untuk Mengisi Otomatis:</span>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
              {demoUsers.map(user => {
                const isSelected = email.toLowerCase() === user.email.toLowerCase();
                return (
                  <button
                    key={user.id}
                    type="button"
                    onClick={() => handleQuickFill(user)}
                    className={`flex items-center gap-2.5 p-2 rounded-xl text-left border transition-all text-xs cursor-pointer bg-white/3 ${
                      isSelected 
                        ? 'border-blue-500/80 bg-blue-500/5 shadow-md shadow-blue-500/5' 
                        : 'border-white/5 hover:border-white/10 hover:bg-white/5'
                    }`}
                  >
                    <img
                      src={user.avatar}
                      alt={user.name}
                      className="w-8 h-8 rounded-full object-cover border border-white/10 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white truncate text-[11px] block">{user.name}</span>
                        {isSelected && <Check size={10} className="text-blue-400 shrink-0" />}
                      </div>
                      <p className="text-[9px] text-slate-400 truncate mt-0.5">{user.division}</p>
                      <p className="text-[8px] text-blue-400 font-mono mt-0.5 select-all truncate">{user.email}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[10px] text-slate-500">
          Digital Org Hub • Hak Cipta &copy; 2026. Dikembangkan untuk organisasi mahasiswa tingkat lanjut.
        </p>
      </div>
    </div>
  );
}
