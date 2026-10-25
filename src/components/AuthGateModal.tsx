import React, { useState } from 'react';
import {
  Dna,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  UserCheck,
  AlertCircle,
  Cloud,
  Sparkles,
  Check,
} from 'lucide-react';

interface AuthGateModalProps {
  expectedPassword: string;
  allowGuestMode: boolean;
  cloudConfigured: boolean;
  isPullingCloud?: boolean;
  onSuccessOwnerLogin: (rememberDevice: boolean, usedPassword: string) => Promise<void> | void;
  onEnterGuestMode: (rememberDevice: boolean) => void;
}

export const AuthGateModal: React.FC<AuthGateModalProps> = ({
  expectedPassword,
  allowGuestMode,
  cloudConfigured,
  isPullingCloud,
  onSuccessOwnerLogin,
  onEnterGuestMode,
}) => {
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleOwnerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    const trimmed = passwordInput.trim();
    if (!trimmed) {
      setErrorMsg('Vui lòng nhập Mật khẩu / Mã PIN Chủ sở hữu.');
      return;
    }

    if (trimmed !== expectedPassword) {
      setErrorMsg('Mật khẩu không chính xác. Vui lòng kiểm tra lại.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onSuccessOwnerLogin(rememberDevice, trimmed);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#131314] notebooklm-canvas-bg flex items-center justify-center p-4 select-none">
      {/* Subtle Ambient Background Card */}
      <div className="w-full max-w-md bg-[#1e1f20] border border-[#3c4043] rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Brand Header */}
        <div className="p-6 pb-5 bg-[#161718] border-b border-[#2d2e30] text-center space-y-2.5">
          <div className="w-12 h-12 rounded-2xl bg-[#3f3c5c] border-2 border-[#8ab4f8] flex items-center justify-center mx-auto shadow-lg">
            <Dna className="w-6 h-6 text-[#8ab4f8]" />
          </div>
          <div>
            <h1 className="font-display font-bold text-[20px] text-white tracking-tight">
              MedMind Studio
            </h1>
            <p className="text-[12.5px] text-[#9aa0a6] mt-0.5">
              Hệ thống Sơ đồ Tư duy Y khoa Chuẩn Google NotebookLM
            </p>
          </div>

          {cloudConfigured && (
            <div className="inline-flex items-center gap-1.5 text-[11px] font-mono text-[#10b981] pt-1">
              <Cloud className="w-3.5 h-3.5" />
              <span>Đã kết nối tự động với Supabase Cloud</span>
            </div>
          )}
        </div>

        {/* Owner Login Form */}
        <form onSubmit={handleOwnerSubmit} className="p-6 space-y-4">
          <div>
            <label className="flex items-center justify-between text-[12px] font-medium text-[#e3e3e3] mb-1.5">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-[#8ab4f8]" />
                <span>Đăng nhập Chủ sở hữu (Owner PIN / Mật khẩu)</span>
              </span>
              <span className="text-[11px] font-mono text-[#9aa0a6]">Toàn quyền</span>
            </label>

            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                autoFocus
                value={passwordInput}
                onChange={(e) => {
                  setPasswordInput(e.target.value);
                  setErrorMsg(null);
                }}
                placeholder="Nhập mật khẩu chủ sở hữu..."
                className="w-full bg-[#131314] border border-[#3c4043] focus:border-[#8ab4f8] rounded-xl pl-4 pr-10 py-2.5 text-[14px] text-white font-mono placeholder:font-sans placeholder:text-[#70757a] focus:outline-none transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9aa0a6] hover:text-white cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Login Checkbox */}
          <label
            onClick={() => setRememberDevice(!rememberDevice)}
            className="flex items-center gap-2.5 cursor-pointer group py-0.5"
          >
            <div
              className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${
                rememberDevice
                  ? 'bg-[#8ab4f8] border-[#8ab4f8] text-[#131314]'
                  : 'bg-[#131314] border-[#5f6368] group-hover:border-[#8ab4f8]'
              }`}
            >
              {rememberDevice && <Check className="w-3 h-3 stroke-[3]" />}
            </div>
            <span className="text-[12.5px] text-[#d2d5d9] group-hover:text-white">
              Ghi nhớ đăng nhập trên thiết bị này (không hỏi lại lần sau)
            </span>
          </label>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/40 text-[#f28b82] text-[12px] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || isPullingCloud}
            className="w-full py-2.5 px-4 rounded-xl bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-display font-bold text-[13.5px] flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer disabled:opacity-60"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>
              {isSubmitting || isPullingCloud
                ? 'Đang xác thực & Đồng bộ Cloud...'
                : 'Đăng nhập Chủ sở hữu (Full Access)'}
            </span>
          </button>

          {/* Guest Mode Divider & CTA */}
          {allowGuestMode && (
            <div className="pt-3 border-t border-[#2d2e30] space-y-3">
              <p className="text-[11.5px] text-center text-[#9aa0a6]">
                Hoặc truy cập dành cho bạn bè / người xem sơ đồ học tập:
              </p>
              <button
                type="button"
                onClick={() => onEnterGuestMode(rememberDevice)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#2d2e30] hover:bg-[#3c4043] border border-[#4b5056] text-[#e3e3e3] font-display font-semibold text-[13px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <UserCheck className="w-4 h-4 text-[#81c995]" />
                <span>Xem ở chế độ Khách (Chỉ đọc & Ôn tập)</span>
              </button>
            </div>
          )}
        </form>

        {/* Footer Info */}
        <div className="px-6 py-3 bg-[#161718] border-t border-[#2d2e30] flex items-center justify-between text-[11px] text-[#70757a]">
          <span className="flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-[#8ab4f8]" />
            <span>Bảo vệ dữ liệu Y khoa cá nhân</span>
          </span>
          <span>Auto-Sync Cloud Ready</span>
        </div>
      </div>
    </div>
  );
};
