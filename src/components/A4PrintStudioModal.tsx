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
    // 1. Extract live CSS rules from all same-origin stylesheets so the iframe renders in 0ms
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
        // Cross-origin stylesheet fallback
        if (sheet.href) {
          chunks.push(`<link rel="stylesheet" href="${sheet.href}" />`);
        }
      }
    });
    if (inlineRules.length > 0) {
      chunks.push(`<style>${inlineRules.join('\n')}</style>`);
    }

    // 2. Also include any inline <style> tags as backup
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
  <title>${docTitle}</title>
  ${compiledStyles}
  <style>
    @page {
      size: A4;
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
      }, 150);
    } catch (err) {
      console.warn('Print error fallback to window.print():', err);
      window.print();
    }
  };

  /**
   * Render a single lesson according to the active `template` with High-Density Medical Handout layout
   * so each 6-7 branch lesson fits compactly into 1 to 1.5 A4 pages (~22 pages for 20 lessons).
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

      return (
        <LessonPrintErrorBoundary
          key={lesson.id || `lesson-${lessonIndex}`}
          lessonTitle={lesson.title}
        >
          <div
            className={`bg-white text-[#111827] ${
              lessonIndex < totalLessons - 1 ? 'a4-page-break pb-2' : ''
            }`}
          >
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

                        {pillar.summary && (
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

                                {lvl2.summary && (
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
                          {pillar.summary && (
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
                                    {lvl2.summary && (
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

                          {pillar.summary && (
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
                                  {lvl2.summary && (
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

            {/* Screen-only visual page divider when batch-printing multiple lessons */}
            {lessonIndex < totalLessons - 1 && (
              <div className="screen-page-divider my-5 py-1.5 border-y-2 border-dashed border-[#3b82f6] bg-[#eff6ff] text-center text-[11px] font-mono font-bold text-[#1d4ed8]">
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
              <div className="a4-page-break pb-4 mb-4 bg-white text-[#111827]">
                <div className="border-2 border-[#1e3a8a] p-4 bg-white">
                  <div className="text-center border-b-2 border-[#1e3a8a] pb-3 mb-3">
                    <div className="text-[9pt] font-mono font-bold uppercase tracking-widest text-[#1d4ed8]">
                      MEDMIND STUDIO · HỆ THỐNG ĐỀ CƯƠNG TỰ LUẬN & SƠ ĐỒ Y KHOA CHUẨN BAREM
                    </div>
                    <input
                      type="text"
                      value={bookletTitle}
                      onChange={(e) => setBookletTitle(e.target.value)}
                      className="w-full text-center text-[14pt] font-extrabold uppercase text-[#1e3a8a] mt-1 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-[#1d4ed8] focus:outline-none"
                    />
                    <div className="text-[9.5pt] font-medium text-neutral-700 mt-1">
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
                  <div>
                    <h3 className="text-[10.5pt] font-extrabold uppercase text-black mb-1.5">
                      📖 MỤC LỤC CÁC BÀI HỌC TRONG TẬP ĐỀ CƯƠNG ({lessonsToPrint.length} BÀI):
                    </h3>
                    <table
                      style={{ fontSize: '9.5pt', lineHeight: 1.35 }}
                      className="w-full border border-black bg-white text-black"
                    >
                      <thead>
                        <tr className="bg-neutral-100 border-b-2 border-black font-bold">
                          <th
                            style={{ padding: '4px 6px' }}
                            className="border border-black w-[42px] text-center"
                          >
                            STT
                          </th>
                          <th
                            style={{ padding: '4px 8px' }}
                            className="border border-black text-left"
                          >
                            Tên Bài Học / Chủ Đề Tự Luận
                          </th>
                          <th
                            style={{ padding: '4px 8px' }}
                            className="border border-black text-left w-[180px]"
                          >
                            Học Phần / Chuyên Khoa
                          </th>
                          <th
                            style={{ padding: '4px 6px' }}
                            className="border border-black text-center w-[80px]"
                          >
                            Số Nhánh
                          </th>
                          <th
                            style={{ padding: '4px 6px' }}
                            className="border border-black text-center w-[105px]"
                          >
                            Tiến Độ Ôn
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
                              className="border-b border-black avoid-break"
                            >
                              <td
                                style={{ padding: '4px 6px' }}
                                className="border border-black text-center font-mono font-bold"
                              >
                                {String(idx + 1).padStart(2, '0')}
                              </td>
                              <td
                                style={{ padding: '4px 8px' }}
                                className="border border-black font-bold text-[#111827]"
                              >
                                {l?.title || `Bài học ${idx + 1}`}
                              </td>
                              <td
                                style={{ padding: '4px 8px' }}
                                className="border border-black text-neutral-700 text-[9pt]"
                              >
                                {sysName} › {subName}
                              </td>
                              <td
                                style={{ padding: '4px 6px' }}
                                className="border border-black text-center font-mono"
                              >
                                {pillarCount} nhánh
                              </td>
                              <td
                                style={{ padding: '4px 6px' }}
                                className="border border-black text-center font-mono text-[8.5pt]"
                              >
                                [ ] Lần 1 &nbsp; [ ] Thuộc
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="screen-page-divider mt-4 py-1.5 border-y-2 border-dashed border-[#3b82f6] bg-[#eff6ff] text-center text-[11px] font-mono font-bold text-[#1d4ed8]">
                  ✂️ ————— HẾT TRANG BÌA & MỤC LỤC · BẮT ĐẦU NỘI DUNG BÀI HỌC 01 —————
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
            size: A4;
            margin: 10mm;
          }
          @media print {
            html, body, #root, .fixed {
              height: auto !important;
              overflow: visible !important;
              position: static !important;
            }
          }
        `}</style>
      </div>
    </div>
  );
};

