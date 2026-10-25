import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Play,
  Pause,
  RotateCcw,
  Key,
  FileText,
  ListChecks,
  Sparkles,
  Eye,
  EyeOff,
  Bookmark,
  Award,
  Check,
  HelpCircle,
  Trash2,
  Printer,
} from 'lucide-react';
import { MindmapNode, NodeMasteryStatus } from '../types/mindmap';
import { cleanNodeLabel } from '../utils/mindmapLayout';
import {
  RubricGradeStatus,
  MissedRubricItemRecord,
  EssayExamHistoryRecord,
  buildMedicalRubricCriteria,
  evaluateEssayAgainstRubric,
  buildOutlineTargets,
  buildMedicalClozeGroups,
  isClozeAnswerCorrect,
  normalizeViText,
  removeViDiacritics,
} from '../utils/essayRubricEngine';

interface MedicalEssayStudioModalProps {
  lessonId: string;
  lessonTitle: string;
  rootNode: MindmapNode;
  onClose: () => void;
  onSetNodeMastery: (nodeId: string, mastery: NodeMasteryStatus) => void;
  onOpenPrintStudio?: () => void;
}

type EssayStudioTab = 'outline' | 'cloze' | 'essay_rubric' | 'mistake_bank';

const STORAGE_KEY_MISSED_BAREM = 'medmind_essay_missed_barem_v1';
const STORAGE_KEY_ESSAY_HISTORY = 'medmind_essay_exam_history_v1';

export const MedicalEssayStudioModal: React.FC<MedicalEssayStudioModalProps> = ({
  lessonId,
  lessonTitle,
  rootNode,
  onClose,
  onSetNodeMastery,
  onOpenPrintStudio,
}) => {
  const pillars = useMemo(() => rootNode.children || [], [rootNode]);

  // 1. Scope & Total Score Scale Selection
  const [selectedScopeId, setSelectedScopeId] = useState<string>('all');
  const [totalPointsScale, setTotalPointsScale] = useState<number>(5.0);
  const [activeTab, setActiveTab] = useState<EssayStudioTab>('essay_rubric');

  // Scope question title
  const activeQuestionTitle = useMemo(() => {
    if (selectedScopeId === 'all') {
      return `Trình bày đầy đủ nội dung trọng tâm bài: "${cleanNodeLabel(
        rootNode.label
      )}"`;
    }
    const foundIdx = pillars.findIndex((p) => p.id === selectedScopeId);
    const found = pillars[foundIdx];
    if (!found) return cleanNodeLabel(rootNode.label);
    return `Câu hỏi (${totalPointsScale.toFixed(
      1
    )} điểm): Trình bày "${cleanNodeLabel(found.label)}" trong bài ${cleanNodeLabel(
      rootNode.label
    )}`;
  }, [selectedScopeId, pillars, rootNode.label, totalPointsScale]);

  // ============================================================================
  // MODE 1 STATE: 🦴 LUYỆN LẬP DÀN Ý NHANH (OUTLINE RECALL - 3 PHÚT ĐẦU GIỜ)
  // ============================================================================
  const [outlineDraftText, setOutlineDraftText] = useState<string>('');
  const [isOutlineChecked, setIsOutlineChecked] = useState<boolean>(false);
  const [manualOutlineHits, setManualOutlineHits] = useState<
    Record<string, boolean>
  >({});
  const [outlineTimerSec, setOutlineTimerSec] = useState<number>(180); // 3 minutes
  const [isOutlineTimerRunning, setIsOutlineTimerRunning] =
    useState<boolean>(false);

  const outlineTargets = useMemo(
    () => buildOutlineTargets(rootNode, selectedScopeId),
    [rootNode, selectedScopeId]
  );

  useEffect(() => {
    if (!isOutlineTimerRunning) return;
    const interval = window.setInterval(() => {
      setOutlineTimerSec((prev) => {
        if (prev <= 1) {
          setIsOutlineTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isOutlineTimerRunning]);

  const handleCheckOutline = () => {
    const normDraft = normalizeViText(outlineDraftText);
    const noAccDraft = removeViDiacritics(outlineDraftText);
    const nextHits: Record<string, boolean> = {};

    outlineTargets.forEach((item) => {
      if (normDraft.length < 3) {
        nextHits[item.id] = false;
        return;
      }
      // Check if title or any core keyword is present in outlineDraftText
      const normTitle = normalizeViText(item.title);
      if (normDraft.includes(normTitle)) {
        nextHits[item.id] = true;
        return;
      }
      const matchedKw = item.coreKeywords.some((kw) => {
        const nKw = normalizeViText(kw);
        const naKw = removeViDiacritics(kw);
        return (
          (nKw.length >= 2 && normDraft.includes(nKw)) ||
          (naKw.length >= 4 && noAccDraft.includes(naKw))
        );
      });
      nextHits[item.id] = matchedKw;
    });

    setManualOutlineHits(nextHits);
    setIsOutlineChecked(true);
    setIsOutlineTimerRunning(false);
  };

  // ============================================================================
  // MODE 2 STATE: 🔑 ĐIỀN TỪ KHÓA ĂN ĐIỂM BAREM (MEDICAL KEYWORD CLOZE)
  // ============================================================================
  const [clozeDifficulty, setClozeDifficulty] = useState<'standard' | 'hard'>(
    'standard'
  );
  const [clozeInputs, setClozeInputs] = useState<Record<string, string>>({});
  const [isClozeChecked, setIsClozeChecked] = useState<boolean>(false);
  const [showClozeHints, setShowClozeHints] = useState<boolean>(true);
  const [revealAllClozeAnswers, setRevealAllClozeAnswers] =
    useState<boolean>(false);

  const clozeGroups = useMemo(
    () => buildMedicalClozeGroups(rootNode, selectedScopeId, clozeDifficulty),
    [rootNode, selectedScopeId, clozeDifficulty]
  );

  const allClozeBlanks = useMemo(() => {
    const list: { blankId: string; expected: string; nodeId: string }[] = [];
    clozeGroups.forEach((g) => {
      g.lines.forEach((line) => {
        line.segments.forEach((seg) => {
          if (seg.type === 'blank' && seg.blankId) {
            list.push({
              blankId: seg.blankId,
              expected: seg.text,
              nodeId: line.nodeId,
            });
          }
        });
      });
    });
    return list;
  }, [clozeGroups]);

  const clozeScoreStats = useMemo(() => {
    let correct = 0;
    allClozeBlanks.forEach((b) => {
      const val = clozeInputs[b.blankId] || '';
      if (isClozeAnswerCorrect(val, b.expected)) {
        correct += 1;
      }
    });
    return {
      correct,
      total: allClozeBlanks.length,
    };
  }, [allClozeBlanks, clozeInputs]);

  // ============================================================================
  // MODE 3 STATE: 📝 VIẾT TỰ LUẬN & CHẤM BAREM TỪNG Ý (0.25đ / 0.5đ)
  // ============================================================================
  const [essayText, setEssayText] = useState<string>('');
  const [isBaremOpen, setIsBaremOpen] = useState<boolean>(true);
  const [hasTriggeredAutoScan, setHasTriggeredAutoScan] =
    useState<boolean>(false);
  const [rowGrades, setRowGrades] = useState<Record<string, RubricGradeStatus>>(
    {}
  );
  const [examTimerSec, setExamTimerSec] = useState<number>(1200); // 20 mins default
  const [isExamTimerRunning, setIsExamTimerRunning] = useState<boolean>(false);
  const [savedBannerMsg, setSavedBannerMsg] = useState<string | null>(null);

  // Persistent Mistake Bank & Exam History
  const [missedRecords, setMissedRecords] = useState<MissedRubricItemRecord[]>(
    () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_MISSED_BAREM);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
  );

  const [examHistory, setExamHistory] = useState<EssayExamHistoryRecord[]>(
    () => {
      try {
        const raw = localStorage.getItem(STORAGE_KEY_ESSAY_HISTORY);
        return raw ? JSON.parse(raw) : [];
      } catch {
        return [];
      }
    }
  );

  useEffect(() => {
    if (!isExamTimerRunning) return;
    const interval = window.setInterval(() => {
      setExamTimerSec((prev) => {
        if (prev <= 1) {
          setIsExamTimerRunning(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(interval);
  }, [isExamTimerRunning]);

  // Build Barem criteria for current scope & totalPointsScale
  const rubricCriteria = useMemo(
    () =>
      buildMedicalRubricCriteria(rootNode, selectedScopeId, totalPointsScale),
    [rootNode, selectedScopeId, totalPointsScale]
  );

  // Evaluate essay text against criteria in real time
  const evaluatedRows = useMemo(
    () => evaluateEssayAgainstRubric(essayText, rubricCriteria),
    [essayText, rubricCriteria]
  );

  // Reset row grades when scope or point scale changes
  useEffect(() => {
    setRowGrades({});
    setHasTriggeredAutoScan(false);
    setIsOutlineChecked(false);
    setManualOutlineHits({});
  }, [selectedScopeId, totalPointsScale, rootNode.id]);

  // Trigger "Chấm Barem" auto-scan & open rubric panel
  const handleRunBaremGrading = () => {
    setIsBaremOpen(true);
    setHasTriggeredAutoScan(true);
    setIsExamTimerRunning(false);

    const nextGrades: Record<string, RubricGradeStatus> = {};
    evaluatedRows.forEach((row) => {
      // If user already manually graded a row, keep it; otherwise use autoSuggestedStatus
      if (rowGrades[row.criterion.id] && rowGrades[row.criterion.id] !== 'ungraded') {
        nextGrades[row.criterion.id] = rowGrades[row.criterion.id];
      } else if (essayText.trim().length >= 5) {
        nextGrades[row.criterion.id] = row.autoSuggestedStatus;
      } else {
        nextGrades[row.criterion.id] = 'ungraded';
      }
    });
    setRowGrades(nextGrades);
  };

  const handleSetRowGrade = (
    criterionId: string,
    status: RubricGradeStatus
  ) => {
    setRowGrades((prev) => ({
      ...prev,
      [criterionId]: status,
    }));
  };

  // Compute total earned score
  const scoreSummary = useMemo(() => {
    let earned = 0;
    let fullCount = 0;
    let halfCount = 0;
    let missedCount = 0;
    let gradedCount = 0;

    rubricCriteria.forEach((c) => {
      const st = rowGrades[c.id] || 'ungraded';
      if (st === 'full') {
        earned += c.allocatedPoints;
        fullCount += 1;
        gradedCount += 1;
      } else if (st === 'half') {
        earned += c.allocatedPoints * 0.5;
        halfCount += 1;
        gradedCount += 1;
      } else if (st === 'missed') {
        missedCount += 1;
        gradedCount += 1;
      }
    });

    return {
      earned: Number(earned.toFixed(3)),
      total: totalPointsScale,
      fullCount,
      halfCount,
      missedCount,
      gradedCount,
      totalRows: rubricCriteria.length,
    };
  }, [rubricCriteria, rowGrades, totalPointsScale]);

  // Save exam attempt and record missed / half-graded items to Mistake Bank + Mindmap mastery
  const handleSaveExamResultAndMistakes = () => {
    const nowStr = new Date().toLocaleString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });

    const newAttempt: EssayExamHistoryRecord = {
      id: `attempt-${Date.now()}`,
      lessonId,
      lessonTitle,
      scopeTitle:
        selectedScopeId === 'all'
          ? 'Toàn bài học'
          : cleanNodeLabel(
              pillars.find((p) => p.id === selectedScopeId)?.label || ''
            ),
      earnedPoints: scoreSummary.earned,
      totalPoints: scoreSummary.total,
      fullCount: scoreSummary.fullCount,
      halfCount: scoreSummary.halfCount,
      missedCount: scoreSummary.missedCount,
      createdAt: nowStr,
    };

    const nextHistory = [newAttempt, ...examHistory].slice(0, 30);
    setExamHistory(nextHistory);
    try {
      localStorage.setItem(
        STORAGE_KEY_ESSAY_HISTORY,
        JSON.stringify(nextHistory)
      );
    } catch {
      // ignore
    }

    // Update Mistake Bank for 'missed' or 'half' rows & sync to Mindmap mastery
    const updatedMistakes = [...missedRecords];
    let markedReviewNodes = 0;

    rubricCriteria.forEach((c) => {
      const st = rowGrades[c.id];
      if (st === 'missed' || st === 'half') {
        onSetNodeMastery(c.nodeId, 'review');
        markedReviewNodes += 1;

        const existingIdx = updatedMistakes.findIndex(
          (m) => m.nodeId === c.nodeId && m.lessonId === lessonId
        );
        if (existingIdx >= 0) {
          updatedMistakes[existingIdx] = {
            ...updatedMistakes[existingIdx],
            missedCount: updatedMistakes[existingIdx].missedCount + 1,
            lastMissedAt: nowStr,
          };
        } else {
          updatedMistakes.unshift({
            criterionId: c.id,
            nodeId: c.nodeId,
            lessonId,
            lessonTitle,
            code: c.code,
            title: c.title,
            standardContent: c.standardContent,
            requiredKeywords: c.requiredKeywords,
            missedCount: 1,
            lastMissedAt: nowStr,
          });
        }
      } else if (st === 'full') {
        onSetNodeMastery(c.nodeId, 'mastered');
      }
    });

    setMissedRecords(updatedMistakes);
    try {
      localStorage.setItem(
        STORAGE_KEY_MISSED_BAREM,
        JSON.stringify(updatedMistakes)
      );
    } catch {
      // ignore
    }

    setSavedBannerMsg(
      `Đã lưu điểm (${scoreSummary.earned}/${scoreSummary.total.toFixed(
        1
      )}đ) & đồng bộ ${markedReviewNodes} ý bị sót sang trạng thái Cần ôn (!) trên sơ đồ!`
    );
    setTimeout(() => setSavedBannerMsg(null), 4000);
  };

  const formatTimer = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const wordCount = useMemo(() => {
    const trimmed = essayText.trim();
    if (!trimmed) return 0;
    return trimmed.split(/\s+/).length;
  }, [essayText]);

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-2 md:p-4">
      <div className="w-full max-w-[1440px] h-[94vh] bg-[#131314] border border-[#2d2e30] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* ================================================================= */}
        {/* TOP STUDIO HEADER                                                 */}
        {/* ================================================================= */}
        <div className="px-5 py-3.5 bg-[#1e1f20] border-b border-[#2d2e30] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#3f3c5c] border border-[#8ab4f8]/50 flex items-center justify-center text-lg shrink-0">
              ✍️
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-display font-bold text-[16px] text-white truncate">
                  Trung Tâm Luyện Thi Tự Luận Theo Barem Y Khoa
                </h2>
                <span className="text-[11px] font-mono text-[#8ab4f8] hidden sm:inline">
                  · Chấm chuẩn 0.25đ / 0.5đ & Từ khóa Bộ môn
                </span>
              </div>
              <p className="text-[12px] text-[#9aa0a6] truncate">
                Bài học: <span className="text-white font-medium">{lessonTitle}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {onOpenPrintStudio && (
              <button
                onClick={onOpenPrintStudio}
                className="px-3 py-1.5 rounded-xl bg-[#242528] hover:bg-[#2d2e30] border border-[#3c4043] text-[12px] font-medium text-[#e3e3e3] flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 text-[#8ab4f8]" />
                <span>🖨️ In Barem / Đề Cương A4</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-[#242528] hover:bg-[#ef4444]/20 text-[#9aa0a6] hover:text-[#f28b82] border border-[#2d2e30] transition-colors cursor-pointer"
              title="Đóng cửa sổ (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ================================================================= */}
        {/* CONTROL BAR: QUESTION SCOPE + SCORE SCALE + 3 MODE TABS           */}
        {/* ================================================================= */}
        <div className="px-5 py-3 bg-[#18191b] border-b border-[#2d2e30] flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Left: 3 Mode Switcher Tabs + Mistake Bank */}
          <div className="flex flex-wrap items-center gap-1.5 bg-[#131314] p-1 rounded-xl border border-[#2d2e30]">
            <button
              onClick={() => setActiveTab('outline')}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-display font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'outline'
                  ? 'bg-[#8ab4f8] text-[#131314] shadow-sm'
                  : 'text-[#e3e3e3] hover:bg-[#242528]'
              }`}
            >
              <ListChecks className="w-3.5 h-3.5" />
              <span>🦴 1. Lập Dàn Ý Nhanh (3p)</span>
            </button>

            <button
              onClick={() => setActiveTab('cloze')}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-display font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'cloze'
                  ? 'bg-[#8ab4f8] text-[#131314] shadow-sm'
                  : 'text-[#e3e3e3] hover:bg-[#242528]'
              }`}
            >
              <Key className="w-3.5 h-3.5" />
              <span>🔑 2. Điền Từ Khóa Barem</span>
            </button>

            <button
              onClick={() => setActiveTab('essay_rubric')}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-display font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'essay_rubric'
                  ? 'bg-[#8ab4f8] text-[#131314] shadow-sm'
                  : 'text-[#e3e3e3] hover:bg-[#242528]'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>📝 3. Viết Tự Luận & Chấm Barem</span>
            </button>

            <button
              onClick={() => setActiveTab('mistake_bank')}
              className={`px-3 py-1.5 rounded-lg text-[12.5px] font-display font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                activeTab === 'mistake_bank'
                  ? 'bg-[#f59e0b] text-[#131314] shadow-sm'
                  : 'text-[#fdd663] hover:bg-[#242528]'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>
                📌 Sổ Tay Ý Hay Sót ({missedRecords.length})
              </span>
            </button>
          </div>

          {/* Right: Question Scope Selector & Score Scale */}
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="flex items-center gap-1.5">
              <span className="text-[11.5px] text-[#9aa0a6] font-medium">
                Phạm vi câu hỏi:
              </span>
              <select
                value={selectedScopeId}
                onChange={(e) => setSelectedScopeId(e.target.value)}
                className="bg-[#242528] border border-[#3c4043] rounded-lg px-2.5 py-1.5 text-[12.5px] text-white font-medium focus:outline-none focus:border-[#8ab4f8] max-w-[280px] truncate cursor-pointer"
              >
                <option value="all">
                  📚 Toàn bài học ({pillars.length} mục lớn Cấp 1)
                </option>
                {pillars.map((p, idx) => (
                  <option key={p.id} value={p.id}>
                    Câu hỏi nhánh {idx + 1}: {cleanNodeLabel(p.label)}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1 bg-[#131314] border border-[#2d2e30] rounded-lg p-1">
              <span className="text-[11px] text-[#9aa0a6] px-1.5">
                Thang điểm:
              </span>
              {[2.0, 3.0, 4.0, 5.0, 10.0].map((pts) => (
                <button
                  key={pts}
                  onClick={() => setTotalPointsScale(pts)}
                  className={`px-2 py-1 rounded text-[11.5px] font-mono font-semibold transition-colors cursor-pointer ${
                    totalPointsScale === pts
                      ? 'bg-[#3f3c5c] text-white border border-[#8ab4f8]/60'
                      : 'text-[#9aa0a6] hover:text-white'
                  }`}
                >
                  {pts.toFixed(1)}đ
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Toast Notification Banner inside Studio */}
        {savedBannerMsg && (
          <div className="px-5 py-2 bg-[#10b981]/20 border-b border-[#10b981]/40 text-[#81c995] text-[12.5px] font-medium flex items-center justify-between">
            <span>✓ {savedBannerMsg}</span>
            <button
              onClick={() => setSavedBannerMsg(null)}
              className="text-xs underline cursor-pointer"
            >
              Đóng
            </button>
          </div>
        )}

        {/* ================================================================= */}
        {/* MAIN STUDIO WORKSPACE BODY                                        */}
        {/* ================================================================= */}
        <div className="flex-1 min-h-0 overflow-hidden flex flex-col">
          {/* --------------------------------------------------------------- */}
          {/* TAB 1: 🦴 LUYỆN LẬP DÀN Ý NHANH (OUTLINE RECALL - 3 PHÚT)       */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'outline' && (
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#2d2e30] overflow-hidden">
              {/* Left Column (5 cols): 3-Minute Rapid Outline Input */}
              <div className="lg:col-span-5 flex flex-col h-full min-h-0 p-5 bg-[#161719]">
                <div className="p-3.5 rounded-xl bg-[#1e1f20] border border-[#2d2e30] mb-3">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-mono uppercase tracking-wider text-[#8ab4f8] font-semibold">
                      PHẢN XẠ 3 PHÚT ĐẦU GIỜ THI TỰ LUẬN
                    </span>
                    {/* 3-Minute Countdown Timer */}
                    <div className="flex items-center gap-1.5 bg-[#131314] px-2.5 py-1 rounded-lg border border-[#3c4043]">
                      <Clock className="w-3.5 h-3.5 text-[#fdd663]" />
                      <span
                        className={`font-mono text-[13px] font-bold ${
                          outlineTimerSec <= 30 ? 'text-[#f28b82]' : 'text-[#fdd663]'
                        }`}
                      >
                        {formatTimer(outlineTimerSec)}
                      </span>
                      <button
                        onClick={() =>
                          setIsOutlineTimerRunning((prev) => !prev)
                        }
                        className="p-1 rounded hover:bg-[#2d2e30] text-[#e3e3e3] cursor-pointer"
                        title={
                          isOutlineTimerRunning ? 'Tạm dừng' : 'Bắt đầu đếm 3 phút'
                        }
                      >
                        {isOutlineTimerRunning ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setIsOutlineTimerRunning(false);
                          setOutlineTimerSec(180);
                        }}
                        className="p-1 rounded hover:bg-[#2d2e30] text-[#9aa0a6] cursor-pointer"
                        title="Đặt lại 03:00"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-display font-bold text-[14.5px] text-white leading-snug">
                    {activeQuestionTitle}
                  </h3>
                  <p className="text-[12px] text-[#9aa0a6] mt-1">
                    Không nhìn tài liệu, hãy gạch nhanh tất cả các{' '}
                    <span className="text-white font-medium">
                      Đầu mục lớn (Cấp 1) và Phân mục (Cấp 2)
                    </span>{' '}
                    mà bạn nhớ được để dựng khung sườn bài tự luận:
                  </p>
                </div>

                <textarea
                  value={outlineDraftText}
                  onChange={(e) => setOutlineDraftText(e.target.value)}
                  placeholder={`Gõ nhanh dàn ý của bạn tại đây (mỗi ý 1 dòng)...\nVí dụ:\nI. Khái niệm và bản chất u ác tính\n1.1. Định nghĩa tăng sinh tự động\n1.2. Phân loại biểu mô & trung mô\nII. Đặc điểm giải phẫu bệnh...`}
                  className="flex-1 w-full bg-[#131314] border border-[#3c4043] focus:border-[#8ab4f8] rounded-xl p-4 text-[14px] text-white leading-relaxed resize-none focus:outline-none font-sans"
                />

                <div className="pt-3 flex items-center justify-between gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setOutlineDraftText('');
                      setIsOutlineChecked(false);
                      setManualOutlineHits({});
                    }}
                    className="px-3 py-2 rounded-xl bg-[#242528] hover:bg-[#2d2e30] text-[#9aa0a6] hover:text-white text-[12.5px] font-medium transition-colors cursor-pointer"
                  >
                    Xóa làm lại
                  </button>

                  <button
                    onClick={handleCheckOutline}
                    className="px-4 py-2 rounded-xl bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-display font-bold text-[13px] flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
                  >
                    <ListChecks className="w-4 h-4" />
                    <span>Đối Chiếu Với Cây Dàn Ý Chuẩn ({outlineTargets.length} mục)</span>
                  </button>
                </div>
              </div>

              {/* Right Column (7 cols): Standard Tree Outline Comparison */}
              <div className="lg:col-span-7 flex flex-col h-full min-h-0 p-5 bg-[#131314] overflow-y-auto">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-4 border-b border-[#2d2e30]">
                  <div>
                    <h3 className="font-display font-bold text-[15px] text-white">
                      Khung Dàn Ý Chuẩn Bộ Môn (Cấp 1 & Cấp 2)
                    </h3>
                    <p className="text-[12px] text-[#9aa0a6]">
                      {isOutlineChecked
                        ? 'Kết quả đối chiếu tự động từ dàn ý bạn vừa lập (Click vào từng dòng để tự chỉnh Đã nhớ / Bị sót):'
                        : 'Bấm "Đối Chiếu Với Cây Dàn Ý Chuẩn" bên trái sau khi bạn lập xong dàn ý nháp.'}
                    </p>
                  </div>

                  {isOutlineChecked && (
                    <div className="flex items-center gap-2">
                      <span className="text-[12.5px] font-mono font-bold text-[#81c995]">
                        Đã nhớ:{' '}
                        {
                          outlineTargets.filter((t) => manualOutlineHits[t.id])
                            .length
                        }
                        /{outlineTargets.length} đầu mục
                      </span>
                      <button
                        onClick={() => {
                          let count = 0;
                          outlineTargets.forEach((t) => {
                            if (!manualOutlineHits[t.id]) {
                              onSetNodeMastery(t.nodeId, 'review');
                              count += 1;
                            } else {
                              onSetNodeMastery(t.nodeId, 'mastered');
                            }
                          });
                          setSavedBannerMsg(
                            `Đã đánh dấu ${count} đầu mục bị sót vào danh sách Cần ôn (!) trên sơ đồ!`
                          );
                          setTimeout(() => setSavedBannerMsg(null), 3500);
                        }}
                        className="px-3 py-1.5 rounded-lg bg-[#f59e0b]/20 hover:bg-[#f59e0b]/30 border border-[#f59e0b]/40 text-[#fdd663] text-[12px] font-medium transition-colors cursor-pointer"
                      >
                        Đẩy mục sót sang Cần ôn (!)
                      </button>
                    </div>
                  )}
                </div>

                {!isOutlineChecked ? (
                  <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-[#2d2e30] rounded-2xl bg-[#18191b]">
                    <div className="w-12 h-12 rounded-2xl bg-[#242528] flex items-center justify-center text-2xl mb-3">
                      🦴
                    </div>
                    <h4 className="font-display font-semibold text-[15px] text-white mb-1">
                      Đang ẩn Cây Dàn Ý Chuẩn để bạn tự nhớ lại
                    </h4>
                    <p className="text-[12.5px] text-[#9aa0a6] max-w-md mb-4">
                      Khi đi thi tự luận Y khoa, 3 phút đầu tiên lập dàn ý quyết định 80% việc bạn không bị bỏ sót các mục lớn 0.5đ - 1.0đ.
                    </p>
                    <button
                      onClick={handleCheckOutline}
                      className="px-4 py-2 rounded-xl bg-[#242528] hover:bg-[#2d2e30] border border-[#3c4043] text-[#8ab4f8] text-[12.5px] font-medium cursor-pointer"
                    >
                      👁️ Mở xem luôn Cây Dàn Ý Chuẩn để tự kiểm
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {outlineTargets.map((item) => {
                      const isHit = Boolean(manualOutlineHits[item.id]);
                      return (
                        <div
                          key={item.id}
                          onClick={() =>
                            setManualOutlineHits((prev) => ({
                              ...prev,
                              [item.id]: !prev[item.id],
                            }))
                          }
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start justify-between gap-3 ${
                            item.level === 1 ? 'bg-[#1e1f20]' : 'bg-[#18191b] ml-5'
                          } ${
                            isHit
                              ? 'border-[#10b981]/50 hover:border-[#10b981]'
                              : 'border-[#ef4444]/50 hover:border-[#ef4444]'
                          }`}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span
                                className={`font-mono text-[11.5px] font-bold ${
                                  item.level === 1
                                    ? 'text-[#8ab4f8]'
                                    : 'text-[#c58af9]'
                                }`}
                              >
                                {item.code}
                              </span>
                              <span
                                className={`font-display font-semibold ${
                                  item.level === 1
                                    ? 'text-[14.5px] text-white'
                                    : 'text-[13.5px] text-[#e3e3e3]'
                                }`}
                              >
                                {item.title}
                              </span>
                            </div>
                            {item.summary && (
                              <p className="text-[12px] text-[#9aa0a6] mt-1">
                                {item.summary}
                              </p>
                            )}
                          </div>

                          <div className="shrink-0">
                            {isHit ? (
                              <span className="px-2.5 py-1 rounded-lg bg-[#10b981]/15 border border-[#10b981]/40 text-[#81c995] text-[11.5px] font-semibold flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Đã nhớ ý
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-lg bg-[#ef4444]/15 border border-[#ef4444]/40 text-[#f28b82] text-[11.5px] font-semibold flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" />
                                ⚠️ Sót đầu mục
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TAB 2: 🔑 ĐIỀN TỪ KHÓA ĂN ĐIỂM BAREM (MEDICAL KEYWORD CLOZE)     */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'cloze' && (
            <div className="flex-1 min-h-0 flex flex-col overflow-hidden bg-[#131314]">
              {/* Cloze Sub-Toolbar */}
              <div className="px-6 py-3 bg-[#18191b] border-b border-[#2d2e30] flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1 bg-[#131314] p-1 rounded-lg border border-[#2d2e30]">
                    <button
                      onClick={() => {
                        setClozeDifficulty('standard');
                        setIsClozeChecked(false);
                      }}
                      className={`px-2.5 py-1 rounded text-[12px] font-medium cursor-pointer ${
                        clozeDifficulty === 'standard'
                          ? 'bg-[#3f3c5c] text-white'
                          : 'text-[#9aa0a6] hover:text-white'
                      }`}
                    >
                      Mức 1: Khuyết Từ Khóa Chính
                    </button>
                    <button
                      onClick={() => {
                        setClozeDifficulty('hard');
                        setIsClozeChecked(false);
                      }}
                      className={`px-2.5 py-1 rounded text-[12px] font-medium cursor-pointer ${
                        clozeDifficulty === 'hard'
                          ? 'bg-[#3f3c5c] text-white'
                          : 'text-[#9aa0a6] hover:text-white'
                      }`}
                    >
                      Mức 2: Khuyết Sâu (Cả Thuật Ngữ & Số Liệu)
                    </button>
                  </div>

                  <button
                    onClick={() => setShowClozeHints((prev) => !prev)}
                    className={`px-2.5 py-1.5 rounded-lg border text-[12px] font-medium flex items-center gap-1.5 cursor-pointer ${
                      showClozeHints
                        ? 'bg-[#242528] border-[#8ab4f8]/50 text-[#8ab4f8]'
                        : 'bg-[#131314] border-[#2d2e30] text-[#9aa0a6]'
                    }`}
                  >
                    <HelpCircle className="w-3.5 h-3.5" />
                    <span>
                      {showClozeHints
                        ? 'Đang bật gợi ý chữ đầu (B.. m..)'
                        : 'Tắt gợi ý chữ đầu'}
                    </span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[12.5px] font-mono text-[#81c995] font-semibold mr-2">
                    Đúng: {clozeScoreStats.correct} / {clozeScoreStats.total} ô từ khóa
                  </span>

                  <button
                    onClick={() => setIsClozeChecked(true)}
                    className="px-3.5 py-1.5 rounded-lg bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-display font-bold text-[12.5px] flex items-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Kiểm Tra Đáp Án</span>
                  </button>

                  <button
                    onClick={() =>
                      setRevealAllClozeAnswers((prev) => !prev)
                    }
                    className="px-3 py-1.5 rounded-lg bg-[#242528] hover:bg-[#2d2e30] border border-[#3c4043] text-[#e3e3e3] text-[12px] font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    {revealAllClozeAnswers ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-[#fdd663]" />
                        <span>Ẩn đáp án</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-[#8ab4f8]" />
                        <span>Hiện toàn bộ đáp án</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => {
                      setClozeInputs({});
                      setIsClozeChecked(false);
                      setRevealAllClozeAnswers(false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#242528] hover:bg-[#2d2e30] text-[#9aa0a6] hover:text-white text-[12px] cursor-pointer"
                  >
                    Làm lại
                  </button>
                </div>
              </div>

              {/* Cloze Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-6 max-w-5xl mx-auto w-full">
                {clozeGroups.map((group) => (
                  <div
                    key={group.pillarId}
                    className="rounded-2xl bg-[#18191b] border border-[#2d2e30] overflow-hidden"
                  >
                    <div className="px-5 py-3 bg-[#1e1f20] border-b border-[#2d2e30] flex items-center gap-2.5">
                      <span className="font-mono text-[12px] font-bold text-[#8ab4f8]">
                        {group.pillarCode}
                      </span>
                      <span className="text-[#5f6368]">·</span>
                      <h4 className="font-display font-bold text-[15px] text-white">
                        {group.pillarTitle}
                      </h4>
                    </div>

                    <div className="p-5 space-y-3">
                      {group.lines.map((line) => (
                        <div
                          key={line.id}
                          className={`leading-relaxed text-[14px] ${
                            line.level === 2
                              ? 'font-medium text-white pt-1'
                              : line.level === 3
                              ? 'pl-5 text-[#e3e3e3]'
                              : 'pl-10 text-[#9aa0a6] text-[13.5px]'
                          }`}
                        >
                          <span className="font-mono text-[11.5px] text-[#8ab4f8] mr-2">
                            {line.code}
                          </span>
                          {line.segments.map((seg, sIdx) => {
                            if (seg.type === 'text') {
                              return <span key={sIdx}>{seg.text}</span>;
                            }
                            const blankId = seg.blankId || `${line.id}-${sIdx}`;
                            const userVal = clozeInputs[blankId] || '';
                            const isCorrect = isClozeAnswerCorrect(
                              userVal,
                              seg.text
                            );

                            return (
                              <span
                                key={blankId}
                                className="inline-flex items-center gap-1 mx-1 align-baseline"
                              >
                                <input
                                  type="text"
                                  value={
                                    revealAllClozeAnswers ? seg.text : userVal
                                  }
                                  readOnly={revealAllClozeAnswers}
                                  onChange={(e) =>
                                    setClozeInputs((prev) => ({
                                      ...prev,
                                      [blankId]: e.target.value,
                                    }))
                                  }
                                  placeholder={
                                    showClozeHints && seg.hint
                                      ? `[${seg.hint}]`
                                      : '[.......]'
                                  }
                                  style={{
                                    width: `${Math.max(
                                      110,
                                      Math.min(280, seg.text.length * 9 + 28)
                                    )}px`,
                                  }}
                                  className={`px-2.5 py-0.5 rounded-md font-mono text-[13px] border transition-colors focus:outline-none ${
                                    revealAllClozeAnswers
                                      ? 'bg-[#3f3c5c]/50 border-[#8ab4f8] text-[#8ab4f8] font-semibold'
                                      : isCorrect
                                      ? 'bg-[#10b981]/20 border-[#10b981] text-[#81c995] font-semibold'
                                      : isClozeChecked
                                      ? 'bg-[#ef4444]/15 border-[#ef4444] text-[#f28b82]'
                                      : 'bg-[#131314] border-[#4b5056] focus:border-[#8ab4f8] text-white'
                                  }`}
                                />
                                {isClozeChecked &&
                                  !isCorrect &&
                                  !revealAllClozeAnswers && (
                                    <span className="text-[12px] font-mono text-[#fdd663] bg-[#f59e0b]/15 px-1.5 py-0.5 rounded">
                                      Đáp án: {seg.text}
                                    </span>
                                  )}
                              </span>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TAB 3: 📝 VIẾT TỰ LUẬN & CHẤM BAREM TỪNG Ý (0.25đ / 0.5đ)        */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'essay_rubric' && (
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#2d2e30] overflow-hidden">
              {/* LEFT COLUMN (5 cols): ESSAY EDITOR + EXAM TIMER */}
              <div className="lg:col-span-5 flex flex-col h-full min-h-0 p-4 bg-[#161719]">
                {/* Prompt Box */}
                <div className="p-3.5 rounded-xl bg-[#1e1f20] border border-[#2d2e30] mb-3 shrink-0">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                    <span className="text-[11px] font-mono text-[#8ab4f8] font-semibold">
                      ĐỀ THI TỰ LUẬN · THANG ĐIỂM {totalPointsScale.toFixed(1)}Đ ({rubricCriteria.length} Ý BAREM)
                    </span>

                    {/* Exam Countdown Timer */}
                    <div className="flex items-center gap-1.5 bg-[#131314] px-2.5 py-1 rounded-lg border border-[#3c4043]">
                      <Clock className="w-3.5 h-3.5 text-[#8ab4f8]" />
                      <span className="font-mono text-[12.5px] font-bold text-white">
                        {formatTimer(examTimerSec)}
                      </span>
                      <button
                        onClick={() =>
                          setIsExamTimerRunning((prev) => !prev)
                        }
                        className="p-0.5 rounded hover:bg-[#2d2e30] text-[#8ab4f8] cursor-pointer"
                        title={
                          isExamTimerRunning ? 'Tạm dừng' : 'Bắt đầu bấm giờ thi'
                        }
                      >
                        {isExamTimerRunning ? (
                          <Pause className="w-3 h-3" />
                        ) : (
                          <Play className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setIsExamTimerRunning(false);
                          setExamTimerSec(1200);
                        }}
                        className="p-0.5 rounded hover:bg-[#2d2e30] text-[#9aa0a6] cursor-pointer"
                        title="Đặt lại 20:00"
                      >
                        <RotateCcw className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <h3 className="font-display font-bold text-[14px] text-white leading-snug">
                    {activeQuestionTitle}
                  </h3>
                </div>

                {/* Quick Formatting Helper Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2 shrink-0">
                  <div className="flex items-center gap-1">
                    {['I. ', 'II. ', '1. ', '2. ', '- ', '+ ', '→ '].map(
                      (prefix) => (
                        <button
                          key={prefix}
                          onClick={() =>
                            setEssayText((prev) =>
                              prev ? `${prev}\n${prefix}` : prefix
                            )
                          }
                          className="px-2 py-1 rounded bg-[#242528] hover:bg-[#2d2e30] border border-[#3c4043] text-[11.5px] font-mono text-[#e3e3e3] cursor-pointer"
                        >
                          {prefix.trim()}
                        </button>
                      )
                    )}
                  </div>
                  <span className="text-[11.5px] font-mono text-[#9aa0a6]">
                    {wordCount} từ
                  </span>
                </div>

                {/* Essay Textarea */}
                <textarea
                  value={essayText}
                  onChange={(e) => setEssayText(e.target.value)}
                  placeholder={`Soạn bài thi tự luận của bạn tại đây (hoặc bạn có thể tự viết tay ra giấy nháp bên ngoài rồi bấm nút "⚖️ Chấm Barem" bên dưới để tự tích điểm từng ý 0.25đ - 0.5đ)...\n\nMẹo ăn trọn điểm Barem Bộ môn:\n- Luôn viết rõ Từ khóa chuyên môn trước dấu hai chấm (:)\n- Đầy đủ phân loại, cơ chế và triệu chứng cờ đỏ nếu có.`}
                  className="flex-1 w-full bg-[#131314] border border-[#3c4043] focus:border-[#8ab4f8] rounded-xl p-4 text-[14px] text-white leading-relaxed resize-none focus:outline-none font-sans"
                />

                {/* Bottom Action Buttons */}
                <div className="pt-3 flex flex-wrap items-center justify-between gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setEssayText('');
                      setRowGrades({});
                      setHasTriggeredAutoScan(false);
                    }}
                    className="px-3 py-2 rounded-xl bg-[#242528] hover:bg-[#2d2e30] text-[#9aa0a6] hover:text-white text-[12px] font-medium transition-colors cursor-pointer"
                  >
                    Làm mới bài viết
                  </button>

                  <button
                    onClick={handleRunBaremGrading}
                    className="px-4 py-2 rounded-xl bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-display font-bold text-[13px] flex items-center gap-1.5 shadow-lg transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      ⚖️ Chấm Barem & Quét Từ Khóa ({totalPointsScale.toFixed(1)}đ)
                    </span>
                  </button>
                </div>
              </div>

              {/* RIGHT COLUMN (7 cols): BẢNG BAREM CHẤM THI CHUẨN BỘ MÔN */}
              <div className="lg:col-span-7 flex flex-col h-full min-h-0 bg-[#131314]">
                {/* Sticky Scoreboard Header */}
                <div className="px-5 py-3.5 bg-[#18191b] border-b border-[#2d2e30] flex flex-wrap items-center justify-between gap-3 shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-display font-bold text-[15px] text-white">
                        Bảng Barem Chấm Thi Chuẩn Bộ Môn
                      </h3>
                      <button
                        onClick={() => setIsBaremOpen((prev) => !prev)}
                        className="px-2 py-0.5 rounded bg-[#242528] text-[11px] text-[#8ab4f8] hover:bg-[#2d2e30] cursor-pointer"
                      >
                        {isBaremOpen ? 'Ẩn Barem khi đang viết' : 'Hiện Barem'}
                      </button>
                    </div>
                    <p className="text-[11.5px] text-[#9aa0a6] mt-0.5">
                      Click chọn <span className="text-[#81c995] font-semibold">[✓ Đủ ý]</span>,{' '}
                      <span className="text-[#fdd663] font-semibold">[½ Nửa ý]</span> hoặc{' '}
                      <span className="text-[#f28b82] font-semibold">[✗ Quên (0đ)]</span> ở từng dòng giống hệt giảng viên chấm thi:
                    </p>
                  </div>

                  {/* Live Score Display + Save Button */}
                  <div className="flex items-center gap-3">
                    <div className="px-3.5 py-1.5 rounded-xl bg-[#131314] border border-[#3c4043] flex items-center gap-2.5">
                      <Award className="w-4 h-4 text-[#fdd663]" />
                      <div>
                        <div className="text-[10px] text-[#9aa0a6] uppercase font-mono">
                          TỔNG ĐIỂM THỰC TẾ
                        </div>
                        <div className="font-mono font-bold text-[16px] text-white">
                          <span className="text-[#81c995]">
                            {scoreSummary.earned}
                          </span>{' '}
                          / {scoreSummary.total.toFixed(2)} điểm
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleSaveExamResultAndMistakes}
                      className="px-3.5 py-2 rounded-xl bg-[#10b981] hover:bg-[#059669] text-[#131314] font-display font-bold text-[12.5px] flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
                      title="Lưu điểm vào lịch sử & Đẩy các ý bị quên sang trạng thái Cần ôn (!) trên sơ đồ"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Lưu Điểm & Ghi Nhớ Ý Sót</span>
                    </button>
                  </div>
                </div>

                {/* Barem Criteria Rows */}
                {!isBaremOpen ? (
                  <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                    <EyeOff className="w-10 h-10 text-[#9aa0a6] mb-3" />
                    <h4 className="font-display font-semibold text-[15px] text-white mb-1">
                      Đang che Bảng Barem để bạn tập trung viết tự luận
                    </h4>
                    <p className="text-[12.5px] text-[#9aa0a6] max-w-md mb-4">
                      Sau khi viết xong trên máy hoặc trên giấy nháp, hãy bấm nút bên dưới để mở Bảng Barem chấm từng ý 0.25đ - 0.5đ.
                    </p>
                    <button
                      onClick={handleRunBaremGrading}
                      className="px-4 py-2 rounded-xl bg-[#8ab4f8] text-[#131314] font-display font-bold text-[13px] cursor-pointer"
                    >
                      ⚖️ Mở Bảng Barem & Chấm Bài Ngay
                    </button>
                  </div>
                ) : (
                  <div className="flex-1 overflow-y-auto p-5 space-y-3.5">
                    {evaluatedRows.map((row) => {
                      const { criterion, matchedKeywords, missingKeywords } =
                        row;
                      const currentGrade =
                        rowGrades[criterion.id] || 'ungraded';
                      const fullPts = criterion.allocatedPoints;
                      const halfPts = Number((fullPts * 0.5).toFixed(3));

                      const isMissedWarning =
                        currentGrade === 'missed' ||
                        (hasTriggeredAutoScan &&
                          essayText.trim().length > 0 &&
                          matchedKeywords.length === 0 &&
                          currentGrade === 'ungraded');

                      return (
                        <div
                          key={criterion.id}
                          className={`rounded-xl border p-4 transition-all ${
                            currentGrade === 'full'
                              ? 'bg-[#10b981]/10 border-[#10b981]/50'
                              : currentGrade === 'half'
                              ? 'bg-[#f59e0b]/10 border-[#f59e0b]/50'
                              : isMissedWarning
                              ? 'bg-[#ef4444]/10 border-[#ef4444]/60'
                              : 'bg-[#18191b] border-[#2d2e30]'
                          }`}
                        >
                          {/* Top Row: Code + Pillar + Allocated Barem Point + Missing Warning */}
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="font-mono text-[12px] font-bold text-[#8ab4f8] bg-[#242528] px-2 py-0.5 rounded border border-[#3c4043]">
                                Ý {criterion.code}
                              </span>
                              <span className="text-[11.5px] text-[#9aa0a6] truncate">
                                {criterion.pillarLabel}
                              </span>
                              {isMissedWarning && (
                                <span className="px-2 py-0.5 rounded bg-[#ef4444]/20 border border-[#ef4444]/50 text-[#f28b82] font-mono text-[11px] font-bold">
                                  ⚠️ SÓT Ý (-{fullPts.toFixed(2)}đ)
                                </span>
                              )}
                            </div>

                            <span className="font-mono text-[12.5px] font-bold text-[#fdd663] shrink-0">
                              Barem: {fullPts.toFixed(2)} điểm
                            </span>
                          </div>

                          {/* Standard Content */}
                          <div className="text-[14px] font-semibold text-white mb-1.5 leading-snug">
                            {criterion.standardContent}
                          </div>

                          {/* Sub-points if any */}
                          {criterion.subPoints.length > 0 && (
                            <ul className="space-y-1 mb-3 pl-4 border-l-2 border-[#2d2e30] text-[12.5px] text-[#e3e3e3]">
                              {criterion.subPoints.map((sp, idx) => (
                                <li key={idx} className="leading-relaxed">
                                  • {sp}
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Required Medical Keywords Bar */}
                          <div className="p-2.5 rounded-lg bg-[#131314] border border-[#2d2e30] mb-3">
                            <div className="text-[11px] font-mono text-[#9aa0a6] mb-1.5 flex items-center justify-between">
                              <span>🔑 TỪ KHÓA CHUYÊN MÔN BẮT BUỘC PHẢI CÓ:</span>
                              {essayText.trim().length >= 5 && (
                                <span className="text-[#8ab4f8]">
                                  Trúng {matchedKeywords.length}/
                                  {criterion.requiredKeywords.length} từ khóa
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {criterion.requiredKeywords.map((kw, kIdx) => {
                                const isHit = matchedKeywords.includes(kw);
                                const showScanState =
                                  essayText.trim().length >= 5;
                                return (
                                  <span
                                    key={kIdx}
                                    className={`px-2 py-0.5 rounded text-[12px] font-medium border ${
                                      !showScanState
                                        ? 'bg-[#3f3c5c]/40 border-[#8ab4f8]/40 text-[#aecbfa]'
                                        : isHit
                                        ? 'bg-[#10b981]/20 border-[#10b981]/60 text-[#81c995] font-semibold'
                                        : 'bg-[#ef4444]/15 border-[#ef4444]/40 text-[#f28b82]'
                                    }`}
                                  >
                                    {showScanState && (isHit ? '✓ ' : '✗ ')}
                                    {kw}
                                  </span>
                                );
                              })}
                            </div>
                          </div>

                          {/* 3 Self-Grading Rubric Tick Buttons */}
                          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                            <span className="text-[11.5px] text-[#9aa0a6]">
                              Tự chấm điểm ý này:
                            </span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              <button
                                onClick={() =>
                                  handleSetRowGrade(criterion.id, 'full')
                                }
                                className={`px-3 py-1.5 rounded-lg font-mono text-[12px] font-semibold border transition-all cursor-pointer ${
                                  currentGrade === 'full'
                                    ? 'bg-[#10b981] text-[#131314] border-[#10b981] shadow-sm'
                                    : 'bg-[#242528] text-[#81c995] border-[#3c4043] hover:border-[#10b981]'
                                }`}
                              >
                                ✓ Đủ ý (+{fullPts.toFixed(2)}đ)
                              </button>

                              <button
                                onClick={() =>
                                  handleSetRowGrade(criterion.id, 'half')
                                }
                                className={`px-3 py-1.5 rounded-lg font-mono text-[12px] font-semibold border transition-all cursor-pointer ${
                                  currentGrade === 'half'
                                    ? 'bg-[#f59e0b] text-[#131314] border-[#f59e0b] shadow-sm'
                                    : 'bg-[#242528] text-[#fdd663] border-[#3c4043] hover:border-[#f59e0b]'
                                }`}
                              >
                                ½ Nửa ý (+{halfPts}đ)
                              </button>

                              <button
                                onClick={() =>
                                  handleSetRowGrade(criterion.id, 'missed')
                                }
                                className={`px-3 py-1.5 rounded-lg font-mono text-[12px] font-semibold border transition-all cursor-pointer ${
                                  currentGrade === 'missed'
                                    ? 'bg-[#ef4444] text-white border-[#ef4444] shadow-sm'
                                    : 'bg-[#242528] text-[#f28b82] border-[#3c4043] hover:border-[#ef4444]'
                                }`}
                              >
                                ✗ Quên (0đ)
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* --------------------------------------------------------------- */}
          {/* TAB 4: 📌 SỔ TAY CÁC Ý HAY SÓT BAREM & LỊCH SỬ ĐIỂM              */}
          {/* --------------------------------------------------------------- */}
          {activeTab === 'mistake_bank' && (
            <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-[#2d2e30] overflow-hidden bg-[#131314]">
              {/* Left (7 cols): Missed Rubric Criteria Bank */}
              <div className="lg:col-span-7 flex flex-col h-full min-h-0 p-5 overflow-y-auto">
                <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-[#2d2e30]">
                  <div>
                    <h3 className="font-display font-bold text-[15px] text-white">
                      📌 Danh Sách Các Ý Hay Bị Mất Điểm Barem ({missedRecords.length})
                    </h3>
                    <p className="text-[12px] text-[#9aa0a6]">
                      Tổng hợp những tiêu chí Barem bạn đã đánh dấu Quên (0đ) hoặc Nửa ý trong các lần luyện thi để tập trung ôn kỹ trước ngày thi:
                    </p>
                  </div>
                  {missedRecords.length > 0 && (
                    <button
                      onClick={() => {
                        setMissedRecords([]);
                        localStorage.removeItem(STORAGE_KEY_MISSED_BAREM);
                      }}
                      className="px-2.5 py-1.5 rounded-lg bg-[#242528] hover:bg-[#ef4444]/20 text-[#9aa0a6] hover:text-[#f28b82] text-[11.5px] flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa danh sách</span>
                    </button>
                  )}
                </div>

                {missedRecords.length === 0 ? (
                  <div className="p-8 rounded-2xl bg-[#18191b] border border-[#2d2e30] text-center">
                    <p className="text-[13.5px] text-[#9aa0a6]">
                      Chưa có ý nào bị mất điểm được lưu. Khi bạn chấm Barem ở Tab 3 và bấm{' '}
                      <span className="text-white font-semibold">
                        "Lưu Điểm & Ghi Nhớ Ý Sót"
                      </span>
                      , các ý bạn bị quên sẽ tự động lưu vào đây!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {missedRecords.map((item) => (
                      <div
                        key={`${item.lessonId}-${item.nodeId}`}
                        className="p-4 rounded-xl bg-[#18191b] border border-[#f59e0b]/40"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-[11.5px] font-mono text-[#fdd663] font-semibold">
                            {item.lessonTitle} · Ý {item.code}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-mono text-[#f28b82]">
                              Quên {item.missedCount} lần (Gần nhất: {item.lastMissedAt})
                            </span>
                            <button
                              onClick={() => {
                                onSetNodeMastery(item.nodeId, 'mastered');
                                const next = missedRecords.filter(
                                  (m) =>
                                    !(
                                      m.nodeId === item.nodeId &&
                                      m.lessonId === item.lessonId
                                    )
                                );
                                setMissedRecords(next);
                                localStorage.setItem(
                                  STORAGE_KEY_MISSED_BAREM,
                                  JSON.stringify(next)
                                );
                              }}
                              className="px-2 py-0.5 rounded bg-[#10b981]/20 text-[#81c995] text-[11px] font-medium hover:bg-[#10b981]/30 cursor-pointer"
                            >
                              ✓ Đã thuộc lòng ý này
                            </button>
                          </div>
                        </div>

                        <div className="text-[14px] font-semibold text-white mb-2">
                          {item.standardContent}
                        </div>

                        <div className="flex flex-wrap gap-1.5">
                          {item.requiredKeywords.map((kw, i) => (
                            <span
                              key={i}
                              className="px-2 py-0.5 rounded bg-[#242528] border border-[#3c4043] text-[11.5px] text-[#8ab4f8]"
                            >
                              🔑 {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Right (5 cols): Exam Score History */}
              <div className="lg:col-span-5 flex flex-col h-full min-h-0 p-5 bg-[#161719] overflow-y-auto">
                <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-[#2d2e30]">
                  <div>
                    <h3 className="font-display font-bold text-[15px] text-white">
                      📊 Lịch Sử Luyện Thi & Tự Chấm Barem
                    </h3>
                    <p className="text-[12px] text-[#9aa0a6]">
                      Theo dõi tiến độ tăng điểm qua từng lần tự viết tự luận:
                    </p>
                  </div>
                </div>

                {examHistory.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#1e1f20] border border-[#2d2e30] text-center text-[13px] text-[#9aa0a6]">
                    Chưa có lịch sử chấm bài.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {examHistory.map((h) => (
                      <div
                        key={h.id}
                        className="p-3.5 rounded-xl bg-[#1e1f20] border border-[#2d2e30] flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="font-display font-semibold text-[13.5px] text-white truncate">
                            {h.lessonTitle}
                          </div>
                          <div className="text-[11.5px] text-[#9aa0a6] truncate">
                            Phạm vi: {h.scopeTitle} · {h.createdAt}
                          </div>
                          <div className="text-[11px] font-mono text-[#9aa0a6] mt-1">
                            <span className="text-[#81c995]">
                              Đủ: {h.fullCount}
                            </span>{' '}
                            ·{' '}
                            <span className="text-[#fdd663]">
                              Nửa: {h.halfCount}
                            </span>{' '}
                            ·{' '}
                            <span className="text-[#f28b82]">
                              Sót: {h.missedCount}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-[16px] text-[#81c995]">
                            {h.earnedPoints} / {h.totalPoints.toFixed(1)}đ
                          </div>
                          <div className="text-[11px] font-mono text-[#9aa0a6]">
                            {Math.round((h.earnedPoints / h.totalPoints) * 100)}% Barem
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
