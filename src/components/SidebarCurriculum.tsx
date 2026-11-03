import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  FolderPlus,
  FolderInput,
  BookOpen,
  Dna,
  Microscope,
  HeartPulse,
  Wind,
  Scissors,
  Baby,
  Cloud,
  Download,
  Upload,
  Trash2,
  Edit2,
  Check,
  X,
  CheckCircle2,
  Clock,
  Circle,
  PanelLeftClose,
  PanelLeftOpen,
  Lock,
  AlertTriangle,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  GripVertical,
} from 'lucide-react';
import {
  MedMindDatabase,
  LessonMindmap,
  LessonStudyStatus,
} from '../types/mindmap';
import { calculateMasteryStats } from '../utils/mindmapLayout';

interface SidebarCurriculumProps {
  database: MedMindDatabase;
  activeLessonId: string;
  isReadOnly: boolean;
  themeMode?: 'dark' | 'light';
  onSelectLesson: (lessonId: string) => void;
  onCreateSystem: (name: string) => void;
  onRenameSystem: (systemId: string, newName: string) => void;
  onDeleteSystem: (systemId: string) => void;
  onCreateSubject: (systemId: string, name: string) => void;
  onRenameSubject: (subjectId: string, newName: string) => void;
  onDeleteSubject: (subjectId: string) => void;
  onRenameLesson: (lessonId: string, newTitle: string) => void;
  onDeleteLesson: (lessonId: string) => void;
  onUpdateLessonStatus: (lessonId: string, status: LessonStudyStatus) => void;
  onSortLessonsNaturally?: (subjectId?: string) => void;
  onMoveLessonOrder?: (
    lessonId: string,
    action: 'up' | 'down' | 'top' | 'bottom' | number
  ) => void;
  onMoveLessonToSubject?: (lessonId: string, targetSubjectId: string) => void;
  onReorderLessonByDrop?: (
    draggedLessonId: string,
    targetLessonId: string,
    position: 'before' | 'after'
  ) => void;
  onOpenImporter: () => void;
  onOpenCloudModal: () => void;
  onExportDatabaseJson: () => void;
  onImportDatabaseJson: (file: File) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
  onLogout?: () => void;
  cloudConnected: boolean;
}

const SYSTEM_ICON_MAP: Record<string, React.ReactNode> = {
  Dna: <Dna className="w-4 h-4 text-[#c58af9]" />,
  Microscope: <Microscope className="w-4 h-4 text-[#8ab4f8]" />,
  HeartPulse: <HeartPulse className="w-4 h-4 text-[#f28b82]" />,
  Wind: <Wind className="w-4 h-4 text-[#78d9ec]" />,
  Scissors: <Scissors className="w-4 h-4 text-[#fdd663]" />,
  Baby: <Baby className="w-4 h-4 text-[#81c995]" />,
};

const SidebarCurriculumComponent: React.FC<SidebarCurriculumProps> = ({
  database,
  activeLessonId,
  isReadOnly,
  themeMode = 'dark',
  onSelectLesson,
  onCreateSystem,
  onRenameSystem,
  onDeleteSystem,
  onCreateSubject,
  onRenameSubject,
  onDeleteSubject,
  onRenameLesson,
  onDeleteLesson,
  onUpdateLessonStatus,
  onSortLessonsNaturally,
  onMoveLessonOrder,
  onMoveLessonToSubject,
  onReorderLessonByDrop,
  onOpenImporter,
  onOpenCloudModal,
  onExportDatabaseJson,
  onImportDatabaseJson,
  isCollapsed,
  onToggleCollapse,
  isMobileOpen = false,
  onCloseMobile,
  onLogout,
  cloudConnected,
}) => {
  const isLight = themeMode === 'light';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | LessonStudyStatus>('ALL');
  const [expandedSystems, setExpandedSystems] = useState<Record<string, boolean>>({
    'sys-ent': true,
    'sys-oncology': true,
    'sys-cardio': true,
    'sys-basic': true,
  });
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({
    'sub-ent-clin': true,
    'sub-onco-path': true,
    'sub-cardio-int': true,
  });

  // Dedicated Organize & Move Mode + Drag-and-Drop states
  const [isOrganizeMode, setIsOrganizeMode] = useState(false);
  const [draggedLessonId, setDraggedLessonId] = useState<string | null>(null);
  const [dropIndicator, setDropIndicator] = useState<{
    targetId: string;
    position: 'before' | 'after' | 'subject';
  } | null>(null);
  const [movingLessonFolderId, setMovingLessonFolderId] = useState<string | null>(
    null
  );

  // Inline creation states
  const [addingSystem, setAddingSystem] = useState(false);
  const [newSystemName, setNewSystemName] = useState('');
  const [addingSubjectForSystem, setAddingSubjectForSystem] = useState<string | null>(null);
  const [newSubjectName, setNewSubjectName] = useState('');

  // Inline rename states
  const [editingItem, setEditingItem] = useState<{
    type: 'system' | 'subject' | 'lesson';
    id: string;
    value: string;
  } | null>(null);

  // Confirmation modal before deleting lesson, subject, or system
  const [confirmDelete, setConfirmDelete] = useState<{
    type: 'system' | 'subject' | 'lesson';
    id: string;
    name: string;
    subCount?: number;
  } | null>(null);

  // Memoize mastery stats per lesson so switching lessons or dragging never re-traverses 20+ trees
  const lessonStatsMap = useMemo(() => {
    const map = new Map<
      string,
      { total: number; mastered: number; review: number; untested: number; percent: number }
    >();
    database.lessons.forEach((l) => {
      if (l?.id && l.rootNode) {
        map.set(l.id, calculateMasteryStats(l.rootNode));
      }
    });
    return map;
  }, [database.lessons]);

  const toggleSystem = (id: string) => {
    setExpandedSystems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSubject = (id: string) => {
    setExpandedSubjects((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleAddSystemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReadOnly && newSystemName.trim()) {
      onCreateSystem(newSystemName.trim());
      setNewSystemName('');
      setAddingSystem(false);
    }
  };

  const handleAddSubjectSubmit = (e: React.FormEvent, systemId: string) => {
    e.preventDefault();
    if (!isReadOnly && newSubjectName.trim()) {
      onCreateSubject(systemId, newSubjectName.trim());
      setNewSubjectName('');
      setAddingSubjectForSystem(null);
      setExpandedSystems((prev) => ({ ...prev, [systemId]: true }));
    }
  };

  const handleRenameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem || isReadOnly) return;
    const trimmed = editingItem.value.trim();
    if (trimmed) {
      if (editingItem.type === 'system') onRenameSystem(editingItem.id, trimmed);
      else if (editingItem.type === 'subject') onRenameSubject(editingItem.id, trimmed);
      else if (editingItem.type === 'lesson') onRenameLesson(editingItem.id, trimmed);
    }
    setEditingItem(null);
  };

  const executeConfirmedDelete = () => {
    if (!confirmDelete || isReadOnly) return;
    if (confirmDelete.type === 'system') onDeleteSystem(confirmDelete.id);
    else if (confirmDelete.type === 'subject') onDeleteSubject(confirmDelete.id);
    else if (confirmDelete.type === 'lesson') onDeleteLesson(confirmDelete.id);
    setConfirmDelete(null);
  };

  const normalizedQuery = searchQuery.trim().toLowerCase();
  const matchesSearch = (lesson: LessonMindmap) => {
    if (statusFilter !== 'ALL' && lesson.status !== statusFilter) return false;
    if (!normalizedQuery) return true;
    return (
      lesson.title.toLowerCase().includes(normalizedQuery) ||
      lesson.tags.some((t) => t.toLowerCase().includes(normalizedQuery)) ||
      JSON.stringify(lesson.rootNode).toLowerCase().includes(normalizedQuery)
    );
  };

  return (
    <>
      {/* 1. DESKTOP COLLAPSED RAIL (COMPLETELY HIDDEN ON MOBILE: hidden md:flex) */}
      {isCollapsed && (
        <aside
          className={`hidden md:flex w-14 h-full border-r flex-col items-center py-4 justify-between shrink-0 z-20 ${
            isLight
              ? 'bg-white border-slate-200'
              : 'bg-[#1e1f20] border-[#2d2e30]'
          }`}
        >
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={onToggleCollapse}
              title="Mở rộng thanh quản lý học phần"
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                isLight
                  ? 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  : 'bg-[#2d2e30] hover:bg-[#3c4043] text-[#e3e3e3]'
              }`}
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
            {!isReadOnly && (
              <button
                onClick={onOpenImporter}
                title="+ Nhập bài học từ AI"
                className="w-9 h-9 rounded-lg bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] flex items-center justify-center font-semibold transition-colors shadow-sm cursor-pointer"
              >
                <Plus className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="flex flex-col items-center gap-3">
            <button
              onClick={onOpenCloudModal}
              title="Đồng bộ Đám mây Supabase & Bảo mật"
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                cloudConnected
                  ? 'bg-[#10b981]/20 text-[#10b981]'
                  : isLight
                  ? 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  : 'bg-[#2d2e30] text-[#9aa0a6] hover:text-white'
              }`}
            >
              <Cloud className="w-4 h-4" />
            </button>
          </div>
        </aside>
      )}

      {/* 2. MOBILE SLIDE-OVER BACKDROP (Only visible on <768px when isMobileOpen is true) */}
      {isMobileOpen && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/50 z-40 backdrop-blur-xs md:hidden"
        />
      )}

      {/* 3. FULL SIDEBAR DRAWER (Slide-over on Mobile, Static on Desktop when !isCollapsed) */}
      <aside
        className={`${
          isMobileOpen ? 'fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-[320px] shadow-2xl' : 'hidden'
        } ${
          !isCollapsed ? 'md:static md:z-20 md:flex md:w-[310px] md:shadow-none' : 'md:hidden'
        } h-full border-r flex-col shrink-0 select-none ${
          isLight
            ? 'bg-white border-slate-200 text-slate-900'
            : 'bg-[#1e1f20] border-[#2d2e30] text-[#e3e3e3]'
        }`}
      >
        {/* Brand Header */}
        <div
          className={`px-4 py-3.5 border-b flex items-center justify-between ${
            isLight ? 'border-slate-200 bg-white' : 'border-[#2d2e30]'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-8 h-8 rounded-lg border flex items-center justify-center shadow-inner ${
                isLight
                  ? 'bg-blue-50 border-blue-300'
                  : 'bg-[#3f3c5c] border-[#8ab4f8]/60'
              }`}
            >
              <Dna
                className={`w-4 h-4 ${
                  isLight ? 'text-blue-600' : 'text-[#8ab4f8]'
                }`}
              />
            </div>
            <div>
              <h1
                className={`font-display font-bold text-[15px] tracking-tight leading-none ${
                  isLight ? 'text-slate-900' : 'text-white'
                }`}
              >
                MedMind Studio
              </h1>
              <p
                className={`text-[11px] mt-1 ${
                  isLight ? 'text-slate-500' : 'text-[#9aa0a6]'
                }`}
              >
                {isReadOnly ? 'Chế độ Khách (Chỉ đọc)' : 'NotebookLM Medical Mindmap'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Close button on Mobile */}
            <button
              onClick={onCloseMobile}
              title="Đóng danh sách bài học"
              className={`p-1.5 rounded-lg transition-colors md:hidden cursor-pointer ${
                isLight
                  ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-[#9aa0a6] hover:text-white hover:bg-[#2d2e30]'
              }`}
            >
              <X className="w-4.5 h-4.5" />
            </button>

            {/* Collapse button on Desktop */}
            <button
              onClick={onToggleCollapse}
              title="Thu gọn Sidebar"
              className={`hidden md:flex p-1.5 rounded-lg transition-colors cursor-pointer ${
                isLight
                  ? 'text-slate-500 hover:text-slate-900 hover:bg-slate-100'
                  : 'text-[#9aa0a6] hover:text-white hover:bg-[#2d2e30]'
              }`}
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Primary CTA: AI Importer */}
        <div
          className={`p-3 border-b ${
            isLight ? 'border-slate-200 bg-white' : 'border-[#2d2e30]'
          }`}
        >
          {!isReadOnly ? (
            <button
              onClick={() => {
                onCloseMobile?.();
                onOpenImporter();
              }}
              className={`w-full py-2.5 px-3.5 rounded-xl font-display font-semibold text-[13px] flex items-center justify-center gap-2 transition-all shadow-sm cursor-pointer ${
                isLight
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314]'
              }`}
            >
              <Plus
                data-keep-white={isLight ? 'true' : undefined}
                className="w-4 h-4 stroke-[2.5]"
              />
              <span data-keep-white={isLight ? 'true' : undefined}>
                Nhập bài học từ AI
              </span>
            </button>
          ) : (
            <div
              className={`w-full py-2 px-3 rounded-xl border text-[12px] flex items-center justify-center gap-2 ${
                isLight
                  ? 'bg-amber-50 border-amber-200 text-amber-800'
                  : 'bg-[#2d2e30]/70 border-[#3c4043] text-[#9aa0a6]'
              }`}
            >
              <Lock className="w-3.5 h-3.5 text-[#f59e0b]" />
              <span>Chế độ Khách (Đã khóa chỉnh sửa)</span>
            </div>
          )}

          {/* Global Search across 3 tiers */}
          <div className="relative mt-2.5">
            <Search
              className={`w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 ${
                isLight ? 'text-slate-400' : 'text-[#9aa0a6]'
              }`}
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm bệnh học, triệu chứng, thuốc..."
              className={`w-full border rounded-lg pl-8 pr-3 py-1.5 text-[12px] focus:outline-none transition-colors ${
                isLight
                  ? 'bg-slate-50 border-slate-200 focus:border-blue-500 text-slate-900 placeholder-slate-400'
                  : 'bg-[#131314] border-[#2d2e30] focus:border-[#8ab4f8] text-[#e3e3e3] placeholder-[#70757a]'
              }`}
            />
          </div>

          {/* Study Status Filter Bar */}
          <div
            className={`grid grid-cols-4 gap-1 mt-2 p-1 rounded-lg border ${
              isLight
                ? 'bg-slate-100 border-slate-200'
                : 'bg-[#131314] border-[#2d2e30]'
            }`}
          >
            {(['ALL', 'Chưa học', 'Đang ôn', 'Đã thuộc'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`py-1 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                  statusFilter === st
                    ? isLight
                      ? 'bg-white text-blue-700 font-semibold shadow-xs'
                      : 'bg-[#2d2e30] text-white'
                    : isLight
                    ? 'text-slate-600 hover:text-slate-900'
                    : 'text-[#9aa0a6] hover:text-[#e3e3e3]'
                }`}
              >
                {st === 'ALL' ? 'Tất cả' : st}
              </button>
            ))}
          </div>
        </div>

        {/* 3-Tier Curriculum Tree Header + Quick Sort & Organize Bar */}
        <div
          className={`px-3 py-2 flex flex-col gap-1.5 text-[11px] font-medium border-b ${
            isLight
              ? 'text-slate-500 border-slate-200 bg-slate-50/60'
              : 'text-[#9aa0a6] border-[#2d2e30]/60'
          }`}
        >
          <div className="flex items-center justify-between gap-1">
            <span className="truncate font-semibold">HỆ / HỌC PHẦN / BÀI HỌC</span>
            {!isReadOnly && (
              <button
                onClick={() => setAddingSystem(true)}
                title="Thêm Khối / Hệ cơ quan mới (Tầng 1)"
                className={`flex items-center gap-1 hover:underline cursor-pointer shrink-0 ${
                  isLight ? 'text-blue-600 font-semibold' : 'text-[#8ab4f8]'
                }`}
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>+ Hệ mới</span>
              </button>
            )}
          </div>

          {!isReadOnly && database.lessons.length > 1 && (
            <div className="flex items-center gap-1.5">
              {onSortLessonsNaturally && (
                <button
                  onClick={() => onSortLessonsNaturally()}
                  title="Tự động sắp xếp tất cả bài học theo đúng thứ tự Câu 1 ➔ Câu N"
                  className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg border text-[11px] transition-colors cursor-pointer ${
                    isLight
                      ? 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100 font-semibold'
                      : 'bg-[#242528] border-[#3c4043] text-[#8ab4f8] hover:bg-[#2d2e30] font-semibold'
                  }`}
                >
                  <ArrowUpDown className="w-3 h-3 shrink-0" />
                  <span>Xếp Câu 1➔N</span>
                </button>
              )}

              <button
                onClick={() => setIsOrganizeMode((prev) => !prev)}
                title="Bật chế độ Kéo thả, Đổi vị trí (#1, #2...) và Di chuyển bài học sang Học phần khác"
                className={`flex-1 flex items-center justify-center gap-1 px-2 py-1 rounded-lg border text-[11px] transition-colors cursor-pointer ${
                  isOrganizeMode
                    ? isLight
                      ? 'bg-emerald-600 border-emerald-700 text-white font-bold shadow-xs'
                      : 'bg-[#10b981]/25 border-[#10b981] text-[#6ee7b7] font-bold'
                    : isLight
                    ? 'bg-white border-slate-300 text-slate-700 hover:bg-slate-100 font-medium'
                    : 'bg-[#131314] border-[#3c4043] text-[#e3e3e3] hover:bg-[#2d2e30]'
                }`}
              >
                <GripVertical className="w-3 h-3 shrink-0" />
                <span>{isOrganizeMode ? '✓ Xong sắp xếp' : 'Di chuyển / Xếp'}</span>
              </button>
            </div>
          )}

          {isOrganizeMode && !isReadOnly && (
            <div
              className={`px-2 py-1 rounded-md text-[10.5px] leading-snug ${
                isLight
                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  : 'bg-[#10b981]/10 text-[#a7f3d0] border border-[#10b981]/30'
              }`}
            >
              💡 <strong>Mẹo:</strong> Kéo thả trực tiếp thẻ bài học để đổi chỗ, chọn số <strong>#1, #2...</strong> để nhảy vị trí, hoặc thả vào tên <strong>Học phần</strong> để chuyển thư mục!
            </div>
          )}
        </div>

        {/* Add Tier 1 Form */}
        {addingSystem && !isReadOnly && (
          <form
            onSubmit={handleAddSystemSubmit}
            className={`p-2.5 border-b ${
              isLight
                ? 'bg-slate-50 border-slate-200'
                : 'bg-[#131314] border-[#2d2e30]'
            }`}
          >
            <p
              className={`text-[11px] mb-1.5 ${
                isLight ? 'text-slate-600' : 'text-[#9aa0a6]'
              }`}
            >
              Tên Khối / Hệ cơ quan (Tầng 1):
            </p>
            <div className="flex gap-1.5">
              <input
                type="text"
                autoFocus
                value={newSystemName}
                onChange={(e) => setNewSystemName(e.target.value)}
                placeholder="VD: Hệ Thần kinh, Nội tiết..."
                className={`flex-1 border rounded px-2 py-1 text-xs focus:outline-none ${
                  isLight
                    ? 'bg-white border-slate-300 text-slate-900 focus:border-blue-500'
                    : 'bg-[#1e1f20] border-[#3c4043] text-white focus:border-[#8ab4f8]'
                }`}
              />
              <button
                type="submit"
                className="px-2.5 py-1 bg-[#8ab4f8] text-[#131314] rounded text-xs font-semibold"
              >
                Lưu
              </button>
              <button
                type="button"
                onClick={() => setAddingSystem(false)}
                className="px-2 py-1 bg-[#2d2e30] text-[#9aa0a6] rounded text-xs"
              >
                Hủy
              </button>
            </div>
          </form>
        )}

        {/* 3-Tier Scrollable List */}
        <div
          className={`flex-1 overflow-y-auto px-2 py-2 space-y-1 ${
            isLight ? 'bg-white' : ''
          }`}
        >
          {database.systems.map((system) => {
            const systemSubjects = database.subjects.filter(
              (s) => s.systemId === system.id
            );
            const systemLessons = database.lessons.filter(
              (l) => l.systemId === system.id && matchesSearch(l)
            );
            const isSystemOpen =
              Boolean(expandedSystems[system.id]) || Boolean(searchQuery.trim());
            const isEditingSystem =
              editingItem?.type === 'system' && editingItem.id === system.id;

            return (
              <div key={system.id} className="rounded-lg overflow-hidden">
                {/* TIER 1: Organ System / Block */}
                <div
                  className={`flex items-center justify-between px-2 py-1.5 rounded-lg group transition-colors ${
                    isLight ? 'hover:bg-slate-100' : 'hover:bg-[#2d2e30]/60'
                  }`}
                >
                  {isEditingSystem ? (
                    <form
                      onSubmit={handleRenameSubmit}
                      className="flex items-center gap-1 flex-1 mr-1"
                    >
                      <input
                        type="text"
                        autoFocus
                        value={editingItem.value}
                        onChange={(e) =>
                          setEditingItem({
                            ...editingItem,
                            value: e.target.value,
                          })
                        }
                        className="flex-1 bg-[#131314] border border-[#8ab4f8] rounded px-2 py-0.5 text-[12px] text-white focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="p-1 rounded bg-[#8ab4f8] text-[#131314]"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingItem(null)}
                        className="p-1 rounded bg-[#2d2e30] text-[#9aa0a6]"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </form>
                  ) : (
                    <button
                      onClick={() => toggleSystem(system.id)}
                      className="flex items-center gap-2 flex-1 text-left min-w-0 cursor-pointer"
                    >
                      {isSystemOpen ? (
                        <ChevronDown className="w-3.5 h-3.5 text-[#9aa0a6] shrink-0" />
                      ) : (
                        <ChevronRight className="w-3.5 h-3.5 text-[#9aa0a6] shrink-0" />
                      )}
                      {SYSTEM_ICON_MAP[system.iconName] || (
                        <BookOpen className="w-4 h-4 text-[#8ab4f8] shrink-0" />
                      )}
                      <span
                        className={`font-display font-semibold text-[13px] truncate ${
                          isLight ? 'text-slate-900' : 'text-[#e3e3e3]'
                        }`}
                      >
                        {system.name}
                      </span>
                    </button>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[11px] font-mono text-[#70757a] mr-0.5">
                      {systemLessons.length}
                    </span>
                    {!isReadOnly && !isEditingSystem && (
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddingSubjectForSystem(system.id);
                          }}
                          title="Thêm Phân môn / Học phần (Tầng 2)"
                          className="p-1 rounded hover:bg-[#3c4043] text-[#9aa0a6] hover:text-white"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingItem({
                              type: 'system',
                              id: system.id,
                              value: system.name,
                            });
                          }}
                          title="Đổi tên Hệ cơ quan"
                          className="p-1 rounded hover:bg-[#3c4043] text-[#9aa0a6] hover:text-white"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                        {database.systems.length > 1 &&
                          database.lessons.filter((l) => l.systemId !== system.id)
                            .length > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmDelete({
                                  type: 'system',
                                  id: system.id,
                                  name: system.name,
                                  subCount: systemLessons.length,
                                });
                              }}
                              title="Xóa Hệ cơ quan"
                              className="p-1 rounded hover:bg-[#ef4444]/20 text-[#9aa0a6] hover:text-[#ef4444]"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Inline Add Tier 2 Form */}
                {addingSubjectForSystem === system.id && !isReadOnly && (
                  <form
                    onSubmit={(e) => handleAddSubjectSubmit(e, system.id)}
                    className="ml-5 my-1 p-2 bg-[#131314] rounded-lg border border-[#3c4043]"
                  >
                    <p className="text-[11px] text-[#9aa0a6] mb-1">
                      Thêm Học phần thuộc {system.name}:
                    </p>
                    <div className="flex gap-1">
                      <input
                        type="text"
                        autoFocus
                        value={newSubjectName}
                        onChange={(e) => setNewSubjectName(e.target.value)}
                        placeholder="VD: Giải phẫu bệnh, Dược lý..."
                        className="flex-1 bg-[#1e1f20] border border-[#3c4043] rounded px-2 py-1 text-xs text-white focus:outline-none"
                      />
                      <button
                        type="submit"
                        className="px-2 py-1 bg-[#8ab4f8] text-[#131314] rounded text-xs font-semibold"
                      >
                        Thêm
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddingSubjectForSystem(null)}
                        className="px-1.5 py-1 bg-[#2d2e30] text-[#9aa0a6] rounded text-xs"
                      >
                        Đóng
                      </button>
                    </div>
                  </form>
                )}

                {/* TIER 2: Subjects / Courses */}
                {isSystemOpen && (
                  <div
                    className={`ml-3.5 pl-2.5 border-l space-y-1 mt-0.5 ${
                      isLight ? 'border-slate-200' : 'border-[#2d2e30]'
                    }`}
                  >
                    {systemSubjects.map((subject) => {
                      const subjectLessons = database.lessons.filter(
                        (l) => l.subjectId === subject.id && matchesSearch(l)
                      );
                      const isSubjectOpen =
                        expandedSubjects[subject.id] !== false ||
                        Boolean(searchQuery.trim());
                      const isEditingSubject =
                        editingItem?.type === 'subject' &&
                        editingItem.id === subject.id;

                      const isDropTargetSubject =
                        dropIndicator?.targetId === subject.id &&
                        dropIndicator?.position === 'subject';

                      return (
                        <div key={subject.id}>
                          <div
                            onDragOver={(e) => {
                              if (isReadOnly || !draggedLessonId) return;
                              e.preventDefault();
                              e.stopPropagation();
                              if (
                                dropIndicator?.targetId !== subject.id ||
                                dropIndicator?.position !== 'subject'
                              ) {
                                setDropIndicator({
                                  targetId: subject.id,
                                  position: 'subject',
                                });
                              }
                            }}
                            onDragLeave={() => {
                              if (dropIndicator?.targetId === subject.id) {
                                setDropIndicator(null);
                              }
                            }}
                            onDrop={(e) => {
                              if (isReadOnly || !draggedLessonId) return;
                              e.preventDefault();
                              e.stopPropagation();
                              const draggedId =
                                e.dataTransfer.getData('text/plain') ||
                                draggedLessonId;
                              if (draggedId && onMoveLessonToSubject) {
                                onMoveLessonToSubject(draggedId, subject.id);
                                setExpandedSubjects((prev) => ({
                                  ...prev,
                                  [subject.id]: true,
                                }));
                              }
                              setDraggedLessonId(null);
                              setDropIndicator(null);
                            }}
                            className={`group/sub flex items-center justify-between px-2 py-1 rounded-md transition-all ${
                              isDropTargetSubject
                                ? isLight
                                  ? 'bg-blue-100 ring-2 ring-blue-500'
                                  : 'bg-[#3f3c5c] ring-2 ring-[#8ab4f8]'
                                : isLight
                                ? 'hover:bg-slate-100'
                                : 'hover:bg-[#2d2e30]/40'
                            }`}
                          >
                            {isEditingSubject ? (
                              <form
                                onSubmit={handleRenameSubmit}
                                className="flex items-center gap-1 flex-1 mr-1"
                              >
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingItem.value}
                                  onChange={(e) =>
                                    setEditingItem({
                                      ...editingItem,
                                      value: e.target.value,
                                    })
                                  }
                                  className="flex-1 bg-[#131314] border border-[#8ab4f8] rounded px-2 py-0.5 text-[11.5px] text-white focus:outline-none"
                                />
                                <button
                                  type="submit"
                                  className="p-0.5 rounded bg-[#8ab4f8] text-[#131314]"
                                >
                                  <Check className="w-3 h-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingItem(null)}
                                  className="p-0.5 rounded bg-[#2d2e30] text-[#9aa0a6]"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </form>
                            ) : (
                              <button
                                onClick={() => toggleSubject(subject.id)}
                                className="flex items-center gap-1.5 min-w-0 flex-1 text-left cursor-pointer"
                              >
                                {isSubjectOpen ? (
                                  <ChevronDown className="w-3 h-3 text-[#70757a] shrink-0" />
                                ) : (
                                  <ChevronRight className="w-3 h-3 text-[#70757a] shrink-0" />
                                )}
                                <span
                                  className={`text-[12px] font-medium truncate ${
                                    isLight ? 'text-slate-700' : 'text-[#b0b5ba]'
                                  }`}
                                >
                                  {subject.name}
                                </span>
                              </button>
                            )}

                            <div className="flex items-center gap-1 shrink-0">
                              <span className="text-[10px] font-mono text-[#70757a]">
                                {subjectLessons.length}
                              </span>
                              {!isReadOnly && !isEditingSubject && (
                                <div className="opacity-0 group-hover/sub:opacity-100 flex items-center gap-0.5 transition-opacity">
                                  {onSortLessonsNaturally &&
                                    subjectLessons.length > 1 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onSortLessonsNaturally(subject.id);
                                        }}
                                        title="Sắp xếp các câu trong Học phần này theo thứ tự Câu 1 ➔ Câu N"
                                        className="p-0.5 rounded hover:bg-[#3c4043] text-[#8ab4f8] hover:text-white cursor-pointer"
                                      >
                                        <ArrowUpDown className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingItem({
                                        type: 'subject',
                                        id: subject.id,
                                        value: subject.name,
                                      });
                                    }}
                                    title="Đổi tên Học phần"
                                    className="p-0.5 rounded hover:bg-[#3c4043] text-[#9aa0a6] hover:text-white"
                                  >
                                    <Edit2 className="w-2.5 h-2.5" />
                                  </button>
                                  {database.subjects.length > 1 &&
                                    database.lessons.filter(
                                      (l) => l.subjectId !== subject.id
                                    ).length > 0 && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmDelete({
                                            type: 'subject',
                                            id: subject.id,
                                            name: subject.name,
                                            subCount: subjectLessons.length,
                                          });
                                        }}
                                        title="Xóa Học phần"
                                        className="p-0.5 rounded hover:bg-[#ef4444]/20 text-[#9aa0a6] hover:text-[#ef4444]"
                                      >
                                        <Trash2 className="w-2.5 h-2.5" />
                                      </button>
                                    )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* TIER 3: Mindmap Lessons (with Drag-and-Drop & Move Controls) */}
                          {isSubjectOpen && subjectLessons.length > 0 && (
                            <div
                              className={`ml-3 pl-2 border-l space-y-1.5 my-1 ${
                                isLight
                                  ? 'border-slate-200'
                                  : 'border-[#2d2e30]/70'
                              }`}
                            >
                              {subjectLessons.map((lesson, lessonIdx) => {
                                const isActive = lesson.id === activeLessonId;
                                const stats = lessonStatsMap.get(lesson.id) || {
                                  total: 0,
                                  mastered: 0,
                                  review: 0,
                                  untested: 0,
                                  percent: 0,
                                };
                                const isEditingLesson =
                                  editingItem?.type === 'lesson' &&
                                  editingItem.id === lesson.id;
                                const isBeingDragged =
                                  draggedLessonId === lesson.id;
                                const isDropBefore =
                                  dropIndicator?.targetId === lesson.id &&
                                  dropIndicator?.position === 'before';
                                const isDropAfter =
                                  dropIndicator?.targetId === lesson.id &&
                                  dropIndicator?.position === 'after';
                                const showMoveFolderSelect =
                                  movingLessonFolderId === lesson.id ||
                                  (isOrganizeMode &&
                                    database.subjects.length > 1);

                                return (
                                  <div
                                    key={lesson.id}
                                    draggable={!isReadOnly && !isEditingLesson}
                                    onDragStart={(e) => {
                                      if (isReadOnly || isEditingLesson) return;
                                      setDraggedLessonId(lesson.id);
                                      e.dataTransfer.effectAllowed = 'move';
                                      e.dataTransfer.setData(
                                        'text/plain',
                                        lesson.id
                                      );
                                    }}
                                    onDragOver={(e) => {
                                      if (
                                        isReadOnly ||
                                        !draggedLessonId ||
                                        draggedLessonId === lesson.id
                                      ) {
                                        return;
                                      }
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const rect =
                                        e.currentTarget.getBoundingClientRect();
                                      const pos: 'before' | 'after' =
                                        e.clientY - rect.top < rect.height / 2
                                          ? 'before'
                                          : 'after';
                                      if (
                                        dropIndicator?.targetId !== lesson.id ||
                                        dropIndicator?.position !== pos
                                      ) {
                                        setDropIndicator({
                                          targetId: lesson.id,
                                          position: pos,
                                        });
                                      }
                                    }}
                                    onDrop={(e) => {
                                      if (isReadOnly) return;
                                      e.preventDefault();
                                      e.stopPropagation();
                                      const draggedId =
                                        e.dataTransfer.getData('text/plain') ||
                                        draggedLessonId;
                                      if (
                                        draggedId &&
                                        draggedId !== lesson.id &&
                                        onReorderLessonByDrop
                                      ) {
                                        const rect =
                                          e.currentTarget.getBoundingClientRect();
                                        const pos: 'before' | 'after' =
                                          e.clientY - rect.top < rect.height / 2
                                            ? 'before'
                                            : 'after';
                                        onReorderLessonByDrop(
                                          draggedId,
                                          lesson.id,
                                          pos
                                        );
                                      }
                                      setDraggedLessonId(null);
                                      setDropIndicator(null);
                                    }}
                                    onDragEnd={() => {
                                      setDraggedLessonId(null);
                                      setDropIndicator(null);
                                    }}
                                    onClick={() => {
                                      onSelectLesson(lesson.id);
                                      onCloseMobile?.();
                                    }}
                                    style={
                                      isLight
                                        ? {
                                            backgroundColor: isActive
                                              ? '#eff6ff'
                                              : '#ffffff',
                                            borderColor: isActive
                                              ? '#60a5fa'
                                              : '#e2e8f0',
                                          }
                                        : undefined
                                    }
                                    className={`group/lesson relative rounded-xl p-2.5 transition-all cursor-pointer border ${
                                      isBeingDragged ? 'opacity-45 scale-[0.98]' : ''
                                    } ${
                                      isDropBefore
                                        ? 'border-t-4 border-t-[#3b82f6]'
                                        : isDropAfter
                                        ? 'border-b-4 border-b-[#3b82f6]'
                                        : ''
                                    } ${
                                      isLight
                                        ? isActive
                                          ? 'bg-blue-50 border-blue-400 text-blue-950 font-semibold shadow-xs'
                                          : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                        : isActive
                                        ? 'bg-[#3f3c5c]/55 border-[#8ab4f8]/60 text-white shadow-sm'
                                        : 'bg-[#131314]/60 border-transparent hover:bg-[#2d2e30]/70 text-[#e3e3e3]'
                                    }`}
                                  >
                                    <div className="flex items-start justify-between gap-1.5">
                                      {/* Left: Drag Handle + Position Badge (#1, #2...) + Title */}
                                      <div className="flex items-start gap-1.5 min-w-0 flex-1">
                                        {!isReadOnly && !isEditingLesson && (
                                          <span
                                            title="Giữ chuột kéo thả để đổi vị trí hoặc chuyển sang Học phần khác"
                                            className={`mt-0.5 cursor-grab active:cursor-grabbing shrink-0 ${
                                              isOrganizeMode
                                                ? isLight
                                                  ? 'text-blue-600'
                                                  : 'text-[#8ab4f8]'
                                                : 'text-[#70757a] opacity-50 group-hover/lesson:opacity-100'
                                            }`}
                                          >
                                            <GripVertical className="w-3.5 h-3.5" />
                                          </span>
                                        )}

                                        {isEditingLesson ? (
                                          <form
                                            onSubmit={handleRenameSubmit}
                                            onClick={(e) => e.stopPropagation()}
                                            className="flex items-center gap-1 flex-1"
                                          >
                                            <input
                                              type="text"
                                              autoFocus
                                              value={editingItem.value}
                                              onChange={(e) =>
                                                setEditingItem({
                                                  ...editingItem,
                                                  value: e.target.value,
                                                })
                                              }
                                              className="flex-1 bg-[#131314] border border-[#8ab4f8] rounded px-2 py-0.5 text-[11.5px] text-white focus:outline-none"
                                            />
                                            <button
                                              type="submit"
                                              className="p-0.5 rounded bg-[#8ab4f8] text-[#131314]"
                                            >
                                              <Check className="w-3 h-3" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setEditingItem(null)}
                                              className="p-0.5 rounded bg-[#2d2e30] text-[#9aa0a6]"
                                            >
                                              <X className="w-3 h-3" />
                                            </button>
                                          </form>
                                        ) : (
                                          <p
                                            className={`text-[12.5px] font-semibold leading-snug line-clamp-2 flex-1 ${
                                              isLight
                                                ? isActive
                                                  ? 'text-blue-950 font-semibold'
                                                  : 'text-slate-700'
                                                : ''
                                            }`}
                                          >
                                            <span
                                              className={`inline-block font-mono text-[10.5px] font-bold px-1 py-0.2 rounded mr-1 ${
                                                isLight
                                                  ? isActive
                                                    ? 'bg-blue-200 text-blue-900'
                                                    : 'bg-slate-100 text-slate-600'
                                                  : isActive
                                                  ? 'bg-[#8ab4f8]/25 text-[#8ab4f8]'
                                                  : 'bg-[#2d2e30] text-[#9aa0a6]'
                                              }`}
                                            >
                                              #{lessonIdx + 1}
                                            </span>
                                            {lesson.title}
                                          </p>
                                        )}
                                      </div>

                                      {/* Right: Quick Action Buttons (Hover or Organize Mode) */}
                                      {!isReadOnly && !isEditingLesson && (
                                        <div
                                          className={`${
                                            isOrganizeMode
                                              ? 'flex'
                                              : 'opacity-0 group-hover/lesson:opacity-100 flex'
                                          } items-center gap-0.5 transition-opacity shrink-0`}
                                        >
                                          {onMoveLessonOrder &&
                                            subjectLessons.length > 1 && (
                                              <>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onMoveLessonOrder(
                                                      lesson.id,
                                                      'up'
                                                    );
                                                  }}
                                                  disabled={lessonIdx === 0}
                                                  title="Chuyển bài học lên trên"
                                                  className={`p-1 rounded hover:bg-[#3c4043] text-[#9aa0a6] hover:text-white cursor-pointer ${
                                                    lessonIdx === 0
                                                      ? 'opacity-30 cursor-not-allowed'
                                                      : ''
                                                  }`}
                                                >
                                                  <ArrowUp className="w-3 h-3" />
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    onMoveLessonOrder(
                                                      lesson.id,
                                                      'down'
                                                    );
                                                  }}
                                                  disabled={
                                                    lessonIdx ===
                                                    subjectLessons.length - 1
                                                  }
                                                  title="Chuyển bài học xuống dưới"
                                                  className={`p-1 rounded hover:bg-[#3c4043] text-[#9aa0a6] hover:text-white cursor-pointer ${
                                                    lessonIdx ===
                                                    subjectLessons.length - 1
                                                      ? 'opacity-30 cursor-not-allowed'
                                                      : ''
                                                  }`}
                                                >
                                                  <ArrowDown className="w-3 h-3" />
                                                </button>
                                              </>
                                            )}

                                          {database.subjects.length > 1 && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setMovingLessonFolderId((prev) =>
                                                  prev === lesson.id
                                                    ? null
                                                    : lesson.id
                                                );
                                              }}
                                              title="Di chuyển bài học sang Học phần / Hệ cơ quan khác"
                                              className="p-1 rounded hover:bg-[#3c4043] text-[#8ab4f8] hover:text-white cursor-pointer"
                                            >
                                              <FolderInput className="w-3 h-3" />
                                            </button>
                                          )}

                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingItem({
                                                type: 'lesson',
                                                id: lesson.id,
                                                value: lesson.title,
                                              });
                                            }}
                                            title="Đổi tên bài học"
                                            className="p-1 rounded hover:bg-[#3c4043] text-[#9aa0a6] hover:text-white cursor-pointer"
                                          >
                                            <Edit2 className="w-3 h-3" />
                                          </button>
                                          {database.lessons.length > 1 && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setConfirmDelete({
                                                  type: 'lesson',
                                                  id: lesson.id,
                                                  name: lesson.title,
                                                });
                                              }}
                                              title="Xóa bài học"
                                              className="p-1 rounded hover:bg-[#ef4444]/20 text-[#9aa0a6] hover:text-[#ef4444] cursor-pointer"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>

                                    {/* Extended Organize & Move Controls Bar (When Organize Mode is active or Folder Move clicked) */}
                                    {!isReadOnly &&
                                      (isOrganizeMode || showMoveFolderSelect) && (
                                        <div
                                          onClick={(e) => e.stopPropagation()}
                                          className={`mt-2 pt-1.5 border-t flex flex-wrap items-center justify-between gap-1.5 text-[10.5px] ${
                                            isLight
                                              ? 'border-slate-200'
                                              : 'border-[#2d2e30]'
                                          }`}
                                        >
                                          {onMoveLessonOrder &&
                                            subjectLessons.length > 1 && (
                                              <div className="flex items-center gap-1">
                                                <button
                                                  type="button"
                                                  disabled={lessonIdx === 0}
                                                  onClick={() =>
                                                    onMoveLessonOrder(
                                                      lesson.id,
                                                      'top'
                                                    )
                                                  }
                                                  title="Đưa lên đầu học phần"
                                                  className={`px-1.5 py-0.5 rounded border font-mono cursor-pointer disabled:opacity-30 ${
                                                    isLight
                                                      ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                                                      : 'bg-[#242528] border-[#3c4043] text-[#e3e3e3] hover:bg-[#3c4043]'
                                                  }`}
                                                >
                                                  ⏫ Đầu
                                                </button>
                                                <select
                                                  value={lessonIdx}
                                                  onChange={(e) =>
                                                    onMoveLessonOrder(
                                                      lesson.id,
                                                      Number(e.target.value)
                                                    )
                                                  }
                                                  title="Nhảy tới vị trí bất kỳ trong Học phần"
                                                  className={`px-1.5 py-0.5 rounded border font-mono font-bold cursor-pointer ${
                                                    isLight
                                                      ? 'bg-white border-blue-300 text-blue-800'
                                                      : 'bg-[#131314] border-[#8ab4f8]/50 text-[#8ab4f8]'
                                                  }`}
                                                >
                                                  {subjectLessons.map(
                                                    (_, idxOpt) => (
                                                      <option
                                                        key={idxOpt}
                                                        value={idxOpt}
                                                      >
                                                        Vị trí #{idxOpt + 1}
                                                      </option>
                                                    )
                                                  )}
                                                </select>
                                                <button
                                                  type="button"
                                                  disabled={
                                                    lessonIdx ===
                                                    subjectLessons.length - 1
                                                  }
                                                  onClick={() =>
                                                    onMoveLessonOrder(
                                                      lesson.id,
                                                      'bottom'
                                                    )
                                                  }
                                                  title="Đưa xuống cuối học phần"
                                                  className={`px-1.5 py-0.5 rounded border font-mono cursor-pointer disabled:opacity-30 ${
                                                    isLight
                                                      ? 'bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200'
                                                      : 'bg-[#242528] border-[#3c4043] text-[#e3e3e3] hover:bg-[#3c4043]'
                                                  }`}
                                                >
                                                  ⏬ Cuối
                                                </button>
                                              </div>
                                            )}

                                          {onMoveLessonToSubject &&
                                            database.subjects.length > 1 && (
                                              <select
                                                value={lesson.subjectId}
                                                onChange={(e) => {
                                                  onMoveLessonToSubject(
                                                    lesson.id,
                                                    e.target.value
                                                  );
                                                  setMovingLessonFolderId(null);
                                                }}
                                                title="Chuyển bài học sang Học phần / Hệ cơ quan khác"
                                                className={`max-w-[165px] truncate px-1.5 py-0.5 rounded border text-[10.5px] font-medium cursor-pointer ${
                                                  isLight
                                                    ? 'bg-blue-50 border-blue-200 text-blue-900'
                                                    : 'bg-[#1e1f20] border-[#3c4043] text-[#8ab4f8]'
                                                }`}
                                              >
                                                {database.subjects.map((sub) => {
                                                  const sys =
                                                    database.systems.find(
                                                      (s) =>
                                                        s.id === sub.systemId
                                                    );
                                                  return (
                                                    <option
                                                      key={sub.id}
                                                      value={sub.id}
                                                    >
                                                      📁{' '}
                                                      {sys
                                                        ? `${sys.name} › `
                                                        : ''}
                                                      {sub.name}
                                                    </option>
                                                  );
                                                })}
                                              </select>
                                            )}
                                        </div>
                                      )}

                                    {/* Lesson Study Status & Node Mastery Progress */}
                                    <div
                                      className={`mt-1.5 flex items-center justify-between text-[11px] ${
                                        isLight
                                          ? 'text-slate-500'
                                          : 'text-[#9aa0a6]'
                                      }`}
                                    >
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          if (isReadOnly) return;
                                          const order: LessonStudyStatus[] = [
                                            'Chưa học',
                                            'Đang ôn',
                                            'Đã thuộc',
                                          ];
                                          const next =
                                            order[
                                              (order.indexOf(lesson.status) + 1) %
                                                order.length
                                            ];
                                          onUpdateLessonStatus(lesson.id, next);
                                        }}
                                        title={
                                          isReadOnly
                                            ? 'Trạng thái học tập'
                                            : 'Click để chuyển trạng thái học tập'
                                        }
                                        className="flex items-center gap-1 transition-colors cursor-pointer"
                                      >
                                        {lesson.status === 'Đã thuộc' ? (
                                          <CheckCircle2 className="w-3 h-3 text-[#10b981]" />
                                        ) : lesson.status === 'Đang ôn' ? (
                                          <Clock className="w-3 h-3 text-[#f59e0b]" />
                                        ) : (
                                          <Circle className="w-3 h-3 text-[#70757a]" />
                                        )}
                                        <span
                                          className={
                                            lesson.status === 'Đã thuộc'
                                              ? 'text-[#10b981] font-medium'
                                              : lesson.status === 'Đang ôn'
                                              ? 'text-[#f59e0b] font-medium'
                                              : isLight
                                              ? 'text-slate-500'
                                              : 'text-[#9aa0a6]'
                                          }
                                        >
                                          {lesson.status}
                                        </span>
                                      </button>
                                      <span aria-hidden="true">·</span>
                                      <span className="font-mono text-[10px]">
                                        {stats.mastered}/{stats.total} node (
                                        {stats.percent}%)
                                      </span>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Cloud Sync & Backup Controls (Crisp bg-slate-50 border-t border-slate-200 text-slate-700 in Light Mode!) */}
        <div
          style={
            isLight
              ? { backgroundColor: '#f8fafc', borderColor: '#e2e8f0' }
              : undefined
          }
          className={`p-3 border-t space-y-2 ${
            isLight
              ? 'bg-slate-50 border-slate-200 text-slate-700'
              : 'bg-[#18191a] border-[#2d2e30]'
          }`}
        >
          <button
            onClick={() => {
              onCloseMobile?.();
              onOpenCloudModal();
            }}
            style={
              isLight
                ? { backgroundColor: '#ffffff', borderColor: '#cbd5e1' }
                : undefined
            }
            className={`w-full py-2 px-3 rounded-xl border text-[12px] font-medium flex items-center justify-between transition-colors cursor-pointer ${
              isLight
                ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-800 shadow-2xs'
                : 'bg-[#2d2e30] hover:bg-[#3c4043] border-transparent text-[#e3e3e3]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Cloud
                className={`w-3.5 h-3.5 ${
                  cloudConnected ? 'text-[#10b981]' : 'text-[#8ab4f8]'
                }`}
              />
              <span>Cài đặt Giao diện & Cloud</span>
            </span>
            <span
              className={`text-[10px] font-mono ${
                isLight ? 'text-slate-500' : 'text-[#9aa0a6]'
              }`}
            >
              {cloudConnected ? 'Auto-Sync' : 'Cài đặt'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              onClick={onExportDatabaseJson}
              style={
                isLight
                  ? { backgroundColor: '#ffffff', borderColor: '#cbd5e1' }
                  : undefined
              }
              className={`py-1.5 px-2.5 rounded-lg border text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isLight
                  ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                  : 'bg-[#131314] hover:bg-[#2d2e30] border-[#2d2e30] text-[#b0b5ba] hover:text-white'
              }`}
            >
              <Download className="w-3.5 h-3.5 text-[#8ab4f8]" />
              <span>Backup .JSON</span>
            </button>

            {!isReadOnly ? (
              <label
                style={
                  isLight
                    ? { backgroundColor: '#ffffff', borderColor: '#cbd5e1' }
                    : undefined
                }
                className={`py-1.5 px-2.5 rounded-lg border text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  isLight
                    ? 'bg-white hover:bg-slate-100 border-slate-300 text-slate-700'
                    : 'bg-[#131314] hover:bg-[#2d2e30] border-[#2d2e30] text-[#b0b5ba] hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5 text-[#81c995]" />
                <span>Khôi phục</span>
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      onImportDatabaseJson(file);
                      e.target.value = '';
                    }
                  }}
                />
              </label>
            ) : (
              <button
                onClick={() => {
                  onCloseMobile?.();
                  onLogout?.();
                }}
                className="py-1.5 px-2.5 rounded-lg bg-[#f59e0b]/15 border border-[#f59e0b]/40 text-[11px] text-[#f59e0b] font-semibold flex items-center justify-center gap-1 cursor-pointer"
              >
                <Lock className="w-3 h-3" />
                <span>Đăng nhập</span>
              </button>
            )}
          </div>

          {onLogout && !isReadOnly && (
            <button
              onClick={() => {
                onCloseMobile?.();
                onLogout();
              }}
              className={`md:hidden w-full py-1.5 px-2.5 rounded-lg border text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-600'
                  : 'bg-[#131314] border-[#2d2e30] text-[#9aa0a6]'
              }`}
            >
              <Lock className="w-3 h-3" />
              <span>Khóa màn hình / Đăng xuất</span>
            </button>
          )}
        </div>

        {/* SAFE DELETE CONFIRMATION DIALOG */}
        {confirmDelete && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#1e1f20] border border-[#3c4043] rounded-2xl p-5 shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-[#ef4444]/15 border border-[#ef4444]/40 flex items-center justify-center text-[#ef4444] shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-[15px] text-white">
                    Xác nhận xóa{' '}
                    {confirmDelete.type === 'lesson'
                      ? 'Bài học'
                      : confirmDelete.type === 'subject'
                      ? 'Học phần'
                      : 'Hệ cơ quan'}
                  </h3>
                  <p className="text-[12.5px] text-[#b0b5ba] leading-relaxed">
                    Bạn có chắc chắn muốn xóa{' '}
                    <span className="text-white font-semibold">
                      "{confirmDelete.name}"
                    </span>
                    ?
                    {confirmDelete.subCount && confirmDelete.subCount > 0
                      ? ` Các bài học bên trong (${confirmDelete.subCount} bài) sẽ được chuyển sang thư mục còn lại để không bị mất bài.`
                      : ' Thao tác này sẽ cập nhật lên Supabase Cloud.'}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2 rounded-xl bg-[#2d2e30] hover:bg-[#3c4043] text-[12.5px] font-medium text-white cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={executeConfirmedDelete}
                  className="px-4 py-2 rounded-xl bg-[#ef4444] hover:bg-[#dc2626] text-white font-display font-semibold text-[12.5px] cursor-pointer"
                >
                  Xác nhận Xóa
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};

export const SidebarCurriculum = React.memo(
  SidebarCurriculumComponent,
  (prev, next) => {
    if (
      prev.activeLessonId !== next.activeLessonId ||
      prev.isReadOnly !== next.isReadOnly ||
      prev.themeMode !== next.themeMode ||
      prev.isCollapsed !== next.isCollapsed ||
      prev.isMobileOpen !== next.isMobileOpen ||
      prev.cloudConnected !== next.cloudConnected
    ) {
      return false;
    }

    if (prev.database === next.database) {
      return true;
    }

    if (
      prev.database.systems !== next.database.systems ||
      prev.database.subjects !== next.database.subjects ||
      prev.database.lessons.length !== next.database.lessons.length
    ) {
      return false;
    }

    // Check if any lesson's sidebar-relevant fields changed (ignore pure branch collapse toggles)
    for (let i = 0; i < prev.database.lessons.length; i++) {
      const pL = prev.database.lessons[i];
      const nL = next.database.lessons[i];
      if (
        pL.id !== nL.id ||
        pL.title !== nL.title ||
        pL.status !== nL.status ||
        pL.systemId !== nL.systemId ||
        pL.subjectId !== nL.subjectId
      ) {
        return false;
      }
      if (pL.rootNode !== nL.rootNode) {
        const pStats = calculateMasteryStats(pL.rootNode);
        const nStats = calculateMasteryStats(nL.rootNode);
        if (
          pStats.total !== nStats.total ||
          pStats.mastered !== nStats.mastered ||
          pStats.review !== nStats.review
        ) {
          return false;
        }
      }
    }

    return true;
  }
);

