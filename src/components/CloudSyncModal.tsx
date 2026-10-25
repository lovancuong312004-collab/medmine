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
  onSaveConfig: (newConfig: SupabaseConfig) => void;
  onReplaceDatabase: (newDb: MedMindDatabase) => void;
  onUpdateSecuritySettings: (newSecurity: SecuritySettings) => void;
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
  onSaveConfig,
  onReplaceDatabase,
  onUpdateSecuritySettings,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<'cloud' | 'security'>('cloud');
  const [url, setUrl] = useState(config.url);
  const [anonKey, setAnonKey] = useState(config.anonKey);
  const [tableName, setTableName] = useState(config.tableName || 'medmind_store');
  const [autoSync, setAutoSync] = useState<boolean>(config.autoSync);

  // Security states
  const currentSecurity = database.security || {
    ownerPassword: DEFAULT_OWNER_PASSWORD,
    allowGuestMode: true,
  };
  const [newPassword, setNewPassword] = useState(currentSecurity.ownerPassword);
  const [allowGuest, setAllowGuest] = useState(currentSecurity.allowGuestMode);

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
    setStatusMsg({ type: 'info', text: 'Đang đẩy dữ liệu & mật khẩu bảo mật lên Supabase Cloud...' });

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
    setStatusMsg({ type: 'info', text: 'Đang tải kho bài học mới nhất từ Supabase Cloud...' });

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
    if (!newPassword.trim()) {
      setStatusMsg({
        type: 'error',
        text: 'Mật khẩu Chủ sở hữu không được để trống.',
      });
      return;
    }

    const updatedSecurity: SecuritySettings = {
      ownerPassword: newPassword.trim(),
      allowGuestMode: allowGuest,
      updatedAt: new Date().toISOString(),
    };

    onUpdateSecuritySettings(updatedSecurity);
    setStatusMsg({
      type: 'success',
      text: 'Đã cập nhật Mật khẩu Chủ sở hữu và quyền truy cập Khách (đã đồng bộ lên Cloud nếu bật Auto-Sync)!',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-text">
      <div className="w-full max-w-2xl bg-[#1e1f20] border border-[#3c4043] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#2d2e30] flex items-center justify-between bg-[#161718]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#10b981]/15 border border-[#10b981]/40 flex items-center justify-center text-[#10b981]">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-[16px] text-white">
                Đồng bộ Đám mây Supabase & Bảo mật Truy cập
              </h2>
              <p className="text-[12px] text-[#9aa0a6]">
                Tự động đồng bộ đa thiết bị (Laptop, iPad, Điện thoại) và quản lý mật khẩu Chủ sở hữu
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
        <div className="px-6 pt-3 border-b border-[#2d2e30] flex items-center gap-2 bg-[#1b1c1e]">
          <button
            onClick={() => {
              setActiveTab('cloud');
              setStatusMsg(null);
            }}
            className={`px-4 py-2.5 text-[13px] font-display font-semibold rounded-t-xl border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'cloud'
                ? 'border-[#8ab4f8] text-[#8ab4f8] bg-[#131314]/60'
                : 'border-transparent text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Cloud className="w-4 h-4" />
            <span>1. Tự động Đồng bộ Supabase (Auto-Sync)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('security');
              setStatusMsg(null);
            }}
            className={`px-4 py-2.5 text-[13px] font-display font-semibold rounded-t-xl border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'security'
                ? 'border-[#81c995] text-[#81c995] bg-[#131314]/60'
                : 'border-transparent text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>2. Bảo mật & Mật khẩu Chủ sở hữu</span>
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

          {activeTab === 'cloud' ? (
            <>
              <div className="grid grid-cols-1 gap-3">
                <div>
                  <label className="block text-[11.5px] font-medium text-[#9aa0a6] mb-1">
                    Supabase Project URL (Cũng có thể điền sẵn vào hằng số <code className="text-[#8ab4f8]">DEFAULT_SUPABASE_URL</code> trong <code className="text-[#8ab4f8]">src/utils/supabaseSync.ts</code>):
                  </label>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://xyzcompany.supabase.co"
                    className="w-full bg-[#131314] border border-[#3c4043] focus:border-[#8ab4f8] rounded-xl px-3.5 py-2 text-[12.5px] text-white font-mono focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-medium text-[#9aa0a6] mb-1">
                    Supabase Anon / Public API Key (<code className="text-[#8ab4f8]">DEFAULT_SUPABASE_ANON_KEY</code>):
                  </label>
                  <input
                    type="password"
                    disabled={isReadOnly}
                    value={anonKey}
                    onChange={(e) => setAnonKey(e.target.value)}
                    placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                    className="w-full bg-[#131314] border border-[#3c4043] focus:border-[#8ab4f8] rounded-xl px-3.5 py-2 text-[12.5px] text-white font-mono focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center pt-1">
                  <div>
                    <label className="block text-[11.5px] font-medium text-[#9aa0a6] mb-1">
                      Tên bảng (Table Name):
                    </label>
                    <input
                      type="text"
                      disabled={isReadOnly}
                      value={tableName}
                      onChange={(e) => setTableName(e.target.value)}
                      className="w-full bg-[#131314] border border-[#3c4043] focus:border-[#8ab4f8] rounded-xl px-3.5 py-2 text-[12.5px] text-white font-mono focus:outline-none disabled:opacity-50"
                    />
                  </div>

                  {/* Auto-Sync Toggle */}
                  <div className="pt-4">
                    <label
                      onClick={() => !isReadOnly && setAutoSync(!autoSync)}
                      className={`p-2.5 rounded-xl bg-[#131314] border border-[#3c4043] flex items-center justify-between cursor-pointer ${
                        isReadOnly ? 'opacity-50 cursor-not-allowed' : 'hover:border-[#8ab4f8]'
                      }`}
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
                        disabled={isReadOnly}
                        className="accent-[#8ab4f8] w-4 h-4"
                      />
                    </label>
                  </div>
                </div>
              </div>

              {/* Sync Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <button
                  disabled={isReadOnly}
                  onClick={handleSaveSettings}
                  className="py-2.5 px-3 rounded-xl bg-[#2d2e30] hover:bg-[#3c4043] text-[12.5px] font-medium text-white flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Database className="w-4 h-4 text-[#8ab4f8]" />
                  <span>Lưu Cấu hình</span>
                </button>

                <button
                  disabled={isSyncing || isReadOnly}
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
            /* TAB 2: SECURITY & OWNER PASSWORD SETTINGS */
            <form onSubmit={handleSaveSecurity} className="space-y-4">
              {isReadOnly && (
                <div className="p-3 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/40 text-[#fdd663] text-[12px]">
                  Bạn đang ở chế độ Khách (Chỉ đọc). Vui lòng đăng nhập bằng mật khẩu Chủ sở hữu để thay đổi cài đặt bảo mật.
                </div>
              )}

              <div className="p-4 rounded-xl bg-[#131314] border border-[#2d2e30] space-y-3">
                <div>
                  <label className="flex items-center gap-1.5 text-[12.5px] font-display font-semibold text-white mb-1">
                    <Lock className="w-4 h-4 text-[#8ab4f8]" />
                    <span>Mật khẩu / Mã PIN Chủ sở hữu (Mặc định: y6medmind)</span>
                  </label>
                  <p className="text-[11.5px] text-[#9aa0a6] mb-2">
                    Mật khẩu này dùng để mở khóa toàn quyền Thêm/Sửa/Xóa bài học và tự động đồng bộ cùng kho dữ liệu lên Supabase.
                  </p>
                  <input
                    type="text"
                    disabled={isReadOnly}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nhập mật khẩu chủ sở hữu mới..."
                    className="w-full bg-[#1e1f20] border border-[#3c4043] focus:border-[#8ab4f8] rounded-xl px-3.5 py-2 text-[13px] font-mono text-white focus:outline-none disabled:opacity-50"
                  />
                </div>

                <div className="pt-2 border-t border-[#2d2e30]">
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
                      disabled={isReadOnly}
                      checked={allowGuest}
                      onChange={(e) => setAllowGuest(e.target.checked)}
                      className="accent-[#81c995] w-4 h-4 shrink-0"
                    />
                  </label>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isReadOnly}
                  className="px-5 py-2.5 rounded-xl bg-[#81c995] hover:bg-[#a8dab5] text-[#131314] font-display font-semibold text-[13px] transition-colors cursor-pointer disabled:opacity-50"
                >
                  Lưu Cài đặt Bảo mật & Đồng bộ
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
