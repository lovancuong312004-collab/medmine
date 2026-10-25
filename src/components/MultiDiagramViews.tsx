import React, { useState } from 'react';
import {
  Plus,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BookOpen,
  Check,
  RotateCcw,
  Sparkles,
  HelpCircle,
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

interface SharedDiagramViewProps {
  rootNode: MindmapNode;
  selectedNodeId: string | null;
  isReadOnly: boolean;
  showBadges: boolean;
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

/**
 * Helper to highlight medical numbers/thresholds or semantic badge phrases like a highlighter pen
 */
function renderHighlightedText(
  text: string,
  badgeType?: MindmapNode['badge'],
  enableHighlight = true
): React.ReactNode {
  if (!enableHighlight) return text;

  const badgeHighlightClass =
    badgeType === 'danger'
      ? 'bg-[#ef4444]/20 text-[#fca5a5] px-1 rounded border-b border-[#ef4444]/50'
      : badgeType === 'treatment'
      ? 'bg-[#10b981]/20 text-[#6ee7b7] px-1 rounded border-b border-[#10b981]/50'
      : badgeType === 'diagnostic'
      ? 'bg-[#3b82f6]/20 text-[#93c5fd] px-1 rounded border-b border-[#3b82f6]/50'
      : badgeType === 'warning'
      ? 'bg-[#f59e0b]/20 text-[#fcd34d] px-1 rounded border-b border-[#f59e0b]/50'
      : badgeType === 'mechanism'
      ? 'bg-[#a855f7]/20 text-[#d8b4fe] px-1 rounded border-b border-[#a855f7]/50'
      : null;

  // If node has a semantic badge and is short/medium, highlight key medical terms or colon prefix
  const colonIdx = text.indexOf(':');
  if (colonIdx > 0 && colonIdx < 45) {
    const prefix = text.slice(0, colonIdx + 1);
    const rest = text.slice(colonIdx + 1);
    return (
      <>
        <span
          className={
            badgeHighlightClass ||
            'bg-[#fdd663]/15 text-[#fde68a] px-1 rounded font-semibold'
          }
        >
          {prefix}
        </span>
        <span>{rest}</span>
      </>
    );
  }

  if (badgeHighlightClass) {
    return <span className={badgeHighlightClass}>{text}</span>;
  }

  return text;
}

/* ========================================================================== */
/* 1. 📝 CHẾ ĐỘ "VỞ GẠCH Ý / CORNELL NOTE" (SKETCH & OUTLINE NOTE VIEW)       */
/* ========================================================================== */
export const CornellNoteView: React.FC<SharedDiagramViewProps> = ({
  rootNode,
  selectedNodeId,
  isReadOnly,
  showBadges,
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
        className={isLevel2 ? 'mb-2.5 last:mb-0' : 'mt-1.5 pl-4'}
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
              ? `3.5px solid ${badgeMeta.color}`
              : isLevel2
              ? `3px solid ${accentColor}`
              : undefined,
          }}
          className={`group rounded-lg transition-all cursor-pointer ${
            isLevel2
              ? notebookPaperEffect
                ? 'bg-[#222327]/90 border border-[#3c4043]/90 border-dashed px-3 py-2 shadow-sm'
                : 'bg-[#222327] border border-[#3c4043] px-3 py-2'
              : 'px-2 py-1 hover:bg-white/[0.04]'
          } ${isSelected ? 'ring-2 ring-[#8ab4f8] bg-[#3f3c5c]/40' : ''}`}
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
                      ? 'font-display font-semibold text-[13.5px] text-white leading-snug'
                      : 'text-[12.5px] text-[#e8eaed] leading-relaxed'
                  }
                >
                  {renderHighlightedText(
                    node.label,
                    node.badge,
                    notebookPaperEffect
                  )}
                </span>

                {node.summary && (
                  <p className="text-[11.5px] text-[#9aa0a6] mt-0.5 italic leading-snug">
                    — {node.summary}
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
            <div className="mt-1.5 border-l border-[#3c4043]/80 ml-1.5 space-y-1">
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
              backgroundImage:
                'radial-gradient(rgba(138, 180, 248, 0.14) 1px, transparent 1px)',
              backgroundSize: '20px 20px',
            }
          : undefined
      }
      className="w-full h-full overflow-y-auto pt-16 pb-16 px-4 md:px-8 select-text bg-[#141517]"
    >
      <div className="max-w-6xl mx-auto bg-[#1b1c1f] border border-[#3c4043] rounded-2xl shadow-2xl overflow-hidden">
        {/* Top Notebook Title Banner */}
        <div
          onClick={() => onSelectNode(rootNode.id)}
          className="px-6 py-4 bg-[#242529] border-b-2 border-[#3c4043] flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer"
        >
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#8ab4f8]">
              <span>📝 VỞ GẠCH Ý CORNELL NOTE (IPAD / NOTION STYLE)</span>
            </div>
            <h1 className="font-display font-bold text-[19px] text-white">
              {rootNode.label}
            </h1>
            {rootNode.summary && (
              <p className="text-[12.5px] text-[#b8bdc2]">{rootNode.summary}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setNotebookPaperEffect((prev) => !prev);
              }}
              className={`px-3 py-1.5 rounded-xl border text-[12px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                notebookPaperEffect
                  ? 'bg-[#3f3c5c] border-[#8ab4f8] text-white'
                  : 'bg-[#1e1f20] border-[#3c4043] text-[#9aa0a6] hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#fdd663]" />
              <span>Sổ tay chấm bi & Bút dạ quang</span>
            </button>

            {!isReadOnly && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAddChild(rootNode.id);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-display font-semibold text-[12px] flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Mục Cấp 1</span>
              </button>
            )}
          </div>
        </div>

        {/* Cornell Note 2-Column Header */}
        <div className="grid grid-cols-1 md:grid-cols-12 bg-[#18191c] border-b border-[#3c4043] text-[11px] font-mono uppercase tracking-wider text-[#9aa0a6]">
          <div className="md:col-span-4 px-5 py-2 border-b md:border-b-0 md:border-r border-[#3c4043]">
            Cột Trái (30%): Mục lớn Cấp 1 & Câu hỏi Gợi nhớ
          </div>
          <div className="md:col-span-8 px-5 py-2">
            Cột Phải (70%): Hệ thống Gạch ý Chi tiết (Cấp 2 • Cấp 3 ◦ Cấp 4 ▪)
          </div>
        </div>

        {/* Cornell Note Rows (Each Level 1 Pillar is a 30% / 70% Cornell Row) */}
        <div className="divide-y divide-[#3c4043]">
          {pillars.map((pillar, idx) => {
            const pillarIndex = idx + 1;
            const accentColor =
              pillar.accentColor ||
              LEVEL1_PILLAR_ACCENTS[idx % LEVEL1_PILLAR_ACCENTS.length];
            const isPillarSelected = selectedNodeId === pillar.id;
            const directCount = getDirectChildrenCount(pillar);
            const isCollapsed = Boolean(pillar.collapsed);
            const showPillarNum = !hasLeadingNumberPrefix(pillar.label);
            const hasNotes = hasNodeClinicalNotes(pillar);

            return (
              <div
                key={pillar.id}
                className="grid grid-cols-1 md:grid-cols-12 transition-colors hover:bg-white/[0.01]"
              >
                {/* LEFT COLUMN (30% -> 4/12 cols): Level 1 Main Topic & Active Recall Cue Questions */}
                <div
                  onClick={() => onSelectNode(pillar.id)}
                  style={{ borderLeft: `4px solid ${accentColor}` }}
                  className={`md:col-span-4 p-4 md:border-r border-[#3c4043] bg-[#191a1d]/70 flex flex-col justify-between gap-3 cursor-pointer ${
                    isPillarSelected ? 'bg-[#3f3c5c]/30' : ''
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-display font-bold text-[15px] text-white leading-snug">
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
                            className={`px-2 h-6 rounded-md border text-[10.5px] font-mono flex items-center gap-0.5 ${
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

                    {pillar.summary && (
                      <p className="text-[12px] text-[#b0b5ba] leading-relaxed">
                        {pillar.summary}
                      </p>
                    )}

                    {/* Cornell Cue Questions Box */}
                    <div className="mt-2 p-2.5 rounded-xl bg-[#131314]/80 border border-[#2d2e30] space-y-1">
                      <div className="flex items-center gap-1 text-[10.5px] font-mono text-[#fdd663]">
                        <HelpCircle className="w-3 h-3" />
                        <span>CÂU HỎI GỢI NHỚ (CUE):</span>
                      </div>
                      <p className="text-[11.5px] text-[#9aa0a6] leading-snug">
                        • Trình bày {directCount || 'các'} phân nhóm cốt lõi của{' '}
                        <strong className="text-[#e3e3e3]">{pillar.label}</strong>?
                      </p>
                      {pillar.children && pillar.children[0] && (
                        <p className="text-[11.5px] text-[#9aa0a6] leading-snug">
                          • Đặc điểm lâm sàng & cơ chế của{' '}
                          <span className="text-[#8ab4f8]">
                            {pillar.children[0].label}
                          </span>
                          ?
                        </p>
                      )}
                    </div>
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
                      <span>Thêm ý Cấp 2</span>
                    </button>
                  )}
                </div>

                {/* RIGHT COLUMN (70% -> 8/12 cols): Hierarchical Outline Notes (Level 2, 3, 4+) */}
                <div className="md:col-span-8 p-4">
                  {!isCollapsed && pillar.children && pillar.children.length > 0 ? (
                    <div>
                      {pillar.children.map((lvl2) =>
                        renderOutlineNode(lvl2, 2, accentColor)
                      )}
                    </div>
                  ) : isCollapsed ? (
                    <div
                      onClick={() => onToggleCollapse(pillar.id)}
                      className="h-full min-h-[72px] rounded-xl border border-dashed border-[#3c4043] flex items-center justify-center text-[12px] text-[#9aa0a6] hover:text-white hover:border-[#8ab4f8] cursor-pointer transition-colors"
                    >
                      Đang thu gọn +{directCount} nhánh Cấp 2 (Chế độ Chỉ Cấp 1). Click để mở vở ghi chi tiết.
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
/* 2. 🐟 CHẾ ĐỘ "SƠ ĐỒ XƯƠNG CÁ" (ISHIKAWA FISHBONE DIAGRAM)                  */
/* ========================================================================== */
export const FishboneDiagramView: React.FC<
  SharedDiagramViewProps & {
    transform: { x: number; y: number; scale: number };
    renderCompactBulletChildren: (
      items: MindmapNode[],
      depth: number,
      accentColor: string
    ) => React.ReactNode;
  }
> = ({
  rootNode,
  selectedNodeId,
  isReadOnly,
  showBadges,
  activeRecallLevel,
  transform,
  onRevealNode,
  onSelectNode,
  onToggleCollapse,
  onQuickAddChild,
  onSetHoveredNodeId,
  isNodeDepthBlurred,
  hasNodeClinicalNotes,
  renderCompactBulletChildren,
}) => {
  const visiblePillars =
    !rootNode.collapsed && rootNode.children ? rootNode.children : [];

  // Pair up pillars into columns: even index (0, 2, 4...) on TOP of spine, odd index (1, 3, 5...) on BOTTOM of spine
  const pairCount = Math.max(1, Math.ceil(visiblePillars.length / 2));
  const pairs: { top?: { node: MindmapNode; idx: number }; bottom?: { node: MindmapNode; idx: number } }[] = [];

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

  const renderRibBoneBranch = (
    pillar: MindmapNode,
    idx: number,
    position: 'top' | 'bottom'
  ) => {
    const pillarIndex = idx + 1;
    const accentColor =
      pillar.accentColor ||
      LEVEL1_PILLAR_ACCENTS[idx % LEVEL1_PILLAR_ACCENTS.length];
    const isPillarSelected = selectedNodeId === pillar.id;
    const directCount = getDirectChildrenCount(pillar);
    const isCollapsed = Boolean(pillar.collapsed);
    const showPillarNum = !hasLeadingNumberPrefix(pillar.label);
    const hasNotes = hasNodeClinicalNotes(pillar);
    const blurred = isNodeDepthBlurred(pillar.id, 1);
    const visibleLvl2 = !isCollapsed && pillar.children ? pillar.children : [];

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
          borderTop: isPillarSelected ? '2px solid #8ab4f8' : '1px solid #4b5056',
          borderRight: isPillarSelected
            ? '2px solid #8ab4f8'
            : '1px solid #4b5056',
          borderBottom: isPillarSelected
            ? '2px solid #8ab4f8'
            : '1px solid #4b5056',
          borderLeft: `4px solid ${accentColor}`,
        }}
        className="group relative w-[280px] px-3 py-2 bg-[#2d2e30] hover:bg-[#35373a] rounded-xl shadow-lg cursor-pointer transition-colors"
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
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    );

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
                borderLeft: lvl2Badge
                  ? `3px solid ${lvl2Badge.color}`
                  : `3px solid ${accentColor}`,
              }}
              className={`relative w-[260px] px-2.5 py-1.5 rounded-lg bg-[#242528] hover:bg-[#2d2f33] border border-[#3c4043] shadow-sm cursor-pointer transition-colors ${
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
      <svg width={80} height={32} className="ml-6 block overflow-visible shrink-0">
        {position === 'top' ? (
          <>
            <line
              x1={0}
              y1={0}
              x2={28}
              y2={32}
              stroke={accentColor}
              strokeWidth={3}
              strokeLinecap="round"
            />
            <circle cx={28} cy={32} r={4} fill={accentColor} />
          </>
        ) : (
          <>
            <circle cx={28} cy={0} r={4} fill={accentColor} />
            <line
              x1={28}
              y1={0}
              x2={0}
              y2={32}
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
            {pillarHeaderCard}
            {subBonesList}
            {diagonalBoneJoint}
          </>
        ) : (
          <>
            {diagonalBoneJoint}
            {subBonesList}
            {pillarHeaderCard}
          </>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
        transformOrigin: '0 0',
      }}
      className="relative inline-flex items-center pointer-events-auto select-none p-12"
    >
      {/* FISH TAIL (Left end of spine) */}
      <div className="flex items-center shrink-0">
        <svg width={44} height={64} className="shrink-0">
          <polygon
            points="0,8 40,32 0,56 12,32"
            fill="#3f3c5c"
            stroke="#8ab4f8"
            strokeWidth="2"
          />
        </svg>
      </div>

      {/* FISH BODY: Alternating Top & Bottom Ribs along Central Horizontal Spine */}
      <div className="flex flex-col">
        {/* TOP RIBS ROW (Even Pillars: 1, 3, 5...) */}
        <div className="flex items-end gap-8 px-6">
          {pairs.map((pair, pIdx) => (
            <div key={`top-slot-${pIdx}`} className="w-[295px] flex flex-col justify-end">
              {pair.top &&
                renderRibBoneBranch(pair.top.node, pair.top.idx, 'top')}
            </div>
          ))}
        </div>

        {/* CENTRAL HORIZONTAL SPINE LINE */}
        <div className="h-[6px] bg-gradient-to-r from-[#8ab4f8]/60 via-[#8ab4f8] to-[#c58af9] rounded-full shadow-[0_0_12px_rgba(138,180,248,0.45)] my-0.5" />

        {/* BOTTOM RIBS ROW (Odd Pillars: 2, 4, 6...) */}
        <div className="flex items-start gap-8 px-6">
          {pairs.map((pair, pIdx) => (
            <div key={`bot-slot-${pIdx}`} className="w-[295px] flex flex-col justify-start">
              {pair.bottom &&
                renderRibBoneBranch(pair.bottom.node, pair.bottom.idx, 'bottom')}
            </div>
          ))}
        </div>
      </div>

      {/* FISH HEAD (Right end of spine -> Root Node Level 0) */}
      <div className="flex items-center shrink-0 -ml-1">
        <svg width={28} height={36} className="shrink-0">
          <polygon points="0,6 26,18 0,30" fill="#8ab4f8" />
        </svg>

        <div
          data-mindmap-node="true"
          onClick={(e) => {
            e.stopPropagation();
            onSelectNode(rootNode.id);
          }}
          style={{
            border:
              selectedNodeId === rootNode.id
                ? '2.5px solid #ffffff'
                : '2.5px solid #8ab4f8',
          }}
          className="w-[300px] px-4 py-3.5 rounded-r-[28px] rounded-l-[12px] bg-[#3f3c5c] hover:bg-[#49456b] shadow-2xl cursor-pointer transition-colors"
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#8ab4f8] mb-0.5">
            🐟 ĐẦU XƯƠNG CÁ (CHỦ ĐỀ GỐC)
          </div>
          <div className="font-display font-bold text-[15.5px] text-white leading-snug">
            {rootNode.label}
          </div>
          {rootNode.summary && (
            <p className="text-[11.5px] text-[#e3e3e3]/90 mt-1 pt-1 border-t border-white/10 leading-snug">
              {rootNode.summary}
            </p>
          )}
        </div>
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
                    {item.summary && (
                      <span className="text-[11.5px] text-[#9aa0a6] ml-1.5 italic">
                        ({item.summary})
                      </span>
                    )}
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
    <div className="w-full h-full overflow-y-auto pt-16 pb-16 px-4 md:px-6 select-text">
      <div className="max-w-[1600px] mx-auto space-y-4">
        {/* Table Title Header */}
        <div
          onClick={() => onSelectNode(rootNode.id)}
          className="px-5 py-3.5 rounded-xl bg-[#3f3c5c] border-2 border-[#8ab4f8] flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer shadow-lg"
        >
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-[#8ab4f8]">
              ⚖️ BẢNG MA TRẬN SO SÁNH & ĐỐI CHIẾU LÂM SÀNG
            </div>
            <h1 className="font-display font-bold text-[18px] text-white">
              {rootNode.label}
            </h1>
          </div>

          {!isReadOnly && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onQuickAddChild(rootNode.id);
              }}
              className="px-3 py-1.5 rounded-lg bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-display font-semibold text-[12px] flex items-center gap-1 shrink-0 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Thêm Nhánh Cấp 1</span>
            </button>
          )}
        </div>

        {/* Clinical Matrix Table */}
        <div className="rounded-2xl border border-[#3c4043] bg-[#1b1c1f] shadow-2xl overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-[#242529] border-b-2 border-[#3c4043] text-[11.5px] font-display font-bold uppercase tracking-wider text-[#9aa0a6]">
                <th className="py-3 px-4 border-r border-[#3c4043] w-[22%]">
                  Nhánh Trụ Cột (Cấp 1)
                </th>
                <th className="py-3 px-4 border-r border-[#3c4043] w-[25%]">
                  Phân Nhóm / Tiêu Chí (Cấp 2)
                </th>
                <th className="py-3 px-4 border-r border-[#3c4043] w-[35%]">
                  Chi Tiết Cấp 3 & Cấp 4+ (Đặc điểm / Phác đồ)
                </th>
                <th className="py-3 px-4 w-[18%]">
                  Điểm Nhấn Lâm Sàng & Ôn Tập
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#3c4043]">
              {pillars.map((pillar, idx) => {
                const pillarIndex = idx + 1;
                const accentColor =
                  pillar.accentColor ||
                  LEVEL1_PILLAR_ACCENTS[idx % LEVEL1_PILLAR_ACCENTS.length];
                const directCount = getDirectChildrenCount(pillar);
                const isCollapsed = Boolean(pillar.collapsed);
                const showPillarNum = !hasLeadingNumberPrefix(pillar.label);
                const visibleLvl2 =
                  !isCollapsed && pillar.children && pillar.children.length > 0
                    ? pillar.children
                    : [];

                // If Pillar is collapsed (e.g. Level Filter = "Chỉ Cấp 1") or has no children, render a single summary row
                if (visibleLvl2.length === 0) {
                  return (
                    <tr
                      key={pillar.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td
                        onClick={() => onSelectNode(pillar.id)}
                        style={{ borderLeft: `4px solid ${accentColor}` }}
                        className="p-4 border-r border-[#3c4043] align-top bg-[#1e1f23] cursor-pointer"
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
                        {pillar.summary && (
                          <p className="text-[11.5px] text-[#9aa0a6] mt-1">
                            {pillar.summary}
                          </p>
                        )}
                      </td>
                      <td
                        colSpan={3}
                        onClick={() =>
                          directCount > 0 && onToggleCollapse(pillar.id)
                        }
                        className="p-4 text-[12px] text-[#9aa0a6] italic cursor-pointer hover:text-white"
                      >
                        {isCollapsed
                          ? `Đang ẩn +${directCount} phân nhóm Cấp 2 (Chế độ Chỉ Cấp 1). Click để mở rộng bảng so sánh.`
                          : 'Chưa có phân nhóm Cấp 2.'}
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
                  const cn = lvl2.clinicalNotes || pillar.clinicalNotes;

                  return (
                    <tr
                      key={lvl2.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      {/* COLUMN 1: LEVEL 1 PILLAR (Merged via rowSpan on first Level 2 row) */}
                      {l2Idx === 0 && (
                        <td
                          rowSpan={visibleLvl2.length}
                          onClick={() => onSelectNode(pillar.id)}
                          style={{ borderLeft: `4px solid ${accentColor}` }}
                          className="p-4 border-r border-[#3c4043] align-top bg-[#191a1e] cursor-pointer"
                        >
                          <div className="sticky top-4 space-y-2">
                            <div className="flex items-start justify-between gap-2">
                              <h3 className="font-display font-bold text-[14.5px] text-white leading-snug">
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
                            {lvl2.summary && (
                              <p className="text-[11.5px] text-[#9aa0a6] leading-snug">
                                {lvl2.summary}
                              </p>
                            )}
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

                      {/* COLUMN 4: CLINICAL NOTES HIGHLIGHT & MASTERY */}
                      <td
                        onClick={() => onSelectNode(lvl2.id)}
                        className="p-3.5 align-top cursor-pointer space-y-2"
                      >
                        <div className="flex items-center justify-between gap-1">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onSetNodeMastery(lvl2.id, 'mastered');
                              }}
                              className={`px-2 py-0.5 rounded text-[10.5px] font-medium border ${
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
                              className={`px-2 py-0.5 rounded text-[10.5px] font-medium border ${
                                lvl2.mastery === 'review'
                                  ? 'bg-[#f59e0b]/20 border-[#f59e0b] text-[#f59e0b]'
                                  : 'bg-[#242528] border-[#3c4043] text-[#9aa0a6] hover:text-white'
                              }`}
                            >
                              ! Ôn lại
                            </button>
                          </div>
                        </div>

                        {cn &&
                        (cn.redFlags?.length ||
                          cn.treatment ||
                          cn.pathogenesis ||
                          cn.pearls ||
                          cn.markdown) ? (
                          <div className="p-2 rounded-lg bg-[#141518] border border-[#2d2e30] space-y-1 text-[11px]">
                            {cn.redFlags && cn.redFlags.length > 0 && (
                              <div className="text-[#f28b82] flex items-start gap-1">
                                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                                <span className="line-clamp-2">
                                  {cn.redFlags[0]}
                                </span>
                              </div>
                            )}
                            {cn.treatment && (
                              <div className="text-[#81c995] line-clamp-2">
                                💊 {cn.treatment}
                              </div>
                            )}
                            {cn.pearls && (
                              <div className="text-[#fdd663] line-clamp-2">
                                💡 {cn.pearls}
                              </div>
                            )}
                            {!cn.redFlags?.length &&
                              !cn.treatment &&
                              !cn.pearls && (
                                <div className="text-[#9aa0a6] line-clamp-2">
                                  📖 {cn.pathogenesis || cn.markdown}
                                </div>
                              )}
                          </div>
                        ) : (
                          <span className="text-[11px] text-[#70757a] block">
                            Click để thêm/xem ghi chú LS
                          </span>
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
