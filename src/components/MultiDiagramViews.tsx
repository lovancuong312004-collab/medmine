import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Check,
  RotateCcw,
  Sparkles,
  AlertTriangle,
} from 'lucide-react';
import {
  MindmapNode,
  ActiveRecallLevel,
  SEMANTIC_BADGE_CONFIG,
  NodeMasteryStatus,
  LEVEL1_PILLAR_ACCENTS,
} from '../types/mindmap';
import {
  getDirectChildrenCount,
  hasLeadingNumberPrefix,
} from '../utils/mindmapLayout';

export interface SharedDiagramViewProps {
  rootNode: MindmapNode;
  selectedNodeId: string | null;
  isReadOnly: boolean;
  showBadges: boolean;
  themeMode?: 'dark' | 'light';
  activeRecallLevel: ActiveRecallLevel;
  revealedNodeIds: Record<string, boolean>;
  hoveredNodeId: string | null;
  onSetHoveredNodeId: (id: string | null) => void;
  onRevealNode: (id: string) => void;
  onSelectNode: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
  onQuickAddChild: (parentId: string) => void;
  onSetNodeMastery: (nodeId: string, mastery: NodeMasteryStatus) => void;
  isNodeDepthBlurred: (nodeId: string, depth: number) => boolean;
  hasNodeClinicalNotes: (node: MindmapNode) => boolean;
}

export const LIGHT_BRANCH_PALETTES = [
  {
    bg: '#eff6ff', // Blue pastel
    border: '#3b82f6',
    accent: '#2563eb',
    titleText: '#1e3a8a',
  },
  {
    bg: '#f0fdf4', // Green pastel
    border: '#22c55e',
    accent: '#16a34a',
    titleText: '#14532d',
  },
  {
    bg: '#fff7ed', // Orange pastel
    border: '#f97316',
    accent: '#ea580c',
    titleText: '#7c2d12',
  },
  {
    bg: '#faf5ff', // Purple pastel
    border: '#a855f7',
    accent: '#7c3aed',
    titleText: '#4c1d95',
  },
  {
    bg: '#fdf2f8', // Pink pastel
    border: '#ec4899',
    accent: '#db2777',
    titleText: '#831843',
  },
  {
    bg: '#f0fdfa', // Teal pastel
    border: '#14b8a6',
    accent: '#0d9488',
    titleText: '#134e4a',
  },
];

/**
 * Smart Medical Keyword Highlighter for Cornell Note:
 * - For Level 2 titles: subtle highlight on the title or keyword prefix.
 * - For Level 3 / Level 4+ lines: ONLY highlights the keyword BEFORE the colon `:`,
 *   keeping the explanation after `:` on a transparent background with crisp text so eyes never get fatigued!
 */
function renderCornellSmartText(
  text: string,
  depth: number,
  badgeType?: MindmapNode['badge'],
  enableHighlight = true,
  isLight = false
): React.ReactNode {
  const baseTextClass = isLight ? 'text-[#0f172a]' : 'text-[#e3e3e3]';

  if (!enableHighlight) {
    return <span className={baseTextClass}>{text}</span>;
  }

  const badgeKeywordStyle = isLight
    ? badgeType === 'danger'
      ? 'bg-[#fee2e2] text-[#991b1b] px-1.5 py-0.5 rounded font-semibold'
      : badgeType === 'treatment'
      ? 'bg-[#dcfce7] text-[#14532d] px-1.5 py-0.5 rounded font-semibold'
      : badgeType === 'diagnostic'
      ? 'bg-[#dbeafe] text-[#1e3a8a] px-1.5 py-0.5 rounded font-semibold'
      : badgeType === 'warning'
      ? 'bg-[#fef3c7] text-[#92400e] px-1.5 py-0.5 rounded font-semibold'
      : badgeType === 'mechanism'
      ? 'bg-[#f3e8ff] text-[#581c87] px-1.5 py-0.5 rounded font-semibold'
      : 'bg-[#fef08a] text-[#713f12] px-1.5 py-0.5 rounded font-semibold'
    : badgeType === 'danger'
    ? 'bg-[#ef4444]/20 text-[#fca5a5] px-1.5 py-0.5 rounded font-semibold'
    : badgeType === 'treatment'
    ? 'bg-[#10b981]/20 text-[#6ee7b7] px-1.5 py-0.5 rounded font-semibold'
    : badgeType === 'diagnostic'
    ? 'bg-[#3b82f6]/20 text-[#93c5fd] px-1.5 py-0.5 rounded font-semibold'
    : badgeType === 'warning'
    ? 'bg-[#f59e0b]/20 text-[#fcd34d] px-1.5 py-0.5 rounded font-semibold'
    : badgeType === 'mechanism'
    ? 'bg-[#a855f7]/20 text-[#d8b4fe] px-1.5 py-0.5 rounded font-semibold'
    : 'bg-[#fdd663]/18 text-[#fde68a] px-1.5 py-0.5 rounded font-semibold';

  const colonIdx = text.indexOf(':');

  // If there is a keyword before ':' (up to 48 chars), ONLY highlight that keyword before ':'
  if (colonIdx > 0 && colonIdx <= 48) {
    const keywordWithColon = text.slice(0, colonIdx + 1);
    const explanationAfterColon = text.slice(colonIdx + 1);
    return (
      <>
        <span className={badgeKeywordStyle}>{keywordWithColon}</span>
        <span className={baseTextClass}>{explanationAfterColon}</span>
      </>
    );
  }

  // For Level 2 section titles without a colon, apply a soft underline/highlight accent to the title
  if (depth === 2) {
    return (
      <span
        className={
          isLight
            ? 'bg-[#dbeafe] text-[#1e3a8a] px-1.5 py-0.5 rounded font-display font-semibold'
            : 'bg-[#8ab4f8]/14 text-[#e8f0fe] px-1.5 py-0.5 rounded font-display font-semibold'
        }
      >
        {text}
      </span>
    );
  }

  return <span className={baseTextClass}>{text}</span>;
}

/**
 * Extracts clinical highlights (notes, summaries, red flags, or badged items) for a node and its children
 */
function extractNodeClinicalHighlights(node: MindmapNode): {
  type: 'danger' | 'treatment' | 'diagnostic' | 'mechanism' | 'warning' | 'summary';
  text: string;
}[] {
  const highlights: {
    type: 'danger' | 'treatment' | 'diagnostic' | 'mechanism' | 'warning' | 'summary';
    text: string;
  }[] = [];

  const cn = node.clinicalNotes;
  if (cn) {
    if (cn.redFlags && cn.redFlags.length > 0) {
      cn.redFlags.forEach((rf) =>
        highlights.push({ type: 'danger', text: rf })
      );
    }
    if (cn.treatment) {
      highlights.push({ type: 'treatment', text: cn.treatment });
    }
    if (cn.clinicalFeatures) {
      highlights.push({ type: 'diagnostic', text: cn.clinicalFeatures });
    }
    if (cn.pathogenesis) {
      highlights.push({ type: 'mechanism', text: cn.pathogenesis });
    }
    if (cn.pearls) {
      highlights.push({ type: 'warning', text: cn.pearls });
    }
    if (cn.markdown && highlights.length === 0) {
      highlights.push({ type: 'summary', text: cn.markdown });
    }
  }

  if (node.summary) {
    highlights.push({ type: 'summary', text: node.summary });
  }

  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      if (child.clinicalNotes?.markdown) {
        highlights.push({
          type: child.badge || 'summary',
          text: `${child.label}: ${child.clinicalNotes.markdown}`,
        });
      } else if (child.summary) {
        highlights.push({
          type: child.badge || 'summary',
          text: `${child.label}: ${child.summary}`,
        });
      } else if (child.badge) {
        highlights.push({
          type: child.badge,
          text: child.label,
        });
      }
    }
  }

  return highlights.slice(0, 4);
}

/* ========================================================================== */
/* 1. 📝 CHẾ ĐỘ "VỞ GẠCH Ý / CORNELL NOTE" (SKETCH & OUTLINE NOTE VIEW)       */
/* ========================================================================== */
export const CornellNoteView: React.FC<SharedDiagramViewProps> = ({
  rootNode,
  selectedNodeId,
  isReadOnly,
  showBadges,
  themeMode = 'dark',
  activeRecallLevel,
  onRevealNode,
  onSelectNode,
  onToggleCollapse,
  onQuickAddChild,
  onSetNodeMastery,
  onSetHoveredNodeId,
  isNodeDepthBlurred,
  hasNodeClinicalNotes,
}) => {
  const [notebookPaperEffect, setNotebookPaperEffect] = useState(true);
  const isLight = themeMode === 'light';

  const pillars = !rootNode.collapsed && rootNode.children ? rootNode.children : [];

  const bulletSymbolByDepth = (depth: number) => {
    if (depth === 2) return '•';
    if (depth === 3) return '◦';
    if (depth === 4) return '▪';
    return '➔';
  };

  const renderOutlineNode = (
    node: MindmapNode,
    depth: number,
    accentColor: string
  ): React.ReactNode => {
    const isSelected = selectedNodeId === node.id;
    const directCount = getDirectChildrenCount(node);
    const hasChildren = directCount > 0;
    const isCollapsed = Boolean(node.collapsed);
    const badgeMeta = node.badge ? SEMANTIC_BADGE_CONFIG[node.badge] : null;
    const hasNotes = hasNodeClinicalNotes(node);
    const blurred = isNodeDepthBlurred(node.id, depth);

    const isLevel2 = depth === 2;

    return (
      <div
        key={node.id}
        className={isLevel2 ? 'mb-2.5 last:mb-0' : 'mt-1 pl-4'}
      >
        <div
          onMouseEnter={() => onSetHoveredNodeId(node.id)}
          onMouseLeave={() => onSetHoveredNodeId(null)}
          onClick={(e) => {
            e.stopPropagation();
            if (activeRecallLevel !== 'off') onRevealNode(node.id);
            onSelectNode(node.id);
          }}
          style={{
            borderLeft: badgeMeta
              ? `3px solid ${badgeMeta.color}`
              : isLevel2
              ? `3px solid ${accentColor}`
              : undefined,
            backgroundColor: isLevel2
              ? isLight
                ? '#ffffff'
                : '#202125'
              : undefined,
          }}
          className={`group rounded-lg transition-all cursor-pointer ${
            isLevel2
              ? isLight
                ? 'border border-[#cbd5e1] px-3 py-2 shadow-xs'
                : notebookPaperEffect
                ? 'bg-[#202125]/90 border border-[#3c4043]/80 border-dashed px-3 py-2 shadow-sm'
                : 'bg-[#202125] border border-[#3c4043] px-3 py-2'
              : isLight
              ? 'px-2 py-0.5 hover:bg-slate-100'
              : 'px-2 py-0.5 hover:bg-white/[0.04]'
          } ${
            isSelected
              ? isLight
                ? 'ring-2 ring-[#2563eb] bg-[#eff6ff]'
                : 'ring-1 ring-[#8ab4f8] bg-[#3f3c5c]/30'
              : ''
          }`}
        >
          <div className="flex items-start justify-between gap-2">
            <div
              className={`flex items-start gap-2 min-w-0 flex-1 transition-all duration-150 ${
                blurred ? 'blur-[5px] opacity-55 select-none' : 'blur-0 opacity-100'
              }`}
            >
              <span
                style={{
                  color: badgeMeta ? badgeMeta.color : accentColor,
                }}
                className="font-mono font-bold text-[13px] leading-snug shrink-0"
              >
                {bulletSymbolByDepth(depth)}
              </span>

              <div className="min-w-0 flex-1">
                {showBadges && badgeMeta && (
                  <span
                    style={{
                      color: badgeMeta.color,
                      backgroundColor: badgeMeta.bgColor,
                    }}
                    className="inline-block mr-1.5 mb-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold"
                  >
                    {badgeMeta.dot} {badgeMeta.shortLabel}
                  </span>
                )}

                <span
                  className={
                    isLevel2
                      ? 'text-[13.5px] leading-snug'
                      : 'text-[12.5px] leading-relaxed'
                  }
                >
                  {renderCornellSmartText(
                    node.label,
                    depth,
                    node.badge,
                    notebookPaperEffect,
                    isLight
                  )}
                </span>

                {node.summary && (
                  <p className="text-[11.5px] text-[#9aa0a6] mt-0.5 leading-snug">
                    {node.summary}
                  </p>
                )}
              </div>
            </div>

            {/* Right Inline Controls */}
            <div className="flex items-center gap-1 shrink-0">
              {hasNotes && (
                <span
                  title="Có ghi chú lâm sàng (Click để xem)"
                  className="text-[#8ab4f8] p-0.5"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                </span>
              )}
              {node.mastery === 'mastered' && (
                <span className="text-[11px] font-bold text-[#10b981]">✓</span>
              )}
              {node.mastery === 'review' && (
                <span className="text-[11px] font-bold text-[#f59e0b]">!</span>
              )}

              {activeRecallLevel !== 'off' && (
                <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetNodeMastery(node.id, 'mastered');
                    }}
                    title="Đã nhớ"
                    className="p-0.5 rounded hover:bg-[#10b981]/20 text-[#10b981]"
                  >
                    <Check className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onSetNodeMastery(node.id, 'review');
                    }}
                    title="Cần ôn"
                    className="p-0.5 rounded hover:bg-[#f59e0b]/20 text-[#f59e0b]"
                  >
                    <RotateCcw className="w-3 h-3" />
                  </button>
                </div>
              )}

              {!isReadOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAddChild(node.id);
                  }}
                  title="Thêm ý nhỏ"
                  className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded bg-[#2d2e30] hover:bg-[#8ab4f8] text-[#9aa0a6] hover:text-[#131314] flex items-center justify-center transition-all"
                >
                  <Plus className="w-3 h-3" />
                </button>
              )}

              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleCollapse(node.id);
                  }}
                  className={`h-5 px-1.5 rounded border text-[10px] font-mono flex items-center gap-0.5 ${
                    isCollapsed
                      ? 'bg-[#3f3c5c] border-[#8ab4f8] text-white'
                      : 'bg-[#2d2e30] border-[#4b5056] text-[#e3e3e3]'
                  }`}
                >
                  {isCollapsed ? (
                    <>
                      <span className="text-[#8ab4f8] font-bold">
                        +{directCount}
                      </span>
                      <ChevronRight className="w-3 h-3" />
                    </>
                  ) : (
                    <ChevronDown className="w-3 h-3" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Nested Children (Level 3, Level 4+) */}
          {hasChildren && !isCollapsed && node.children && (
            <div className="mt-1.5 border-l border-[#3c4043]/70 ml-1.5 space-y-1">
              {node.children.map((child) =>
                renderOutlineNode(child, depth + 1, accentColor)
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div
      style={
        notebookPaperEffect
          ? {
              backgroundImage: isLight
                ? 'radial-gradient(#cbd5e1 1.2px, transparent 1.2px)'
                : 'radial-gradient(rgba(138, 180, 248, 0.13) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }
          : undefined
      }
      className="w-full h-full overflow-y-auto pt-5 pb-14 px-4 md:px-8 select-text bg-[#141517]"
    >
      <div className="max-w-6xl mx-auto bg-[#1b1c1f] border border-[#3c4043] rounded-2xl shadow-xl overflow-hidden">
        {/* Compact Top Notebook Title Banner */}
        <div
          onClick={() => onSelectNode(rootNode.id)}
          className="px-5 py-3 bg-[#242529] border-b border-[#3c4043] flex flex-col sm:flex-row sm:items-center justify-between gap-2 cursor-pointer"
        >
          <div className="min-w-0">
            <h1 className="font-display font-bold text-[16.5px] text-white truncate">
              {rootNode.label}
            </h1>
            {rootNode.summary && (
              <p className="text-[12px] text-[#b8bdc2] mt-0.5">{rootNode.summary}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setNotebookPaperEffect((prev) => !prev);
              }}
              className={`px-2.5 py-1 rounded-lg border text-[11.5px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                notebookPaperEffect
                  ? 'bg-[#3f3c5c] border-[#8ab4f8] text-white'
                  : 'bg-[#1e1f20] border-[#3c4043] text-[#9aa0a6] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#fdd663]" />
              <span>Bút dạ quang Từ khóa</span>
            </button>

            {!isReadOnly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAddChild(rootNode.id);
                }}
                className="px-2.5 py-1 rounded-lg bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-display font-semibold text-[11.5px] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Mục Cấp 1</span>
              </button>
            )}
          </div>
        </div>

        {/* Clean Academic Cornell Note 2-Column Header (28% / 72%) */}
        <div className="flex flex-col md:flex-row bg-[#18191c] border-b border-[#3c4043] text-[11px] font-display font-bold uppercase tracking-wider text-[#9aa0a6]">
          <div className="md:w-[28%] px-4 py-2 border-b md:border-b-0 md:border-r border-[#3c4043]">
            MỤC LỚN & TRỌNG TÂM
          </div>
          <div className="md:w-[72%] px-4 py-2">
            GHI CHÉP CHI TIẾT
          </div>
        </div>

        {/* Cornell Note Rows (28% Left Key Summary / 72% Right Detailed Notes) */}
        <div className="divide-y divide-[#3c4043]">
          {pillars.map((pillar, idx) => {
            const pillarIndex = idx + 1;
            const lightPal =
              LIGHT_BRANCH_PALETTES[idx % LIGHT_BRANCH_PALETTES.length];
            const accentColor = isLight
              ? lightPal.accent
              : pillar.accentColor ||
                LEVEL1_PILLAR_ACCENTS[idx % LEVEL1_PILLAR_ACCENTS.length];
            const isPillarSelected = selectedNodeId === pillar.id;
            const directCount = getDirectChildrenCount(pillar);
            const isCollapsed = Boolean(pillar.collapsed);
            const showPillarNum = !hasLeadingNumberPrefix(pillar.label);
            const hasNotes = hasNodeClinicalNotes(pillar);
            const pillarNotes = pillar.clinicalNotes;

            return (
              <div
                key={pillar.id}
                className="flex flex-col md:flex-row transition-colors"
              >
                {/* LEFT COLUMN (28%): Level 1 Title + Real Summary / Clinical Note Key Points */}
                <div
                  onClick={() => onSelectNode(pillar.id)}
                  style={{
                    borderLeft: `4px solid ${accentColor}`,
                    backgroundColor: isLight ? lightPal.bg : undefined,
                  }}
                  className={`md:w-[28%] p-4 md:border-r border-[#3c4043] bg-[#191a1d]/70 flex flex-col justify-between gap-2.5 cursor-pointer shrink-0 ${
                    isPillarSelected ? 'ring-2 ring-inset ring-[#8ab4f8]' : ''
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display font-bold text-[14.5px] text-white leading-snug">
                        {showPillarNum && (
                          <span
                            style={{ color: accentColor }}
                            className="font-mono font-bold mr-1"
                          >
                            {pillarIndex}.
                          </span>
                        )}
                        <span>{pillar.label}</span>
                      </h3>

                      <div className="flex items-center gap-1 shrink-0">
                        {hasNotes && (
                          <span className="text-[#8ab4f8]">
                            <BookOpen className="w-3.5 h-3.5" />
                          </span>
                        )}
                        {directCount > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleCollapse(pillar.id);
                            }}
                            className={`px-1.5 h-5 rounded border text-[10px] font-mono flex items-center gap-0.5 ${
                              isCollapsed
                                ? 'bg-[#3f3c5c] border-[#8ab4f8] text-white'
                                : 'bg-[#2d2e30] border-[#4b5056] text-white'
                            }`}
                          >
                            {isCollapsed ? (
                              <>
                                <span className="text-[#8ab4f8] font-bold">
                                  +{directCount}
                                </span>
                                <ChevronRight className="w-3 h-3" />
                              </>
                            ) : (
                              <ChevronUp className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Display Real Summary or Clinical Notes if present */}
                    {pillar.summary && (
                      <p className="text-[12px] text-[#d1d5db] bg-[#131314] border border-[#2d2e30] rounded-lg p-2.5 leading-relaxed">
                        {pillar.summary}
                      </p>
                    )}

                    {pillarNotes &&
                      (pillarNotes.pathogenesis ||
                        pillarNotes.clinicalFeatures ||
                        pillarNotes.treatment ||
                        pillarNotes.pearls ||
                        pillarNotes.markdown) && (
                        <div className="p-2.5 rounded-lg bg-[#131314] border border-[#2d2e30] space-y-1 text-[11.5px] text-[#b0b5ba]">
                          {pillarNotes.pathogenesis && (
                            <p className="line-clamp-3">
                              <strong className="text-[#c58af9]">Cơ chế:</strong>{' '}
                              {pillarNotes.pathogenesis}
                            </p>
                          )}
                          {pillarNotes.treatment && (
                            <p className="line-clamp-2">
                              <strong className="text-[#81c995]">Điều trị:</strong>{' '}
                              {pillarNotes.treatment}
                            </p>
                          )}
                          {pillarNotes.pearls && (
                            <p className="line-clamp-2">
                              <strong className="text-[#fdd663]">Lưu ý:</strong>{' '}
                              {pillarNotes.pearls}
                            </p>
                          )}
                          {!pillarNotes.pathogenesis &&
                            !pillarNotes.treatment &&
                            !pillarNotes.pearls &&
                            pillarNotes.markdown && (
                              <p className="line-clamp-3">{pillarNotes.markdown}</p>
                            )}
                        </div>
                      )}

                    {/* Concise Subtopic Key Index when neither summary nor clinicalNotes exist on Pillar */}
                    {!pillar.summary &&
                      !hasNotes &&
                      pillar.children &&
                      pillar.children.length > 0 && (
                        <div className="pt-1 space-y-1">
                          <span className="text-[10.5px] font-mono uppercase text-[#9aa0a6] block">
                            Trọng tâm ({pillar.children.length} mục):
                          </span>
                          {pillar.children.map((sub, sIdx) => (
                            <div
                              key={sub.id}
                              className="text-[11.5px] text-[#b8bdc2] flex items-start gap-1.5 leading-snug"
                            >
                              <span
                                style={{ color: accentColor }}
                                className="font-mono text-[11px] font-bold"
                              >
                                {pillarIndex}.{sIdx + 1}
                              </span>
                              <span className="truncate">{sub.label}</span>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>

                  {!isReadOnly && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onQuickAddChild(pillar.id);
                      }}
                      className="self-start px-2.5 py-1 rounded-lg bg-[#2d2e30] hover:bg-[#3c4043] text-[11px] text-[#8ab4f8] flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>+ Ý Cấp 2</span>
                    </button>
                  )}
                </div>

                {/* RIGHT COLUMN (72%): Hierarchical Outline Notes (Level 2, 3, 4+) */}
                <div className="md:w-[72%] p-4">
                  {!isCollapsed && pillar.children && pillar.children.length > 0 ? (
                    <div>
                      {pillar.children.map((lvl2) =>
                        renderOutlineNode(lvl2, 2, accentColor)
                      )}
                    </div>
                  ) : isCollapsed ? (
                    <div
                      onClick={() => onToggleCollapse(pillar.id)}
                      className="h-full min-h-[64px] rounded-xl border border-dashed border-[#3c4043] flex items-center justify-center text-[12px] text-[#9aa0a6] hover:text-white hover:border-[#8ab4f8] cursor-pointer transition-colors"
                    >
                      Đang thu gọn +{directCount} nhánh Cấp 2. Click để mở chi tiết.
                    </div>
                  ) : (
                    <div className="text-[12px] text-[#70757a] italic">
                      Chưa có ý chi tiết Cấp 2.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

/* ========================================================================== */
/* 2. 🐟 CHẾ ĐỘ "SƠ ĐỒ XƯƠNG CÁ" (ISHIKAWA FISHBONE DIAGRAM — FIXED LAYOUT)    */
/* ========================================================================== */
export const FishboneDiagramView: React.FC<
  SharedDiagramViewProps & {
    transform: { x: number; y: number; scale: number };
    onAutoFitMeasured?: (naturalWidth: number, naturalHeight: number) => void;
    renderCompactBulletChildren: (
      items: MindmapNode[],
      depth: number,
      accentColor: string
    ) => React.ReactNode;
  }
> = ({
  rootNode,
  selectedNodeId,
  showBadges,
  themeMode = 'dark',
  activeRecallLevel,
  transform,
  onAutoFitMeasured,
  onRevealNode,
  onSelectNode,
  onToggleCollapse,
  onSetHoveredNodeId,
  isNodeDepthBlurred,
  hasNodeClinicalNotes,
  renderCompactBulletChildren,
}) => {
  const fishboneWrapperRef = useRef<HTMLDivElement>(null);
  const isLight = themeMode === 'light';

  const visiblePillars =
    !rootNode.collapsed && rootNode.children ? rootNode.children : [];

  // Pair up pillars into columns: even index (0, 2, 4...) on TOP of spine, odd index (1, 3, 5...) on BOTTOM of spine
  const pairCount = Math.max(1, Math.ceil(visiblePillars.length / 2));
  const pairs: {
    top?: { node: MindmapNode; idx: number };
    bottom?: { node: MindmapNode; idx: number };
  }[] = [];

  for (let i = 0; i < pairCount; i++) {
    const topIdx = i * 2;
    const bottomIdx = i * 2 + 1;
    pairs.push({
      top: visiblePillars[topIdx]
        ? { node: visiblePillars[topIdx], idx: topIdx }
        : undefined,
      bottom: visiblePillars[bottomIdx]
        ? { node: visiblePillars[bottomIdx], idx: bottomIdx }
        : undefined,
    });
  }

  useEffect(() => {
    if (!fishboneWrapperRef.current || !onAutoFitMeasured) return;
    const el = fishboneWrapperRef.current;
    const timer = window.setTimeout(() => {
      onAutoFitMeasured(el.offsetWidth, el.offsetHeight);
    }, 30);
    return () => window.clearTimeout(timer);
  }, [rootNode, showBadges]);

  const renderRibBoneBranch = (
    pillar: MindmapNode,
    idx: number,
    position: 'top' | 'bottom'
  ) => {
    const pillarIndex = idx + 1;
    const lightPal = LIGHT_BRANCH_PALETTES[idx % LIGHT_BRANCH_PALETTES.length];
    const accentColor = isLight
      ? lightPal.accent
      : pillar.accentColor ||
        LEVEL1_PILLAR_ACCENTS[idx % LEVEL1_PILLAR_ACCENTS.length];
    const isPillarSelected = selectedNodeId === pillar.id;
    const directCount = getDirectChildrenCount(pillar);
    const isCollapsed = Boolean(pillar.collapsed);
    const showPillarNum = !hasLeadingNumberPrefix(pillar.label);
    const hasNotes = hasNodeClinicalNotes(pillar);
    const blurred = isNodeDepthBlurred(pillar.id, 1);
    const visibleLvl2 = !isCollapsed && pillar.children ? pillar.children : [];

    // LEVEL 1 PILLAR HEADER CARD (Always placed closest to the Central Spine!)
    const pillarHeaderCard = (
      <div
        data-mindmap-node="true"
        onMouseEnter={() => onSetHoveredNodeId(pillar.id)}
        onMouseLeave={() => onSetHoveredNodeId(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (activeRecallLevel !== 'off') onRevealNode(pillar.id);
          onSelectNode(pillar.id);
        }}
        style={{
          backgroundColor: isLight ? lightPal.bg : '#2d2e30',
          borderTop: isPillarSelected
            ? `2px solid ${isLight ? '#2563eb' : '#8ab4f8'}`
            : `1px solid ${isLight ? lightPal.border : '#4b5056'}`,
          borderRight: isPillarSelected
            ? `2px solid ${isLight ? '#2563eb' : '#8ab4f8'}`
            : `1px solid ${isLight ? lightPal.border : '#4b5056'}`,
          borderBottom: isPillarSelected
            ? `2px solid ${isLight ? '#2563eb' : '#8ab4f8'}`
            : `1px solid ${isLight ? lightPal.border : '#4b5056'}`,
          borderLeft: `4px solid ${accentColor}`,
        }}
        className="group relative w-[285px] px-3 py-2 rounded-xl shadow-md cursor-pointer transition-colors"
      >
        <div className="flex items-start justify-between gap-1.5">
          <div
            className={`min-w-0 flex-1 ${
              blurred ? 'blur-[5px] opacity-55 select-none' : ''
            }`}
          >
            <div className="font-display font-bold text-[13.5px] text-white leading-snug">
              {showPillarNum && (
                <span
                  style={{ color: accentColor }}
                  className="font-mono font-bold mr-1"
                >
                  {pillarIndex}.
                </span>
              )}
              <span>{pillar.label}</span>
            </div>
            {pillar.summary && (
              <p className="text-[11px] text-[#b8bdc2] mt-0.5 line-clamp-2">
                {pillar.summary}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {hasNotes && (
              <span className="text-[#8ab4f8]">
                <BookOpen className="w-3 h-3" />
              </span>
            )}
            {directCount > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleCollapse(pillar.id);
                }}
                className={`h-5 px-1.5 rounded-full border text-[10px] font-mono flex items-center gap-0.5 ${
                  isCollapsed
                    ? 'bg-[#3f3c5c] border-[#8ab4f8] text-white'
                    : 'bg-[#242528] border-[#5f6368] text-[#e3e3e3]'
                }`}
              >
                {isCollapsed ? (
                  <>
                    <span className="text-[#8ab4f8] font-bold">
                      +{directCount}
                    </span>
                    <ChevronRight className="w-3 h-3" />
                  </>
                ) : position === 'top' ? (
                  <ChevronDown className="w-3 h-3" />
                ) : (
                  <ChevronUp className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );

    // LEVEL 2 & LEVEL 3+ SUB-BONES LIST (Radiating outward from Level 1 card)
    const subBonesList = visibleLvl2.length > 0 && (
      <div
        style={{ borderLeft: `2.5px solid ${accentColor}` }}
        className="ml-5 pl-3.5 py-2 space-y-2 relative"
      >
        {visibleLvl2.map((lvl2) => {
          const isLvl2Selected = selectedNodeId === lvl2.id;
          const lvl2DirectCount = getDirectChildrenCount(lvl2);
          const lvl2Badge = lvl2.badge
            ? SEMANTIC_BADGE_CONFIG[lvl2.badge]
            : null;
          const lvl2Blurred = isNodeDepthBlurred(lvl2.id, 2);

          return (
            <div
              key={lvl2.id}
              data-mindmap-node="true"
              onMouseEnter={() => onSetHoveredNodeId(lvl2.id)}
              onMouseLeave={() => onSetHoveredNodeId(null)}
              onClick={(e) => {
                e.stopPropagation();
                if (activeRecallLevel !== 'off') onRevealNode(lvl2.id);
                onSelectNode(lvl2.id);
              }}
              style={{
                backgroundColor: isLight ? '#ffffff' : '#242528',
                borderLeft: lvl2Badge
                  ? `3px solid ${lvl2Badge.color}`
                  : `3px solid ${accentColor}`,
              }}
              className={`relative w-[265px] px-2.5 py-1.5 rounded-lg border border-[#3c4043] shadow-sm cursor-pointer transition-colors ${
                isLvl2Selected ? 'ring-2 ring-[#8ab4f8]' : ''
              }`}
            >
              {/* Horizontal fishbone rib connector */}
              <span
                style={{ backgroundColor: accentColor }}
                className="absolute -left-[15px] top-3.5 w-[14px] h-[2px] pointer-events-none"
              />

              <div className="flex items-start justify-between gap-1.5">
                <div
                  className={`min-w-0 flex-1 ${
                    lvl2Blurred ? 'blur-[5px] opacity-55 select-none' : ''
                  }`}
                >
                  {showBadges && lvl2Badge && (
                    <span
                      style={{
                        color: lvl2Badge.color,
                        backgroundColor: lvl2Badge.bgColor,
                      }}
                      className="inline-block mr-1 mb-0.5 px-1.5 py-0.2 rounded text-[9.5px] font-semibold"
                    >
                      {lvl2Badge.dot} {lvl2Badge.shortLabel}
                    </span>
                  )}
                  <div className="font-display font-semibold text-[12.5px] text-[#f1f3f4] leading-snug">
                    {lvl2.label}
                  </div>
                </div>

                {lvl2DirectCount > 0 && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCollapse(lvl2.id);
                    }}
                    className={`h-4.5 px-1 rounded border text-[9.5px] font-mono flex items-center ${
                      lvl2.collapsed
                        ? 'bg-[#3f3c5c] border-[#8ab4f8] text-white'
                        : 'bg-[#2d2e30] border-[#4b5056] text-[#e3e3e3]'
                    }`}
                  >
                    {lvl2.collapsed ? `+${lvl2DirectCount}` : '−'}
                  </button>
                )}
              </div>

              {!lvl2.collapsed &&
                lvl2.children &&
                lvl2.children.length > 0 &&
                renderCompactBulletChildren(lvl2.children, 3, accentColor)}
            </div>
          );
        })}
      </div>
    );

    // Diagonal SVG bone joint meeting the central horizontal fishbone spine
    const diagonalBoneJoint = (
      <svg width={80} height={28} className="ml-6 block overflow-visible shrink-0">
        {position === 'top' ? (
          <>
            <line
              x1={0}
              y1={0}
              x2={24}
              y2={28}
              stroke={accentColor}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle cx={24} cy={28} r={4} fill={accentColor} />
          </>
        ) : (
          <>
            <circle cx={24} cy={0} r={4} fill={accentColor} />
            <line
              x1={24}
              y1={0}
              x2={0}
              y2={28}
              stroke={accentColor}
              strokeWidth={3}
              strokeLinecap="round"
            />
          </>
        )}
      </svg>
    );

    return (
      <div className="flex flex-col">
        {position === 'top' ? (
          <>
            {subBonesList}
            {pillarHeaderCard}
            {diagonalBoneJoint}
          </>
        ) : (
          <>
            {diagonalBoneJoint}
            {pillarHeaderCard}
            {subBonesList}
          </>
        )}
      </div>
    );
  };

  return (
    <div
      ref={fishboneWrapperRef}
      style={{
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
        transformOrigin: '0 0',
      }}
      className="relative inline-flex flex-col pointer-events-auto select-none pt-6 pb-10 pl-16 pr-[360px]"
    >
      {/* TOP RIBS ROW (Even Pillars: 1, 3, 5... — bottom-aligned to touch the central spine) */}
      <div className="flex items-end gap-7 px-6">
        {pairs.map((pair, pIdx) => (
          <div
            key={`top-slot-${pIdx}`}
            className="w-[295px] flex flex-col justify-end"
          >
            {pair.top &&
              renderRibBoneBranch(pair.top.node, pair.top.idx, 'top')}
          </div>
        ))}
      </div>

      {/* CENTRAL HORIZONTAL SPINE LINE WITH LOCKED TAIL (LEFT) & FISH HEAD (RIGHT) */}
      <div
        style={{
          background: isLight
            ? 'linear-gradient(90deg, #3b82f6 0%, #2563eb 60%, #7c3aed 100%)'
            : undefined,
        }}
        className="relative h-[6px] w-full bg-gradient-to-r from-[#8ab4f8]/60 via-[#8ab4f8] to-[#c58af9] rounded-full shadow-md my-0.5 flex items-center"
      >
        {/* FISH TAIL: Locked 100% dead-center on the left end of the spine */}
        <div className="absolute right-full top-1/2 -translate-y-1/2 flex items-center pr-0.5">
          <svg width={42} height={56} className="shrink-0">
            <polygon
              points="0,6 38,28 0,50 12,28"
              fill={isLight ? '#dbeafe' : '#3f3c5c'}
              stroke={isLight ? '#2563eb' : '#8ab4f8'}
              strokeWidth="2.5"
            />
          </svg>
        </div>

        {/* FISH HEAD (Root Node Level 0): Locked 100% dead-center on the right end of the spine! */}
        <div className="absolute left-full top-1/2 -translate-y-1/2 flex items-center -ml-0.5">
          <svg width={26} height={34} className="shrink-0">
            <polygon
              points="0,5 24,17 0,29"
              fill={isLight ? '#7c3aed' : '#c58af9'}
            />
          </svg>

          <div
            data-mindmap-node="true"
            onClick={(e) => {
              e.stopPropagation();
              onSelectNode(rootNode.id);
            }}
            style={{
              backgroundColor: isLight ? '#eff6ff' : '#3f3c5c',
              border:
                selectedNodeId === rootNode.id
                  ? `2.5px solid ${isLight ? '#1d4ed8' : '#ffffff'}`
                  : `2.5px solid ${isLight ? '#3b82f6' : '#8ab4f8'}`,
            }}
            className="w-[305px] px-4 py-3 rounded-r-[26px] rounded-l-[12px] shadow-xl cursor-pointer transition-colors"
          >
            <div className="font-display font-bold text-[15px] text-white leading-snug">
              {rootNode.label}
            </div>
            {rootNode.summary && (
              <p className="text-[11.5px] text-[#e3e3e3]/90 mt-1 pt-1 border-t border-[#3c4043]/40 leading-snug">
                {rootNode.summary}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* BOTTOM RIBS ROW (Odd Pillars: 2, 4, 6... — top-aligned to touch the central spine) */}
      <div className="flex items-start gap-7 px-6">
        {pairs.map((pair, pIdx) => (
          <div
            key={`bot-slot-${pIdx}`}
            className="w-[295px] flex flex-col justify-start"
          >
            {pair.bottom &&
              renderRibBoneBranch(pair.bottom.node, pair.bottom.idx, 'bottom')}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ========================================================================== */
/* 3. ⚖️ CHẾ ĐỘ "BẢNG SO SÁNH & PHÂN BIỆT" (CLINICAL MATRIX TABLE VIEW)        */
/* ========================================================================== */
export const ClinicalMatrixTableView: React.FC<SharedDiagramViewProps> = ({
  rootNode,
  selectedNodeId,
  isReadOnly,
  showBadges,
  themeMode = 'dark',
  activeRecallLevel,
  onRevealNode,
  onSelectNode,
  onToggleCollapse,
  onQuickAddChild,
  onSetNodeMastery,
  onSetHoveredNodeId,
  isNodeDepthBlurred,
  hasNodeClinicalNotes,
}) => {
  const isLight = themeMode === 'light';
  const pillars = !rootNode.collapsed && rootNode.children ? rootNode.children : [];

  const renderLevel3DetailsList = (
    items: MindmapNode[],
    depth: number,
    accentColor: string
  ): React.ReactNode => {
    return (
      <ul className={depth === 3 ? 'space-y-1.5' : 'mt-1 pl-4 space-y-1'}>
        {items.map((item) => {
          const isSelected = selectedNodeId === item.id;
          const badgeMeta = item.badge ? SEMANTIC_BADGE_CONFIG[item.badge] : null;
          const blurred = isNodeDepthBlurred(item.id, depth);
          const hasNotes = hasNodeClinicalNotes(item);

          return (
            <li key={item.id}>
              <div
                onMouseEnter={() => onSetHoveredNodeId(item.id)}
                onMouseLeave={() => onSetHoveredNodeId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeRecallLevel !== 'off') onRevealNode(item.id);
                  onSelectNode(item.id);
                }}
                style={
                  badgeMeta
                    ? { borderLeft: `3px solid ${badgeMeta.color}` }
                    : undefined
                }
                className={`px-2 py-1 rounded-md transition-colors cursor-pointer flex items-start justify-between gap-2 ${
                  isSelected
                    ? 'bg-[#3f3c5c]/80 ring-1 ring-[#8ab4f8]'
                    : isLight
                    ? 'hover:bg-slate-100'
                    : 'hover:bg-white/[0.05]'
                }`}
              >
                <div
                  className={`flex items-start gap-1.5 min-w-0 flex-1 ${
                    blurred ? 'blur-[5px] opacity-55 select-none' : ''
                  }`}
                >
                  <span
                    style={{
                      color: badgeMeta ? badgeMeta.color : accentColor,
                    }}
                    className="font-bold text-[12.5px] leading-snug shrink-0"
                  >
                    {depth === 3 ? '•' : '➔'}
                  </span>
                  <div className="min-w-0 flex-1">
                    {showBadges && badgeMeta && (
                      <span
                        style={{
                          color: badgeMeta.color,
                          backgroundColor: badgeMeta.bgColor,
                        }}
                        className="inline-block mr-1.5 px-1.5 py-0.2 rounded text-[10px] font-semibold"
                      >
                        {badgeMeta.dot} {badgeMeta.shortLabel}
                      </span>
                    )}
                    <span className="text-[12.5px] text-[#e8eaed] leading-snug">
                      {item.label}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {hasNotes && (
                    <span className="text-[#8ab4f8]">
                      <BookOpen className="w-3 h-3" />
                    </span>
                  )}
                  {item.mastery === 'mastered' && (
                    <span className="text-[10.5px] font-bold text-[#10b981]">
                      ✓
                    </span>
                  )}
                  {item.mastery === 'review' && (
                    <span className="text-[10.5px] font-bold text-[#f59e0b]">
                      !
                    </span>
                  )}
                </div>
              </div>

              {!item.collapsed &&
                item.children &&
                item.children.length > 0 &&
                renderLevel3DetailsList(item.children, depth + 1, accentColor)}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="w-full h-full overflow-y-auto pt-5 pb-14 px-4 md:px-6 select-text">
      <div className="max-w-[1600px] mx-auto space-y-3">
        {/* Compact Slim Title Header (py-2.5) */}
        <div
          onClick={() => onSelectNode(rootNode.id)}
          className="px-4 py-2.5 rounded-xl bg-[#3f3c5c] border border-[#8ab4f8] flex items-center justify-between gap-3 cursor-pointer shadow-sm"
        >
          <div className="flex items-center gap-3 min-w-0">
            <h1 className="font-display font-bold text-[15.5px] text-white truncate">
              {rootNode.label}
            </h1>
            {rootNode.summary && (
              <span className="text-[12px] text-[#e3e3e3]/80 truncate hidden lg:inline">
                — {rootNode.summary}
              </span>
            )}
          </div>

          {!isReadOnly && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAddChild(rootNode.id);
              }}
              className="px-2.5 py-1 rounded-lg bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-display font-semibold text-[11.5px] flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Nhánh Cấp 1</span>
            </button>
          )}
        </div>

        {/* Clinical Matrix Table */}
        <div className="rounded-2xl border border-[#3c4043] bg-[#1b1c1f] shadow-xl overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#242529] border-b-2 border-[#3c4043] text-[11px] font-display font-bold uppercase tracking-wider text-[#9aa0a6]">
                <th className="py-2.5 px-4 border-r border-[#3c4043] w-[20%]">
                  Nhánh Trụ Cột (Cấp 1)
                </th>
                <th className="py-2.5 px-4 border-r border-[#3c4043] w-[23%]">
                  Phân Nhóm / Tiêu Chí (Cấp 2)
                </th>
                <th className="py-2.5 px-4 border-r border-[#3c4043] w-[33%]">
                  Chi Tiết Cấp 3 & Cấp 4+ (Đặc điểm / Phác đồ)
                </th>
                <th className="py-2.5 px-4 w-[24%]">
                  Tóm Tắt & Ghi Chú Lâm Sàng
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3c4043]">
              {pillars.map((pillar, idx) => {
                const pillarIndex = idx + 1;
                const lightPal =
                  LIGHT_BRANCH_PALETTES[idx % LIGHT_BRANCH_PALETTES.length];
                const accentColor = isLight
                  ? lightPal.accent
                  : pillar.accentColor ||
                    LEVEL1_PILLAR_ACCENTS[idx % LEVEL1_PILLAR_ACCENTS.length];
                const directCount = getDirectChildrenCount(pillar);
                const isCollapsed = Boolean(pillar.collapsed);
                const showPillarNum = !hasLeadingNumberPrefix(pillar.label);
                const visibleLvl2 =
                  !isCollapsed && pillar.children && pillar.children.length > 0
                    ? pillar.children
                    : [];

                if (visibleLvl2.length === 0) {
                  return (
                    <tr
                      key={pillar.id}
                      className="transition-colors"
                    >
                      <td
                        onClick={() => onSelectNode(pillar.id)}
                        style={{
                          borderLeft: `4px solid ${accentColor}`,
                          backgroundColor: isLight ? lightPal.bg : undefined,
                        }}
                        className="p-3.5 border-r border-[#3c4043] align-top bg-[#1e1f23] cursor-pointer"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="font-display font-bold text-[14px] text-white">
                            {showPillarNum && (
                              <span
                                style={{ color: accentColor }}
                                className="font-mono mr-1"
                              >
                                {pillarIndex}.
                              </span>
                            )}
                            {pillar.label}
                          </div>
                          {directCount > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleCollapse(pillar.id);
                              }}
                              className="px-2 py-0.5 rounded bg-[#3f3c5c] border border-[#8ab4f8] text-[10.5px] font-mono text-white"
                            >
                              +{directCount}
                            </button>
                          )}
                        </div>
                      </td>
                      <td
                        colSpan={3}
                        onClick={() =>
                          directCount > 0 && onToggleCollapse(pillar.id)
                        }
                        className="p-3.5 text-[12px] text-[#9aa0a6] cursor-pointer hover:text-white"
                      >
                        {pillar.summary ||
                          (isCollapsed
                            ? `Đang ẩn +${directCount} phân nhóm Cấp 2. Click để mở rộng.`
                            : 'Chưa có phân nhóm Cấp 2.')}
                      </td>
                    </tr>
                  );
                }

                return visibleLvl2.map((lvl2, l2Idx) => {
                  const isLvl2Selected = selectedNodeId === lvl2.id;
                  const lvl2DirectCount = getDirectChildrenCount(lvl2);
                  const lvl2Blurred = isNodeDepthBlurred(lvl2.id, 2);
                  const lvl2Badge = lvl2.badge
                    ? SEMANTIC_BADGE_CONFIG[lvl2.badge]
                    : null;
                  const highlights = extractNodeClinicalHighlights(lvl2);
                  const fallbackPillarSummary =
                    highlights.length === 0 ? pillar.summary : undefined;

                  return (
                    <tr
                      key={lvl2.id}
                      className="transition-colors"
                    >
                      {/* COLUMN 1: LEVEL 1 PILLAR (Merged via rowSpan on first Level 2 row) */}
                      {l2Idx === 0 && (
                        <td
                          rowSpan={visibleLvl2.length}
                          onClick={() => onSelectNode(pillar.id)}
                          style={{
                            borderLeft: `4px solid ${accentColor}`,
                            backgroundColor: isLight ? lightPal.bg : undefined,
                          }}
                          className="p-3.5 border-r border-[#3c4043] align-top bg-[#191a1e] cursor-pointer"
                        >
                          <div className="sticky top-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-display font-bold text-[14px] text-white leading-snug">
                                {showPillarNum && (
                                  <span
                                    style={{ color: accentColor }}
                                    className="font-mono mr-1"
                                  >
                                    {pillarIndex}.
                                  </span>
                                )}
                                {pillar.label}
                              </h3>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleCollapse(pillar.id);
                                }}
                                title="Thu gọn nhánh Cấp 1 này"
                                className="px-1.5 py-0.5 rounded bg-[#2d2e30] border border-[#4b5056] text-[10px] text-[#e3e3e3]"
                              >
                                <ChevronUp className="w-3 h-3" />
                              </button>
                            </div>

                            {pillar.summary && (
                              <p className="text-[11.5px] text-[#b0b5ba] leading-relaxed">
                                {pillar.summary}
                              </p>
                            )}

                            {!isReadOnly && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onQuickAddChild(pillar.id);
                                }}
                                className="px-2 py-1 rounded bg-[#2d2e30] hover:bg-[#3c4043] text-[11px] text-[#8ab4f8] flex items-center gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>+ Nhóm Cấp 2</span>
                              </button>
                            )}
                          </div>
                        </td>
                      )}

                      {/* COLUMN 2: LEVEL 2 SUBGROUP */}
                      <td
                        onMouseEnter={() => onSetHoveredNodeId(lvl2.id)}
                        onMouseLeave={() => onSetHoveredNodeId(null)}
                        onClick={() => {
                          if (activeRecallLevel !== 'off') onRevealNode(lvl2.id);
                          onSelectNode(lvl2.id);
                        }}
                        className={`p-3.5 border-r border-[#3c4043] align-top cursor-pointer ${
                          isLvl2Selected ? 'bg-[#3f3c5c]/30' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div
                            className={`space-y-1 ${
                              lvl2Blurred
                                ? 'blur-[5px] opacity-55 select-none'
                                : ''
                            }`}
                          >
                            {showBadges && lvl2Badge && (
                              <span
                                style={{
                                  color: lvl2Badge.color,
                                  backgroundColor: lvl2Badge.bgColor,
                                }}
                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold"
                              >
                                {lvl2Badge.dot} {lvl2Badge.shortLabel}
                              </span>
                            )}
                            <div className="font-display font-semibold text-[13.5px] text-white leading-snug">
                              {lvl2.label}
                            </div>
                          </div>

                          {lvl2DirectCount > 0 && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleCollapse(lvl2.id);
                              }}
                              className={`px-1.5 py-0.5 rounded border text-[10px] font-mono shrink-0 ${
                                lvl2.collapsed
                                  ? 'bg-[#3f3c5c] border-[#8ab4f8] text-white'
                                  : 'bg-[#2d2e30] border-[#4b5056] text-[#e3e3e3]'
                              }`}
                            >
                              {lvl2.collapsed ? `+${lvl2DirectCount}` : '−'}
                            </button>
                          )}
                        </div>
                      </td>

                      {/* COLUMN 3: LEVEL 3 & LEVEL 4+ DETAILS */}
                      <td className="p-3.5 border-r border-[#3c4043] align-top">
                        {!lvl2.collapsed &&
                        lvl2.children &&
                        lvl2.children.length > 0 ? (
                          renderLevel3DetailsList(
                            lvl2.children,
                            3,
                            accentColor
                          )
                        ) : lvl2.collapsed && lvl2DirectCount > 0 ? (
                          <button
                            onClick={() => onToggleCollapse(lvl2.id)}
                            className="text-[11.5px] text-[#8ab4f8] hover:underline font-mono"
                          >
                            Đang thu gọn +{lvl2DirectCount} chi tiết Cấp 3 (Click để mở)
                          </button>
                        ) : (
                          <span className="text-[11.5px] text-[#70757a] italic">
                            —
                          </span>
                        )}
                      </td>

                      {/* COLUMN 4: DIRECT CLINICAL SUMMARY & NOTES + COMPACT MASTERY */}
                      <td
                        onClick={() => onSelectNode(lvl2.id)}
                        className="p-3.5 align-top cursor-pointer space-y-2"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-[10px] font-mono uppercase text-[#9aa0a6]">
                            Trọng tâm LS
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSetNodeMastery(lvl2.id, 'mastered');
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                lvl2.mastery === 'mastered'
                                  ? 'bg-[#10b981]/20 border-[#10b981] text-[#10b981]'
                                  : 'bg-[#242528] border-[#3c4043] text-[#9aa0a6] hover:text-white'
                              }`}
                            >
                              ✓ Thuộc
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSetNodeMastery(lvl2.id, 'review');
                              }}
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                                lvl2.mastery === 'review'
                                  ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]'
                                  : 'bg-[#242528] border-[#3c4043] text-[#9aa0a6] hover:text-white'
                              }`}
                            >
                              ! Ôn
                            </button>
                          </div>
                        </div>

                        {highlights.length > 0 ? (
                          <div
                            className={`space-y-1.5 text-[11.5px] leading-snug ${
                              lvl2Blurred
                                ? 'blur-[5px] opacity-55 select-none'
                                : ''
                            }`}
                          >
                            {highlights.map((h, hIdx) => {
                              const colorClass =
                                h.type === 'danger'
                                  ? 'text-[#fca5a5] bg-[#ef4444]/10 border-[#ef4444]/30'
                                  : h.type === 'treatment'
                                  ? 'text-[#6ee7b7] bg-[#10b981]/10 border-[#10b981]/30'
                                  : h.type === 'diagnostic'
                                  ? 'text-[#93c5fd] bg-[#3b82f6]/10 border-[#3b82f6]/30'
                                  : h.type === 'mechanism'
                                  ? 'text-[#d8b4fe] bg-[#a855f7]/10 border-[#a855f7]/30'
                                  : h.type === 'warning'
                                  ? 'text-[#fde68a] bg-[#f59e0b]/10 border-[#f59e0b]/30'
                                  : 'text-[#d1d5db] bg-[#141518] border-[#2d2e30]';

                              return (
                                <div
                                  key={hIdx}
                                  className={`p-2 rounded-lg border ${colorClass}`}
                                >
                                  {h.type === 'danger' && (
                                    <AlertTriangle className="w-3 h-3 inline mr-1 text-[#ef4444]" />
                                  )}
                                  <span>{h.text}</span>
                                </div>
                              );
                            })}
                          </div>
                        ) : fallbackPillarSummary ? (
                          <div className="p-2 rounded-lg bg-[#141518] border border-[#2d2e30] text-[11.5px] text-[#b8bdc2] leading-snug">
                            {fallbackPillarSummary}
                          </div>
                        ) : (
                          <div className="p-2 rounded-lg bg-[#141518] border border-[#2d2e30] text-[11.5px] text-[#9aa0a6] leading-snug">
                            {lvl2.children && lvl2.children[0]
                              ? lvl2.children[0].label
                              : lvl2.label}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                });
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
