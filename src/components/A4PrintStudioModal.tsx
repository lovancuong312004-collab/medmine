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
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas-pro';
import {
  MedMindDatabase,
  LessonMindmap,
  MindmapNode,
} from '../types/mindmap';
import { cleanNodeLabel } from '../utils/mindmapLayout';
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
  onClose: () => void;
}

export type PrintTemplateType =
  | 'barem_outline'
  | 'infographic_landscape'
  | 'horizontal_tree'
  | 'cornell_note'
  | 'fishbone_flowchart'
  | 'blank_worksheet';

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

/**
 * Helper: Render text with automatic bold + underline on the medical keyword before ':'
 * for black-and-white / color A4 paper printing
 */
function renderPrintableKeywordText(
  rawText: unknown,
  highlightBgColor?: string
): React.ReactNode {
  const cleaned = cleanNodeLabel(rawText);
  const colonIdx = cleaned.indexOf(':');
  if (colonIdx > 0 && colonIdx <= 58) {
    const keyword = cleaned.slice(0, colonIdx);
    const rest = cleaned.slice(colonIdx);
    if (highlightBgColor) {
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
  // 1. MULTI-LESSON BATCH SELECTION STATE
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
  // 2. 6 PRINT TEMPLATES & TEMPLATE-SPECIFIC OPTIONS
  // ==========================================================================
  const [template, setTemplate] = useState<PrintTemplateType>('barem_outline');
  const [totalPointsScale, setTotalPointsScale] = useState<number>(5.0);

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

  const printSheetRef = useRef<HTMLDivElement | null>(null);
  const hiddenPrintIframeRef = useRef<HTMLIFrameElement | null>(null);

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

  // Resolve the final list of lessons to print based on `batchMode` (Guaranteed non-empty!)
  const { lessonsToPrint, autoFallbackReason } = useMemo(() => {
    if (batchMode === 'current') {
      return {
        lessonsToPrint: [currentLessonObj],
        autoFallbackReason: null as string | null,
      };
    }

    if (batchMode === 'folder') {
      if (folderTarget === 'all_library') {
        return {
          lessonsToPrint:
            allLessons.length > 0 ? allLessons : [currentLessonObj],
          autoFallbackReason: null,
        };
      }
      if (folderTarget === 'subject') {
        const list = allLessons.filter(
          (l) => l?.subjectId && l.subjectId === currentLessonObj.subjectId
        );
        if (list.length > 0) {
          return {
            lessonsToPrint: list,
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
            lessonsToPrint: list,
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
      return { lessonsToPrint: picked, autoFallbackReason: null };
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
    template === 'fishbone_flowchart';

  // ==========================================================================
  // 3. TABLE OF CONTENTS & PAGE NUMBERING ENGINE (`tocPaginationData`)
  // ==========================================================================
  const tocPaginationData = useMemo(() => {
    // Estimate how many A4 pages the Cover & TOC itself occupies
    const totalRawPillars = lessonsToPrint.reduce((acc, l) => {
      const pLen = Array.isArray(l?.rootNode?.children)
        ? l.rootNode.children.length
        : 0;
      return acc + pLen;
    }, 0);
    const effectiveTocRowUnits =
      lessonsToPrint.length * 2 + (tocShowSubPillars ? totalRawPillars : 0);
    const tocPageCount = includeCoverAndToc
      ? Math.max(1, Math.ceil(effectiveTocRowUnits / 28))
      : 0;

    let runningCurrentPage = includeCoverAndToc ? tocPageCount + 1 : 1;
    let totalPillars = 0;
    let totalRubricItems = 0;
    let totalKeywords = 0;

    const lessonsMeta: TocLessonPageMeta[] = lessonsToPrint.map(
      (rawLesson, idx) => {
        const lesson = normalizeLessonForPrint(rawLesson, idx);
        const lRoot = lesson.rootNode;
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

        const lessonStartPage = runningCurrentPage;
        // 1 A4 page = 100 density units; header takes ~14 units
        let accumulatedUnits = 14;
        let lvl2TotalCount = 0;

        const pillarsMeta: TocPillarPageMeta[] = targetPillars.map(
          (pillar, pIdx) => {
            const pillarPageNumber =
              lessonStartPage + Math.floor(accumulatedUnits / 100);
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

            // Estimate vertical height units for this pillar depending on template
            let pillarUnits = 12;
            if (template === 'barem_outline' || template === 'cornell_note') {
              pillarUnits =
                8 +
                Math.max(1, lvl2Nodes.length) * 7 +
                lvl3Count * 2.4;
            } else if (template === 'horizontal_tree') {
              pillarUnits =
                7 +
                Math.max(1, lvl2Nodes.length) * 6.5 +
                lvl3Count * 2.1;
            } else if (
              template === 'infographic_landscape' ||
              template === 'fishbone_flowchart'
            ) {
              pillarUnits =
                6 +
                Math.max(1, lvl2Nodes.length) * 4.5 +
                lvl3Count * 1.4;
            } else if (template === 'blank_worksheet') {
              pillarUnits =
                10 +
                Math.max(1, lvl2Nodes.length) * (worksheetLinesPerItem * 3.5);
            }

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
              pageNumber: pillarPageNumber,
            };
          }
        );

        const lessonPageCount = Math.max(
          1,
          Math.ceil(accumulatedUnits / 100)
        );
        const lessonEndPage = lessonStartPage + lessonPageCount - 1;
        runningCurrentPage = lessonEndPage + 1;

        const lessonKeywordsCount = rubricCriteria.reduce(
          (sum, c) => sum + c.requiredKeywords.length,
          0
        );

        totalPillars += targetPillars.length;
        totalRubricItems += rubricCriteria.length;
        totalKeywords += lessonKeywordsCount;

        const statusLabel =
          lesson.status === 'mastered'
            ? 'Đã thuộc'
            : lesson.status === 'reviewing'
            ? 'Đang ôn'
            : 'Trọng tâm';

        const pageRangeLabel =
          lessonStartPage === lessonEndPage
            ? `Tr. ${String(lessonStartPage).padStart(2, '0')}`
            : `Tr. ${String(lessonStartPage).padStart(2, '0')}–${String(
                lessonEndPage
              ).padStart(2, '0')}`;

        return {
          lessonId: lesson.id || `lesson-${idx}`,
          lessonIndex: idx,
          title: cleanNodeLabel(
            lRoot.label || lesson.title || `Bài học ${idx + 1}`
          ),
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
   * 1-CLICK DIRECT PDF FILE EXPORT (`.pdf` download using html2canvas-pro + jsPDF)
   * Works 100% reliably inside sandboxed iframes, mobile browsers, and desktop without print dialog issues.
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

      const allSlices: RenderedPageSlice[] = [];

      for (let sIdx = 0; sIdx < targets.length; sIdx++) {
        const sectionEl = targets[sIdx];
        const sectionLabel =
          sectionEl.getAttribute('data-section-label') ||
          `Phần ${sIdx + 1}/${targets.length}`;
        setPdfExportProgress(
          `Đang kết xuất trang in (${sIdx + 1}/${targets.length})...`
        );

        // Give React / UI thread a frame to update progress text
        await new Promise((r) => setTimeout(r, 40));

        const canvas = await html2canvas(sectionEl, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          logging: false,
          ignoreElements: (el) =>
            el.classList.contains('screen-page-divider') ||
            el.classList.contains('no-print'),
        });

        // Calculate ideal pixel height corresponding to 1 A4 printable content area
        const pxPerMm = canvas.width / contentWidthMm;
        const idealPageHeightPx = Math.floor(contentMaxHeightMm * pxPerMm);

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
          allSlices.push({
            imgDataUrl: pageCanvas.toDataURL('image/jpeg', 0.94),
            widthMm: contentWidthMm,
            heightMm: Math.min(contentMaxHeightMm, sliceHeightMm),
            sectionLabel,
          });

          currentY += sliceHeightPx;
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
          `MedMind Print Studio Pro  |  Page ${String(pageIdx + 1).padStart(
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
        `Đã xuất thành công file "${fileName}" (${totalPdfPages} trang A4)!`
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
      const lRoot = lesson.rootNode;
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
      const resolvedLessonTitle = cleanNodeLabel(
        lRoot.label || lesson.title || `Bài học ${lessonIndex + 1}`
      );
      const lessonHeaderPrefix = `BÀI ${lessonIndex + 1}: ${resolvedLessonTitle}`;
      const resolvedRootSummary =
        lRoot.summary && lRoot.summary.trim().length > 0
          ? lRoot.summary.trim()
          : `Hệ thống hóa ${targetPillars.length} nhánh trọng tâm: ${targetPillars
              .map((p, i) => `(${i + 1}) ${cleanNodeLabel(p.label)}`)
              .join(' · ')}.`;

      const lessonPageMeta = tocPaginationData.lessonsMeta[lessonIndex];
      const lessonPageBadge = lessonPageMeta
        ? `${lessonPageMeta.pageRangeLabel} / Tổng ${String(
            tocPaginationData.totalDocumentPages
          ).padStart(2, '0')} tr.`
        : `Trang ${String(lessonIndex + 1).padStart(2, '0')}`;

      return (
        <LessonPrintErrorBoundary
          key={lesson.id || `lesson-${lessonIndex}`}
          lessonTitle={lesson.title}
        >
          <div
            data-section-label={`Bài ${lessonIndex + 1}: ${resolvedLessonTitle}`}
            className={`a4-print-section bg-white text-[#111827] ${
              lessonIndex < totalLessons - 1 ? 'a4-page-break pb-2' : ''
            }`}
          >
            {/* Running Top Page Header Bar with Page Number */}
            <div className="flex items-center justify-between gap-2 pb-1 mb-1.5 border-b border-neutral-300 text-[8pt] font-mono text-neutral-600">
              <div className="truncate">
                📖 {bookletTitle} · <strong>{sysName} › {subName}</strong>
              </div>
              <div className="shrink-0 flex items-center gap-2">
                <span>
                  Bài {String(lessonIndex + 1).padStart(2, '0')}/
                  {String(totalLessons).padStart(2, '0')}
                </span>
                <span className="px-1.5 py-0.2 rounded-xs bg-[#eff6ff] border border-[#93c5fd] text-[#1e3a8a] font-bold">
                  📄 {lessonPageBadge}
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
                        className="relative flex items-start w-full avoid-break"
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
                              fontSize: '11pt',
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
                            gap: '6px',
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
                                    padding: '6px 10px',
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
                                      fontSize: '11pt',
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
                                        style={{ fontSize: '9.5pt' }}
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
                                        fontSize: '9.5pt',
                                        lineHeight: 1.35,
                                      }}
                                      className="mt-1 pl-2.5 border-l border-neutral-400 space-y-0.5 text-[#111827] hd-bullet"
                                    >
                                      {lvl3Nodes.map((lvl3) => (
                                        <div
                                          key={lvl3.id}
                                          style={{ lineHeight: 1.35 }}
                                        >
                                          •{' '}
                                          {renderPrintableKeywordText(
                                            lvl3.label,
                                            theme.highlightBg
                                          )}
                                          {lvl3.summary && (
                                            <span className="text-neutral-700">
                                              {' '}
                                              ({lvl3.summary})
                                            </span>
                                          )}
                                          {lvl3.children &&
                                            lvl3.children.length > 0 && (
                                              <div className="pl-3 mt-0.5 space-y-0.5 text-[9pt] text-neutral-800">
                                                {lvl3.children.map((lvl4) => (
                                                  <div key={lvl4.id}>
                                                    ◦{' '}
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
                      <strong>Định nghĩa & Trọng tâm:</strong>{' '}
                      {resolvedRootSummary}
                    </div>
                  </div>
                  <div className="text-right text-[8.5pt] font-mono shrink-0">
                    <div>Ngày ôn: ..../..../202..</div>
                    <div className="mt-0.5">[ ] Lần 1 &nbsp; [ ] Lần 2</div>
                  </div>
                </div>

                {/* Cornell 2-Column Body: 24% Left Cues | 76% Right Detailed Notes */}
                <div className="divide-y divide-black">
                  <div className="flex bg-neutral-200 font-extrabold text-[9.5pt] uppercase text-black">
                    <div
                      style={{ width: '24%', padding: '5px 8px' }}
                      className="border-r-2 border-black shrink-0"
                    >
                      MỤC LỚN & TRỌNG TÂM (24%)
                    </div>
                    <div
                      style={{ width: '76%', padding: '5px 10px' }}
                      className="flex-1"
                    >
                      GHI CHÉP PHÂN CẤP CHI TIẾT & TỪ KHÓA (76%)
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
                        className="flex avoid-break bg-white"
                      >
                        {/* Left Column (24%) */}
                        <div
                          style={{ width: '24%', padding: '6px 10px' }}
                          className="shrink-0 border-r-2 border-black bg-neutral-50/70"
                        >
                          <div
                            style={{
                              color: theme.headerBg,
                              fontSize: '8.5pt',
                            }}
                            className="font-mono font-bold uppercase"
                          >
                            MỤC LỚN {pIdx + 1}
                          </div>
                          <h3
                            style={{ fontSize: '11pt', lineHeight: 1.35 }}
                            className="font-extrabold text-black mt-0.5"
                          >
                            {cleanNodeLabel(pillar.label)}
                          </h3>

                          {pillar.summary && lvl2Nodes.length === 0 && (
                            <div
                              style={{
                                fontSize: '9pt',
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
                            <div className="mt-1 space-y-0.5 text-[8.5pt] text-neutral-900">
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

                        {/* Right Column (76%) */}
                        <div
                          style={{
                            width: '76%',
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
                              <div key={lvl2.id} className="avoid-break">
                                <div
                                  style={{
                                    fontSize: '10.5pt',
                                    lineHeight: 1.35,
                                  }}
                                  className="font-bold text-black flex items-baseline gap-1"
                                >
                                  <span
                                    style={{ color: theme.headerBg }}
                                    className="font-mono font-extrabold"
                                  >
                                    {pIdx + 1}.{l2Idx + 1}.
                                  </span>
                                  <span
                                    style={{
                                      backgroundColor: theme.highlightBg,
                                    }}
                                    className="px-1 py-0.2 rounded-xs border-b border-black/30"
                                  >
                                    {cleanNodeLabel(lvl2.label)}
                                  </span>
                                  {lvl2.summary && lvl3Nodes.length === 0 && (
                                    <span
                                      style={{ fontSize: '9.5pt' }}
                                      className="font-normal text-neutral-800 italic"
                                    >
                                      — {lvl2.summary}
                                    </span>
                                  )}
                                </div>

                                {lvl3Nodes.length > 0 && (
                                  <ul
                                    style={{
                                      fontSize: '9.5pt',
                                      lineHeight: 1.35,
                                    }}
                                    className="pl-4 mt-0.5 space-y-0.5 text-[#111827]"
                                  >
                                    {lvl3Nodes.map((lvl3) => (
                                      <li key={lvl3.id}>
                                        <span className="font-bold mr-1">
                                          •
                                        </span>
                                        {renderPrintableKeywordText(
                                          lvl3.label,
                                          '#fef08a'
                                        )}
                                        {lvl3.summary && (
                                          <span className="text-neutral-700">
                                            {' '}
                                            — {lvl3.summary}
                                          </span>
                                        )}
                                        {lvl3.children &&
                                          lvl3.children.length > 0 && (
                                            <ul className="pl-3 mt-0.5 space-y-0.5 text-[9pt] text-neutral-800">
                                              {lvl3.children.map((lvl4) => (
                                                <li key={lvl4.id}>
                                                  ◦{' '}
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
                                  <div className="pl-4 mt-0.5 space-y-0.5 text-[9pt] font-medium text-neutral-900">
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

            {/* Running Bottom Page Footer with Page Number & Barem Summary */}
            <div className="mt-2.5 pt-1.5 border-t border-neutral-400 flex items-center justify-between gap-2 text-[8pt] font-mono text-neutral-700 avoid-break">
              <div>
                MedMind Print Studio Pro · Chuẩn Barem Tự Luận Y Khoa
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
      : 'Đề Thi Tự Luận Khuyết Chữ';

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
      <div className="w-full max-w-[1440px] h-[95vh] bg-[#131314] border border-[#2d2e30] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* ================================================================= */}
        {/* 1. TOP HEADER BAR                                                 */}
        {/* ================================================================= */}
        <div className="px-5 py-3 bg-[#1e1f20] border-b border-[#2d2e30] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#3f3c5c] border border-[#8ab4f8]/50 flex items-center justify-center text-lg">
              🖨️
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-display font-bold text-[15.5px] text-white">
                  Print Studio Pro — Xuất PDF / Đóng Quyển Đề Cương A4
                </h2>
                <span className="text-[11px] font-mono text-[#81c995] bg-[#10b981]/15 border border-[#10b981]/40 px-2 py-0.5 rounded-md">
                  {lessonsToPrint.length} bài · Ước tính{' '}
                  {tocPaginationData.totalDocumentPages} trang A4
                </span>
              </div>
              <p className="text-[11.5px] text-[#9aa0a6]">
                6 mẫu bản in A4 nền trắng chữ đen · Mục lục tự động đánh số trang chi tiết từng bài & từng mục lớn
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
        {/* 2. ROW 1: 6 PRINT TEMPLATES BAR                                   */}
        {/* ================================================================= */}
        <div className="px-5 py-2.5 bg-[#18191b] border-b border-[#2d2e30] flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1 bg-[#131314] p-1 rounded-xl border border-[#2d2e30]">
            {[
              {
                id: 'barem_outline',
                label: '📋 1. Barem Tự Luận',
                icon: FileText,
              },
              {
                id: 'infographic_landscape',
                label: '📊 2. Infographic Cột',
                icon: Columns,
              },
              {
                id: 'horizontal_tree',
                label: '🌳 3. Sơ Đồ Cây Ngang',
                icon: GitCommitHorizontal,
              },
              {
                id: 'cornell_note',
                label: '📝 4. Vở Gạch Ý Cornell',
                icon: BookOpen,
              },
              {
                id: 'fishbone_flowchart',
                label: '🐟 5. Xương Cá / Lưu Đồ',
                icon: Share2,
              },
              {
                id: 'blank_worksheet',
                label: '✍️ 6. Đề Khuyết Chữ (Luyện Viết)',
                icon: Edit3,
              },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => setTemplate(t.id as PrintTemplateType)}
                className={`px-2.5 py-1.5 rounded-lg text-[12px] font-display font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
                  template === t.id
                    ? 'bg-[#8ab4f8] text-[#131314] shadow-sm'
                    : 'text-[#e3e3e3] hover:bg-[#242528]'
                }`}
              >
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Template-specific quick options */}
          <div className="flex flex-wrap items-center gap-2">
            {(template === 'barem_outline' ||
              template === 'blank_worksheet') && (
              <div className="flex items-center gap-1 bg-[#131314] border border-[#2d2e30] rounded-lg p-1">
                <span className="text-[11px] text-[#9aa0a6] px-1.5">
                  Thang điểm:
                </span>
                {[4.0, 5.0, 10.0].map((pts) => (
                  <button
                    key={pts}
                    onClick={() => setTotalPointsScale(pts)}
                    className={`px-2 py-0.5 rounded text-[11.5px] font-mono font-semibold cursor-pointer ${
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
              <div className="flex items-center gap-1 bg-[#131314] border border-[#2d2e30] rounded-lg p-1">
                <button
                  onClick={() => setInfographicColLayout('3_per_row')}
                  className={`px-2.5 py-1 rounded text-[11.5px] font-medium cursor-pointer ${
                    infographicColLayout === '3_per_row'
                      ? 'bg-[#3f3c5c] text-white'
                      : 'text-[#9aa0a6] hover:text-white'
                  }`}
                >
                  Lưới 3 cột / hàng
                </button>
                <button
                  onClick={() => setInfographicColLayout('all_in_one_row')}
                  className={`px-2.5 py-1 rounded text-[11.5px] font-medium cursor-pointer ${
                    infographicColLayout === 'all_in_one_row'
                      ? 'bg-[#3f3c5c] text-white'
                      : 'text-[#9aa0a6] hover:text-white'
                  }`}
                >
                  Tất cả cột 1 hàng ngang
                </button>
              </div>
            )}

            {template === 'fishbone_flowchart' && (
              <div className="flex items-center gap-1 bg-[#131314] border border-[#2d2e30] rounded-lg p-1">
                <button
                  onClick={() => setFishboneOrFlowchart('fishbone')}
                  className={`px-2.5 py-1 rounded text-[11.5px] font-medium cursor-pointer ${
                    fishboneOrFlowchart === 'fishbone'
                      ? 'bg-[#3f3c5c] text-white'
                      : 'text-[#9aa0a6] hover:text-white'
                  }`}
                >
                  🐟 Sơ đồ Xương Cá Ishikawa
                </button>
                <button
                  onClick={() => setFishboneOrFlowchart('flowchart')}
                  className={`px-2.5 py-1 rounded text-[11.5px] font-medium cursor-pointer ${
                    fishboneOrFlowchart === 'flowchart'
                      ? 'bg-[#3f3c5c] text-white'
                      : 'text-[#9aa0a6] hover:text-white'
                  }`}
                >
                  ⬇️ Lưu đồ Mũi tên dọc
                </button>
              </div>
            )}

            {template === 'blank_worksheet' && (
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setWorksheetShowLevel2((prev) => !prev)}
                  className={`px-2.5 py-1 rounded-lg border text-[11.5px] font-medium flex items-center gap-1 cursor-pointer ${
                    worksheetShowLevel2
                      ? 'bg-[#242528] border-[#8ab4f8]/60 text-white'
                      : 'bg-[#131314] border-[#2d2e30] text-[#9aa0a6]'
                  }`}
                >
                  {worksheetShowLevel2 && (
                    <Check className="w-3 h-3 text-[#8ab4f8]" />
                  )}
                  <span>Gợi ý mục Cấp 2</span>
                </button>

                <select
                  value={worksheetLinesPerItem}
                  onChange={(e) =>
                    setWorksheetLinesPerItem(Number(e.target.value))
                  }
                  className="bg-[#242528] border border-[#3c4043] rounded-lg px-2 py-1 text-[11.5px] text-white cursor-pointer"
                >
                  <option value={3}>3 dòng chấm / ý</option>
                  <option value={5}>5 dòng chấm / ý</option>
                  <option value={7}>7 dòng chấm / ý</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* ================================================================= */}
        {/* 3. ROW 2: MULTI-LESSON BATCH SCOPE & COVER/TOC BAR                */}
        {/* ================================================================= */}
        <div className="px-5 py-2.5 bg-[#161719] border-b border-[#2d2e30] flex flex-wrap items-center justify-between gap-3 shrink-0 relative">
          {/* Left: 3 Batch Scope Modes */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[11.5px] text-[#9aa0a6] font-medium">
              Chế độ gộp bài in:
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
                  ☑️ Chọn nhiều bài tùy ý ({lessonsToPrint.length}/
                  {allLessons.length})
                </span>
                <ChevronDown className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Sub-selector depending on batchMode */}
            {batchMode === 'current' && (
              <select
                value={singleLessonPillarScope}
                onChange={(e) => setSingleLessonPillarScope(e.target.value)}
                className="bg-[#242528] border border-[#3c4043] rounded-lg px-2.5 py-1 text-[12px] text-white max-w-[230px] truncate cursor-pointer"
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
                  className={`px-2.5 py-0.5 rounded text-[11.5px] font-medium cursor-pointer ${
                    folderTarget === 'subject'
                      ? 'bg-[#8ab4f8] text-[#131314] font-bold'
                      : 'text-[#e3e3e3]'
                  }`}
                >
                  Học phần: {subjectName || 'Hiện tại'}
                </button>
                <button
                  onClick={() => setFolderTarget('system')}
                  className={`px-2.5 py-0.5 rounded text-[11.5px] font-medium cursor-pointer ${
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
                    className={`px-2.5 py-0.5 rounded text-[11.5px] font-medium cursor-pointer ${
                      folderTarget === 'all_library'
                        ? 'bg-[#8ab4f8] text-[#131314] font-bold'
                        : 'text-[#e3e3e3]'
                    }`}
                  >
                    Toàn bộ thư viện ({allLessons.length} bài)
                  </button>
                )}
              </div>
            )}
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
          {/* MULTI-SELECT LESSON PICKER POPOVER                              */}
          {/* =============================================================== */}
          {batchMode === 'custom' && isMultiSelectOpen && (
            <div className="absolute top-full left-5 mt-1 w-full max-w-[540px] bg-[#1e1f20] border border-[#8ab4f8]/60 rounded-2xl shadow-2xl z-40 p-4">
              <div className="flex items-center justify-between gap-2 pb-2.5 mb-2.5 border-b border-[#2d2e30]">
                <div className="flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-[#8ab4f8]" />
                  <span className="font-display font-bold text-[13.5px] text-white">
                    Chọn các bài học muốn in gộp ({lessonsToPrint.length}/
                    {allLessons.length})
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setBatchFallbackNotice(null);
                      setSelectedLessonIds(allLessons.map((l) => l.id));
                    }}
                    className="px-2 py-1 rounded bg-[#3f3c5c] hover:bg-[#4e4a70] text-[11px] font-semibold text-white cursor-pointer"
                  >
                    Chọn tất cả ({allLessons.length})
                  </button>
                  <button
                    onClick={() => {
                      setBatchFallbackNotice(null);
                      setSelectedLessonIds([currentLessonObj.id]);
                    }}
                    className="px-2 py-1 rounded bg-[#242528] hover:bg-[#2d2e30] text-[11px] text-[#9aa0a6] hover:text-white cursor-pointer"
                  >
                    Chỉ bài hiện tại
                  </button>
                  <button
                    onClick={() => setIsMultiSelectOpen(false)}
                    className="px-2 py-1 rounded bg-[#8ab4f8] text-[#131314] font-bold text-[11px] cursor-pointer"
                  >
                    Xong
                  </button>
                </div>
              </div>

              {/* Search inside multi-select */}
              <div className="relative mb-2.5">
                <Search className="w-3.5 h-3.5 text-[#9aa0a6] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={lessonSearchQuery}
                  onChange={(e) => setLessonSearchQuery(e.target.value)}
                  placeholder="Tìm kiếm tên bài học để tích chọn..."
                  className="w-full bg-[#131314] border border-[#3c4043] rounded-lg pl-8 pr-3 py-1.5 text-[12px] text-white focus:outline-none focus:border-[#8ab4f8]"
                />
              </div>

              {/* Lesson Checkbox List */}
              <div className="max-h-[260px] overflow-y-auto space-y-1 pr-1">
                {allLessons
                  .filter((l) =>
                    String(l?.title || '')
                      .toLowerCase()
                      .includes(lessonSearchQuery.toLowerCase())
                  )
                  .map((l, idx) => {
                    const checked = selectedLessonIds.includes(l.id);
                    const { sysName, subName } = getLessonPathNames(l);
                    const pCount = Array.isArray(l?.rootNode?.children)
                      ? l.rootNode.children.length
                      : 0;
                    return (
                      <div
                        key={l.id || idx}
                        onClick={() => toggleLessonSelection(l.id)}
                        className={`p-2 rounded-lg border flex items-center justify-between gap-2 cursor-pointer transition-colors ${
                          checked
                            ? 'bg-[#3f3c5c]/40 border-[#8ab4f8]/60 text-white'
                            : 'bg-[#131314] border-[#2d2e30] text-[#9aa0a6] hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          {checked ? (
                            <CheckSquare className="w-4 h-4 text-[#8ab4f8] shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-[#5f6368] shrink-0" />
                          )}
                          <div className="min-w-0">
                            <div className="text-[12.5px] font-semibold truncate">
                              {idx + 1}. {l.title}
                            </div>
                            <div className="text-[10.5px] text-[#9aa0a6] truncate">
                              {sysName} › {subName} · {pCount} mục lớn
                            </div>
                          </div>
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
            }}
            className="mx-auto bg-white text-[#111827] h-auto min-h-max overflow-visible shadow-2xl p-6 md:p-10 rounded-md select-text"
          >
            {/* ============================================================= */}
            {/* COVER PAGE & COMPREHENSIVE TABLE OF CONTENTS WITH PAGE NUMBERS */}
            {/* ============================================================= */}
            {includeCoverAndToc && (
              <div
                data-section-label="Trang Bìa & Mục Lục Đề Cương"
                className="a4-print-section a4-page-break pb-4 mb-4 bg-white text-[#111827]"
              >
                {/* Running Header on Cover / TOC Page */}
                <div className="flex items-center justify-between gap-2 pb-1 mb-1.5 border-b border-neutral-300 text-[8pt] font-mono text-neutral-600">
                  <div>
                    MEDMIND PRINT STUDIO PRO · HỆ THỐNG ĐÓNG QUYỂN ĐỀ CƯƠNG Y KHOA A4
                  </div>
                  <div className="px-1.5 py-0.2 rounded-xs bg-[#eff6ff] border border-[#93c5fd] text-[#1e3a8a] font-bold">
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
                        <div className="text-[10.5pt] font-extrabold text-[#1e3a8a] font-mono">
                          {String(tocPaginationData.totalDocumentPages).padStart(
                            2,
                            '0'
                          )}{' '}
                          trang A4 ({isLandscape ? 'Ngang' : 'Dọc'})
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Detailed Table of Contents with Sub-Pillars, Dot Leaders, Barem & Page Numbers */}
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <h3 className="text-[10.5pt] font-extrabold uppercase text-[#1e3a8a]">
                        📖 MỤC LỤC CHI TIẾT & BẢNG ĐỊNH VỊ SỐ TRANG ({tocPaginationData.totalLessons} BÀI HỌC · {tocPaginationData.totalDocumentPages} TRANG):
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
                            className="border border-black w-[48px] text-center"
                          >
                            Bài
                          </th>
                          <th
                            style={{ padding: '5px 8px' }}
                            className="border border-black text-left"
                          >
                            Tên Bài Học & Đề Mục Chi Tiết (Mục Lớn 1, 2, 3...)
                          </th>
                          <th
                            style={{ padding: '5px 8px' }}
                            className="border border-black text-left w-[150px]"
                          >
                            Học Phần / Khoa
                          </th>
                          <th
                            style={{ padding: '5px 6px' }}
                            className="border border-black text-center w-[125px]"
                          >
                            Cấu Trúc & Barem
                          </th>
                          <th
                            style={{ padding: '5px 6px' }}
                            className="border border-black text-center w-[108px]"
                          >
                            Tiến Độ Ôn Tập
                          </th>
                          <th
                            style={{ padding: '5px 6px' }}
                            className="border border-black text-center w-[76px] bg-[#dbeafe]"
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
                            {/* Column 1: STT */}
                            <td
                              style={{ padding: '6px 6px' }}
                              className="border border-black text-center font-mono font-extrabold text-[9.5pt] text-[#1e3a8a] bg-neutral-50"
                            >
                              BÀI {String(idx + 1).padStart(2, '0')}
                            </td>

                            {/* Column 2: Lesson Title + Optional Detailed Sub-Pillars with Dot Leaders & Page Numbers */}
                            <td
                              style={{ padding: '6px 8px' }}
                              className="border border-black text-[#111827]"
                            >
                              <div className="flex items-baseline justify-between gap-2">
                                <span className="font-extrabold text-[10pt] text-[#1e3a8a]">
                                  {meta.title}
                                </span>
                                <span className="text-[8.5pt] font-mono font-bold text-[#1d4ed8] shrink-0">
                                  ({meta.pageCount} trang)
                                </span>
                              </div>

                              {tocShowSubPillars && meta.pillars.length > 0 && (
                                <div className="mt-1.5 pt-1 border-t border-dashed border-neutral-300 space-y-0.5">
                                  {meta.pillars.map((p) => (
                                    <div
                                      key={p.id}
                                      className="flex items-baseline gap-1 text-[8.8pt] text-neutral-800"
                                    >
                                      <span className="font-semibold text-black shrink-0">
                                        <span className="font-mono font-bold text-[#1d4ed8] mr-1">
                                          {idx + 1}.{p.index}.
                                        </span>
                                        {p.label}
                                      </span>
                                      <span className="flex-1 border-b border-dotted border-neutral-400 mx-1 min-w-[20px]" />
                                      <span className="font-mono text-[8pt] text-neutral-600 shrink-0">
                                        {p.lvl2Count > 0
                                          ? `${p.lvl2Count} mục · `
                                          : ''}
                                        {p.points.toFixed(2)}đ
                                      </span>
                                      <span className="font-mono font-bold text-[8.5pt] text-[#1e3a8a] bg-[#eff6ff] px-1 rounded-xs border border-[#bfdbfe] ml-1 shrink-0">
                                        Tr. {String(p.pageNumber).padStart(2, '0')}
                                      </span>
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
                              <div className="inline-block px-1.5 py-0.5 rounded bg-[#dbeafe] border border-[#3b82f6] font-extrabold text-[9.5pt] text-[#1e3a8a]">
                                {meta.pageRangeLabel}
                              </div>
                              <div className="text-[7.8pt] text-neutral-600 mt-0.5">
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
                    {String(tocPaginationData.totalDocumentPages).padStart(
                      2,
                      '0'
                    )}{' '}
                    trang
                  </div>
                </div>

                <div className="screen-page-divider mt-4 py-1.5 border-y-2 border-dashed border-[#3b82f6] bg-[#eff6ff] text-center text-[11px] font-mono font-bold text-[#1d4ed8]">
                  ✂️ ————— HẾT TRANG BÌA & MỤC LỤC (TRANG 01) · BẮT ĐẦU NỘI DUNG BÀI HỌC 01 (
                  {tocPaginationData.lessonsMeta[0]?.pageRangeLabel || 'Tr. 02'}) —————
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* SEQUENTIAL MULTI-LESSON RENDERER WITH PAGE BREAKS             */}
            {/* ============================================================= */}
            <div className="space-y-4 bg-white text-[#111827]">
              {lessonsToPrint.map((lesson, idx) =>
                renderSingleLessonTemplate(lesson, idx, lessonsToPrint.length)
              )}
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


