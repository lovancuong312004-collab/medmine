export type SemanticBadgeType =
  | 'danger'
  | 'warning'
  | 'treatment'
  | 'diagnostic'
  | 'mechanism';

export type NodeMasteryStatus = 'untested' | 'mastered' | 'review';

export type LessonStudyStatus = 'Chưa học' | 'Đang ôn' | 'Đã thuộc';

export interface ClinicalNotes {
  markdown?: string; // Rich markdown content supporting tables, formulas, lists
  pathogenesis?: string; // Cơ chế bệnh sinh / Giải phẫu bệnh
  clinicalFeatures?: string; // Triệu chứng lâm sàng & Cận lâm sàng
  redFlags?: string[]; // Dấu hiệu cờ đỏ nguy hiểm
  treatment?: string; // Phác đồ điều trị & Liều lượng thuốc
  pearls?: string; // Mẹo nhớ lâm sàng (Clinical Pearls)
}

export interface MindmapNode {
  id: string;
  label: string;
  summary?: string;
  badge?: SemanticBadgeType;
  accentColor?: string; // Optional custom left accent color for Level 1 pillars
  collapsed?: boolean;
  mastery?: NodeMasteryStatus;
  clinicalNotes?: ClinicalNotes;
  children?: MindmapNode[];
}

// 3-Tier Curriculum Structure
// Tier 1: Organ System / Block (Khối / Hệ cơ quan)
// Tier 2: Subject / Course (Học phần / Phân môn)
// Tier 3: Lesson Mindmap (Bài học)

export interface LessonMindmap {
  id: string;
  title: string;
  systemId: string; // Tier 1 ID
  subjectId: string; // Tier 2 ID
  status: LessonStudyStatus;
  tags: string[];
  updatedAt: string;
  rootNode: MindmapNode;
}

export interface MedicalSubject {
  id: string;
  systemId: string;
  name: string;
  code?: string;
}

export interface OrganSystem {
  id: string;
  name: string;
  iconName: string;
}

export interface SecuritySettings {
  ownerPassword: string; // Default: 'y6medmind'
  allowGuestMode: boolean; // Default: true
  updatedAt?: string;
}

export interface MedMindDatabase {
  systems: OrganSystem[];
  subjects: MedicalSubject[];
  lessons: LessonMindmap[];
  security?: SecuritySettings;
}

export type ActiveRecallLevel = 'off' | 'level2' | 'level3';

export type MindmapViewMode =
  | 'horizontal'
  | 'vertical'
  | 'bento'
  | 'cornell'
  | 'fishbone'
  | 'matrix';

export type AuthRole = 'unauthenticated' | 'owner' | 'guest';

export type CloudSyncStatus = 'local' | 'syncing' | 'synced' | 'error';

export interface SupabaseConfig {
  url: string;
  anonKey: string;
  tableName: string;
  autoSync: boolean;
  lastSyncedAt?: string;
}

export const SEMANTIC_BADGE_CONFIG: Record<
  SemanticBadgeType,
  {
    label: string;
    shortLabel: string;
    dot: string;
    color: string;
    bgColor: string;
    borderColor: string;
    description: string;
  }
> = {
  danger: {
    label: 'Cờ đỏ / Cấp cứu',
    shortLabel: 'Cờ đỏ',
    dot: '🔴',
    color: '#ef4444',
    bgColor: 'rgba(239, 68, 68, 0.14)',
    borderColor: 'rgba(239, 68, 68, 0.45)',
    description: 'Cờ đỏ lâm sàng, cấp cứu, chống chỉ định tuyệt đối hoặc biến chứng tử vong',
  },
  warning: {
    label: 'Lưu ý lâm sàng',
    shortLabel: 'Lưu ý',
    dot: '🟡',
    color: '#f59e0b',
    bgColor: 'rgba(245, 158, 11, 0.14)',
    borderColor: 'rgba(245, 158, 11, 0.45)',
    description: 'Thận trọng lâm sàng, tác dụng phụ, biến chứng hoặc yếu tố nguy cơ',
  },
  treatment: {
    label: 'Phác đồ / Điều trị',
    shortLabel: 'Điều trị',
    dot: '🟢',
    color: '#10b981',
    bgColor: 'rgba(16, 185, 129, 0.14)',
    borderColor: 'rgba(16, 185, 129, 0.45)',
    description: 'Phác đồ điều trị, thuốc, liều lượng hoặc nguyên tắc phẫu thuật',
  },
  diagnostic: {
    label: 'Tiêu chuẩn / Cận LS',
    shortLabel: 'Chẩn đoán',
    dot: '🔵',
    color: '#3b82f6',
    bgColor: 'rgba(59, 130, 246, 0.14)',
    borderColor: 'rgba(59, 130, 246, 0.45)',
    description: 'Tiêu chuẩn vàng, dấu hiệu mô bệnh học, xét nghiệm hoặc chẩn đoán hình ảnh',
  },
  mechanism: {
    label: 'Cơ chế / Giải phẫu bệnh',
    shortLabel: 'Cơ chế',
    dot: '🟣',
    color: '#a855f7',
    bgColor: 'rgba(168, 85, 247, 0.14)',
    borderColor: 'rgba(168, 85, 247, 0.45)',
    description: 'Cơ chế phân tử, sinh lý bệnh, đột biến gen hoặc vi thể giải phẫu bệnh',
  },
};

export const LEVEL1_PILLAR_ACCENTS = [
  '#8ab4f8', // Google Blue
  '#c58af9', // Soft Purple
  '#81c995', // Clinical Green
  '#fdd663', // Warm Amber
  '#f28b82', // Coral Red
  '#78d9ec', // Cyan
];
