import React, { useState, useEffect } from 'react';
import { 
  Image as ImageIcon, 
  Upload, 
  MapPin, 
  Calendar, 
  Heart, 
  Plus, 
  X, 
  User, 
  Lock,
  Eye,
  Check
} from 'lucide-react';
import { localDb } from '../lib/firebase';
import { ActivityDocumentation, UserProfile } from '../types';

interface DocumentationProps {
  currentUser: UserProfile;
}

// Preset modern Unsplash images for easy visual simulation
const PRESET_IMAGES = [
  { url: 'https://images.unsplash.com/photo-1511578314322-379afb476865?auto=format&fit=crop&q=80&w=600', name: 'Rapat Kerja Pengurus' },
  { url: 'https://images.unsplash.com/photo-1475721027785-f74eccf877e2?auto=format&fit=crop&q=80&w=600', name: 'Seminar & Diskusi Panel' },
  { url: 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=600', name: 'Outbound & Outing' },
  { url: 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=600', name: 'Diskusi Kelompok RTD' },
  { url: 'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=600', name: 'Presentasi Program Kerja' },
  { url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?auto=format&fit=crop&q=80&w=600', name: 'Aula Barat Universitas' }
];

export default function Documentation({ currentUser }: DocumentationProps) {
  const [docs, setDocs] = useState<ActivityDocumentation[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<ActivityDocumentation | null>(null);

  // New Documentation Form
  const [formState, setFormState] = useState({
    title: '',
    description: '',
    imageUrl: PRESET_IMAGES[0].url,
    location: '',
  });

  const [notification, setNotification] = useState<string | null>(null);

  const isUserPengurus = currentUser.role === 'pengurus';

  const loadData = () => {
    setDocs(localDb.getDocumentation());
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

  // Upload/Save documentation photo (Pengurus only)
  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUserPengurus) return;

    const newDoc: ActivityDocumentation = {
      id: `doc-${Date.now()}`,
      title: formState.title,
      description: formState.description,
      imageUrl: formState.imageUrl,
      date: new Date().toISOString().split('T')[0],
      uploaderName: currentUser.name,
      location: formState.location,
      likes: 0
    };

    const updatedDocs = [newDoc, ...docs];
    localDb.saveDocumentation(updatedDocs);
    setDocs(updatedDocs);

    setIsUploading(false);
    setFormState({
      title: '',
      description: '',
      imageUrl: PRESET_IMAGES[0].url,
      location: '',
    });

    showNotification("Foto dokumentasi berhasil ditambahkan ke galeri!");
    window.dispatchEvent(new Event('localDbUpdate'));
  };

  // Delete documentation photo (Pengurus only)
  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isUserPengurus) return;

    if (confirm("Apakah Anda yakin ingin menghapus dokumentasi ini?")) {
      const updatedDocs = docs.filter(d => d.id !== id);
      localDb.saveDocumentation(updatedDocs);
      setDocs(updatedDocs);
      if (selectedPhoto?.id === id) {
        setSelectedPhoto(null);
      }
      showNotification("Dokumentasi berhasil dihapus.");
      window.dispatchEvent(new Event('localDbUpdate'));
    }
  };

  // Like a photo (Available for everyone)
  const handleLike = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid opening modal

    const updatedDocs = docs.map(d => 
      d.id === id 
        ? { ...d, likes: d.likes + 1 } 
        : d
    );
    localDb.saveDocumentation(updatedDocs);
    setDocs(updatedDocs);
    
    // Update selected details if modal is open
    if (selectedPhoto && selectedPhoto.id === id) {
      setSelectedPhoto({ ...selectedPhoto, likes: selectedPhoto.likes + 1 });
    }

    window.dispatchEvent(new Event('localDbUpdate'));
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

      {/* Action Bar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Dokumentasi Kegiatan</h2>
          <p className="text-xs sm:text-sm text-slate-400">Arsip foto keseruan, kesuksesan, dan pengabdian mahasiswa di setiap proker</p>
        </div>

        {isUserPengurus ? (
          <button
            onClick={() => setIsUploading(true)}
            id="btn-open-upload-doc"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-500/20"
          >
            <Plus size={16} />
            Tambah Dokumentasi Foto
          </button>
        ) : (
          <div className="flex items-center gap-2 glass-panel border border-white/10 px-3 py-1.5 rounded-xl text-[11px] text-slate-400">
            <Lock size={12} className="text-amber-500" />
            <span>Mode Lihat & Beri Likes (Akses Anggota)</span>
          </div>
        )}
      </div>

      {/* Grid of Photo Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {docs.length === 0 ? (
          <div className="sm:col-span-2 lg:col-span-3 text-center py-12 glass-panel rounded-2xl text-slate-500 shadow-lg">
            <ImageIcon size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Belum ada foto dokumentasi diunggah</p>
          </div>
        ) : (
          docs.map(photo => (
            <div 
              key={photo.id}
              onClick={() => setSelectedPhoto(photo)}
              id={`doc-card-${photo.id}`}
              className="group glass-panel rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] hover:border-white/20 transition-all duration-300 flex flex-col h-[320px] shadow-lg"
            >
              {/* Image Frame */}
              <div className="relative h-48 overflow-hidden bg-slate-950 shrink-0">
                <img 
                  src={photo.imageUrl} 
                  alt={photo.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0e1320]/80 to-transparent opacity-60" />
                
                {/* Delete button (Pengurus only) */}
                {isUserPengurus && (
                  <button
                    onClick={(e) => handleDelete(photo.id, e)}
                    className="absolute top-3 right-3 p-1.5 bg-slate-950/80 hover:bg-red-900/80 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
                    title="Hapus Dokumentasi"
                  >
                    <X size={13} />
                  </button>
                )}

                {/* Location indicator */}
                {photo.location && (
                  <span className="absolute bottom-3 left-3 px-2 py-0.5 bg-[#0e1320]/80 text-slate-200 rounded text-[9px] font-medium flex items-center gap-1 border border-white/10">
                    <MapPin size={9} className="text-blue-400" />
                    {photo.location}
                  </span>
                )}
              </div>

              {/* Description Frame */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm sm:text-base truncate group-hover:text-blue-400 transition-colors">{photo.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">{photo.description}</p>
                </div>

                <div className="flex justify-between items-center text-xs text-slate-500 border-t border-white/5 pt-3 mt-2 shrink-0">
                  <span className="flex items-center gap-1"><Calendar size={12} /> {photo.date}</span>
                  <button
                    onClick={(e) => handleLike(photo.id, e)}
                    className="flex items-center gap-1 py-1 px-2.5 rounded-full bg-white/3 hover:bg-[#ff0055]/10 text-slate-400 hover:text-rose-400 transition-all border border-white/10 cursor-pointer"
                    title="Sukai Foto Ini"
                  >
                    <Heart size={12} className={photo.likes > 0 ? "fill-rose-500 text-rose-500" : ""} />
                    <span className="font-bold text-[10px]">{photo.likes} Likes</span>
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add Documentation Dialog (Pengurus only) */}
      {isUploading && isUserPengurus && (
        <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="glass-modal rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl border border-white/10 animate-scale-up my-8">
            <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/3">
              <h3 className="font-display font-bold text-white flex items-center gap-2">
                <ImageIcon size={18} className="text-blue-400" />
                Unggah Dokumentasi Kegiatan
              </h3>
              <button onClick={() => setIsUploading(false)} className="text-slate-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>
            
            <form onSubmit={handleUpload} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Judul / Nama Momen</label>
                <input 
                  type="text" 
                  required
                  placeholder="Contoh: Sesi Potret Bersama Rapat Pleno"
                  value={formState.title}
                  onChange={e => setFormState({ ...formState, title: e.target.value })}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Keterangan / Caption Cerita</label>
                <textarea 
                  rows={3}
                  required
                  placeholder="Ceritakan momen seru ini, kesepakatan, atau jumlah jajaran yang hadir..."
                  value={formState.description}
                  onChange={e => setFormState({ ...formState, description: e.target.value })}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Lokasi Kegiatan</label>
                <input 
                  type="text" 
                  placeholder="Contoh: Aula Barat Universitas, Villa Kaliurang"
                  value={formState.location}
                  onChange={e => setFormState({ ...formState, location: e.target.value })}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Preset Image Chooser */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2">Pilih Foto Dokumentasi (Preset Unsplash HD)</label>
                <div className="grid grid-cols-3 gap-3">
                  {PRESET_IMAGES.map((img, idx) => (
                    <div 
                      key={idx}
                      onClick={() => setFormState({ ...formState, imageUrl: img.url })}
                      className={`relative aspect-video rounded-xl overflow-hidden cursor-pointer border-2 transition-all ${
                        formState.imageUrl === img.url ? 'border-blue-500 scale-95 shadow-lg shadow-blue-500/20' : 'border-white/5 opacity-60 hover:opacity-100'
                      }`}
                      title={img.name}
                    >
                      <img src={img.url} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      {formState.imageUrl === img.url && (
                        <span className="absolute top-1.5 right-1.5 bg-blue-600 text-white p-0.5 rounded-full">
                          <Check size={10} />
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-400">Atau Unggah Foto dari Galeri / Kamera Anda</label>
                <div className="flex items-center gap-4 p-3 bg-white/3 border border-white/5 rounded-xl">
                  {formState.imageUrl && (
                    <img 
                      src={formState.imageUrl} 
                      alt="Pratinjau Unggahan" 
                      className="w-16 h-10 rounded object-cover border border-white/10"
                      referrerPolicy="no-referrer"
                    />
                  )}
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <label className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors inline-block">
                        Pilih File Gambar
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                alert("Ukuran berkas terlalu besar. Maksimal 2MB agar tetap hemat ruang penyimpanan.");
                                return;
                              }
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setFormState({ ...formState, imageUrl: reader.result as string });
                              };
                              reader.readAsDataURL(file);
                            }
                          }} 
                          className="hidden" 
                        />
                      </label>
                      <span className="text-[10px] text-slate-400">Maks. 2MB</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Atau Gunakan Link Foto Kustom URL Anda</label>
                <input 
                  type="text" 
                  placeholder="https://images.unsplash.com/..."
                  value={formState.imageUrl}
                  onChange={e => setFormState({ ...formState, imageUrl: e.target.value })}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUploading(false)}
                  className="px-4 py-2 bg-white/5 border border-white/10 text-slate-300 rounded-xl text-xs sm:text-sm font-semibold hover:bg-white/10 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  <Upload size={16} />
                  Posting Dokumentasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Photo lightbox View Modal (Available for everyone) */}
      {selectedPhoto && (
        <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="glass-modal rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl border border-white/10 animate-scale-up">
            <div className="relative aspect-video max-h-[380px] bg-slate-950">
              <img 
                src={selectedPhoto.imageUrl} 
                alt={selectedPhoto.title} 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
              <button 
                onClick={() => setSelectedPhoto(null)}
                className="absolute top-4 right-4 p-2 bg-[#0e1320]/75 border border-white/10 hover:bg-white/10 text-white rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4 bg-transparent">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-lg sm:text-xl font-bold text-white leading-tight">{selectedPhoto.title}</h3>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {selectedPhoto.date}</span>
                    {selectedPhoto.location && <span className="flex items-center gap-1"><MapPin size={12} /> {selectedPhoto.location}</span>}
                    <span className="flex items-center gap-1"><User size={12} /> Diupload oleh: {selectedPhoto.uploaderName}</span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleLike(selectedPhoto.id, e)}
                  className="flex items-center gap-2 py-1.5 px-4 rounded-full bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-white transition-all border border-rose-500/30 cursor-pointer self-start sm:self-center"
                >
                  <Heart size={14} className={selectedPhoto.likes > 0 ? "fill-current" : ""} />
                  <span className="font-bold text-xs">{selectedPhoto.likes} Likes</span>
                </button>
              </div>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed bg-white/3 p-4 rounded-xl border border-white/10">
                {selectedPhoto.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
