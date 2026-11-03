import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Printer,
  FileText,
  Columns,
  Edit3,
  Check,
  GitCommitHorizontal,
  BookOpen,
  Share2,
  FolderOpen,
  CheckSquare,
  Square,
  ChevronDown,
  Search,
  AlertCircle,
  Download,
  Loader2,
  CheckCircle2,
  ListOrdered,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  ChevronsUp,
  ChevronsDown,
  GripVertical,
  FolderInput,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import {
  MedMindDatabase,
  LessonMindmap,
  MindmapNode,
} from '../types/mindmap';
import {
  cleanNodeLabel,
  compareLessonsNaturally,
  formatCleanLessonHeading,
  sortMindmapTreeForPrint,
} from '../utils/mindmapLayout';
import {
  buildMedicalRubricCriteria,
  getClinicalNoteSnippets,
  normalizeLessonForPrint,
  normalizeNodeForPrint,
} from '../utils/essayRubricEngine';

/**
 * Per-lesson ErrorBoundary so a malformed lesson never crashes the entire Print Studio
 */
interface LessonErrorBoundaryProps {
  lessonTitle: string;
  children: React.ReactNode;
}

interface LessonErrorBoundaryState {
  hasError: boolean;
  errorMsg: string;
}

class LessonPrintErrorBoundary extends React.Component<
  LessonErrorBoundaryProps,
  LessonErrorBoundaryState
> {
  constructor(props: LessonErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, errorMsg: '' };
  }

  static getDerivedStateFromError(error: unknown): LessonErrorBoundaryState {
    return {
      hasError: true,
      errorMsg: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 my-4 border-2 border-red-600 bg-red-50 text-black rounded-lg">
          <div className="font-bold text-[14px] text-red-800">
            ⚠️ Không thể kết xuất đầy đủ bài học: "{this.props.lessonTitle}"
          </div>
          <div className="text-[12px] text-neutral-700 mt-1">
            Đã tự động bỏ qua phần dữ liệu lỗi ({this.state.errorMsg}) để bảo vệ các trang in khác.
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

interface A4PrintStudioModalProps {
  database?: MedMindDatabase;
  activeLessonId?: string;
  lessonTitle: string;
  systemName?: string;
  subjectName?: string;
  rootNode: MindmapNode;
  onSortLessonsNaturally?: (subjectId?: string) => void;
  onMoveLessonOrder?: (
    lessonId: string,
    action: 'up' | 'down' | 'top' | 'bottom' | number
  ) => void;
  onMoveLessonToSubject?: (lessonId: string, targetSubjectId: string) => void;
  onApplyCustomLessonOrder?: (orderedIds: string[]) => void;
  onClose: () => void;
}

export type PrintTemplateType =
  | 'barem_outline'
  | 'infographic_landscape'
  | 'horizontal_tree'
  | 'cornell_note'
  | 'fishbone_flowchart'
  | 'blank_worksheet'
  | 'flashcard_sheet'
  | 'pocket_cheatsheet'
  | 'clinical_osce_checklist'
  | 'exam_simulation_paper';

export type StudyClozeMode = 'full' | 'cloze_keyword' | 'cloze_detail';
export type PrintColorMode = 'color' | 'bw_high_contrast';
export type PrintFontScaleMode = 'compact' | 'normal' | 'large';
export type LessonSortOrderMode =
  | 'natural_asc'
  | 'manual_custom'
  | 'sidebar_order'
  | 'reverse';
export type IntraLessonSortMode =
  | 'natural_number'
  | 'medical_standard'
  | 'keep';

type BatchScopeMode = 'current' | 'folder' | 'custom';
type FolderTargetType = 'subject' | 'system' | 'all_library';

export interface TocPillarPageMeta {
  index: number;
  id: string;
  label: string;
  lvl2Count: number;
  lvl3Count: number;
  rubricCount: number;
  keywordsCount: number;
  points: number;
  pageNumber: number;
}

export interface TocLessonPageMeta {
  lessonId: string;
  lessonIndex: number;
  title: string;
  shortBadge: string;
  cleanTopicTitle: string;
  sysName: string;
  subName: string;
  statusLabel: string;
  pillarCount: number;
  lvl2TotalCount: number;
  rubricItemsCount: number;
  keywordsCount: number;
  totalPoints: number;
  startPage: number;
  endPage: number;
  pageCount: number;
  pageRangeLabel: string;
  pillars: TocPillarPageMeta[];
}

const PRINT_COLUMN_THEMES = [
  {
    headerBg: '#1d4ed8', // Cột 1: Xanh dương
    subBg: '#dbeafe',
    cardBg: '#eff6ff',
    cardBorder: '#93c5fd',
    colBorder: '#1d4ed8',
    accentText: '#1e40af',
    highlightBg: '#dbeafe',
  },
  {
    headerBg: '#15803d', // Cột 2: Xanh lá
    subBg: '#dcfce7',
    cardBg: '#f0fdf4',
    cardBorder: '#86efac',
    colBorder: '#15803d',
    accentText: '#166334',
    highlightBg: '#dcfce7',
  },
  {
    headerBg: '#c2410c', // Cột 3: Cam
    subBg: '#ffedd5',
    cardBg: '#fff7ed',
    cardBorder: '#fdba74',
    colBorder: '#c2410c',
    accentText: '#9a3412',
    highlightBg: '#ffedd5',
  },
  {
    headerBg: '#6d28d9', // Cột 4: Tím
    subBg: '#ede9fe',
    cardBg: '#f5f3ff',
    cardBorder: '#c4b5fd',
    colBorder: '#6d28d9',
    accentText: '#5b21b6',
    highlightBg: '#ede9fe',
  },
  {
    headerBg: '#be185d', // Cột 5: Hồng đỏ
    subBg: '#fce7f3',
    cardBg: '#fdf2f8',
    cardBorder: '#f9a8d4',
    colBorder: '#be185d',
    accentText: '#9d174d',
    highlightBg: '#fce7f3',
  },
  {
    headerBg: '#0f766e', // Cột 6: Xanh cổ vịt
    subBg: '#ccfbf1',
    cardBg: '#f0fdfa',
    cardBorder: '#5eead4',
    colBorder: '#0f766e',
    accentText: '#115e59',
    highlightBg: '#ccfbf1',
  },
];

let currentActiveClozeMode: StudyClozeMode = 'full';
let currentPrintColorMode: PrintColorMode = 'color';

/**
 * Helper: Render text with automatic bold + underline on the medical keyword before ':'
 * and optional Active Recall Cloze masking (`cloze_keyword` or `cloze_detail`) across all templates!
 */
function renderPrintableKeywordText(
  rawText: unknown,
  highlightBgColor?: string
): React.ReactNode {
  const cleaned = cleanNodeLabel(rawText);
  const colonIdx = cleaned.indexOf(':');
  const isBw = currentPrintColorMode === 'bw_high_contrast';

  if (colonIdx > 0 && colonIdx <= 64) {
    const keyword = cleaned.slice(0, colonIdx);
    const rest = cleaned.slice(colonIdx);

    if (currentActiveClozeMode === 'cloze_keyword') {
      return (
        <>
          <span className="inline-block font-mono font-bold text-neutral-700 bg-neutral-100 border-b-2 border-dotted border-black px-1.5 rounded-xs">
            [ ...................... ]
          </span>
          <span>{rest}</span>
        </>
      );
    }

    if (currentActiveClozeMode === 'cloze_detail') {
      return (
        <>
          <strong className="font-bold underline decoration-black/80 underline-offset-2 text-black">
            {keyword}
          </strong>
          <span>: </span>
          <span className="inline-block font-mono text-neutral-500 border-b border-dotted border-neutral-700 min-w-[165px]">
            ................................................................
          </span>
        </>
      );
    }

    if (highlightBgColor && !isBw) {
      return (
        <>
          <strong
            style={{ backgroundColor: highlightBgColor }}
            className="font-bold px-1 py-0.2 rounded-xs text-black border-b border-black/40"
          >
            {keyword}
          </strong>
          <span>{rest}</span>
        </>
      );
    }
    return (
      <>
        <strong className="font-bold underline decoration-black/80 underline-offset-2 text-black">
          {keyword}
        </strong>
        <span>{rest}</span>
      </>
    );
  }

  if (currentActiveClozeMode === 'cloze_keyword' && cleaned.length > 10) {
    const words = cleaned.split(' ');
    if (words.length >= 4) {
      const restWords = words.slice(3).join(' ');
      return (
        <>
          <span className="inline-block font-mono font-bold text-neutral-700 bg-neutral-100 border-b-2 border-dotted border-black px-1.5 rounded-xs mr-1">
            [ ................ ]
          </span>
          <span>{restWords}</span>
        </>
      );
    }
  }

  return <span>{cleaned}</span>;
}

/**
 * Collect all compiled CSS rules from the current document so the hidden print iframe
 * and print portal render 100% identically without depending on external CDN scripts.
 */
function collectCompiledDocumentStyles(): string {
  const chunks: string[] = [];
  try {
    const inlineRules: string[] = [];
    Array.from(document.styleSheets).forEach((sheet) => {
      try {
        const rules = sheet.cssRules || sheet.rules;
        if (rules) {
          Array.from(rules).forEach((rule) => {
            inlineRules.push(rule.cssText);
          });
        }
      } catch {
        if (sheet.href) {
          chunks.push(`<link rel="stylesheet" href="${sheet.href}" />`);
        }
      }
    });
    if (inlineRules.length > 0) {
      chunks.push(`<style>${inlineRules.join('\n')}</style>`);
    }

    const styleNodes = document.querySelectorAll('style');
    styleNodes.forEach((node) => {
      if (node.innerHTML) {
        chunks.push(`<style>${node.innerHTML}</style>`);
      }
    });
  } catch (e) {
    console.warn('Could not clone document styles:', e);
  }
  return chunks.join('\n');
}

/**
 * Find the cleanest horizontal whitespace row near `idealSliceHeight` on a high-DPI canvas
 * so multi-page PDF slicing never cuts through the middle of a line of text or box border.
 */
function findCleanCanvasPageSliceHeight(
  sourceCanvas: HTMLCanvasElement,
  startY: number,
  idealSliceHeight: number
): number {
  const remaining = sourceCanvas.height - startY;
  if (remaining <= idealSliceHeight + 24) {
    return remaining;
  }

  const ctx = sourceCanvas.getContext('2d');
  if (!ctx) return idealSliceHeight;

  const maxSearchUp = Math.min(260, Math.floor(idealSliceHeight * 0.28));
  const minSliceHeight = Math.max(200, idealSliceHeight - maxSearchUp);
  const sampleWidth = sourceCanvas.width;
  const stepX = Math.max(4, Math.floor(sampleWidth / 90));

  let bestYOffset = idealSliceHeight;
  let bestWhiteScore = -1;

  for (
    let offset = idealSliceHeight;
    offset >= minSliceHeight;
    offset -= 3
  ) {
    const y = startY + offset;
    if (y >= sourceCanvas.height) continue;
    try {
      const rowData = ctx.getImageData(0, y, sampleWidth, 1).data;
      let whitePixels = 0;
      let totalSampled = 0;
      for (let x = 24; x < sampleWidth - 24; x += stepX) {
        const idx = x * 4;
        const r = rowData[idx];
        const g = rowData[idx + 1];
        const b = rowData[idx + 2];
        totalSampled++;
        if (r > 246 && g > 246 && b > 246) {
          whitePixels++;
        }
      }
      const ratio = totalSampled > 0 ? whitePixels / totalSampled : 0;
      if (ratio >= 0.985) {
        return offset;
      }
      if (ratio > bestWhiteScore) {
        bestWhiteScore = ratio;
        bestYOffset = offset;
      }
    } catch {
      return idealSliceHeight;
    }
  }

  return bestWhiteScore >= 0.9 ? bestYOffset : idealSliceHeight;
}

export const A4PrintStudioModal: React.FC<A4PrintStudioModalProps> = ({
  database,
  activeLessonId,
  lessonTitle,
  systemName,
  subjectName,
  rootNode,
  onSortLessonsNaturally,
  onMoveLessonToSubject,
  onApplyCustomLessonOrder,
  onClose,
}) => {
  const safeActiveRootNode = useMemo(
    () => normalizeNodeForPrint(rootNode, 'active-root'),
    [rootNode]
  );

  // Fallback single-lesson object if database is not passed
  const fallbackLesson: LessonMindmap = useMemo(
    () =>
      normalizeLessonForPrint(
        {
          id: activeLessonId || 'current-lesson',
          title: lessonTitle || 'Bài học Y khoa',
          systemId: 'sys-default',
          subjectId: 'sub-default',
          updatedAt: new Date().toISOString(),
          status: 'learning',
          tags: [],
          rootNode: safeActiveRootNode,
        },
        0
      ),
    [activeLessonId, lessonTitle, safeActiveRootNode]
  );

  // Normalize ALL lessons in database upfront so no malformed lesson can ever crash Print Studio
  const allLessons: LessonMindmap[] = useMemo(() => {
    const rawList =
      database && Array.isArray(database.lessons) && database.lessons.length > 0
        ? database.lessons
        : [fallbackLesson];
    const normalizedList = rawList
      .filter((item) => item != null)
      .map((item, idx) => normalizeLessonForPrint(item, idx));
    return normalizedList.length > 0 ? normalizedList : [fallbackLesson];
  }, [database, fallbackLesson]);

  const currentLessonObj: LessonMindmap = useMemo(
    () =>
      allLessons.find((l) => l?.id === activeLessonId) ||
      allLessons[0] ||
      fallbackLesson,
    [allLessons, activeLessonId, fallbackLesson]
  );

  // ==========================================================================
  // 1. MULTI-LESSON BATCH SELECTION & LESSON / INTRA-LESSON SORTING STATE
  // ==========================================================================
  const [batchMode, setBatchMode] = useState<BatchScopeMode>('current');
  const [folderTarget, setFolderTarget] = useState<FolderTargetType>('subject');
  const [selectedLessonIds, setSelectedLessonIds] = useState<string[]>(() => [
    currentLessonObj.id,
  ]);
  const [isMultiSelectOpen, setIsMultiSelectOpen] = useState<boolean>(false);
  const [lessonSearchQuery, setLessonSearchQuery] = useState<string>('');
  const [singleLessonPillarScope, setSingleLessonPillarScope] =
    useState<string>('all');
  const [batchFallbackNotice, setBatchFallbackNotice] = useState<string | null>(
    null
  );

  // Default to 'natural_asc' so Câu 1, Câu 2, ..., Câu 13 are ALWAYS sorted 1 -> 13 automatically!
  const [lessonSortOrder, setLessonSortOrder] =
    useState<LessonSortOrderMode>('natural_asc');
  // Custom manual ordering array of lesson IDs so the user can move any lesson Up/Down/Top/Bottom or Drag-and-Drop
  const [customOrderIds, setCustomOrderIds] = useState<string[]>(() =>
    [...allLessons].sort(compareLessonsNaturally).map((l) => l.id)
  );
  // Drag-and-drop state inside Print Studio Lesson Organizer
  const [draggedQueueLessonId, setDraggedQueueLessonId] = useState<
    string | null
  >(null);
  const [queueDropIndicator, setQueueDropIndicator] = useState<{
    targetId: string;
    position: 'before' | 'after';
  } | null>(null);
  // Intra-lesson branch sorting mode ('natural_number' | 'medical_standard' | 'keep')
  const [intraLessonSort, setIntraLessonSort] =
    useState<IntraLessonSortMode>('natural_number');

  // Keep customOrderIds synced when new lessons appear in allLessons
  useEffect(() => {
    setCustomOrderIds((prev) => {
      const existingSet = new Set(prev);
      const missing = allLessons
        .filter((l) => !existingSet.has(l.id))
        .sort(compareLessonsNaturally)
        .map((l) => l.id);
      const validExisting = prev.filter((id) =>
        allLessons.some((l) => l.id === id)
      );
      return [...validExisting, ...missing];
    });
  }, [allLessons]);

  // Cover & Table of Contents toggle (Enabled by default so TOC + Page numbers are always ready)
  const [includeCoverAndToc, setIncludeCoverAndToc] = useState<boolean>(true);
  const [tocShowSubPillars, setTocShowSubPillars] = useState<boolean>(true);
  const [bookletTitle, setBookletTitle] = useState<string>(
    'TẬP ĐỀ CƯƠNG ÔN THI TỰ LUẬN & SƠ ĐỒ HỆ THỐNG HÓA Y KHOA'
  );
  const [compilerSubHeader, setCompilerSubHeader] = useState<string>(
    'Bản Đóng Quyển Chuẩn Barem Chấm Thi Lâm Sàng · Có Mục Lục & Định Vị Số Trang'
  );

  // Direct PDF generation state
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfExportProgress, setPdfExportProgress] = useState<string>('');
  const [pdfExportSuccessMsg, setPdfExportSuccessMsg] = useState<string | null>(
    null
  );

  // ==========================================================================
  // 2. 10 PRINT TEMPLATES & STUDY CUSTOMIZATION OPTIONS
  // ==========================================================================
  const [template, setTemplate] = useState<PrintTemplateType>('barem_outline');
  const [totalPointsScale, setTotalPointsScale] = useState<number>(5.0);

  // Global Active Study & Print Customization Options (work across all 10 templates!)
  const [activeStudyCloze, setActiveStudyCloze] =
    useState<StudyClozeMode>('full');
  const [printColorMode, setPrintColorMode] =
    useState<PrintColorMode>('color');
  const [fontScaleMode, setFontScaleMode] =
    useState<PrintFontScaleMode>('normal');
  const [showKeywordChecklistBox, setShowKeywordChecklistBox] =
    useState<boolean>(true);
  const [showSpacedRepetitionBox, setShowSpacedRepetitionBox] =
    useState<boolean>(true);

  // Sync module-level cloze & color mode before render so `renderPrintableKeywordText` is 100% reactive
  currentActiveClozeMode = activeStudyCloze;
  currentPrintColorMode = printColorMode;

  // Template 2 (Infographic Cột) options
  const [infographicColLayout, setInfographicColLayout] = useState<
    '3_per_row' | 'all_in_one_row'
  >('3_per_row');

  // Template 5 (Xương cá / Lưu đồ) sub-mode
  const [fishboneOrFlowchart, setFishboneOrFlowchart] = useState<
    'fishbone' | 'flowchart'
  >('fishbone');

  // Template 6 (Đề khuyết chữ) options
  const [worksheetShowLevel2, setWorksheetShowLevel2] = useState<boolean>(true);
  const [worksheetShowKeywordCount, setWorksheetShowKeywordCount] =
    useState<boolean>(true);
  const [worksheetLinesPerItem, setWorksheetLinesPerItem] = useState<number>(4);

  // Template 7 (Flashcards Cắt rời) options
  const [flashcardShowHints, setFlashcardShowHints] = useState<boolean>(true);

  // Template 10 (Đề thi thử chính thức) options
  const [examDurationMinutes, setExamDurationMinutes] = useState<number>(60);
  const [examIncludeAnswerKey, setExamIncludeAnswerKey] =
    useState<boolean>(true);

  const printSheetRef = useRef<HTMLDivElement | null>(null);
  const hiddenPrintIframeRef = useRef<HTMLIFrameElement | null>(null);

  // Real DOM measured page counts per section ID ('__toc__' and each lesson.id)
  const [measuredSectionPages, setMeasuredSectionPages] = useState<
    Record<string, number>
  >({});

  // Clean up persistent hidden print iframe and print portal when modal unmounts
  useEffect(() => {
    return () => {
      if (
        hiddenPrintIframeRef.current &&
        document.body.contains(hiddenPrintIframeRef.current)
      ) {
        try {
          document.body.removeChild(hiddenPrintIframeRef.current);
        } catch {
          // ignore
        }
      }
      const existingPortal = document.getElementById('medmind-print-portal');
      if (existingPortal && existingPortal.parentNode) {
        existingPortal.parentNode.removeChild(existingPortal);
      }
    };
  }, []);

  // Helper to apply `lessonSortOrder` to any array of lessons
  const applySortOrderToList = useMemo(() => {
    return (list: LessonMindmap[]): LessonMindmap[] => {
      if (list.length <= 1) return list;
      const copy = [...list];
      if (lessonSortOrder === 'natural_asc') {
        return copy.sort(compareLessonsNaturally);
      }
      if (lessonSortOrder === 'reverse') {
        return copy.sort((a, b) => compareLessonsNaturally(b, a));
      }
      if (lessonSortOrder === 'manual_custom') {
        const orderMap = new Map<string, number>();
        customOrderIds.forEach((id, idx) => orderMap.set(id, idx));
        return copy.sort(
          (a, b) =>
            (orderMap.get(a.id) ?? 9999) - (orderMap.get(b.id) ?? 9999)
        );
      }
      // 'sidebar_order' preserves database.lessons order
      return copy;
    };
  }, [lessonSortOrder, customOrderIds]);

  // Ordered list of all lessons for the Multi-select / Reorder drawer
  const orderedAllLessons = useMemo(
    () => applySortOrderToList(allLessons),
    [allLessons, applySortOrderToList]
  );

  // Resolve the final list of lessons to print based on `batchMode` and `lessonSortOrder`
  const { lessonsToPrint, autoFallbackReason } = useMemo(() => {
    if (batchMode === 'current') {
      return {
        lessonsToPrint: [currentLessonObj],
        autoFallbackReason: null as string | null,
      };
    }

    if (batchMode === 'folder') {
      if (folderTarget === 'all_library') {
        const base =
          allLessons.length > 0 ? allLessons : [currentLessonObj];
        return {
          lessonsToPrint: applySortOrderToList(base),
          autoFallbackReason: null,
        };
      }
      if (folderTarget === 'subject') {
        const list = allLessons.filter(
          (l) => l?.subjectId && l.subjectId === currentLessonObj.subjectId
        );
        if (list.length > 0) {
          return {
            lessonsToPrint: applySortOrderToList(list),
            autoFallbackReason:
              list.length === 1 && allLessons.length > 1
                ? `Học phần "${subjectName || 'Hiện tại'}" hiện có 1 bài học. Bạn có thể bấm "Toàn bộ thư viện (${allLessons.length} bài)" nếu muốn in gộp tất cả các bài.`
                : null,
          };
        }
        return {
          lessonsToPrint: [currentLessonObj],
          autoFallbackReason:
            'Không tìm thấy bài học nào khác trong Học phần này, đã tự động giữ lại bài học hiện tại.',
        };
      } else {
        const list = allLessons.filter(
          (l) => l?.systemId && l.systemId === currentLessonObj.systemId
        );
        if (list.length > 0) {
          return {
            lessonsToPrint: applySortOrderToList(list),
            autoFallbackReason:
              list.length === 1 && allLessons.length > 1
                ? `Hệ cơ quan "${systemName || 'Hiện tại'}" hiện có 1 bài học. Bạn có thể bấm "Toàn bộ thư viện (${allLessons.length} bài)" nếu muốn in gộp tất cả các bài.`
                : null,
          };
        }
        return {
          lessonsToPrint: [currentLessonObj],
          autoFallbackReason:
            'Không tìm thấy bài học nào khác trong Hệ cơ quan này, đã tự động giữ lại bài học hiện tại.',
        };
      }
    }

    // custom multi-select
    const picked = allLessons.filter((l) => selectedLessonIds.includes(l?.id));
    if (picked.length > 0) {
      return {
        lessonsToPrint: applySortOrderToList(picked),
        autoFallbackReason: null,
      };
    }
    return {
      lessonsToPrint: [currentLessonObj],
      autoFallbackReason:
        'Danh sách chọn đang trống — đã tự động chọn bài học hiện tại để trang in không bị trắng.',
    };
  }, [
    batchMode,
    folderTarget,
    allLessons,
    currentLessonObj,
    selectedLessonIds,
    subjectName,
    systemName,
    applySortOrderToList,
  ]);

  // Helper to get System & Subject name for any lesson safely
  const getLessonPathNames = (lesson?: LessonMindmap | null) => {
    if (!database || !lesson) {
      return {
        sysName: systemName || 'Y Khoa Lâm Sàng',
        subName: subjectName || 'Đề Cương Trọng Tâm',
      };
    }
    const sys = Array.isArray(database.systems)
      ? database.systems.find((s) => s?.id === lesson.systemId)
      : undefined;
    const sub = Array.isArray(database.subjects)
      ? database.subjects.find((s) => s?.id === lesson.subjectId)
      : undefined;
    return {
      sysName: sys?.name || systemName || 'Y Khoa',
      subName: sub?.name || subjectName || 'Học phần',
    };
  };

  const isLandscape =
    template === 'infographic_landscape' ||
    template === 'horizontal_tree' ||
    template === 'fishbone_flowchart' ||
    template === 'pocket_cheatsheet';

  // Live DOM Measurement Effect: Measure actual pixel height of each `.a4-print-section`
  // so the Table of Contents page numbers (`Tr. 02–03`) match the real PDF page slices!
  useEffect(() => {
    const measureSections = () => {
      const rootEl = printSheetRef.current;
      if (!rootEl) return;
      const sections = Array.from(
        rootEl.querySelectorAll<HTMLElement>('.a4-print-section')
      );
      if (sections.length === 0) return;

      const pageWidthMm = isLandscape ? 297 : 210;
      const pageHeightMm = isLandscape ? 210 : 297;
      const marginMm = 8;
      const footerReserveMm = 6;
      const contentWidthMm = pageWidthMm - marginMm * 2;
      const contentMaxHeightMm = pageHeightMm - marginMm * 2 - footerReserveMm;
      const heightToWidthRatio = contentMaxHeightMm / contentWidthMm;

      const nextCounts: Record<string, number> = {};
      sections.forEach((sec) => {
        const sectionKey = sec.getAttribute('data-section-key');
        if (!sectionKey) return;
        const rect = sec.getBoundingClientRect();
        if (rect.width <= 0) return;

        // Subtract any screen-only divider inside this section
        const dividerEl = sec.querySelector<HTMLElement>(
          '.screen-page-divider'
        );
        const dividerH = dividerEl
          ? dividerEl.getBoundingClientRect().height + 16
          : 0;
        const effectiveHeight = Math.max(40, rect.height - dividerH);
        const idealPageHeightPx = rect.width * heightToWidthRatio;
        const pages = Math.max(
          1,
          Math.ceil((effectiveHeight - 16) / idealPageHeightPx)
        );
        nextCounts[sectionKey] = pages;
      });

      setMeasuredSectionPages((prev) => {
        const keysA = Object.keys(prev);
        const keysB = Object.keys(nextCounts);
        if (
          keysA.length === keysB.length &&
          keysB.every((k) => prev[k] === nextCounts[k])
        ) {
          return prev;
        }
        return nextCounts;
      });
    };

    const timer = window.setTimeout(measureSections, 90);
    return () => window.clearTimeout(timer);
  }, [
    lessonsToPrint,
    template,
    includeCoverAndToc,
    tocShowSubPillars,
    fontScaleMode,
    intraLessonSort,
    showKeywordChecklistBox,
    showSpacedRepetitionBox,
    isLandscape,
  ]);

  // ==========================================================================
  // 3. TABLE OF CONTENTS & PAGE NUMBERING ENGINE (`tocPaginationData`)
  // ==========================================================================
  const tocPaginationData = useMemo(() => {
    const totalRawPillars = lessonsToPrint.reduce((acc, l) => {
      const pLen = Array.isArray(l?.rootNode?.children)
        ? l.rootNode.children.length
        : 0;
      return acc + pLen;
    }, 0);
    const effectiveTocRowUnits =
      lessonsToPrint.length * 2 + (tocShowSubPillars ? totalRawPillars : 0);
    const heuristicTocPages = Math.max(1, Math.ceil(effectiveTocRowUnits / 32));
    const tocPageCount = includeCoverAndToc
      ? measuredSectionPages['__toc__'] || heuristicTocPages
      : 0;

    let runningCurrentPage = includeCoverAndToc ? tocPageCount + 1 : 1;
    let totalPillars = 0;
    let totalRubricItems = 0;
    let totalKeywords = 0;

    const lessonsMeta: TocLessonPageMeta[] = lessonsToPrint.map(
      (rawLesson, idx) => {
        const normalizedLesson = normalizeLessonForPrint(rawLesson, idx);
        const sortedRoot = sortMindmapTreeForPrint(
          normalizedLesson.rootNode,
          intraLessonSort
        );
        const allPillars = Array.isArray(sortedRoot?.children)
          ? sortedRoot.children
          : [];
        const filteredPillars =
          batchMode === 'current' && singleLessonPillarScope !== 'all'
            ? allPillars.filter((p) => p?.id === singleLessonPillarScope)
            : allPillars;
        const targetPillars =
          filteredPillars.length > 0 ? filteredPillars : allPillars;

        const scopeArg =
          batchMode === 'current' ? singleLessonPillarScope : 'all';
        const rubricCriteria = buildMedicalRubricCriteria(
          sortedRoot,
          scopeArg,
          totalPointsScale
        );
        const { sysName, subName } = getLessonPathNames(normalizedLesson);
        const headingInfo = formatCleanLessonHeading(
          normalizedLesson.title,
          sortedRoot.label,
          idx
        );

        const lessonStartPage = runningCurrentPage;
        let accumulatedUnits = 12;
        let lvl2TotalCount = 0;

        const pillarsMeta: TocPillarPageMeta[] = targetPillars.map(
          (pillar, pIdx) => {
            const lvl2Nodes = Array.isArray(pillar.children)
              ? pillar.children
              : [];
            lvl2TotalCount += lvl2Nodes.length;

            let lvl3Count = 0;
            lvl2Nodes.forEach((l2) => {
              const l3 = Array.isArray(l2.children) ? l2.children : [];
              lvl3Count += l3.length;
              l3.forEach((l3Item) => {
                if (Array.isArray(l3Item.children)) {
                  lvl3Count += l3Item.children.length;
                }
              });
            });

            const pillarRubrics = rubricCriteria.filter(
              (c) => c.pillarIndex === pIdx + 1
            );
            const pillarKeywords = pillarRubrics.reduce(
              (sum, c) => sum + c.requiredKeywords.length,
              0
            );
            const pillarPoints = pillarRubrics.reduce(
              (sum, c) => sum + c.allocatedPoints,
              0
            );

            let pillarUnits = 10;
            if (template === 'barem_outline' || template === 'cornell_note') {
              pillarUnits =
                6 + Math.max(1, lvl2Nodes.length) * 6 + lvl3Count * 2.1;
            } else if (template === 'horizontal_tree') {
              pillarUnits =
                6 + Math.max(1, lvl2Nodes.length) * 5.8 + lvl3Count * 1.9;
            } else if (
              template === 'infographic_landscape' ||
              template === 'fishbone_flowchart'
            ) {
              pillarUnits =
                5 + Math.max(1, lvl2Nodes.length) * 4.2 + lvl3Count * 1.3;
            } else if (template === 'pocket_cheatsheet') {
              pillarUnits =
                4 + Math.max(1, lvl2Nodes.length) * 3.0 + lvl3Count * 0.8;
            } else if (template === 'flashcard_sheet') {
              pillarUnits = Math.max(1, lvl2Nodes.length) * 13;
            } else if (template === 'clinical_osce_checklist') {
              pillarUnits =
                7 + Math.max(1, lvl2Nodes.length) * 6.0 + lvl3Count * 1.8;
            } else if (template === 'exam_simulation_paper') {
              pillarUnits =
                10 +
                Math.max(1, lvl2Nodes.length) * 9 +
                (examIncludeAnswerKey ? lvl3Count * 2.0 : 0);
            } else if (template === 'blank_worksheet') {
              pillarUnits =
                9 +
                Math.max(1, lvl2Nodes.length) * (worksheetLinesPerItem * 3.2);
            }

            const prevUnits = accumulatedUnits;
            accumulatedUnits += pillarUnits;

            return {
              index: pIdx + 1,
              id: pillar.id || `p-${pIdx}`,
              label: cleanNodeLabel(pillar.label || `Mục ${pIdx + 1}`),
              lvl2Count: lvl2Nodes.length,
              lvl3Count,
              rubricCount: pillarRubrics.length,
              keywordsCount: pillarKeywords,
              points: pillarPoints,
              pageNumber: prevUnits, // normalized to actual lessonPageCount below
            };
          }
        );

        const heuristicLessonPages = Math.max(
          1,
          Math.ceil(accumulatedUnits / 100)
        );
        const lessonPageCount =
          measuredSectionPages[normalizedLesson.id] || heuristicLessonPages;
        const lessonEndPage = lessonStartPage + lessonPageCount - 1;
        runningCurrentPage = lessonEndPage + 1;

        // Map each pillar's relative position into [lessonStartPage .. lessonEndPage]
        const totalUnits = Math.max(1, accumulatedUnits);
        pillarsMeta.forEach((p) => {
          const ratio = Math.min(0.99, Math.max(0, p.pageNumber / totalUnits));
          p.pageNumber =
            lessonStartPage + Math.floor(ratio * lessonPageCount);
        });

        const lessonKeywordsCount = rubricCriteria.reduce(
          (sum, c) => sum + c.requiredKeywords.length,
          0
        );

        totalPillars += targetPillars.length;
        totalRubricItems += rubricCriteria.length;
        totalKeywords += lessonKeywordsCount;

        const statusLabel =
          normalizedLesson.status === 'Đã thuộc'
            ? 'Đã thuộc'
            : normalizedLesson.status === 'Đang ôn'
            ? 'Đang ôn'
            : 'Trọng tâm';

        const pageRangeLabel =
          lessonStartPage === lessonEndPage
            ? `Tr. ${String(lessonStartPage).padStart(2, '0')}`
            : `Tr. ${String(lessonStartPage).padStart(2, '0')}–${String(
                lessonEndPage
              ).padStart(2, '0')}`;

        return {
          lessonId: normalizedLesson.id || `lesson-${idx}`,
          lessonIndex: idx,
          title: headingInfo.fullHeading,
          shortBadge: headingInfo.shortBadge,
          cleanTopicTitle: headingInfo.cleanTopicTitle,
          sysName,
          subName,
          statusLabel,
          pillarCount: targetPillars.length,
          lvl2TotalCount,
          rubricItemsCount: rubricCriteria.length,
          keywordsCount: lessonKeywordsCount,
          totalPoints: totalPointsScale,
          startPage: lessonStartPage,
          endPage: lessonEndPage,
          pageCount: lessonPageCount,
          pageRangeLabel,
          pillars: pillarsMeta,
        };
      }
    );

    const totalDocumentPages = Math.max(1, runningCurrentPage - 1);

    return {
      tocPageCount,
      totalDocumentPages,
      totalLessons: lessonsToPrint.length,
      totalPillars,
      totalRubricItems,
      totalKeywords,
      lessonsMeta,
    };
  }, [
    lessonsToPrint,
    includeCoverAndToc,
    tocShowSubPillars,
    batchMode,
    singleLessonPillarScope,
    totalPointsScale,
    template,
    worksheetLinesPerItem,
    examIncludeAnswerKey,
    intraLessonSort,
    measuredSectionPages,
    database,
    systemName,
    subjectName,
  ]);

  const toggleLessonSelection = (id: string) => {
    setSelectedLessonIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((item) => item !== id);
        if (next.length === 0) {
          setBatchFallbackNotice(
            'Cần chọn ít nhất 1 bài học để in. Đã giữ lại bài học này.'
          );
          return [id];
        }
        setBatchFallbackNotice(null);
        return next;
      }
      setBatchFallbackNotice(null);
      return [...prev, id];
    });
  };

  /**
   * Move a lesson Up, Down, to Top, to Bottom, or to a specific 0-based index in the Print Studio queue,
   * and synchronize the new order back to the main Database & Sidebar!
   */
  const handleReorderLessonInPrintQueue = (
    lessonId: string,
    action: 'up' | 'down' | 'top' | 'bottom' | number
  ) => {
    const currentIds = orderedAllLessons.map((l) => l.id);
    const idx = currentIds.indexOf(lessonId);
    if (idx === -1) return;

    const nextIds = [...currentIds];
    if (action === 'up' && idx > 0) {
      const tmp = nextIds[idx];
      nextIds[idx] = nextIds[idx - 1];
      nextIds[idx - 1] = tmp;
    } else if (action === 'down' && idx < nextIds.length - 1) {
      const tmp = nextIds[idx];
      nextIds[idx] = nextIds[idx + 1];
      nextIds[idx + 1] = tmp;
    } else if (action === 'top' && idx > 0) {
      const [item] = nextIds.splice(idx, 1);
      nextIds.unshift(item);
    } else if (action === 'bottom' && idx < nextIds.length - 1) {
      const [item] = nextIds.splice(idx, 1);
      nextIds.push(item);
    } else if (typeof action === 'number') {
      const targetIdx = Math.max(0, Math.min(nextIds.length - 1, action));
      if (targetIdx !== idx) {
        const [item] = nextIds.splice(idx, 1);
        nextIds.splice(targetIdx, 0, item);
      }
    }

    setCustomOrderIds(nextIds);
    setLessonSortOrder('manual_custom');
    onApplyCustomLessonOrder?.(nextIds);
  };

  /**
   * Drag-and-Drop Reorder inside Print Studio Lesson Organizer
   */
  const handleDropReorderInPrintQueue = (
    draggedId: string,
    targetId: string,
    position: 'before' | 'after'
  ) => {
    if (!draggedId || !targetId || draggedId === targetId) return;
    const currentIds = orderedAllLessons.map((l) => l.id);
    const withoutDragged = currentIds.filter((id) => id !== draggedId);
    const targetIdx = withoutDragged.indexOf(targetId);
    if (targetIdx === -1) return;

    const insertIdx = position === 'before' ? targetIdx : targetIdx + 1;
    const nextIds = [...withoutDragged];
    nextIds.splice(insertIdx, 0, draggedId);

    setCustomOrderIds(nextIds);
    setLessonSortOrder('manual_custom');
    onApplyCustomLessonOrder?.(nextIds);
  };

  /**
   * 1-CLICK DIRECT PDF FILE EXPORT (`.pdf` download using html2canvas-pro + jsPDF)
   * Uses a smart 2-stage slice pass when Cover & TOC is enabled so that every lesson's
   * start/end page in the Table of Contents matches the actual PDF page numbers 100%!
   */
  const handleExportDirectPdf = async () => {
    if (!printSheetRef.current || isExportingPdf) return;
    setIsExportingPdf(true);
    setPdfExportSuccessMsg(null);
    setPdfExportProgress('Đang chuẩn bị bố cục trang A4...');

    try {
      const rootEl = printSheetRef.current;
      const sectionNodes = Array.from(
        rootEl.querySelectorAll<HTMLElement>('.a4-print-section')
      );
      const targets =
        sectionNodes.length > 0 ? sectionNodes : [rootEl];

      const orientation = isLandscape ? 'landscape' : 'portrait';
      const pdf = new jsPDF({
        orientation,
        unit: 'mm',
        format: 'a4',
        compress: true,
      });

      const pageWidthMm = isLandscape ? 297 : 210;
      const pageHeightMm = isLandscape ? 210 : 297;
      const marginMm = 8;
      const footerReserveMm = 6;
      const contentWidthMm = pageWidthMm - marginMm * 2;
      const contentMaxHeightMm =
        pageHeightMm - marginMm * 2 - footerReserveMm;

      interface RenderedPageSlice {
        imgDataUrl: string;
        widthMm: number;
        heightMm: number;
        sectionLabel: string;
      }

      const sliceElementToPages = async (
        sectionEl: HTMLElement,
        sectionLabel: string
      ): Promise<RenderedPageSlice[]> => {
        const canvas = await html2canvas(sectionEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          ignoreElements: (el) =>
            el.classList.contains('screen-page-divider') ||
            el.classList.contains('no-print'),
        });

        const pxPerMm = canvas.width / contentWidthMm;
        const idealPageHeightPx = Math.floor(contentMaxHeightMm * pxPerMm);
        const slices: RenderedPageSlice[] = [];

        let currentY = 0;
        while (currentY < canvas.height) {
          const sliceHeightPx = findCleanCanvasPageSliceHeight(
            canvas,
            currentY,
            idealPageHeightPx
          );
          if (sliceHeightPx <= 0) break;

          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sliceHeightPx;
          const pageCtx = pageCanvas.getContext('2d');
          if (pageCtx) {
            pageCtx.fillStyle = '#ffffff';
            pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
            pageCtx.drawImage(
              canvas,
              0,
              currentY,
              canvas.width,
              sliceHeightPx,
              0,
              0,
              canvas.width,
              sliceHeightPx
            );
          }

          const sliceHeightMm = sliceHeightPx / pxPerMm;
          slices.push({
            imgDataUrl: pageCanvas.toDataURL('image/jpeg', 0.94),
            widthMm: contentWidthMm,
            heightMm: Math.min(contentMaxHeightMm, sliceHeightMm),
            sectionLabel,
          });

          currentY += sliceHeightPx;
        }
        return slices;
      };

      const hasTocSection =
        includeCoverAndToc &&
        targets.length > 1 &&
        targets[0].getAttribute('data-section-key') === '__toc__';

      let allSlices: RenderedPageSlice[] = [];
      const exactSectionPageMap: Record<string, number> = {};

      if (hasTocSection) {
        const tocEl = targets[0];
        const lessonEls = targets.slice(1);

        // Pass 1A: Quickly slice TOC to know exact number of pages TOC occupies
        setPdfExportProgress('Đang định vị số trang Mục lục...');
        await new Promise((r) => setTimeout(r, 30));
        const initialTocSlices = await sliceElementToPages(
          tocEl,
          'Trang Bìa & Mục Lục'
        );
        const tocActualPages = Math.max(1, initialTocSlices.length);
        exactSectionPageMap['__toc__'] = tocActualPages;

        // Pass 1B: Slice each lesson in exact order and record its real startPage..endPage
        let runningPage = tocActualPages + 1;
        const lessonSlicesList: RenderedPageSlice[][] = [];
        const realLessonRanges: {
          startPage: number;
          endPage: number;
          pageCount: number;
          rangeLabel: string;
        }[] = [];

        for (let i = 0; i < lessonEls.length; i++) {
          const secEl = lessonEls[i];
          const secKey =
            secEl.getAttribute('data-section-key') || `lesson-${i}`;
          const secLabel =
            secEl.getAttribute('data-section-label') ||
            `Bài ${i + 1}/${lessonEls.length}`;

          setPdfExportProgress(
            `Đang kết xuất Bài ${i + 1}/${lessonEls.length}...`
          );
          await new Promise((r) => setTimeout(r, 35));

          // Stamp the exact known start page into the lesson header before capturing
          const startBadges = secEl.querySelectorAll<HTMLElement>(
            '[data-sync-lesson-start]'
          );
          startBadges.forEach((b) => {
            b.textContent = `Tr. ${String(runningPage).padStart(2, '0')}`;
          });

          const slices = await sliceElementToPages(secEl, secLabel);
          const count = Math.max(1, slices.length);
          const startP = runningPage;
          const endP = startP + count - 1;
          runningPage = endP + 1;

          exactSectionPageMap[secKey] = count;
          lessonSlicesList.push(slices);
          realLessonRanges.push({
            startPage: startP,
            endPage: endP,
            pageCount: count,
            rangeLabel:
              startP === endP
                ? `Tr. ${String(startP).padStart(2, '0')}`
                : `Tr. ${String(startP).padStart(2, '0')}–${String(
                    endP
                  ).padStart(2, '0')}`,
          });
        }

        const exactTotalPages = Math.max(1, runningPage - 1);

        // Pass 2: Update the TOC DOM elements with 100% exact verified page numbers and re-capture TOC
        setPdfExportProgress('Đang đồng bộ số trang vào Mục lục...');
        const totalPageNodes = tocEl.querySelectorAll<HTMLElement>(
          '[data-sync-total-pages]'
        );
        totalPageNodes.forEach((n) => {
          n.textContent = String(exactTotalPages).padStart(2, '0');
        });
        const tocHeaderRangeNode = tocEl.querySelector<HTMLElement>(
          '[data-sync-toc-header-range]'
        );
        if (tocHeaderRangeNode) {
          tocHeaderRangeNode.textContent =
            tocActualPages > 1
              ? `📄 TRANG BÌA & MỤC LỤC: Tr. 01–${String(
                  tocActualPages
                ).padStart(2, '0')} / Tổng ${String(exactTotalPages).padStart(
                  2,
                  '0'
                )} tr.`
              : `📄 TRANG BÌA & MỤC LỤC: Tr. 01 / Tổng ${String(
                  exactTotalPages
                ).padStart(2, '0')} tr.`;
        }

        realLessonRanges.forEach((rng, idx) => {
          const rangeNodes = tocEl.querySelectorAll<HTMLElement>(
            `[data-sync-lesson-range="${idx}"]`
          );
          rangeNodes.forEach((n) => {
            n.textContent = rng.rangeLabel;
          });
          const countNodes = tocEl.querySelectorAll<HTMLElement>(
            `[data-sync-lesson-count="${idx}"]`
          );
          countNodes.forEach((n) => {
            n.textContent = `(${rng.pageCount} trang A4)`;
          });
          const pillarNodes = tocEl.querySelectorAll<HTMLElement>(
            `[data-sync-pillar-lesson="${idx}"]`
          );
          const pTotal = Math.max(1, pillarNodes.length);
          pillarNodes.forEach((pNode, pIdx) => {
            const estPage =
              rng.startPage +
              Math.min(
                rng.pageCount - 1,
                Math.floor((pIdx / pTotal) * rng.pageCount)
              );
            pNode.textContent = `Tr. ${String(estPage).padStart(2, '0')}`;
          });
        });

        await new Promise((r) => setTimeout(r, 30));
        const finalTocSlices = await sliceElementToPages(
          tocEl,
          'Trang Bìa & Mục Lục'
        );

        allSlices = [
          ...finalTocSlices,
          ...lessonSlicesList.reduce((acc, s) => acc.concat(s), []),
        ];
        setMeasuredSectionPages(exactSectionPageMap);
      } else {
        for (let sIdx = 0; sIdx < targets.length; sIdx++) {
          const sectionEl = targets[sIdx];
          const sectionLabel =
            sectionEl.getAttribute('data-section-label') ||
            `Phần ${sIdx + 1}/${targets.length}`;
          setPdfExportProgress(
            `Đang kết xuất trang in (${sIdx + 1}/${targets.length})...`
          );
          await new Promise((r) => setTimeout(r, 35));
          const slices = await sliceElementToPages(sectionEl, sectionLabel);
          allSlices.push(...slices);
        }
      }

      // Write all slices to the PDF document and stamp page numbers
      const totalPdfPages = Math.max(1, allSlices.length);
      allSlices.forEach((slice, pageIdx) => {
        if (pageIdx > 0) {
          pdf.addPage('a4', orientation);
        }
        pdf.addImage(
          slice.imgDataUrl,
          'JPEG',
          marginMm,
          marginMm,
          slice.widthMm,
          slice.heightMm,
          undefined,
          'FAST'
        );

        // Draw crisp bottom divider line & page number footer
        const footerY = pageHeightMm - 4.5;
        pdf.setDrawColor(200, 210, 225);
        pdf.setLineWidth(0.25);
        pdf.line(
          marginMm,
          footerY - 3.2,
          pageWidthMm - marginMm,
          footerY - 3.2
        );

        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(7.5);
        pdf.setTextColor(30, 58, 138);
        pdf.text(
          `MedMind Print Studio Pro  |  Trang ${String(pageIdx + 1).padStart(
            2,
            '0'
          )} / ${String(totalPdfPages).padStart(2, '0')}`,
          pageWidthMm - marginMm,
          footerY,
          { align: 'right' }
        );
      });

      const rawBaseName =
        lessonsToPrint.length > 1
          ? `De-Cuong-Y-Khoa-${lessonsToPrint.length}-Bai-Hoc`
          : cleanNodeLabel(lessonTitle || 'De-Cuong-Y-Khoa')
              .replace(/[/:*?"<>|\\]+/g, '-')
              .slice(0, 65);
      const fileName = `${rawBaseName || 'De-Cuong-Y-Khoa'}.pdf`;

      setPdfExportProgress('Đang lưu file PDF...');
      pdf.save(fileName);

      setPdfExportSuccessMsg(
        `Đã xuất thành công file "${fileName}" (${totalPdfPages} trang A4 · Đã đồng bộ chính xác số trang Mục lục)!`
      );
      setTimeout(() => {
        setPdfExportSuccessMsg(null);
      }, 6000);
    } catch (err) {
      console.error('Direct PDF export error, falling back to print:', err);
      handlePrintA4();
    } finally {
      setIsExportingPdf(false);
      setPdfExportProgress('');
    }
  };

  /**
   * Print cleanly via BOTH a top-level `#medmind-print-portal` in `document.body` AND a real-dimension
   * offscreen iframe so Vector Print-to-PDF works 100% reliably with zero dark UI leakage.
   */
  const handlePrintA4 = () => {
    if (!printSheetRef.current) return;
    const contentHtml = printSheetRef.current.innerHTML;
    const compiledStyles = collectCompiledDocumentStyles();
    const docTitle =
      lessonsToPrint.length > 1
        ? `Đề Cương Gộp (${lessonsToPrint.length} Bài Học)`
        : lessonTitle || 'Đề Cương Y Khoa';
    const pageSizeRule = isLandscape ? 'A4 landscape' : 'A4 portrait';

    // 1. Mount top-level #medmind-print-portal directly in document.body so if window.print() runs,
    // @media print hides #root and prints ONLY #medmind-print-portal cleanly!
    try {
      let portal = document.getElementById('medmind-print-portal');
      if (!portal) {
        portal = document.createElement('div');
        portal.id = 'medmind-print-portal';
        document.body.appendChild(portal);
      }
      portal.innerHTML = contentHtml;
    } catch (e) {
      console.warn('Could not populate print portal:', e);
    }

    // 2. Also populate a real-dimension offscreen iframe (1024x800, not 0x0) for isolated printing
    try {
      let iframe = hiddenPrintIframeRef.current;
      if (!iframe || !document.body.contains(iframe)) {
        iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.left = '-9999px';
        iframe.style.top = '0';
        iframe.style.width = isLandscape ? '1122px' : '794px';
        iframe.style.height = '1122px';
        iframe.style.border = '0';
        iframe.style.opacity = '0';
        iframe.style.pointerEvents = 'none';
        iframe.setAttribute('aria-hidden', 'true');
        document.body.appendChild(iframe);
        hiddenPrintIframeRef.current = iframe;
      }

      const doc = iframe.contentWindow?.document;
      if (!doc) {
        window.print();
        return;
      }

      doc.open();
      doc.write(`<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>${docTitle}</title>
  ${compiledStyles}
  <style>
    @page {
      size: ${pageSizeRule};
      margin: 10mm;
    }
    html, body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #ffffff !important;
      color: #111827 !important;
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      height: auto !important;
      overflow: visible !important;
      font-size: 9.5pt !important;
      line-height: 1.35 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    table {
      border-collapse: collapse;
      width: 100%;
    }
    tr, .avoid-break {
      page-break-inside: avoid;
      break-inside: avoid;
    }
    .a4-page-break {
      page-break-after: always !important;
      break-after: page !important;
    }
    .screen-page-divider, .no-print {
      display: none !important;
    }
    .hd-box {
      padding: 6px 10px !important;
      line-height: 1.35 !important;
    }
    .hd-stack > * + * {
      margin-top: 6px !important;
    }
    .hd-title {
      font-size: 11pt !important;
      line-height: 1.35 !important;
    }
    .hd-bullet {
      font-size: 9.5pt !important;
      line-height: 1.35 !important;
    }
  </style>
</head>
<body class="bg-white text-[#111827]">
  ${contentHtml}
</body>
</html>`);
      doc.close();

      setTimeout(() => {
        try {
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.focus();
            iframe.contentWindow.print();
          } else {
            window.print();
          }
        } catch (printErr) {
          console.warn('Iframe print fallback to window.print():', printErr);
          window.print();
        }
      }, 320);
    } catch (err) {
      console.warn('Print error fallback to window.print():', err);
      window.print();
    }
  };

  /**
   * Render a single lesson according to the active `template` with High-Density Medical Handout layout
   * and synchronized page numbering (`Trang X / Tổng Y`) matching the Table of Contents.
   */
  const renderSingleLessonTemplate = (
    rawLesson: LessonMindmap,
    lessonIndex: number,
    totalLessons: number
  ) => {
    try {
      const lesson = normalizeLessonForPrint(rawLesson, lessonIndex);
      const lRoot = sortMindmapTreeForPrint(lesson.rootNode, intraLessonSort);
      const allPillars = Array.isArray(lRoot?.children) ? lRoot.children : [];
      const filteredPillars =
        batchMode === 'current' && singleLessonPillarScope !== 'all'
          ? allPillars.filter((p) => p?.id === singleLessonPillarScope)
          : allPillars;
      const targetPillars =
        filteredPillars.length > 0 ? filteredPillars : allPillars;

      const scopeArg =
        batchMode === 'current' ? singleLessonPillarScope : 'all';
      const rubricCriteria = buildMedicalRubricCriteria(
        lRoot,
        scopeArg,
        totalPointsScale
      );
      const { sysName, subName } = getLessonPathNames(lesson);
      const headingInfo = formatCleanLessonHeading(
        lesson.title,
        lRoot.label,
        lessonIndex
      );
      const resolvedLessonTitle = headingInfo.cleanTopicTitle;
      const lessonHeaderPrefix = headingInfo.fullHeading;
      const resolvedRootSummary =
        lRoot.summary && lRoot.summary.trim().length > 0
          ? lRoot.summary.trim()
          : `Hệ thống hóa ${targetPillars.length} mục lớn: ${targetPillars
              .map((p, i) => `(${i + 1}) ${cleanNodeLabel(p.label)}`)
              .join(' · ')}.`;

      const lessonPageMeta = tocPaginationData.lessonsMeta[lessonIndex];
      const lessonPageBadge = lessonPageMeta
        ? lessonPageMeta.pageRangeLabel
        : `Tr. ${String(lessonIndex + 1).padStart(2, '0')}`;

      return (
        <LessonPrintErrorBoundary
          key={lesson.id || `lesson-${lessonIndex}`}
          lessonTitle={lesson.title}
        >
          <div
            data-section-key={lesson.id || `lesson-${lessonIndex}`}
            data-section-label={lessonHeaderPrefix}
            className={`a4-print-section bg-white text-[#111827] ${
              lessonIndex < totalLessons - 1 ? 'a4-page-break pb-2' : ''
            }`}
          >
            {/* Running Top Page Header Bar with Clean Lesson Order & Synchronized Start Page */}
            <div className="flex items-center justify-between gap-2 pb-1 mb-1.5 border-b border-neutral-300 text-[8pt] font-mono text-neutral-600">
              <div className="truncate">
                📖 {bookletTitle} · <strong>{sysName} › {subName}</strong>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span className="font-semibold text-neutral-700">
                  {headingInfo.shortBadge} ({String(lessonIndex + 1).padStart(2, '0')}/
                  {String(totalLessons).padStart(2, '0')})
                </span>
                <span
                  data-sync-lesson-start={lessonIndex}
                  className="px-1.5 py-0.2 rounded-xs bg-[#eff6ff] border border-[#93c5fd] text-[#1e3a8a] font-bold"
                >
                  {lessonPageBadge}
                </span>
              </div>
            </div>

            {/* ================================================================= */}
            {/* TEMPLATE 1: 📋 1. BAREM TỰ LUẬN (HIGH-DENSITY PORTRAIT A4)        */}
            {/* ================================================================= */}
            {template === 'barem_outline' && (
              <div className="bg-white text-[#111827]">
                <div
                  style={{ padding: '6px 10px' }}
                  className="border-2 border-[#1e3a8a] bg-[#eff6ff] rounded-md mb-2 flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[8.5pt] font-bold uppercase tracking-wider text-[#1d4ed8]">
                      ĐỀ CƯƠNG TỰ LUẬN Y KHOA THEO BAREM · {sysName} › {subName}
                    </div>
                    <h1
                      style={{ fontSize: '12pt', lineHeight: 1.3 }}
                      className="font-extrabold text-[#1e3a8a] uppercase mt-0.5"
                    >
                      {lessonHeaderPrefix}
                    </h1>
                    <p
                      style={{ fontSize: '9.5pt', lineHeight: 1.35 }}
                      className="text-[#111827] mt-0.5"
                    >
                      <strong className="text-[#1e3a8a]">
                        Định nghĩa & Trọng tâm:
                      </strong>{' '}
                      {resolvedRootSummary}
                    </p>
                  </div>

                  <div
                    style={{ padding: '4px 8px' }}
                    className="border border-black text-right shrink-0 bg-white text-black rounded-xs"
                  >
                    <div className="text-[8pt] font-bold uppercase">
                      THANG ĐIỂM
                    </div>
                    <div className="text-[11pt] font-extrabold font-mono leading-tight">
                      {totalPointsScale.toFixed(2)} ĐIỂM
                    </div>
                    <div className="text-[8pt] text-neutral-700">
                      ({rubricCriteria.length} ý chấm)
                    </div>
                  </div>
                </div>

                <table
                  style={{ fontSize: '9.5pt', lineHeight: 1.35 }}
                  className="w-full border border-black bg-white text-[#111827]"
                >
                  <thead>
                    <tr className="bg-neutral-100 border-b-2 border-black text-left font-bold text-black">
                      <th
                        style={{ padding: '4px 6px' }}
                        className="border border-black w-[42px] text-center"
                      >
                        Mã
                      </th>
                      <th
                        style={{ padding: '4px 8px' }}
                        className="border border-black"
                      >
                        Nội dung Đề cương Tự luận chuẩn (Đã gạch chân Từ khóa)
                      </th>
                      <th
                        style={{ padding: '4px 8px' }}
                        className="border border-black w-[185px]"
                      >
                        Từ khóa ăn điểm Barem
                      </th>
                      <th
                        style={{ padding: '4px 6px' }}
                        className="border border-black w-[54px] text-center"
                      >
                        Điểm
                      </th>
                      <th
                        style={{ padding: '4px 4px' }}
                        className="border border-black w-[38px] text-center"
                      >
                        Đạt
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white text-[#111827]">
                    {rubricCriteria.map((item, idx) => {
                      const prevPillar =
                        idx > 0 ? rubricCriteria[idx - 1].pillarLabel : null;
                      const showPillarBanner = item.pillarLabel !== prevPillar;

                      return (
                        <React.Fragment key={item.id}>
                          {showPillarBanner && (
                            <tr className="bg-neutral-200 border-y border-black">
                              <td
                                colSpan={5}
                                style={{
                                  padding: '4px 8px',
                                  fontSize: '10.5pt',
                                  lineHeight: 1.3,
                                }}
                                className="font-extrabold uppercase text-black"
                              >
                                PHẦN {item.pillarIndex}. {item.pillarLabel}
                              </td>
                            </tr>
                          )}
                          <tr className="border-b border-black align-top bg-white avoid-break">
                            <td
                              style={{ padding: '5px 6px' }}
                              className="border border-black text-center font-mono font-bold text-[9pt] text-black"
                            >
                              {item.code}
                            </td>
                            <td
                              style={{
                                padding: '5px 8px',
                                lineHeight: 1.35,
                              }}
                              className="border border-black text-[#111827]"
                            >
                              <div
                                style={{ fontSize: '10pt', lineHeight: 1.35 }}
                                className="font-bold text-black"
                              >
                                {renderPrintableKeywordText(
                                  item.standardContent
                                )}
                              </div>
                              {item.subPoints.length > 0 && (
                                <ul
                                  style={{
                                    fontSize: '9.5pt',
                                    lineHeight: 1.35,
                                  }}
                                  className="pl-2.5 mt-0.5 space-y-0.5 text-neutral-900"
                                >
                                  {item.subPoints.map((sp, sIdx) => (
                                    <li key={sIdx}>
                                      • {renderPrintableKeywordText(sp)}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                            <td
                              style={{ padding: '5px 6px' }}
                              className="border border-black bg-white"
                            >
                              <div className="flex flex-wrap gap-1">
                                {item.requiredKeywords.map((kw, kIdx) => (
                                  <span
                                    key={kIdx}
                                    className="inline-block px-1 py-0.2 border border-neutral-800 rounded-xs text-[8.5pt] font-bold text-black bg-amber-50/70"
                                  >
                                    {kw}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td
                              style={{ padding: '5px 4px' }}
                              className="border border-black text-center font-mono font-extrabold text-[9.5pt] text-black"
                            >
                              {item.allocatedPoints.toFixed(2)}đ
                            </td>
                            <td
                              style={{ padding: '5px 4px' }}
                              className="border border-black text-center"
                            >
                              <div className="w-3.5 h-3.5 border border-black mx-auto mt-0.5 bg-white" />
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-neutral-100 border-t-2 border-black font-bold text-black">
                      <td
                        colSpan={3}
                        style={{ padding: '4px 8px' }}
                        className="border border-black text-right uppercase text-[9.5pt]"
                      >
                        Tổng điểm toàn bài Barem chuẩn:
                      </td>
                      <td
                        style={{ padding: '4px 6px' }}
                        className="border border-black text-center font-mono font-extrabold text-[10pt]"
                      >
                        {totalPointsScale.toFixed(2)}đ
                      </td>
                      <td
                        style={{ padding: '4px 4px' }}
                        className="border border-black text-center font-mono text-[8.5pt]"
                      >
                        /{totalPointsScale.toFixed(1)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}

            {/* ================================================================= */}
            {/* TEMPLATE 2: 📊 2. INFOGRAPHIC CỘT (HIGH-DENSITY A4)               */}
            {/* ================================================================= */}
            {template === 'infographic_landscape' && (
              <div className="bg-white text-[#111827]">
                <div
                  style={{ padding: '6px 10px' }}
                  className="rounded-md border-2 border-[#1e3a8a] bg-[#eff6ff] mb-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h1
                      style={{ fontSize: '11.5pt', lineHeight: 1.3 }}
                      className="font-extrabold uppercase text-[#1e3a8a]"
                    >
                      {lessonHeaderPrefix}
                    </h1>
                    <span className="text-[8.5pt] font-mono font-bold uppercase text-[#1d4ed8] shrink-0">
                      {sysName} › {subName}
                    </span>
                  </div>
                  <div
                    style={{ fontSize: '9.5pt', lineHeight: 1.35 }}
                    className="text-[#1e293b] mt-0.5 border-t border-[#93c5fd] pt-1"
                  >
                    <strong className="text-[#1e3a8a]">
                      Định nghĩa & Tổng quan:
                    </strong>{' '}
                    {resolvedRootSummary}
                  </div>
                </div>

                <div
                  className="grid items-start w-full"
                  style={{
                    gap: '6px',
                    gridTemplateColumns:
                      infographicColLayout === 'all_in_one_row'
                        ? `repeat(${Math.max(1, targetPillars.length)}, minmax(0, 1fr))`
                        : targetPillars.length >= 4
                        ? 'repeat(3, minmax(0, 1fr))'
                        : 'repeat(auto-fit, minmax(200px, 1fr))',
                  }}
                >
                  {targetPillars.map((pillar, pIdx) => {
                    const theme =
                      PRINT_COLUMN_THEMES[pIdx % PRINT_COLUMN_THEMES.length];
                    const lvl2Nodes = pillar.children || [];
                    const pillarNotes = getClinicalNoteSnippets(pillar);

                    return (
                      <div
                        key={pillar.id}
                        style={{ borderColor: theme.colBorder }}
                        className="border rounded-md bg-white overflow-hidden avoid-break"
                      >
                        <div
                          style={{
                            backgroundColor: theme.headerBg,
                            padding: '5px 8px',
                          }}
                          className="text-white"
                        >
                          <div
                            style={{ fontSize: '10.5pt', lineHeight: 1.3 }}
                            className="font-extrabold"
                          >
                            {pIdx + 1}. {cleanNodeLabel(pillar.label)}
                          </div>
                        </div>

                        {pillar.summary && lvl2Nodes.length === 0 && (
                          <div
                            style={{
                              backgroundColor: theme.subBg,
                              borderColor: theme.cardBorder,
                              color: theme.accentText,
                              padding: '4px 8px',
                              fontSize: '9pt',
                              lineHeight: 1.3,
                            }}
                            className="border-b font-medium"
                          >
                            {pillar.summary}
                          </div>
                        )}

                        <div
                          style={{ padding: '6px', gap: '6px' }}
                          className="flex flex-col bg-white"
                        >
                          {lvl2Nodes.map((lvl2, l2Idx) => {
                            const lvl3Nodes = lvl2.children || [];
                            const lvl2Notes = getClinicalNoteSnippets(lvl2);
                            return (
                              <div
                                key={lvl2.id}
                                style={{
                                  backgroundColor: theme.cardBg,
                                  borderColor: theme.cardBorder,
                                  padding: '6px 8px',
                                }}
                                className="border rounded-xs avoid-break"
                              >
                                <div
                                  style={{
                                    color: theme.accentText,
                                    borderColor: theme.cardBorder,
                                    fontSize: '10pt',
                                    lineHeight: 1.35,
                                  }}
                                  className="font-bold border-b pb-0.5 mb-1"
                                >
                                  <span className="font-mono mr-1">
                                    {pIdx + 1}.{l2Idx + 1}.
                                  </span>
                                  {renderPrintableKeywordText(lvl2.label)}
                                </div>

                                {lvl2.summary && lvl3Nodes.length === 0 && (
                                  <p
                                    style={{
                                      fontSize: '9pt',
                                      lineHeight: 1.35,
                                    }}
                                    className="text-neutral-800 mb-0.5"
                                  >
                                    {lvl2.summary}
                                  </p>
                                )}

                                {lvl3Nodes.length > 0 && (
                                  <ul
                                    style={{
                                      fontSize: '9.5pt',
                                      lineHeight: 1.35,
                                    }}
                                    className="space-y-0.5 text-[#111827]"
                                  >
                                    {lvl3Nodes.map((lvl3, l3Idx) => (
                                      <li key={lvl3.id}>
                                        <span
                                          style={{ color: theme.headerBg }}
                                          className="font-mono font-bold mr-1"
                                        >
                                          {l3Idx + 1})
                                        </span>
                                        {renderPrintableKeywordText(lvl3.label)}
                                        {lvl3.summary && (
                                          <span className="text-neutral-700">
                                            {' '}
                                            — {lvl3.summary}
                                          </span>
                                        )}
                                        {lvl3.children &&
                                          lvl3.children.length > 0 && (
                                            <ul className="pl-2.5 mt-0.5 space-y-0.5 text-[9pt] text-neutral-800">
                                              {lvl3.children.map((lvl4) => (
                                                <li key={lvl4.id}>
                                                  •{' '}
                                                  {renderPrintableKeywordText(
                                                    lvl4.label
                                                  )}
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                {lvl2Notes.length > 0 && (
                                  <div
                                    style={{
                                      borderColor: theme.cardBorder,
                                      fontSize: '8.5pt',
                                      lineHeight: 1.3,
                                    }}
                                    className="mt-1 pt-0.5 border-t border-dashed font-medium text-[#111827]"
                                  >
                                    {lvl2Notes.map((n, nIdx) => (
                                      <div key={nIdx}>★ {n}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {pillarNotes.length > 0 && (
                            <div
                              style={{
                                backgroundColor: theme.subBg,
                                borderColor: theme.cardBorder,
                                padding: '4px 8px',
                                fontSize: '8.5pt',
                                lineHeight: 1.3,
                              }}
                              className="border rounded-xs text-[#111827]"
                            >
                              {pillarNotes.map((n, idx) => (
                                <div key={idx} className="font-semibold">
                                  ★ {n}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* TEMPLATE 3: 🌳 3. SƠ ĐỒ CÂY NGANG (HIGH-DENSITY 24% / 76% A4)     */}
            {/* ================================================================= */}
            {template === 'horizontal_tree' && (
              <div className="bg-white text-[#111827] w-full">
                {/* Prominent Level 0 Lesson Header Bar + Summary Definition Box at Top of Every Lesson */}
                <div
                  style={{ padding: '6px 10px', marginBottom: '6px' }}
                  className="border-2 border-[#1e3a8a] bg-[#eff6ff] rounded-md w-full avoid-break"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-[#93c5fd] pb-1 mb-1">
                    <h1
                      style={{ fontSize: '11.5pt', lineHeight: 1.3 }}
                      className="font-extrabold uppercase text-[#1e3a8a]"
                    >
                      {lessonHeaderPrefix}
                    </h1>
                    <span className="text-[8.5pt] font-mono font-bold uppercase text-[#1d4ed8] shrink-0">
                      {sysName} › {subName} · {targetPillars.length} nhánh lớn
                    </span>
                  </div>
                  <div
                    style={{ fontSize: '9.5pt', lineHeight: 1.35 }}
                    className="text-[#111827]"
                  >
                    <strong className="text-[#1e3a8a] font-bold">
                      Định nghĩa & Trọng tâm bài học (Cấp 0):
                    </strong>{' '}
                    <span>{resolvedRootSummary}</span>
                  </div>
                </div>

                {/* 100% Width Horizontal Tree: Left Level 1 (24%) | Right Level 2 & 3 (76%) */}
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                  className="w-full border-l-[2.5px] border-[#1e3a8a] pl-2.5"
                >
                  {targetPillars.map((pillar, pIdx) => {
                    const theme =
                      PRINT_COLUMN_THEMES[pIdx % PRINT_COLUMN_THEMES.length];
                    const lvl2Nodes = pillar.children || [];

                    return (
                      <div
                        key={pillar.id}
                        style={{ gap: '8px' }}
                        className="relative flex items-start w-full"
                      >
                        {/* Horizontal branch connector from left spine */}
                        <div
                          style={{ backgroundColor: theme.colBorder }}
                          className="absolute -left-2.5 top-3.5 w-2.5 h-[2px]"
                        />

                        {/* Left Column: Level 1 Node Box (24% width) */}
                        <div
                          style={{
                            width: '24%',
                            padding: '6px 10px',
                            borderColor: theme.colBorder,
                            backgroundColor: theme.subBg,
                            lineHeight: 1.35,
                          }}
                          className="shrink-0 border-2 rounded-md hd-box"
                        >
                          <div
                            style={{
                              color: theme.accentText,
                              fontSize: '10.5pt',
                              lineHeight: 1.35,
                            }}
                            className="font-extrabold hd-title"
                          >
                            <span className="font-mono mr-1">{pIdx + 1}.</span>
                            {cleanNodeLabel(pillar.label)}
                          </div>
                          {pillar.summary && lvl2Nodes.length === 0 && (
                            <p
                              style={{
                                fontSize: '9.5pt',
                                lineHeight: 1.35,
                              }}
                              className="text-neutral-800 mt-0.5 hd-bullet"
                            >
                              {pillar.summary}
                            </p>
                          )}
                        </div>

                        {/* Right Column: Level 2 & Level 3 Branches (76% width) */}
                        <div
                          style={{
                            width: '76%',
                            borderColor: theme.colBorder,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '5px',
                          }}
                          className="flex-1 border-l-2 pl-2.5"
                        >
                          {lvl2Nodes.length > 0 ? (
                            lvl2Nodes.map((lvl2, l2Idx) => {
                              const lvl3Nodes = lvl2.children || [];
                              return (
                                <div
                                  key={lvl2.id}
                                  style={{
                                    backgroundColor: theme.cardBg,
                                    borderColor: theme.cardBorder,
                                    padding: '5px 9px',
                                    lineHeight: 1.35,
                                  }}
                                  className="relative border rounded-md avoid-break hd-box"
                                >
                                  <span
                                    style={{ backgroundColor: theme.colBorder }}
                                    className="absolute -left-2.5 top-3 w-2.5 h-[1.5px]"
                                  />
                                  <div
                                    style={{
                                      color: theme.accentText,
                                      fontSize: '10.2pt',
                                      lineHeight: 1.35,
                                    }}
                                    className="font-bold hd-title"
                                  >
                                    <span className="font-mono mr-1">
                                      {pIdx + 1}.{l2Idx + 1}.
                                    </span>
                                    {renderPrintableKeywordText(lvl2.label)}
                                    {lvl2.summary && lvl3Nodes.length === 0 && (
                                      <span
                                        style={{ fontSize: '9.2pt' }}
                                        className="font-normal text-neutral-800"
                                      >
                                        {' '}
                                        — {lvl2.summary}
                                      </span>
                                    )}
                                  </div>

                                  {lvl3Nodes.length > 0 && (
                                    <div
                                      style={{
                                        fontSize: '9.3pt',
                                        lineHeight: 1.38,
                                      }}
                                      className="mt-1 pl-2.5 border-l border-neutral-300 space-y-0.5 text-[#111827] hd-bullet"
                                    >
                                      {lvl3Nodes.map((lvl3) => (
                                        <div
                                          key={lvl3.id}
                                          style={{ lineHeight: 1.38 }}
                                        >
                                          •{' '}
                                          {renderPrintableKeywordText(
                                            lvl3.label
                                          )}
                                          {lvl3.summary && (
                                            <span className="text-neutral-700">
                                              {' '}
                                              ({lvl3.summary})
                                            </span>
                                          )}
                                          {lvl3.children &&
                                            lvl3.children.length > 0 && (
                                              <div className="pl-3 mt-0.5 space-y-0.5 text-[8.8pt] text-neutral-800">
                                                {lvl3.children.map((lvl4) => (
                                                  <div key={lvl4.id}>
                                                    –{' '}
                                                    {renderPrintableKeywordText(
                                                      lvl4.label
                                                    )}
                                                  </div>
                                                ))}
                                              </div>
                                            )}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div
                              style={{
                                backgroundColor: theme.cardBg,
                                borderColor: theme.cardBorder,
                                padding: '6px 10px',
                                fontSize: '9.5pt',
                                lineHeight: 1.35,
                              }}
                              className="border rounded-md text-neutral-800"
                            >
                              {pillar.summary || cleanNodeLabel(pillar.label)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* TEMPLATE 4: 📝 4. VỞ GẠCH Ý CORNELL (HIGH-DENSITY CORNELL A4)     */}
            {/* ================================================================= */}
            {template === 'cornell_note' && (
              <div className="bg-white text-[#111827] border-2 border-black">
                {/* Cornell Top Header */}
                <div
                  style={{ padding: '6px 10px' }}
                  className="border-b-2 border-black bg-[#eff6ff] flex items-start justify-between gap-3"
                >
                  <div className="min-w-0 flex-1">
                    <div className="text-[8.5pt] font-bold uppercase text-[#1d4ed8]">
                      VỞ GHI CHÉP Y KHOA CORNELL · {sysName} › {subName}
                    </div>
                    <h1
                      style={{ fontSize: '11.5pt', lineHeight: 1.3 }}
                      className="font-extrabold uppercase text-[#1e3a8a] mt-0.5"
                    >
                      {lessonHeaderPrefix}
                    </h1>
                    <div
                      style={{ fontSize: '9.5pt', lineHeight: 1.35 }}
                      className="text-[#111827] mt-0.5"
                    >
                      <strong className="text-[#1e3a8a]">
                        Định nghĩa & Trọng tâm:
                      </strong>{' '}
                      {resolvedRootSummary}
                    </div>
                  </div>
                  <div className="text-right text-[8.5pt] font-mono shrink-0">
                    <div>Ngày ôn: ..../..../202..</div>
                    <div className="mt-0.5">[ ] Lần 1 &nbsp; [ ] Lần 2</div>
                  </div>
                </div>

                {/* Cornell 2-Column Body: 23% Left Cues | 77% Right Detailed Notes */}
                <div className="divide-y divide-black">
                  <div className="flex bg-neutral-200 font-extrabold text-[9pt] uppercase text-black">
                    <div
                      style={{ width: '23%', padding: '5px 8px' }}
                      className="border-r-2 border-black shrink-0"
                    >
                      MỤC LỚN & TRỌNG TÂM (23%)
                    </div>
                    <div
                      style={{ width: '77%', padding: '5px 10px' }}
                      className="flex-1"
                    >
                      GHI CHÉP PHÂN CẤP CHI TIẾT & TỪ KHÓA ĂN ĐIỂM (77%)
                    </div>
                  </div>

                  {targetPillars.map((pillar, pIdx) => {
                    const theme =
                      PRINT_COLUMN_THEMES[pIdx % PRINT_COLUMN_THEMES.length];
                    const lvl2Nodes = pillar.children || [];
                    const pillarNotes = getClinicalNoteSnippets(pillar);

                    return (
                      <div
                        key={pillar.id}
                        className="flex bg-white"
                      >
                        {/* Left Column (23%) */}
                        <div
                          style={{ width: '23%', padding: '7px 9px' }}
                          className="shrink-0 border-r-2 border-black bg-neutral-50/80"
                        >
                          <div
                            style={{
                              backgroundColor: theme.subBg,
                              borderColor: theme.colBorder,
                              color: theme.accentText,
                            }}
                            className="inline-block px-1.5 py-0.5 rounded-xs border font-mono font-extrabold text-[8pt] uppercase"
                          >
                            MỤC LỚN {pIdx + 1}
                          </div>
                          <h3
                            style={{ fontSize: '10.2pt', lineHeight: 1.35 }}
                            className="font-extrabold text-black mt-1"
                          >
                            {cleanNodeLabel(pillar.label)}
                          </h3>

                          {pillar.summary && lvl2Nodes.length === 0 && (
                            <div
                              style={{
                                fontSize: '8.8pt',
                                lineHeight: 1.35,
                                padding: '4px 6px',
                              }}
                              className="mt-1 rounded border border-neutral-300 bg-white text-neutral-800"
                            >
                              <strong className="text-black">Trọng tâm:</strong>{' '}
                              {pillar.summary}
                            </div>
                          )}

                          {pillarNotes.length > 0 && (
                            <div className="mt-1.5 space-y-1 text-[8.3pt] text-neutral-900">
                              {pillarNotes.map((n, idx) => (
                                <div
                                  key={idx}
                                  className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300"
                                >
                                  ★ {n}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {/* Right Column (77%) */}
                        <div
                          style={{
                            width: '77%',
                            padding: '6px 10px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '6px',
                          }}
                          className="flex-1 bg-white"
                        >
                          {lvl2Nodes.map((lvl2, l2Idx) => {
                            const lvl3Nodes = lvl2.children || [];
                            const lvl2Notes = getClinicalNoteSnippets(lvl2);
                            return (
                              <div
                                key={lvl2.id}
                                style={{
                                  borderColor: theme.cardBorder,
                                  backgroundColor: '#ffffff',
                                }}
                                className="avoid-break pb-1.5 border-b border-dashed last:border-b-0 last:pb-0"
                              >
                                <div
                                  style={{
                                    fontSize: '10pt',
                                    lineHeight: 1.35,
                                    borderLeftColor: theme.headerBg,
                                    backgroundColor: theme.cardBg,
                                  }}
                                  className="font-bold text-black px-2 py-1 rounded-r-xs border-l-3 flex items-baseline gap-1.5"
                                >
                                  <span
                                    style={{ color: theme.headerBg }}
                                    className="font-mono font-extrabold shrink-0"
                                  >
                                    {pIdx + 1}.{l2Idx + 1}.
                                  </span>
                                  <span className="text-[#111827]">
                                    {renderPrintableKeywordText(lvl2.label)}
                                  </span>
                                  {lvl2.summary && lvl3Nodes.length === 0 && (
                                    <span
                                      style={{ fontSize: '9.2pt' }}
                                      className="font-normal text-neutral-700"
                                    >
                                      — {lvl2.summary}
                                    </span>
                                  )}
                                </div>

                                {lvl3Nodes.length > 0 && (
                                  <ul
                                    style={{
                                      fontSize: '9.4pt',
                                      lineHeight: 1.4,
                                    }}
                                    className="pl-3.5 mt-1 space-y-1 text-[#111827]"
                                  >
                                    {lvl3Nodes.map((lvl3) => (
                                      <li key={lvl3.id}>
                                        <span
                                          style={{ color: theme.headerBg }}
                                          className="font-bold mr-1"
                                        >
                                          •
                                        </span>
                                        {renderPrintableKeywordText(lvl3.label)}
                                        {lvl3.summary && (
                                          <span className="text-neutral-700">
                                            {' '}
                                            — {lvl3.summary}
                                          </span>
                                        )}
                                        {lvl3.children &&
                                          lvl3.children.length > 0 && (
                                            <ul className="pl-3.5 mt-0.5 space-y-0.5 text-[9pt] text-neutral-800 border-l border-neutral-300">
                                              {lvl3.children.map((lvl4) => (
                                                <li key={lvl4.id}>
                                                  –{' '}
                                                  {renderPrintableKeywordText(
                                                    lvl4.label
                                                  )}
                                                </li>
                                              ))}
                                            </ul>
                                          )}
                                      </li>
                                    ))}
                                  </ul>
                                )}

                                {lvl2Notes.length > 0 && (
                                  <div className="pl-3.5 mt-1 space-y-0.5 text-[8.8pt] font-medium text-neutral-900">
                                    {lvl2Notes.map((n, idx) => (
                                      <div key={idx}>★ {n}</div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* TEMPLATE 5: 🐟 5. SƠ ĐỒ XƯƠNG CÁ / LƯU ĐỒ (HIGH-DENSITY A4)       */}
            {/* ================================================================= */}
            {template === 'fishbone_flowchart' && (
              <div className="bg-white text-[#111827]">
                <div
                  style={{ padding: '6px 10px', marginBottom: '6px' }}
                  className="border-2 border-[#1e3a8a] bg-[#eff6ff] rounded-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h2
                      style={{ fontSize: '11.5pt', lineHeight: 1.3 }}
                      className="font-extrabold uppercase text-[#1e3a8a]"
                    >
                      {lessonHeaderPrefix}
                    </h2>
                    <span className="text-[8.5pt] font-mono font-bold text-[#1d4ed8]">
                      {sysName} › {subName} · {targetPillars.length} nhánh chính
                    </span>
                  </div>
                  <div
                    style={{ fontSize: '9.5pt', lineHeight: 1.35 }}
                    className="text-[#111827] mt-0.5 border-t border-[#93c5fd] pt-0.5"
                  >
                    <strong className="text-[#1e3a8a]">
                      Định nghĩa & Trọng tâm:
                    </strong>{' '}
                    {resolvedRootSummary}
                  </div>
                </div>

                {fishboneOrFlowchart === 'fishbone' ? (
                  (() => {
                    const topRibs = targetPillars.filter(
                      (_, idx) => idx % 2 === 0
                    );
                    const bottomRibs = targetPillars.filter(
                      (_, idx) => idx % 2 === 1
                    );

                    const renderWhiteRibCard = (
                      pillar: MindmapNode,
                      pIndex: number,
                      isTop: boolean
                    ) => {
                      const theme =
                        PRINT_COLUMN_THEMES[
                          (pIndex - 1) % PRINT_COLUMN_THEMES.length
                        ];
                      const lvl2Nodes = pillar.children || [];

                      const headerBox = (
                        <div
                          style={{
                            backgroundColor: theme.headerBg,
                            borderColor: theme.colBorder,
                            padding: '4px 8px',
                            fontSize: '10.5pt',
                            lineHeight: 1.3,
                          }}
                          className="rounded text-white font-bold w-full"
                        >
                          <span className="font-mono mr-1">{pIndex}.</span>
                          {cleanNodeLabel(pillar.label)}
                        </div>
                      );

                      const subBonesList = (
                        <div
                          style={{ borderColor: theme.colBorder, gap: '4px' }}
                          className="w-full border-l-2 ml-2 pl-2 flex flex-col py-0.5"
                        >
                          {lvl2Nodes.map((lvl2, l2Idx) => (
                            <div
                              key={lvl2.id}
                              style={{
                                backgroundColor: theme.cardBg,
                                borderColor: theme.cardBorder,
                                padding: '4px 8px',
                                fontSize: '9.5pt',
                                lineHeight: 1.35,
                              }}
                              className="border rounded avoid-break"
                            >
                              <div
                                style={{
                                  color: theme.accentText,
                                  fontSize: '10pt',
                                }}
                                className="font-bold"
                              >
                                {pIndex}.{l2Idx + 1}.{' '}
                                {renderPrintableKeywordText(lvl2.label)}
                              </div>
                              {lvl2.children && lvl2.children.length > 0 && (
                                <ul className="pl-2 mt-0.5 space-y-0.5 text-[9pt] text-neutral-900">
                                  {lvl2.children.map((lvl3) => (
                                    <li key={lvl3.id}>
                                      • {renderPrintableKeywordText(lvl3.label)}
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          ))}
                        </div>
                      );

                      return (
                        <div
                          key={pillar.id}
                          className="flex flex-col items-start justify-end avoid-break"
                        >
                          {isTop ? (
                            <>
                              {subBonesList}
                              <div className="mt-1 w-full">{headerBox}</div>
                              <div
                                style={{ backgroundColor: theme.colBorder }}
                                className="w-[2.5px] h-2.5 ml-4 -skew-x-20"
                              />
                            </>
                          ) : (
                            <>
                              <div
                                style={{ backgroundColor: theme.colBorder }}
                                className="w-[2.5px] h-2.5 ml-4 skew-x-20"
                              />
                              <div className="mb-1 w-full">{headerBox}</div>
                              {subBonesList}
                            </>
                          )}
                        </div>
                      );
                    };

                    return (
                      <div className="w-full">
                        <div
                          className="grid gap-2 items-end"
                          style={{
                            gridTemplateColumns: `repeat(${Math.max(
                              1,
                              topRibs.length
                            )}, minmax(0, 1fr))`,
                          }}
                        >
                          {topRibs.map((rib, i) =>
                            renderWhiteRibCard(rib, i * 2 + 1, true)
                          )}
                        </div>

                        <div className="relative h-[4px] bg-[#1e3a8a] w-full flex items-center my-0.5">
                          <div className="w-2.5 h-2.5 rounded-full bg-[#1e3a8a]" />
                        </div>

                        <div
                          className="grid gap-2 items-start"
                          style={{
                            gridTemplateColumns: `repeat(${Math.max(
                              1,
                              bottomRibs.length
                            )}, minmax(0, 1fr))`,
                          }}
                        >
                          {bottomRibs.map((rib, i) =>
                            renderWhiteRibCard(rib, i * 2 + 2, false)
                          )}
                        </div>
                      </div>
                    );
                  })()
                ) : (
                  <div
                    className="grid gap-2 items-start w-full"
                    style={{
                      gridTemplateColumns:
                        targetPillars.length >= 4
                          ? 'repeat(3, minmax(0, 1fr))'
                          : `repeat(${Math.max(1, targetPillars.length)}, minmax(0, 1fr))`,
                    }}
                  >
                    {targetPillars.map((pillar, pIdx) => {
                      const theme =
                        PRINT_COLUMN_THEMES[pIdx % PRINT_COLUMN_THEMES.length];
                      const lvl2Nodes = pillar.children || [];
                      return (
                        <div
                          key={pillar.id}
                          className="flex flex-col items-center avoid-break"
                        >
                          <div
                            style={{
                              backgroundColor: theme.headerBg,
                              padding: '5px 8px',
                              fontSize: '10.5pt',
                            }}
                            className="w-full text-white rounded font-extrabold text-center"
                          >
                            {pIdx + 1}. {cleanNodeLabel(pillar.label)}
                          </div>

                          {lvl2Nodes.map((lvl2, l2Idx) => (
                            <React.Fragment key={lvl2.id}>
                              <div className="flex flex-col items-center my-0.5">
                                <div
                                  style={{ backgroundColor: theme.colBorder }}
                                  className="w-[2px] h-1.5"
                                />
                                <div
                                  style={{ borderTopColor: theme.colBorder }}
                                  className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-t-[4px]"
                                />
                              </div>
                              <div
                                style={{
                                  backgroundColor: theme.cardBg,
                                  borderColor: theme.colBorder,
                                  padding: '5px 8px',
                                  lineHeight: 1.35,
                                }}
                                className="w-full border rounded text-left"
                              >
                                <div
                                  style={{
                                    color: theme.accentText,
                                    fontSize: '10pt',
                                  }}
                                  className="font-bold border-b border-black/15 pb-0.5 mb-0.5"
                                >
                                  {pIdx + 1}.{l2Idx + 1}.{' '}
                                  {renderPrintableKeywordText(lvl2.label)}
                                </div>
                                {lvl2.children && lvl2.children.length > 0 && (
                                  <ul
                                    style={{
                                      fontSize: '9.5pt',
                                      lineHeight: 1.35,
                                    }}
                                    className="space-y-0.5 text-[#111827]"
                                  >
                                    {lvl2.children.map((lvl3, l3Idx) => (
                                      <li key={lvl3.id}>
                                        <strong>{l3Idx + 1})</strong>{' '}
                                        {renderPrintableKeywordText(lvl3.label)}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </React.Fragment>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ================================================================= */}
            {/* TEMPLATE 6: ✍️ 6. ĐỀ KHUYẾT CHỮ (HIGH-DENSITY WORKSHEET A4)       */}
            {/* ================================================================= */}
            {template === 'blank_worksheet' && (
              <div className="bg-white text-[#111827]">
                <div
                  style={{ padding: '6px 10px', marginBottom: '6px' }}
                  className="border-2 border-black bg-white"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[8.5pt] font-bold uppercase text-neutral-700">
                        PHIẾU LUYỆN VIẾT TỰ LUẬN Y KHOA THEO BAREM · {sysName} ›{' '}
                        {subName}
                      </div>
                      <h1
                        style={{ fontSize: '11.5pt', lineHeight: 1.3 }}
                        className="font-extrabold uppercase text-black mt-0.5"
                      >
                        {lessonHeaderPrefix}
                      </h1>
                    </div>
                    <div
                      style={{ padding: '3px 8px' }}
                      className="border border-black text-center shrink-0 bg-neutral-50"
                    >
                      <div className="text-[8pt] font-bold uppercase">
                        ĐIỂM TỰ CHẤM
                      </div>
                      <div className="text-[11pt] font-mono font-bold">
                        ..... / {totalPointsScale.toFixed(1)}đ
                      </div>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {targetPillars.map((pillar, pIdx) => {
                    const pillarCriteria = rubricCriteria.filter(
                      (c) => c.pillarIndex === pIdx + 1
                    );
                    const pillarPoints = pillarCriteria.reduce(
                      (acc, c) => acc + c.allocatedPoints,
                      0
                    );

                    return (
                      <div
                        key={pillar.id}
                        style={{ padding: '6px 10px' }}
                        className="border border-black avoid-break bg-white"
                      >
                        <div className="flex items-center justify-between gap-2 border-b border-black pb-1 mb-1.5">
                          <h2
                            style={{ fontSize: '11pt', lineHeight: 1.3 }}
                            className="font-extrabold uppercase text-black"
                          >
                            CÂU / MỤC LỚN {pIdx + 1}:{' '}
                            {cleanNodeLabel(pillar.label)}
                          </h2>
                          {worksheetShowKeywordCount && (
                            <span className="font-mono text-[9pt] font-bold border border-black px-1.5 py-0.2">
                              [ ..... / {pillarPoints.toFixed(2)}đ ]
                            </span>
                          )}
                        </div>

                        {worksheetShowLevel2 &&
                        pillar.children &&
                        pillar.children.length > 0 ? (
                          <div className="space-y-2">
                            {pillar.children.map((lvl2, l2Idx) => {
                              const matchedCrit = rubricCriteria.find(
                                (c) => c.nodeId === lvl2.id
                              );
                              return (
                                <div key={lvl2.id} className="avoid-break">
                                  <div className="flex items-center justify-between gap-2 mb-0.5">
                                    <div
                                      style={{
                                        fontSize: '10pt',
                                        lineHeight: 1.35,
                                      }}
                                      className="font-bold text-black"
                                    >
                                      {pIdx + 1}.{l2Idx + 1}.{' '}
                                      {cleanNodeLabel(lvl2.label)}:
                                    </div>
                                    {worksheetShowKeywordCount &&
                                      matchedCrit && (
                                        <div className="text-[8.5pt] font-mono text-neutral-700">
                                          ({matchedCrit.requiredKeywords.length}{' '}
                                          từ khóa ·{' '}
                                          {matchedCrit.allocatedPoints.toFixed(
                                            2
                                          )}
                                          đ)
                                        </div>
                                      )}
                                  </div>

                                  <div className="space-y-2 pt-0.5">
                                    {Array.from({
                                      length: worksheetLinesPerItem,
                                    }).map((_, lineIdx) => (
                                      <div
                                        key={lineIdx}
                                        className="border-b border-dotted border-neutral-600 h-4 w-full"
                                      />
                                    ))}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="space-y-2 pt-0.5">
                            {Array.from({
                              length: worksheetLinesPerItem * 2,
                            }).map((_, lineIdx) => (
                              <div
                                key={lineIdx}
                                className="border-b border-dotted border-neutral-600 h-4 w-full"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* TEMPLATE 7: 🗂️ 7. FLASHCARDS CẮT RỜI (2 MẶT HỎI - ĐÁP ACTIVE RECALL) */}
            {/* ================================================================= */}
            {template === 'flashcard_sheet' && (
              <div className="bg-white text-[#111827]">
                <div
                  style={{ padding: '6px 10px', marginBottom: '8px' }}
                  className="border-2 border-[#1e3a8a] bg-[#eff6ff] rounded-md flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-[8.5pt] font-bold uppercase text-[#1d4ed8]">
                      BỘ THẺ FLASHCARDS ACTIVE RECALL (GẬP ĐÔI HOẶC CẮT RỜI) ·{' '}
                      {sysName} › {subName}
                    </div>
                    <h1
                      style={{ fontSize: '11.5pt', lineHeight: 1.3 }}
                      className="font-extrabold uppercase text-[#1e3a8a]"
                    >
                      {lessonHeaderPrefix} ({rubricCriteria.length} thẻ câu hỏi)
                    </h1>
                  </div>
                  <div className="text-right font-mono text-[8pt] text-neutral-700 shrink-0">
                    <div>✂️ Cắt theo viền ngang · Gập đôi theo trục dọc</div>
                    <div className="font-bold text-[#1e3a8a]">
                      Trái: Câu hỏi gợi nhớ | Phải: Đáp án Barem
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {rubricCriteria.map((item, cIdx) => {
                    const theme =
                      PRINT_COLUMN_THEMES[
                        (item.pillarIndex - 1) % PRINT_COLUMN_THEMES.length
                      ];
                    return (
                      <div
                        key={item.id}
                        className="border-2 border-dashed border-neutral-800 rounded-md bg-white avoid-break grid grid-cols-2 overflow-hidden"
                      >
                        {/* LEFT HALF: FRONT OF FLASHCARD (ACTIVE RECALL PROMPT) */}
                        <div
                          style={{ padding: '8px 10px' }}
                          className="border-r-2 border-dotted border-neutral-700 bg-neutral-50/60 flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1.5 mb-1">
                              <span
                                style={{ backgroundColor: theme.headerBg }}
                                className="px-1.5 py-0.2 rounded-xs text-[8pt] font-mono font-bold text-white uppercase"
                              >
                                THẺ #{String(cIdx + 1).padStart(2, '0')} · MỤC{' '}
                                {item.code}
                              </span>
                              <span className="text-[8pt] font-mono font-bold text-neutral-700">
                                Điểm Barem: {item.allocatedPoints.toFixed(2)}đ
                              </span>
                            </div>

                            <div className="text-[8.5pt] font-bold uppercase text-neutral-600">
                              Chủ đề lớn {item.pillarIndex}: {item.pillarLabel}
                            </div>

                            <div
                              style={{ fontSize: '10.5pt', lineHeight: 1.35 }}
                              className="font-extrabold text-[#1e3a8a] mt-1"
                            >
                              ❓ CÂU HỎI: Trình bày đầy đủ nội dung & từ khóa ăn điểm của mục "{cleanNodeLabel(item.standardContent.split('—')[0])}"?
                            </div>

                            {flashcardShowHints && (
                              <div className="mt-1.5 p-1.5 rounded bg-white border border-neutral-300 text-[8.5pt] text-neutral-700 font-mono">
                                💡 <strong>Gợi ý cấu trúc:</strong> Cần nêu được{' '}
                                <strong>{item.requiredKeywords.length} từ khóa</strong>{' '}
                                trọng tâm
                                {item.subPoints.length > 0
                                  ? ` và ${item.subPoints.length} ý chi tiết`
                                  : ''}
                                . (Chữ cái đầu:{' '}
                                {item.requiredKeywords
                                  .slice(0, 4)
                                  .map((k) => `${k.slice(0, 2)}...`)
                                  .join(', ')}
                                )
                              </div>
                            )}
                          </div>

                          <div className="mt-2 pt-1 border-t border-neutral-300 flex items-center justify-between text-[7.8pt] font-mono text-neutral-700">
                            <span>Tự đánh giá:</span>
                            <span>
                              [ ] Quên &nbsp; [ ] Nhớ mang máng &nbsp; [ ] Thuộc kỹ
                            </span>
                          </div>
                        </div>

                        {/* RIGHT HALF: BACK OF FLASHCARD (STANDARD BAREM ANSWER) */}
                        <div
                          style={{ padding: '8px 10px' }}
                          className="bg-white flex flex-col justify-between"
                        >
                          <div>
                            <div className="flex items-center justify-between gap-1.5 mb-1 border-b border-neutral-200 pb-0.5">
                              <span className="text-[8pt] font-mono font-extrabold uppercase text-[#15803d]">
                                ✅ ĐÁP ÁN CHUẨN BAREM ({item.code})
                              </span>
                              <span className="text-[7.5pt] font-mono text-neutral-500">
                                ✂️ Gập đôi tại trục giữa
                              </span>
                            </div>

                            <div
                              style={{ fontSize: '9.8pt', lineHeight: 1.35 }}
                              className="font-bold text-black"
                            >
                              {renderPrintableKeywordText(
                                item.standardContent,
                                theme.highlightBg
                              )}
                            </div>

                            {item.subPoints.length > 0 && (
                              <ul
                                style={{ fontSize: '9pt', lineHeight: 1.32 }}
                                className="mt-1 pl-3 space-y-0.5 text-neutral-900"
                              >
                                {item.subPoints.map((sp, spIdx) => (
                                  <li key={spIdx}>
                                    •{' '}
                                    {renderPrintableKeywordText(
                                      sp,
                                      theme.highlightBg
                                    )}
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>

                          {item.requiredKeywords.length > 0 && (
                            <div className="mt-1.5 pt-1 border-t border-dashed border-neutral-300 flex flex-wrap items-center gap-1">
                              <span className="text-[7.8pt] font-mono font-bold text-neutral-700">
                                🔑 Từ khóa:
                              </span>
                              {item.requiredKeywords.map((kw, kIdx) => (
                                <span
                                  key={kIdx}
                                  className="px-1 py-0.1 border border-neutral-700 rounded-xs text-[7.8pt] font-bold bg-amber-50 text-black"
                                >
                                  {kw}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* TEMPLATE 8: ⚡ 8. TỜ TÓM TẮT 1 TRANG (POCKET CHEAT SHEET SIÊU GỌN) */}
            {/* ================================================================= */}
            {template === 'pocket_cheatsheet' && (
              <div className="bg-white text-[#111827]">
                <div
                  style={{ padding: '5px 10px', marginBottom: '6px' }}
                  className="border-2 border-black bg-[#1e3a8a] text-white rounded-xs flex items-center justify-between gap-3"
                >
                  <div>
                    <div className="text-[8pt] font-mono font-bold uppercase text-[#93c5fd]">
                      ⚡ TỜ HỆ THỐNG HÓA ÔN CẤP TỐC 15 PHÚT TRƯỚC GIỜ THI (POCKET CHEAT SHEET) ·{' '}
                      {sysName} › {subName}
                    </div>
                    <h1
                      style={{ fontSize: '11.5pt', lineHeight: 1.25 }}
                      className="font-extrabold uppercase text-white"
                    >
                      {lessonHeaderPrefix}
                    </h1>
                  </div>
                  <div className="text-right font-mono text-[8pt] bg-white text-black px-2 py-1 rounded-xs shrink-0">
                    <div className="font-extrabold">
                      {targetPillars.length} MỤC · {rubricCriteria.length} Ý BAREM
                    </div>
                    <div>Thang điểm: {totalPointsScale.toFixed(1)}đ</div>
                  </div>
                </div>

                {/* Core Level 0 Definition Strip */}
                <div
                  style={{ padding: '4px 8px', fontSize: '9pt', lineHeight: 1.3 }}
                  className="mb-1.5 border border-black bg-[#eff6ff] text-black rounded-xs"
                >
                  <strong className="uppercase text-[#1e3a8a]">
                    🎯 Định nghĩa & Trọng tâm Cấp 0:
                  </strong>{' '}
                  {resolvedRootSummary}
                </div>

                {/* High-Density 3-Column Pocket Newspaper Grid */}
                <div
                  style={{
                    columnCount: targetPillars.length >= 3 ? 3 : 2,
                    columnGap: '8px',
                  }}
                  className="w-full"
                >
                  {targetPillars.map((pillar, pIdx) => {
                    const theme =
                      PRINT_COLUMN_THEMES[pIdx % PRINT_COLUMN_THEMES.length];
                    const lvl2Nodes = pillar.children || [];
                    const pillarNotes = getClinicalNoteSnippets(pillar);

                    return (
                      <div
                        key={pillar.id}
                        style={{
                          breakInside: 'avoid',
                          marginBottom: '6px',
                          borderColor: theme.colBorder,
                        }}
                        className="border-2 rounded-xs bg-white overflow-hidden avoid-break"
                      >
                        <div
                          style={{
                            backgroundColor: theme.headerBg,
                            padding: '3px 7px',
                            fontSize: '9.5pt',
                          }}
                          className="text-white font-extrabold uppercase flex items-center justify-between"
                        >
                          <span>
                            {pIdx + 1}. {cleanNodeLabel(pillar.label)}
                          </span>
                          <span className="text-[7.5pt] font-mono opacity-90">
                            ({lvl2Nodes.length} ý)
                          </span>
                        </div>

                        <div
                          style={{ padding: '4px 6px', fontSize: '8.8pt', lineHeight: 1.28 }}
                          className="divide-y divide-neutral-200"
                        >
                          {lvl2Nodes.map((lvl2, l2Idx) => {
                            const lvl3Nodes = lvl2.children || [];
                            return (
                              <div key={lvl2.id} className="py-1 first:pt-0 last:pb-0">
                                <div
                                  style={{ color: theme.accentText }}
                                  className="font-bold"
                                >
                                  <span className="font-mono mr-0.5">
                                    {pIdx + 1}.{l2Idx + 1}.
                                  </span>{' '}
                                  {renderPrintableKeywordText(
                                    lvl2.label,
                                    theme.highlightBg
                                  )}
                                  {lvl2.summary && lvl3Nodes.length === 0 && (
                                    <span className="font-normal text-neutral-800">
                                      {' '}
                                      — {lvl2.summary}
                                    </span>
                                  )}
                                </div>
                                {lvl3Nodes.length > 0 && (
                                  <div className="pl-2 mt-0.5 space-y-0.5 text-[8.4pt] text-black">
                                    {lvl3Nodes.map((lvl3) => (
                                      <div key={lvl3.id}>
                                        •{' '}
                                        {renderPrintableKeywordText(
                                          lvl3.label,
                                          theme.highlightBg
                                        )}
                                        {lvl3.children &&
                                          lvl3.children.length > 0 && (
                                            <span className="text-neutral-700">
                                              {' '}
                                              (
                                              {lvl3.children
                                                .map((c) =>
                                                  cleanNodeLabel(c.label)
                                                )
                                                .join('; ')}
                                              )
                                            </span>
                                          )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })}

                          {pillarNotes.length > 0 && (
                            <div className="pt-1 mt-1 bg-amber-50/80 px-1.5 py-0.5 text-[8pt] font-semibold text-black">
                              {pillarNotes.map((n, idx) => (
                                <div key={idx}>★ {n}</div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ================================================================= */}
            {/* TEMPLATE 9: 🩺 9. BẢNG KIỂM LÂM SÀNG OSCE & HỎI BỆNH - BỆNH ÁN   */}
            {/* ================================================================= */}
            {template === 'clinical_osce_checklist' && (
              <div className="bg-white text-[#111827]">
                <div
                  style={{ padding: '6px 10px', marginBottom: '6px' }}
                  className="border-2 border-black bg-[#f0fdf4] rounded-xs"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-black pb-1.5 mb-1.5">
                    <div>
                      <div className="text-[8.5pt] font-mono font-bold uppercase text-[#15803d]">
                        🩺 PHIẾU BẢNG KIỂM ĐI BUỒNG LÂM SÀNG / THI CHẠY TRẠM OSCE & LÀM BỆNH ÁN
                      </div>
                      <h1
                        style={{ fontSize: '11.5pt', lineHeight: 1.3 }}
                        className="font-extrabold uppercase text-black mt-0.5"
                      >
                        {lessonHeaderPrefix}
                      </h1>
                    </div>
                    <div className="border border-black bg-white px-2.5 py-1 text-[8pt] font-mono shrink-0">
                      <div>Khoa/Bộ môn: <strong>{sysName} › {subName}</strong></div>
                      <div>Ngày khám: ..../..../202.. · Giường: ......</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-[8.5pt] font-mono text-black">
                    <div>Họ tên BN: ............................</div>
                    <div>Tuổi/Giới: ...........</div>
                    <div>Lý do vào viện: .......................</div>
                    <div>Ngày thứ của bệnh: ....................</div>
                  </div>
                </div>

                <table
                  style={{ fontSize: '9.2pt', lineHeight: 1.35 }}
                  className="w-full border border-black bg-white text-black"
                >
                  <thead>
                    <tr className="bg-neutral-200 border-b-2 border-black font-bold text-black">
                      <th
                        style={{ padding: '4px 6px' }}
                        className="border border-black w-[44px] text-center"
                      >
                        Bước
                      </th>
                      <th
                        style={{ padding: '4px 8px' }}
                        className="border border-black text-left w-[200px]"
                      >
                        Hạng Mục Hỏi Bệnh / Khám / Xử Trí
                      </th>
                      <th
                        style={{ padding: '4px 8px' }}
                        className="border border-black text-left"
                      >
                        Tiêu Chuẩn Lâm Sàng Chuẩn & Dấu Hiệu Cần Tìm
                      </th>
                      <th
                        style={{ padding: '4px 6px' }}
                        className="border border-black w-[68px] text-center"
                      >
                        Kiểm Tra
                      </th>
                      <th
                        style={{ padding: '4px 6px' }}
                        className="border border-black w-[135px] text-left"
                      >
                        Ghi Chú Thực Tế BN
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {rubricCriteria.map((item, idx) => {
                      const prevPillar =
                        idx > 0 ? rubricCriteria[idx - 1].pillarLabel : null;
                      const showBanner = item.pillarLabel !== prevPillar;
                      return (
                        <React.Fragment key={item.id}>
                          {showBanner && (
                            <tr className="bg-[#dcfce7] border-y border-black">
                              <td
                                colSpan={5}
                                style={{ padding: '4px 8px', fontSize: '10pt' }}
                                className="font-extrabold uppercase text-[#14532d]"
                              >
                                TRẠM / PHẦN {item.pillarIndex}: {item.pillarLabel}
                              </td>
                            </tr>
                          )}
                          <tr className="border-b border-black align-top avoid-break">
                            <td
                              style={{ padding: '5px 6px' }}
                              className="border border-black text-center font-mono font-bold"
                            >
                              {item.code}
                            </td>
                            <td
                              style={{ padding: '5px 8px' }}
                              className="border border-black font-bold text-[#1e3a8a]"
                            >
                              {cleanNodeLabel(
                                item.standardContent.split('—')[0]
                              )}
                              <div className="text-[8pt] font-mono font-normal text-neutral-600 mt-0.5">
                                Trọng số: {item.allocatedPoints.toFixed(2)}đ
                              </div>
                            </td>
                            <td
                              style={{ padding: '5px 8px' }}
                              className="border border-black"
                            >
                              {item.subPoints.length > 0 ? (
                                <ul className="space-y-0.5">
                                  {item.subPoints.map((sp, spIdx) => (
                                    <li key={spIdx}>
                                      • {renderPrintableKeywordText(sp, '#fef08a')}
                                    </li>
                                  ))}
                                </ul>
                              ) : (
                                <div>
                                  {renderPrintableKeywordText(
                                    item.standardContent,
                                    '#fef08a'
                                  )}
                                </div>
                              )}
                            </td>
                            <td
                              style={{ padding: '5px 6px' }}
                              className="border border-black text-left font-mono text-[8pt]"
                            >
                              <div>[ ] Có</div>
                              <div>[ ] Không</div>
                            </td>
                            <td
                              style={{ padding: '5px 6px' }}
                              className="border border-black font-mono text-[8pt] text-neutral-400"
                            >
                              <div className="border-b border-dotted border-neutral-400 h-4" />
                              <div className="border-b border-dotted border-neutral-400 h-4 mt-1" />
                            </td>
                          </tr>
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* ================================================================= */}
            {/* TEMPLATE 10: 🎯 10. ĐỀ THI THỬ TỰ LUẬN & ĐÁP ÁN BAREM CHÍNH THỨC */}
            {/* ================================================================= */}
            {template === 'exam_simulation_paper' && (
              <div className="bg-white text-[#111827]">
                {/* Official University Exam Header Box (Khung Phách Đề Thi) */}
                <div className="border-2 border-black p-3 mb-3 bg-white avoid-break">
                  <div className="grid grid-cols-12 gap-2 border-b-2 border-black pb-2 mb-2">
                    <div className="col-span-5 text-center border-r border-black pr-2">
                      <div className="text-[8.5pt] font-bold uppercase">
                        BỘ Y TẾ · TRƯỜNG ĐẠI HỌC Y DƯỢC
                      </div>
                      <div className="text-[9pt] font-extrabold uppercase text-[#1e3a8a]">
                        BỘ MÔN: {sysName} — {subName}
                      </div>
                      <div className="mt-1 inline-block px-2 py-0.5 border border-black font-mono font-bold text-[8pt]">
                        ĐỀ THI CHÍNH THỨC · MÃ ĐỀ: {String((lessonIndex + 1) * 101).padStart(3, '0')}
                      </div>
                    </div>

                    <div className="col-span-7 pl-2 text-center">
                      <div className="text-[11pt] font-extrabold uppercase text-black">
                        ĐỀ THI KẾT THÚC HỌC PHẦN / ÔN THI NỘI TRÚ TỰ LUẬN
                      </div>
                      <div className="text-[9pt] font-semibold text-neutral-800 mt-0.5">
                        Thời gian làm bài: <strong>{examDurationMinutes} phút</strong> (Không kể thời gian phát đề)
                      </div>
                      <div className="grid grid-cols-3 gap-2 mt-2 text-left text-[8.5pt] font-mono">
                        <div>Họ và tên: ...........................</div>
                        <div>Mã SV / SBD: ................</div>
                        <div>Lớp / Tổ: ...................</div>
                      </div>
                    </div>
                  </div>

                  {/* Score & Examiner Comment Box */}
                  <div className="grid grid-cols-12 border border-black bg-neutral-50 text-[8.5pt]">
                    <div className="col-span-3 border-r border-black p-2 text-center">
                      <div className="font-bold uppercase text-black">
                        ĐIỂM BÀI THI (Thang {totalPointsScale.toFixed(1)}đ)
                      </div>
                      <div className="mt-2 font-mono text-[10pt]">
                        Bằng số: .................
                      </div>
                      <div className="mt-1 font-mono text-[8.5pt]">
                        Bằng chữ: ................
                      </div>
                    </div>
                    <div className="col-span-9 p-2">
                      <div className="font-bold uppercase text-black">
                        NHẬN XÉT CỦA GIẢNG VIÊN CHẤM THI & CÁC TỪ KHÓA CÒN THIẾU:
                      </div>
                      <div className="border-b border-dotted border-neutral-500 h-4 mt-1.5" />
                      <div className="border-b border-dotted border-neutral-500 h-4 mt-1.5" />
                    </div>
                  </div>
                </div>

                {/* Exam Question Prompt Box */}
                <div className="border-2 border-[#1e3a8a] bg-[#eff6ff] p-3 mb-3 rounded-xs avoid-break">
                  <div className="text-[10.5pt] font-extrabold uppercase text-[#1e3a8a]">
                    CÂU HỎI TỰ LUẬN ({totalPointsScale.toFixed(2)} ĐIỂM): {resolvedLessonTitle}
                  </div>
                  <p className="text-[9.5pt] text-black mt-1">
                    Anh/chị hãy trình bày đầy đủ và hệ thống hóa nội dung chuyên đề{' '}
                    <strong>"{resolvedLessonTitle}"</strong> theo đúng cấu trúc Barem chấm thi gồm{' '}
                    <strong>{targetPillars.length} phần chính</strong> dưới đây:
                  </p>
                  <div className="mt-1.5 grid grid-cols-2 gap-x-4 gap-y-1 text-[9pt] font-semibold text-neutral-900">
                    {targetPillars.map((pillar, pIdx) => {
                      const pPts = rubricCriteria
                        .filter((c) => c.pillarIndex === pIdx + 1)
                        .reduce((s, c) => s + c.allocatedPoints, 0);
                      return (
                        <div key={pillar.id} className="flex items-baseline justify-between border-b border-dashed border-[#93c5fd] pb-0.5">
                          <span>
                            <strong>Câu {lessonIndex + 1}.{pIdx + 1}:</strong> Trình bày {cleanNodeLabel(pillar.label)}
                          </span>
                          <span className="font-mono font-bold text-[#1e3a8a] shrink-0 ml-2">
                            ({pPts.toFixed(2)} điểm)
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Lined Exam Answer Sheet Section */}
                <div className="border border-black p-3 bg-white mb-3">
                  <div className="text-center font-extrabold uppercase text-[10pt] border-b border-black pb-1 mb-2">
                    BÀI LÀM TỰ LUẬN CỦA THÍ SINH
                  </div>
                  <div className="space-y-3">
                    {targetPillars.map((pillar, pIdx) => {
                      const pPts = rubricCriteria
                        .filter((c) => c.pillarIndex === pIdx + 1)
                        .reduce((s, c) => s + c.allocatedPoints, 0);
                      return (
                        <div key={pillar.id} className="avoid-break">
                          <div className="flex items-center justify-between font-bold text-[9.5pt] bg-neutral-100 px-2 py-1 border-l-4 border-[#1e3a8a]">
                            <span>
                              Phần {pIdx + 1}. {cleanNodeLabel(pillar.label)}:
                            </span>
                            <span className="font-mono text-[8.5pt]">
                              [ Điểm đạt: ..... / {pPts.toFixed(2)}đ ]
                            </span>
                          </div>
                          <div className="space-y-2.5 mt-1.5 px-1">
                            {Array.from({
                              length: Math.max(
                                4,
                                (pillar.children?.length || 1) * 3
                              ),
                            }).map((_, lIdx) => (
                              <div
                                key={lIdx}
                                className="border-b border-dotted border-neutral-500 h-4 w-full"
                              />
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Official Answer Key & Barem Rubric at End of Exam */}
                {examIncludeAnswerKey && (
                  <div className="border-2 border-dashed border-[#15803d] p-3 bg-[#f0fdf4]/40 rounded-xs avoid-break">
                    <div className="text-[10pt] font-extrabold uppercase text-[#15803d] border-b border-[#15803d] pb-1 mb-2">
                      🔑 ĐÁP ÁN & BIỂU ĐIỂM CHẤM THI BAREM CHÍNH THỨC (DÀNH CHO TỰ ĐỐI CHIẾU SAU KHI LÀM BÀI)
                    </div>
                    <div className="space-y-1.5 text-[9pt]">
                      {rubricCriteria.map((item) => (
                        <div
                          key={item.id}
                          className="p-1.5 bg-white border border-neutral-300 rounded-xs flex items-start justify-between gap-2"
                        >
                          <div>
                            <span className="font-mono font-bold text-[#1e3a8a] mr-1">
                              [{item.code}]
                            </span>
                            <strong className="text-black">
                              {cleanNodeLabel(item.standardContent)}:
                            </strong>{' '}
                            <span className="text-neutral-800">
                              {item.subPoints.join(' · ')}
                            </span>
                          </div>
                          <span className="font-mono font-extrabold text-[#15803d] shrink-0">
                            {item.allocatedPoints.toFixed(2)}đ
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ================================================================= */}
            {/* OPTIONAL STUDY ADD-ON 1: BẢNG CHECKLIST TỪ KHÓA ĂN ĐIỂM CUỐI BÀI   */}
            {/* ================================================================= */}
            {showKeywordChecklistBox &&
              template !== 'blank_worksheet' &&
              rubricCriteria.length > 0 && (
                <div className="mt-2.5 p-2.5 border border-[#1e3a8a] bg-[#f8fafc] rounded-xs avoid-break">
                  <div className="flex items-center justify-between gap-2 border-b border-neutral-300 pb-1 mb-1.5">
                    <span className="text-[8.8pt] font-extrabold uppercase text-[#1e3a8a]">
                      🔑 BẢNG CHECKLIST TẤT CẢ TỪ KHÓA ĂN ĐIỂM BẮT BUỘC TRONG BÀI ({rubricCriteria.reduce((s, c) => s + c.requiredKeywords.length, 0)} TỪ KHÓA):
                    </span>
                    <span className="text-[7.8pt] font-mono text-neutral-600">
                      Tích [✓] vào từng từ khóa sau khi đã thuộc lòng
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {rubricCriteria.map((crit) =>
                      crit.requiredKeywords.map((kw, kIdx) => (
                        <span
                          key={`${crit.id}-kw-${kIdx}`}
                          className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-white border border-neutral-400 rounded-xs text-[8pt] font-mono text-black"
                        >
                          <span className="inline-block w-2.5 h-2.5 border border-black bg-white" />
                          <strong className="text-[#1e3a8a]">{crit.code}:</strong>{' '}
                          <span>
                            {activeStudyCloze === 'cloze_keyword'
                              ? '.............'
                              : kw}
                          </span>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}

            {/* ================================================================= */}
            {/* OPTIONAL STUDY ADD-ON 2: LỊCH ÔN LẶP LẠI SPACED REPETITION & GHI CHÚ */}
            {/* ================================================================= */}
            {showSpacedRepetitionBox && (
              <div className="mt-2 p-2.5 border border-black bg-white rounded-xs avoid-break">
                <div className="grid grid-cols-12 gap-3 items-center text-[8.2pt] font-mono">
                  <div className="col-span-7 border-r border-neutral-300 pr-2">
                    <div className="font-extrabold uppercase text-black mb-1">
                      📅 LỊCH ÔN TẬP NGẮT QUÃNG (SPACED REPETITION TRACKER):
                    </div>
                    <div className="grid grid-cols-4 gap-1 text-[7.8pt]">
                      <div className="p-1 border border-neutral-400 rounded-xs">
                        <strong>[ ] Lần 1 (24h)</strong>
                        <div>Ngày: .../......</div>
                      </div>
                      <div className="p-1 border border-neutral-400 rounded-xs">
                        <strong>[ ] Lần 2 (3 ngày)</strong>
                        <div>Ngày: .../......</div>
                      </div>
                      <div className="p-1 border border-neutral-400 rounded-xs">
                        <strong>[ ] Lần 3 (7 ngày)</strong>
                        <div>Ngày: .../......</div>
                      </div>
                      <div className="p-1 border border-neutral-400 rounded-xs bg-amber-50/60">
                        <strong>[ ] Trước giờ thi</strong>
                        <div>Điểm: ..../{totalPointsScale.toFixed(0)}</div>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-5">
                    <div className="font-extrabold uppercase text-black mb-1">
                      ✍️ ĐIỂM HAY NHẦM LẪN / GHI CHÚ LÂM SÀNG THÊM:
                    </div>
                    <div className="border-b border-dotted border-neutral-500 h-3.5 w-full" />
                    <div className="border-b border-dotted border-neutral-500 h-3.5 w-full mt-1.5" />
                  </div>
                </div>
              </div>
            )}

            {/* Running Bottom Page Footer with Page Number & Barem Summary */}
            <div className="mt-2.5 pt-1.5 border-t border-neutral-400 flex items-center justify-between gap-2 text-[8pt] font-mono text-neutral-700 avoid-break">
              <div>
                MedMind Print Studio Pro · {templateDisplayName}
              </div>
              <div>
                Tổng kết bài {lessonIndex + 1}: {targetPillars.length} mục lớn ·{' '}
                {rubricCriteria.length} ý chấm Barem · Thang{' '}
                {totalPointsScale.toFixed(1)}đ
              </div>
              <div className="font-bold text-[#1e3a8a]">
                {lessonPageBadge}
              </div>
            </div>

            {/* Screen-only visual page divider when batch-printing multiple lessons */}
            {lessonIndex < totalLessons - 1 && (
              <div className="screen-page-divider my-5 py-1.5 border-y-2 border-dashed border-[#3b82f6] bg-[#eff6ff] text-center text-[11px] font-mono font-bold text-[#1d4ed8]">
                ✂️ ————— NGẮT TRANG A4 TỰ ĐỘNG · SANG BÀI HỌC TIẾP THEO (BÀI{' '}
                {lessonIndex + 2}/{totalLessons} ·{' '}
                {tocPaginationData.lessonsMeta[lessonIndex + 1]
                  ?.pageRangeLabel || ''}{' '}
                ) —————
              </div>
            )}
          </div>
        </LessonPrintErrorBoundary>
      );
    } catch (err) {
      return (
        <div
          key={rawLesson?.id || `lesson-err-${lessonIndex}`}
          className="p-4 my-4 border-2 border-red-600 bg-red-50 text-black rounded-lg"
        >
          <div className="font-bold text-[14px] text-red-800">
            ⚠️ Lỗi dữ liệu ở bài học #{lessonIndex + 1}: "{String(rawLesson?.title || 'Không rõ tên')}"
          </div>
          <div className="text-[12px] text-neutral-700 mt-1">
            Đã tự động cô lập bài học bị lỗi định dạng ({err instanceof Error ? err.message : String(err)}) để các bài học khác vẫn hiển thị và in bình thường.
          </div>
        </div>
      );
    }
  };

  const templateDisplayName =
    template === 'barem_outline'
      ? 'Bảng Barem Đề Cương Tự Luận'
      : template === 'infographic_landscape'
      ? 'Sơ Đồ Infographic Cột'
      : template === 'horizontal_tree'
      ? 'Sơ Đồ Tư Duy Cây Ngang'
      : template === 'cornell_note'
      ? 'Vở Gạch Ý Phương Pháp Cornell'
      : template === 'fishbone_flowchart'
      ? 'Sơ Đồ Xương Cá & Lưu Đồ'
      : template === 'blank_worksheet'
      ? 'Đề Thi Tự Luận Khuyết Chữ'
      : template === 'flashcard_sheet'
      ? 'Thẻ Flashcards Cắt Rời 2 Mặt'
      : template === 'pocket_cheatsheet'
      ? 'Tờ Tóm Tắt 1 Trang (Pocket Cheat Sheet)'
      : template === 'clinical_osce_checklist'
      ? 'Bảng Kiểm Lâm Sàng OSCE & Bệnh Án'
      : 'Đề Thi Thử Tự Luận & Đáp Án Barem';

  // Memoize rendered A4 lesson sheets so opening/closing popovers, dragging items before drop,
  // or typing in search/cover inputs never re-renders all 20 lesson templates
  const renderedLessonSheets = useMemo(
    () =>
      lessonsToPrint.map((lesson, idx) =>
        renderSingleLessonTemplate(lesson, idx, lessonsToPrint.length)
      ),
    [
      lessonsToPrint,
      template,
      totalPointsScale,
      activeStudyCloze,
      printColorMode,
      singleLessonPillarScope,
      batchMode,
      intraLessonSort,
      infographicColLayout,
      fishboneOrFlowchart,
      worksheetShowLevel2,
      worksheetShowKeywordCount,
      worksheetLinesPerItem,
      flashcardShowHints,
      examDurationMinutes,
      examIncludeAnswerKey,
      showKeywordChecklistBox,
      showSpacedRepetitionBox,
      tocPaginationData.lessonsMeta,
      tocPaginationData.totalDocumentPages,
    ]
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
      <div className="w-full max-w-[1440px] h-[95vh] bg-[#131314] border border-[#2d2e30] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* ================================================================= */}
        {/* 1. TOP HEADER BAR                                                 */}
        {/* ================================================================= */}
        <div className="px-5 py-2.5 bg-[#1e1f20] border-b border-[#2d2e30] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3f3c5c] border border-[#8ab4f8]/50 flex items-center justify-center text-lg">
              🖨️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-[15.5px] text-white">
                  Print Studio Pro — 10 Mẫu Bản In Học Tập & Xuất PDF Chuẩn A4
                </h2>
                <span className="text-[11px] font-mono text-[#81c995] bg-[#10b981]/15 border border-[#10b981]/40 px-2 py-0.5 rounded-md">
                  {lessonsToPrint.length} bài · Ước tính{' '}
                  {tocPaginationData.totalDocumentPages} trang A4
                </span>
              </div>
              <p className="text-[11.5px] text-[#9aa0a6]">
                10 mẫu đề cương, sơ đồ, Flashcards, Cheat Sheet, OSCE & Đề thi thử · Hỗ trợ che từ khóa tự điền & xuất PDF trực tiếp
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Primary 1-Click Direct .PDF File Download Button */}
            <button
              onClick={handleExportDirectPdf}
              disabled={isExportingPdf}
              title="Tạo và tải trực tiếp file .PDF chuẩn A4 về máy tính / điện thoại (Không cần qua hộp thoại trình duyệt)"
              className={`px-4 py-2 rounded-xl font-display font-bold text-[13px] flex items-center gap-1.5 shadow-lg transition-all cursor-pointer ${
                isExportingPdf
                  ? 'bg-[#3b82f6]/60 text-white cursor-wait'
                  : 'bg-[#10b981] hover:bg-[#059669] text-[#052e16] shadow-[#10b981]/20'
              }`}
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{pdfExportProgress || 'Đang tạo file PDF...'}</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>
                    📥 Tải File PDF ({lessonsToPrint.length} bài ·{' '}
                    {tocPaginationData.totalDocumentPages} tr)
                  </span>
                </>
              )}
            </button>

            {/* Browser Vector Print / Save as PDF Dialog Button */}
            <button
              onClick={handlePrintA4}
              disabled={isExportingPdf}
              title="Mở hộp thoại In / Lưu PDF Vector sắc nét của trình duyệt"
              className="px-3.5 py-2 rounded-xl bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-display font-bold text-[13px] flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>🖨️ In / Lưu PDF Vector</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#242528] hover:bg-[#ef4444]/20 text-[#9aa0a6] hover:text-[#f28b82] border border-[#2d2e30] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 2. ROW 1: 10 MEDICAL STUDY PRINT TEMPLATES BAR                    */}
        {/* ================================================================= */}
        <div className="px-5 py-2 bg-[#18191b] border-b border-[#2d2e30] flex flex-col gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1 bg-[#131314] p-1 rounded-xl border border-[#2d2e30]">
            {[
              {
                id: 'barem_outline',
                label: '📋 1. Barem Tự Luận',
              },
              {
                id: 'infographic_landscape',
                label: '📊 2. Infographic Cột',
              },
              {
                id: 'horizontal_tree',
                label: '🌳 3. Sơ Đồ Cây Ngang',
              },
              {
                id: 'cornell_note',
                label: '📝 4. Vở Gạch Ý Cornell',
              },
              {
                id: 'fishbone_flowchart',
                label: '🐟 5. Xương Cá / Lưu Đồ',
              },
              {
                id: 'blank_worksheet',
                label: '✍️ 6. Đề Khuyết Chữ',
              },
              {
                id: 'flashcard_sheet',
                label: '🗂️ 7. Flashcards Cắt Rời',
              },
              {
                id: 'pocket_cheatsheet',
                label: '⚡ 8. Tóm Tắt 1 Trang',
              },
              {
                id: 'clinical_osce_checklist',
                label: '🩺 9. Bảng Kiểm OSCE',
              },
              {
                id: 'exam_simulation_paper',
                label: '🎯 10. Đề Thi Thử & Đáp Án',
              },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id as PrintTemplateType)}
                className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-display font-semibold flex items-center gap-1 transition-all cursor-pointer whitespace-nowrap ${
                  template === t.id
                    ? 'bg-[#8ab4f8] text-[#131314] shadow-sm font-bold'
                    : 'text-[#e3e3e3] hover:bg-[#242528]'
                }`}
              >
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Active Study Mode & Print Customizer Sub-Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11.5px]">
            {/* Left: Active Recall Cloze Mode + Color Mode + Font Scale */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Active Study Cloze Switcher (Works on ALL diagrams/tables!) */}
              <div className="flex items-center gap-1 bg-[#131314] border border-[#2d2e30] rounded-lg p-0.5">
                <span className="text-[11px] text-[#9aa0a6] px-1.5 font-medium">
                  Chế độ học:
                </span>
                {[
                  { id: 'full', label: '👁️ Đầy đủ 100%' },
                  { id: 'cloze_keyword', label: '🙈 Ẩn Từ khóa [....]' },
                  { id: 'cloze_detail', label: '✍️ Ẩn Giải thích [____]' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setActiveStudyCloze(m.id as StudyClozeMode)}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer transition-colors ${
                      activeStudyCloze === m.id
                        ? 'bg-[#10b981] text-[#052e16] font-bold'
                        : 'text-[#9aa0a6] hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {/* Color vs High-Contrast B&W Photocopy Mode */}
              <div className="flex items-center gap-1 bg-[#131314] border border-[#2d2e30] rounded-lg p-0.5">
                <button
                  onClick={() => setPrintColorMode('color')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                    printColorMode === 'color'
                      ? 'bg-[#3f3c5c] text-white font-semibold'
                      : 'text-[#9aa0a6] hover:text-white'
                  }`}
                >
                  🎨 Màu Y khoa
                </button>
                <button
                  onClick={() => setPrintColorMode('bw_high_contrast')}
                  className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                    printColorMode === 'bw_high_contrast'
                      ? 'bg-white text-black font-bold'
                      : 'text-[#9aa0a6] hover:text-white'
                  }`}
                >
                  🖨️ Đen trắng Photocopy
                </button>
              </div>

              {/* Font Scale */}
              <div className="flex items-center gap-1 bg-[#131314] border border-[#2d2e30] rounded-lg p-0.5">
                {[
                  { id: 'compact', label: 'Chữ gọn' },
                  { id: 'normal', label: 'Chuẩn A4' },
                  { id: 'large', label: 'Chữ to' },
                ].map((f) => (
                  <button
                    key={f.id}
                    onClick={() =>
                      setFontScaleMode(f.id as PrintFontScaleMode)
                    }
                    className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                      fontScaleMode === f.id
                        ? 'bg-[#3f3c5c] text-white font-semibold'
                        : 'text-[#9aa0a6] hover:text-white'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Right: Template-specific options & Study Add-on Toggles */}
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Toggle Keyword Checklist & Spaced Repetition Footer */}
              <button
                onClick={() => setShowKeywordChecklistBox((prev) => !prev)}
                className={`px-2 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1 cursor-pointer ${
                  showKeywordChecklistBox
                    ? 'bg-[#242528] border-[#8ab4f8]/60 text-[#8ab4f8]'
                    : 'bg-[#131314] border-[#2d2e30] text-[#9aa0a6]'
                }`}
              >
                {showKeywordChecklistBox && <Check className="w-3 h-3" />}
                <span>🔑 Checklist Từ khóa</span>
              </button>

              <button
                onClick={() => setShowSpacedRepetitionBox((prev) => !prev)}
                className={`px-2 py-1 rounded-lg border text-[11px] font-medium flex items-center gap-1 cursor-pointer ${
                  showSpacedRepetitionBox
                    ? 'bg-[#242528] border-[#8ab4f8]/60 text-[#8ab4f8]'
                    : 'bg-[#131314] border-[#2d2e30] text-[#9aa0a6]'
                }`}
              >
                {showSpacedRepetitionBox && <Check className="w-3 h-3" />}
                <span>📅 Lịch Ôn 1-3-7 ngày</span>
              </button>

              {(template === 'barem_outline' ||
                template === 'blank_worksheet' ||
                template === 'exam_simulation_paper') && (
                <div className="flex items-center gap-1 bg-[#131314] border border-[#2d2e30] rounded-lg p-0.5">
                  <span className="text-[10.5px] text-[#9aa0a6] px-1">
                    Thang:
                  </span>
                  {[4.0, 5.0, 10.0].map((pts) => (
                    <button
                      key={pts}
                      onClick={() => setTotalPointsScale(pts)}
                      className={`px-1.5 py-0.5 rounded text-[11px] font-mono font-semibold cursor-pointer ${
                        totalPointsScale === pts
                          ? 'bg-[#3f3c5c] text-white'
                          : 'text-[#9aa0a6] hover:text-white'
                      }`}
                    >
                      {pts.toFixed(1)}đ
                    </button>
                  ))}
                </div>
              )}

              {template === 'infographic_landscape' && (
                <div className="flex items-center gap-1 bg-[#131314] border border-[#2d2e30] rounded-lg p-0.5">
                  <button
                    onClick={() => setInfographicColLayout('3_per_row')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                      infographicColLayout === '3_per_row'
                        ? 'bg-[#3f3c5c] text-white'
                        : 'text-[#9aa0a6] hover:text-white'
                    }`}
                  >
                    3 cột/hàng
                  </button>
                  <button
                    onClick={() => setInfographicColLayout('all_in_one_row')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                      infographicColLayout === 'all_in_one_row'
                        ? 'bg-[#3f3c5c] text-white'
                        : 'text-[#9aa0a6] hover:text-white'
                    }`}
                  >
                    1 hàng ngang
                  </button>
                </div>
              )}

              {template === 'fishbone_flowchart' && (
                <div className="flex items-center gap-1 bg-[#131314] border border-[#2d2e30] rounded-lg p-0.5">
                  <button
                    onClick={() => setFishboneOrFlowchart('fishbone')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                      fishboneOrFlowchart === 'fishbone'
                        ? 'bg-[#3f3c5c] text-white'
                        : 'text-[#9aa0a6] hover:text-white'
                    }`}
                  >
                    🐟 Xương Cá
                  </button>
                  <button
                    onClick={() => setFishboneOrFlowchart('flowchart')}
                    className={`px-2 py-0.5 rounded text-[11px] font-medium cursor-pointer ${
                      fishboneOrFlowchart === 'flowchart'
                        ? 'bg-[#3f3c5c] text-white'
                        : 'text-[#9aa0a6] hover:text-white'
                    }`}
                  >
                    ⬇️ Lưu đồ
                  </button>
                </div>
              )}

              {template === 'blank_worksheet' && (
                <select
                  value={worksheetLinesPerItem}
                  onChange={(e) =>
                    setWorksheetLinesPerItem(Number(e.target.value))
                  }
                  className="bg-[#242528] border border-[#3c4043] rounded-lg px-2 py-0.5 text-[11px] text-white cursor-pointer"
                >
                  <option value={3}>3 dòng chấm / ý</option>
                  <option value={5}>5 dòng chấm / ý</option>
                  <option value={7}>7 dòng chấm / ý</option>
                </select>
              )}

              {template === 'flashcard_sheet' && (
                <button
                  onClick={() => setFlashcardShowHints((prev) => !prev)}
                  className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium cursor-pointer ${
                    flashcardShowHints
                      ? 'bg-[#3f3c5c] border-[#8ab4f8] text-white'
                      : 'bg-[#131314] border-[#2d2e30] text-[#9aa0a6]'
                  }`}
                >
                  💡 Gợi ý chữ cái đầu
                </button>
              )}

              {template === 'exam_simulation_paper' && (
                <div className="flex items-center gap-1">
                  <select
                    value={examDurationMinutes}
                    onChange={(e) =>
                      setExamDurationMinutes(Number(e.target.value))
                    }
                    className="bg-[#242528] border border-[#3c4043] rounded-lg px-2 py-0.5 text-[11px] text-white cursor-pointer"
                  >
                    <option value={30}>30 phút</option>
                    <option value={60}>60 phút</option>
                    <option value={90}>90 phút</option>
                    <option value={120}>120 phút</option>
                  </select>
                  <button
                    onClick={() => setExamIncludeAnswerKey((prev) => !prev)}
                    className={`px-2 py-0.5 rounded-lg border text-[11px] font-medium cursor-pointer ${
                      examIncludeAnswerKey
                        ? 'bg-[#10b981]/20 border-[#10b981] text-[#81c995]'
                        : 'bg-[#131314] border-[#2d2e30] text-[#9aa0a6]'
                    }`}
                  >
                    🔑 Kèm Đáp án Barem
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. ROW 2: MULTI-LESSON BATCH SCOPE, SORTING & COVER/TOC BAR       */}
        {/* ================================================================= */}
        <div className="px-5 py-2.5 bg-[#161719] border-b border-[#2d2e30] flex flex-wrap items-center justify-between gap-2.5 shrink-0 relative">
          {/* Left: 3 Batch Scope Modes + Lesson & Intra-Lesson Sort Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] text-[#9aa0a6] font-medium">
              Chế độ gộp:
            </span>

            <div className="flex flex-wrap items-center gap-1 bg-[#131314] p-1 rounded-xl border border-[#2d2e30]">
              <button
                onClick={() => {
                  setBatchMode('current');
                  setBatchFallbackNotice(null);
                  setIsMultiSelectOpen(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                  batchMode === 'current'
                    ? 'bg-[#3f3c5c] text-white font-semibold border border-[#8ab4f8]/50'
                    : 'text-[#9aa0a6] hover:text-white'
                }`}
              >
                📄 Bài học hiện tại
              </button>

              <button
                onClick={() => {
                  setBatchMode('folder');
                  setBatchFallbackNotice(null);
                  setIncludeCoverAndToc(true);
                  setIsMultiSelectOpen(false);
                }}
                className={`px-2.5 py-1 rounded-lg text-[12px] font-medium transition-colors cursor-pointer ${
                  batchMode === 'folder'
                    ? 'bg-[#3f3c5c] text-white font-semibold border border-[#8ab4f8]/50'
                    : 'text-[#9aa0a6] hover:text-white'
                }`}
              >
                📁 Toàn bộ Học phần / Hệ cơ quan
              </button>

              <button
                onClick={() => {
                  setBatchMode('custom');
                  setBatchFallbackNotice(null);
                  setIncludeCoverAndToc(true);
                  if (selectedLessonIds.length === 0) {
                    setSelectedLessonIds([currentLessonObj.id]);
                  }
                  setIsMultiSelectOpen((prev) => !prev);
                }}
                className={`px-2.5 py-1 rounded-lg text-[12px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                  batchMode === 'custom'
                    ? 'bg-[#3f3c5c] text-white font-semibold border border-[#8ab4f8]/50'
                    : 'text-[#9aa0a6] hover:text-white'
                }`}
              >
                <span>
                  ☑️ Chọn & Xếp bài ({lessonsToPrint.length}/{allLessons.length})
                </span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sub-selector depending on batchMode */}
            {batchMode === 'current' && (
              <select
                value={singleLessonPillarScope}
                onChange={(e) => setSingleLessonPillarScope(e.target.value)}
                className="bg-[#242528] border border-[#3c4043] rounded-lg px-2.5 py-1 text-[12px] text-white max-w-[220px] truncate cursor-pointer"
              >
                <option value="all">
                  In toàn bộ các mục lớn ({(safeActiveRootNode?.children || []).length} mục)
                </option>
                {(safeActiveRootNode?.children || []).map((p, idx) => (
                  <option key={p?.id || idx} value={p?.id}>
                    Chỉ in Mục {idx + 1}: {cleanNodeLabel(p?.label)}
                  </option>
                ))}
              </select>
            )}

            {batchMode === 'folder' && (
              <div className="flex flex-wrap items-center gap-1 bg-[#242528] p-1 rounded-lg border border-[#3c4043]">
                <button
                  onClick={() => setFolderTarget('subject')}
                  className={`px-2 py-0.5 rounded text-[11.5px] font-medium cursor-pointer ${
                    folderTarget === 'subject'
                      ? 'bg-[#8ab4f8] text-[#131314] font-bold'
                      : 'text-[#e3e3e3]'
                  }`}
                >
                  Học phần: {subjectName || 'Hiện tại'}
                </button>
                <button
                  onClick={() => setFolderTarget('system')}
                  className={`px-2 py-0.5 rounded text-[11.5px] font-medium cursor-pointer ${
                    folderTarget === 'system'
                      ? 'bg-[#8ab4f8] text-[#131314] font-bold'
                      : 'text-[#e3e3e3]'
                  }`}
                >
                  Hệ cơ quan: {systemName || 'Hiện tại'}
                </button>
                {allLessons.length > 1 && (
                  <button
                    onClick={() => setFolderTarget('all_library')}
                    className={`px-2 py-0.5 rounded text-[11.5px] font-medium cursor-pointer ${
                      folderTarget === 'all_library'
                        ? 'bg-[#8ab4f8] text-[#131314] font-bold'
                        : 'text-[#e3e3e3]'
                    }`}
                  >
                    Toàn bộ ({allLessons.length} bài)
                  </button>
                )}
              </div>
            )}

            {/* Lesson Sort Order Selector (Câu 1 -> Câu N, Manual, Sidebar, Reverse) */}
            {(batchMode !== 'current' || allLessons.length > 1) && (
              <div className="flex items-center gap-1 bg-[#131314] px-2 py-1 rounded-xl border border-[#3c4043]">
                <ArrowUpDown className="w-3.5 h-3.5 text-[#8ab4f8] shrink-0" />
                <span className="text-[11px] text-[#9aa0a6] hidden xl:inline">
                  Thứ tự câu:
                </span>
                <select
                  value={lessonSortOrder}
                  onChange={(e) => {
                    const nextOrder = e.target.value as
                      | 'natural_asc'
                      | 'manual_custom'
                      | 'sidebar_order'
                      | 'reverse';
                    setLessonSortOrder(nextOrder);
                    if (nextOrder === 'natural_asc') {
                      const sortedIds = [...allLessons]
                        .sort(compareLessonsNaturally)
                        .map((l) => l.id);
                      setCustomOrderIds(sortedIds);
                      onSortLessonsNaturally?.();
                    } else if (nextOrder === 'manual_custom') {
                      if (batchMode === 'current' && allLessons.length > 1) {
                        setBatchMode('folder');
                        setFolderTarget('all_library');
                      }
                      setIsMultiSelectOpen(true);
                    }
                  }}
                  className="bg-transparent text-[11.5px] font-semibold text-[#8ab4f8] focus:outline-none cursor-pointer"
                  title="Chọn thứ tự sắp xếp các Câu / Bài học khi xuất PDF"
                >
                  <option value="natural_asc" className="bg-[#1e1f20] text-white">
                    🔢 Câu 1 ➔ Câu N (Tăng dần)
                  </option>
                  <option value="manual_custom" className="bg-[#1e1f20] text-white">
                    ✋ Tự kéo / xếp thứ tự (⬆️⬇️)
                  </option>
                  <option value="sidebar_order" className="bg-[#1e1f20] text-white">
                    📋 Theo thứ tự Sidebar
                  </option>
                  <option value="reverse" className="bg-[#1e1f20] text-white">
                    🔄 Đảo ngược (Câu N ➔ 1)
                  </option>
                </select>

                {/* Direct 1-click button to open the Drag-and-Drop Reorder Queue from ANY mode */}
                <button
                  type="button"
                  onClick={() => {
                    if (batchMode === 'current' && allLessons.length > 1) {
                      setBatchMode('custom');
                      setSelectedLessonIds(orderedAllLessons.map((l) => l.id));
                    }
                    setIsMultiSelectOpen((prev) => !prev);
                  }}
                  className={`ml-1 px-2 py-0.5 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer ${
                    isMultiSelectOpen
                      ? 'bg-[#8ab4f8] text-[#131314]'
                      : 'bg-[#242528] hover:bg-[#3c4043] text-white border border-[#8ab4f8]/40'
                  }`}
                  title="Mở bảng Kéo thả & Sắp xếp vị trí các bài học (Đồng bộ với Sidebar)"
                >
                  <GripVertical className="w-3 h-3" />
                  <span>Sắp xếp / Di chuyển</span>
                </button>
              </div>
            )}

            {/* Intra-Lesson Branch Sorting Selector (Chuẩn hóa thứ tự mục trong bài) */}
            <div className="flex items-center gap-1 bg-[#131314] px-2 py-1 rounded-xl border border-[#3c4043]">
              <ListOrdered className="w-3.5 h-3.5 text-[#34d399] shrink-0" />
              <span className="text-[11px] text-[#9aa0a6] hidden xl:inline">
                Xếp mục trong bài:
              </span>
              <select
                value={intraLessonSort}
                onChange={(e) =>
                  setIntraLessonSort(
                    e.target.value as
                      | 'natural_number'
                      | 'medical_standard'
                      | 'keep'
                  )
                }
                className="bg-transparent text-[11.5px] font-semibold text-[#6ee7b7] focus:outline-none cursor-pointer"
                title="Tự động sắp xếp lại các mục lớn (1, 2, 3...) và mục nhỏ (1.1, 1.2...) bên trong từng bài học"
              >
                <option value="natural_number" className="bg-[#1e1f20] text-white">
                  🔢 Chuẩn số mục (1 ➔ 1.1 ➔ 2)
                </option>
                <option value="medical_standard" className="bg-[#1e1f20] text-white">
                  🏥 Trình tự Bệnh học (ĐN➔NN➔TC➔CĐ➔ĐT)
                </option>
                <option value="keep" className="bg-[#1e1f20] text-white">
                  🌳 Giữ nguyên gốc sơ đồ
                </option>
              </select>
            </div>
          </div>

          {/* Right: Cover Page & Table of Contents + Detailed Sub-Pillars Toggle */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setIncludeCoverAndToc((prev) => !prev)}
              className={`px-3 py-1.5 rounded-xl border text-[12px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                includeCoverAndToc
                  ? 'bg-[#10b981]/20 border-[#10b981] text-[#81c995] font-semibold'
                  : 'bg-[#242528] border-[#3c4043] text-[#9aa0a6] hover:text-white'
              }`}
            >
              {includeCoverAndToc ? (
                <CheckSquare className="w-3.5 h-3.5 text-[#10b981]" />
              ) : (
                <Square className="w-3.5 h-3.5" />
              )}
              <span>📖 Trang Bìa & Mục Lục (Kèm Số Trang)</span>
            </button>

            {includeCoverAndToc && (
              <button
                onClick={() => setTocShowSubPillars((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-xl border text-[11.5px] font-medium flex items-center gap-1.5 transition-all cursor-pointer ${
                  tocShowSubPillars
                    ? 'bg-[#3b82f6]/20 border-[#60a5fa] text-[#93c5fd] font-semibold'
                    : 'bg-[#242528] border-[#3c4043] text-[#9aa0a6] hover:text-white'
                }`}
                title="Hiển thị các mục lớn (1, 2, 3...) và số trang chi tiết dưới mỗi bài học trong Mục lục"
              >
                <ListOrdered className="w-3.5 h-3.5" />
                <span>
                  {tocShowSubPillars
                    ? 'Chi tiết mục lớn (1, 2, 3...)'
                    : 'Chỉ hiện tên bài'}
                </span>
              </button>
            )}
          </div>

          {/* =============================================================== */}
          {/* UNIVERSAL DRAG-AND-DROP & MULTI-SELECT LESSON ORGANIZER POPOVER */}
          {/* =============================================================== */}
          {isMultiSelectOpen && (
            <div className="absolute top-full left-5 mt-1 w-full max-w-[680px] bg-[#1e1f20] border border-[#8ab4f8]/60 rounded-2xl shadow-2xl z-40 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 mb-2 border-b border-[#2d2e30]">
                <div className="flex items-center gap-2">
                  <GripVertical className="w-4 h-4 text-[#8ab4f8]" />
                  <div>
                    <div className="font-display font-bold text-[13.5px] text-white">
                      Sắp xếp, Di chuyển & Chọn bài in ({lessonsToPrint.length}/
                      {allLessons.length} bài)
                    </div>
                    <div className="text-[11px] text-[#9aa0a6]">
                      Kéo thả trực tiếp dòng bài học, chọn số vị trí #1, #2... hoặc bấm ⬆️ ⬇️ (Tự động đồng bộ với Sidebar)
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    onClick={() => {
                      const sortedIds = [...allLessons]
                        .sort(compareLessonsNaturally)
                        .map((l) => l.id);
                      setCustomOrderIds(sortedIds);
                      setLessonSortOrder('natural_asc');
                      onSortLessonsNaturally?.();
                    }}
                    className="px-2 py-1 rounded bg-[#10b981]/20 border border-[#10b981]/60 hover:bg-[#10b981]/30 text-[11px] font-bold text-[#6ee7b7] cursor-pointer"
                    title="Tự động xếp theo Câu 1 ➔ Câu 2 ➔ Câu 3... và lưu vào Sidebar"
                  >
                    🔢 Xếp chuẩn Câu 1➔N
                  </button>
                  <button
                    onClick={() => {
                      setBatchMode('custom');
                      setBatchFallbackNotice(null);
                      setSelectedLessonIds(orderedAllLessons.map((l) => l.id));
                    }}
                    className="px-2 py-1 rounded bg-[#3f3c5c] hover:bg-[#4e4a70] text-[11px] font-semibold text-white cursor-pointer"
                  >
                    Chọn tất cả ({allLessons.length})
                  </button>
                  <button
                    onClick={() => {
                      setBatchMode('custom');
                      setBatchFallbackNotice(null);
                      setSelectedLessonIds([currentLessonObj.id]);
                    }}
                    className="px-2 py-1 rounded bg-[#242528] hover:bg-[#2d2e30] text-[11px] text-[#9aa0a6] hover:text-white cursor-pointer"
                  >
                    Chỉ bài hiện tại
                  </button>
                  <button
                    onClick={() => setIsMultiSelectOpen(false)}
                    className="px-2.5 py-1 rounded bg-[#8ab4f8] text-[#131314] font-bold text-[11px] cursor-pointer"
                  >
                    ✓ Xong
                  </button>
                </div>
              </div>

              {/* Search inside organizer */}
              <div className="relative mb-2.5">
                <Search className="w-3.5 h-3.5 text-[#9aa0a6] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={lessonSearchQuery}
                  onChange={(e) => setLessonSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm bài học hoặc giữ chuột kéo thả dòng bài học để đổi thứ tự..."
                  className="w-full bg-[#131314] border border-[#3c4043] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-white focus:outline-none focus:border-[#8ab4f8]"
                />
              </div>

              {/* Drag-and-Drop Lesson Checkbox & Reorder List */}
              <div className="max-h-[320px] overflow-y-auto space-y-1.5 pr-1">
                {orderedAllLessons
                  .filter((l) =>
                    String(l?.title || '')
                      .toLowerCase()
                      .includes(lessonSearchQuery.toLowerCase())
                  )
                  .map((l, idx, arr) => {
                    const checked =
                      batchMode === 'custom'
                        ? selectedLessonIds.includes(l.id)
                        : lessonsToPrint.some((item) => item.id === l.id);
                    const { sysName, subName } = getLessonPathNames(l);
                    const pCount = Array.isArray(l?.rootNode?.children)
                      ? l.rootNode.children.length
                      : 0;
                    const printOrderIdx = lessonsToPrint.findIndex(
                      (item) => item.id === l.id
                    );
                    const isDraggingThis = draggedQueueLessonId === l.id;
                    const isDropBefore =
                      queueDropIndicator?.targetId === l.id &&
                      queueDropIndicator?.position === 'before';
                    const isDropAfter =
                      queueDropIndicator?.targetId === l.id &&
                      queueDropIndicator?.position === 'after';

                    return (
                      <div
                        key={l.id || idx}
                        draggable
                        onDragStart={(e) => {
                          setDraggedQueueLessonId(l.id);
                          e.dataTransfer.effectAllowed = 'move';
                          e.dataTransfer.setData('text/plain', l.id);
                        }}
                        onDragOver={(e) => {
                          if (!draggedQueueLessonId || draggedQueueLessonId === l.id) {
                            return;
                          }
                          e.preventDefault();
                          const rect = e.currentTarget.getBoundingClientRect();
                          const pos: 'before' | 'after' =
                            e.clientY - rect.top < rect.height / 2
                              ? 'before'
                              : 'after';
                          if (
                            queueDropIndicator?.targetId !== l.id ||
                            queueDropIndicator?.position !== pos
                          ) {
                            setQueueDropIndicator({
                              targetId: l.id,
                              position: pos,
                            });
                          }
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const draggedId =
                            e.dataTransfer.getData('text/plain') ||
                            draggedQueueLessonId;
                          if (draggedId && draggedId !== l.id) {
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            const pos: 'before' | 'after' =
                              e.clientY - rect.top < rect.height / 2
                                ? 'before'
                                : 'after';
                            handleDropReorderInPrintQueue(draggedId, l.id, pos);
                          }
                          setDraggedQueueLessonId(null);
                          setQueueDropIndicator(null);
                        }}
                        onDragEnd={() => {
                          setDraggedQueueLessonId(null);
                          setQueueDropIndicator(null);
                        }}
                        onClick={() => {
                          if (batchMode !== 'custom') {
                            setBatchMode('custom');
                            const currentPrintedIds = lessonsToPrint.map(
                              (item) => item.id
                            );
                            if (currentPrintedIds.includes(l.id)) {
                              const filtered = currentPrintedIds.filter(
                                (id) => id !== l.id
                              );
                              setSelectedLessonIds(
                                filtered.length > 0 ? filtered : [l.id]
                              );
                            } else {
                              setSelectedLessonIds([
                                ...currentPrintedIds,
                                l.id,
                              ]);
                            }
                          } else {
                            toggleLessonSelection(l.id);
                          }
                        }}
                        className={`p-2 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-all ${
                          isDraggingThis ? 'opacity-45 scale-[0.98]' : ''
                        } ${
                          isDropBefore
                            ? 'border-t-4 border-t-[#3b82f6]'
                            : isDropAfter
                            ? 'border-b-4 border-b-[#3b82f6]'
                            : ''
                        } ${
                          checked
                            ? 'bg-[#3f3c5c]/40 border-[#8ab4f8]/60 text-white'
                            : 'bg-[#131314] border-[#2d2e30] text-[#9aa0a6] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span
                            title="Giữ chuột kéo thả để đổi vị trí bài học"
                            className="cursor-grab active:cursor-grabbing text-[#8ab4f8] shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <GripVertical className="w-4 h-4" />
                          </span>

                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-[#8ab4f8] shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-[#5f6368] shrink-0" />
                          )}
                          <div className="min-w-0 flex-1">
                            <div className="text-[12.5px] font-semibold truncate flex items-center gap-1.5">
                              {checked && printOrderIdx >= 0 && (
                                <span className="px-1.5 py-0.2 rounded bg-[#8ab4f8] text-[#131314] font-mono font-bold text-[10px] shrink-0">
                                  In #{printOrderIdx + 1}
                                </span>
                              )}
                              <span className="truncate">{l.title}</span>
                            </div>
                            <div className="text-[10.5px] text-[#9aa0a6] truncate">
                              {sysName} › {subName} · {pCount} mục lớn
                            </div>
                          </div>
                        </div>

                        {/* Position Jump Dropdown + Folder Move + Up / Down / Top / Bottom Buttons */}
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {/* Direct Position Jump Selector (#1 .. #N) */}
                          <select
                            value={idx}
                            onChange={(e) =>
                              handleReorderLessonInPrintQueue(
                                l.id,
                                Number(e.target.value)
                              )
                            }
                            title="Nhảy thẳng tới vị trí số mấy trong danh sách"
                            className="bg-[#131314] border border-[#8ab4f8]/50 text-[#8ab4f8] font-mono font-bold text-[10.5px] rounded px-1.5 py-0.5 cursor-pointer"
                          >
                            {orderedAllLessons.map((_, optIdx) => (
                              <option key={optIdx} value={optIdx}>
                                #{optIdx + 1}
                              </option>
                            ))}
                          </select>

                          {/* Optional Cross-Subject Move Selector */}
                          {onMoveLessonToSubject &&
                            database &&
                            Array.isArray(database.subjects) &&
                            database.subjects.length > 1 && (
                              <select
                                value={l.subjectId}
                                onChange={(e) =>
                                  onMoveLessonToSubject(l.id, e.target.value)
                                }
                                title="Di chuyển bài học này sang Học phần khác"
                                className="bg-[#242528] border border-[#3c4043] text-[#e3e3e3] text-[10.5px] rounded px-1.5 py-0.5 max-w-[115px] truncate cursor-pointer"
                              >
                                {database.subjects.map((sub) => (
                                  <option key={sub.id} value={sub.id}>
                                    📁 {sub.name}
                                  </option>
                                ))}
                              </select>
                            )}

                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() =>
                              handleReorderLessonInPrintQueue(l.id, 'top')
                            }
                            title="Đưa lên đầu danh sách in"
                            className="px-1.5 py-0.5 rounded bg-[#242528] hover:bg-[#3c4043] disabled:opacity-30 text-[10px] text-[#9aa0a6] hover:text-white cursor-pointer"
                          >
                            ⏫
                          </button>
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() =>
                              handleReorderLessonInPrintQueue(l.id, 'up')
                            }
                            title="Đẩy bài này lên trên 1 vị trí"
                            className="p-1 rounded bg-[#242528] hover:bg-[#3c4043] disabled:opacity-30 text-[#e3e3e3] hover:text-white cursor-pointer"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === arr.length - 1}
                            onClick={() =>
                              handleReorderLessonInPrintQueue(l.id, 'down')
                            }
                            title="Đẩy bài này xuống dưới 1 vị trí"
                            className="p-1 rounded bg-[#242528] hover:bg-[#3c4043] disabled:opacity-30 text-[#e3e3e3] hover:text-white cursor-pointer"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            disabled={idx === arr.length - 1}
                            onClick={() =>
                              handleReorderLessonInPrintQueue(l.id, 'bottom')
                            }
                            title="Đưa xuống cuối danh sách in"
                            className="px-1.5 py-0.5 rounded bg-[#242528] hover:bg-[#3c4043] disabled:opacity-30 text-[10px] text-[#9aa0a6] hover:text-white cursor-pointer"
                          >
                            ⏬
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

        {/* ================================================================= */}
        {/* 4. CONTINUOUS A4 WHITE PAPER PREVIEW CANVAS                       */}
        {/* ================================================================= */}
        <div
          onClick={() => isMultiSelectOpen && setIsMultiSelectOpen(false)}
          className="flex-1 overflow-y-auto bg-[#202124] p-4 md:p-8 block"
        >
          {/* Direct PDF Export Confirmation Banner */}
          {pdfExportSuccessMsg && (
            <div className="mx-auto mb-3 max-w-[860px] px-4 py-2.5 rounded-xl bg-[#064e3b] border border-[#10b981] text-[#ecfdf5] text-[12.5px] flex items-center justify-between gap-2 shadow-lg">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#34d399] shrink-0" />
                <span className="font-semibold">{pdfExportSuccessMsg}</span>
              </div>
              <button
                onClick={() => setPdfExportSuccessMsg(null)}
                className="text-xs text-[#a7f3d0] hover:text-white cursor-pointer"
              >
                Đóng
              </button>
            </div>
          )}

          {/* Friendly Notice Banner if folder filter had 1 lesson or fallback occurred */}
          {(autoFallbackReason || batchFallbackNotice) && (
            <div className="mx-auto mb-3 max-w-[860px] px-4 py-2.5 rounded-xl bg-[#1e293b] border border-[#3b82f6]/60 text-[#e2e8f0] text-[12px] flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-[#60a5fa] shrink-0" />
                <span>{batchFallbackNotice || autoFallbackReason}</span>
              </div>
              {allLessons.length > 1 && lessonsToPrint.length === 1 && (
                <button
                  onClick={() => {
                    if (batchMode === 'folder') {
                      setFolderTarget('all_library');
                    } else {
                      setBatchMode('custom');
                      setSelectedLessonIds(allLessons.map((l) => l.id));
                    }
                    setBatchFallbackNotice(null);
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#3b82f6] hover:bg-[#2563eb] text-white font-semibold text-[11.5px] cursor-pointer shrink-0"
                >
                  Gộp tất cả {allLessons.length} bài học ngay
                </button>
              )}
            </div>
          )}

          <div
            ref={printSheetRef}
            style={{
              backgroundColor: '#ffffff',
              color: '#111827',
              width: '100%',
              maxWidth: isLandscape ? '1140px' : '860px',
              height: 'auto',
              minHeight: 'max-content',
              overflow: 'visible',
              zoom:
                fontScaleMode === 'compact'
                  ? 0.92
                  : fontScaleMode === 'large'
                  ? 1.08
                  : 1,
            }}
            className={`mx-auto bg-white text-[#111827] h-auto min-h-max overflow-visible shadow-2xl p-6 md:p-10 rounded-md select-text ${
              printColorMode === 'bw_high_contrast' ? 'bw-print-sheet' : ''
            }`}
          >
            {/* ============================================================= */}
            {/* COVER PAGE & COMPREHENSIVE TABLE OF CONTENTS WITH PAGE NUMBERS */}
            {/* ============================================================= */}
            {includeCoverAndToc && (
              <div
                data-section-key="__toc__"
                data-section-label="Trang Bìa & Mục Lục Đề Cương"
                className="a4-print-section a4-page-break pb-4 mb-4 bg-white text-[#111827]"
              >
                {/* Running Header on Cover / TOC Page */}
                <div className="flex items-center justify-between gap-2 pb-1 mb-1.5 border-b border-neutral-300 text-[8pt] font-mono text-neutral-600">
                  <div>
                    MEDMIND PRINT STUDIO PRO · HỆ THỐNG ĐÓNG QUYỂN ĐỀ CƯƠNG Y KHOA A4
                  </div>
                  <div
                    data-sync-toc-header-badge="true"
                    className="px-1.5 py-0.2 rounded-xs bg-[#eff6ff] border border-[#93c5fd] text-[#1e3a8a] font-bold"
                  >
                    📄 TRANG BÌA & MỤC LỤC: Tr. 01
                    {tocPaginationData.tocPageCount > 1
                      ? `–${String(tocPaginationData.tocPageCount).padStart(
                          2,
                          '0'
                        )}`
                      : ''}{' '}
                    / Tổng{' '}
                    {String(tocPaginationData.totalDocumentPages).padStart(
                      2,
                      '0'
                    )}{' '}
                    tr.
                  </div>
                </div>

                <div className="border-2 border-[#1e3a8a] p-4 bg-white">
                  {/* Cover Header & Editable Title */}
                  <div className="text-center border-b-2 border-[#1e3a8a] pb-3 mb-3 bg-[#f8fafc] p-3 rounded-xs">
                    <div className="text-[8.5pt] font-mono font-bold uppercase tracking-widest text-[#1d4ed8]">
                      MEDMIND STUDIO · TÀI LIỆU HỆ THỐNG HÓA LÂM SÀNG & ÔN THI TỰ LUẬN CHUẨN BAREM
                    </div>
                    <input
                      type="text"
                      value={bookletTitle}
                      onChange={(e) => setBookletTitle(e.target.value)}
                      className="w-full text-center text-[13.5pt] font-extrabold uppercase text-[#1e3a8a] mt-1 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#1d4ed8] focus:outline-none"
                    />
                    <input
                      type="text"
                      value={compilerSubHeader}
                      onChange={(e) => setCompilerSubHeader(e.target.value)}
                      className="w-full text-center text-[9.5pt] font-medium text-neutral-700 mt-0.5 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#1d4ed8] focus:outline-none"
                    />

                    {/* 5-Column Metadata Summary Bar */}
                    <div className="grid grid-cols-5 gap-2 mt-3 pt-2.5 border-t border-[#cbd5e1] text-left">
                      <div className="p-1.5 rounded bg-white border border-neutral-300">
                        <div className="text-[7.5pt] font-mono uppercase text-neutral-500">
                          Số lượng bài học
                        </div>
                        <div className="text-[10pt] font-extrabold text-[#1e3a8a] font-mono">
                          {tocPaginationData.totalLessons} bài trọng tâm
                        </div>
                      </div>
                      <div className="p-1.5 rounded bg-white border border-neutral-300">
                        <div className="text-[7.5pt] font-mono uppercase text-neutral-500">
                          Cấu trúc đề mục
                        </div>
                        <div className="text-[10pt] font-extrabold text-[#15803d] font-mono">
                          {tocPaginationData.totalPillars} mục lớn (Cấp 1)
                        </div>
                      </div>
                      <div className="p-1.5 rounded bg-white border border-neutral-300">
                        <div className="text-[7.5pt] font-mono uppercase text-neutral-500">
                          Tổng ý chấm Barem
                        </div>
                        <div className="text-[10pt] font-extrabold text-[#b45309] font-mono">
                          {tocPaginationData.totalRubricItems} ý ({tocPaginationData.totalKeywords} từ khóa)
                        </div>
                      </div>
                      <div className="p-1.5 rounded bg-white border border-neutral-300">
                        <div className="text-[7.5pt] font-mono uppercase text-neutral-500">
                          Định dạng bản in
                        </div>
                        <div className="text-[9pt] font-bold text-black truncate">
                          {templateDisplayName}
                        </div>
                      </div>
                      <div className="p-1.5 rounded bg-[#eff6ff] border border-[#93c5fd]">
                        <div className="text-[7.5pt] font-mono uppercase text-[#1d4ed8] font-bold">
                          Tổng quy mô tài liệu
                        </div>
                        <div
                          data-sync-total-pages-box="true"
                          data-orientation={isLandscape ? 'Ngang' : 'Dọc'}
                          className="text-[10.5pt] font-extrabold text-[#1e3a8a] font-mono"
                        >
                          {String(tocPaginationData.totalDocumentPages).padStart(
                            2,
                            '0'
                          )}{' '}
                          trang A4 ({isLandscape ? 'Ngang' : 'Dọc'})
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Table of Contents with Clean Sub-Pillars, Right-Aligned Page Badges & Barem */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h3 className="text-[10.5pt] font-extrabold uppercase text-[#1e3a8a]">
                        📖 MỤC LỤC CHI TIẾT & BẢNG ĐỊNH VỊ SỐ TRANG (
                        {tocPaginationData.totalLessons} BÀI HỌC ·{' '}
                        <span data-sync-total-pages-inline="true">
                          {tocPaginationData.totalDocumentPages}
                        </span>{' '}
                        TRANG):
                      </h3>
                      <span className="text-[8.5pt] font-mono text-neutral-600">
                        Ngày xuất bản: {new Date().toLocaleDateString('vi-VN')}
                      </span>
                    </div>

                    <table
                      style={{ fontSize: '9.5pt', lineHeight: 1.35 }}
                      className="w-full border border-black bg-white text-black"
                    >
                      <thead>
                        <tr className="bg-[#eff6ff] border-b-2 border-black font-bold text-[#1e3a8a]">
                          <th
                            style={{ padding: '5px 6px' }}
                            className="border border-black w-[64px] text-center"
                          >
                            Câu / Bài
                          </th>
                          <th
                            style={{ padding: '5px 8px' }}
                            className="border border-black text-left"
                          >
                            Tên Bài Học & Đề Mục Trọng Tâm (Mục 1, 2, 3...)
                          </th>
                          <th
                            style={{ padding: '5px 8px' }}
                            className="border border-black text-left w-[142px]"
                          >
                            Học Phần / Khoa
                          </th>
                          <th
                            style={{ padding: '5px 6px' }}
                            className="border border-black text-center w-[122px]"
                          >
                            Cấu Trúc & Barem
                          </th>
                          <th
                            style={{ padding: '5px 6px' }}
                            className="border border-black text-center w-[104px]"
                          >
                            Tiến Độ Ôn Tập
                          </th>
                          <th
                            style={{ padding: '5px 6px' }}
                            className="border border-black text-center w-[80px] bg-[#dbeafe]"
                          >
                            Số Trang
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {tocPaginationData.lessonsMeta.map((meta, idx) => (
                          <tr
                            key={meta.lessonId || `toc-${idx}`}
                            className="border-b border-black align-top avoid-break"
                          >
                            {/* Column 1: Clean Short Badge (CÂU 01 / BÀI 01) */}
                            <td
                              style={{ padding: '6px 5px' }}
                              className="border border-black text-center font-mono font-extrabold text-[9pt] text-[#1e3a8a] bg-neutral-50"
                            >
                              <div>{meta.shortBadge}</div>
                              {meta.naturalNum !== null &&
                                meta.naturalNum !== idx + 1 && (
                                  <div className="text-[7.5pt] font-normal text-neutral-500 mt-0.5">
                                    (#{idx + 1})
                                  </div>
                                )}
                            </td>

                            {/* Column 2: Clean Topic Title + Right-Aligned Grid Sub-Pillars */}
                            <td
                              style={{ padding: '6px 8px' }}
                              className="border border-black text-[#111827]"
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="font-extrabold text-[10pt] text-[#1e3a8a]">
                                  {meta.cleanTopicTitle || meta.title}
                                </span>
                                <span
                                  data-sync-toc-count={meta.sectionKey}
                                  className="text-[8.2pt] font-mono font-bold text-[#1d4ed8] shrink-0"
                                >
                                  ({meta.pageCount} trang A4)
                                </span>
                              </div>

                              {tocShowSubPillars && meta.pillars.length > 0 && (
                                <div className="mt-1.5 pt-1 border-t border-dashed border-neutral-300 space-y-1">
                                  {meta.pillars.map((p) => (
                                    <div
                                      key={p.id}
                                      className="grid grid-cols-[1fr_auto] items-baseline gap-2 text-[8.6pt] text-neutral-800"
                                    >
                                      <div className="min-w-0 truncate pr-1">
                                        <span className="font-mono font-bold text-[#1d4ed8] mr-1">
                                          Mục {p.index}.
                                        </span>
                                        <span className="font-semibold text-neutral-900">
                                          {p.label}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-end gap-1.5 shrink-0 font-mono whitespace-nowrap">
                                        <span className="text-[7.8pt] text-neutral-500">
                                          {p.lvl2Count > 0
                                            ? `${p.lvl2Count} ý · `
                                            : ''}
                                          {p.points.toFixed(2)}đ
                                        </span>
                                        <span
                                          data-sync-toc-pillar={meta.sectionKey}
                                          data-pillar-ratio={p.offsetRatio.toFixed(
                                            4
                                          )}
                                          className="font-bold text-[8.2pt] text-[#1e3a8a] bg-[#eff6ff] px-1.5 py-0.2 rounded-xs border border-[#bfdbfe] min-w-[46px] text-center"
                                        >
                                          Tr. {String(p.pageNumber).padStart(2, '0')}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </td>

                            {/* Column 3: System & Subject + Status */}
                            <td
                              style={{ padding: '6px 8px' }}
                              className="border border-black text-neutral-800 text-[8.8pt]"
                            >
                              <div className="font-semibold text-black">
                                {meta.sysName}
                              </div>
                              <div className="text-neutral-600">
                                › {meta.subName}
                              </div>
                              <div className="mt-1 inline-block px-1.5 py-0.2 rounded-xs bg-neutral-100 border border-neutral-300 font-mono text-[7.8pt] text-neutral-700">
                                {meta.statusLabel}
                              </div>
                            </td>

                            {/* Column 4: Structure & Barem Summary */}
                            <td
                              style={{ padding: '6px 6px' }}
                              className="border border-black text-center font-mono text-[8.5pt]"
                            >
                              <div className="font-bold text-black">
                                {meta.pillarCount} mục lớn · {meta.lvl2TotalCount} ý
                              </div>
                              <div className="text-neutral-700 mt-0.5">
                                {meta.rubricItemsCount} tiêu chí ({meta.keywordsCount} từ khóa)
                              </div>
                              <div className="mt-0.5 font-bold text-[#15803d]">
                                Barem: {meta.totalPoints.toFixed(1)}đ
                              </div>
                            </td>

                            {/* Column 5: Study Progress Checkboxes */}
                            <td
                              style={{ padding: '6px 6px' }}
                              className="border border-black text-left font-mono text-[8.2pt] leading-relaxed"
                            >
                              <div>[ ] Ôn lần 1</div>
                              <div>[ ] Ôn lần 2</div>
                              <div className="font-bold text-black">
                                [ ] Đã thuộc
                              </div>
                            </td>

                            {/* Column 6: Page Numbers */}
                            <td
                              style={{ padding: '6px 6px' }}
                              className="border border-black text-center font-mono bg-[#f8fafc]"
                            >
                              <div
                                data-sync-toc-range={meta.sectionKey}
                                className="inline-block px-1.5 py-0.5 rounded bg-[#dbeafe] border border-[#3b82f6] font-extrabold text-[9.5pt] text-[#1e3a8a]"
                              >
                                {meta.pageRangeLabel}
                              </div>
                              <div
                                data-sync-toc-count={meta.sectionKey}
                                className="text-[7.8pt] text-neutral-600 mt-0.5"
                              >
                                ({meta.pageCount} trang A4)
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-neutral-100 border-t-2 border-black font-bold text-[9pt] text-black">
                          <td
                            colSpan={3}
                            style={{ padding: '5px 8px' }}
                            className="border border-black text-right uppercase"
                          >
                            Tổng cộng toàn bộ Tập Đề Cương ({tocPaginationData.totalLessons} bài):
                          </td>
                          <td
                            style={{ padding: '5px 6px' }}
                            className="border border-black text-center font-mono"
                          >
                            {tocPaginationData.totalPillars} mục ·{' '}
                            {tocPaginationData.totalRubricItems} ý Barem
                          </td>
                          <td
                            style={{ padding: '5px 6px' }}
                            className="border border-black text-center font-mono text-[8.2pt]"
                          >
                            Đạt: .... / {tocPaginationData.totalLessons} bài
                          </td>
                          <td
                            data-sync-total-pages-footer="true"
                            style={{ padding: '5px 6px' }}
                            className="border border-black text-center font-mono font-extrabold text-[#1e3a8a] bg-[#dbeafe]"
                          >
                            {tocPaginationData.totalDocumentPages} trang
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Running Footer on Cover / TOC Page */}
                <div className="mt-2 pt-1.5 border-t border-neutral-400 flex items-center justify-between gap-2 text-[8pt] font-mono text-neutral-700">
                  <div>
                    MedMind Print Studio Pro · Bảng Mục Lục & Định Vị Trang Tự Động
                  </div>
                  <div className="font-bold text-[#1e3a8a]">
                    Trang 01 / Tổng{' '}
                    <span data-sync-total-pages-inline="true">
                      {String(tocPaginationData.totalDocumentPages).padStart(
                        2,
                        '0'
                      )}
                    </span>{' '}
                    trang
                  </div>
                </div>

                <div className="screen-page-divider mt-4 py-1.5 border-y-2 border-dashed border-[#3b82f6] bg-[#eff6ff] text-center text-[11px] font-mono font-bold text-[#1d4ed8]">
                  ✂️ ————— HẾT TRANG BÌA & MỤC LỤC · BẮT ĐẦU NỘI DUNG{' '}
                  {tocPaginationData.lessonsMeta[0]?.shortBadge || 'BÀI 01'} (
                  {tocPaginationData.lessonsMeta[0]?.pageRangeLabel || 'Tr. 02'}) —————
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* SEQUENTIAL MULTI-LESSON RENDERER WITH PAGE BREAKS             */}
            {/* ============================================================= */}
            <div className="space-y-4 bg-white text-[#111827]">
              {renderedLessonSheets}
            </div>
          </div>
        </div>

        <style>{`
          @page {
            size: ${isLandscape ? 'A4 landscape' : 'A4 portrait'};
            margin: 10mm;
          }
          #medmind-print-portal {
            display: none;
          }
          .bw-print-sheet * {
            filter: grayscale(100%) contrast(115%);
          }
          @media print {
            body > *:not(#medmind-print-portal) {
              display: none !important;
            }
            html, body {
              background-color: #ffffff !important;
              color: #111827 !important;
              height: auto !important;
              overflow: visible !important;
              margin: 0 !important;
              padding: 0 !important;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            #medmind-print-portal {
              display: block !important;
              position: static !important;
              width: 100% !important;
              height: auto !important;
              overflow: visible !important;
              background-color: #ffffff !important;
              color: #111827 !important;
              margin: 0 !important;
              padding: 0 !important;
            }
            .screen-page-divider, .no-print {
              display: none !important;
            }
            .a4-page-break {
              page-break-after: always !important;
              break-after: page !important;
            }
            tr, .avoid-break {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};



