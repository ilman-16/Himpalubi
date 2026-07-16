import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Users, 
  Calendar, 
  Coins, 
  Clock, 
  Plus, 
  Trash2, 
  Edit, 
  Check, 
  X, 
  UserPlus, 
  PlusCircle,
  TrendingUp,
  Award,
  BookOpen,
  ArrowRight,
  Lock,
  Unlock,
  Layers,
  AlertCircle,
  FileText,
  ClipboardList,
  FolderOpen,
  Wallet,
  Paperclip,
  CheckCircle
} from 'lucide-react';
import { 
  ProkerItem, 
  UserProfile, 
  ProkerCommittee, 
  ProkerRundown,
  ProkerAttendanceSession,
  ProkerMeetingMinute,
  ProkerDocument,
  ProkerBudgetDetail
} from '../types';
import { localDb } from '../lib/firebase';

interface ProkerHubProps {
  currentUser: UserProfile;
}

export default function ProkerHub({ currentUser }: ProkerHubProps) {
  const [prokers, setProkers] = useState<ProkerItem[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedProkerId, setSelectedProkerId] = useState<string | null>(null);
  
  // Create / Edit Proker modal state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newProkerName, setNewProkerName] = useState('');
  const [newProkerDesc, setNewProkerDesc] = useState('');
  const [newProkerDivision, setNewProkerDivision] = useState('');
  const [newProkerBudget, setNewProkerBudget] = useState(0);
  const [newProkerDate, setNewProkerDate] = useState('');

  // Add Committee form state
  const [newCommRole, setNewCommRole] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [customCommName, setCustomCommName] = useState('');

  // Add Rundown form state
  const [newRunTime, setNewRunTime] = useState('');
  const [newRunAgenda, setNewRunAgenda] = useState('');
  const [newRunPic, setNewRunPic] = useState('');

  // NEW FILE WORKSPACE FORM STATES
  // 1. Attendance Sessions form state
  const [newSessionTitle, setNewSessionTitle] = useState('');
  const [newSessionDate, setNewSessionDate] = useState('');
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);

  // 2. Meeting Minutes form state
  const [newMinuteTitle, setNewMinuteTitle] = useState('');
  const [newMinuteDate, setNewMinuteDate] = useState('');
  const [newMinuteContent, setNewMinuteContent] = useState('');
  const [newMinuteWriter, setNewMinuteWriter] = useState(currentUser?.name || '');

  // 3. Documents form state
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocType, setNewDocType] = useState<'Surat Masuk' | 'Surat Keluar' | 'Proposal' | 'LPJ' | 'Lainnya'>('Surat Masuk');
  const [newDocUrl, setNewDocUrl] = useState('');

  // 4. Budget Detail form state
  const [newBudgetDesc, setNewBudgetDesc] = useState('');
  const [newBudgetType, setNewBudgetType] = useState<'pemasukan' | 'pengeluaran'>('pengeluaran');
  const [newBudgetAmount, setNewBudgetAmount] = useState<number>(0);
  const [newBudgetStatus, setNewBudgetStatus] = useState<'Lunas' | 'Direncanakan' | 'Pending'>('Direncanakan');
  const [newBudgetExpDate, setNewBudgetExpDate] = useState('');

  // Active sub-tab inside a proker's detail view (now supporting the new rich workspace subtabs)
  const [activeSubTab, setActiveSubTab] = useState<
    'committee' | 'rundown' | 'details' | 'proker-absen' | 'proker-catatan' | 'proker-dokumen' | 'proker-anggaran'
  >('committee');

  const isPengurus = currentUser.role === 'pengurus';

  useEffect(() => {
    setProkers(localDb.getProkers());
    setUsers(localDb.getUsers());
  }, []);

  // Sync to database
  const saveAll = (updated: ProkerItem[]) => {
    setProkers(updated);
    localDb.saveProkers(updated);
  };

  const handleCreateProker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProkerName.trim()) return;

    const newProker: ProkerItem = {
      id: `pro-${Date.now()}`,
      name: newProkerName,
      description: newProkerDesc,
      division: newProkerDivision || currentUser.division || 'Badan Pengurus Harian',
      budget: Number(newProkerBudget) || 0,
      status: 'Belum Mulai',
      meetingsCount: 0,
      committee: [],
      rundown: [],
      createdAt: new Date().toISOString(),
      date: newProkerDate || undefined
    };

    const updated = [newProker, ...prokers];
    saveAll(updated);
    
    // Reset form & close
    setNewProkerName('');
    setNewProkerDesc('');
    setNewProkerDivision('');
    setNewProkerBudget(0);
    setNewProkerDate('');
    setIsCreateModalOpen(false);
    setSelectedProkerId(newProker.id);
  };

  const handleDeleteProker = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm('Apakah Anda yakin ingin menghapus Program Kerja ini?')) return;
    const updated = prokers.filter(p => p.id !== id);
    saveAll(updated);
    if (selectedProkerId === id) {
      setSelectedProkerId(updated.length > 0 ? updated[0].id : null);
    }
  };

  const updateProkerStatus = (id: string, status: 'Belum Mulai' | 'Berjalan' | 'Selesai') => {
    const updated = prokers.map(p => p.id === id ? { ...p, status } : p);
    saveAll(updated);
  };

  const adjustMeetingsCount = (id: string, amount: number) => {
    const updated = prokers.map(p => {
      if (p.id === id) {
        const nextCount = Math.max(0, p.meetingsCount + amount);
        return { ...p, meetingsCount: nextCount };
      }
      return p;
    });
    saveAll(updated);
  };

  // COMMITTEE OPERATIONS
  const handleAddCommittee = (e: React.FormEvent, prokerId: string) => {
    e.preventDefault();
    if (!newCommRole.trim()) return;

    let memberName = customCommName.trim();
    let assignedUserId = undefined;

    if (selectedUserId) {
      const found = users.find(u => u.id === selectedUserId);
      if (found) {
        memberName = found.name;
        assignedUserId = found.id;
      }
    }

    if (!memberName) return;

    const updated = prokers.map(p => {
      if (p.id === prokerId) {
        const newComm: ProkerCommittee = {
          role: newCommRole,
          userName: memberName,
          userId: assignedUserId
        };
        return {
          ...p,
          committee: [...p.committee, newComm]
        };
      }
      return p;
    });

    saveAll(updated);
    setNewCommRole('');
    setSelectedUserId('');
    setCustomCommName('');
  };

  const handleRemoveCommittee = (prokerId: string, index: number) => {
    const updated = prokers.map(p => {
      if (p.id === prokerId) {
        const nextComm = [...p.committee];
        nextComm.splice(index, 1);
        return { ...p, committee: nextComm };
      }
      return p;
    });
    saveAll(updated);
  };

  // RUNDOWN OPERATIONS
  const handleAddRundown = (e: React.FormEvent, prokerId: string) => {
    e.preventDefault();
    if (!newRunTime.trim() || !newRunAgenda.trim()) return;

    const updated = prokers.map(p => {
      if (p.id === prokerId) {
        const newAgenda: ProkerRundown = {
          time: newRunTime,
          agenda: newRunAgenda,
          pic: newRunPic.trim() || 'Panitia Pelaksana'
        };
        return {
          ...p,
          rundown: [...p.rundown, newAgenda]
        };
      }
      return p;
    });

    saveAll(updated);
    setNewRunTime('');
    setNewRunAgenda('');
    setNewRunPic('');
  };

  const handleRemoveRundown = (prokerId: string, index: number) => {
    const updated = prokers.map(p => {
      if (p.id === prokerId) {
        const nextRun = [...p.rundown];
        nextRun.splice(index, 1);
        return { ...p, rundown: nextRun };
      }
      return p;
    });
    saveAll(updated);
  };

  // ==========================================
  // NEW FILE WORKSPACE OPERATIONS FOR PROKERS
  // ==========================================

  // 1. Attendance Operations
  const handleCreateAttendanceSession = (e: React.FormEvent, prokerId: string) => {
    e.preventDefault();
    if (!newSessionTitle.trim()) return;

    const currentCommittee = selectedProker?.committee || [];
    const initialAttendees = currentCommittee.map(comm => ({
      userId: comm.userId,
      userName: comm.userName,
      status: 'hadir' as const,
      notes: ''
    }));

    if (initialAttendees.length === 0) {
      users.slice(0, 15).forEach(u => {
        initialAttendees.push({
          userId: u.id,
          userName: u.name,
          status: 'hadir',
          notes: ''
        });
      });
    }

    const newSession: ProkerAttendanceSession = {
      id: `session-${Date.now()}`,
      title: newSessionTitle,
      date: newSessionDate || new Date().toISOString().split('T')[0],
      attendees: initialAttendees
    };

    const updated = prokers.map(p => {
      if (p.id === prokerId) {
        const sessions = p.attendanceSessions || [];
        return {
          ...p,
          attendanceSessions: [...sessions, newSession]
        };
      }
      return p;
    });

    saveAll(updated);
    setNewSessionTitle('');
    setNewSessionDate('');
    setActiveSessionId(newSession.id);
  };

  const handleUpdateAttendeeStatus = (prokerId: string, sessionId: string, userName: string, status: 'hadir' | 'sakit' | 'izin' | 'alfa') => {
    const updated = prokers.map(p => {
      if (p.id === prokerId) {
        const sessions = (p.attendanceSessions || []).map(s => {
          if (s.id === sessionId) {
            const attendees = s.attendees.map(a => 
              a.userName === userName ? { ...a, status } : a
            );
            return { ...s, attendees };
          }
          return s;
        });
        return { ...p, attendanceSessions: sessions };
      }
      return p;
    });
    saveAll(updated);
  };

  const handleUpdateAttendeeNotes = (prokerId: string, sessionId: string, userName: string, notes: string) => {
    const updated = prokers.map(p => {
      if (p.id === prokerId) {
        const sessions = (p.attendanceSessions || []).map(s => {
          if (s.id === sessionId) {
            const attendees = s.attendees.map(a => 
              a.userName === userName ? { ...a, notes } : a
            );
            return { ...s, attendees };
          }
          return s;
        });
        return { ...p, attendanceSessions: sessions };
      }
      return p;
    });
    saveAll(updated);
  };

  const handleDeleteAttendanceSession = (prokerId: string, sessionId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus sesi absensi ini?')) return;
    const updated = prokers.map(p => {
      if (p.id === prokerId) {
        const sessions = (p.attendanceSessions || []).filter(s => s.id !== sessionId);
        return { ...p, attendanceSessions: sessions };
      }
      return p;
    });
    saveAll(updated);
    if (activeSessionId === sessionId) {
      setActiveSessionId(null);
    }
  };

  // 2. Meeting Minutes (Catatan Rapat)
  const handleAddMeetingMinute = (e: React.FormEvent, prokerId: string) => {
    e.preventDefault();
    if (!newMinuteTitle.trim() || !newMinuteContent.trim()) return;

    const newMinute: ProkerMeetingMinute = {
      id: `minute-${Date.now()}`,
      title: newMinuteTitle,
      date: newMinuteDate || new Date().toISOString().split('T')[0],
      content: newMinuteContent,
      writerName: newMinuteWriter || currentUser.name
    };

    const updated = prokers.map(p => {
      if (p.id === prokerId) {
        const minutes = p.meetingMinutes || [];
        return {
          ...p,
          meetingMinutes: [...minutes, newMinute]
        };
      }
      return p;
    });

    saveAll(updated);
    setNewMinuteTitle('');
    setNewMinuteContent('');
    setNewMinuteDate('');
  };

  const handleDeleteMeetingMinute = (prokerId: string, minuteId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan rapat ini?')) return;
    const updated = prokers.map(p => {
      if (p.id === prokerId) {
        const minutes = (p.meetingMinutes || []).filter(m => m.id !== minuteId);
        return { ...p, meetingMinutes: minutes };
      }
      return p;
    });
    saveAll(updated);
  };

  // 3. Document Operations (Surat Menyurat / Berkas)
  const handleAddDocument = (e: React.FormEvent, prokerId: string) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !newDocUrl.trim()) return;

    const newDoc: ProkerDocument = {
      id: `doc-${Date.now()}`,
      title: newDocTitle,
      type: newDocType,
      fileUrlOrLink: newDocUrl,
      uploadedAt: new Date().toISOString()
    };

    const updated = prokers.map(p => {
      if (p.id === prokerId) {
        const docs = p.documents || [];
        return {
          ...p,
          documents: [...docs, newDoc]
        };
      }
      return p;
    });

    saveAll(updated);
    setNewDocTitle('');
    setNewDocUrl('');
  };

  const handleDeleteDocument = (prokerId: string, docId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus dokumen ini?')) return;
    const updated = prokers.map(p => {
      if (p.id === prokerId) {
        const docs = (p.documents || []).filter(d => d.id !== docId);
        return { ...p, documents: docs };
      }
      return p;
    });
    saveAll(updated);
  };

  // 4. Budget Detail Operations (Rincian Anggaran)
  const handleAddBudgetDetail = (e: React.FormEvent, prokerId: string) => {
    e.preventDefault();
    if (!newBudgetDesc.trim() || newBudgetAmount <= 0) return;

    const newBudget: ProkerBudgetDetail = {
      id: `budget-${Date.now()}`,
      description: newBudgetDesc,
      type: newBudgetType,
      amount: Number(newBudgetAmount),
      date: newBudgetExpDate || new Date().toISOString().split('T')[0],
      status: newBudgetStatus
    };

    const updated = prokers.map(p => {
      if (p.id === prokerId) {
        const budgets = p.budgets || [];
        return {
          ...p,
          budgets: [...budgets, newBudget]
        };
      }
      return p;
    });

    saveAll(updated);
    setNewBudgetDesc('');
    setNewBudgetAmount(0);
    setNewBudgetExpDate('');
  };

  const handleDeleteBudgetDetail = (prokerId: string, budgetId: string) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus rincian anggaran ini?')) return;
    const updated = prokers.map(p => {
      if (p.id === prokerId) {
        const budgets = (p.budgets || []).filter(b => b.id !== budgetId);
        return { ...p, budgets };
      }
      return p;
    });
    saveAll(updated);
  };

  const handleUpdateBudgetStatus = (prokerId: string, budgetId: string, status: 'Lunas' | 'Direncanakan' | 'Pending') => {
    const updated = prokers.map(p => {
      if (p.id === prokerId) {
        const budgets = (p.budgets || []).map(b => 
          b.id === budgetId ? { ...b, status } : b
        );
        return { ...p, budgets };
      }
      return p;
    });
    saveAll(updated);
  };

  const selectedProker = prokers.find(p => p.id === selectedProkerId) || prokers[0] || null;

  // Auto select first proker if none is selected
  useEffect(() => {
    if (prokers.length > 0 && !selectedProkerId) {
      setSelectedProkerId(prokers[0].id);
    }
  }, [prokers]);

  const formatRupiah = (num: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0
    }).format(num);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Selesai':
        return <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold">Selesai</span>;
      case 'Berjalan':
        return <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md text-[10px] font-bold animate-pulse">Berjalan</span>;
      default:
        return <span className="px-2 py-0.5 bg-slate-500/10 text-slate-400 border border-slate-500/20 rounded-md text-[10px] font-bold">Belum Mulai</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <Briefcase className="text-blue-400" size={24} />
            Program Kerja & Kepanitiaan (Proker Hub)
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">Pusat rancangan kegiatan utama, koordinasi rapat panitia, dan susunan susunan acara (rundown)</p>
        </div>

        {isPengurus && (
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/15 cursor-pointer transition-all shrink-0"
          >
            <Plus size={16} />
            Tambah Kegiatan Baru
          </button>
        )}
      </div>

      {prokers.length === 0 ? (
        <div className="glass-panel rounded-2xl p-12 text-center max-w-lg mx-auto space-y-4">
          <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
            <Briefcase size={24} />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Belum Ada Program Kerja</h3>
            <p className="text-xs text-slate-400 mt-1">Daftar kegiatan besar HIMPALUBI yang memerlukan kepanitiaan akan tampil di sini.</p>
          </div>
          {isPengurus && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2 rounded-xl transition-all"
            >
              Buat Program Kerja Pertama
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* LEFT PANEL: Activities list */}
          <div className="lg:col-span-5 space-y-3">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block px-1">Pilih Kegiatan Utama</span>
            
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
              {prokers.map(proker => {
                const isSelected = proker.id === selectedProkerId;
                return (
                  <div
                    key={proker.id}
                    onClick={() => {
                      setSelectedProkerId(proker.id);
                    }}
                    className={`glass-panel p-4 rounded-xl border transition-all cursor-pointer relative overflow-hidden group ${
                      isSelected 
                        ? 'border-blue-500/40 bg-blue-500/5 shadow-md' 
                        : 'border-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 relative z-10">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-white text-sm sm:text-base group-hover:text-blue-400 transition-colors">{proker.name}</h4>
                          {getStatusBadge(proker.status)}
                        </div>
                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{proker.description}</p>
                      </div>

                      {isPengurus && (
                        <button
                          onClick={(e) => handleDeleteProker(proker.id, e)}
                          className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-red-500/10 cursor-pointer shrink-0 transition-all opacity-0 group-hover:opacity-100"
                          title="Hapus Kegiatan"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[10px] text-slate-500 relative z-10 font-mono">
                      <span className="truncate max-w-[150px]">{proker.division}</span>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="flex items-center gap-1">
                          <Users size={12} className="text-slate-400" />
                          {proker.committee.length} Panitia
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} className="text-slate-400" />
                          {proker.meetingsCount}x Rapat
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT PANEL: Selected Activity details, Committee & Rundown */}
          {selectedProker && (
            <div className="lg:col-span-7 glass-panel rounded-2xl border border-white/5 p-6 sm:p-8 space-y-6 shadow-xl">
              
              {/* Header inside right panel */}
              <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b border-white/5">
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded text-[10px] font-semibold">{selectedProker.division}</span>
                    {getStatusBadge(selectedProker.status)}
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-white tracking-tight">{selectedProker.name}</h3>
                </div>

                {/* Status Toggle & Counter for Pengurus */}
                {isPengurus ? (
                  <div className="flex flex-col sm:items-end gap-2">
                    <select
                      value={selectedProker.status}
                      onChange={(e) => updateProkerStatus(selectedProker.id, e.target.value as any)}
                      className="bg-[#0e1320] text-slate-300 text-xs font-semibold px-3 py-1.5 rounded-lg border border-white/10 focus:outline-none focus:border-blue-500 cursor-pointer"
                    >
                      <option value="Belum Mulai">Belum Mulai</option>
                      <option value="Berjalan">Sedang Berjalan</option>
                      <option value="Selesai">Selesai (LPJ)</option>
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 bg-white/3 px-2 py-1 rounded-lg border border-white/5">
                    <Lock size={12} />
                    <span>Mode Lihat (Siswa)</span>
                  </div>
                )}
              </div>

              {/* Grid: Budget, Meetings, and Date tracker */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                
                {/* Budget */}
                <div className="p-4 bg-white/3 border border-white/5 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Anggaran</span>
                    <span className="text-xs sm:text-sm font-bold text-amber-400">{formatRupiah(selectedProker.budget)}</span>
                  </div>
                  <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
                    <Coins size={14} />
                  </span>
                </div>

                {/* Meetings Counter */}
                <div className="p-4 bg-white/3 border border-white/5 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Rapat Koordinasi</span>
                    <span className="text-xs sm:text-sm font-mono font-bold text-white">{selectedProker.meetingsCount} Kali</span>
                  </div>

                  <div className="flex items-center gap-1 bg-[#090d16] p-1 rounded-lg border border-white/5">
                    {isPengurus ? (
                      <>
                        <button
                          onClick={() => adjustMeetingsCount(selectedProker.id, -1)}
                          className="px-1.5 py-0.5 hover:bg-white/5 text-slate-400 hover:text-white rounded text-[10px] cursor-pointer transition-colors"
                          title="Kurangi rapat"
                        >
                          -
                        </button>
                        <span className="w-px h-3 bg-white/10" />
                        <button
                          onClick={() => adjustMeetingsCount(selectedProker.id, 1)}
                          className="px-1.5 py-0.5 hover:bg-white/5 text-blue-400 hover:text-blue-300 rounded text-[10px] font-bold cursor-pointer transition-colors"
                          title="Tambah rapat koordinasi"
                        >
                          +
                        </button>
                      </>
                    ) : (
                      <span className="p-1 text-slate-400">
                        <Calendar size={12} />
                      </span>
                    )}
                  </div>
                </div>

                {/* Tanggal Pelaksanaan */}
                <div className="p-4 bg-white/3 border border-white/5 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">Tanggal Acara</span>
                    <span className="text-xs sm:text-sm font-bold text-blue-400">
                      {selectedProker.date ? new Date(selectedProker.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'}) : 'Belum Diatur'}
                    </span>
                  </div>
                  <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded-lg">
                    <Calendar size={14} />
                  </span>
                </div>

              </div>

              {/* Sub-Tabs: Scrollable Horizontal Bar for Rich File Workspace */}
              <div className="flex border-b border-white/5 pb-px gap-1 sm:gap-2 overflow-x-auto scrollbar-none flex-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
                <button
                  onClick={() => setActiveSubTab('committee')}
                  className={`px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeSubTab === 'committee'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Users size={14} />
                  Panitia ({selectedProker.committee.length})
                </button>
                <button
                  onClick={() => setActiveSubTab('rundown')}
                  className={`px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeSubTab === 'rundown'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Clock size={14} />
                  Rundown ({selectedProker.rundown.length})
                </button>
                <button
                  onClick={() => setActiveSubTab('proker-absen')}
                  className={`px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeSubTab === 'proker-absen'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <ClipboardList size={14} />
                  Absensi ({selectedProker.attendanceSessions?.length || 0})
                </button>
                <button
                  onClick={() => setActiveSubTab('proker-catatan')}
                  className={`px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeSubTab === 'proker-catatan'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <FileText size={14} />
                  Catatan Rapat ({selectedProker.meetingMinutes?.length || 0})
                </button>
                <button
                  onClick={() => setActiveSubTab('proker-dokumen')}
                  className={`px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeSubTab === 'proker-dokumen'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <FolderOpen size={14} />
                  Surat & Berkas ({selectedProker.documents?.length || 0})
                </button>
                <button
                  onClick={() => setActiveSubTab('proker-anggaran')}
                  className={`px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeSubTab === 'proker-anggaran'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <Wallet size={14} />
                  Anggaran Detil ({selectedProker.budgets?.length || 0})
                </button>
                <button
                  onClick={() => setActiveSubTab('details')}
                  className={`px-3 py-2 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-all whitespace-nowrap flex items-center gap-1.5 ${
                    activeSubTab === 'details'
                      ? 'border-blue-500 text-blue-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  <BookOpen size={14} />
                  Deskripsi
                </button>
              </div>

              {/* PANEL CONTENT 1: Committee / Kepanitiaan */}
              {activeSubTab === 'committee' && (
                <div className="space-y-4">
                  {isPengurus && (
                    <form 
                      onSubmit={(e) => handleAddCommittee(e, selectedProker.id)}
                      className="p-4 bg-white/3 border border-white/5 rounded-xl space-y-3"
                    >
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <UserPlus size={14} className="text-blue-400" />
                        Tambah Struktur Panitia
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Select Member */}
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Pilih Anggota</label>
                          <select
                            value={selectedUserId}
                            onChange={(e) => {
                              setSelectedUserId(e.target.value);
                              if (e.target.value) setCustomCommName('');
                            }}
                            className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          >
                            <option value="">-- Hubungkan Profil --</option>
                            {users.map(u => (
                              <option key={u.id} value={u.id}>{u.name} ({u.role})</option>
                            ))}
                          </select>
                        </div>

                        {/* Custom Name (Fallback if not registered) */}
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Atau Ketik Nama Manual</label>
                          <input
                            type="text"
                            placeholder="Nama Panitia"
                            value={customCommName}
                            onChange={(e) => {
                              setCustomCommName(e.target.value);
                              if (e.target.value) setSelectedUserId('');
                            }}
                            className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        {/* Role */}
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Penugasan / Jabatan Panitia</label>
                          <input
                            type="text"
                            placeholder="Contoh: Sie Acara / Ketua Panitia"
                            value={newCommRole}
                            onChange={(e) => setNewCommRole(e.target.value)}
                            required
                            className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                        >
                          Masukkan Panitia
                        </button>
                      </div>
                    </form>
                  )}

                  {selectedProker.committee.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-4">Belum ada struktur kepanitiaan yang didaftarkan.</p>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedProker.committee.map((c, i) => (
                        <div 
                          key={i} 
                          className="flex items-center justify-between p-3 bg-white/3 border border-white/5 rounded-xl group"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center font-bold text-xs font-mono">
                              {c.userName.charAt(0)}
                            </span>
                            <div>
                              <p className="text-xs sm:text-sm font-bold text-white">{c.userName}</p>
                              <p className="text-[10px] text-slate-400">{c.role}</p>
                            </div>
                          </div>

                          {isPengurus && (
                            <button
                              onClick={() => handleRemoveCommittee(selectedProker.id, i)}
                              className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Hapus dari Kepanitiaan"
                            >
                              <Trash2 size={13} />
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PANEL CONTENT 2: Rundown Timeline */}
              {activeSubTab === 'rundown' && (
                <div className="space-y-4">
                  {isPengurus && (
                    <form 
                      onSubmit={(e) => handleAddRundown(e, selectedProker.id)}
                      className="p-4 bg-white/3 border border-white/5 rounded-xl space-y-3 animate-fade-in"
                    >
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <PlusCircle size={14} className="text-blue-400" />
                        Tambah Susunan Acara / Agenda Rundown
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Time */}
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Rentang Waktu</label>
                          <input
                            type="text"
                            placeholder="Contoh: 08:00 - 08:30"
                            value={newRunTime}
                            onChange={(e) => setNewRunTime(e.target.value)}
                            required
                            className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        {/* Agenda */}
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Agenda Kegiatan</label>
                          <input
                            type="text"
                            placeholder="Contoh: Sambutan Ketua Umum"
                            value={newRunAgenda}
                            onChange={(e) => setNewRunAgenda(e.target.value)}
                            required
                            className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        {/* PIC */}
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Penanggung Jawab (PIC)</label>
                          <input
                            type="text"
                            placeholder="Contoh: Amanda / Sie Acara"
                            value={newRunPic}
                            onChange={(e) => setNewRunPic(e.target.value)}
                            className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end pt-1">
                        <button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                        >
                          Masukkan Rundown
                        </button>
                      </div>
                    </form>
                  )}

                  {selectedProker.rundown.length === 0 ? (
                    <p className="text-xs text-slate-500 italic text-center py-4">Belum ada susunan rundown acara yang didaftarkan.</p>
                  ) : (
                    <div className="relative border-l border-white/10 pl-6 space-y-6 ml-2 my-2">
                      {selectedProker.rundown.map((r, i) => (
                        <div key={i} className="relative group">
                          {/* Dot Milestone */}
                          <span className="absolute -left-[31px] top-1.5 w-2.5 h-2.5 rounded-full bg-blue-500 border border-slate-900 shadow shadow-blue-500/50 group-hover:scale-125 transition-transform" />
                          
                          <div className="flex items-start justify-between gap-4 p-3 bg-white/2 border border-white/5 rounded-xl group-hover:bg-white/5 transition-all">
                            <div className="space-y-1">
                              <span className="inline-flex items-center gap-1 font-mono font-bold text-blue-400 text-[10px] bg-blue-500/10 px-2 py-0.5 rounded border border-blue-500/20">
                                <Clock size={10} />
                                {r.time}
                              </span>
                              <p className="text-xs sm:text-sm font-semibold text-white mt-1 leading-relaxed">{r.agenda}</p>
                              <span className="text-[10px] text-slate-400 block">PIC: <span className="text-slate-300 font-semibold">{r.pic}</span></span>
                            </div>

                            {isPengurus && (
                              <button
                                onClick={() => handleRemoveRundown(selectedProker.id, i)}
                                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer self-start"
                                title="Hapus Agenda"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PANEL CONTENT 4: Absensi Kegiatan */}
              {activeSubTab === 'proker-absen' && (
                <div className="space-y-5 animate-fade-in text-left">
                  {/* Create New Session */}
                  {isPengurus && (
                    <form 
                      onSubmit={(e) => handleCreateAttendanceSession(e, selectedProker.id)}
                      className="p-4 bg-white/3 border border-white/5 rounded-xl space-y-3"
                    >
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <PlusCircle size={14} className="text-blue-400" />
                        Buat Sesi Absensi Baru
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Nama Sesi Absen</label>
                          <input
                            type="text"
                            placeholder="Contoh: Rapat Perdana / Presensi Hari H"
                            value={newSessionTitle}
                            onChange={(e) => setNewSessionTitle(e.target.value)}
                            required
                            className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Tanggal</label>
                          <input
                            type="date"
                            value={newSessionDate}
                            onChange={(e) => setNewSessionDate(e.target.value)}
                            className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                        >
                          Mulai Sesi Absensi
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Sessions Directory */}
                  {(!selectedProker.attendanceSessions || selectedProker.attendanceSessions.length === 0) ? (
                    <div className="text-center py-8 bg-white/2 border border-white/5 rounded-xl">
                      <ClipboardList size={28} className="mx-auto text-slate-600 mb-2" />
                      <p className="text-xs text-slate-400 font-semibold">Belum Ada Sesi Absensi</p>
                      <p className="text-[10px] text-slate-500 max-w-xs mx-auto mt-1">Buat sesi absensi rapat persiapan atau hari-H untuk melacak kehadiran panitia secara rinci.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Left: Sessions list */}
                      <div className="md:col-span-1 space-y-2 border-r border-white/5 pr-4">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Daftar Sesi Absensi</span>
                        {selectedProker.attendanceSessions.map((session) => (
                          <div 
                            key={session.id}
                            onClick={() => setActiveSessionId(session.id)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer text-left space-y-1 relative group ${
                              activeSessionId === session.id 
                                ? 'bg-blue-600/10 border-blue-500/30 text-white' 
                                : 'bg-white/3 border-white/5 text-slate-300 hover:bg-white/5'
                            }`}
                          >
                            <div className="flex justify-between items-start gap-1">
                              <h5 className="text-xs font-bold line-clamp-1">{session.title}</h5>
                              {isPengurus && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteAttendanceSession(selectedProker.id, session.id);
                                  }}
                                  className="text-slate-500 hover:text-red-400 p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <Trash2 size={11} />
                                </button>
                              )}
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                              <Calendar size={10} />
                              {new Date(session.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}
                            </span>
                            <div className="pt-1.5 flex gap-1.5 text-[9px]">
                              <span className="text-emerald-400 bg-emerald-500/10 px-1 rounded">
                                {session.attendees.filter(a => a.status === 'hadir').length} H
                              </span>
                              <span className="text-blue-400 bg-blue-500/10 px-1 rounded">
                                {session.attendees.filter(a => a.status === 'izin').length} I
                              </span>
                              <span className="text-amber-400 bg-amber-500/10 px-1 rounded">
                                {session.attendees.filter(a => a.status === 'sakit').length} S
                              </span>
                              <span className="text-red-400 bg-red-500/10 px-1 rounded">
                                {session.attendees.filter(a => a.status === 'alfa').length} A
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Right: Selected session details / attendees list */}
                      <div className="md:col-span-2 space-y-3">
                        {activeSessionId && selectedProker.attendanceSessions.find(s => s.id === activeSessionId) ? (() => {
                          const activeSession = selectedProker.attendanceSessions.find(s => s.id === activeSessionId)!;
                          return (
                            <div className="bg-white/2 border border-white/5 rounded-xl p-4 space-y-3 animate-fade-in">
                              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                <div>
                                  <h4 className="text-xs sm:text-sm font-bold text-white">{activeSession.title}</h4>
                                  <span className="text-[10px] text-slate-400">Silakan tentukan status kehadiran panitia:</span>
                                </div>
                                <span className="text-[10px] font-mono text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full">
                                  {activeSession.attendees.length} Orang
                                </span>
                              </div>

                              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                                {activeSession.attendees.map((attendee, index) => (
                                  <div 
                                    key={index} 
                                    className="p-2.5 bg-slate-900/60 rounded-lg border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                                  >
                                    <div className="space-y-0.5 text-left">
                                      <p className="text-xs font-bold text-white">{attendee.userName}</p>
                                      <input 
                                        type="text"
                                        placeholder="Keterangan tambahan..."
                                        value={attendee.notes || ''}
                                        onChange={(e) => handleUpdateAttendeeNotes(selectedProker.id, activeSession.id, attendee.userName, e.target.value)}
                                        className="text-[10px] text-slate-300 bg-transparent border-b border-transparent hover:border-white/10 focus:border-blue-500 focus:outline-none py-0.5 w-full sm:w-48 placeholder-slate-600"
                                      />
                                    </div>

                                    {/* Status Toggles */}
                                    <div className="flex gap-1 shrink-0">
                                      {[
                                        { id: 'hadir', label: 'Hadir' },
                                        { id: 'izin', label: 'Izin' },
                                        { id: 'sakit', label: 'Sakit' },
                                        { id: 'alfa', label: 'Alfa' }
                                      ].map((st) => (
                                        <button
                                          key={st.id}
                                          type="button"
                                          onClick={() => handleUpdateAttendeeStatus(selectedProker.id, activeSession.id, attendee.userName, st.id as any)}
                                          className={`px-2 py-1 text-[9px] font-bold rounded-md border cursor-pointer transition-all ${
                                            attendee.status === st.id 
                                              ? 'bg-blue-500 text-white border-blue-400 font-bold' 
                                              : 'bg-slate-950/40 text-slate-400 border-white/5 hover:text-white'
                                          }`}
                                        >
                                          {st.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })() : (
                          <div className="flex items-center justify-center h-48 border border-dashed border-white/10 rounded-xl bg-white/1 bg-opacity-20 text-center p-4">
                            <p className="text-xs text-slate-500 italic">Pilih sesi absensi di samping kiri untuk mengelola daftar hadir panitia.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PANEL CONTENT 5: Catatan Rapat */}
              {activeSubTab === 'proker-catatan' && (
                <div className="space-y-4 animate-fade-in text-left">
                  {/* Create New Minute */}
                  {isPengurus && (
                    <form 
                      onSubmit={(e) => handleAddMeetingMinute(e, selectedProker.id)}
                      className="p-4 bg-white/3 border border-white/5 rounded-xl space-y-3"
                    >
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <FileText size={14} className="text-blue-400" />
                        Tulis Notulensi Rapat Kepanitiaan Baru
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="sm:col-span-2">
                          <label className="text-[10px] text-slate-400 block mb-1">Judul Rapat / Pembahasan</label>
                          <input
                            type="text"
                            placeholder="Contoh: Rapat Pleno I - Pemantapan Acara"
                            value={newMinuteTitle}
                            onChange={(e) => setNewMinuteTitle(e.target.value)}
                            required
                            className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Tanggal Rapat</label>
                          <input
                            type="date"
                            value={newMinuteDate}
                            onChange={(e) => setNewMinuteDate(e.target.value)}
                            className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="text-[10px] text-slate-400 block mb-1">Isi Notulensi / Keputusan Rapat</label>
                        <textarea
                          placeholder="Ketik rincian hasil rapat, daftar keputusan penting, daftar tugas (Action Items), dll..."
                          value={newMinuteContent}
                          onChange={(e) => setNewMinuteContent(e.target.value)}
                          required
                          rows={4}
                          className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Notulis / Penulis Catatan</label>
                          <input
                            type="text"
                            placeholder="Nama Notulis"
                            value={newMinuteWriter}
                            onChange={(e) => setNewMinuteWriter(e.target.value)}
                            className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                        <div className="flex justify-end pt-4">
                          <button
                            type="submit"
                            className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2 rounded-lg cursor-pointer transition-colors"
                          >
                            Simpan Hasil Rapat
                          </button>
                        </div>
                      </div>
                    </form>
                  )}

                  {/* Minutes List */}
                  {(!selectedProker.meetingMinutes || selectedProker.meetingMinutes.length === 0) ? (
                    <div className="text-center py-8 bg-white/2 border border-white/5 rounded-xl">
                      <FileText size={28} className="mx-auto text-slate-600 mb-2" />
                      <p className="text-xs text-slate-400 font-semibold">Belum Ada Notulensi</p>
                      <p className="text-[10px] text-slate-500 max-w-xs mx-auto mt-1">Gunakan tab ini untuk menulis agenda hasil rapat kepanitiaan agar terdokumentasikan rapi.</p>
                    </div>
                  ) : (
                    <div className="space-y-3.5">
                      {selectedProker.meetingMinutes.map((minute) => (
                        <div key={minute.id} className="p-4 bg-white/3 border border-white/5 rounded-xl text-left space-y-2 group relative">
                          <div className="flex justify-between items-start">
                            <div>
                              <h5 className="text-xs sm:text-sm font-bold text-white">{minute.title}</h5>
                              <p className="text-[10px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span className="font-mono">{new Date(minute.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short', year: 'numeric'})}</span>
                                <span className="w-1 h-1 rounded-full bg-white/20" />
                                <span>Notulis: <strong className="text-slate-300">{minute.writerName}</strong></span>
                              </p>
                            </div>
                            {isPengurus && (
                              <button
                                onClick={() => handleDeleteMeetingMinute(selectedProker.id, minute.id)}
                                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity"
                                title="Hapus Notulensi"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 whitespace-pre-line leading-relaxed bg-[#0b0e17] p-3 rounded-lg border border-white/3 font-mono">
                            {minute.content}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PANEL CONTENT 6: Surat Menyurat & Dokumen */}
              {activeSubTab === 'proker-dokumen' && (
                <div className="space-y-4 animate-fade-in text-left">
                  {/* Add document link */}
                  {isPengurus && (
                    <form 
                      onSubmit={(e) => handleAddDocument(e, selectedProker.id)}
                      className="p-4 bg-white/3 border border-white/5 rounded-xl space-y-3"
                    >
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        <FolderOpen size={14} className="text-blue-400" />
                        Arsipkan Dokumen / Surat Kegiatan Baru
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        {/* Title */}
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Nama Dokumen</label>
                          <input
                            type="text"
                            placeholder="Contoh: Proposal Kegiatan Abdimas"
                            value={newDocTitle}
                            onChange={(e) => setNewDocTitle(e.target.value)}
                            required
                            className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        {/* Type */}
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Jenis Dokumen</label>
                          <select
                            value={newDocType}
                            onChange={(e) => setNewDocType(e.target.value as any)}
                            className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                          >
                            <option value="Proposal">Proposal Kegiatan</option>
                            <option value="LPJ">Laporan Pertanggungjawaban (LPJ)</option>
                            <option value="Surat Masuk">Surat Masuk</option>
                            <option value="Surat Keluar">Surat Keluar</option>
                            <option value="Lainnya">Lampiran / Berkas Lainnya</option>
                          </select>
                        </div>

                        {/* URL/Link */}
                        <div>
                          <label className="text-[10px] text-slate-400 block mb-1">Tautan File (GDrive / Dokumen)</label>
                          <input
                            type="url"
                            placeholder="https://drive.google.com/..."
                            value={newDocUrl}
                            onChange={(e) => setNewDocUrl(e.target.value)}
                            required
                            className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                          />
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-3 py-1.5 rounded-lg cursor-pointer transition-colors"
                        >
                          Arsipkan File
                        </button>
                      </div>
                    </form>
                  )}

                  {/* Documents List */}
                  {(!selectedProker.documents || selectedProker.documents.length === 0) ? (
                    <div className="text-center py-8 bg-white/2 border border-white/5 rounded-xl">
                      <FolderOpen size={28} className="mx-auto text-slate-600 mb-2" />
                      <p className="text-xs text-slate-400 font-semibold">Belum Ada Dokumen Resmi</p>
                      <p className="text-[10px] text-slate-500 max-w-xs mx-auto mt-1">Arsipkan tautan surat masuk, surat keluar, proposal kepanitiaan, atau LPJ untuk diakses bersama.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {selectedProker.documents.map((doc) => (
                        <div 
                          key={doc.id}
                          className="p-3 bg-white/3 border border-white/5 rounded-xl flex items-center justify-between group text-left transition-all hover:bg-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <span className="p-2 bg-blue-500/10 text-blue-400 rounded-lg flex items-center justify-center">
                              <Paperclip size={16} />
                            </span>
                            <div>
                              <h5 className="text-xs font-bold text-white line-clamp-1">{doc.title}</h5>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-400 border border-blue-500/20">{doc.type}</span>
                                <span className="text-[9px] text-slate-500 font-mono">{new Date(doc.uploadedAt).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <a 
                              href={doc.fileUrlOrLink} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer"
                            >
                              Buka File
                            </a>
                            {isPengurus && (
                              <button
                                onClick={() => handleDeleteDocument(selectedProker.id, doc.id)}
                                className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* PANEL CONTENT 7: Anggaran Detil */}
              {activeSubTab === 'proker-anggaran' && (() => {
                const budgets = selectedProker.budgets || [];
                const itemizedIncome = budgets.filter(b => b.type === 'pemasukan').reduce((acc, b) => acc + b.amount, 0);
                const itemizedExpenses = budgets.filter(b => b.type === 'pengeluaran').reduce((acc, b) => acc + b.amount, 0);
                const netBalance = (selectedProker.budget + itemizedIncome) - itemizedExpenses;

                return (
                  <div className="space-y-5 animate-fade-in text-left">
                    {/* Budget Summary Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 bg-blue-500/5 border border-blue-500/10 rounded-xl space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Plafon + Pemasukan Tambahan</span>
                        <p className="text-sm sm:text-base font-bold text-blue-400">
                          {formatRupiah(selectedProker.budget + itemizedIncome)}
                        </p>
                        <p className="text-[9px] text-slate-500 italic">Plafon Awal: {formatRupiah(selectedProker.budget)}</p>
                      </div>
                      <div className="p-3.5 bg-red-500/5 border border-red-500/10 rounded-xl space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Realisasi Pengeluaran</span>
                        <p className="text-sm sm:text-base font-bold text-red-400">
                          {formatRupiah(itemizedExpenses)}
                        </p>
                        <p className="text-[9px] text-slate-500">Dari {budgets.filter(b => b.type === 'pengeluaran').length} pos pengeluaran</p>
                      </div>
                      <div className="p-3.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl space-y-1">
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold block">Sisa Alokasi Dana (Sisa Saldo)</span>
                        <p className={`text-sm sm:text-base font-bold ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {formatRupiah(netBalance)}
                        </p>
                        <p className="text-[9px] text-slate-500">{netBalance >= 0 ? '✔️ Anggaran Aman / Surplus' : '⚠️ Anggaran Defisit!'}</p>
                      </div>
                    </div>

                    {/* Add Budget Log Item */}
                    {isPengurus && (
                      <form 
                        onSubmit={(e) => handleAddBudgetDetail(e, selectedProker.id)}
                        className="p-4 bg-white/3 border border-white/5 rounded-xl space-y-3"
                      >
                        <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                          <PlusCircle size={14} className="text-blue-400" />
                          Tambah Rincian Anggaran / Pengeluaran Baru
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                          {/* Description */}
                          <div className="sm:col-span-2">
                            <label className="text-[10px] text-slate-400 block mb-1">Nama Barang / Deskripsi Keperluan</label>
                            <input
                              type="text"
                              placeholder="Contoh: Konsumsi Narasumber / Cetak Spanduk"
                              value={newBudgetDesc}
                              onChange={(e) => setNewBudgetDesc(e.target.value)}
                              required
                              className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          {/* Type */}
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Jenis Alokasi</label>
                            <select
                              value={newBudgetType}
                              onChange={(e) => setNewBudgetType(e.target.value as any)}
                              className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                            >
                              <option value="pengeluaran">Pengeluaran (Belanja)</option>
                              <option value="pemasukan">Pemasukan (Sponsor/Kas)</option>
                            </select>
                          </div>

                          {/* Amount */}
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Jumlah Biaya (Rp)</label>
                            <input
                              type="number"
                              placeholder="Biaya"
                              value={newBudgetAmount || ''}
                              onChange={(e) => setNewBudgetAmount(Number(e.target.value))}
                              required
                              className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Status Pembayaran</label>
                            <select
                              value={newBudgetStatus}
                              onChange={(e) => setNewBudgetStatus(e.target.value as any)}
                              className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                            >
                              <option value="Lunas">Lunas / Terealisasi</option>
                              <option value="Direncanakan">Direncanakan</option>
                              <option value="Pending">Pending / Tertunda</option>
                            </select>
                          </div>

                          <div>
                            <label className="text-[10px] text-slate-400 block mb-1">Tanggal Transaksi/Rencana</label>
                            <input
                              type="date"
                              value={newBudgetExpDate}
                              onChange={(e) => setNewBudgetExpDate(e.target.value)}
                              className="w-full bg-[#0e1320] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="submit"
                              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs py-1.5 rounded-lg cursor-pointer transition-colors"
                            >
                              Tambahkan Pos Anggaran
                            </button>
                          </div>
                        </div>
                      </form>
                    )}

                    {/* Table / List of items */}
                    {budgets.length === 0 ? (
                      <div className="text-center py-8 bg-white/2 border border-white/5 rounded-xl">
                        <Wallet size={28} className="mx-auto text-slate-600 mb-2" />
                        <p className="text-xs text-slate-400 font-semibold">Belum Ada Rincian Transaksi</p>
                        <p className="text-[10px] text-slate-500 max-w-xs mx-auto mt-1">Gunakan tab ini untuk mendata pengeluaran rill barang, cetakan, konsumsi, transportasi, atau pemasukan sponsor eksternal.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-white/5 bg-white/2">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-white/5 border-b border-white/5 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                              <th className="p-3">Keterangan Barang/Kebutuhan</th>
                              <th className="p-3">Tanggal</th>
                              <th className="p-3 text-center">Status</th>
                              <th className="p-3 text-right">Jumlah Uang</th>
                              {isPengurus && <th className="p-3 text-center w-24">Aksi</th>}
                            </tr>
                          </thead>
                          <tbody>
                            {budgets.map((item) => (
                              <tr key={item.id} className="border-b border-white/5 hover:bg-white/3 transition-colors">
                                <td className="p-3 font-semibold text-white">
                                  <div className="flex items-center gap-1.5">
                                    <span className={`w-1.5 h-1.5 rounded-full ${item.type === 'pemasukan' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                                    <span>{item.description}</span>
                                  </div>
                                </td>
                                <td className="p-3 text-slate-400 font-mono">
                                  {new Date(item.date).toLocaleDateString('id-ID', {day: 'numeric', month: 'short'})}
                                </td>
                                <td className="p-3 text-center">
                                  <select
                                    value={item.status}
                                    onChange={(e) => handleUpdateBudgetStatus(selectedProker.id, item.id, e.target.value as any)}
                                    disabled={!isPengurus}
                                    className={`px-2 py-0.5 text-[10px] font-bold rounded border cursor-pointer ${
                                      item.status === 'Lunas' 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                                        : item.status === 'Pending'
                                        ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                        : 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                    }`}
                                  >
                                    <option value="Lunas">Lunas</option>
                                    <option value="Pending">Pending</option>
                                    <option value="Direncanakan">Rencana</option>
                                  </select>
                                </td>
                                <td className={`p-3 text-right font-mono font-bold ${item.type === 'pemasukan' ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {item.type === 'pemasukan' ? '+' : '-'}{formatRupiah(item.amount)}
                                </td>
                                {isPengurus && (
                                  <td className="p-3 text-center">
                                    <button
                                      onClick={() => handleDeleteBudgetDetail(selectedProker.id, item.id)}
                                      className="text-slate-500 hover:text-red-400 p-1 rounded hover:bg-red-500/10 transition-colors"
                                    >
                                      <Trash2 size={13} />
                                    </button>
                                  </td>
                                )}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* PANEL CONTENT 3: Description */}
              {activeSubTab === 'details' && (
                <div className="space-y-4">
                  <div className="p-5 bg-white/2 border border-white/5 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                      <BookOpen size={13} className="text-blue-400" />
                      Gambaran Umum Program Kerja
                    </h4>
                    <p className="text-xs sm:text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                      {selectedProker.description}
                    </p>
                  </div>

                  <div className="p-4 bg-blue-500/5 border border-blue-500/15 rounded-xl flex items-start gap-3">
                    <AlertCircle size={16} className="text-blue-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Sistem ini mendukung pengarsipan koordinasi internal yang aman. Pengurus dapat mengubah data ini secara real-time, dan perubahan akan secara otomatis disinkronkan ke seluruh pengguna Portal HIMPALUBI.
                    </p>
                  </div>
                </div>
              )}

            </div>
          )}

        </div>
      )}

      {/* CREATE PROKER MODAL (FOR PENGURUS/BPH) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-[#0e1322] border border-white/10 rounded-2xl p-6 sm:p-8 w-full max-w-lg space-y-5 shadow-2xl relative animate-scale-up">
            <button
              onClick={() => setIsCreateModalOpen(false)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Briefcase size={20} className="text-blue-400" />
                Rancang Program Kerja Baru
              </h3>
              <p className="text-xs text-slate-400">Tambahkan kegiatan besar kepengurusan dan mulailah mendesain kepanitiaannya.</p>
            </div>

            <form onSubmit={handleCreateProker} className="space-y-4">
              {/* Name */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 block font-semibold">Nama Program Kerja (Kegiatan)</label>
                <input
                  type="text"
                  placeholder="Contoh: Pengabdian Masyarakat PLB 2026"
                  value={newProkerName}
                  onChange={(e) => setNewProkerName(e.target.value)}
                  required
                  className="w-full bg-[#080c16] border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs text-slate-400 block font-semibold">Deskripsi / Sasaran Kegiatan</label>
                <textarea
                  placeholder="Deskripsikan tujuan kegiatan, target peserta, dan output penting..."
                  value={newProkerDesc}
                  onChange={(e) => setNewProkerDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-[#080c16] border border-white/10 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Division leading */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 block font-semibold">Divisi Utama</label>
                  <select
                    value={newProkerDivision}
                    onChange={(e) => setNewProkerDivision(e.target.value)}
                    className="w-full bg-[#080c16] border border-white/10 rounded-xl px-2 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  >
                    <option value="">-- Pilih --</option>
                    <option value="Badan Pengurus Harian (Ketua Umum)">BPH - Ketua Umum</option>
                    <option value="Divisi Penelitian dan Pengembangan (Litbang)">Litbang</option>
                    <option value="Divisi Public Relation">Public Relation</option>
                    <option value="Divisi Pengabdian Masyarakat">Pengabdian Masyarakat</option>
                    <option value="Divisi Pengembangan Sumber Daya Anggota (PSDA)">PSDA</option>
                    <option value="Divisi Information and Technology (Teknologi Informasi)">IT / Tekinfo</option>
                    <option value="Divisi Sarana dan Prasarana">Sarana & Prasarana</option>
                  </select>
                </div>

                {/* Budget */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 block font-semibold">Anggaran (Rp)</label>
                  <input
                    type="number"
                    placeholder="Contoh: 3500000"
                    value={newProkerBudget || ''}
                    onChange={(e) => setNewProkerBudget(Number(e.target.value))}
                    className="w-full bg-[#080c16] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {/* Date */}
                <div className="space-y-1">
                  <label className="text-xs text-slate-400 block font-semibold">Tanggal Pelaksanaan</label>
                  <input
                    type="date"
                    value={newProkerDate}
                    onChange={(e) => setNewProkerDate(e.target.value)}
                    required
                    className="w-full bg-[#080c16] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="bg-white/5 hover:bg-white/10 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl shadow-lg shadow-blue-500/10 cursor-pointer transition-all"
                >
                  Simpan Program Kerja
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
