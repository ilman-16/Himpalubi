import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Upload, 
  Download, 
  Calendar, 
  User, 
  Tag, 
  Plus, 
  X, 
  Check, 
  Trash2, 
  ChevronRight,
  Eye,
  Info,
  Mic,
  Square,
  Loader2,
  Sparkles,
  MicOff
} from 'lucide-react';
import { localDb } from '../lib/firebase';
import { BeritaAcara, EventItem, UserProfile } from '../types';
import jsPDF from 'jspdf';

interface MinutesProps {
  currentUser: UserProfile;
}

export default function Minutes({ currentUser }: MinutesProps) {
  const [minutes, setMinutes] = useState<BeritaAcara[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  
  // Selection / Detail / Form toggle states
  const [selectedMinutes, setSelectedMinutes] = useState<BeritaAcara | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // New Minutes Form state
  const [formState, setFormState] = useState({
    eventId: '',
    title: '',
    content: '',
    tags: '',
  });

  const [notification, setNotification] = useState<string | null>(null);

  // Audio recording & transcription state declarations
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceText, setVoiceText] = useState<string | null>(null);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Timer effect for tracking duration
  useEffect(() => {
    let timer: any;
    if (isRecording) {
      timer = setInterval(() => {
        setRecordingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      setRecordingSeconds(0);
    }
    return () => clearInterval(timer);
  }, [isRecording]);

  const startRecording = async () => {
    setVoiceError(null);
    setVoiceText(null);
    setRecordingSeconds(0);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
      const chunks: Blob[] = [];
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };
      
      recorder.onstop = async () => {
        const audioBlob = new Blob(chunks, { type: 'audio/webm' });
        stream.getTracks().forEach(track => track.stop());
        
        const reader = new FileReader();
        reader.readAsDataURL(audioBlob);
        reader.onloadend = async () => {
          const base64data = reader.result as string;
          const base64Payload = base64data.split(',')[1];
          await transcribeAudio(base64Payload, 'audio/webm');
        };
      };
      
      setMediaRecorder(recorder);
      recorder.start();
      setIsRecording(true);
    } catch (err: any) {
      console.error(err);
      setVoiceError('Gagal mengakses mikrofon. Pastikan Anda mengaktifkan izin mikrofon untuk situs ini.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      setIsRecording(false);
    }
  };

  const transcribeAudio = async (base64Audio: string, mimeType: string) => {
    setIsTranscribing(true);
    setVoiceError(null);
    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ audio: base64Audio, mimeType })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Gagal mentranskripsikan suara');
      }
      setVoiceText(data.text);
      setNotification('Suara berhasil ditranskripsikan oleh Gemini AI!');
    } catch (err: any) {
      console.error(err);
      setVoiceError(err.message || 'Terjadi kesalahan saat menghubungi server transkripsi');
    } finally {
      setIsTranscribing(false);
    }
  };

  const appendTranscription = () => {
    if (!voiceText) return;
    const currentContent = formState.content;
    const newContent = currentContent 
      ? `${currentContent}\n\n## Catatan Rapat Hasil Transkripsi Suara:\n${voiceText}`
      : `## Catatan Rapat Hasil Transkripsi Suara:\n${voiceText}`;
    setFormState({ ...formState, content: newContent });
    setVoiceText(null);
    setNotification('Transkripsi berhasil ditambahkan ke isi notulen!');
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  const isUserPengurus = currentUser.role === 'pengurus';

  const loadData = () => {
    setMinutes(localDb.getMinutes());
    setEvents(localDb.getEvents());
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

  // Create & Save Minutes (Pengurus only)
  const handleUploadMinutes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isUserPengurus) return;

    const matchedEvent = events.find(ev => ev.id === formState.eventId);
    const eventTitle = matchedEvent ? matchedEvent.title : 'Rapat Umum';

    const newMinutes: BeritaAcara = {
      id: `min-${Date.now()}`,
      eventId: formState.eventId,
      eventTitle,
      title: formState.title,
      content: formState.content,
      date: new Date().toISOString().split('T')[0],
      authorName: currentUser.name,
      authorRole: currentUser.role === 'pengurus' ? 'Badan Pengurus Harian' : 'Anggota',
      approvedBy: currentUser.name, // Auto approved by creator pengurus
      tags: formState.tags.split(',').map(t => t.trim()).filter(t => t.length > 0)
    };

    const updatedMinutes = [newMinutes, ...minutes];
    localDb.saveMinutes(updatedMinutes);
    setMinutes(updatedMinutes);

    // Save notification
    const notifications = localDb.getNotifications();
    const newNotif = {
      id: `notif-${Date.now()}`,
      title: 'Berita Acara Baru Dirilis!',
      body: `Notulen rapat "${newMinutes.title}" telah diunggah oleh pengurus. Silakan cek detail keputusan rapat.`,
      date: new Date().toISOString(),
      read: false,
      type: 'minutes' as any,
      targetRole: 'all' as any
    };
    localDb.saveNotifications([newNotif, ...notifications]);

    // Send push notification if supported
    if (Notification.permission === 'granted') {
      try {
        new Notification(newNotif.title, { body: newNotif.body });
      } catch (e) {
        console.log("Push failed to trigger on iframe, toast fallback works.");
      }
    }

    setIsUploading(false);
    setFormState({ eventId: '', title: '', content: '', tags: '' });
    showNotification("Sukses mengunggah Berita Acara Rapat!");
    window.dispatchEvent(new Event('localDbUpdate'));
  };

  // Delete Minutes (Pengurus only)
  const handleDeleteMinutes = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering card click
    if (!isUserPengurus) return;

    if (confirm("Apakah Anda yakin ingin menghapus berita acara ini?")) {
      const updatedMinutes = minutes.filter(m => m.id !== id);
      localDb.saveMinutes(updatedMinutes);
      setMinutes(updatedMinutes);
      if (selectedMinutes?.id === id) {
        setSelectedMinutes(null);
      }
      showNotification("Berita acara berhasil dihapus.");
      window.dispatchEvent(new Event('localDbUpdate'));
    }
  };

  // EXPORT INDIVIDUAL MINUTES TO PDF
  const handleExportSingleMinutesPDF = (min: BeritaAcara) => {
    const doc = new jsPDF();
    
    // Header Style
    doc.setFillColor(15, 23, 42); // slate-900 background
    doc.rect(0, 0, 210, 38, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("BERITA ACARA & NOTULEN RAPAT DIGITAL", 15, 16);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(200, 200, 200);
    doc.text(`Divisi/Organisasi: Himpunan Mahasiswa  |  Tanggal Terbit: ${min.date}`, 15, 23);
    doc.text(`Disetujui Oleh: ${min.approvedBy || '-'}  |  Disusun Oleh: ${min.authorName} (${min.authorRole})`, 15, 29);

    // Document title
    doc.setTextColor(15, 23, 42);
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text(min.title.toUpperCase(), 15, 48);

    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(100, 100, 100);
    doc.text(`Mengacu pada Agenda Kegiatan: ${min.eventTitle}`, 15, 54);

    // Decorative line separator
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.5);
    doc.line(15, 58, 195, 58);

    // Content writing
    doc.setTextColor(40, 40, 40);
    doc.setFontSize(9.5);
    doc.setFont("helvetica", "normal");
    
    // Process text line breaks cleanly for the PDF body content
    const textLines = doc.splitTextToSize(min.content, 180);
    
    let currentY = 66;
    textLines.forEach((line: string) => {
      // Check for headers (e.g., if lines start with '#' or '##') and apply bold styling
      if (line.startsWith('##') || line.startsWith('###')) {
        doc.setFont("helvetica", "bold");
        doc.setTextColor(15, 23, 42);
        const cleanLine = line.replace(/#/g, '').trim();
        doc.text(cleanLine, 15, currentY);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(40, 40, 40);
        currentY += 7;
      } else if (line.startsWith('*') || line.startsWith('-')) {
        // Bullet points
        doc.setFont("helvetica", "bold");
        doc.text("  \u2022", 15, currentY);
        doc.setFont("helvetica", "normal");
        const cleanLine = line.substring(1).trim();
        doc.text(cleanLine, 22, currentY);
        currentY += 6;
      } else {
        doc.text(line, 15, currentY);
        currentY += 5.5;
      }

      // Handle page overflow safely
      if (currentY > 275) {
        doc.addPage();
        currentY = 20;
      }
    });

    // Signature/Footer
    if (currentY + 30 > 280) {
      doc.addPage();
      currentY = 20;
    }
    
    currentY += 15;
    doc.setDrawColor(230, 230, 230);
    doc.line(15, currentY, 195, currentY);
    
    currentY += 8;
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("Tanda Tangan Pengesahan", 15, currentY);
    doc.text("Tanda Tangan Penyusun", 140, currentY);

    currentY += 18;
    doc.setFont("helvetica", "italic");
    doc.text(min.approvedBy || 'Ketua Himpunan', 15, currentY);
    doc.text(min.authorName, 140, currentY);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(150, 150, 150);
    doc.text("Halaman 1/1", 95, 287);

    // Save
    doc.save(`Berita_Acara_${min.title.replace(/\s+/g, '_')}.pdf`);
    showNotification("Berita acara berhasil diekspor ke PDF!");
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

      {/* Main View Grid: Split or Listing depending on selected state */}
      {!selectedMinutes && !isUploading ? (
        <>
          {/* Default listing View */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">Berita Acara Rapat</h2>
              <p className="text-xs sm:text-sm text-slate-400">Arsip legalitas berita acara, kesepakatan rapat, dan LPJ kegiatan</p>
            </div>
            
            {isUserPengurus ? (
              <button
                onClick={() => setIsUploading(true)}
                id="btn-open-upload-minutes"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 transition-all cursor-pointer shadow-lg shadow-blue-500/20"
              >
                <Plus size={16} />
                Unggah Berita Acara
              </button>
            ) : (
              <div className="flex items-center gap-2 glass-panel border border-white/10 px-3 py-1.5 rounded-xl text-[11px] text-slate-400">
                <Info size={12} className="text-amber-500" />
                <span>Anggota dapat membaca & mendownload PDF</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {minutes.length === 0 ? (
              <div className="md:col-span-3 text-center py-12 glass-panel rounded-2xl text-slate-500 shadow-lg">
                <FileText size={40} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">Belum ada berita acara yang diunggah</p>
              </div>
            ) : (
              minutes.map(item => (
                <div 
                  key={item.id}
                  onClick={() => setSelectedMinutes(item)}
                  id={`minutes-card-${item.id}`}
                  className="p-5 glass-panel rounded-2xl cursor-pointer hover:scale-[1.02] hover:border-white/20 transition-all duration-300 flex flex-col justify-between group h-[220px] shadow-lg"
                >
                  <div className="space-y-3">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex flex-wrap gap-1.5">
                        {item.tags.slice(0, 2).map((tag, i) => (
                          <span key={i} className="px-2 py-0.5 bg-blue-500/10 text-blue-400 rounded text-[9px] font-bold uppercase tracking-wider">
                            {tag}
                          </span>
                        ))}
                      </div>
                      
                      {isUserPengurus && (
                        <button
                          onClick={(e) => handleDeleteMinutes(item.id, e)}
                          className="p-1 text-slate-500 hover:text-red-400 rounded opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          title="Hapus Berita Acara"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </div>

                    <h3 className="font-display font-bold text-white text-sm sm:text-base line-clamp-2 leading-tight group-hover:text-blue-400 transition-colors">
                      {item.title}
                    </h3>
                    
                    <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed">
                      {item.content.replace(/[#*`]/g, '')}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs text-slate-500">
                    <span className="flex items-center gap-1"><Calendar size={12} /> {item.date}</span>
                    <span className="flex items-center gap-1 max-w-[120px] truncate"><User size={12} /> {item.authorName}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      ) : isUploading ? (
        /* Create & Upload form for Pengurus */
        <div className="glass-modal rounded-2xl p-6 max-w-3xl mx-auto shadow-2xl border border-white/10 animate-scale-up">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-6">
            <h3 className="font-display font-bold text-white flex items-center gap-2">
              <Upload size={18} className="text-blue-400" />
              Unggah Berita Acara & Notulen Rapat
            </h3>
            <button 
              onClick={() => setIsUploading(false)}
              className="p-1.5 bg-white/5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleUploadMinutes} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Pilih Kegiatan Acara Terkait</label>
                <select
                  required
                  value={formState.eventId}
                  onChange={e => setFormState({ ...formState, eventId: e.target.value })}
                  className="w-full glass-input rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="" className="bg-[#0e1320] text-white">-- Hubungkan dengan Jadwal --</option>
                  {events.map(ev => (
                    <option key={ev.id} value={ev.id} className="bg-[#0e1320] text-white">{ev.date} - {ev.title}</option>
                  ))}
                  <option value="none" className="bg-[#0e1320] text-white">Lainnya / Rapat Tidak Terjadwal</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1">Judul Dokumen Berita Acara</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Berita Acara Rapat Kerja Harian Ke-3"
                  value={formState.title}
                  onChange={e => setFormState({ ...formState, title: e.target.value })}
                  className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Tag / Kata Kunci (Pisahkan dengan Koma)</label>
              <input
                type="text"
                placeholder="Raker, Anggaran, Humas, LPJ"
                value={formState.tags}
                onChange={e => setFormState({ ...formState, tags: e.target.value })}
                className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-semibold text-slate-400">Isi Notulensi & Keputusan Rapat (Mendukung Markdown)</label>
                <span className="text-[10px] text-slate-500">Mendukung struktur heading (##) dan bullet poin (-)</span>
              </div>

              {/* Voice to Text (Gemini AI assistant) recorder card */}
              <div className="mb-4 p-4 bg-blue-500/5 border border-white/10 rounded-2xl space-y-3.5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 bg-blue-500/10 text-blue-400 rounded-xl shrink-0"><Mic size={16} /></span>
                    <div>
                      <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                        Asisten Notulensi Suara (Gemini AI)
                        <span className="text-[9px] bg-blue-500/20 text-blue-400 font-extrabold px-1.5 py-0.2 rounded border border-blue-500/20">3.5-FLASH</span>
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">Rekam suara rapat pengurus dan susun draf hasil keputusan otomatis menggunakan AI</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
                    {!isRecording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        disabled={isTranscribing}
                        className="w-full sm:w-auto px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-blue-600/15"
                      >
                        <Mic size={13} />
                        Mulai Rekam Suara
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="w-full sm:w-auto px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 cursor-pointer animate-pulse"
                      >
                        <Square size={12} />
                        Selesai & Transkrip ({formatTime(recordingSeconds)})
                      </button>
                    )}
                  </div>
                </div>

                {/* Status & Output section */}
                {isRecording && (
                  <div className="p-3 bg-white/3 border border-white/5 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping shrink-0" />
                      <span className="text-xs font-mono text-white">Sedang merekam percakapan rapat...</span>
                    </div>
                    <div className="flex gap-1 items-center">
                      <span className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }} />
                      <span className="w-1 h-5 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                      <span className="w-1 h-4 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
                      <span className="w-1 h-6 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }} />
                      <span className="w-1 h-3 bg-blue-500 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }} />
                    </div>
                  </div>
                )}

                {isTranscribing && (
                  <div className="p-3.5 bg-white/3 border border-white/5 rounded-xl flex items-center gap-2.5">
                    <Loader2 size={16} className="text-blue-400 animate-spin shrink-0" />
                    <span className="text-xs text-slate-300">Menghubungi asisten kecerdasan buatan Gemini untuk mentranskrip audio rapat secara verbatim...</span>
                  </div>
                )}

                {voiceError && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex items-center gap-2">
                    <MicOff size={14} className="shrink-0" />
                    <span>{voiceError}</span>
                  </div>
                )}

                {voiceText && (
                  <div className="p-3.5 bg-[#0d1222] border border-white/10 rounded-xl space-y-3 animate-scale-up">
                    <div className="flex justify-between items-center pb-2 border-b border-white/5">
                      <span className="text-[10px] font-bold text-blue-400 flex items-center gap-1.5">
                        <Sparkles size={11} />
                        DRAF NOTULEN HASIL TRANSKRIPSI GEMINI AI
                      </span>
                      <button
                        type="button"
                        onClick={() => setVoiceText(null)}
                        className="text-[10px] text-slate-500 hover:text-white cursor-pointer"
                      >
                        Bersihkan
                      </button>
                    </div>
                    
                    <div className="text-xs text-slate-300 max-h-[160px] overflow-y-auto font-mono bg-white/2 p-2.5 rounded-lg border border-white/5 leading-relaxed whitespace-pre-wrap">
                      {voiceText}
                    </div>

                    <button
                      type="button"
                      onClick={appendTranscription}
                      className="w-full py-2 bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      Masukkan Catatan Hasil Transkripsi ke Notulensi Rapat
                    </button>
                  </div>
                )}
              </div>

              <textarea
                rows={10}
                required
                placeholder="## Hasil Rapat Kerja...&#10;- Agenda 1: ...&#10;- Hasil Keputusan: ..."
                value={formState.content}
                onChange={e => setFormState({ ...formState, content: e.target.value })}
                className="w-full glass-input rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-blue-500 resize-none font-mono"
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
                Publikasikan Dokumen
              </button>
            </div>
          </form>
        </div>
      ) : (
        /* Detailed View of Single Minutes Document */
        <div className="glass-panel rounded-2xl overflow-hidden shadow-2xl max-w-4xl mx-auto border border-white/10 animate-scale-up">
          {/* Header */}
          <div className="px-6 py-4 bg-white/3 border-b border-white/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <button 
              onClick={() => setSelectedMinutes(null)}
              id="btn-back-to-minutes"
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <ChevronRight size={14} className="rotate-185" />
              Kembali ke Daftar
            </button>

            <button
              onClick={() => handleExportSingleMinutesPDF(selectedMinutes!)}
              id="btn-download-minutes-pdf"
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors shadow-lg shadow-emerald-500/15"
            >
              <Download size={14} />
              Ekspor Dokumen ke PDF
            </button>
          </div>

          {/* Core Content Layout */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {selectedMinutes.tags.map((tag, i) => (
                  <span key={i} className="px-2.5 py-0.5 bg-blue-500/10 text-blue-400 rounded-full text-[10px] font-bold tracking-wider uppercase">
                    {tag}
                  </span>
                ))}
              </div>

              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight leading-tight">{selectedMinutes.title}</h2>
              <p className="text-xs text-blue-400 font-medium">Mengacu pada Agenda: {selectedMinutes.eventTitle}</p>
            </div>

            {/* Author details banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-white/3 border border-white/10 rounded-xl text-xs text-slate-400">
              <div>
                <p className="text-slate-500">Penyusun Notulen:</p>
                <p className="font-semibold text-white mt-0.5">{selectedMinutes.authorName}</p>
                <p className="text-[10px] text-slate-500">{selectedMinutes.authorRole}</p>
              </div>
              <div>
                <p className="text-slate-500">Tanggal Terbit:</p>
                <p className="font-semibold text-white mt-0.5">{selectedMinutes.date}</p>
              </div>
              <div>
                <p className="text-slate-500">Pengesahan:</p>
                <p className="font-semibold text-emerald-400 mt-0.5">Disetujui Ketua</p>
                <p className="text-[10px] text-slate-500">Oleh: {selectedMinutes.approvedBy || 'Ketua Umum'}</p>
              </div>
              <div>
                <p className="text-slate-500">Status Keabsahan:</p>
                <span className="inline-block mt-1.5 px-2 py-0.5 bg-emerald-500/10 text-emerald-400 rounded-md text-[9px] font-bold">DOKUMEN SAH</span>
              </div>
            </div>

            {/* Markdown Body display */}
            <div className="border-t border-white/10 pt-6">
              <div className="markdown-body text-slate-300 space-y-4 leading-relaxed text-sm">
                {selectedMinutes.content.split('\n').map((line, idx) => {
                  if (line.trim().startsWith('##')) {
                    return <h3 key={idx} className="text-lg font-bold text-white pt-4 pb-2 border-b border-white/10">{line.replace(/##/g, '').trim()}</h3>;
                  }
                  if (line.trim().startsWith('###')) {
                    return <h4 key={idx} className="text-base font-bold text-white pt-3 pb-1">{line.replace(/###/g, '').trim()}</h4>;
                  }
                  if (line.trim().startsWith('-') || line.trim().startsWith('*')) {
                    return (
                      <ul key={idx} className="list-disc pl-5 text-slate-300">
                        <li>{line.substring(1).trim()}</li>
                      </ul>
                    );
                  }
                  if (line.trim() === '') {
                    return <div key={idx} className="h-2" />;
                  }
                  return <p key={idx}>{line}</p>;
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
