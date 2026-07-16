import React, { useState, useEffect } from 'react';
import { 
  Coins, 
  TrendingUp, 
  TrendingDown, 
  CreditCard, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Clock, 
  Check, 
  X, 
  Search, 
  Plus, 
  QrCode, 
  Receipt, 
  Calendar, 
  DollarSign, 
  UserCheck, 
  History, 
  Sparkles,
  AlertCircle,
  Shield,
  Users,
  Crown,
  FileSpreadsheet,
  RefreshCw,
  LogOut,
  ExternalLink
} from 'lucide-react';
import { localDb } from '../lib/firebase';
import { UserProfile, KasTransaction, MemberKasRecord } from '../types';
import { signInForSheets, syncAllDataToGoogleSheets, getCachedToken, clearCachedToken } from '../lib/sheetsService';

interface KasPaymentProps {
  currentUser: UserProfile;
}

export default function KasPayment({ currentUser }: KasPaymentProps) {
  const [transactions, setTransactions] = useState<KasTransaction[]>([]);
  const [memberKas, setMemberKas] = useState<MemberKasRecord[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<'summary' | 'member-dues' | 'pay' | 'approval'>('summary');
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'masuk' | 'keluar'>('all');
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [memberTypeView, setMemberTypeView] = useState<'all' | 'pengurus' | 'anggota'>('all');

  // Form states for manual transactions (Pengurus only)
  const [isAddingTx, setIsAddingTx] = useState(false);
  const [txForm, setTxForm] = useState({
    type: 'masuk' as 'masuk' | 'keluar',
    amount: '',
    description: '',
    category: 'Uang Kas Bulanan',
    memberName: ''
  });

  // Form states for self dues payment (Any member)
  const [payForm, setPayForm] = useState({
    months: [] as string[],
    method: 'qris',
    receiptPreset: 'https://images.unsplash.com/photo-1554415707-6e8cfc93fe23?auto=format&fit=crop&q=80&w=300', // preset transfer bank/receipt image
    customReceiptUrl: ''
  });
  const [paymentStep, setPaymentStep] = useState(1); // 1: form, 2: scan/transfer, 3: completed/pending

  // Available months for organization dues
  const AVAILABLE_MONTHS = [
    { value: '2026-06', label: 'Juni 2026' },
    { value: '2026-07', label: 'Juli 2026' },
    { value: '2026-08', label: 'Agustus 2026' }
  ];
  
  const [duesRate, setDuesRate] = useState<number>(() => {
    const saved = localStorage.getItem('HIMPALUBI_DUES_RATE');
    return saved ? parseInt(saved, 10) : 20000;
  });
  const PRICE_PER_MONTH = duesRate;

  // Preset receipt templates to choose from easily in the simulator
  const RECEIPT_PRESETS = [
    { name: 'Struk Transfer BCA Biru', url: 'https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=300' },
    { name: 'Struk QRIS Gopay Hijau', url: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&q=80&w=300' },
    { name: 'Bukti M-Banking Sukses', url: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&q=80&w=300' }
  ];

  // Google Sheets state declarations
  const [sheetsToken, setSheetsToken] = useState<string | null>(getCachedToken());
  const [sheetsUser, setSheetsUser] = useState<any | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncUrl, setSyncUrl] = useState<string | null>(null);
  const [sheetsError, setSheetsError] = useState<string | null>(null);

  const handleConnectSheets = async () => {
    setSheetsError(null);
    try {
      const res = await signInForSheets();
      if (res) {
        setSheetsToken(res.token);
        setSheetsUser(res.user);
      }
    } catch (err: any) {
      console.error(err);
      setSheetsError(err.message || 'Gagal menyambungkan ke Google Account');
    }
  };

  const handleDisconnectSheets = () => {
    clearCachedToken();
    setSheetsToken(null);
    setSheetsUser(null);
    setSyncUrl(null);
  };

  const handleSyncToSheets = async () => {
    if (!sheetsToken) return;
    setIsSyncing(true);
    setSheetsError(null);
    try {
      const fullUsers = localDb.getUsers();
      const txs = localDb.getKasTransactions();
      const records = localDb.getMemberKas();
      
      const url = await syncAllDataToGoogleSheets(sheetsToken, fullUsers, txs, records);
      setSyncUrl(url);
      
      const pushEvent = new CustomEvent('simulatePush', {
        detail: {
          title: 'Google Sheets Berhasil Disinkronkan!',
          body: `Laporan keuangan dan iuran kas portal berhasil diekspor ke Google Sheets.`
        }
      });
      window.dispatchEvent(pushEvent);
    } catch (err: any) {
      console.error(err);
      setSheetsError(err.message || 'Gagal sinkronisasi data ke Google Sheets');
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Load localDb state
    setTransactions(localDb.getKasTransactions());
    setMemberKas(localDb.getMemberKas());
    setUsersList(localDb.getUsers());

    const handleStorageUpdate = () => {
      setTransactions(localDb.getKasTransactions());
      setMemberKas(localDb.getMemberKas());
      setUsersList(localDb.getUsers());
    };
    window.addEventListener('localDbUpdate', handleStorageUpdate);

    return () => {
      window.removeEventListener('localDbUpdate', handleStorageUpdate);
    };
  }, []);

  const isUserPengurus = currentUser.role === 'pengurus';
  const isUserBendaharaOrKetua = currentUser.division.includes('Bendahara') || currentUser.division.includes('Ketua');

  // Financial Calculations
  const totalIncome = transactions
    .filter(t => t.type === 'masuk')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter(t => t.type === 'keluar')
    .reduce((sum, t) => sum + t.amount, 0);

  const currentBalance = totalIncome - totalExpense;

  // Total outstanding dues (simulated potential income)
  const unpaidCount = memberKas.reduce((sum, record) => {
    const unpaidMonths = Object.values(record.payments).filter(status => status === 'belum_bayar').length;
    return sum + unpaidMonths;
  }, 0);
  const potentialDuesIncome = unpaidCount * PRICE_PER_MONTH;

  // Current user's dues status
  const myKasRecord = memberKas.find(m => m.userId === currentUser.id);

  // Handle manual transaction registration by pengurus/treasurer
  const handleAddTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!txForm.amount || !txForm.description) return;

    const newTx: KasTransaction = {
      id: `tx-${Date.now()}`,
      type: txForm.type,
      amount: parseInt(txForm.amount),
      description: txForm.description,
      category: txForm.category,
      recordedBy: currentUser.name,
      date: new Date().toISOString().split('T')[0],
      memberName: txForm.memberName || undefined
    };

    const updatedTxs = [newTx, ...transactions];
    localDb.saveKasTransactions(updatedTxs);
    setTransactions(updatedTxs);
    setIsAddingTx(false);
    setTxForm({
      type: 'masuk',
      amount: '',
      description: '',
      category: 'Uang Kas Bulanan',
      memberName: ''
    });

    // Fire simulated Push Event
    const pushEvent = new CustomEvent('simulatePush', {
      detail: {
        title: `Transaksi Keuangan Dicatat!`,
        body: `${currentUser.name} mencatat ${newTx.type === 'masuk' ? 'Uang Masuk' : 'Uang Keluar'} sebesar Rp ${newTx.amount.toLocaleString('id-ID')} untuk ${newTx.description}.`
      }
    });
    window.dispatchEvent(pushEvent);
    window.dispatchEvent(new Event('localDbUpdate'));
  };

  // Handle self dues payment simulator
  const handleToggleMonthToPay = (monthValue: string) => {
    if (payForm.months.includes(monthValue)) {
      setPayForm({
        ...payForm,
        months: payForm.months.filter(m => m !== monthValue)
      });
    } else {
      setPayForm({
        ...payForm,
        months: [...payForm.months, monthValue]
      });
    }
  };

  const handlePaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (payForm.months.length === 0) return;

    // Proceed to payment instructions screen
    setPaymentStep(2);
  };

  const handleConfirmSimulatorPayment = () => {
    // Simulated upload and state update
    const receiptToUse = payForm.customReceiptUrl || payForm.receiptPreset;

    // We must update the memberKas record for this user to be 'pending' for the chosen months
    const updatedMemberKas = memberKas.map(record => {
      if (record.userId === currentUser.id) {
        const updatedPayments = { ...record.payments };
        payForm.months.forEach(month => {
          updatedPayments[month] = 'pending';
        });
        return {
          ...record,
          payments: updatedPayments
        };
      }
      return record;
    });

    // Save
    localDb.saveMemberKas(updatedMemberKas);
    setMemberKas(updatedMemberKas);
    setPaymentStep(3);

    // Alert
    const pushEvent = new CustomEvent('simulatePush', {
      detail: {
        title: 'Pembayaran Kas Terkirim!',
        body: `${currentUser.name} telah mengirim bukti pembayaran kas untuk bulan: ${payForm.months.join(', ')}. Menunggu verifikasi Bendahara.`
      }
    });
    window.dispatchEvent(pushEvent);
    window.dispatchEvent(new Event('localDbUpdate'));
  };

  const handleResetPaymentForm = () => {
    setPayForm({
      months: [],
      method: 'qris',
      receiptPreset: RECEIPT_PRESETS[0].url,
      customReceiptUrl: ''
    });
    setPaymentStep(1);
    setActiveSubTab('summary');
  };

  // Bendahara approval logic
  const handleApprovePayment = (userId: string, months: string[]) => {
    const record = memberKas.find(m => m.userId === userId);
    if (!record) return;

    // 1. Update status to 'lunas' for these months
    const updatedMemberKas = memberKas.map(m => {
      if (m.userId === userId) {
        const updatedPayments = { ...m.payments };
        months.forEach(month => {
          updatedPayments[month] = 'lunas';
        });
        const totalPaid = m.totalPaid + (months.length * PRICE_PER_MONTH);
        return {
          ...m,
          payments: updatedPayments,
          totalPaid
        };
      }
      return m;
    });

    localDb.saveMemberKas(updatedMemberKas);
    setMemberKas(updatedMemberKas);

    // 2. Add entry to treasury ledger
    const totalAmount = months.length * PRICE_PER_MONTH;
    const newTx: KasTransaction = {
      id: `tx-${Date.now()}`,
      type: 'masuk',
      amount: totalAmount,
      description: `Uang Kas Lunas - ${record.userName} (${months.join(', ')})`,
      category: 'Uang Kas Bulanan',
      recordedBy: currentUser.name,
      date: new Date().toISOString().split('T')[0],
      memberName: record.userName
    };

    const updatedTxs = [newTx, ...transactions];
    localDb.saveKasTransactions(updatedTxs);
    setTransactions(updatedTxs);

    // 3. Dispatch global push alert
    const pushEvent = new CustomEvent('simulatePush', {
      detail: {
        title: 'Pembayaran Kas Disetujui!',
        body: `Pembayaran kas Rp ${totalAmount.toLocaleString('id-ID')} milik ${record.userName} untuk periode (${months.join(', ')}) telah diverifikasi oleh Bendahara.`
      }
    });
    window.dispatchEvent(pushEvent);
    window.dispatchEvent(new Event('localDbUpdate'));
  };

  const handleRejectPayment = (userId: string, months: string[]) => {
    const record = memberKas.find(m => m.userId === userId);
    if (!record) return;

    // Revert 'pending' status back to 'belum_bayar'
    const updatedMemberKas = memberKas.map(m => {
      if (m.userId === userId) {
        const updatedPayments = { ...m.payments };
        months.forEach(month => {
          updatedPayments[month] = 'belum_bayar';
        });
        return {
          ...m,
          payments: updatedPayments
        };
      }
      return m;
    });

    localDb.saveMemberKas(updatedMemberKas);
    setMemberKas(updatedMemberKas);

    const pushEvent = new CustomEvent('simulatePush', {
      detail: {
        title: 'Bukti Bayar Kas Ditolak!',
        body: `Bendahara menolak bukti pembayaran kas milik ${record.userName}. Silakan unggah bukti transfer yang valid.`
      }
    });
    window.dispatchEvent(pushEvent);
    window.dispatchEvent(new Event('localDbUpdate'));
  };

  // Filtered list of transactions
  const filteredTxs = transactions.filter(t => {
    const matchesSearch = t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          t.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          (t.memberName && t.memberName.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (typeFilter === 'all') return matchesSearch;
    return matchesSearch && t.type === typeFilter;
  });

  // Calculate pending approvals counts
  const pendingApprovals: { userId: string; userName: string; avatar: string; division: string; months: string[]; totalAmount: number }[] = [];
  memberKas.forEach(m => {
    const pendingMonths: string[] = [];
    Object.entries(m.payments).forEach(([month, status]) => {
      if (status === 'pending') {
        pendingMonths.push(month);
      }
    });
    if (pendingMonths.length > 0) {
      pendingApprovals.push({
        userId: m.userId,
        userName: m.userName,
        avatar: m.avatar,
        division: m.division,
        months: pendingMonths,
        totalAmount: pendingMonths.length * PRICE_PER_MONTH
      });
    }
  });

  // Map to get roles easily
  const userRoleMap = React.useMemo(() => {
    const map = new Map<string, 'pengurus' | 'anggota'>();
    usersList.forEach(u => {
      map.set(u.id, u.role);
    });
    return map;
  }, [usersList]);

  // Separate records
  const pengurusRecords = memberKas.filter(m => userRoleMap.get(m.userId) === 'pengurus');
  const anggotaRecords = memberKas.filter(m => userRoleMap.get(m.userId) === 'anggota' || !userRoleMap.has(m.userId));

  return (
    <div className="space-y-6">
      {/* Title Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight flex items-center gap-2">
            <Coins className="text-blue-400 animate-pulse" size={24} />
            Kas Organisasi & Iuran Anggota
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Kelola transparansi anggaran, bayar iuran bulanan digital, dan pantau pembukuan saldo treasury.
          </p>
        </div>

        {/* Sub Navigation Controls */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveSubTab('summary')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              activeSubTab === 'summary' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            Buku Besar Kas
          </button>
          <button
            onClick={() => setActiveSubTab('member-dues')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              activeSubTab === 'member-dues' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            Status Iuran Anggota
          </button>
          <button
            onClick={() => setActiveSubTab('pay')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all flex items-center gap-1 ${
              activeSubTab === 'pay' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            <CreditCard size={12} />
            Bayar Kas Online
          </button>
          {isUserPengurus && (
            <button
              onClick={() => setActiveSubTab('approval')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all relative ${
                activeSubTab === 'approval' 
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' 
                  : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
              }`}
            >
              Verifikasi Bukti
              {pendingApprovals.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center animate-bounce">
                  {pendingApprovals.length}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      {/* SUBTAB CONTENT 1: FINANCIAL OVERVIEW / LEDGER */}
      {activeSubTab === 'summary' && (
        <div className="space-y-6">
          
          {/* Financial Metrics Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Stat: Net Balance */}
            <div className="p-5 glass-panel rounded-2xl flex flex-col justify-between border border-white/10 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 blur-2xl rounded-full pointer-events-none group-hover:scale-125 transition-transform" />
              <div className="flex justify-between items-start z-10">
                <span className="text-xs font-medium text-slate-400">Total Saldo Kas</span>
                <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl"><Coins size={16} /></span>
              </div>
              <div className="mt-4 z-10">
                <h4 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
                  Rp {currentBalance.toLocaleString('id-ID')}
                </h4>
                <p className="text-[10px] text-emerald-400 font-medium mt-1.5 flex items-center gap-1">
                  <Sparkles size={10} /> Saldo bersih siap digunakan
                </p>
              </div>
            </div>

            {/* Stat: Total Income */}
            <div className="p-5 glass-panel rounded-2xl flex flex-col justify-between border border-white/10 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 blur-2xl rounded-full pointer-events-none group-hover:scale-125 transition-transform" />
              <div className="flex justify-between items-start z-10">
                <span className="text-xs font-medium text-slate-400">Total Pemasukan</span>
                <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl"><TrendingUp size={16} /></span>
              </div>
              <div className="mt-4 z-10">
                <h4 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
                  Rp {totalIncome.toLocaleString('id-ID')}
                </h4>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Iuran kas + dana sponsor BPH
                </p>
              </div>
            </div>

            {/* Stat: Total Expenses */}
            <div className="p-5 glass-panel rounded-2xl flex flex-col justify-between border border-white/10 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 blur-2xl rounded-full pointer-events-none group-hover:scale-125 transition-transform" />
              <div className="flex justify-between items-start z-10">
                <span className="text-xs font-medium text-slate-400">Total Pengeluaran</span>
                <span className="p-2 bg-rose-500/10 text-rose-400 rounded-xl"><TrendingDown size={16} /></span>
              </div>
              <div className="mt-4 z-10">
                <h4 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
                  Rp {totalExpense.toLocaleString('id-ID')}
                </h4>
                <p className="text-[10px] text-slate-400 mt-1.5">
                  Operasional proker & konsumsi rapat
                </p>
              </div>
            </div>

            {/* Stat: Unpaid / Potential Income */}
            <div className="p-5 glass-panel rounded-2xl flex flex-col justify-between border border-white/10 shadow-lg relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 blur-2xl rounded-full pointer-events-none group-hover:scale-125 transition-transform" />
              <div className="flex justify-between items-start z-10">
                <span className="text-xs font-medium text-slate-400">Tunggakan Kas Aktif</span>
                <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl"><Clock size={16} /></span>
              </div>
              <div className="mt-4 z-10">
                <h4 className="text-xl sm:text-2xl font-display font-bold text-white tracking-tight">
                  Rp {potentialDuesIncome.toLocaleString('id-ID')}
                </h4>
                <p className="text-[10px] text-amber-400 font-medium mt-1.5">
                  {unpaidCount} Tagihan belum terbayar
                </p>
              </div>
            </div>

          </div>

          {/* Google Sheets Sync Hub Card */}
          <div className="glass-panel border border-emerald-500/10 rounded-2xl p-5 shadow-xl relative overflow-hidden bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent animate-scale-up">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <h3 className="font-display font-bold text-white flex items-center gap-2 text-sm sm:text-base">
                  <FileSpreadsheet size={18} className="text-emerald-400" />
                  Google Sheets Real-Time Sync Hub
                </h3>
                <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
                  Ekspor dan sinkronisasikan laporan Buku Kas Besar Himpunan, data Iuran Bulanan Anggota, dan Daftar Roster Mahasiswa per Angkatan secara real-time langsung ke akun Google Sheets Anda.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                {!sheetsToken ? (
                  <button
                    onClick={handleConnectSheets}
                    className="w-full sm:w-auto px-4 py-2 bg-[#0d1324] hover:bg-[#131b31] border border-white/10 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer text-slate-200 shadow-md transition-all active:scale-95"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22c-.77-.32-1.35-.95-1.85-1.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                    Sambungkan ke Google Account
                  </button>
                ) : (
                  <div className="flex items-center gap-2 w-full sm:w-auto">
                    <button
                      onClick={handleSyncToSheets}
                      disabled={isSyncing}
                      className="flex-1 sm:flex-initial px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-700/50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-600/15 transition-all active:scale-95"
                    >
                      {isSyncing ? (
                        <RefreshCw size={14} className="animate-spin" />
                      ) : (
                        <RefreshCw size={14} />
                      )}
                      {isSyncing ? 'Sinkronisasi...' : 'Mulai Sinkronisasi'}
                    </button>
                    <button
                      onClick={handleDisconnectSheets}
                      className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 text-rose-400 rounded-xl text-xs font-semibold flex items-center justify-center cursor-pointer"
                      title="Putuskan sambungan Google Sheets"
                    >
                      <LogOut size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {sheetsToken && sheetsUser && (
              <div className="mt-3.5 pt-3.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Terhubung sebagai: <strong className="text-slate-200">{sheetsUser.displayName || sheetsUser.email}</strong>
                </span>
                <span className="text-[10px] text-slate-500">Google Sheets API Terkoneksi</span>
              </div>
            )}

            {sheetsError && (
              <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs font-semibold flex items-center gap-2">
                <AlertCircle size={14} />
                <span>{sheetsError}</span>
              </div>
            )}

            {syncUrl && (
              <div className="mt-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 rounded-xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-scale-up">
                <div className="space-y-0.5">
                  <p className="font-bold flex items-center gap-1.5 text-white">
                    <Check size={16} className="text-emerald-400" />
                    Data Berhasil Diekspor!
                  </p>
                  <p className="text-slate-400 leading-relaxed">
                    Google Spreadsheet baru telah dibuat dengan tab Buku Kas Besar, Iuran Bulanan, dan Daftar Anggota.
                  </p>
                </div>
                <a
                  href={syncUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors shrink-0 text-center shadow-lg shadow-emerald-500/20"
                >
                  <ExternalLink size={14} />
                  Buka Google Spreadsheet
                </a>
              </div>
            )}
          </div>

          {/* Core ledger control block: Table of Transactions */}
          <div className="glass-panel border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
            
            {/* Header controls for search, filter, add transaction button */}
            <div className="flex flex-col md:flex-row justify-between md:items-center gap-4">
              <div>
                <h3 className="font-display font-bold text-white flex items-center gap-2">
                  <History size={16} className="text-blue-400" />
                  Buku Kas Besar Himpunan
                </h3>
                <p className="text-[11px] text-slate-400">Transparansi penuh pengeluaran dan pemasukan dana organisasi</p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Search box */}
                <div className="relative">
                  <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Cari deskripsi, kategori..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="pl-9 pr-3.5 py-1.5 bg-white/3 border border-white/10 focus:border-blue-500 rounded-xl text-xs text-white focus:outline-none w-[180px] sm:w-[220px]"
                  />
                </div>

                {/* Filter Selector */}
                <select
                  value={typeFilter}
                  onChange={e => setTypeFilter(e.target.value as any)}
                  className="px-3.5 py-1.5 bg-white/3 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="all" className="bg-[#0e1320] text-white">Semua Transaksi</option>
                  <option value="masuk" className="bg-[#0e1320] text-white">Uang Masuk</option>
                  <option value="keluar" className="bg-[#0e1320] text-white">Uang Keluar</option>
                </select>

                {/* Add transaction button (Pengurus / Treasurer only) */}
                {isUserPengurus && (
                  <button
                    onClick={() => setIsAddingTx(true)}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-blue-500/20"
                  >
                    <Plus size={14} />
                    Catat Transaksi
                  </button>
                )}
              </div>
            </div>

            {/* List Table */}
            <div className="overflow-x-auto border border-white/5 rounded-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-white/3 border-b border-white/5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    <th className="py-3 px-4">Tanggal</th>
                    <th className="py-3 px-4">Tipe</th>
                    <th className="py-3 px-4">Kategori</th>
                    <th className="py-3 px-4">Deskripsi</th>
                    <th className="py-3 px-4">Pencatat</th>
                    <th className="py-3 px-4 text-right">Jumlah</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {filteredTxs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-slate-500">
                        Tidak ada transaksi keuangan ditemukan
                      </td>
                    </tr>
                  ) : (
                    filteredTxs.map(tx => (
                      <tr key={tx.id} className="hover:bg-white/2 transition-colors">
                        <td className="py-3.5 px-4 text-slate-300 font-mono">{tx.date}</td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-semibold text-[10px] ${
                            tx.type === 'masuk' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                          }`}>
                            {tx.type === 'masuk' ? (
                              <>
                                <ArrowUpRight size={10} />
                                Masuk
                              </>
                            ) : (
                              <>
                                <ArrowDownLeft size={10} />
                                Keluar
                              </>
                            )}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-300">{tx.category}</td>
                        <td className="py-3.5 px-4">
                          <div>
                            <span className="text-white font-medium">{tx.description}</span>
                            {tx.memberName && (
                              <p className="text-[10px] text-slate-400 mt-0.5">Oleh Anggota: {tx.memberName}</p>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">{tx.recordedBy}</td>
                        <td className={`py-3.5 px-4 text-right font-mono font-bold text-sm ${
                          tx.type === 'masuk' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {tx.type === 'masuk' ? '+' : '-'} Rp {tx.amount.toLocaleString('id-ID')}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* Quick Informative Panel regarding cash dues obligation & Configurable rate */}
          <div className="p-4 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="text-blue-400 mt-0.5 shrink-0" size={16} />
              <div className="text-xs text-slate-300 space-y-1">
                <strong className="text-white">Kebijakan Kas Mahasiswa:</strong>
                <p className="leading-relaxed">
                  Setiap jajaran pengurus dan anggota portal wajib membayar uang kas sebesar <strong>Rp {PRICE_PER_MONTH.toLocaleString('id-ID')} / bulan</strong> untuk operasional organisasi. 
                  Penyalahgunaan dana kas akan berakibat pada sanksi administratif dan penangguhan hak berorganisasi. Pembukuan kas diperbaharui Bendahara secara berkala.
                </p>
              </div>
            </div>

            {isUserBendaharaOrKetua && (
              <div className="flex items-center gap-2 bg-white/5 p-2 rounded-xl border border-white/10 w-full md:w-auto self-stretch md:self-auto justify-between sm:justify-start">
                <span className="text-[11px] font-semibold text-slate-300 whitespace-nowrap">Tarif Kas Bulanan:</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-slate-400">Rp</span>
                  <input
                    type="number"
                    value={duesRate}
                    onChange={(e) => {
                      const val = parseInt(e.target.value, 10) || 0;
                      setDuesRate(val);
                      localStorage.setItem('HIMPALUBI_DUES_RATE', val.toString());
                      window.dispatchEvent(new Event('localDbUpdate'));
                    }}
                    className="w-20 px-2 py-1 bg-black/40 border border-white/10 rounded-lg text-xs text-emerald-400 font-bold focus:outline-none focus:border-blue-500 text-center"
                    min="0"
                    step="1000"
                  />
                </div>
              </div>
            )}
          </div>

        </div>
      )}

      {/* SUBTAB CONTENT 2: MATRIX GRID OF ALL MEMBERS AND THEIR PAYMENT MONTHS */}
      {activeSubTab === 'member-dues' && (
        <div className="glass-panel border border-white/10 rounded-2xl p-5 shadow-xl space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-4">
            <div>
              <h3 className="font-display font-bold text-white flex items-center gap-2">
                <UserCheck size={16} className="text-blue-400" />
                Buku Kendali Iuran Kas Anggota
              </h3>
              <p className="text-[11px] text-slate-400">Arsip pembayaran bulanan terperinci seluruh pengurus dan anggota organisasi</p>
            </div>

            {/* SEGMENTED CONTROL FOR ROLE SEPARATION */}
            <div className="flex bg-white/3 p-1 rounded-xl border border-white/10 self-start sm:self-center">
              <button
                type="button"
                onClick={() => setMemberTypeView('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  memberTypeView === 'all'
                    ? 'bg-blue-600 text-white font-bold shadow-md shadow-blue-500/15'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                🗳️ Semua
              </button>
              <button
                type="button"
                onClick={() => setMemberTypeView('pengurus')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  memberTypeView === 'pengurus'
                    ? 'bg-amber-600 text-white font-bold shadow-md shadow-amber-500/15'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Crown size={12} /> Pengurus
              </button>
              <button
                type="button"
                onClick={() => setMemberTypeView('anggota')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1 ${
                  memberTypeView === 'anggota'
                    ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/15'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Users size={12} /> Anggota Biasa
              </button>
            </div>
          </div>

          {/* TABLE RENDERING BLOCK */}
          <div className="space-y-8">
            {/* 1. SECTION: PENGURUS ORGANISASI */}
            {(memberTypeView === 'all' || memberTypeView === 'pengurus') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-amber-500/5 px-4 py-2 rounded-xl border border-amber-500/10">
                  <div className="flex items-center gap-2">
                    <Crown size={15} className="text-amber-400 animate-pulse" />
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider">Golongan Pengurus Organisasi (BPH & Bidang)</h4>
                  </div>
                  <span className="text-[10px] font-bold bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/20">
                    {pengurusRecords.length} Personel
                  </span>
                </div>

                <div className="overflow-x-auto border border-white/5 rounded-xl bg-[#0b0e17]/30">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/3 border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 px-4">Pengurus</th>
                        <th className="py-2.5 px-4">Divisi / Jabatan</th>
                        {AVAILABLE_MONTHS.map(month => (
                          <th key={month.value} className="py-2.5 px-4 text-center">{month.label}</th>
                        ))}
                        <th className="py-2.5 px-4 text-right">Total Terbayar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {pengurusRecords.length === 0 ? (
                        <tr>
                          <td colSpan={3 + AVAILABLE_MONTHS.length} className="text-center py-6 text-slate-500 text-xs">
                            Belum ada data pengurus.
                          </td>
                        </tr>
                      ) : (
                        pengurusRecords.map(record => (
                          <tr key={record.userId} className="hover:bg-white/2 transition-colors">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <img 
                                  src={record.avatar} 
                                  alt={record.userName} 
                                  className="w-7 h-7 rounded-full object-cover border border-amber-500/20" 
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <span className="font-bold text-white block leading-tight">{record.userName}</span>
                                  {record.userId === currentUser.id && (
                                    <span className="inline-block mt-0.5 px-1 py-0.2 bg-blue-500/20 text-blue-400 text-[8px] font-bold rounded">Anda</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-amber-200/90 font-medium">
                              <span className="inline-flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md text-[10px] border border-amber-500/20">
                                {record.division}
                              </span>
                            </td>
                            
                            {AVAILABLE_MONTHS.map(month => {
                              const status = record.payments[month.value] || 'belum_bayar';
                              return (
                                <td key={month.value} className="py-2.5 px-4 text-center">
                                  {status === 'lunas' ? (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px]">
                                      <Check size={10} /> Lunas
                                    </span>
                                  ) : status === 'pending' ? (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold text-[10px] animate-pulse" title="Bukti transfer terunggah, menunggu persetujuan Bendahara">
                                      <Clock size={10} /> Pending
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold text-[10px]">
                                      <X size={10} /> Belum Bayar
                                    </span>
                                  )}
                                </td>
                              );
                            })}

                            <td className="py-2.5 px-4 text-right font-bold text-white font-mono text-sm">
                              Rp {record.totalPaid.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 2. SECTION: ANGGOTA BIASA */}
            {(memberTypeView === 'all' || memberTypeView === 'anggota') && (
              <div className="space-y-3">
                <div className="flex items-center justify-between bg-indigo-500/5 px-4 py-2 rounded-xl border border-indigo-500/10">
                  <div className="flex items-center gap-2">
                    <Users size={15} className="text-indigo-400" />
                    <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Golongan Anggota Umum / Biasa</h4>
                  </div>
                  <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/20">
                    {anggotaRecords.length} Personel
                  </span>
                </div>

                <div className="overflow-x-auto border border-white/5 rounded-xl bg-[#0b0e17]/30">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-white/3 border-b border-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <th className="py-2.5 px-4">Anggota</th>
                        <th className="py-2.5 px-4">Divisi / Jabatan</th>
                        {AVAILABLE_MONTHS.map(month => (
                          <th key={month.value} className="py-2.5 px-4 text-center">{month.label}</th>
                        ))}
                        <th className="py-2.5 px-4 text-right">Total Terbayar</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-xs">
                      {anggotaRecords.length === 0 ? (
                        <tr>
                          <td colSpan={3 + AVAILABLE_MONTHS.length} className="text-center py-6 text-slate-500 text-xs">
                            Belum ada data anggota biasa.
                          </td>
                        </tr>
                      ) : (
                        anggotaRecords.map(record => (
                          <tr key={record.userId} className="hover:bg-white/2 transition-colors">
                            <td className="py-2.5 px-4">
                              <div className="flex items-center gap-2.5">
                                <img 
                                  src={record.avatar} 
                                  alt={record.userName} 
                                  className="w-7 h-7 rounded-full object-cover border border-indigo-500/10" 
                                  referrerPolicy="no-referrer"
                                />
                                <div>
                                  <span className="font-bold text-white block leading-tight">{record.userName}</span>
                                  {record.userId === currentUser.id && (
                                    <span className="inline-block mt-0.5 px-1 py-0.2 bg-blue-500/20 text-blue-400 text-[8px] font-bold rounded">Anda</span>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="py-2.5 px-4 text-slate-300 font-medium">
                              <span className="inline-flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded-md text-[10px] border border-white/5">
                                {record.division}
                              </span>
                            </td>
                            
                            {AVAILABLE_MONTHS.map(month => {
                              const status = record.payments[month.value] || 'belum_bayar';
                              return (
                                <td key={month.value} className="py-2.5 px-4 text-center">
                                  {status === 'lunas' ? (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-bold text-[10px]">
                                      <Check size={10} /> Lunas
                                    </span>
                                  ) : status === 'pending' ? (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 font-bold text-[10px] animate-pulse" title="Bukti transfer terunggah, menunggu persetujuan Bendahara">
                                      <Clock size={10} /> Pending
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 font-bold text-[10px]">
                                      <X size={10} /> Belum Bayar
                                    </span>
                                  )}
                                </td>
                              );
                            })}

                            <td className="py-2.5 px-4 text-right font-bold text-white font-mono text-sm">
                              Rp {record.totalPaid.toLocaleString('id-ID')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500 flex flex-wrap gap-4 pt-1 border-t border-white/5">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-400" /> **Lunas**: Diterima Bendahara</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" /> **Pending**: Bukti diunggah, antrean verifikasi</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-rose-400" /> **Belum Bayar**: Belum ada transaksi</span>
          </div>
        </div>
      )}

      {/* SUBTAB CONTENT 3: PAY DUES SIMULATOR */}
      {activeSubTab === 'pay' && (
        <div className="max-w-2xl mx-auto glass-panel border border-white/10 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="w-12 h-12 bg-blue-500/15 text-blue-400 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
              <CreditCard size={22} />
            </div>
            <h3 className="text-lg font-display font-bold text-white">Simulator Pembayaran Kas Mandiri</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Sistem simulasi transfer perbankan digital. Pembayaran kas Anda akan dilaporkan real-time ke Bendahara untuk diverifikasi.
            </p>
          </div>

          {/* PAYMENT STEP 1: SELECT MONTHS AND METHOD */}
          {paymentStep === 1 && (
            <form onSubmit={handlePaySubmit} className="space-y-5">
              
              {/* Checklist Month Selection */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">1. Pilih Bulan Yang Ingin Dibayar (Tarif Rp 20.000/bulan):</label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {AVAILABLE_MONTHS.map(month => {
                    const existingStatus = myKasRecord?.payments[month.value] || 'belum_bayar';
                    const isChecked = payForm.months.includes(month.value);
                    const isDisabled = existingStatus === 'lunas' || existingStatus === 'pending';

                    return (
                      <button
                        type="button"
                        key={month.value}
                        disabled={isDisabled}
                        onClick={() => handleToggleMonthToPay(month.value)}
                        className={`p-3.5 border rounded-xl text-left transition-all ${
                          existingStatus === 'lunas' 
                            ? 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400 opacity-60' 
                            : existingStatus === 'pending'
                            ? 'bg-amber-500/5 border-amber-500/10 text-amber-400 opacity-60'
                            : isChecked
                            ? 'bg-blue-600/10 border-blue-500 text-blue-400 shadow-md scale-95'
                            : 'bg-white/3 border-white/10 hover:border-white/20 text-slate-300'
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold">{month.label}</span>
                          <input
                            type="checkbox"
                            checked={isChecked || existingStatus === 'lunas' || existingStatus === 'pending'}
                            disabled={isDisabled}
                            readOnly
                            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-0 cursor-pointer pointer-events-none"
                          />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">
                          {existingStatus === 'lunas' ? 'LUNAS (Selesai)' : existingStatus === 'pending' ? 'PENDING (Verifikasi)' : 'Tarif: Rp 20.000'}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Dynamic total pricing box */}
              {payForm.months.length > 0 && (
                <div className="p-3 bg-white/3 border border-white/5 rounded-xl flex justify-between items-center text-xs animate-scale-up">
                  <span className="text-slate-400 font-medium">Bulan terpilih: {payForm.months.length} x Rp 20.000</span>
                  <span className="font-mono font-bold text-white text-sm">
                    Total Tagihan: <strong className="text-blue-400">Rp {(payForm.months.length * PRICE_PER_MONTH).toLocaleString('id-ID')}</strong>
                  </span>
                </div>
              )}

              {/* Payment Method Selector */}
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-300">2. Pilih Metode Pembayaran:</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPayForm({ ...payForm, method: 'qris' })}
                    className={`py-3 px-4 border rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      payForm.method === 'qris'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                        : 'bg-white/3 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <QrCode size={16} />
                    QRIS Otomatis (Gopay / ShopeePay)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayForm({ ...payForm, method: 'transfer' })}
                    className={`py-3 px-4 border rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all ${
                      payForm.method === 'transfer'
                        ? 'bg-blue-600 border-blue-500 text-white shadow-lg'
                        : 'bg-white/3 border-white/10 text-slate-400 hover:border-white/20'
                    }`}
                  >
                    <CreditCard size={16} />
                    Transfer Bank BCA / Mandiri Himpunan
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={payForm.months.length === 0}
                className={`w-full py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  payForm.months.length === 0
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/20'
                }`}
              >
                Lanjutkan ke Pembayaran
              </button>

            </form>
          )}

          {/* PAYMENT STEP 2: SHOW GATEWAY METHOD & SIMULATE PROOF UPLOAD */}
          {paymentStep === 2 && (
            <div className="space-y-5 animate-scale-up">
              
              {/* Payment Info instructions depending on method */}
              <div className="p-4 bg-white/3 border border-white/10 rounded-xl space-y-4">
                <div className="flex justify-between items-center pb-2 border-b border-white/10 text-xs">
                  <span className="text-slate-400">Total Nominal Pembayaran:</span>
                  <span className="font-mono font-bold text-lg text-blue-400">Rp {(payForm.months.length * PRICE_PER_MONTH).toLocaleString('id-ID')}</span>
                </div>

                {payForm.method === 'qris' ? (
                  <div className="flex flex-col items-center gap-3 text-center">
                    <span className="text-xs font-bold text-white uppercase tracking-wider">Pindai QRIS Resmi Himpunan</span>
                    <div className="p-3 bg-white rounded-xl border-4 border-blue-200">
                      {/* Simulation vector SVG for QR Code */}
                      <svg width="140" height="140" viewBox="0 0 120 120" className="text-slate-950">
                        <rect width="120" height="120" fill="white" />
                        <rect x="10" y="10" width="30" height="30" fill="black" />
                        <rect x="15" y="15" width="20" height="20" fill="white" />
                        <rect x="18" y="18" width="14" height="14" fill="black" />
                        
                        <rect x="80" y="10" width="30" height="30" fill="black" />
                        <rect x="85" y="15" width="20" height="20" fill="white" />
                        <rect x="88" y="18" width="14" height="14" fill="black" />
                        
                        <rect x="10" y="80" width="30" height="30" fill="black" />
                        <rect x="15" y="85" width="20" height="20" fill="white" />
                        <rect x="18" y="88" width="14" height="14" fill="black" />
                        
                        {/* Random center clusters */}
                        <rect x="50" y="50" width="20" height="20" fill="black" />
                        <rect x="45" y="15" width="10" height="20" fill="black" />
                        <rect x="65" y="15" width="10" height="10" fill="black" />
                        <rect x="55" y="80" width="20" height="10" fill="black" />
                        <rect x="80" y="55" width="15" height="15" fill="black" />
                        <rect x="80" y="85" width="25" height="25" fill="black" />
                        <rect x="85" y="90" width="15" height="15" fill="white" />
                      </svg>
                    </div>
                    <span className="text-[10px] text-slate-400">Scan QRIS menggunakan Gopay, OVO, Dana, LinkAja, atau Mobile Banking</span>
                  </div>
                ) : (
                  <div className="space-y-2.5 text-xs">
                    <span className="font-bold text-white block">Selesaikan Transfer ke Rekening Organisasi:</span>
                    <div className="p-3 bg-[#0a0d16] rounded-xl border border-white/5 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Bank BCA Cabang Utama:</span>
                        <span className="font-bold font-mono text-white select-all text-sm tracking-wider">8849-1123-4556</span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Atas Nama (Bendahara):</span>
                        <span className="font-bold text-white">Siti Rahma (Bendahara Portal)</span>
                      </div>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      Pastikan nominal transfer sama persis. Setelah berhasil mentransfer, simpan resinya lalu unggah di formulir bawah ini.
                    </p>
                  </div>
                )}
              </div>

              {/* Receipt Uploader simulator */}
              <div className="space-y-4">
                <label className="block text-xs font-semibold text-slate-300">3. Unggah Bukti Transfer / Capture Resi:</label>
                
                {/* Visual Preset choices for easy UI demo testing */}
                <div className="space-y-2">
                  <span className="text-[10px] text-slate-400 block font-medium">Klik salah satu struk transfer di bawah ini (Demo Instan):</span>
                  <div className="grid grid-cols-3 gap-2">
                    {RECEIPT_PRESETS.map((p, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => setPayForm({ ...payForm, receiptPreset: p.url })}
                        className={`p-2 bg-white/2 hover:bg-white/5 rounded-xl border text-left transition-all ${
                          payForm.receiptPreset === p.url ? 'border-blue-500 bg-blue-500/5' : 'border-white/5'
                        }`}
                      >
                        <div className="relative aspect-video rounded overflow-hidden mb-1">
                          <img src={p.url} className="w-full h-full object-cover" />
                        </div>
                        <span className="text-[8px] font-bold text-slate-300 truncate block text-center">{p.name}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Custom Input for images */}
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block font-medium">Atau masukkan URL Bukti Transfer kustom (Opsional):</span>
                  <input
                    type="text"
                    placeholder="https://struk-bukti-bayar.jpg..."
                    value={payForm.customReceiptUrl}
                    onChange={e => setPayForm({ ...payForm, customReceiptUrl: e.target.value })}
                    className="w-full glass-input rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setPaymentStep(1)}
                  className="flex-1 py-2 bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Ganti Pilihan Bulan
                </button>
                <button
                  type="button"
                  onClick={handleConfirmSimulatorPayment}
                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-lg shadow-emerald-500/20"
                >
                  Kirim Bukti Pembayaran
                </button>
              </div>

            </div>
          )}

          {/* PAYMENT STEP 3: TRANSACTION REGISTERED / COMPLETED */}
          {paymentStep === 3 && (
            <div className="text-center space-y-4 py-4 animate-scale-up">
              <div className="w-14 h-14 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <Check size={26} className="animate-bounce" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base font-bold text-white">Bukti Bayar Sukses Dikirim!</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
                  Laporan iuran Kas sebesar **Rp {(payForm.months.length * PRICE_PER_MONTH).toLocaleString('id-ID')}** untuk bulan **{payForm.months.join(', ')}** telah berhasil diarsip.
                </p>
                <p className="text-[11px] text-amber-400">
                  Status iuran Anda sekarang menjadi **PENDING**. Bendahara Siti Rahma akan mengecek mutasi masuk dan memperbarui buku kas.
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetPaymentForm}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-lg"
              >
                Selesai & Kembali ke Buku Besar
              </button>
            </div>
          )}

        </div>
      )}

      {/* SUBTAB CONTENT 4: TREASURER APPROVAL CENTER (Pengurus only) */}
      {activeSubTab === 'approval' && isUserPengurus && (
        <div className="glass-panel border border-white/10 rounded-2xl p-5 shadow-xl space-y-4">
          <div>
            <h3 className="font-display font-bold text-white flex items-center gap-2">
              <Receipt size={16} className="text-blue-400" />
              Verifikasi Bukti Transfer Kas
            </h3>
            <p className="text-[11px] text-slate-400">Sistem validasi mutasi masuk dari setoran iuran mandiri yang diunggah anggota</p>
          </div>

          {pendingApprovals.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <UserCheck size={40} className="mx-auto mb-3 opacity-35" />
              <p className="text-xs font-medium">Antrean bersih! Belum ada bukti iuran baru yang dilaporkan.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {pendingApprovals.map((req, index) => (
                <div key={index} className="p-4 bg-white/3 border border-white/10 rounded-2xl flex flex-col justify-between gap-4 shadow-lg">
                  <div className="space-y-3">
                    {/* Member profile header info */}
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-white/5">
                      <img src={req.avatar} className="w-8 h-8 rounded-full object-cover" />
                      <div>
                        <h4 className="text-xs font-bold text-white leading-tight">{req.userName}</h4>
                        <p className="text-[10px] text-slate-400 leading-tight">{req.division}</p>
                      </div>
                    </div>

                    {/* Request info details */}
                    <div className="space-y-1.5 text-[11px]">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Mengajukan Iuran:</span>
                        <span className="font-bold text-white uppercase">{req.months.join(', ')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Total Transfer:</span>
                        <span className="font-mono font-bold text-blue-400">Rp {req.totalAmount.toLocaleString('id-ID')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Metode Bayar:</span>
                        <span className="font-bold text-slate-300">QRIS / M-Banking</span>
                      </div>
                    </div>

                    {/* Receipt screen preview */}
                    <div className="space-y-1">
                      <span className="text-[10px] text-slate-400 font-bold block">Lampiran Resi Bukti Transfer:</span>
                      <div className="relative aspect-video rounded-xl overflow-hidden border border-white/10 bg-slate-950">
                        <img 
                          src="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=300" 
                          alt="Bukti Resi" 
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-[#000]/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                          <a 
                            href="https://images.unsplash.com/photo-1620712943543-bcc4688e7485?auto=format&fit=crop&q=80&w=600" 
                            target="_blank" 
                            rel="noreferrer"
                            className="px-2.5 py-1.5 bg-[#000]/80 rounded-lg text-[10px] font-bold text-white border border-white/10"
                          >
                            Buka Gambar Penuh
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions to approve/reject */}
                  <div className="flex gap-2 pt-2 border-t border-white/5">
                    <button
                      type="button"
                      onClick={() => handleRejectPayment(req.userId, req.months)}
                      className="flex-1 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Tolak Resi
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApprovePayment(req.userId, req.months)}
                      className="flex-1 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-[10px] font-bold cursor-pointer transition-colors shadow-lg"
                    >
                      Setujui (Lunas)
                    </button>
                  </div>

                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* COMPONENT MODAL: RECORD TRANSACTION MANUALLY (Pengurus only) */}
      {isAddingTx && isUserPengurus && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-white/10 animate-scale-up">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/3">
              <h3 className="font-display font-bold text-white flex items-center gap-2">
                <Coins size={18} className="text-blue-400" />
                Catat Transaksi Keuangan Baru
              </h3>
              <button onClick={() => setIsAddingTx(false)} className="text-slate-400 hover:text-white cursor-pointer bg-transparent border-none">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddTransactionSubmit} className="p-6 space-y-4">
              {/* Type toggle: Masuk / Keluar */}
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-400">Jenis Transaksi:</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, type: 'masuk' })}
                    className={`py-2 px-3 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      txForm.type === 'masuk'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 font-bold'
                        : 'bg-white/3 border-white/10 text-slate-400'
                    }`}
                  >
                    <ArrowUpRight size={14} />
                    Uang Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setTxForm({ ...txForm, type: 'keluar' })}
                    className={`py-2 px-3 border rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                      txForm.type === 'keluar'
                        ? 'bg-rose-500/10 border-rose-500/30 text-rose-400 font-bold'
                        : 'bg-white/3 border-white/10 text-slate-400'
                    }`}
                  >
                    <ArrowDownLeft size={14} />
                    Uang Keluar
                  </button>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Nominal Transaksi (Rupiah):</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">Rp</span>
                  <input
                    type="number"
                    required
                    placeholder="100000"
                    value={txForm.amount}
                    onChange={e => setTxForm({ ...txForm, amount: e.target.value })}
                    className="w-full glass-input rounded-xl pl-9 pr-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 font-mono"
                  />
                </div>
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Kategori Transaksi:</label>
                <select
                  value={txForm.category}
                  onChange={e => setTxForm({ ...txForm, category: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="Uang Kas Bulanan" className="bg-[#0e1320]">Uang Kas Bulanan</option>
                  <option value="Sponsor" className="bg-[#0e1320]">Sponsor / Hibah</option>
                  <option value="Sisa Kegiatan" className="bg-[#0e1320]">Sisa Dana Kegiatan</option>
                  <option value="Konsumsi" className="bg-[#0e1320]">Konsumsi Rapat</option>
                  <option value="Perlengkapan" className="bg-[#0e1320]">Perlengkapan & Logistik</option>
                  <option value="Media" className="bg-[#0e1320]">Branding & Media</option>
                  <option value="Lainnya" className="bg-[#0e1320]">Lain-lain</option>
                </select>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Keterangan / Deskripsi Kegiatan:</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Pembelian Snack Rapat LPJ"
                  value={txForm.description}
                  onChange={e => setTxForm({ ...txForm, description: e.target.value })}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Related member name (Optional) */}
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-400">Atas Nama Anggota (Opsional):</label>
                <input
                  type="text"
                  placeholder="Contoh: Farhan Azhar"
                  value={txForm.memberName}
                  onChange={e => setTxForm({ ...txForm, memberName: e.target.value })}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Footer buttons */}
              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddingTx(false)}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-xs sm:text-sm font-semibold hover:bg-white/10 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  Posting Transaksi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
