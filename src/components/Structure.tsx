import React, { useState, useEffect } from 'react';
import { 
  Shield, 
  UserPlus, 
  Edit2, 
  X, 
  Save, 
  Phone, 
  Mail, 
  Briefcase, 
  Info,
  Trash2,
  Lock,
  Check,
  Users,
  Search,
  Award,
  AlertTriangle,
  Download
} from 'lucide-react';
import { localDb } from '../lib/firebase';
import { UserProfile, UserRole } from '../types';

interface StructureProps {
  currentUser: UserProfile;
}

export default function Structure({ currentUser }: StructureProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'pengurus' | 'anggota'>('pengurus');
  const [searchQuery, setSearchQuery] = useState('');
  const [angkatanFilter, setAngkatanFilter] = useState('all');
  const [currentPeriod, setCurrentPeriod] = useState(() => localStorage.getItem('HIMPALUBI_PERIODE') || '2026/2027');
  const [isReshuffleModalOpen, setIsReshuffleModalOpen] = useState(false);
  const [reshufflePeriodInput, setReshufflePeriodInput] = useState(() => localStorage.getItem('HIMPALUBI_PERIODE') || '2026/2027');

  // Edit/Add Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    role: 'anggota' as UserRole,
    division: 'Anggota Biasa (Tanpa Divisi)',
    avatar: '',
    phone: '',
    bio: '',
    nim: '',
    angkatan: '2024',
    status: 'Aktif' as 'Aktif' | 'Cuti' | 'Alumni',
    studyProgram: 'Pendidikan Luar Biasa',
  });

  const [notification, setNotification] = useState<string | null>(null);

  // Load users from storage
  const loadUsers = () => {
    setUsers(localDb.getUsers());
  };

  useEffect(() => {
    loadUsers();

    const handleStorageChange = () => {
      loadUsers();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('localDbUpdate', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('localDbUpdate', handleStorageChange);
    };
  }, []);

  const isUserPengurus = currentUser.role === 'pengurus';

  const showNotification = (message: string) => {
    setNotification(message);
    setTimeout(() => {
      setNotification(null);
    }, 3000);
  };

  const handleOpenEdit = (user: UserProfile) => {
    if (!isUserPengurus) return; // Prevent if not pengurus
    setSelectedUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      division: user.division,
      avatar: user.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
      phone: user.phone || '',
      bio: user.bio || '',
      nim: user.nim || '',
      angkatan: user.angkatan || '2023',
      status: user.status || 'Aktif',
      studyProgram: user.studyProgram || '',
    });
    setIsEditing(true);
    setIsAdding(false);
  };

  const handleOpenAdd = () => {
    if (!isUserPengurus) return;
    setFormData({
      name: '',
      email: '',
      role: 'anggota',
      division: 'Anggota Biasa (Tanpa Divisi)',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
      phone: '',
      bio: '',
      nim: '',
      angkatan: '2024',
      status: 'Aktif',
      studyProgram: 'Pendidikan Luar Biasa',
    });
    setIsAdding(true);
    setIsEditing(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUserPengurus) return;

    let updatedUsers = [...users];

    if (isAdding) {
      const newUser: UserProfile = {
        id: `usr-${Date.now()}`,
        name: formData.name,
        email: formData.email,
        role: formData.role,
        division: formData.division,
        avatar: formData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120',
        phone: formData.phone,
        bio: formData.bio,
        nim: formData.nim,
        angkatan: formData.angkatan,
        status: formData.status,
        studyProgram: formData.studyProgram,
        twoFactorEnabled: false,
        registeredAt: new Date().toISOString(),
        notificationPreferences: {
          newEvents: true,
          beritaAcara: true,
          attendanceReminders: true,
          channel: 'browser'
        }
      };
      updatedUsers.push(newUser);
      showNotification(`Sukses menambahkan pengurus/anggota baru: ${formData.name}`);
    } else if (isEditing && selectedUser) {
      updatedUsers = users.map(u => 
        u.id === selectedUser.id 
          ? { ...u, ...formData, avatar: formData.avatar || u.avatar } 
          : u
      );
      
      // If current user modified their own profile, update local cached current user
      if (selectedUser.id === currentUser.id) {
        const updatedSelf = updatedUsers.find(u => u.id === currentUser.id);
        if (updatedSelf) {
          localDb.setCurrentUser(updatedSelf);
        }
      }

      showNotification(`Sukses memperbarui profil: ${formData.name}`);
    }

    localDb.saveUsers(updatedUsers);
    loadUsers();
    setIsEditing(false);
    setIsAdding(false);
    setSelectedUser(null);

    // Dispatch update event
    window.dispatchEvent(new Event('localDbUpdate'));
  };

  const handleDelete = (userId: string) => {
    if (!isUserPengurus) return;
    if (userId === currentUser.id) {
      alert("Anda tidak dapat menghapus akun Anda sendiri!");
      return;
    }

    if (confirm("Apakah Anda yakin ingin menghapus anggota ini dari struktur organisasi?")) {
      const updatedUsers = users.filter(u => u.id !== userId);
      localDb.saveUsers(updatedUsers);
      loadUsers();
      showNotification("Anggota berhasil dihapus.");
      setIsEditing(false);
      setSelectedUser(null);
      window.dispatchEvent(new Event('localDbUpdate'));
    }
  };

  const handleSavePeriod = (newPeriod: string) => {
    if (!isUserPengurus) return;
    localStorage.setItem('HIMPALUBI_PERIODE', newPeriod);
    setCurrentPeriod(newPeriod);
    showNotification(`Periode kepengurusan aktif diubah ke ${newPeriod}`);
    setIsReshuffleModalOpen(false);
  };

  const handleResetPositions = () => {
    if (!isUserPengurus) return;
    if (confirm("PENTING: Apakah Anda yakin ingin me-reset kepengurusan?\n\nSemua pengurus saat ini akan di-demote menjadi Anggota Biasa (Tanpa Divisi) agar Anda bisa menyusun pengurus baru untuk periode selanjutnya. Akun Anda sendiri tetap aman sebagai Pengurus.")) {
      const resetUsers = users.map(u => {
        if (u.id === currentUser.id) {
          return u;
        }
        return {
          ...u,
          role: 'anggota' as UserRole,
          division: 'Anggota Biasa (Tanpa Divisi)'
        };
      });
      localDb.saveUsers(resetUsers);
      loadUsers();
      showNotification("Resavel sukses! Semua jabatan lama telah di-reset ke Anggota Biasa.");
      setIsReshuffleModalOpen(false);
      window.dispatchEvent(new Event('localDbUpdate'));
    }
  };

  // Group users into hierarchy and apply search/angkatan filters
  const availableAngkatans = React.useMemo(() => {
    const years = new Set<string>();
    users.forEach(u => {
      if (u.angkatan) {
        years.add(u.angkatan.trim());
      }
    });
    // Add default ones just in case
    years.add('2023');
    years.add('2024');
    years.add('2025');
    years.add('2026');
    return Array.from(years).sort((a, b) => b.localeCompare(a));
  }, [users]);

  const filteredUsers = React.useMemo(() => {
    return users.filter(u => {
      const matchesSearch = searchQuery.trim() === '' || 
                            u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (u.nim && u.nim.includes(searchQuery)) ||
                            (u.division && u.division.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesAngkatan = angkatanFilter === 'all' || u.angkatan === angkatanFilter;
      return matchesSearch && matchesAngkatan;
    });
  }, [users, searchQuery, angkatanFilter]);

  const bphList = filteredUsers.filter(u => u.division.includes('Badan Pengurus Harian') || u.division.includes('BPH'));
  const litbangList = filteredUsers.filter(u => u.division.toLowerCase().includes('litbang') || u.division.toLowerCase().includes('penelitian dan pengembangan'));
  const prList = filteredUsers.filter(u => u.division.toLowerCase().includes('public relation') || u.division.toLowerCase().includes('humas') || u.division.toLowerCase().includes('hubungan masyarakat'));
  const pengmasList = filteredUsers.filter(u => u.division.toLowerCase().includes('pengabdian masyarakat') || u.division.toLowerCase().includes('pengmas'));
  const psdaList = filteredUsers.filter(u => u.division.toLowerCase().includes('psda') || u.division.toLowerCase().includes('sumber daya'));
  const itList = filteredUsers.filter(u => u.division.toLowerCase().includes('technology') || u.division.toLowerCase().includes('teknologi informasi'));
  const sarprasList = filteredUsers.filter(u => u.division.toLowerCase().includes('sarana') || u.division.toLowerCase().includes('prasarana'));

  // Anggota Biasa (Non-Pengurus / Tanpa Divisi) - not in BPH and not in any division
  const anggotaBiasaList = filteredUsers.filter(u => {
    const isBph = u.division.includes('Badan Pengurus Harian') || u.division.includes('BPH');
    const isLitbang = u.division.toLowerCase().includes('litbang') || u.division.toLowerCase().includes('penelitian');
    const isPr = u.division.toLowerCase().includes('public relation') || u.division.toLowerCase().includes('humas') || u.division.toLowerCase().includes('hubungan masyarakat');
    const isPengmas = u.division.toLowerCase().includes('pengabdian') || u.division.toLowerCase().includes('masyarakat');
    const isPsda = u.division.toLowerCase().includes('psda') || u.division.toLowerCase().includes('sumber daya');
    const isIt = u.division.toLowerCase().includes('technology') || u.division.toLowerCase().includes('teknologi informasi');
    const isSarpras = u.division.toLowerCase().includes('sarana') || u.division.toLowerCase().includes('prasarana');
    
    return !isBph && !isLitbang && !isPr && !isPengmas && !isPsda && !isIt && !isSarpras;
  });

  const filteredAnggotaBiasa = anggotaBiasaList;

  const handleDownloadRoster = () => {
    const activeList = activeSubTab === 'pengurus' 
      ? filteredUsers.filter(u => u.role === 'pengurus')
      : filteredAnggotaBiasa;

    if (activeList.length === 0) {
      alert("Tidak ada data untuk diunduh!");
      return;
    }

    const headers = ['NIM', 'Nama Lengkap', 'Angkatan', 'Program Studi', 'No HP', 'Email', 'Divisi', 'Peran', 'Status'];
    const rows = activeList.map(u => [
      u.nim || '-',
      u.name,
      u.angkatan || '-',
      u.studyProgram || 'Pendidikan Luar Biasa',
      u.phone || '-',
      u.email,
      u.division,
      u.role === 'pengurus' ? 'Pengurus' : 'Anggota',
      u.status || 'Aktif'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    const filename = `Roster_HIMPALUBI_Angkatan_${angkatanFilter === 'all' ? 'Semua' : angkatanFilter}_${activeSubTab}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showNotification(`Roster berhasil diunduh: ${filename}`);
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notification && (
        <div className="fixed bottom-5 right-5 bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-indigo-500 animate-slide-in z-50">
          <Check size={18} />
          <span className="text-sm font-medium">{notification}</span>
        </div>
      )}

      {/* Header and Access Info */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Struktur Organisasi HIMPALUBI</h2>
          <p className="text-xs sm:text-sm text-slate-400">Profil jajaran pengurus & daftar anggota Himpunan Mahasiswa PLB periode {currentPeriod}</p>
        </div>
        
        {isUserPengurus ? (
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setReshufflePeriodInput(currentPeriod);
                setIsReshuffleModalOpen(true);
              }}
              id="btn-reshuffle-period"
              className="px-3.5 py-2 bg-amber-600/20 hover:bg-amber-600/30 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
              title="Ganti tahun periode atau resavel kepengurusan"
            >
              <Award size={15} />
              <span>Resavel & Atur Periode</span>
            </button>

            <button
              onClick={handleOpenAdd}
              id="btn-add-member"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-600/15"
            >
              <UserPlus size={16} />
              Tambah Anggota/Pengurus
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl text-[11px] text-slate-400 backdrop-blur-md">
            <Lock size={12} className="text-amber-400" />
            <span>Mode Lihat Saja (Akses Anggota) • Periode {currentPeriod}</span>
          </div>
        )}
      </div>

      {/* Clean separator Tab Bar between Pengurus and Anggota */}
      <div className="flex gap-2 border-b border-white/10 pb-1 mb-6 overflow-x-auto whitespace-nowrap scrollbar-none">
        <button
          onClick={() => setActiveSubTab('pengurus')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer border ${
            activeSubTab === 'pengurus'
              ? 'bg-blue-600/15 text-blue-400 border-blue-500/30'
              : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
          }`}
        >
          <Shield size={15} />
          <span>Pengurus Himpunan (BPH & Divisi)</span>
          <span className="ml-1 px-1.5 py-0.2 bg-white/10 text-white text-[10px] rounded-full">
            {bphList.length + litbangList.length + prList.length + pengmasList.length + psdaList.length + itList.length + sarprasList.length}
          </span>
        </button>
        <button
          onClick={() => setActiveSubTab('anggota')}
          className={`px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 cursor-pointer border ${
            activeSubTab === 'anggota'
              ? 'bg-indigo-600/15 text-indigo-400 border-indigo-500/30'
              : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
          }`}
        >
          <Users size={15} />
          <span>Anggota Biasa (Non-Pengurus)</span>
          <span className="ml-1 px-1.5 py-0.2 bg-white/10 text-white text-[10px] rounded-full">
            {anggotaBiasaList.length}
          </span>
        </button>
      </div>

      {/* Search, Filter Batch & Download Action Row */}
      <div className="glass-panel p-4 rounded-2xl border border-white/10 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center w-full md:w-auto flex-1">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder={`Cari nama, NIM, atau jabatan ${activeSubTab === 'pengurus' ? 'pengurus' : 'anggota'}...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d1325]/50 border border-white/10 rounded-xl pl-9 pr-4 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>

          {/* Angkatan Filter Dropdown */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-400 whitespace-nowrap">Angkatan:</span>
            <select
              value={angkatanFilter}
              onChange={(e) => setAngkatanFilter(e.target.value)}
              className="px-3 py-2 bg-[#0d1325]/50 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="all" className="bg-[#0e1320] text-white">Semua Angkatan</option>
              {availableAngkatans.map(year => (
                <option key={year} value={year} className="bg-[#0e1320] text-white">Angkatan {year}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Download Button */}
        <button
          onClick={handleDownloadRoster}
          className="w-full md:w-auto px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-indigo-600/15 cursor-pointer active:scale-95"
        >
          <Download size={13} />
          <span>Unduh Data ({activeSubTab === 'pengurus' ? 'Pengurus' : 'Anggota Biasa'})</span>
        </button>
      </div>

      {activeSubTab === 'pengurus' ? (
        /* visual structural chart layout (BPH first, then columns for divisions) */
        <div className="space-y-8 animate-fade-in">
          {/* Tier 1: Badan Pengurus Harian */}
          <div id="hierarchy-bph" className="glass-panel rounded-2xl p-6 shadow-lg">
            <div className="flex items-center gap-2 mb-6 border-b border-white/10 pb-3">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md text-[10px] font-bold uppercase tracking-wider">Level 1</span>
              <h3 className="font-display font-bold text-white text-base">Badan Pengurus Harian (BPH)</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 justify-center">
              {bphList.map(user => (
                <div 
                  key={user.id} 
                  onClick={() => handleOpenEdit(user)}
                  className={`p-5 rounded-2xl border text-center transition-all duration-300 relative group backdrop-blur-md ${
                    isUserPengurus ? 'cursor-pointer hover:border-blue-500/50 hover:bg-white/8' : 'cursor-default'
                  } ${
                    user.division.includes('Ketua Umum') 
                      ? 'bg-gradient-to-br from-blue-500/10 to-indigo-500/5 border-blue-500/25 shadow-blue-500/5 md:col-span-2 md:row-span-1' 
                      : 'bg-white/3 border-white/5'
                  }`}
                >
                  {isUserPengurus && (
                    <span className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                      <Edit2 size={12} />
                    </span>
                  )}
                  
                  <img 
                    src={user.avatar} 
                    alt={user.name} 
                    className="w-16 h-16 rounded-full mx-auto object-cover border-2 border-white/20 shadow-md mb-4"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <h4 className="font-semibold text-white text-sm sm:text-base">{user.name}</h4>
                    <span className={`px-1.5 py-0.2 rounded text-[8px] font-bold ${
                      user.status === 'Aktif' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : user.status === 'Cuti'
                        ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                    }`}>
                      {user.status || 'Aktif'}
                    </span>
                  </div>
                  <p className="text-xs text-blue-400 font-medium mt-0.5">{user.division}</p>
                  
                  {/* Academic Metadata */}
                  <div className="mt-2 text-[11px] text-slate-400 flex flex-wrap justify-center gap-x-2 gap-y-0.5 font-mono">
                    <span>NIM: <strong className="text-slate-200">{user.nim || '-'}</strong></span>
                    <span className="text-slate-600">•</span>
                    <span>Angkatan: <strong className="text-slate-200">{user.angkatan || '-'}</strong></span>
                  </div>
                  {user.studyProgram && (
                    <p className="text-[10px] text-slate-400 font-medium mt-0.5">{user.studyProgram}</p>
                  )}
                  
                  <div className="mt-3 pt-3 border-t border-white/5 flex justify-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1" title={user.email}><Mail size={12} /> {user.email.split('@')[0]}</span>
                    {user.phone && <span className="flex items-center gap-1"><Phone size={12} /> {user.phone}</span>}
                  </div>
                  
                  {user.bio && (
                    <p className="text-[11px] text-slate-400 mt-2.5 line-clamp-2 italic px-2">"{user.bio}"</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Tier 2: Divisi Organisasi */}
          <div id="hierarchy-divisions" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Divisi 1: Litbang */}
            <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col">
              <div className="flex flex-col gap-1 mb-4 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md text-[9px] font-bold uppercase tracking-wider">Level 2</span>
                  <h3 className="font-display font-bold text-white text-sm">Divisi Penelitian & Pengembangan</h3>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed italic">
                  "Bertanggung jawab dalam penelitian dan pengembangan ilmu ke PLB-an Himpunan Mahasiswa Program Studi Pendidikan Luar biasa."
                </p>
              </div>
              
              <div className="space-y-3 flex-1">
                {litbangList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-6">Belum ada anggota</p>
                ) : (
                  litbangList.map(user => (
                    <div 
                      key={user.id} 
                      onClick={() => handleOpenEdit(user)}
                      className={`p-3 rounded-xl border border-white/5 bg-white/3 flex items-center gap-3 transition-all ${
                        isUserPengurus ? 'cursor-pointer hover:border-emerald-500/40 hover:bg-white/8 group' : 'cursor-default'
                      }`}
                    >
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-semibold text-white truncate">{user.name}</h4>
                        </div>
                        <p className="text-[10px] text-emerald-400 font-medium truncate">{user.division}</p>
                        <div className="flex flex-col mt-0.5 text-[9px] text-slate-400 font-mono">
                          <span>NIM: {user.nim || '-'} • Angkatan {user.angkatan || '2023'}</span>
                        </div>
                      </div>
                      {isUserPengurus && (
                        <span className="opacity-0 group-hover:opacity-100 p-1 bg-emerald-500/10 text-emerald-400 rounded-md transition-opacity">
                          <Edit2 size={10} />
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Divisi 2: Public Relation */}
            <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col">
              <div className="flex flex-col gap-1 mb-4 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded-md text-[9px] font-bold uppercase tracking-wider">Level 2</span>
                  <h3 className="font-display font-bold text-white text-sm">Divisi Public Relation</h3>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed italic">
                  "Bertanggung jawab dalam menjalin dan membangun relasi, serta sebagai penghubung antara Himpalubi dengan berbagai elemen internal dan eksternal kampus."
                </p>
              </div>
              
              <div className="space-y-3 flex-1">
                {prList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-6">Belum ada anggota</p>
                ) : (
                  prList.map(user => (
                    <div 
                      key={user.id} 
                      onClick={() => handleOpenEdit(user)}
                      className={`p-3 rounded-xl border border-white/5 bg-white/3 flex items-center gap-3 transition-all ${
                        isUserPengurus ? 'cursor-pointer hover:border-blue-500/40 hover:bg-white/8 group' : 'cursor-default'
                      }`}
                    >
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-semibold text-white truncate">{user.name}</h4>
                        </div>
                        <p className="text-[10px] text-blue-400 font-medium truncate">{user.division}</p>
                        <div className="flex flex-col mt-0.5 text-[9px] text-slate-400 font-mono">
                          <span>NIM: {user.nim || '-'} • Angkatan {user.angkatan || '2023'}</span>
                        </div>
                      </div>
                      {isUserPengurus && (
                        <span className="opacity-0 group-hover:opacity-100 p-1 bg-blue-500/10 text-blue-400 rounded-md transition-opacity">
                          <Edit2 size={10} />
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Divisi 3: Pengabdian Masyarakat */}
            <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col">
              <div className="flex flex-col gap-1 mb-4 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-rose-500/10 text-rose-400 rounded-md text-[9px] font-bold uppercase tracking-wider">Level 2</span>
                  <h3 className="font-display font-bold text-white text-sm">Divisi Pengabdian Masyarakat</h3>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed italic">
                  "Bertanggung jawab dalam melakukan implementasi inklusivitas terhadap masyarakat."
                </p>
              </div>
              
              <div className="space-y-3 flex-1">
                {pengmasList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-6">Belum ada anggota</p>
                ) : (
                  pengmasList.map(user => (
                    <div 
                      key={user.id} 
                      onClick={() => handleOpenEdit(user)}
                      className={`p-3 rounded-xl border border-white/5 bg-white/3 flex items-center gap-3 transition-all ${
                        isUserPengurus ? 'cursor-pointer hover:border-rose-500/40 hover:bg-white/8 group' : 'cursor-default'
                      }`}
                    >
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-semibold text-white truncate">{user.name}</h4>
                        </div>
                        <p className="text-[10px] text-rose-400 font-medium truncate">{user.division}</p>
                        <div className="flex flex-col mt-0.5 text-[9px] text-slate-400 font-mono">
                          <span>NIM: {user.nim || '-'} • Angkatan {user.angkatan || '2023'}</span>
                        </div>
                      </div>
                      {isUserPengurus && (
                        <span className="opacity-0 group-hover:opacity-100 p-1 bg-rose-500/10 text-rose-400 rounded-md transition-opacity">
                          <Edit2 size={10} />
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Divisi 4: PSDA */}
            <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col">
              <div className="flex flex-col gap-1 mb-4 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500/10 text-amber-400 rounded-md text-[9px] font-bold uppercase tracking-wider">Level 2</span>
                  <h3 className="font-display font-bold text-white text-sm">Divisi PSDA</h3>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed italic">
                  "Bertanggung jawab dalam menjaga serta meningkatkan kualitas anggota aktif Himpalubi."
                </p>
              </div>
              
              <div className="space-y-3 flex-1">
                {psdaList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-6">Belum ada anggota</p>
                ) : (
                  psdaList.map(user => (
                    <div 
                      key={user.id} 
                      onClick={() => handleOpenEdit(user)}
                      className={`p-3 rounded-xl border border-white/5 bg-white/3 flex items-center gap-3 transition-all ${
                        isUserPengurus ? 'cursor-pointer hover:border-amber-500/40 hover:bg-white/8 group' : 'cursor-default'
                      }`}
                    >
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-semibold text-white truncate">{user.name}</h4>
                        </div>
                        <p className="text-[10px] text-amber-400 font-medium truncate">{user.division}</p>
                        <div className="flex flex-col mt-0.5 text-[9px] text-slate-400 font-mono">
                          <span>NIM: {user.nim || '-'} • Angkatan {user.angkatan || '2023'}</span>
                        </div>
                      </div>
                      {isUserPengurus && (
                        <span className="opacity-0 group-hover:opacity-100 p-1 bg-amber-500/10 text-amber-400 rounded-md transition-opacity">
                          <Edit2 size={10} />
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Divisi 5: IT */}
            <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col">
              <div className="flex flex-col gap-1 mb-4 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-md text-[9px] font-bold uppercase tracking-wider">Level 2</span>
                  <h3 className="font-display font-bold text-white text-sm">Divisi Teknologi Informasi</h3>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed italic">
                  "Bertanggung jawab dalam merencanakan dan mengkoordinasikan pengembangan informasi dan publikasi berbasis digital yang ada di Himpalubi."
                </p>
              </div>
              
              <div className="space-y-3 flex-1">
                {itList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-6">Belum ada anggota</p>
                ) : (
                  itList.map(user => (
                    <div 
                      key={user.id} 
                      onClick={() => handleOpenEdit(user)}
                      className={`p-3 rounded-xl border border-white/5 bg-white/3 flex items-center gap-3 transition-all ${
                        isUserPengurus ? 'cursor-pointer hover:border-indigo-500/40 hover:bg-white/8 group' : 'cursor-default'
                      }`}
                    >
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-semibold text-white truncate">{user.name}</h4>
                        </div>
                        <p className="text-[10px] text-indigo-400 font-medium truncate">{user.division}</p>
                        <div className="flex flex-col mt-0.5 text-[9px] text-slate-400 font-mono">
                          <span>NIM: {user.nim || '-'} • Angkatan {user.angkatan || '2024'}</span>
                        </div>
                      </div>
                      {isUserPengurus && (
                        <span className="opacity-0 group-hover:opacity-100 p-1 bg-indigo-500/10 text-indigo-400 rounded-md transition-opacity">
                          <Edit2 size={10} />
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Divisi 6: Sarpras */}
            <div className="glass-panel rounded-2xl p-5 shadow-lg flex flex-col">
              <div className="flex flex-col gap-1 mb-4 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-md text-[9px] font-bold uppercase tracking-wider">Level 2</span>
                  <h3 className="font-display font-bold text-white text-sm">Divisi Sarana & Prasarana</h3>
                </div>
                <p className="text-[10px] text-slate-400 leading-relaxed italic">
                  "Bertanggung jawab dalam mendata, menjaga, dan merawat fasilitas serta inventaris yang dimiliki Himpalubi."
                </p>
              </div>
              
              <div className="space-y-3 flex-1">
                {sarprasList.length === 0 ? (
                  <p className="text-xs text-slate-500 italic text-center py-6">Belum ada anggota</p>
                ) : (
                  sarprasList.map(user => (
                    <div 
                      key={user.id} 
                      onClick={() => handleOpenEdit(user)}
                      className={`p-3 rounded-xl border border-white/5 bg-white/3 flex items-center gap-3 transition-all ${
                        isUserPengurus ? 'cursor-pointer hover:border-purple-500/40 hover:bg-white/8 group' : 'cursor-default'
                      }`}
                    >
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-10 h-10 rounded-full object-cover border border-white/10"
                        referrerPolicy="no-referrer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <h4 className="text-xs sm:text-sm font-semibold text-white truncate">{user.name}</h4>
                        </div>
                        <p className="text-[10px] text-purple-400 font-medium truncate">{user.division}</p>
                        <div className="flex flex-col mt-0.5 text-[9px] text-slate-400 font-mono">
                          <span>NIM: {user.nim || '-'} • Angkatan {user.angkatan || '2024'}</span>
                        </div>
                      </div>
                      {isUserPengurus && (
                        <span className="opacity-0 group-hover:opacity-100 p-1 bg-purple-500/10 text-purple-400 rounded-md transition-opacity">
                          <Edit2 size={10} />
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* Anggota Biasa (Non-Pengurus) Tab View */
        <div className="space-y-6 animate-fade-in">
          {/* Informational Card */}
          <div className="p-4 bg-indigo-500/5 border border-indigo-500/15 rounded-2xl flex items-start gap-3">
            <Info size={16} className="text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-indigo-300">Daftar Anggota Biasa HIMPALUBI</h4>
              <p className="text-xs text-slate-400 leading-relaxed mt-0.5">
                Bagian ini memuat daftar mahasiswa Pendidikan Luar Biasa (PLB) yang menjadi anggota aktif biasa tetapi tidak menjabat sebagai Pengurus BPH atau Divisi Organisasi. 
                Pengurus dapat menaikkan status jabatan mereka melalui menu sunting profil.
              </p>
            </div>
          </div>

          {/* Members Grid */}
          {filteredAnggotaBiasa.length === 0 ? (
            <div className="p-12 text-center bg-white/3 border border-white/5 rounded-2xl">
              <Users size={32} className="mx-auto text-slate-500 mb-3" />
              <p className="text-xs sm:text-sm text-slate-400">Tidak ada data anggota biasa yang cocok</p>
              {searchQuery && (
                <button 
                  onClick={() => setSearchQuery('')}
                  className="mt-2 text-xs text-indigo-400 hover:underline"
                >
                  Tampilkan semua anggota biasa
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAnggotaBiasa.map(user => (
                <div 
                  key={user.id}
                  onClick={() => handleOpenEdit(user)}
                  className={`p-5 rounded-2xl border border-white/5 bg-white/3 transition-all relative group backdrop-blur-md flex flex-col justify-between ${
                    isUserPengurus ? 'cursor-pointer hover:border-indigo-500/40 hover:bg-white/8' : 'cursor-default'
                  }`}
                >
                  {isUserPengurus && (
                    <span className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 bg-indigo-500/10 text-indigo-400 rounded-lg">
                      <Edit2 size={12} />
                    </span>
                  )}

                  <div>
                    <div className="flex items-center gap-4 mb-4">
                      <img 
                        src={user.avatar} 
                        alt={user.name} 
                        className="w-14 h-14 rounded-full object-cover border border-white/10 shadow-sm"
                        referrerPolicy="no-referrer"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <h4 className="font-semibold text-white text-sm sm:text-base truncate leading-tight">{user.name}</h4>
                          <span className="px-1.5 py-0.2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded text-[8px] font-bold shrink-0">
                            {user.status || 'Aktif'}
                          </span>
                        </div>
                        <p className="text-xs text-indigo-400 font-medium mt-0.5">Anggota Biasa (Tanpa Divisi)</p>
                      </div>
                    </div>

                    <div className="space-y-1.5 border-t border-white/5 pt-3 text-xs text-slate-400">
                      <div className="flex justify-between font-mono text-[11px]">
                        <span>NIM:</span>
                        <strong className="text-slate-200">{user.nim || '-'}</strong>
                      </div>
                      <div className="flex justify-between font-mono text-[11px]">
                        <span>Angkatan:</span>
                        <strong className="text-slate-200">{user.angkatan || '-'}</strong>
                      </div>
                      <div className="flex justify-between text-[11px]">
                        <span>Prodi:</span>
                        <strong className="text-slate-200 truncate max-w-[150px]">{user.studyProgram || 'PLB'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 pt-3 border-t border-white/5">
                    {user.bio && (
                      <p className="text-[11px] text-slate-400 italic mb-2 line-clamp-2">"{user.bio}"</p>
                    )}
                    <div className="flex justify-start gap-4 text-xs text-slate-400">
                      <span className="flex items-center gap-1" title={user.email}><Mail size={12} /> {user.email.split('@')[0]}</span>
                      {user.phone && <span className="flex items-center gap-1"><Phone size={12} /> {user.phone}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Edit or Add Dialog Box Modal */}
      {(isEditing || isAdding) && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl animate-scale-up my-8 border border-white/10">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/3">
              <h3 className="font-display font-bold text-white flex items-center gap-2">
                <Shield size={18} className="text-blue-400" />
                {isAdding ? 'Tambah Anggota Baru' : 'Perbarui Detail Profil'}
              </h3>
              <button 
                onClick={() => { setIsEditing(false); setIsAdding(false); setSelectedUser(null); }}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nama Lengkap</label>
                  <input 
                    type="text" 
                    required
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Email</label>
                  <input 
                    type="email" 
                    required
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Peran Akses (Role)</label>
                  <select 
                    value={formData.role}
                    onChange={e => setFormData({ ...formData, role: e.target.value as UserRole })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="anggota" className="bg-[#0e1320] text-white">Anggota (Melihat saja)</option>
                    <option value="pengurus" className="bg-[#0e1320] text-white">Pengurus (Bisa Mengedit)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Divisi / Jabatan</label>
                  <select 
                    value={formData.division}
                    onChange={e => setFormData({ ...formData, division: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Badan Pengurus Harian (Ketua Umum)" className="bg-[#0e1320] text-white">BPH - Ketua Umum</option>
                    <option value="Badan Pengurus Harian (Wakil Ketua Umum)" className="bg-[#0e1320] text-white">BPH - Wakil Ketua Umum</option>
                    <option value="Badan Pengurus Harian (Sekretaris)" className="bg-[#0e1320] text-white">BPH - Sekretaris</option>
                    <option value="Badan Pengurus Harian (Bendahara)" className="bg-[#0e1320] text-white">BPH - Bendahara</option>
                    <option value="Divisi Penelitian dan Pengembangan (Litbang)" className="bg-[#0e1320] text-white">Divisi Penelitian & Pengembangan (Litbang)</option>
                    <option value="Divisi Public Relation" className="bg-[#0e1320] text-white">Divisi Public Relation</option>
                    <option value="Divisi Pengabdian Masyarakat" className="bg-[#0e1320] text-white">Divisi Pengabdian Masyarakat</option>
                    <option value="Divisi Pengembangan Sumber Daya Anggota (PSDA)" className="bg-[#0e1320] text-white">Divisi Pengembangan Sumber Daya Anggota (PSDA)</option>
                    <option value="Divisi Information and Technology (Teknologi Informasi)" className="bg-[#0e1320] text-white">Divisi Teknologi Informasi (IT)</option>
                    <option value="Divisi Sarana dan Prasarana" className="bg-[#0e1320] text-white">Divisi Sarana & Prasarana</option>
                    <option value="Anggota Biasa (Tanpa Divisi)" className="bg-[#0e1320] text-white">Anggota Biasa (Tanpa Divisi)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">NIM (Nomor Induk Mahasiswa)</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: 220511001"
                    value={formData.nim}
                    onChange={e => setFormData({ ...formData, nim: e.target.value })}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Angkatan</label>
                  <select 
                    value={formData.angkatan}
                    onChange={e => setFormData({ ...formData, angkatan: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="2022" className="bg-[#0e1320] text-white">2022</option>
                    <option value="2023" className="bg-[#0e1320] text-white">2023</option>
                    <option value="2024" className="bg-[#0e1320] text-white">2024</option>
                    <option value="2025" className="bg-[#0e1320] text-white">2025</option>
                    <option value="2026" className="bg-[#0e1320] text-white">2026</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Program Studi</label>
                  <input 
                    type="text" 
                    required
                    placeholder="Contoh: Teknik Informatika"
                    value={formData.studyProgram}
                    onChange={e => setFormData({ ...formData, studyProgram: e.target.value })}
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Status Keaktifan</label>
                  <select 
                    value={formData.status}
                    onChange={e => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full glass-input rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  >
                    <option value="Aktif" className="bg-[#0e1320] text-white">Aktif</option>
                    <option value="Cuti" className="bg-[#0e1320] text-white">Cuti</option>
                    <option value="Alumni" className="bg-[#0e1320] text-white">Alumni</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400">Profil Foto (Avatar)</label>
                <div className="flex items-center gap-4 p-3 bg-white/3 border border-white/5 rounded-xl">
                  <img 
                    src={formData.avatar || "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=120"} 
                    alt="Preview" 
                    className="w-14 h-14 rounded-full object-cover border border-white/10"
                    referrerPolicy="no-referrer"
                  />
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors inline-block">
                        Unggah dari Galeri
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                alert("Ukuran foto terlalu besar. Maksimal 2MB agar penyimpanan lancar.");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormData({ ...formData, avatar: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }} 
                          className="hidden" 
                        />
                      </label>
                      <span className="text-[10px] text-slate-400">Maks. 2MB</span>
                    </div>
                    <p className="text-[10px] text-slate-500">Format: JPG, PNG, GIF</p>
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-500 block">Atau gunakan URL Link langsung:</span>
                  <input 
                    type="text" 
                    value={formData.avatar}
                    onChange={e => setFormData({ ...formData, avatar: e.target.value })}
                    placeholder="https://images.unsplash.com/..."
                    className="w-full glass-input rounded-xl px-3.5 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Nomor Telepon (WhatsApp)</label>
                  <input 
                    type="text" 
                    value={formData.phone}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0812..."
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 mb-1">Bio Ringkas</label>
                  <input 
                    type="text" 
                    value={formData.bio}
                    onChange={e => setFormData({ ...formData, bio: e.target.value })}
                    placeholder="Quotes atau keahlian singkat..."
                    className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-white/10 flex flex-col-reverse sm:flex-row justify-between items-center gap-3">
                {isEditing && selectedUser && selectedUser.id !== currentUser.id ? (
                  <button
                    type="button"
                    onClick={() => handleDelete(selectedUser.id)}
                    className="w-full sm:w-auto px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Trash2 size={16} />
                    Hapus Anggota
                  </button>
                ) : <div />}

                <div className="flex gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => { setIsEditing(false); setIsAdding(false); setSelectedUser(null); }}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="flex-1 sm:flex-initial px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-lg shadow-blue-500/20"
                  >
                    <Save size={16} />
                    Simpan Perubahan
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reshuffle & Atur Periode Modal */}
      {isReshuffleModalOpen && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden shadow-2xl animate-scale-up border border-white/10">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/3">
              <h3 className="font-display font-bold text-white flex items-center gap-2">
                <Award size={18} className="text-amber-400" />
                Resavel & Atur Periode
              </h3>
              <button 
                onClick={() => setIsReshuffleModalOpen(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6 space-y-5">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-white">1. Atur Periode Kepengurusan Baru</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Ubah label tahun kepengurusan aktif yang ditampilkan di kop struktur dan halaman utama.
                </p>
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Contoh: 2026/2027"
                    value={reshufflePeriodInput}
                    onChange={e => setReshufflePeriodInput(e.target.value)}
                    className="flex-1 glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                  <button
                    onClick={() => handleSavePeriod(reshufflePeriodInput)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Terapkan
                  </button>
                </div>
              </div>

              <hr className="border-white/10" />

              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-red-400 flex items-center gap-1.5">
                  <AlertTriangle size={15} className="text-red-400" />
                  2. Reset Struktur (Resavel Tahunan)
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Menandakan pergantian kepengurusan tahunan baru. Menyetel seluruh status pengurus (BPH & Divisi) saat ini kembali menjadi <strong>Anggota Biasa</strong>, sehingga Anda dapat mendata ulang jajaran pimpinan pengurus yang baru untuk periode berikutnya.
                </p>
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-[11px] text-red-200">
                  ⚠️ Tindakan ini tidak menghapus profil pengguna, melainkan hanya mengosongkan status jabatan & divisi agar siap disusun ulang.
                </div>
                <button
                  onClick={handleResetPositions}
                  className="w-full py-2.5 bg-red-500 hover:bg-red-600 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Mulai Reset & Reshuffle Periode Baru
                </button>
              </div>

              <div className="pt-2 border-t border-white/5 flex justify-end">
                <button
                  onClick={() => setIsReshuffleModalOpen(false)}
                  className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
