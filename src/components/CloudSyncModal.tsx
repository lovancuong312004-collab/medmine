import React, { useState } from 'react';
import {
  X,
  Cloud,
  UploadCloud,
  DownloadCloud,
  Check,
  Copy,
  AlertCircle,
  CheckCircle2,
  Database,
  Lock,
  Shield,
  Users,
  RefreshCw,
  Sun,
  Moon,
} from 'lucide-react';
import {
  SupabaseConfig,
  MedMindDatabase,
  SecuritySettings,
} from '../types/mindmap';
import {
  cleanSupabaseUrl,
  pushDatabaseToSupabase,
  pullDatabaseFromSupabase,
  DEFAULT_OWNER_PASSWORD,
} from '../utils/supabaseSync';

interface CloudSyncModalProps {
  config: SupabaseConfig;
  database: MedMindDatabase;
  isReadOnly: boolean;
  themeMode: 'dark' | 'light';
  onChangeThemeMode: (mode: 'dark' | 'light') => void;
  onSaveConfig: (newConfig: SupabaseConfig) => void;
  onReplaceDatabase: (newDb: MedMindDatabase) => void;
  onUpdateSecuritySettings: (newSecurity: SecuritySettings) => void;
  onMergeSampleData: () => void;
  onUnlockOwnerFromGuest?: (usedPassword: string) => Promise<void> | void;
  onClose: () => void;
}

const SUPABASE_SQL_SNIPPET = `-- Chạy câu lệnh này trong SQL Editor của Supabase để tạo bảng lưu trữ MedMind Studio:
create table if not exists public.medmind_store (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);

alter table public.medmind_store enable row level security;

create policy "Allow public read/write for personal MedMind sync"
on public.medmind_store for all
using (true)
with check (true);`;

export const CloudSyncModal: React.FC<CloudSyncModalProps> = ({
  config,
  database,
  isReadOnly,
  themeMode,
  onChangeThemeMode,
  onSaveConfig,
  onReplaceDatabase,
  onUpdateSecuritySettings,
  onMergeSampleData,
  onUnlockOwnerFromGuest,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'theme' | 'cloud' | 'security'>('theme');
  const [url, setUrl] = useState(config.url);
  const [anonKey, setAnonKey] = useState(config.anonKey);
  const [tableName, setTableName] = useState(config.tableName || 'medmind_store');
  const [autoSync, setAutoSync] = useState<boolean>(config.autoSync);

  // Security states — NEVER prefill or expose current ownerPassword in plain text!
  const currentSecurity = database.security || {
    ownerPassword: DEFAULT_OWNER_PASSWORD,
    allowGuestMode: true,
  };
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [allowGuest, setAllowGuest] = useState(currentSecurity.allowGuestMode);

  // Guest -> Owner inline unlock input
  const [guestUnlockPassword, setGuestUnlockPassword] = useState('');

  const [statusMsg, setStatusMsg] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const handleSaveSettings = () => {
    if (isReadOnly) return;
    const updated: SupabaseConfig = {
      url: cleanSupabaseUrl(url),
      anonKey: anonKey.trim(),
      tableName: tableName.trim() || 'medmind_store',
      autoSync,
      lastSyncedAt: config.lastSyncedAt,
    };
    onSaveConfig(updated);
    setStatusMsg({
      type: 'success',
      text: 'Đã lưu cấu hình kết nối Supabase và chế độ Tự động đồng bộ (Auto-Sync).',
    });
  };

  const handlePushToSupabase = async () => {
    if (isReadOnly) {
      setStatusMsg({
        type: 'error',
        text: 'Chế độ Khách (Chỉ đọc) không được phép ghi đè dữ liệu lên Cloud.',
      });
      return;
    }

    const tempConfig: SupabaseConfig = {
      url: cleanSupabaseUrl(url),
      anonKey: anonKey.trim(),
      tableName: tableName.trim() || 'medmind_store',
      autoSync,
    };

    setIsSyncing(true);
    setStatusMsg({
      type: 'info',
      text: 'Đang đẩy dữ liệu & mật khẩu bảo mật lên Supabase Cloud...',
    });

    const res = await pushDatabaseToSupabase(tempConfig, database);
    setIsSyncing(false);

    if (!res.ok) {
      setStatusMsg({
        type: 'error',
        text: `Không thể đẩy dữ liệu: ${res.error}. Hãy chắc chắn bạn đã chạy mã SQL tạo bảng bên dưới.`,
      });
      return;
    }

    onSaveConfig({
      ...tempConfig,
      lastSyncedAt: res.syncedAt,
    });

    setStatusMsg({
      type: 'success',
      text: `Đồng bộ lên Đám mây thành công (${database.lessons.length} bài học)! Khi mở trên iPad hoặc Điện thoại sẽ tự động tải về.`,
    });
  };

  const handlePullFromSupabase = async () => {
    const tempConfig: SupabaseConfig = {
      url: cleanSupabaseUrl(url),
      anonKey: anonKey.trim(),
      tableName: tableName.trim() || 'medmind_store',
      autoSync,
    };

    setIsSyncing(true);
    setStatusMsg({
      type: 'info',
      text: 'Đang tải kho bài học mới nhất từ Supabase Cloud...',
    });

    const res = await pullDatabaseFromSupabase(tempConfig);
    setIsSyncing(false);

    if (!res.ok || !res.database) {
      setStatusMsg({
        type: 'error',
        text: res.error || 'Chưa tìm thấy bản lưu trên Supabase.',
      });
      return;
    }

    onReplaceDatabase(res.database);
    onSaveConfig({
      ...tempConfig,
      lastSyncedAt: res.updatedAt || new Date().toISOString(),
    });
    setStatusMsg({
      type: 'success',
      text: `Đã tải thành công ${res.database.lessons.length} bài học từ Supabase về máy!`,
    });
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;

    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedNew) {
      setStatusMsg({
        type: 'error',
        text: 'Vui lòng nhập mật khẩu mới để cập nhật.',
      });
      return;
    }

    if (trimmedNew.length < 4) {
      setStatusMsg({
        type: 'error',
        text: 'Mật khẩu Chủ sở hữu phải có ít nhất 4 ký tự.',
      });
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setStatusMsg({
        type: 'error',
        text: 'Xác nhận mật khẩu mới không khớp. Vui lòng kiểm tra lại.',
      });
      return;
    }

    const updatedSecurity: SecuritySettings = {
      ownerPassword: trimmedNew,
      allowGuestMode: allowGuest,
      updatedAt: new Date().toISOString(),
    };

    onUpdateSecuritySettings(updatedSecurity);
    setNewPassword('');
    setConfirmPassword('');
    setStatusMsg({
      type: 'success',
      text: 'Đã cập nhật Mật khẩu Chủ sở hữu và quyền truy cập Khách (đã đồng bộ lên Cloud nếu bật Auto-Sync)!',
    });
  };

  const handleToggleAllowGuestOnly = (checked: boolean) => {
    if (isReadOnly) return;
    setAllowGuest(checked);
    const updatedSecurity: SecuritySettings = {
      ownerPassword: currentSecurity.ownerPassword,
      allowGuestMode: checked,
      updatedAt: new Date().toISOString(),
    };
    onUpdateSecuritySettings(updatedSecurity);
    setStatusMsg({
      type: 'success',
      text: checked
        ? 'Đã bật cho phép Chế độ Khách (Read-Only).'
        : 'Đã tắt Chế độ Khách (Chỉ Chủ sở hữu có mật khẩu mới vào được).',
    });
  };

  const handleGuestUnlockSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = guestUnlockPassword.trim();
    if (!trimmed) {
      setStatusMsg({
        type: 'error',
        text: 'Vui lòng nhập Mật khẩu Chủ sở hữu.',
      });
      return;
    }
    if (trimmed !== currentSecurity.ownerPassword) {
      setStatusMsg({
        type: 'error',
        text: 'Mật khẩu Chủ sở hữu không chính xác.',
      });
      return;
    }
    setGuestUnlockPassword('');
    setStatusMsg({
      type: 'success',
      text: 'Đã mở khóa quyền Chủ sở hữu (Full Access) thành công!',
    });
    if (onUnlockOwnerFromGuest) {
      await onUnlockOwnerFromGuest(trimmed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 select-text">
      <div className="w-full max-w-2xl bg-[#1e1f20] border border-[#3c4043] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2d2e30] flex items-center justify-between bg-[#161718]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#10b981]/15 border border-[#10b981]/40 flex items-center justify-center text-[#10b981]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-[16px] text-white">
                Cài đặt Giao diện Sáng / Tối, Đồng bộ Cloud & Bảo mật
              </h2>
              <p className="text-[12px] text-[#9aa0a6]">
                Tùy chỉnh giao diện chuẩn sách y khoa, tự động đồng bộ đa thiết bị và quản lý mật khẩu
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#9aa0a6] hover:text-white hover:bg-[#2d2e30] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 border-b border-[#2d2e30] flex items-center gap-2 bg-[#1b1c1e] overflow-x-auto no-scrollbar">
          <button
            onClick={() => {
              setActiveTab('theme');
              setStatusMsg(null);
            }}
            className={`px-3.5 py-2.5 text-[12.5px] font-display font-semibold rounded-t-xl border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'theme'
                ? 'border-[#f59e0b] text-[#f59e0b] bg-[#131314]/60'
                : 'border-transparent text-[#9aa0a6] hover:text-white'
            }`}
          >
            {themeMode === 'light' ? (
              <Sun className="w-4 h-4 text-[#f59e0b]" />
            ) : (
              <Moon className="w-4 h-4 text-[#8ab4f8]" />
            )}
            <span>1. Giao diện Sáng / Tối (Theme)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('cloud');
              setStatusMsg(null);
            }}
            className={`px-3.5 py-2.5 text-[12.5px] font-display font-semibold rounded-t-xl border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'cloud'
                ? 'border-[#8ab4f8] text-[#8ab4f8] bg-[#131314]/60'
                : 'border-transparent text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>2. Đồng bộ Supabase (Auto-Sync)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('security');
              setStatusMsg(null);
            }}
            className={`px-3.5 py-2.5 text-[12.5px] font-display font-semibold rounded-t-xl border-b-2 flex items-center gap-2 transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === 'security'
                ? 'border-[#81c995] text-[#81c995] bg-[#131314]/60'
                : 'border-transparent text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>3. Bảo mật & Mật khẩu</span>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto space-y-4">
          {statusMsg && (
            <div
              className={`p-3 rounded-xl border flex items-center gap-2.5 text-[12.5px] ${
                statusMsg.type === 'success'
                  ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#81c995]'
                  : statusMsg.type === 'error'
                  ? 'bg-[#ef4444]/10 border-[#ef4444]/40 text-[#f28b82]'
                  : 'bg-[#8ab4f8]/10 border-[#8ab4f8]/40 text-[#8ab4f8]'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {activeTab === 'theme' ? (
            /* TAB 1: THEME SYSTEM (MEDICAL PAPER LIGHT vs DARK STUDIO) */
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Option 1: Medical Paper Light */}
                <button
                  type="button"
                  onClick={() => {
                    onChangeThemeMode('light');
                    setStatusMsg({
                      type: 'success',
                      text: 'Đã chuyển sang ☀️ Chế độ Sáng (Medical Paper Light - Chuẩn Sách Y Khoa) đồng bộ 100%!',
                    });
                  }}
                  style={{
                    backgroundColor: '#ffffff',
                    borderColor: themeMode === 'light' ? '#2563eb' : '#cbd5e1',
                    borderWidth: themeMode === 'light' ? '2.5px' : '1.5px',
                  }}
                  className="p-4 rounded-2xl text-left transition-all shadow-md hover:shadow-lg cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        style={{ color: '#0f172a' }}
                        className="font-display font-bold text-[14.5px] flex items-center gap-2"
                      >
                        <Sun className="w-4.5 h-4.5 text-[#f59e0b]" />
                        <span>☀️ Chế độ Sáng (Medical Paper Light)</span>
                      </span>
                      {themeMode === 'light' && (
                        <span
                          data-keep-white="true"
                          style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                          className="px-2 py-0.5 rounded-full text-[10.5px] font-bold"
                        >
                          Đang bật
                        </span>
                      )}
                    </div>
                    <p
                      style={{ color: '#475569' }}
                      className="text-[12px] leading-relaxed"
                    >
                      Chuẩn sách giáo trình Y khoa: Nền giấy trắng ngà chống mỏi mắt (<code>#f8fafc</code>), các hộp kiến thức pastel sáng rõ, chữ đen đậm (<code>#0f172a</code>) sắc nét tuyệt đối.
                    </p>
                  </div>

                  {/* Mini Preview Swatches */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-slate-200">
                    <span
                      style={{
                        backgroundColor: '#eff6ff',
                        borderColor: '#3b82f6',
                        color: '#1e3a8a',
                      }}
                      className="px-2 py-0.5 rounded border text-[10.5px] font-semibold"
                    >
                      Nhánh 1
                    </span>
                    <span
                      style={{
                        backgroundColor: '#f0fdf4',
                        borderColor: '#22c55e',
                        color: '#14532d',
                      }}
                      className="px-2 py-0.5 rounded border text-[10.5px] font-semibold"
                    >
                      Nhánh 2
                    </span>
                    <span
                      style={{
                        backgroundColor: '#fff7ed',
                        borderColor: '#f97316',
                        color: '#7c2d12',
                      }}
                      className="px-2 py-0.5 rounded border text-[10.5px] font-semibold"
                    >
                      Nhánh 3
                    </span>
                  </div>
                </button>

                {/* Option 2: Dark Studio */}
                <button
                  type="button"
                  onClick={() => {
                    onChangeThemeMode('dark');
                    setStatusMsg({
                      type: 'success',
                      text: 'Đã chuyển sang 🌙 Chế độ Tối (Dark Studio #131314) dịu mắt ban đêm!',
                    });
                  }}
                  style={{
                    backgroundColor: '#131314',
                    borderColor: themeMode === 'dark' ? '#8ab4f8' : '#3c4043',
                    borderWidth: themeMode === 'dark' ? '2.5px' : '1.5px',
                  }}
                  className="p-4 rounded-2xl text-left transition-all shadow-md hover:shadow-lg cursor-pointer flex flex-col justify-between gap-3"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span
                        data-keep-white="true"
                        style={{ color: '#ffffff' }}
                        className="font-display font-bold text-[14.5px] flex items-center gap-2"
                      >
                        <Moon className="w-4.5 h-4.5 text-[#8ab4f8]" />
                        <span>🌙 Chế độ Tối (Dark Studio)</span>
                      </span>
                      {themeMode === 'dark' && (
                        <span
                          style={{ backgroundColor: '#8ab4f8', color: '#131314' }}
                          className="px-2 py-0.5 rounded-full text-[10.5px] font-bold"
                        >
                          Đang bật
                        </span>
                      )}
                    </div>
                    <p
                      data-keep-white="true"
                      style={{ color: '#9aa0a6' }}
                      className="text-[12px] leading-relaxed"
                    >
                      Phong cách Google NotebookLM Dark Studio (<code>#131314</code>): Tối ưu khi ôn thi ban đêm, độ tương phản dịu mắt và nổi bật nhánh màu.
                    </p>
                  </div>

                  {/* Mini Preview Swatches */}
                  <div className="flex items-center gap-1.5 pt-2 border-t border-[#2d2e30]">
                    <span
                      data-keep-white="true"
                      style={{
                        backgroundColor: '#162033',
                        borderColor: '#3b82f6',
                        color: '#93c5fd',
                      }}
                      className="px-2 py-0.5 rounded border text-[10.5px] font-semibold"
                    >
                      Nhánh 1
                    </span>
                    <span
                      data-keep-white="true"
                      style={{
                        backgroundColor: '#13251e',
                        borderColor: '#22c55e',
                        color: '#86efac',
                      }}
                      className="px-2 py-0.5 rounded border text-[10.5px] font-semibold"
                    >
                      Nhánh 2
                    </span>
                    <span
                      data-keep-white="true"
                      style={{
                        backgroundColor: '#271a14',
                        borderColor: '#f97316',
                        color: '#fdba74',
                      }}
                      className="px-2 py-0.5 rounded border text-[10.5px] font-semibold"
                    >
                      Nhánh 3
                    </span>
                  </div>
                </button>
              </div>

              <div className="p-3.5 rounded-xl bg-[#131314] border border-[#2d2e30] text-[12px] text-[#9aa0a6] space-y-1">
                <p className="font-semibold text-white">
                  💡 Mẹo học tập nhanh:
                </p>
                <p>
                  • Bạn có thể chuyển nhanh <strong>☀️ Sáng / 🌙 Tối</strong> ngay trên góc phải thanh Header bất cứ lúc nào.
                </p>
                <p>
                  • Bấm nút <strong>⛶ Học Full (Phím tắt Z)</strong> trên thanh công cụ để ẩn toàn bộ thanh bên và tiêu đề, dành 100% màn hình cho sơ đồ y khoa.
                </p>
              </div>
            </div>
          ) : isReadOnly ? (
            /* GUEST MODE ISOLATION GATE FOR TAB 2 (SUPABASE) & TAB 3 (SECURITY) */
            <form
              onSubmit={handleGuestUnlockSubmit}
              className="p-6 rounded-2xl bg-[#131314] border border-[#2d2e30] space-y-4 text-center max-w-md mx-auto my-2"
            >
              <div className="w-12 h-12 rounded-2xl bg-[#f59e0b]/15 border border-[#f59e0b]/40 flex items-center justify-center mx-auto text-[#f59e0b]">
                <Lock className="w-6 h-6" />
              </div>
              <div className="space-y-1.5">
                <h3 className="font-display font-bold text-[15px] text-white">
                  🔒 Khu vực dành riêng cho Chủ sở hữu
                </h3>
                <p className="text-[12.5px] text-[#9aa0a6] leading-relaxed">
                  🔒 Khu vực dành riêng cho Chủ sở hữu. Vui lòng nhập Mật khẩu Chủ sở hữu để mở khóa quyền Quản trị.
                </p>
              </div>

              <div className="text-left space-y-1.5">
                <label className="block text-[11.5px] font-medium text-[#9aa0a6]">
                  Mật khẩu Chủ sở hữu:
                </label>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={guestUnlockPassword}
                  onChange={(e) => {
                    setGuestUnlockPassword(e.target.value);
                    setStatusMsg(null);
                  }}
                  placeholder="••••••••"
                  className="w-full bg-[#1e1f20] border border-[#3c4043] focus:border-[#8ab4f8] rounded-xl px-3.5 py-2.5 text-[13.5px] font-mono text-white focus:outline-none"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-display font-bold text-[13px] flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Shield className="w-4 h-4" />
                <span>Mở khóa quyền Chủ sở hữu</span>
              </button>
            </form>
          ) : activeTab === 'cloud' ? (
            <>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[11.5px] font-medium text-[#9aa0a6] mb-1">
                    Supabase Project URL:
                  </label>
                  <input
                    type="text"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full bg-[#131314] border border-[#3c4043] focus:border-[#8ab4f8] rounded-xl px-3.5 py-2 text-[12.5px] text-white font-mono focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-medium text-[#9aa0a6] mb-1">
                    Supabase Anon / Public API Key:
                  </label>
                  <input
                    type="password"
                    autoComplete="off"
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#131314] border border-[#3c4043] focus:border-[#8ab4f8] rounded-xl px-3.5 py-2 text-[12.5px] text-white font-mono focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
                  <div>
                    <label className="block text-[11.5px] font-medium text-[#9aa0a6] mb-1">
                      Tên bảng (Table Name):
                    </label>
                    <input
                      type="text"
                      value={tableName}
                      onChange={(e) => setTableName(e.target.value)}
                      className="w-full bg-[#131314] border border-[#3c4043] focus:border-[#8ab4f8] rounded-xl px-3.5 py-2 text-[12.5px] text-white font-mono focus:outline-none"
                    />
                  </div>

                  {/* Auto-Sync Toggle */}
                  <div className="pt-4">
                    <label
                      onClick={() => setAutoSync(!autoSync)}
                      className="p-2.5 rounded-xl bg-[#131314] border border-[#3c4043] hover:border-[#8ab4f8] flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <RefreshCw
                          className={`w-4 h-4 ${
                            autoSync ? 'text-[#10b981]' : 'text-[#70757a]'
                          }`}
                        />
                        <div>
                          <p className="text-[12px] font-semibold text-white">
                            Tự động đồng bộ (Auto-Sync)
                          </p>
                          <p className="text-[10.5px] text-[#9aa0a6]">
                            Tự Pull khi mở web & Tự Push khi sửa bài
                          </p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={autoSync}
                        onChange={(e) => setAutoSync(e.target.checked)}
                        className="accent-[#8ab4f8] w-4 h-4"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Sync Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <button
                  onClick={handleSaveSettings}
                  className="py-2.5 px-3 rounded-xl bg-[#2d2e30] hover:bg-[#3c4043] text-[12.5px] font-medium text-white flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Database className="w-4 h-4 text-[#8ab4f8]" />
                  <span>Lưu Cấu hình</span>
                </button>

                <button
                  disabled={isSyncing}
                  onClick={handlePushToSupabase}
                  className="py-2.5 px-3 rounded-xl bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-display font-semibold text-[12.5px] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Đẩy lên Cloud (Push)</span>
                </button>

                <button
                  disabled={isSyncing}
                  onClick={handlePullFromSupabase}
                  className="py-2.5 px-3 rounded-xl bg-[#10b981] hover:bg-[#34d399] text-[#131314] font-display font-semibold text-[12.5px] flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <DownloadCloud className="w-4 h-4" />
                  <span>Tải về máy (Pull)</span>
                </button>
              </div>

              {/* SQL Table Bootstrap Guide */}
              <div className="pt-3 border-t border-[#2d2e30] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[#e3e3e3]">
                    Mã SQL khởi tạo bảng trên Supabase (Chỉ cần chạy 1 lần):
                  </span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(SUPABASE_SQL_SNIPPET);
                      setCopiedSql(true);
                      setTimeout(() => setCopiedSql(false), 2000);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-[#2d2e30] hover:bg-[#3c4043] text-[11px] text-[#8ab4f8] flex items-center gap-1 cursor-pointer"
                  >
                    {copiedSql ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    <span>{copiedSql ? 'Đã copy SQL' : 'Copy SQL'}</span>
                  </button>
                </div>
                <pre className="p-3 rounded-xl bg-[#131314] border border-[#2d2e30] font-mono text-[11px] text-[#9aa0a6] overflow-x-auto">
                  {SUPABASE_SQL_SNIPPET}
                </pre>
              </div>
            </>
          ) : (
            /* TAB 3: SECURITY & OWNER PASSWORD SETTINGS (OWNER ONLY) */
            <form onSubmit={handleSaveSecurity} className="space-y-4">
              <div className="p-4 rounded-xl bg-[#131314] border border-[#2d2e30] space-y-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[12.5px] font-display font-semibold text-white mb-1">
                    <Lock className="w-4 h-4 text-[#8ab4f8]" />
                    <span>Đổi mật khẩu Chủ sở hữu</span>
                  </label>
                  <p className="text-[11.5px] text-[#9aa0a6] mb-3">
                    Mật khẩu hiện tại luôn được ẩn bảo mật. Nhập mật khẩu mới (tối thiểu 4 ký tự) vào 2 ô bên dưới nếu bạn muốn thay đổi mật khẩu Chủ sở hữu:
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-[#9aa0a6] mb-1">
                        Nhập mật khẩu mới:
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#1e1f20] border border-[#3c4043] focus:border-[#8ab4f8] rounded-xl px-3.5 py-2 text-[13px] font-mono text-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-[#9aa0a6] mb-1">
                        Xác nhận mật khẩu mới:
                      </label>
                      <input
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-[#1e1f20] border border-[#3c4043] focus:border-[#8ab4f8] rounded-xl px-3.5 py-2 text-[13px] font-mono text-white focus:outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[#2d2e30]">
                  <label className="flex items-center justify-between gap-3 cursor-pointer">
                    <div className="space-y-0.5">
                      <span className="flex items-center gap-1.5 text-[12.5px] font-display font-semibold text-white">
                        <Users className="w-4 h-4 text-[#81c995]" />
                        <span>Cho phép Chế độ Khách / Bạn bè xem bài (Read-Only Guest Mode)</span>
                      </span>
                      <p className="text-[11.5px] text-[#9aa0a6]">
                        Khi bật, bạn bè có link web có thể bấm xem sơ đồ và tự ôn bài nhưng bị khóa toàn bộ nút Xóa, Sửa hoặc Ghi đè Cloud.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={allowGuest}
                      onChange={(e) => handleToggleAllowGuestOnly(e.target.checked)}
                      className="accent-[#81c995] w-4 h-4 shrink-0"
                    />
                  </label>
                </div>
              </div>

              {/* Safe Non-Destructive Sample Restoration */}
              <div className="p-4 rounded-xl bg-[#131314] border border-[#2d2e30] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <span className="text-[12.5px] font-display font-semibold text-white block">
                    Khôi phục bài học mẫu gốc (An toàn 100%)
                  </span>
                  <p className="text-[11.5px] text-[#9aa0a6]">
                    Chỉ gộp thêm 2 bài học mẫu nếu bị thiếu, tuyệt đối không xóa hay ghi đè các bài học bạn đã tạo.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onMergeSampleData();
                    setStatusMsg({
                      type: 'success',
                      text: 'Đã gộp thêm các bài học mẫu bị thiếu (Giữ nguyên 100% bài học hiện có của bạn)!',
                    });
                  }}
                  className="px-3.5 py-2 rounded-xl bg-[#2d2e30] hover:bg-[#3c4043] border border-[#3c4043] text-[12px] font-medium text-[#8ab4f8] hover:text-white shrink-0 transition-colors cursor-pointer"
                >
                  ➕ Khôi phục thêm bài mẫu (Không xóa bài hiện có)
                </button>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-[#81c995] hover:bg-[#a8dab5] text-[#131314] font-display font-semibold text-[13px] transition-colors cursor-pointer"
                >
                  Cập nhật Mật khẩu Mới
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
