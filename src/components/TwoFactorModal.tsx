import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Smartphone, 
  Key, 
  X, 
  CheckCircle, 
  Copy, 
  Lock,
  LockOpen
} from 'lucide-react';
import { UserProfile } from '../types';
import { localDb } from '../lib/firebase';

interface TwoFactorModalProps {
  currentUser: UserProfile;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TwoFactorModal({ currentUser, isOpen, onClose, onSuccess }: TwoFactorModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(currentUser.twoFactorEnabled ? 3 : 1);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isCopied, setIsCopied] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!isOpen) return null;

  // Mock secret key
  const secretKey = currentUser.twoFactorSecret || 'K47XG38ZK9Y2R6P1';

  const handleCopySecret = () => {
    navigator.clipboard.writeText(secretKey);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleCodeChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return; // only numbers
    
    const newCode = [...code];
    newCode[index] = value.substring(value.length - 1); // keep last digit
    setCode(newCode);

    // Auto focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCode = code.join('');

    // Let's accept '123456' as the universal activation/verification code for easy user testing
    if (enteredCode === '123456' || enteredCode === '999999' || step === 3) {
      setErrorMessage('');
      
      if (step === 3) {
        // Deactivate 2FA
        const updatedUser: UserProfile = {
          ...currentUser,
          twoFactorEnabled: false,
          twoFactorSecret: undefined
        };
        localDb.setCurrentUser(updatedUser);
        
        // Update in list too
        const users = localDb.getUsers().map(u => u.id === currentUser.id ? updatedUser : u);
        localDb.saveUsers(users);

        setStep(1);
        onSuccess();
        window.dispatchEvent(new Event('localDbUpdate'));
      } else {
        // Activate 2FA
        const updatedUser: UserProfile = {
          ...currentUser,
          twoFactorEnabled: true,
          twoFactorSecret: secretKey
        };
        localDb.setCurrentUser(updatedUser);

        // Update in list
        const users = localDb.getUsers().map(u => u.id === currentUser.id ? updatedUser : u);
        localDb.saveUsers(users);

        setStep(3);
        onSuccess();
        window.dispatchEvent(new Event('localDbUpdate'));
      }
    } else {
      setErrorMessage('Kode OTP salah! Gunakan kode "123456" untuk simulasi verifikasi keamanan.');
      // clear inputs
      setCode(['', '', '', '', '', '']);
      document.getElementById('otp-0')?.focus();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/45 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="glass-modal rounded-2xl w-full max-w-md overflow-hidden shadow-2xl border border-white/10 animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/3">
          <h3 className="font-display font-bold text-white flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-400" />
            Autentikasi Dua Faktor (2FA)
          </h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">
          {step === 1 && (
            <div className="space-y-5 text-center">
              <div className="w-16 h-16 bg-blue-500/10 text-blue-400 rounded-full flex items-center justify-center mx-auto border border-blue-500/20">
                <Lock size={30} />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Tingkatkan Keamanan Akun Anda</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Autentikasi Dua Faktor (2FA) memberikan keamanan ganda untuk akun Anda. 
                  Anda harus memasukkan kode OTP 6-digit dari aplikasi authenticator (Google Authenticator) 
                  setiap kali melakukan login penting atau merubah data organisasi.
                </p>
              </div>

              <button
                onClick={() => setStep(2)}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer shadow-lg shadow-blue-500/25"
              >
                Mulai Setup 2FA
              </button>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleVerify} className="space-y-5">
              <div className="flex flex-col items-center text-center gap-3">
                {/* Simulated QR Code SVG */}
                <div className="p-3 bg-white rounded-xl border-4 border-blue-200">
                  <svg width="120" height="120" viewBox="0 0 120 120" className="text-slate-950">
                    <rect width="120" height="120" fill="white" />
                    {/* QR Code corners */}
                    <rect x="5" y="5" width="30" height="30" fill="currentColor" />
                    <rect x="10" y="10" width="20" height="20" fill="white" />
                    <rect x="14" y="14" width="12" height="12" fill="currentColor" />
                    
                    <rect x="85" y="5" width="30" height="30" fill="currentColor" />
                    <rect x="90" y="90" width="20" height="20" fill="white" />
                    <rect x="90" y="10" width="20" height="20" fill="white" />
                    <rect x="94" y="14" width="12" height="12" fill="currentColor" />

                    <rect x="5" y="85" width="30" height="30" fill="currentColor" />
                    <rect x="10" y="90" width="20" height="20" fill="white" />
                    <rect x="14" y="94" width="12" height="12" fill="currentColor" />

                    {/* QR Random patterns */}
                    <rect x="45" y="15" width="10" height="15" fill="currentColor" />
                    <rect x="65" y="25" width="15" height="10" fill="currentColor" />
                    <rect x="50" y="45" width="20" height="20" fill="currentColor" />
                    <rect x="15" y="45" width="20" height="10" fill="currentColor" />
                    <rect x="45" y="85" width="15" height="20" fill="currentColor" />
                    <rect x="75" y="65" width="30" height="15" fill="currentColor" />
                    <rect x="85" y="85" width="15" height="15" fill="currentColor" />
                    <rect x="105" y="105" width="10" height="10" fill="currentColor" />
                    <rect x="15" y="65" width="10" height="10" fill="currentColor" />
                  </svg>
                </div>
                
                <div className="space-y-1">
                  <h4 className="font-bold text-white text-xs sm:text-sm">Scan QR Code Authenticator</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed px-4">
                    Buka aplikasi Google Authenticator, scan QR di atas atau masukkan kode rahasia di bawah ini secara manual.
                  </p>
                </div>
              </div>

              {/* Secret Key clipboard row */}
              <div className="bg-white/3 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key size={14} className="text-blue-400" />
                  <span className="font-mono text-xs text-slate-200 select-all font-bold tracking-wider">{secretKey}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopySecret}
                  className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Salin Kode Rahasia"
                >
                  {isCopied ? <span className="text-[10px] text-emerald-400 font-bold">Tersalin!</span> : <Copy size={12} />}
                </button>
              </div>

              {/* OTP Input Fields */}
              <div className="space-y-3">
                <label className="block text-center text-xs font-semibold text-slate-400">
                  Masukkan 6-Digit Kode Verifikasi (Gunakan: <strong className="text-blue-400 font-bold font-mono">123456</strong>)
                </label>
                
                <div className="flex justify-center gap-2.5">
                  {code.map((digit, idx) => (
                    <input
                      key={idx}
                      id={`otp-${idx}`}
                      type="text"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleCodeChange(idx, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(idx, e)}
                      className="w-11 h-12 glass-input border border-white/10 focus:border-blue-500 rounded-xl text-center text-lg font-bold text-white focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    />
                  ))}
                </div>
              </div>

              {errorMessage && (
                <p className="text-xs text-red-400 font-medium text-center">{errorMessage}</p>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2 bg-white/5 text-slate-300 border border-white/10 hover:bg-white/10 rounded-xl text-xs sm:text-sm font-semibold cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs sm:text-sm font-semibold cursor-pointer shadow-lg shadow-blue-500/20"
                >
                  Verifikasi & Aktifkan
                </button>
              </div>
            </form>
          )}

          {step === 3 && (
            <div className="space-y-5 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-400 rounded-full flex items-center justify-center mx-auto border border-emerald-500/20">
                <LockOpen size={30} />
              </div>
              <div>
                <h4 className="font-bold text-white text-base">Keamanan 2FA Sedang Aktif</h4>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Akun Anda saat ini terlindungi dengan Autentikasi Dua Faktor (2FA). 
                  Semua aktivitas perubahan struktur, berita acara, dan ekspor dilindungi dengan enkripsi kode generator.
                </p>
              </div>

              <div className="bg-white/3 border border-white/10 rounded-xl p-3 text-xs text-slate-400 font-mono flex items-center justify-between">
                <span>Secret Key Terikat:</span>
                <span className="font-bold text-white">{secretKey.substring(0, 4)}****{secretKey.slice(-4)}</span>
              </div>

              <button
                onClick={handleVerify} // triggers deactivation flow in standard mock
                className="w-full py-2.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-xl text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Nonaktifkan Keamanan 2FA
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
