import React, { useState } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Search,
  Plus,
  FolderPlus,
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

export const SidebarCurriculum: React.FC<SidebarCurriculumProps> = ({
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
    'sys-oncology': true,
    'sys-cardio': true,
    'sys-basic': true,
  });
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({
    'sub-onco-path': true,
    'sub-cardio-int': true,
  });

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

  const matchesSearch = (lesson: LessonMindmap) => {
    if (statusFilter !== 'ALL' && lesson.status !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      lesson.title.toLowerCase().includes(q) ||
      lesson.tags.some((t) => t.toLowerCase().includes(q)) ||
      JSON.stringify(lesson.rootNode).toLowerCase().includes(q)
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

        {/* 3-Tier Curriculum Tree Header */}
        <div
          className={`px-4 py-2 flex items-center justify-between text-[11px] font-medium border-b ${
            isLight
              ? 'text-slate-500 border-slate-200 bg-slate-50/60'
              : 'text-[#9aa0a6] border-[#2d2e30]/60'
          }`}
        >
          <span>HỆ CƠ QUAN / HỌC PHẦN / BÀI HỌC</span>
          {!isReadOnly && (
            <button
              onClick={() => setAddingSystem(true)}
              title="Thêm Khối / Hệ cơ quan mới (Tầng 1)"
              className={`flex items-center gap-1 hover:underline cursor-pointer ${
                isLight ? 'text-blue-600 font-semibold' : 'text-[#8ab4f8]'
              }`}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Hệ mới</span>
            </button>
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

                      return (
                        <div key={subject.id}>
                          <div
                            className={`group/sub flex items-center justify-between px-2 py-1 rounded-md transition-colors ${
                              isLight
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

                          {/* TIER 3: Mindmap Lessons */}
                          {isSubjectOpen && subjectLessons.length > 0 && (
                            <div
                              className={`ml-3 pl-2 border-l space-y-1.5 my-1 ${
                                isLight
                                  ? 'border-slate-200'
                                  : 'border-[#2d2e30]/70'
                              }`}
                            >
                              {subjectLessons.map((lesson) => {
                                const isActive = lesson.id === activeLessonId;
                                const stats = calculateMasteryStats(
                                  lesson.rootNode
                                );
                                const isEditingLesson =
                                  editingItem?.type === 'lesson' &&
                                  editingItem.id === lesson.id;

                                return (
                                  <div
                                    key={lesson.id}
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
                                          {lesson.title}
                                        </p>
                                      )}

                                      {!isReadOnly && !isEditingLesson && (
                                        <div className="opacity-0 group-hover/lesson:opacity-100 flex items-center gap-0.5 transition-opacity shrink-0">
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
                                            className="p-1 rounded hover:bg-[#3c4043] text-[#9aa0a6] hover:text-white"
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
                                              className="p-1 rounded hover:bg-[#ef4444]/20 text-[#9aa0a6] hover:text-[#ef4444]"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>

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
                                        className="flex items-center gap-1 transition-colors"
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
