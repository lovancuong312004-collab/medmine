import { MedMindDatabase, SupabaseConfig } from '../types/mindmap';

/**
 * ============================================================================
 * CẤU HÌNH MẶC ĐỊNH SUPABASE CHO MEDMIND STUDIO (ĐỒNG BỘ MỌI THIẾT BỊ)
 * ============================================================================
 * Bạn có thể dán trực tiếp Project URL và Anon Key của Supabase vào 2 hằng số
 * bên dưới (hoặc cấu hình trong giao diện Web) để điện thoại / iPad tự động kết
 * nối mà không cần nhập lại Key.
 */
export const DEFAULT_SUPABASE_URL: string =
  (import.meta as any).env?.VITE_SUPABASE_URL ||
  'https://vbhptvtrewkoopayaraz.supabase.co';

export const DEFAULT_SUPABASE_ANON_KEY: string =
  (import.meta as any).env?.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_f0BNenTQOhIMHiMLpTk0DQ_8Kj808Bd';

export const DEFAULT_SUPABASE_TABLE = 'medmind_store';
export const DEFAULT_WORKSPACE_ROW_ID = 'medmind_primary_workspace';
export const DEFAULT_OWNER_PASSWORD = 'y6medmind';

export function cleanSupabaseUrl(raw: string): string {
  return (raw || '').trim().replace(/\/+$/, '');
}

export function getEffectiveSupabaseConfig(saved?: Partial<SupabaseConfig> | null): SupabaseConfig {
  const url = cleanSupabaseUrl(saved?.url || DEFAULT_SUPABASE_URL);
  const anonKey = (saved?.anonKey || DEFAULT_SUPABASE_ANON_KEY || '').trim();
  const tableName = (saved?.tableName || DEFAULT_SUPABASE_TABLE).trim();
  const autoSync = saved?.autoSync !== undefined ? saved.autoSync : true;

  return {
    url,
    anonKey,
    tableName,
    autoSync,
    lastSyncedAt: saved?.lastSyncedAt,
  };
}

export function isSupabaseConfigured(config: SupabaseConfig): boolean {
  return Boolean(cleanSupabaseUrl(config.url) && config.anonKey.trim());
}

/**
 * Pulls the latest MedMindDatabase (including synced ownerPassword & allowGuestMode) from Supabase
 */
export async function pullDatabaseFromSupabase(config: SupabaseConfig): Promise<{
  ok: boolean;
  database?: MedMindDatabase;
  updatedAt?: string;
  error?: string;
}> {
  const baseUrl = cleanSupabaseUrl(config.url);
  const key = config.anonKey.trim();
  const table = config.tableName.trim() || DEFAULT_SUPABASE_TABLE;

  if (!baseUrl || !key) {
    return { ok: false, error: 'Chưa cấu hình Supabase URL và Anon Key.' };
  }

  try {
    const endpoint = `${baseUrl}/rest/v1/${table}?id=eq.${DEFAULT_WORKSPACE_ROW_ID}&select=payload,updated_at`;
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
      },
    });

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${errText}` };
    }

    const rows = await res.json();
    if (!Array.isArray(rows) || rows.length === 0 || !rows[0]?.payload) {
      return {
        ok: false,
        error: 'Chưa có bản lưu nào trên Supabase Cloud.',
      };
    }

    const cloudDb = rows[0].payload as MedMindDatabase;
    if (!cloudDb || !Array.isArray(cloudDb.lessons)) {
      return { ok: false, error: 'Dữ liệu trên Cloud không đúng cấu trúc MedMind.' };
    }

    return {
      ok: true,
      database: cloudDb,
      updatedAt: rows[0].updated_at,
    };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Lỗi kết nối mạng tới Supabase.',
    };
  }
}

/**
 * Pushes the entire MedMindDatabase (including lessons, curriculum, and security settings) to Supabase
 */
export async function pushDatabaseToSupabase(
  config: SupabaseConfig,
  database: MedMindDatabase
): Promise<{
  ok: boolean;
  syncedAt?: string;
  error?: string;
}> {
  const baseUrl = cleanSupabaseUrl(config.url);
  const key = config.anonKey.trim();
  const table = config.tableName.trim() || DEFAULT_SUPABASE_TABLE;

  if (!baseUrl || !key) {
    return { ok: false, error: 'Chưa cấu hình Supabase URL và Anon Key.' };
  }

  try {
    const nowIso = new Date().toISOString();
    const endpoint = `${baseUrl}/rest/v1/${table}`;
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({
        id: DEFAULT_WORKSPACE_ROW_ID,
        payload: database,
        updated_at: nowIso,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return { ok: false, error: `HTTP ${res.status}: ${errText}` };
    }

    return { ok: true, syncedAt: nowIso };
  } catch (err: any) {
    return {
      ok: false,
      error: err?.message || 'Không thể đẩy dữ liệu lên Supabase.',
    };
  }
}
