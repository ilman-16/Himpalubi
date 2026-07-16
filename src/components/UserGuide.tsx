import React, { useState } from 'react';
import { 
  HelpCircle, 
  BookOpen, 
  Users, 
  Calendar, 
  FileText, 
  Coins, 
  Shield, 
  QrCode, 
  Database, 
  Globe, 
  Palette, 
  Smartphone, 
  CheckCircle, 
  ArrowRight,
  Lock,
  Unlock,
  AlertCircle
} from 'lucide-react';

export default function UserGuide() {
  const [activeTopic, setActiveTopic] = useState<'overview' | 'attendance' | 'finance' | 'admin' | 'tech'>('overview');
  const [themeColor, setThemeColor] = useState(() => localStorage.getItem('HIMPALUBI_THEME_COLOR') || 'blue');
  const [orgLogo, setOrgLogo] = useState(() => localStorage.getItem('HIMPALUBI_ORG_LOGO') || '');

  const topics = [
    { id: 'overview', label: 'Ringkasan Sistem', icon: BookOpen, desc: 'Pengenalan umum Portal HIMPALUBI' },
    { id: 'attendance', label: 'Presensi & QR Code', icon: QrCode, desc: 'Cara kerja absensi digital & geo-location' },
    { id: 'finance', label: 'Kas & Keuangan', icon: Coins, desc: 'Detail pencatatan kas, QRIS & transparansi' },
    { id: 'admin', label: 'Kelola Anggota & Peran', icon: Users, desc: 'Panduan hak akses Pengurus vs Anggota' },
    { id: 'tech', label: 'Kapasitas, Warna & Logo', icon: Palette, desc: 'Pertanyaan umum seputar logo, warna & kuota' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Buku Petunjuk Penggunaan (User Manual)</h2>
        <p className="text-xs sm:text-sm text-slate-400">Panduan lengkap pengoperasian Portal Digital HIMPALUBI Periode 2026/2027</p>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar Topics */}
        <div className="lg:col-span-3 space-y-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block px-2">Daftar Isi Panduan</span>
          <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto pb-2 lg:pb-0 scrollbar-none whitespace-nowrap">
            {topics.map(topic => {
              const Icon = topic.icon;
              return (
                <button
                  key={topic.id}
                  onClick={() => setActiveTopic(topic.id as any)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer text-left w-full border ${
                    activeTopic === topic.id
                      ? 'bg-blue-600/10 border-blue-500/30 text-blue-400 shadow-md'
                      : 'border-transparent text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon size={16} className="shrink-0" />
                  <div className="hidden lg:block">
                    <p className="font-bold leading-tight">{topic.label}</p>
                    <p className="text-[10px] text-slate-400 font-normal mt-0.5 whitespace-normal">{topic.desc}</p>
                  </div>
                  <span className="lg:hidden">{topic.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Content Panel */}
        <div className="lg:col-span-9 glass-panel rounded-2xl p-6 sm:p-8 shadow-xl min-h-[450px] flex flex-col justify-between">
          
          {activeTopic === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl">
                  <BookOpen size={22} />
                </span>
                <div>
                  <h3 className="font-display font-bold text-white text-base sm:text-lg">Pengenalan Portal Digital HIMPALUBI</h3>
                  <p className="text-xs text-slate-400">Hub Integrasi Pelayanan Mahasiswa Pendidikan Luar Biasa (PLB)</p>
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Portal ini dirancang khusus untuk memfasilitasi kebutuhan administrasi, pencatatan kegiatan, dan transparansi keuangan di lingkungan <strong>Himpunan Mahasiswa Pendidikan Luar Biasa (HIMPALUBI)</strong>. Dengan sistem terintegrasi, seluruh jajaran pengurus dan anggota biasa dapat berkolaborasi secara real-time.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="p-4 bg-white/3 border border-white/5 rounded-xl">
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <Shield size={14} className="text-blue-400" />
                    Keamanan Tingkat Tinggi
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Sistem dilengkapi dengan fitur otentikasi dua faktor (2FA) berbasis kode rahasia autentikator untuk melindungi data sensitif organisasi.
                  </p>
                </div>

                <div className="p-4 bg-white/3 border border-white/5 rounded-xl">
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <Database size={14} className="text-emerald-400" />
                    Sistem Offline-First
                  </h4>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    Tetap bisa digunakan tanpa koneksi internet! Data presensi dan berita acara akan disimpan lokal, lalu disinkronisasi ke Google Cloud secara otomatis saat internet kembali online.
                  </p>
                </div>
              </div>

              <div className="p-4 bg-blue-500/5 border border-blue-500/15 rounded-xl flex items-start gap-3 mt-4">
                <AlertCircle size={16} className="text-blue-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-400 leading-relaxed">
                  <strong>Tips Demo:</strong> Anda dapat beralih peran antara <span className="text-blue-400 font-semibold">Pengurus (Bisa Edit)</span> dan <span className="text-slate-200 font-semibold">Anggota Biasa (Melihat)</span> menggunakan tombol ganti akun di sudut kanan atas layar untuk mencoba semua simulasi fitur.
                </p>
              </div>
            </div>
          )}

          {activeTopic === 'attendance' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <span className="p-2 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <QrCode size={22} />
                </span>
                <div>
                  <h3 className="font-display font-bold text-white text-base sm:text-lg">Panduan Absensi Digital & QR Code</h3>
                  <p className="text-xs text-slate-400">Prosedur absensi mandiri, pemindaian QR, dan validasi lokasi GPS</p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-300">
                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">1</span>
                  <div>
                    <h4 className="font-bold text-white">Membuat Kegiatan (Pengurus)</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Pengurus membuka menu <strong>"Jadwal & Presensi"</strong> dan menambahkan kegiatan baru. Saat membuat kegiatan, pengurus menentukan titik koordinat lokasi (Latitude & Longitude) serta radius batas toleransi kehadiran (dalam meter).
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">2</span>
                  <div>
                    <h4 className="font-bold text-white">Membuka Absensi Mandiri & QR Code</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Saat rapat dimulai, Pengurus mengklik <strong>"Buka Absen Mandiri & Tampilkan QR"</strong>. Kode QR interaktif yang aman akan digenerate otomatis di layar proyektor atau perangkat pengurus.
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">3</span>
                  <div>
                    <h4 className="font-bold text-white">Melakukan Absen (Anggota)</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Anggota yang hadir membuka Portal ini, mengklik tombol <strong>"Absen Sekarang"</strong>. Sistem akan meminta izin akses GPS (Geo-location) untuk memverifikasi apakah anggota benar-benar berada di lokasi kegiatan. Jika koordinat valid dan berada dalam radius aman, absen dinyatakan berhasil!
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">4</span>
                  <div>
                    <h4 className="font-bold text-white">Rekap Absensi Otomatis</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Semua data kehadiran secara otomatis direkap secara dinamis di tab <strong>"Rekap Absensi"</strong> lengkap dengan diagram persentase kehadiran setiap anggota untuk mempermudah evaluasi keaktifan.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTopic === 'finance' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <span className="p-2 bg-amber-500/10 text-amber-400 rounded-xl">
                  <Coins size={22} />
                </span>
                <div>
                  <h3 className="font-display font-bold text-white text-base sm:text-lg">Sistem Transparansi Keuangan & Uang Kas</h3>
                  <p className="text-xs text-slate-400">Pencatatan kas masuk, kas keluar, pembayaran iuran bulanan via QRIS</p>
                </div>
              </div>

              <div className="space-y-4">
                <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                  Modul <strong>"Kas Organisasi"</strong> dirancang transparan sehingga seluruh anggota dapat memantau keluar masuknya dana iuran serta saldo kas real-time secara mendetail.
                </p>

                <div className="p-4 bg-[#0a0e1a] border border-white/5 rounded-xl space-y-3">
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <CheckCircle size={14} className="text-emerald-400" />
                    Apakah Pencatatan Transaksinya Sangat Detail?
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    <strong>Ya, sangat detail!</strong> Sistem mencatat setiap elemen keuangan berikut ini:
                  </p>
                  <ul className="text-xs text-slate-400 list-disc list-inside space-y-1 pl-1">
                    <li><strong className="text-slate-200">Arus Kas Masuk & Keluar:</strong> Nominal transaksi, kategori pengeluaran/pemasukan, keterangan deskripsi, serta tanggal pencatatan.</li>
                    <li><strong className="text-slate-200">Kartu Iuran Anggota:</strong> Status pembayaran uang kas bulanan per individu (contoh: status Lunas, Belum Bayar, atau Pending untuk setiap bulan).</li>
                    <li><strong className="text-slate-200">Bukti Fisik (Resi/Struk):</strong> Dilengkapi tautan bukti transaksi visual (struk m-banking atau resi transfer bank).</li>
                    <li><strong className="text-slate-200">Alur Verifikasi Bendahara:</strong> Pembayaran kas oleh anggota tidak langsung tercatat di kas utama. Sistem menampungnya di tab <span className="text-amber-400">Persetujuan (Approval)</span> terlebih dahulu. Hanya setelah Bendahara melakukan verifikasi kebenaran transfer, saldo kas utama akan otomatis bertambah!</li>
                  </ul>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3 bg-white/3 border border-white/5 rounded-xl">
                    <span className="font-bold text-white block">Metode Pembayaran Mandiri:</span>
                    <span className="text-slate-400 mt-1 block leading-relaxed">
                      Anggota biasa dapat memilih bulan yang ingin dibayar, mengunduh QRIS pembayaran otomatis, mentransfer, lalu memasukkan bukti struk transfer untuk diverifikasi bendahara.
                    </span>
                  </div>
                  <div className="p-3 bg-white/3 border border-white/5 rounded-xl">
                    <span className="font-bold text-white block">Pencatatan Manual Bendahara:</span>
                    <span className="text-slate-400 mt-1 block leading-relaxed">
                      Bendahara juga dapat menginput uang kas masuk secara langsung secara manual (jika dibayar tunai) atau menginput pengeluaran organisasi untuk keperluan program kerja.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTopic === 'admin' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <span className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                  <Shield size={22} />
                </span>
                <div>
                  <h3 className="font-display font-bold text-white text-base sm:text-lg">Pengelolaan Anggota & Struktur Organisasi</h3>
                  <p className="text-xs text-slate-400">Penetapan peran hak akses, pembagian divisi, dan sunting anggota</p>
                </div>
              </div>

              <div className="space-y-4 text-xs sm:text-sm text-slate-300">
                <p className="leading-relaxed">
                  Struktur kepengurusan HIMPALUBI dibagi secara hierarki agar koordinasi berjalan optimal:
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 bg-blue-500/5 border border-blue-500/15 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-blue-400 font-bold">
                      <Unlock size={14} />
                      <h4>Hak Akses Pengurus</h4>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
                      <li>Menambah/mengedit jadwal rapat & kegiatan</li>
                      <li>Mengontrol pembukaan & penutupan QR Code Absen</li>
                      <li>Menginput kas masuk/keluar & memverifikasi iuran QRIS</li>
                      <li>Menambah/mengedit profil pengurus & anggota biasa</li>
                      <li>Membuat & menerbitkan Berita Acara Rapat (Notulen)</li>
                    </ul>
                  </div>

                  <div className="p-4 bg-white/3 border border-white/10 rounded-xl">
                    <div className="flex items-center gap-2 mb-2 text-slate-400 font-bold">
                      <Lock size={14} />
                      <h4>Hak Akses Anggota Biasa</h4>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
                      <li>Melihat data statistik keaktifan di Dasbor</li>
                      <li>Melakukan absensi mandiri dengan GPS & pemindai QR</li>
                      <li>Melaporkan pembayaran uang kas secara mandiri</li>
                      <li>Membaca berita acara rapat & dokumentasi foto</li>
                      <li>Melihat bagan struktur pengurus</li>
                    </ul>
                  </div>
                </div>

                <div className="p-3 bg-white/3 border border-white/5 rounded-xl text-xs text-slate-400 leading-relaxed">
                  <span className="font-bold text-white block mb-1">Menaikkan Status Anggota Biasa Menjadi Pengurus:</span>
                  Cukup masuk ke tab <strong>"Struktur & Pengurus"</strong>, pilih sub-tab <strong>"Anggota Biasa (Non-Pengurus)"</strong>, klik edit pada profil anggota yang diinginkan, lalu ubah jabatannya ke BPH atau Divisi spesifik yang diinginkan. Status aksesnya akan otomatis berubah secara instan!
                </div>
              </div>
            </div>
          )}

          {activeTopic === 'tech' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-white/10 pb-4">
                <span className="p-2 bg-pink-500/10 text-pink-400 rounded-xl">
                  <Palette size={22} />
                </span>
                <div>
                  <h3 className="font-display font-bold text-white text-base sm:text-lg">Kapasitas Data, Kostumisasi Logo & Warna</h3>
                  <p className="text-xs text-slate-400">Informasi teknis kuota pengguna, panduan mengubah tema warna, dan menambahkan logo</p>
                </div>
              </div>

              <div className="space-y-6">
                
                {/* 1. INTERAKTIF: Kustomisasi Tema Warna Utama */}
                <div className="p-5 bg-gradient-to-r from-pink-500/10 via-purple-500/10 to-indigo-500/10 border border-white/10 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Palette size={18} className="text-pink-400" />
                    <h4 className="text-xs sm:text-sm font-bold text-white">Panel Interaktif: Kustomisasi Warna Portal</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Ubah warna sorotan (accent color) seluruh sistem Portal HIMPALUBI secara langsung. Pilih warna favorit Anda untuk mengubah tema:
                  </p>
                  <div className="flex items-center gap-3">
                    {[
                      { id: 'blue', name: 'Sapphire Blue', bg: 'bg-blue-500' },
                      { id: 'emerald', name: 'Emerald Green', bg: 'bg-emerald-500' },
                      { id: 'purple', name: 'Amethyst Purple', bg: 'bg-purple-500' },
                      { id: 'amber', name: 'Amber Gold', bg: 'bg-amber-500' },
                      { id: 'rose', name: 'Rose Pink', bg: 'bg-rose-500' },
                    ].map((col) => (
                      <button
                        key={col.id}
                        onClick={() => {
                          localStorage.setItem('HIMPALUBI_THEME_COLOR', col.id);
                          setThemeColor(col.id);
                          window.dispatchEvent(new Event('localDbUpdate'));
                        }}
                        className={`w-8 h-8 rounded-full ${col.bg} relative transition-all hover:scale-110 active:scale-95 cursor-pointer flex items-center justify-center border-2 ${
                          themeColor === col.id ? 'border-white ring-2 ring-indigo-500 ring-offset-2 ring-offset-slate-950' : 'border-transparent'
                        }`}
                        title={col.name}
                      >
                        {themeColor === col.id && (
                          <span className="w-2 h-2 rounded-full bg-slate-950" />
                        )}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 italic">
                    *Sorotan warna saat ini aktif: <strong className="capitalize">{themeColor}</strong>. Perubahan langsung tersinkronisasi di kop utama!
                  </p>
                </div>

                {/* 2. INTERAKTIF: Unggah Logo Resmi */}
                <div className="p-5 bg-[#0a0e1a]/60 border border-white/5 rounded-2xl space-y-4">
                  <div className="flex items-center gap-2">
                    <Globe size={18} className="text-indigo-400" />
                    <h4 className="text-xs sm:text-sm font-bold text-white">Panel Interaktif: Unggah Logo Resmi HIMPALUBI</h4>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Sistem kini mendukung penggantian Logo langsung dari ponsel / galeri Anda tanpa perlu menyunting kode pemrograman. Logo baru akan langsung nampak di sebelah kiri atas kop Portal!
                  </p>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-4 bg-white/3 border border-white/5 rounded-xl">
                    <div className="w-16 h-16 rounded-xl bg-slate-900 border border-white/10 flex items-center justify-center p-1 shrink-0 overflow-hidden">
                      {orgLogo ? (
                        <img src={orgLogo} alt="Logo Baru" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="text-xs text-slate-500 font-mono text-center">Standard<br />Logo</span>
                      )}
                    </div>
                    
                    <div className="flex-1 text-center sm:text-left space-y-2">
                      <div className="flex items-center gap-2 justify-center sm:justify-start">
                        <label className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-400 border border-indigo-500/30 px-3.5 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors inline-block">
                          Unggah File Logo Baru
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) {
                                if (file.size > 2 * 1024 * 1024) {
                                  alert("Ukuran logo maksimal 2MB agar penyimpanan lancar.");
                                  return;
                                }
                                const reader = new FileReader();
                                reader.onloadend = () => {
                                  localStorage.setItem('HIMPALUBI_ORG_LOGO', reader.result as string);
                                  setOrgLogo(reader.result as string);
                                  window.dispatchEvent(new Event('localDbUpdate'));
                                };
                                reader.readAsDataURL(file);
                              }
                            }}
                            className="hidden" 
                          />
                        </label>
                        
                        {orgLogo && (
                          <button
                            onClick={() => {
                              localStorage.removeItem('HIMPALUBI_ORG_LOGO');
                              setOrgLogo('');
                              window.dispatchEvent(new Event('localDbUpdate'));
                            }}
                            className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          >
                            Kembalikan Default
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500">Maks. 2MB, format file gambar persegi (JPG/PNG) direkomendasikan.</p>
                    </div>
                  </div>
                </div>

                {/* 3. Kapasitas Data */}
                <div className="p-4 bg-white/3 border border-white/5 rounded-xl space-y-2">
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <Database size={15} className="text-blue-400" />
                    Berapa Kapasitas Maksimal Data Pengguna Portal Ini?
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Karena portal ini terintegrasi penuh dengan sistem cloud Google Firebase Firestore (NoSQL):
                  </p>
                  <ul className="text-[11px] text-slate-400 list-disc list-inside space-y-1.5 pl-1">
                    <li><strong className="text-slate-200">Kapasitas Anggota:</strong> Mampu menampung lebih dari <span className="text-blue-400 font-bold">50.000 hingga 100.000 anggota</span> beserta seluruh log histori absensi tanpa menurunkan performa aplikasi!</li>
                    <li><strong className="text-slate-200">Kapasitas Kas:</strong> Pencatatan uang iuran kas dapat menyimpan jutaan riwayat transaksi masuk dan keluar secara terinci ("detail banget").</li>
                    <li><strong className="text-slate-200">Batas Penyimpanan Gratis:</strong> Firebase Free Tier memberikan penyimpanan database sebesar <span className="text-emerald-400 font-bold">1 GB</span> secara cuma-cuma. Ini setara dengan file teks murni yang sangat masif (bebas biaya selamanya).</li>
                    <li><strong className="text-slate-200">Batas Operasi Harian:</strong> Menyediakan <span className="text-amber-400 font-bold">50.000 baca (reads)</span> dan <span className="text-amber-400 font-bold">20.000 tulis (writes)</span> gratis per hari, yang sangat berlebih untuk operasional Himpunan Mahasiswa PLB.</li>
                  </ul>
                </div>

                {/* 4. Cara Publish */}
                <div className="p-4 bg-white/3 border border-white/5 rounded-xl space-y-2">
                  <h4 className="text-xs sm:text-sm font-bold text-white flex items-center gap-2">
                    <Globe size={15} className="text-emerald-400" />
                    Panduan Mempublikasikan Portal Ini (Cara Publish)
                  </h4>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Untuk meluncurkan / merilis aplikasi ini agar bisa diakses oleh seluruh mahasiswa PLB secara umum di internet:
                  </p>
                  <ol className="text-[11px] text-slate-400 list-decimal list-inside space-y-2 pl-1 leading-relaxed">
                    <li><strong className="text-slate-200">Ekspor Kode Sumber:</strong> Klik menu pengaturan di AI Studio (ujung kanan atas), lalu pilih <strong>"Export as ZIP"</strong> atau hubungkan langsung ke <strong>"GitHub"</strong> Anda.</li>
                    <li><strong className="text-slate-200">Layanan Hosting Gratis Direkomendasikan:</strong> Anda dapat mempublish aplikasi web ini secara gratis menggunakan layanan hosting ramah mahasiswa:
                      <ul className="list-disc list-inside ml-4 mt-1 space-y-1 text-slate-400">
                        <li><strong>Firebase Hosting:</strong> Terintegrasi bawaan dengan Google Firebase Anda (Sangat direkomendasikan!).</li>
                        <li><strong>Vercel atau Netlify:</strong> Tinggal hubungkan repositori GitHub Anda, aplikasi akan langsung live dalam 2 menit.</li>
                      </ul>
                    </li>
                    <li><strong className="text-slate-200">Aktifkan Domain Kustom:</strong> Anda juga bisa menautkan domain resmi kampus (seperti <code className="text-slate-300 font-mono">himpalubi.univ.ac.id</code>) melalui panel kontrol penyedia hosting tersebut secara gratis.</li>
                  </ol>
                </div>

              </div>
            </div>
          )}

          {/* Bottom Navigation Info Footer inside current content */}
          <div className="mt-8 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
              <span>HIMPALUBI DIGITAL HUB v1.4</span>
            </div>
            <div className="flex gap-2">
              <span className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 rounded-md text-[10px] font-bold">
                Online Sync
              </span>
              <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-md text-[10px] font-bold">
                Geo-Location Ready
              </span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
