import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
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
} from 'lucide-react';
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
    accentText: '#166534',
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
 * and downloaded HTML file render 100% identically without depending on external CDN scripts.
 */
function collectCompiledDocumentStyles(): string {
  const chunks: string[] = [];
  try {
    const styleNodes = document.querySelectorAll('style, link[rel="stylesheet"]');
    styleNodes.forEach((node) => {
      if (node.tagName.toLowerCase() === 'style') {
        chunks.push(`<style>${node.innerHTML}</style>`);
      } else if (node.tagName.toLowerCase() === 'link') {
        const href = (node as HTMLLinkElement).href;
        if (href) {
          chunks.push(`<link rel="stylesheet" href="${href}" />`);
        }
      }
    });
  } catch (e) {
    console.warn('Could not clone document styles:', e);
  }
  return chunks.join('\n');
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

  // Cover & Table of Contents toggle
  const [includeCoverAndToc, setIncludeCoverAndToc] = useState<boolean>(false);
  const [bookletTitle, setBookletTitle] = useState<string>(
    'TẬP ĐỀ CƯƠNG ÔN THI TỰ LUẬN & SƠ ĐỒ HỆ THỐNG HÓA Y KHOA'
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

  // Clean up persistent hidden print iframe when modal unmounts
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
   * Print cleanly via a persistent hidden iframe with cloned compiled styles + inline A4 CSS
   * Works reliably inside AI Studio iframe and standard browsers without blank screens
   */
  const handlePrintA4 = () => {
    if (!printSheetRef.current) return;
    const contentHtml = printSheetRef.current.innerHTML;
    const compiledStyles = collectCompiledDocumentStyles();
    const docTitle =
      lessonsToPrint.length > 1
        ? `Đề Cương Gộp (${lessonsToPrint.length} Bài Học)`
        : lessonTitle || 'Đề Cương Y Khoa';

    try {
      let iframe = hiddenPrintIframeRef.current;
      if (!iframe || !document.body.contains(iframe)) {
        iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
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
  <title>${docTitle} - MedMind A4 Print</title>
  ${compiledStyles}
  <style>
    @page {
      size: A4 ${isLandscape ? 'landscape' : 'portrait'};
      margin: 10mm;
    }
    html, body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #ffffff !important;
      color: #111827 !important;
      margin: 0 !important;
      padding: 0 !important;
      height: auto !important;
      overflow: visible !important;
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
      }, 250);
    } catch (err) {
      console.warn('Print error, falling back to download:', err);
      handleDownloadPrintableHtml();
    }
  };

  /**
   * Download standalone printable A4 HTML file with full embedded CSS + 1-click Print / Auto-Print
   */
  const handleDownloadPrintableHtml = () => {
    if (!printSheetRef.current) return;
    const contentHtml = printSheetRef.current.innerHTML;
    const compiledStyles = collectCompiledDocumentStyles();
    const safeSlug = String(lessonTitle || 'Bai_Hoc')
      .replace(/[^\p{L}\p{N}_-]+/gu, '_')
      .replace(/^_+|_+$/g, '');
    const fileTitle =
      lessonsToPrint.length > 1
        ? `Quyen_De_Cuong_${lessonsToPrint.length}_Bai_Hoc`
        : `De_Cuong_A4_${safeSlug || 'Y_Khoa'}`;

    const fullHtml = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8" />
  <title>${fileTitle}</title>
  ${compiledStyles}
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @page {
      size: A4 ${isLandscape ? 'landscape' : 'portrait'};
      margin: 10mm;
    }
    html, body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background-color: #ffffff !important;
      color: #111827 !important;
      padding: 16px;
      max-width: ${isLandscape ? '297mm' : '210mm'};
      margin: 0 auto;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    @media print {
      html, body { padding: 0 !important; max-width: none !important; }
      .no-print, .screen-page-divider { display: none !important; }
      .a4-page-break {
        page-break-after: always !important;
        break-after: page !important;
      }
    }
    table { border-collapse: collapse; width: 100%; }
    tr, .avoid-break { page-break-inside: avoid; break-inside: avoid; }
  </style>
</head>
<body class="bg-white text-[#111827]">
  <div class="no-print" style="margin-bottom: 16px; padding: 12px 16px; background: #eff6ff; border: 2px solid #1d4ed8; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
    <span style="font-size: 14px; font-weight: 700; color: #1e3a8a;">📄 Bản in A4 Chuẩn (${lessonsToPrint.length} bài học) — Bấm nút bên phải hoặc Ctrl+P để In ra giấy / Lưu thành PDF</span>
    <button onclick="window.print()" style="padding: 8px 18px; background: #1d4ed8; color: #fff; border-radius: 6px; font-weight: 700; cursor: pointer; border: none; white-space: nowrap;">🖨️ In ra giấy / Lưu PDF ngay</button>
  </div>
  ${contentHtml}
</body>
</html>`;

    const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileTitle}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Render a single lesson according to the active `template` with full defensive checks & try/catch
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

      return (
        <LessonPrintErrorBoundary
          key={lesson.id || `lesson-${lessonIndex}`}
          lessonTitle={lesson.title}
        >
          <div
            className={`bg-white text-[#111827] ${
              lessonIndex < totalLessons - 1 ? 'a4-page-break pb-6' : ''
            }`}
          >
            {/* Multi-lesson badge banner when printing a booklet */}
            {totalLessons > 1 && (
              <div className="mb-2 flex items-center justify-between text-[11px] font-mono font-bold uppercase text-[#1d4ed8] border-b border-neutral-300 pb-1">
                <span>
                  BÀI {String(lessonIndex + 1).padStart(2, '0')} /{' '}
                  {String(totalLessons).padStart(2, '0')} · {sysName} › {subName}
                </span>
                <span>{lesson.title}</span>
              </div>
            )}

        {/* ================================================================= */}
        {/* TEMPLATE 1: 📋 1. BAREM TỰ LUẬN (PORTRAIT A4)                     */}
        {/* ================================================================= */}
        {template === 'barem_outline' && (
          <div className="bg-white text-[#111827]">
            <div className="border-b-2 border-black pb-3 mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-700">
                  ĐỀ CƯƠNG ÔN THI TỰ LUẬN Y KHOA THEO BAREM BỘ MÔN · {sysName} /{' '}
                  {subName}
                </div>
                <h1 className="text-[20px] font-extrabold text-black uppercase mt-0.5 leading-snug">
                  {cleanNodeLabel(lRoot.label)}
                </h1>
                {lRoot.summary && (
                  <p className="text-[12.5px] text-neutral-800 mt-1 italic">
                    Trọng tâm: {lRoot.summary}
                  </p>
                )}
              </div>

              <div className="border-2 border-black px-3 py-1.5 text-right shrink-0 bg-neutral-50 text-black">
                <div className="text-[10px] font-bold uppercase">
                  THANG ĐIỂM CHUẨN
                </div>
                <div className="text-[16px] font-extrabold font-mono">
                  {totalPointsScale.toFixed(2)} ĐIỂM
                </div>
                <div className="text-[10px] text-neutral-700">
                  ({rubricCriteria.length} ý chấm Barem)
                </div>
              </div>
            </div>

            <table className="w-full border border-black text-[12.5px] bg-white text-[#111827]">
              <thead>
                <tr className="bg-neutral-100 border-b-2 border-black text-left font-bold text-black">
                  <th className="border border-black px-2.5 py-2 w-[52px] text-center">
                    Mã ý
                  </th>
                  <th className="border border-black px-3 py-2">
                    Nội dung Đề cương Tự luận chuẩn (Đã gạch chân Từ khóa)
                  </th>
                  <th className="border border-black px-2.5 py-2 w-[215px]">
                    Từ khóa ăn điểm Barem
                  </th>
                  <th className="border border-black px-2 py-2 w-[68px] text-center">
                    Điểm
                  </th>
                  <th className="border border-black px-2 py-2 w-[50px] text-center">
                    Thuộc
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
                            className="px-3 py-1.5 font-extrabold text-[13px] uppercase text-black"
                          >
                            PHẦN {item.pillarIndex}. {item.pillarLabel}
                          </td>
                        </tr>
                      )}
                      <tr className="border-b border-black align-top bg-white">
                        <td className="border border-black px-2 py-2 text-center font-mono font-bold text-[12px] text-black">
                          {item.code}
                        </td>
                        <td className="border border-black px-3 py-2 leading-relaxed text-[#111827]">
                          <div className="font-bold text-[13px] text-black mb-1">
                            {renderPrintableKeywordText(item.standardContent)}
                          </div>
                          {item.subPoints.length > 0 && (
                            <ul className="space-y-1 pl-3 text-[12px] text-neutral-900">
                              {item.subPoints.map((sp, sIdx) => (
                                <li key={sIdx} className="leading-snug">
                                  • {renderPrintableKeywordText(sp)}
                                </li>
                              ))}
                            </ul>
                          )}
                        </td>
                        <td className="border border-black px-2.5 py-2 bg-white">
                          <div className="flex flex-wrap gap-1">
                            {item.requiredKeywords.map((kw, kIdx) => (
                              <span
                                key={kIdx}
                                className="inline-block px-1.5 py-0.5 border border-neutral-800 rounded-sm text-[11px] font-bold text-black bg-amber-50/70"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="border border-black px-2 py-2 text-center font-mono font-extrabold text-[12.5px] text-black">
                          {item.allocatedPoints.toFixed(2)}đ
                        </td>
                        <td className="border border-black px-2 py-2 text-center">
                          <div className="w-4 h-4 border-2 border-black mx-auto mt-0.5 bg-white" />
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
                    className="border border-black px-3 py-2 text-right uppercase text-[12px]"
                  >
                    Tổng điểm toàn bài Barem chuẩn:
                  </td>
                  <td className="border border-black px-2 py-2 text-center font-mono font-extrabold text-[13px]">
                    {totalPointsScale.toFixed(2)}đ
                  </td>
                  <td className="border border-black px-2 py-2 text-center font-mono text-[11px]">
                    / {totalPointsScale.toFixed(1)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        {/* ================================================================= */}
        {/* TEMPLATE 2: 📊 2. INFOGRAPHIC CỘT (LANDSCAPE A4)                  */}
        {/* ================================================================= */}
        {template === 'infographic_landscape' && (
          <div className="bg-white text-[#111827]">
            <div className="rounded-lg border-2 border-[#1e3a8a] bg-[#eff6ff] p-3.5 mb-4 text-center">
              <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#1d4ed8]">
                SƠ ĐỒ HỆ THỐNG HÓA Y KHOA (INFOGRAPHIC CỘT A4) · {sysName} /{' '}
                {subName}
              </div>
              <h1 className="text-[19px] font-extrabold uppercase text-[#1e3a8a] mt-0.5">
                {cleanNodeLabel(lRoot.label)}
              </h1>
              {lRoot.summary && (
                <p className="text-[12px] text-[#1e293b] mt-1 max-w-4xl mx-auto font-medium">
                  {lRoot.summary}
                </p>
              )}
            </div>

            <div
              className="grid gap-3 items-start w-full"
              style={{
                gridTemplateColumns:
                  infographicColLayout === 'all_in_one_row'
                    ? `repeat(${Math.max(1, targetPillars.length)}, minmax(0, 1fr))`
                    : targetPillars.length >= 5
                    ? 'repeat(3, minmax(0, 1fr))'
                    : 'repeat(auto-fit, minmax(220px, 1fr))',
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
                    className="border-2 rounded-lg bg-white overflow-hidden avoid-break"
                  >
                    <div
                      style={{ backgroundColor: theme.headerBg }}
                      className="text-white px-3 py-2"
                    >
                      <div className="text-[10px] font-mono font-bold uppercase opacity-90">
                        NHÁNH LỚN {pIdx + 1}
                      </div>
                      <div className="font-extrabold text-[13px] leading-snug">
                        {cleanNodeLabel(pillar.label)}
                      </div>
                    </div>

                    {pillar.summary && (
                      <div
                        style={{
                          backgroundColor: theme.subBg,
                          borderColor: theme.cardBorder,
                          color: theme.accentText,
                        }}
                        className="px-3 py-1.5 border-b text-[11px] font-medium leading-snug"
                      >
                        {pillar.summary}
                      </div>
                    )}

                    <div className="p-2.5 space-y-2 bg-white">
                      {lvl2Nodes.map((lvl2, l2Idx) => {
                        const lvl3Nodes = lvl2.children || [];
                        const lvl2Notes = getClinicalNoteSnippets(lvl2);
                        return (
                          <div
                            key={lvl2.id}
                            style={{
                              backgroundColor: theme.cardBg,
                              borderColor: theme.cardBorder,
                            }}
                            className="border rounded-md p-2 avoid-break"
                          >
                            <div
                              style={{
                                color: theme.accentText,
                                borderColor: theme.cardBorder,
                              }}
                              className="font-bold text-[12px] border-b pb-1 mb-1.5 leading-snug"
                            >
                              <span className="font-mono mr-1">
                                {pIdx + 1}.{l2Idx + 1}.
                              </span>
                              {renderPrintableKeywordText(lvl2.label)}
                            </div>

                            {lvl2.summary && (
                              <p className="text-[11px] text-neutral-800 mb-1 leading-snug">
                                {lvl2.summary}
                              </p>
                            )}

                            {lvl3Nodes.length > 0 && (
                              <ul className="space-y-1 text-[11px] text-[#111827]">
                                {lvl3Nodes.map((lvl3, l3Idx) => (
                                  <li key={lvl3.id} className="leading-snug">
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
                                        <ul className="pl-3 mt-0.5 space-y-0.5 text-[10.5px] text-neutral-800">
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
                                style={{ borderColor: theme.cardBorder }}
                                className="mt-1.5 pt-1 border-t border-dashed text-[10.5px] font-medium text-[#111827] space-y-0.5"
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
                          }}
                          className="border rounded-md p-2 text-[10.5px] text-[#111827] space-y-0.5"
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
        {/* TEMPLATE 3: 🌳 3. SƠ ĐỒ CÂY NGANG (MINDMAP TREE A4 NGANG)         */}
        {/* ================================================================= */}
        {template === 'horizontal_tree' && (
          <div className="bg-white text-[#111827]">
            {/* Minimal Title Strip */}
            <div className="border-b-2 border-[#1e3a8a] pb-2 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#1d4ed8]">
                  SƠ ĐỒ TƯ DUY CÂY NGANG (MINDMAP TREE A4) · {sysName} / {subName}
                </span>
                <h2 className="text-[17px] font-extrabold uppercase text-[#111827]">
                  {cleanNodeLabel(lRoot.label)}
                </h2>
              </div>
              <span className="text-[11px] font-mono text-neutral-600">
                Gốc Trái → Cấp 1 → Cấp 2 → Cấp 3
              </span>
            </div>

            {/* Left-to-Right Tree Layout */}
            <div className="flex items-stretch gap-0 w-full">
              {/* Root Node Column (Left) */}
              <div className="w-[195px] shrink-0 flex flex-col justify-center pr-3 relative">
                <div className="border-2 border-[#1e3a8a] bg-[#eff6ff] rounded-xl p-3 shadow-xs">
                  <div className="text-[9.5px] font-mono font-bold uppercase text-[#1d4ed8] mb-0.5">
                    CHỦ ĐỀ GỐC (CẤP 0)
                  </div>
                  <div className="font-extrabold text-[13.5px] text-[#1e3a8a] leading-snug">
                    {cleanNodeLabel(lRoot.label)}
                  </div>
                  {lRoot.summary && (
                    <p className="text-[10.5px] text-[#1e293b] mt-1.5 pt-1.5 border-t border-[#93c5fd] leading-snug">
                      {lRoot.summary}
                    </p>
                  )}
                </div>
                {/* Horizontal connector stem to spine */}
                <div className="absolute right-0 top-1/2 w-3 h-[2.5px] bg-[#1e3a8a]" />
              </div>

              {/* Right Tree Spine & Level 1 -> Level 2 -> Level 3 Branches */}
              <div className="flex-1 border-l-[2.5px] border-[#1e3a8a] pl-4 space-y-3.5 py-1">
                {targetPillars.map((pillar, pIdx) => {
                  const theme =
                    PRINT_COLUMN_THEMES[pIdx % PRINT_COLUMN_THEMES.length];
                  const lvl2Nodes = pillar.children || [];

                  return (
                    <div
                      key={pillar.id}
                      className="relative flex items-start gap-3 avoid-break"
                    >
                      {/* Horizontal branch connector from vertical spine */}
                      <div
                        style={{ backgroundColor: theme.colBorder }}
                        className="absolute -left-4 top-4 w-4 h-[2px]"
                      />

                      {/* Level 1 Node Box */}
                      <div
                        style={{
                          borderColor: theme.colBorder,
                          backgroundColor: theme.subBg,
                        }}
                        className="w-[205px] shrink-0 border-2 rounded-lg p-2.5"
                      >
                        <div
                          style={{ color: theme.accentText }}
                          className="font-extrabold text-[12.5px] leading-snug"
                        >
                          <span className="font-mono mr-1">{pIdx + 1}.</span>
                          {cleanNodeLabel(pillar.label)}
                        </div>
                        {pillar.summary && (
                          <p className="text-[10.5px] text-neutral-800 mt-1 leading-snug">
                            {pillar.summary}
                          </p>
                        )}
                      </div>

                      {/* Level 2 & Level 3 Branches (Right side) */}
                      {lvl2Nodes.length > 0 && (
                        <div
                          style={{ borderColor: theme.colBorder }}
                          className="flex-1 border-l-2 pl-3 space-y-2"
                        >
                          {lvl2Nodes.map((lvl2, l2Idx) => {
                            const lvl3Nodes = lvl2.children || [];
                            return (
                              <div
                                key={lvl2.id}
                                style={{
                                  backgroundColor: theme.cardBg,
                                  borderColor: theme.cardBorder,
                                }}
                                className="relative border rounded-md p-2 avoid-break"
                              >
                                <span
                                  style={{ backgroundColor: theme.colBorder }}
                                  className="absolute -left-3 top-3.5 w-3 h-[1.5px]"
                                />
                                <div
                                  style={{ color: theme.accentText }}
                                  className="font-bold text-[12px] leading-snug"
                                >
                                  <span className="font-mono mr-1">
                                    {pIdx + 1}.{l2Idx + 1}.
                                  </span>
                                  {renderPrintableKeywordText(lvl2.label)}
                                  {lvl2.summary && (
                                    <span className="font-normal text-neutral-700">
                                      {' '}
                                      — {lvl2.summary}
                                    </span>
                                  )}
                                </div>

                                {lvl3Nodes.length > 0 && (
                                  <div className="mt-1 pl-3 border-l border-neutral-400 space-y-0.5 text-[11px] text-[#111827]">
                                    {lvl3Nodes.map((lvl3) => (
                                      <div
                                        key={lvl3.id}
                                        className="leading-snug"
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
                                      </div>
                                    ))}
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
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TEMPLATE 4: 📝 4. VỞ GẠCH Ý CORNELL (CORNELL NOTE A4)             */}
        {/* ================================================================= */}
        {template === 'cornell_note' && (
          <div className="bg-white text-[#111827] border-2 border-black">
            {/* Cornell Top Header */}
            <div className="border-b-2 border-black p-4 bg-neutral-50 flex items-start justify-between gap-4">
              <div>
                <div className="text-[10.5px] font-bold uppercase text-neutral-600">
                  VỞ GHI CHÉP Y KHOA PHƯƠNG PHÁP CORNELL · {sysName} / {subName}
                </div>
                <h1 className="text-[19px] font-extrabold uppercase text-black mt-0.5">
                  {cleanNodeLabel(lRoot.label)}
                </h1>
              </div>
              <div className="text-right text-[11px] font-mono shrink-0">
                <div>Ngày ôn: ....../....../202...</div>
                <div className="mt-1">Mức độ thuộc: [ ] Lần 1 [ ] Lần 2</div>
              </div>
            </div>

            {/* Cornell 2-Column Body: 28% Left Cues | 72% Right Detailed Notes */}
            <div className="divide-y divide-black">
              {/* Column Header Row */}
              <div className="grid grid-cols-12 bg-neutral-200 font-extrabold text-[11.5px] uppercase text-black">
                <div className="col-span-4 p-2.5 border-r-2 border-black">
                  MỤC LỚN & TRỌNG TÂM / CÂU HỎI GỢI NHỚ (28%)
                </div>
                <div className="col-span-8 p-2.5">
                  GHI CHÉP PHÂN CẤP CHI TIẾT & TỪ KHÓA TÔ SÁNG (72%)
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
                    className="grid grid-cols-12 avoid-break bg-white"
                  >
                    {/* Left Column (4/12): Main Topic & Clinical Cues */}
                    <div className="col-span-4 p-3.5 border-r-2 border-black bg-neutral-50/60 flex flex-col justify-between">
                      <div>
                        <div
                          style={{ color: theme.headerBg }}
                          className="font-mono text-[11px] font-bold uppercase"
                        >
                          MỤC LỚN {pIdx + 1}
                        </div>
                        <h3 className="font-extrabold text-[14px] text-black leading-snug mt-0.5">
                          {cleanNodeLabel(pillar.label)}
                        </h3>

                        {pillar.summary && (
                          <div className="mt-2 p-2 rounded border border-neutral-300 bg-white text-[11.5px] text-neutral-800 leading-snug">
                            <strong className="text-black">Trọng tâm:</strong>{' '}
                            {pillar.summary}
                          </div>
                        )}

                        {pillarNotes.length > 0 && (
                          <div className="mt-2 space-y-1 text-[11px] text-neutral-900">
                            {pillarNotes.map((n, idx) => (
                              <div
                                key={idx}
                                className="p-1.5 rounded bg-amber-50 border border-amber-300"
                              >
                                ★ {n}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="mt-3 pt-2 border-t border-dashed border-neutral-400 text-[10.5px] text-neutral-600 font-mono">
                        Gồm {lvl2Nodes.length} phân mục Cấp 2
                      </div>
                    </div>

                    {/* Right Column (8/12): Hierarchical Outline with Highlighted Keywords */}
                    <div className="col-span-8 p-3.5 space-y-3 bg-white">
                      {lvl2Nodes.map((lvl2, l2Idx) => {
                        const lvl3Nodes = lvl2.children || [];
                        const lvl2Notes = getClinicalNoteSnippets(lvl2);
                        return (
                          <div key={lvl2.id} className="avoid-break">
                            <div className="font-bold text-[13px] text-black flex items-baseline gap-1.5">
                              <span
                                style={{ color: theme.headerBg }}
                                className="font-mono font-extrabold"
                              >
                                {pIdx + 1}.{l2Idx + 1}.
                              </span>
                              <span
                                style={{ backgroundColor: theme.highlightBg }}
                                className="px-1.5 py-0.5 rounded-xs border-b border-black/30"
                              >
                                {cleanNodeLabel(lvl2.label)}
                              </span>
                            </div>

                            {lvl2.summary && (
                              <p className="text-[12px] text-neutral-800 pl-5 mt-1 leading-snug italic">
                                → {lvl2.summary}
                              </p>
                            )}

                            {lvl3Nodes.length > 0 && (
                              <ul className="pl-5 mt-1.5 space-y-1 text-[12px] text-[#111827]">
                                {lvl3Nodes.map((lvl3) => (
                                  <li key={lvl3.id} className="leading-relaxed">
                                    <span className="font-bold mr-1.5">•</span>
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
                                        <ul className="pl-4 mt-0.5 space-y-0.5 text-[11.5px] text-neutral-800">
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
                              <div className="pl-5 mt-1.5 space-y-0.5 text-[11.5px] font-medium text-neutral-900">
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

              {/* Cornell Bottom Summary Box */}
              <div className="p-3.5 bg-neutral-100 avoid-break">
                <div className="text-[11px] font-extrabold uppercase text-black mb-1">
                  📌 TỔNG KẾT CỐT LÕI CUỐI TRANG (CORNELL SUMMARY):
                </div>
                <div className="text-[12px] text-neutral-900 leading-relaxed">
                  {lRoot.summary ||
                    `Bài học "${cleanNodeLabel(lRoot.label)}" gồm ${
                      targetPillars.length
                    } trụ cột chính: ${targetPillars
                      .map((p, i) => `(${i + 1}) ${cleanNodeLabel(p.label)}`)
                      .join('; ')}.`}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================================================================= */}
        {/* TEMPLATE 5: 🐟 5. SƠ ĐỒ XƯƠNG CÁ / LƯU ĐỒ (ISHIKAWA & FLOWCHART)  */}
        {/* ================================================================= */}
        {template === 'fishbone_flowchart' && (
          <div className="bg-white text-[#111827]">
            <div className="border-b-2 border-[#1e3a8a] pb-2 mb-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#1d4ed8]">
                  {fishboneOrFlowchart === 'fishbone'
                    ? 'SƠ ĐỒ XƯƠNG CÁ Y KHOA (ISHIKAWA DIAGRAM A4)'
                    : 'LƯU ĐỒ MŨI TÊN CƠ CHẾ & LÂM SÀNG (FLOWCHART A4)'}{' '}
                  · {sysName} / {subName}
                </span>
                <h2 className="text-[18px] font-extrabold uppercase text-[#111827]">
                  {cleanNodeLabel(lRoot.label)}
                </h2>
              </div>
              <span className="text-[11px] font-mono text-neutral-700">
                {targetPillars.length} nhánh chính
              </span>
            </div>

            {fishboneOrFlowchart === 'fishbone' ? (
              /* 5A: WHITE-PAPER ISHIKAWA FISHBONE SCHEMATIC */
              (() => {
                const topRibs = targetPillars.filter((_, idx) => idx % 2 === 0);
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
                      }}
                      className="px-3 py-1.5 rounded-md text-white font-bold text-[12px] shadow-xs w-full"
                    >
                      <span className="font-mono mr-1">{pIndex}.</span>
                      {cleanNodeLabel(pillar.label)}
                    </div>
                  );

                  const subBonesList = (
                    <div
                      style={{ borderColor: theme.colBorder }}
                      className="w-full border-l-2 ml-3 pl-2.5 space-y-1.5 py-1"
                    >
                      {lvl2Nodes.map((lvl2, l2Idx) => (
                        <div
                          key={lvl2.id}
                          style={{
                            backgroundColor: theme.cardBg,
                            borderColor: theme.cardBorder,
                          }}
                          className="border rounded p-1.5 text-[11px] leading-snug avoid-break"
                        >
                          <div
                            style={{ color: theme.accentText }}
                            className="font-bold"
                          >
                            {pIndex}.{l2Idx + 1}.{' '}
                            {renderPrintableKeywordText(lvl2.label)}
                          </div>
                          {lvl2.children && lvl2.children.length > 0 && (
                            <ul className="pl-2.5 mt-0.5 space-y-0.5 text-[10.5px] text-neutral-900">
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
                            className="w-[3px] h-4 ml-6 -skew-x-20"
                          />
                        </>
                      ) : (
                        <>
                          <div
                            style={{ backgroundColor: theme.colBorder }}
                            className="w-[3px] h-4 ml-6 skew-x-20"
                          />
                          <div className="mb-1 w-full">{headerBox}</div>
                          {subBonesList}
                        </>
                      )}
                    </div>
                  );
                };

                return (
                  <div className="w-full py-2">
                    <div className="flex items-center gap-0 w-full">
                      {/* Left Tail + Ribs + Spine Column */}
                      <div className="flex-1 min-w-0">
                        {/* Top Ribs Row */}
                        <div
                          className="grid gap-4 items-end pr-4"
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

                        {/* Central Horizontal Spine */}
                        <div className="relative h-[5px] bg-[#1e3a8a] w-full flex items-center">
                          <div className="w-3 h-3 rounded-full bg-[#1e3a8a] -ml-1" />
                        </div>

                        {/* Bottom Ribs Row */}
                        <div
                          className="grid gap-4 items-start pr-4"
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

                      {/* Fish Head (Locked at right end of Central Spine) */}
                      <div className="w-[210px] shrink-0 border-2 border-[#1e3a8a] bg-[#eff6ff] rounded-r-2xl rounded-l-md p-3 shadow-xs">
                        <div className="text-[9.5px] font-mono font-bold uppercase text-[#1d4ed8]">
                          ĐẦU XƯƠNG CÁ (CHỦ ĐỀ GỐC)
                        </div>
                        <div className="font-extrabold text-[13.5px] text-[#1e3a8a] leading-snug mt-0.5">
                          {cleanNodeLabel(lRoot.label)}
                        </div>
                        {lRoot.summary && (
                          <p className="text-[10.5px] text-neutral-800 mt-1 pt-1 border-t border-[#93c5fd] leading-snug">
                            {lRoot.summary}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()
            ) : (
              /* 5B: TOP-DOWN VERTICAL FLOWCHART WITH ARROWS ON WHITE PAPER */
              <div className="flex flex-col items-center w-full">
                {/* Top Lesson Box */}
                <div className="px-6 py-2.5 rounded-lg border-2 border-[#1e3a8a] bg-[#1e3a8a] text-white font-extrabold text-[15px] uppercase text-center">
                  {cleanNodeLabel(lRoot.label)}
                </div>

                {lRoot.summary && (
                  <>
                    <div className="w-[2px] h-3 bg-[#1e3a8a]" />
                    <div className="px-4 py-2 rounded-lg border border-[#1d4ed8] bg-[#eff6ff] text-[11.5px] text-[#1e293b] max-w-3xl text-center font-medium">
                      <strong>Định nghĩa & Tổng quan:</strong> {lRoot.summary}
                    </div>
                  </>
                )}

                <div className="w-[2px] h-3.5 bg-[#1e3a8a]" />
                <div className="w-full border-t-2 border-[#1e3a8a] mb-2" />

                {/* Columns Row with Downward Arrows */}
                <div
                  className="grid gap-3 items-start w-full"
                  style={{
                    gridTemplateColumns:
                      targetPillars.length >= 5
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
                          style={{ backgroundColor: theme.headerBg }}
                          className="w-full text-white px-3 py-2 rounded-lg font-extrabold text-[12.5px] text-center"
                        >
                          {pIdx + 1}. {cleanNodeLabel(pillar.label)}
                        </div>

                        {lvl2Nodes.map((lvl2, l2Idx) => (
                          <React.Fragment key={lvl2.id}>
                            <div className="flex flex-col items-center my-0.5">
                              <div
                                style={{ backgroundColor: theme.colBorder }}
                                className="w-[2px] h-2.5"
                              />
                              <div
                                style={{ borderTopColor: theme.colBorder }}
                                className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px]"
                              />
                            </div>
                            <div
                              style={{
                                backgroundColor: theme.cardBg,
                                borderColor: theme.colBorder,
                              }}
                              className="w-full border rounded-lg p-2 text-left"
                            >
                              <div
                                style={{ color: theme.accentText }}
                                className="font-bold text-[11.5px] border-b border-black/15 pb-1 mb-1"
                              >
                                {pIdx + 1}.{l2Idx + 1}.{' '}
                                {renderPrintableKeywordText(lvl2.label)}
                              </div>
                              {lvl2.children && lvl2.children.length > 0 && (
                                <ul className="space-y-0.5 text-[10.5px] text-[#111827]">
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
              </div>
            )}
          </div>
        )}

        {/* ================================================================= */}
        {/* TEMPLATE 6: ✍️ 6. ĐỀ KHUYẾT CHỮ (LUYỆN VIẾT TAY A4)               */}
        {/* ================================================================= */}
        {template === 'blank_worksheet' && (
          <div className="bg-white text-[#111827]">
            <div className="border-2 border-black p-4 mb-5 bg-white">
              <div className="flex items-start justify-between gap-4 border-b border-black pb-3 mb-3">
                <div>
                  <div className="text-[11px] font-bold uppercase text-neutral-700">
                    PHIẾU LUYỆN VIẾT TAY TỰ LUẬN Y KHOA THEO BAREM · {sysName} /{' '}
                    {subName}
                  </div>
                  <h1 className="text-[19px] font-extrabold uppercase text-black mt-0.5">
                    ĐỀ BÀI: TRÌNH BÀY {cleanNodeLabel(lRoot.label)}
                  </h1>
                </div>
                <div className="border border-black px-3 py-1.5 text-center shrink-0 bg-neutral-50">
                  <div className="text-[10px] font-bold uppercase">
                    ĐIỂM TỰ CHẤM
                  </div>
                  <div className="text-[16px] font-mono font-bold mt-1">
                    ....... / {totalPointsScale.toFixed(1)}đ
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 text-[12px]">
                <div>Ngày luyện viết: ....../....../202...</div>
                <div>Thời gian làm bài: ......... phút</div>
                <div>Lần ôn thứ: ....................</div>
              </div>
            </div>

            <div className="space-y-5">
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
                    className="border border-black p-4 avoid-break bg-white"
                  >
                    <div className="flex items-center justify-between gap-2 border-b-2 border-black pb-1.5 mb-3">
                      <h2 className="font-extrabold text-[14.5px] uppercase text-black">
                        CÂU / MỤC LỚN {pIdx + 1}: {cleanNodeLabel(pillar.label)}
                      </h2>
                      {worksheetShowKeywordCount && (
                        <span className="font-mono text-[12px] font-bold border border-black px-2 py-0.5">
                          [ ....... / {pillarPoints.toFixed(2)} điểm ]
                        </span>
                      )}
                    </div>

                    {worksheetShowLevel2 &&
                    pillar.children &&
                    pillar.children.length > 0 ? (
                      <div className="space-y-4">
                        {pillar.children.map((lvl2, l2Idx) => {
                          const matchedCrit = rubricCriteria.find(
                            (c) => c.nodeId === lvl2.id
                          );
                          return (
                            <div key={lvl2.id} className="avoid-break">
                              <div className="flex items-center justify-between gap-2 mb-1.5">
                                <div className="font-bold text-[13px] text-black">
                                  {pIdx + 1}.{l2Idx + 1}.{' '}
                                  {cleanNodeLabel(lvl2.label)}:
                                </div>
                                {worksheetShowKeywordCount && matchedCrit && (
                                  <div className="text-[11px] font-mono text-neutral-700">
                                    (Cần nêu đủ{' '}
                                    <strong>
                                      {matchedCrit.requiredKeywords.length} từ
                                      khóa Barem
                                    </strong>{' '}
                                    · {matchedCrit.allocatedPoints.toFixed(2)}đ)
                                    [ ... /{' '}
                                    {matchedCrit.allocatedPoints.toFixed(2)}đ ]
                                  </div>
                                )}
                              </div>

                              <div className="space-y-3.5 pt-1">
                                {Array.from({
                                  length: worksheetLinesPerItem,
                                }).map((_, lineIdx) => (
                                  <div
                                    key={lineIdx}
                                    className="border-b border-dotted border-neutral-600 h-5 w-full"
                                  />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="space-y-4 pt-1">
                        {Array.from({
                          length: worksheetLinesPerItem * 3,
                        }).map((_, lineIdx) => (
                          <div
                            key={lineIdx}
                            className="border-b border-dotted border-neutral-600 h-5 w-full"
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

            {/* Screen-only visual page divider when batch-printing multiple lessons */}
            {lessonIndex < totalLessons - 1 && (
              <div className="screen-page-divider my-8 py-2 border-y-2 border-dashed border-[#3b82f6] bg-[#eff6ff] text-center text-[11.5px] font-mono font-bold text-[#1d4ed8]">
                ✂️ ————— NGẮT TRANG A4 TỰ ĐỘNG · SANG BÀI HỌC TIẾP THEO (BÀI{' '}
                {lessonIndex + 2}/{totalLessons}) —————
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
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-[15.5px] text-white">
                  Print Studio Pro — Xuất PDF / Đóng Quyển Đề Cương A4
                </h2>
                <span className="text-[11px] font-mono text-[#81c995] hidden sm:inline">
                  · Đang chọn in {lessonsToPrint.length} bài học
                </span>
              </div>
              <p className="text-[11.5px] text-[#9aa0a6]">
                6 mẫu bản in A4 nền trắng chữ đen · Hỗ trợ in lẻ 1 bài hoặc in gộp cả Học phần kèm Trang bìa & Mục lục
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadPrintableHtml}
              className="px-3.5 py-2 rounded-xl bg-[#242528] hover:bg-[#2d2e30] border border-[#3c4043] text-[#e3e3e3] text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Tải file bản in A4 (.HTML) để mở hoặc gửi in trên mọi thiết bị"
            >
              <Download className="w-4 h-4 text-[#8ab4f8]" />
              <span>📥 Tải File Bản In A4 ({lessonsToPrint.length} bài)</span>
            </button>

            <button
              onClick={handlePrintA4}
              className="px-4 py-2 rounded-xl bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-display font-bold text-[13px] flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>
                🖨️ In Ngay / Lưu PDF ({lessonsToPrint.length} bài)
              </span>
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

          {/* Right: Cover Page & Table of Contents Toggle */}
          <div className="flex items-center gap-2">
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
              <span>📖 Tạo Trang Bìa & Mục Lục Đề Cương</span>
            </button>
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
            {/* OPTIONAL COVER PAGE & TABLE OF CONTENTS (TRANG BÌA & MỤC LỤC)  */}
            {/* ============================================================= */}
            {includeCoverAndToc && (
              <div className="a4-page-break pb-8 mb-8 bg-white text-[#111827]">
                <div className="border-4 border-double border-[#1e3a8a] p-6 md:p-8 bg-white">
                  <div className="text-center border-b-2 border-[#1e3a8a] pb-5 mb-6">
                    <div className="text-[11px] font-mono font-bold uppercase tracking-widest text-[#1d4ed8]">
                      MEDMIND STUDIO · HỆ THỐNG ĐỀ CƯƠNG TỰ LUẬN & SƠ ĐỒ Y KHOA CHUẨN BAREM
                    </div>
                    <input
                      type="text"
                      value={bookletTitle}
                      onChange={(e) => setBookletTitle(e.target.value)}
                      className="w-full text-center text-[22px] font-extrabold uppercase text-[#1e3a8a] mt-2 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#1d4ed8] focus:outline-none"
                    />
                    <div className="text-[13px] font-medium text-neutral-700 mt-1.5">
                      Tổng hợp {lessonsToPrint.length} bài học trọng tâm · Định dạng in:{' '}
                      <strong>
                        {template === 'barem_outline'
                          ? 'Bảng Barem Đề Cương Tự Luận'
                          : template === 'infographic_landscape'
                          ? 'Sơ Đồ Infographic Cột'
                          : template === 'horizontal_tree'
                          ? 'Sơ Đồ Tư Duy Cây Ngang'
                          : template === 'cornell_note'
                          ? 'Vở Gạch Ý Phương Pháp Cornell'
                          : template === 'fishbone_flowchart'
                          ? 'Sơ Đồ Xương Cá & Lưu Đồ'
                          : 'Đề Thi Tự Luận Khuyết Chữ'}
                      </strong>
                    </div>
                  </div>

                  {/* Table of Contents */}
                  <div className="mb-4">
                    <h3 className="text-[14px] font-extrabold uppercase text-black mb-2.5">
                      📖 MỤC LỤC CÁC BÀI HỌC TRONG TẬP ĐỀ CƯƠNG ({lessonsToPrint.length} BÀI):
                    </h3>
                    <table className="w-full border border-black text-[12.5px] bg-white text-black">
                      <thead>
                        <tr className="bg-neutral-100 border-b-2 border-black font-bold">
                          <th className="border border-black px-2.5 py-2 w-[48px] text-center">
                            STT
                          </th>
                          <th className="border border-black px-3 py-2 text-left">
                            Tên Bài Học / Chủ Đề Tự Luận
                          </th>
                          <th className="border border-black px-3 py-2 text-left w-[200px]">
                            Học Phần / Chuyên Khoa
                          </th>
                          <th className="border border-black px-2.5 py-2 text-center w-[95px]">
                            Số Mục Lớn
                          </th>
                          <th className="border border-black px-2.5 py-2 text-center w-[125px]">
                            Tiến Độ Ôn Thi
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {lessonsToPrint.map((l, idx) => {
                          const { sysName, subName } = getLessonPathNames(l);
                          const pillarCount = Array.isArray(l?.rootNode?.children)
                            ? l.rootNode.children.length
                            : 0;
                          return (
                            <tr
                              key={l?.id || `toc-${idx}`}
                              className="border-b border-black"
                            >
                              <td className="border border-black px-2 py-2 text-center font-mono font-bold">
                                {String(idx + 1).padStart(2, '0')}
                              </td>
                              <td className="border border-black px-3 py-2 font-bold text-[#111827]">
                                {l?.title || `Bài học ${idx + 1}`}
                              </td>
                              <td className="border border-black px-3 py-2 text-neutral-700 text-[11.5px]">
                                {sysName} › {subName}
                              </td>
                              <td className="border border-black px-2.5 py-2 text-center font-mono">
                                {pillarCount} nhánh
                              </td>
                              <td className="border border-black px-2.5 py-2 text-center font-mono text-[11px]">
                                [ ] Lần 1 &nbsp; [ ] Thuộc
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="screen-page-divider mt-8 py-2 border-y-2 border-dashed border-[#3b82f6] bg-[#eff6ff] text-center text-[11.5px] font-mono font-bold text-[#1d4ed8]">
                  ✂️ ————— HẾT TRANG BÌA & MỤC LỤC · BẮT ĐẦU NỘI DUNG BÀI HỌC 01 —————
                </div>
              </div>
            )}

            {/* ============================================================= */}
            {/* SEQUENTIAL MULTI-LESSON RENDERER WITH PAGE BREAKS             */}
            {/* ============================================================= */}
            <div className="space-y-8 bg-white text-[#111827]">
              {lessonsToPrint.map((lesson, idx) =>
                renderSingleLessonTemplate(lesson, idx, lessonsToPrint.length)
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

