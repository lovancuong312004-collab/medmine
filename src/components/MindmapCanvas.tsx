import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Minus,
  Maximize2,
  Download,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Check,
  RotateCcw,
  FileJson,
  BookOpen,
  GitCommitHorizontal,
  GitFork,
  LayoutGrid,
  Tag,
} from 'lucide-react';
import {
  MindmapNode,
  ActiveRecallLevel,
  MindmapViewMode,
  SEMANTIC_BADGE_CONFIG,
  NodeMasteryStatus,
  LEVEL1_PILLAR_ACCENTS,
} from '../types/mindmap';
import {
  computeHorizontalTreeLayout,
  computeVerticalFlowchartLayout,
  getDirectChildrenCount,
  hasLeadingNumberPrefix,
} from '../utils/mindmapLayout';
import {
  CornellNoteView,
  FishboneDiagramView,
  ClinicalMatrixTableView,
} from './MultiDiagramViews';

interface MindmapCanvasProps {
  rootNode: MindmapNode;
  selectedNodeId: string | null;
  isReadOnly?: boolean;
  onSelectNode: (nodeId: string) => void;
  onToggleCollapse: (nodeId: string) => void;
  onQuickAddChild: (parentId: string) => void;
  onSetNodeMastery: (nodeId: string, mastery: NodeMasteryStatus) => void;
  onApplyLevelFilter: (maxLevel: number) => void;
  activeRecallLevel: ActiveRecallLevel;
  onChangeActiveRecall: (level: ActiveRecallLevel) => void;
  onExportCurrentLessonJson: () => void;
  onOpenEssayStudio?: () => void;
  onOpenPrintStudio?: () => void;
}

export const MindmapCanvas: React.FC<MindmapCanvasProps> = ({
  rootNode,
  selectedNodeId,
  isReadOnly = false,
  onSelectNode,
  onToggleCollapse,
  onQuickAddChild,
  onSetNodeMastery,
  onApplyLevelFilter,
  activeRecallLevel,
  onChangeActiveRecall,
  onExportCurrentLessonJson,
  onOpenEssayStudio,
  onOpenPrintStudio,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<MindmapViewMode>('horizontal');
  const [transform, setTransform] = useState({ x: 64, y: 64, scale: 0.96 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeLevelFilterBtn, setActiveLevelFilterBtn] = useState<number>(99);

  // Semantic Medical Badges toggle (Default: OFF for clean minimalist UI)
  const [showBadges, setShowBadges] = useState<boolean>(false);

  // Track nodes unlocked by clicking during Active Recall
  const [revealedNodeIds, setRevealedNodeIds] = useState<Record<string, boolean>>({});
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const layout = useMemo(() => {
    if (viewMode === 'vertical') {
      return computeVerticalFlowchartLayout(rootNode, showBadges);
    }
    return computeHorizontalTreeLayout(rootNode, showBadges);
  }, [rootNode, viewMode, showBadges]);

  // Reset revealed nodes when active recall level changes
  useEffect(() => {
    setRevealedNodeIds({});
  }, [activeRecallLevel, rootNode.id]);

  const isScrollablePageMode =
    viewMode === 'bento' || viewMode === 'cornell' || viewMode === 'matrix';

  const fishboneSizeRef = useRef<{ width: number; height: number }>({
    width: 1280,
    height: 760,
  });

  const fitFishboneToViewport = useCallback(
    (naturalWidth: number, naturalHeight: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const safeLeft = 64;
      const safeTop = 82;
      const availW = Math.max(480, rect.width - safeLeft - 36);
      const availH = Math.max(360, rect.height - safeTop - 28);

      const rawScale = Math.min(availW / naturalWidth, availH / naturalHeight);
      const clampedScale = Math.min(Math.max(rawScale, 0.52), 0.78);

      const scaledW = naturalWidth * clampedScale;
      const scaledH = naturalHeight * clampedScale;

      const centeredX = Math.max(
        safeLeft,
        safeLeft + (availW - scaledW) / 2
      );
      const centeredY = Math.max(
        safeTop,
        safeTop + (availH - scaledH) / 2
      );

      setTransform({
        x: Math.round(centeredX),
        y: Math.round(centeredY),
        scale: Number(clampedScale.toFixed(2)),
      });
    },
    []
  );

  /**
   * Smart Fit View & Readable Zoom (92% - 96%)
   */
  const fitViewReadable = useCallback(
    (targetMode: MindmapViewMode = viewMode) => {
      if (
        !containerRef.current ||
        targetMode === 'bento' ||
        targetMode === 'cornell' ||
        targetMode === 'matrix'
      ) {
        return;
      }
      const rect = containerRef.current.getBoundingClientRect();

      const targetScale =
        targetMode === 'horizontal'
          ? 0.96
          : targetMode === 'fishbone'
          ? 0.72
          : 0.92;

      if (targetMode === 'vertical') {
        const pillarCount =
          !rootNode.collapsed && rootNode.children ? rootNode.children.length : 0;
        const colWidth = 284;
        const colGap = 16;
        const totalFlowWidth =
          pillarCount > 0
            ? pillarCount * colWidth + (pillarCount - 1) * colGap
            : 360;
        const availW = Math.max(480, rect.width - 96);
        const fittedScale = Math.min(
          0.94,
          Math.max(0.56, Number((availW / totalFlowWidth).toFixed(2)))
        );
        const centerX = totalFlowWidth / 2;
        const newX = Math.max(56, rect.width / 2 - centerX * fittedScale);
        setTransform({
          x: Math.round(newX),
          y: 68,
          scale: fittedScale,
        });
        return;
      }

      if (targetMode === 'fishbone') {
        fitFishboneToViewport(
          fishboneSizeRef.current.width,
          fishboneSizeRef.current.height
        );
        return;
      }

      const rootLayoutNode = layout.nodes.find((n) => n.depth === 0);
      if (rootLayoutNode) {
        const rootCenterY = rootLayoutNode.y + rootLayoutNode.height / 2;
        const newX = 64;
        const newY = rect.height / 2 - rootCenterY * targetScale;
        setTransform({
          x: newX,
          y: newY,
          scale: targetScale,
        });
      } else {
        setTransform({ x: 64, y: 68, scale: 0.96 });
      }
    },
    [
      fitFishboneToViewport,
      layout.nodes,
      rootNode.collapsed,
      rootNode.children,
      viewMode,
    ]
  );

  // Center at readable zoom when switching lessons or view modes
  useEffect(() => {
    const timer = setTimeout(() => {
      fitViewReadable(viewMode);
    }, 40);
    return () => clearTimeout(timer);
  }, [rootNode.id, viewMode]);

  /**
   * Native non-passive wheel listener to handle Touchpad Pinch-to-Zoom (e.ctrlKey / e.metaKey)
   * and Two-Finger Pan without letting the browser zoom the entire webpage.
   */
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleNativeWheel = (e: WheelEvent) => {
      if (isScrollablePageMode) {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        setTransform((prev) => {
          const sensitivity = 0.01;
          const zoomDelta = Math.exp(-e.deltaY * sensitivity);
          const newScale = Math.min(2.5, Math.max(0.2, prev.scale * zoomDelta));

          const newX = cursorX - ((cursorX - prev.x) * newScale) / prev.scale;
          const newY = cursorY - ((cursorY - prev.y) * newScale) / prev.scale;

          return {
            x: newX,
            y: newY,
            scale: newScale,
          };
        });
      } else {
        setTransform((prev) => ({
          ...prev,
          x: prev.x - e.deltaX,
          y: prev.y - e.deltaY,
        }));
      }
    };

    el.addEventListener('wheel', handleNativeWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', handleNativeWheel);
    };
  }, [isScrollablePageMode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (isScrollablePageMode) return;
    if ((e.target as HTMLElement).closest('[data-mindmap-node="true"]')) return;
    if ((e.target as HTMLElement).closest('[data-floating-ui="true"]')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || isScrollablePageMode) return;
    setTransform((prev) => ({
      ...prev,
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    }));
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(2.5, prev.scale * 1.15),
    }));
  };

  const handleZoomOut = () => {
    setTransform((prev) => ({
      ...prev,
      scale: Math.max(0.2, prev.scale / 1.15),
    }));
  };

  const handleLevelClick = (level: number) => {
    setActiveLevelFilterBtn(level);
    onApplyLevelFilter(level);
  };

  const handleNodeToggleCollapse = (nodeId: string) => {
    setActiveLevelFilterBtn(0);
    onToggleCollapse(nodeId);
  };

  // Export interactive SVG diagram snapshot
  const handleExportSvgSnapshot = () => {
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.totalWidth}" height="${layout.totalHeight}" style="background:#131314;font-family:sans-serif">
      ${layout.edges
        .map((edge) => {
          const dx = (edge.endX - edge.startX) * 0.52;
          const d = `M ${edge.startX} ${edge.startY} C ${edge.startX + dx} ${edge.startY}, ${
            edge.endX - dx
          } ${edge.endY}, ${edge.endX} ${edge.endY}`;
          return `<path d="${d}" fill="none" stroke="${
            edge.accentColor || '#8ab4f8'
          }" stroke-width="2" stroke-opacity="0.75"/>`;
        })
        .join('\n')}
      ${layout.nodes
        .map((item) => {
          const bg =
            item.depth === 0
              ? '#3f3c5c'
              : item.depth === 1
              ? '#2d2e30'
              : item.depth === 2
              ? '#242528'
              : '#1b1c1e';
          const stroke = item.depth === 0 ? '#8ab4f8' : '#3c4043';
          const escapedLabel = item.node.label
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
          return `<g transform="translate(${item.x}, ${item.y})">
            <rect width="${item.width}" height="${item.height}" rx="10" fill="${bg}" stroke="${stroke}" stroke-width="1.5"/>
            <text x="12" y="${item.height / 2 + 4}" fill="#e3e3e3" font-size="${
            item.depth === 0 ? 15 : 13
          }">${escapedLabel.slice(0, 38)}</text>
          </g>`;
        })
        .join('\n')}
    </svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${rootNode.label.replace(/\s+/g, '_')}_mindmap.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Determine whether a node at a given depth is blurred by Active Recall
  const isNodeDepthBlurred = (nodeId: string, depth: number) => {
    if (activeRecallLevel === 'off') return false;
    const minBlurDepth = activeRecallLevel === 'level2' ? 2 : 3;
    if (depth < minBlurDepth) return false;
    if (revealedNodeIds[nodeId]) return false;
    if (hoveredNodeId === nodeId) return false;
    return true;
  };

  const hasNodeClinicalNotes = (node: MindmapNode) =>
    Boolean(
      node.clinicalNotes &&
        (node.clinicalNotes.pathogenesis ||
          node.clinicalNotes.clinicalFeatures ||
          node.clinicalNotes.treatment ||
          node.clinicalNotes.pearls ||
          node.clinicalNotes.markdown ||
          (node.clinicalNotes.redFlags && node.clinicalNotes.redFlags.length > 0))
    );

  /**
   * Renders Level 3 & Level 4+ children as compact infographic bullet points (•)
   * inside a Level 2 card (used in both Vertical Flowchart mode and Medical Bento Board mode).
   */
  const renderCompactBulletChildren = (
    items: MindmapNode[],
    depth: number,
    accentColor: string
  ): React.ReactNode => {
    return (
      <div className={depth === 3 ? 'mt-1.5 pt-1.5 border-t border-white/10 space-y-1' : 'mt-1 pl-3 space-y-1'}>
        {items.map((child) => {
          const isChildSelected = selectedNodeId === child.id;
          const childBadge = child.badge ? SEMANTIC_BADGE_CONFIG[child.badge] : null;
          const childHasNotes = hasNodeClinicalNotes(child);
          const childBlurred = isNodeDepthBlurred(child.id, depth);
          const bulletDotColor = childBadge ? childBadge.color : accentColor;
          const colonIdx = child.label.indexOf(':');
          const hasKeywordPrefix = colonIdx > 0 && colonIdx <= 48;

          return (
            <div key={child.id}>
              <div
                onMouseEnter={() => setHoveredNodeId(child.id)}
                onMouseLeave={() => setHoveredNodeId(null)}
                onClick={(e) => {
                  e.stopPropagation();
                  if (activeRecallLevel !== 'off' && !revealedNodeIds[child.id]) {
                    setRevealedNodeIds((prev) => ({ ...prev, [child.id]: true }));
                  }
                  onSelectNode(child.id);
                }}
                style={
                  childBadge
                    ? { borderLeft: `2.5px solid ${childBadge.color}` }
                    : undefined
                }
                className={`group/bullet rounded-md px-2 py-1 transition-colors cursor-pointer flex items-start justify-between gap-1.5 ${
                  isChildSelected
                    ? 'bg-[#3f3c5c]/90 ring-1 ring-[#8ab4f8]'
                    : 'hover:bg-white/[0.06]'
                }`}
              >
                <div
                  className={`flex items-start gap-1.5 min-w-0 flex-1 transition-all duration-150 ${
                    childBlurred ? 'blur-[5px] opacity-55 select-none' : 'blur-0 opacity-100'
                  }`}
                >
                  <span
                    style={{ color: bulletDotColor }}
                    className="font-bold text-[13px] leading-snug shrink-0"
                  >
                    •
                  </span>
                  <div className="min-w-0 flex-1">
                    {showBadges && childBadge && (
                      <span
                        style={{
                          color: childBadge.color,
                          backgroundColor: childBadge.bgColor,
                        }}
                        className="inline-block mr-1.5 px-1.5 py-0.2 rounded text-[10px] font-semibold"
                      >
                        {childBadge.dot} {childBadge.shortLabel}
                      </span>
                    )}
                    <span className="text-[12.5px] text-[#e8eaed] leading-snug">
                      {hasKeywordPrefix ? (
                        <>
                          <strong
                            style={{ color: bulletDotColor }}
                            className="font-bold"
                          >
                            {child.label.slice(0, colonIdx + 1)}
                          </strong>
                          <span>{child.label.slice(colonIdx + 1)}</span>
                        </>
                      ) : (
                        child.label
                      )}
                    </span>
                    {child.summary && (
                      <p className="text-[11px] text-[#9aa0a6] mt-0.5 leading-snug">
                        {child.summary}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0 pt-0.5">
                  {childHasNotes && (
                    <span
                      title="Xem ghi chú lâm sàng"
                      className="text-[#8ab4f8] opacity-80"
                    >
                      <BookOpen className="w-3 h-3" />
                    </span>
                  )}
                  {child.mastery === 'mastered' && (
                    <span className="text-[10.5px] font-bold text-[#10b981]">✓</span>
                  )}
                  {child.mastery === 'review' && (
                    <span className="text-[10.5px] font-bold text-[#f59e0b]">!</span>
                  )}
                </div>
              </div>

              {!child.collapsed && child.children && child.children.length > 0 &&
                renderCompactBulletChildren(child.children, depth + 1, accentColor)}
            </div>
          );
        })}
      </div>
    );
  };

  // Level 2 Card Renderer for Mode 3: Medical Bento Board (groups Level 3 & 4+ as compact bullets inside Level 2)
  const renderBentoLevel2Card = (
    node: MindmapNode,
    accentColor: string
  ): React.ReactNode => {
    const isSelected = selectedNodeId === node.id;
    const directCount = getDirectChildrenCount(node);
    const hasChildren = directCount > 0;
    const isCollapsed = Boolean(node.collapsed);
    const badgeMeta = node.badge ? SEMANTIC_BADGE_CONFIG[node.badge] : null;
    const hasNotes = hasNodeClinicalNotes(node);
    const blurred = isNodeDepthBlurred(node.id, 2);

    return (
      <div
        key={node.id}
        onMouseEnter={() => setHoveredNodeId(node.id)}
        onMouseLeave={() => setHoveredNodeId(null)}
        onClick={(e) => {
          e.stopPropagation();
          if (activeRecallLevel !== 'off' && !revealedNodeIds[node.id]) {
            setRevealedNodeIds((prev) => ({ ...prev, [node.id]: true }));
          }
          onSelectNode(node.id);
        }}
        style={{
          borderLeft: badgeMeta
            ? `3.5px solid ${badgeMeta.color}`
            : `3px solid ${accentColor}`,
        }}
        className={`rounded-xl bg-[#242528] border border-[#3c4043] hover:border-[#5f6368] px-3 py-2 transition-all cursor-pointer ${
          isSelected ? 'ring-2 ring-[#8ab4f8] border-[#8ab4f8]' : ''
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div
            className={`min-w-0 flex-1 transition-all duration-150 ${
              blurred ? 'blur-[5px] opacity-55 select-none' : 'blur-0 opacity-100'
            }`}
          >
            {showBadges && badgeMeta && (
              <span
                style={{
                  color: badgeMeta.color,
                  backgroundColor: badgeMeta.bgColor,
                }}
                className="inline-block mb-1 px-1.5 py-0.5 rounded text-[10px] font-semibold"
              >
                {badgeMeta.dot} {badgeMeta.shortLabel}
              </span>
            )}
            <p className="font-display font-semibold text-[13.5px] text-white leading-snug">
              {node.label}
            </p>
            {node.summary && (
              <p className="mt-1 text-[11.5px] text-[#b0b5ba] leading-snug">
                {node.summary}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {hasNotes && (
              <span
                title="Click để xem chi tiết lâm sàng bên phải"
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
            {!isReadOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAddChild(node.id);
                }}
                title="Thêm ý Cấp 3"
                className="w-5 h-5 rounded-md bg-[#2d2e30] hover:bg-[#8ab4f8] text-[#9aa0a6] hover:text-[#131314] flex items-center justify-center transition-colors"
              >
                <Plus className="w-3 h-3" />
              </button>
            )}
            {hasChildren && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleNodeToggleCollapse(node.id);
                }}
                title={
                  isCollapsed
                    ? `Mở ${directCount} ý con`
                    : `Thu gọn ${directCount} ý con`
                }
                className={`h-5 px-1.5 rounded-md border text-[10.5px] font-mono flex items-center gap-0.5 transition-colors ${
                  isCollapsed
                    ? 'bg-[#3f3c5c] border-[#8ab4f8] text-white'
                    : 'bg-[#2d2e30] border-[#4b5056] text-[#e3e3e3] hover:bg-[#3c4043]'
                }`}
              >
                {isCollapsed ? (
                  <>
                    <span className="text-[#8ab4f8] font-semibold">+{directCount}</span>
                    <ChevronRight className="w-3 h-3" />
                  </>
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Grouped Level 3 & Level 4+ Bullet Items inside Level 2 Card */}
        {hasChildren &&
          !isCollapsed &&
          node.children &&
          renderCompactBulletChildren(node.children, 3, accentColor)}
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className={`relative flex-1 h-full notebooklm-canvas-bg overflow-hidden ${
        isScrollablePageMode
          ? 'cursor-default'
          : isDragging
          ? 'cursor-grabbing'
          : 'cursor-grab'
      }`}
    >
      {/* TOP BAR: 6-MODE MULTI-DIAGRAM SWITCHER + LEVEL CONTROLLER + BADGE TOGGLE + ACTIVE RECALL */}
      <div
        data-floating-ui="true"
        className="absolute top-3 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2 pointer-events-none"
      >
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          {/* 1. MULTI-DIAGRAM SWITCHER (6 SPECIALIZED MEDICAL VIEW MODES) */}
          <div className="flex flex-wrap items-center gap-1 bg-[#1e1f20]/95 backdrop-blur-md border border-[#3c4043] rounded-xl p-1 shadow-lg">
            <button
              onClick={() => setViewMode('horizontal')}
              className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-display font-semibold flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                viewMode === 'horizontal'
                  ? 'bg-[#8ab4f8] text-[#131314] shadow-sm'
                  : 'text-[#e3e3e3] hover:bg-[#2d2e30]'
              }`}
            >
              <GitCommitHorizontal className="w-3.5 h-3.5" />
              <span>Cây Ngang</span>
            </button>

            <button
              onClick={() => setViewMode('vertical')}
              className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-display font-semibold flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                viewMode === 'vertical'
                  ? 'bg-[#8ab4f8] text-[#131314] shadow-sm'
                  : 'text-[#e3e3e3] hover:bg-[#2d2e30]'
              }`}
            >
              <GitFork className="w-3.5 h-3.5 rotate-180" />
              <span>Cây Dọc Infographic</span>
            </button>

            <button
              onClick={() => setViewMode('bento')}
              className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-display font-semibold flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                viewMode === 'bento'
                  ? 'bg-[#8ab4f8] text-[#131314] shadow-sm'
                  : 'text-[#e3e3e3] hover:bg-[#2d2e30]'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Khung Bảng</span>
            </button>

            <button
              onClick={() => setViewMode('cornell')}
              className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-display font-semibold flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                viewMode === 'cornell'
                  ? 'bg-[#8ab4f8] text-[#131314] shadow-sm'
                  : 'text-[#e3e3e3] hover:bg-[#2d2e30]'
              }`}
            >
              <span>📝 Vở Cornell</span>
            </button>

            <button
              onClick={() => setViewMode('fishbone')}
              className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-display font-semibold flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                viewMode === 'fishbone'
                  ? 'bg-[#8ab4f8] text-[#131314] shadow-sm'
                  : 'text-[#e3e3e3] hover:bg-[#2d2e30]'
              }`}
            >
              <span>🐟 Xương Cá</span>
            </button>

            <button
              onClick={() => setViewMode('matrix')}
              className={`px-2.5 py-1.5 rounded-lg text-[11.5px] font-display font-semibold flex items-center gap-1 transition-all whitespace-nowrap cursor-pointer ${
                viewMode === 'matrix'
                  ? 'bg-[#8ab4f8] text-[#131314] shadow-sm'
                  : 'text-[#e3e3e3] hover:bg-[#2d2e30]'
              }`}
            >
              <span>⚖️ Bảng So Sánh</span>
            </button>
          </div>

          {/* 2. LEVEL FILTER BAR (Synchronized across ALL 6 view modes!) */}
          <div className="flex items-center gap-1 bg-[#1e1f20]/95 backdrop-blur-md border border-[#2d2e30] rounded-xl p-1 shadow-lg">
            {[
              { level: 1, label: 'Chỉ Cấp 1' },
              { level: 2, label: 'Đến Cấp 2' },
              { level: 3, label: 'Đến Cấp 3' },
              { level: 99, label: 'Mở tất cả' },
            ].map((btn) => (
              <button
                key={btn.level}
                onClick={() => handleLevelClick(btn.level)}
                className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-all whitespace-nowrap cursor-pointer ${
                  activeLevelFilterBtn === btn.level
                    ? 'bg-[#3f3c5c] border border-[#8ab4f8]/60 text-white font-semibold'
                    : 'text-[#e3e3e3] hover:bg-[#2d2e30]'
                }`}
              >
                {btn.label}
              </button>
            ))}
          </div>

          {/* 3. SEMANTIC BADGE TOGGLE SWITCH (Default: OFF) */}
          <button
            onClick={() => setShowBadges((prev) => !prev)}
            title={
              showBadges
                ? 'Đang hiện tem nhãn y khoa (Click để ẩn cho gọn)'
                : 'Bật hiển thị tem nhãn y khoa (🔴 Cờ đỏ, 🔵 Chẩn đoán, 🟢 Điều trị...)'
            }
            className={`px-3 py-1.5 rounded-xl border text-[12px] font-medium flex items-center gap-1.5 shadow-lg transition-all whitespace-nowrap cursor-pointer ${
              showBadges
                ? 'bg-[#3f3c5c] border-[#8ab4f8] text-white font-semibold'
                : 'bg-[#1e1f20]/95 border-[#2d2e30] text-[#9aa0a6] hover:text-white hover:bg-[#2d2e30]'
            }`}
          >
            <Tag className="w-3.5 h-3.5 text-[#8ab4f8]" />
            <span>🏷️ Hiện nhãn</span>
          </button>
        </div>

        {/* Right: Medical Essay Barem Studio + Print A4 Studio + Active Recall Selector */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {onOpenEssayStudio && (
            <button
              onClick={onOpenEssayStudio}
              title="Mở Trung tâm Luyện Thi Tự Luận theo Barem 0.25đ - 0.5đ & Từ khóa Y khoa"
              className="px-3 py-1.5 rounded-xl bg-[#3f3c5c] hover:bg-[#4e4a70] border border-[#8ab4f8]/60 text-white font-display font-semibold text-[12px] flex items-center gap-1.5 shadow-lg transition-all whitespace-nowrap cursor-pointer"
            >
              <span>✍️ Luyện Thi Tự Luận (Barem)</span>
            </button>
          )}

          {onOpenPrintStudio && (
            <button
              onClick={onOpenPrintStudio}
              title="Xuất PDF / In A4 Đề Cương Tự Luận, Infographic Ngang & Đề Khuyết Chữ"
              className="px-3 py-1.5 rounded-xl bg-[#1e1f20]/95 hover:bg-[#2d2e30] border border-[#3c4043] text-[#e3e3e3] font-display font-semibold text-[12px] flex items-center gap-1.5 shadow-lg transition-all whitespace-nowrap cursor-pointer"
            >
              <span>🖨️ Xuất PDF / In A4</span>
            </button>
          )}

          <div className="flex items-center gap-1 bg-[#1e1f20]/95 backdrop-blur-md border border-[#2d2e30] rounded-xl p-1 shadow-lg">
            <div className="flex items-center gap-1 px-2">
              {activeRecallLevel === 'off' ? (
                <Eye className="w-3.5 h-3.5 text-[#8ab4f8]" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-[#fdd663]" />
              )}
              <span className="text-[11px] font-medium text-[#9aa0a6] whitespace-nowrap hidden md:inline">
                Ôn thi:
              </span>
            </div>

            {(
              [
                { id: 'off', label: 'Tắt' },
                { id: 'level2', label: 'Mờ Cấp 2+' },
                { id: 'level3', label: 'Mờ Cấp 3+' },
              ] as const
            ).map((mode) => (
              <button
                key={mode.id}
                onClick={() => onChangeActiveRecall(mode.id)}
                className={`px-2.5 py-1.5 rounded-lg text-[12px] font-medium transition-colors whitespace-nowrap cursor-pointer ${
                  activeRecallLevel === mode.id
                    ? mode.id === 'off'
                      ? 'bg-[#2d2e30] text-white'
                      : 'bg-[#f59e0b] text-[#131314] font-semibold'
                    : 'text-[#9aa0a6] hover:text-white hover:bg-[#2d2e30]/60'
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* MODE 4: 📝 CORNELL NOTE / SKETCH OUTLINE VIEW                         */}
      {/* ===================================================================== */}
      {viewMode === 'cornell' ? (
        <CornellNoteView
          rootNode={rootNode}
          selectedNodeId={selectedNodeId}
          isReadOnly={isReadOnly}
          showBadges={showBadges}
          activeRecallLevel={activeRecallLevel}
          revealedNodeIds={revealedNodeIds}
          hoveredNodeId={hoveredNodeId}
          onSetHoveredNodeId={setHoveredNodeId}
          onRevealNode={(id) =>
            setRevealedNodeIds((prev) => ({ ...prev, [id]: true }))
          }
          onSelectNode={onSelectNode}
          onToggleCollapse={handleNodeToggleCollapse}
          onQuickAddChild={onQuickAddChild}
          onSetNodeMastery={onSetNodeMastery}
          isNodeDepthBlurred={isNodeDepthBlurred}
          hasNodeClinicalNotes={hasNodeClinicalNotes}
        />
      ) : viewMode === 'matrix' ? (
        /* ===================================================================== */
        /* MODE 6: ⚖️ CLINICAL MATRIX COMPARISON TABLE VIEW                      */
        /* ===================================================================== */
        <ClinicalMatrixTableView
          rootNode={rootNode}
          selectedNodeId={selectedNodeId}
          isReadOnly={isReadOnly}
          showBadges={showBadges}
          activeRecallLevel={activeRecallLevel}
          revealedNodeIds={revealedNodeIds}
          hoveredNodeId={hoveredNodeId}
          onSetHoveredNodeId={setHoveredNodeId}
          onRevealNode={(id) =>
            setRevealedNodeIds((prev) => ({ ...prev, [id]: true }))
          }
          onSelectNode={onSelectNode}
          onToggleCollapse={handleNodeToggleCollapse}
          onQuickAddChild={onQuickAddChild}
          onSetNodeMastery={onSetNodeMastery}
          isNodeDepthBlurred={isNodeDepthBlurred}
          hasNodeClinicalNotes={hasNodeClinicalNotes}
        />
      ) : viewMode === 'bento' ? (
        /* ===================================================================== */
        /* MODE 3: MEDICAL BENTO BOARD / FRAMED CARD GRID VIEW                   */
        /* ===================================================================== */
        <div className="w-full h-full overflow-y-auto pt-16 pb-12 px-4 select-text">
          <div className="max-w-[1600px] mx-auto space-y-4">
            {/* Compact Root Topic Header Card (No redundant meta text) */}
            <div
              onClick={() => onSelectNode(rootNode.id)}
              className={`px-4 py-3 rounded-xl bg-[#3f3c5c] border-2 transition-all cursor-pointer shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 ${
                selectedNodeId === rootNode.id ? 'border-white' : 'border-[#8ab4f8]'
              }`}
            >
              <div className="space-y-0.5">
                <h1 className="font-display font-bold text-[17px] text-white">
                  {rootNode.label}
                </h1>
                {rootNode.summary && (
                  <p className="text-[12.5px] text-[#e3e3e3]/90">{rootNode.summary}</p>
                )}
              </div>

              {!isReadOnly && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onQuickAddChild(rootNode.id);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-display font-semibold text-[12px] flex items-center gap-1 shadow shrink-0 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>+ Thêm Nhánh Cấp 1</span>
                </button>
              )}
            </div>

            {/* Compact Pillar Columns / Bento Cards for Level 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3.5 items-start">
              {(rootNode.children || []).map((pillar, idx) => {
                const pillarIndex = idx + 1;
                const accentColor =
                  pillar.accentColor ||
                  LEVEL1_PILLAR_ACCENTS[idx % LEVEL1_PILLAR_ACCENTS.length];
                const isSelected = selectedNodeId === pillar.id;
                const isCollapsed = Boolean(pillar.collapsed);
                const directCount = getDirectChildrenCount(pillar);
                const hasNotes = hasNodeClinicalNotes(pillar);
                const showPillarNum = !hasLeadingNumberPrefix(pillar.label);

                return (
                  <div
                    key={pillar.id}
                    onClick={() => onSelectNode(pillar.id)}
                    style={{ borderTop: `3.5px solid ${accentColor}` }}
                    className={`rounded-xl bg-[#1e1f20] border border-[#3c4043] shadow-lg overflow-hidden transition-all cursor-pointer ${
                      isSelected ? 'ring-2 ring-[#8ab4f8]' : ''
                    }`}
                  >
                    {/* Clean Pillar Card Header (No "KHUNG 1" meta badge) */}
                    <div className="px-3.5 py-2.5 bg-[#26272b] border-b border-[#3c4043] flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
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
                        {pillar.summary && (
                          <p className="text-[11.5px] text-[#b0b5ba] mt-0.5 leading-snug">
                            {pillar.summary}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {hasNotes && (
                          <span className="text-[#8ab4f8] p-0.5">
                            <BookOpen className="w-3.5 h-3.5" />
                          </span>
                        )}

                        {!isReadOnly && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickAddChild(pillar.id);
                            }}
                            title="Thêm nhánh Cấp 2"
                            className="w-6 h-6 rounded-md bg-[#2d2e30] hover:bg-[#8ab4f8] text-[#e3e3e3] hover:text-[#131314] flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {directCount > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNodeToggleCollapse(pillar.id);
                            }}
                            className={`px-2 h-6 rounded-md border text-[10.5px] font-mono flex items-center gap-0.5 transition-colors ${
                              isCollapsed
                                ? 'bg-[#3f3c5c] border-[#8ab4f8] text-white'
                                : 'bg-[#2d2e30] hover:bg-[#3c4043] border-[#4b5056] text-white'
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

                    {/* Pillar Card Body: Compact Level 2 Cards with grouped Level 3+ bullets */}
                    {!isCollapsed && pillar.children && pillar.children.length > 0 ? (
                      <div className="p-2.5 space-y-2">
                        {pillar.children.map((sub) =>
                          renderBentoLevel2Card(sub, accentColor)
                        )}
                      </div>
                    ) : isCollapsed ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNodeToggleCollapse(pillar.id);
                        }}
                        className="px-3 py-2 text-center text-[11.5px] text-[#9aa0a6] hover:text-white hover:bg-[#242528]/50 transition-colors"
                      >
                        Đang ẩn{' '}
                        <span className="text-[#8ab4f8] font-mono font-semibold">
                          +{directCount}
                        </span>{' '}
                        nhánh con. Click để mở.
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-center text-[11.5px] text-[#70757a]">
                        Chưa có nhánh con.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      ) : (
        /* ===================================================================== */
        /* MODE 1, MODE 2 & MODE 5: 2D PANNABLE/ZOOMABLE DIAGRAM STAGES          */
        /* ===================================================================== */
        <>
          {/* NOTEBOOKLM FLOATING CONTROL DOCK (LEFT SIDE) */}
          <div
            data-floating-ui="true"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1 bg-[#1e1f20]/95 backdrop-blur-md border border-[#2d2e30] p-1.5 rounded-2xl shadow-xl"
          >
            <button
              onClick={handleZoomIn}
              title="Phóng to (+)"
              className="w-8 h-8 rounded-xl hover:bg-[#2d2e30] text-[#e3e3e3] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="text-[10px] font-mono font-semibold text-center text-[#8ab4f8] py-0.5 select-none">
              {Math.round(transform.scale * 100)}%
            </div>
            <button
              onClick={handleZoomOut}
              title="Thu nhỏ (-)"
              className="w-8 h-8 rounded-xl hover:bg-[#2d2e30] text-[#e3e3e3] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="h-[1px] bg-[#2d2e30] my-0.5" />

            <button
              onClick={() => fitViewReadable(viewMode)}
              title="Căn giữa chuẩn tỷ lệ đọc 95% (Fit View)"
              className="w-8 h-8 rounded-xl hover:bg-[#2d2e30] text-[#8ab4f8] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <div className="h-[1px] bg-[#2d2e30] my-0.5" />

            <button
              onClick={handleExportSvgSnapshot}
              title="Tải ảnh Sơ đồ Tư duy (.SVG Vector sắc nét)"
              className="w-8 h-8 rounded-xl hover:bg-[#2d2e30] text-[#81c995] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onExportCurrentLessonJson}
              title="Tải file JSON của bài học này"
              className="w-8 h-8 rounded-xl hover:bg-[#2d2e30] text-[#c58af9] flex items-center justify-center transition-colors cursor-pointer"
            >
              <FileJson className="w-4 h-4" />
            </button>
          </div>

          {/* TRANSFORMABLE MINDMAP STAGE */}
          {viewMode === 'fishbone' ? (
            /* ================================================================= */
            /* MODE 5: 🐟 ISHIKAWA FISHBONE DIAGRAM                              */
            /* ================================================================= */
            <FishboneDiagramView
              rootNode={rootNode}
              selectedNodeId={selectedNodeId}
              isReadOnly={isReadOnly}
              showBadges={showBadges}
              activeRecallLevel={activeRecallLevel}
              revealedNodeIds={revealedNodeIds}
              hoveredNodeId={hoveredNodeId}
              transform={transform}
              onSetHoveredNodeId={setHoveredNodeId}
              onRevealNode={(id) =>
                setRevealedNodeIds((prev) => ({ ...prev, [id]: true }))
              }
              onSelectNode={onSelectNode}
              onToggleCollapse={handleNodeToggleCollapse}
              onQuickAddChild={onQuickAddChild}
              onSetNodeMastery={onSetNodeMastery}
              isNodeDepthBlurred={isNodeDepthBlurred}
              hasNodeClinicalNotes={hasNodeClinicalNotes}
              renderCompactBulletChildren={renderCompactBulletChildren}
              onAutoFitMeasured={(w, h) => {
                fishboneSizeRef.current = { width: w, height: h };
                fitFishboneToViewport(w, h);
              }}
            />
          ) : viewMode === 'vertical' ? (
            /* ================================================================= */
            /* MODE 2: TEXTBOOK INFOGRAPHIC VERTICAL SCHEMATIC                   */
            /* Top Lesson Box -> Wide Definition Box -> Orthogonal Bus Lines ->  */
            /* Color-Coded Columns -> Center-Connected Level 2 Cards             */
            /* ================================================================= */
            <div
              style={{
                transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
                transformOrigin: '0 0',
              }}
              className="relative inline-flex flex-col items-center pointer-events-auto select-none pb-28 pr-28"
            >
              {(() => {
                const rootSelected = selectedNodeId === rootNode.id;
                const rootDirectCount = getDirectChildrenCount(rootNode);
                const rootHasChildren = rootDirectCount > 0;
                const rootHasNotes = hasNodeClinicalNotes(rootNode);
                const visiblePillars =
                  !rootNode.collapsed && rootNode.children ? rootNode.children : [];

                const colWidth = 284;
                const colGap = 16; // gap-4
                const totalRowWidth =
                  visiblePillars.length > 0
                    ? visiblePillars.length * colWidth +
                      (visiblePillars.length - 1) * colGap
                    : 420;
                const rootCenterX = totalRowWidth / 2;

                // Distinct Textbook Infographic Column Themes (Blue, Green, Orange, Purple, Rose, Teal)
                const INFOGRAPHIC_COL_THEMES = [
                  {
                    headerBg: '#1d4ed8', // Cột 1: Xanh dương
                    headerBorder: '#60a5fa',
                    cardBg: '#162033',
                    cardHoverBg: '#1c2942',
                    cardBorder: '#3b82f6',
                    spineColor: '#3b82f6',
                    keywordColor: '#93c5fd',
                    badgeBg: '#2563eb',
                  },
                  {
                    headerBg: '#15803d', // Cột 2: Xanh lá
                    headerBorder: '#4ade80',
                    cardBg: '#13251e',
                    cardHoverBg: '#193128',
                    cardBorder: '#22c55e',
                    spineColor: '#22c55e',
                    keywordColor: '#86efac',
                    badgeBg: '#16a34a',
                  },
                  {
                    headerBg: '#c2410c', // Cột 3: Cam
                    headerBorder: '#fb923c',
                    cardBg: '#271a14',
                    cardHoverBg: '#33221a',
                    cardBorder: '#f97316',
                    spineColor: '#f97316',
                    keywordColor: '#fdba74',
                    badgeBg: '#ea580c',
                  },
                  {
                    headerBg: '#6d28d9', // Cột 4: Tím
                    headerBorder: '#a78bfa',
                    cardBg: '#201833',
                    cardHoverBg: '#2a1f42',
                    cardBorder: '#8b5cf6',
                    spineColor: '#8b5cf6',
                    keywordColor: '#c4b5fd',
                    badgeBg: '#7c3aed',
                  },
                  {
                    headerBg: '#be185d', // Cột 5: Hồng đỏ
                    headerBorder: '#f472b6',
                    cardBg: '#291523',
                    cardHoverBg: '#361b2e',
                    cardBorder: '#ec4899',
                    spineColor: '#ec4899',
                    keywordColor: '#f9a8d4',
                    badgeBg: '#db2777',
                  },
                  {
                    headerBg: '#0f766e', // Cột 6: Xanh cổ vịt
                    headerBorder: '#2dd4bf',
                    cardBg: '#122526',
                    cardHoverBg: '#173133',
                    cardBorder: '#14b8a6',
                    spineColor: '#14b8a6',
                    keywordColor: '#5eead4',
                    badgeBg: '#0d9488',
                  },
                ];

                const generalDefinitionText =
                  rootNode.summary ||
                  (visiblePillars.length > 0
                    ? `Hệ thống hóa ${visiblePillars.length} nhánh trọng tâm: ${visiblePillars
                        .map((p) => p.label.replace(/^\s*\d+[\.\)\-:]\s*/, ''))
                        .join(' · ')}`
                    : '');

                const firstColCenterX = colWidth / 2;
                const lastColCenterX =
                  visiblePillars.length > 0
                    ? (visiblePillars.length - 1) * (colWidth + colGap) +
                      colWidth / 2
                    : rootCenterX;

                return (
                  <div
                    style={{ width: totalRowWidth }}
                    className="flex flex-col items-center"
                  >
                    {/* 1. TOP LESSON TITLE BOX (Deep Royal Indigo / Blue Textbook Header) */}
                    <div
                      data-mindmap-node="true"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectNode(rootNode.id);
                      }}
                      style={{
                        minWidth: 340,
                        maxWidth: 680,
                        border: rootSelected
                          ? '2.5px solid #ffffff'
                          : '2px solid #60a5fa',
                      }}
                      className="group relative px-6 py-3 bg-gradient-to-r from-[#1e3a8a] via-[#312e81] to-[#1e3a8a] hover:brightness-110 rounded-xl shadow-2xl text-center transition-all cursor-pointer"
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span className="font-display font-extrabold text-[17px] uppercase tracking-wide text-white leading-snug">
                          {rootNode.label}
                        </span>
                        {rootHasNotes && (
                          <span
                            title="Xem ghi chú lâm sàng"
                            className="text-[#93c5fd] shrink-0"
                          >
                            <BookOpen className="w-4 h-4" />
                          </span>
                        )}
                      </div>

                      {!isReadOnly && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickAddChild(rootNode.id);
                          }}
                          title="Thêm Cột Cấp 1"
                          className="opacity-0 group-hover:opacity-100 absolute -bottom-2.5 right-3 w-5 h-5 rounded-full bg-[#1e3a8a] hover:bg-[#60a5fa] text-white hover:text-[#131314] border border-[#60a5fa] flex items-center justify-center transition-all shadow z-10"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      )}
                    </div>

                    {/* 2. STRAIGHT VERTICAL CONNECTOR DOWN TO WIDE DEFINITION BANNER */}
                    {generalDefinitionText && (
                      <>
                        <div className="w-[2.5px] h-3.5 bg-[#60a5fa] shrink-0" />
                        <div
                          data-mindmap-node="true"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectNode(rootNode.id);
                          }}
                          style={{
                            width: Math.min(totalRowWidth - 40, 820),
                            minWidth: 320,
                          }}
                          className="relative px-5 py-2.5 bg-[#1b2234] border-2 border-[#3b82f6]/70 rounded-xl shadow-lg text-center cursor-pointer hover:border-[#60a5fa] transition-colors"
                        >
                          <div className="text-[12.5px] text-[#e2e8f0] leading-relaxed font-medium">
                            <strong className="text-[#93c5fd] font-bold uppercase text-[11.5px] mr-1.5">
                              Định nghĩa & Tổng quan:
                            </strong>
                            {generalDefinitionText}
                          </div>

                          {/* Collapse / Expand All Pillars Button */}
                          {rootHasChildren && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNodeToggleCollapse(rootNode.id);
                              }}
                              title={
                                rootNode.collapsed
                                  ? `Mở rộng ${rootDirectCount} cột Cấp 1`
                                  : `Thu gọn ${rootDirectCount} cột Cấp 1`
                              }
                              className={`absolute left-1/2 -translate-x-1/2 -bottom-3 h-5 px-2 rounded-full border flex items-center justify-center gap-0.5 transition-all shadow-md cursor-pointer z-10 ${
                                rootNode.collapsed
                                  ? 'bg-[#1d4ed8] border-[#93c5fd] text-white'
                                  : 'bg-[#1e293b] border-[#60a5fa] text-[#e2e8f0] hover:bg-[#334155]'
                              }`}
                            >
                              {rootNode.collapsed ? (
                                <>
                                  <span className="text-[10px] font-mono font-bold text-white pl-0.5">
                                    +{rootDirectCount}
                                  </span>
                                  <ChevronDown className="w-3 h-3" />
                                </>
                              ) : (
                                <ChevronUp className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                      </>
                    )}

                    {/* 3. ORTHOGONAL 90-DEGREE BUS LINE TO LEVEL 1 COLUMNS (Zero curvy lines!) */}
                    {visiblePillars.length > 0 && (
                      <svg
                        width={totalRowWidth}
                        height={38}
                        className="block pointer-events-none overflow-visible shrink-0"
                      >
                        {/* Center vertical stem from definition box down to horizontal bus */}
                        <line
                          x1={rootCenterX}
                          y1={0}
                          x2={rootCenterX}
                          y2={18}
                          stroke="#60a5fa"
                          strokeWidth={2.5}
                        />
                        {/* Horizontal orthogonal bus bar connecting first column to last column */}
                        {visiblePillars.length > 1 && (
                          <line
                            x1={firstColCenterX}
                            y1={18}
                            x2={lastColCenterX}
                            y2={18}
                            stroke="#60a5fa"
                            strokeWidth={2.5}
                          />
                        )}
                        {/* Vertical 90-degree drop lines into the top center of each Level 1 column */}
                        {visiblePillars.map((pillar, idx) => {
                          const targetX =
                            idx * (colWidth + colGap) + colWidth / 2;
                          const colTheme =
                            INFOGRAPHIC_COL_THEMES[
                              idx % INFOGRAPHIC_COL_THEMES.length
                            ];
                          return (
                            <g key={`ortho-edge-${pillar.id}`}>
                              <line
                                x1={targetX}
                                y1={18}
                                x2={targetX}
                                y2={36}
                                stroke={colTheme.headerBorder}
                                strokeWidth={2.5}
                              />
                              <polygon
                                points={`${targetX - 4.5},31 ${targetX + 4.5},31 ${targetX},38`}
                                fill={colTheme.headerBorder}
                              />
                            </g>
                          );
                        })}
                      </svg>
                    )}

                    {/* 4. LEVEL 1 INFOGRAPHIC COLUMNS ROW (Flexbox: items-start gap-4) */}
                    {visiblePillars.length > 0 && (
                      <div className="flex items-start gap-4">
                        {visiblePillars.map((pillar, idx) => {
                          const pillarIndex = idx + 1;
                          const colTheme =
                            INFOGRAPHIC_COL_THEMES[
                              idx % INFOGRAPHIC_COL_THEMES.length
                            ];
                          const isPillarSelected = selectedNodeId === pillar.id;
                          const pillarDirectCount = getDirectChildrenCount(pillar);
                          const pillarHasChildren = pillarDirectCount > 0;
                          const pillarHasNotes = hasNodeClinicalNotes(pillar);
                          const pillarBlurred = isNodeDepthBlurred(pillar.id, 1);
                          const showPillarNum = !hasLeadingNumberPrefix(
                            pillar.label
                          );
                          const visibleLevel2Nodes =
                            !pillar.collapsed && pillar.children
                              ? pillar.children
                              : [];

                          return (
                            <div
                              key={pillar.id}
                              style={{ width: colWidth }}
                              className="flex flex-col items-center shrink-0"
                            >
                              {/* LEVEL 1 COLUMN HEADER BOX (Distinct Color per Column) */}
                              <div
                                data-mindmap-node="true"
                                onMouseEnter={() => setHoveredNodeId(pillar.id)}
                                onMouseLeave={() => setHoveredNodeId(null)}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (
                                    activeRecallLevel !== 'off' &&
                                    !revealedNodeIds[pillar.id]
                                  ) {
                                    setRevealedNodeIds((prev) => ({
                                      ...prev,
                                      [pillar.id]: true,
                                    }));
                                  }
                                  onSelectNode(pillar.id);
                                }}
                                style={{
                                  backgroundColor: colTheme.headerBg,
                                  border: isPillarSelected
                                    ? '2.5px solid #ffffff'
                                    : `2px solid ${colTheme.headerBorder}`,
                                }}
                                className="group relative w-full px-3.5 py-2.5 rounded-xl shadow-lg transition-all cursor-pointer hover:brightness-110"
                              >
                                <div className="flex items-start justify-between gap-1.5">
                                  <div
                                    className={`min-w-0 flex-1 transition-all duration-150 ${
                                      pillarBlurred
                                        ? 'blur-[5px] opacity-55 select-none'
                                        : 'blur-0 opacity-100'
                                    }`}
                                  >
                                    <div className="font-display font-bold text-[14px] text-white leading-snug">
                                      {showPillarNum && (
                                        <span className="font-mono font-extrabold mr-1.5 text-white/95">
                                          {pillarIndex}.
                                        </span>
                                      )}
                                      <span>{pillar.label}</span>
                                    </div>
                                    {pillar.summary && (
                                      <p className="text-[11.5px] text-white/90 mt-1 pt-1 border-t border-white/20 leading-snug">
                                        {pillar.summary}
                                      </p>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                    {pillarHasNotes && (
                                      <span
                                        title="Có ghi chú lâm sàng"
                                        className="text-white/90"
                                      >
                                        <BookOpen className="w-3.5 h-3.5" />
                                      </span>
                                    )}
                                    {pillar.mastery === 'mastered' && (
                                      <span className="text-[11px] font-bold text-[#a7f3d0]">
                                        ✓
                                      </span>
                                    )}
                                    {pillar.mastery === 'review' && (
                                      <span className="text-[11px] font-bold text-[#fde68a]">
                                        !
                                      </span>
                                    )}
                                  </div>
                                </div>

                                {/* Quick Add Child on Level 1 */}
                                {!isReadOnly && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onQuickAddChild(pillar.id);
                                    }}
                                    title="Thêm Khung Cấp 2"
                                    className="opacity-0 group-hover:opacity-100 absolute -bottom-2 right-2.5 w-4.5 h-4.5 rounded-full bg-[#131314] hover:bg-white text-white hover:text-[#131314] border border-white/60 flex items-center justify-center transition-all shadow z-10"
                                  >
                                    <Plus className="w-2.5 h-2.5" />
                                  </button>
                                )}

                                {/* Collapse / Expand Level 1 */}
                                {pillarHasChildren && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleNodeToggleCollapse(pillar.id);
                                    }}
                                    title={
                                      pillar.collapsed
                                        ? `Mở ${pillarDirectCount} khung Cấp 2`
                                        : `Thu gọn ${pillarDirectCount} khung Cấp 2`
                                    }
                                    className="absolute right-8 -bottom-2.5 h-5 px-1.5 rounded-full bg-[#131314] border border-white/50 text-white flex items-center justify-center gap-0.5 transition-all shadow-md cursor-pointer z-10"
                                  >
                                    {pillar.collapsed ? (
                                      <>
                                        <span className="text-[10px] font-mono font-bold text-white pl-0.5">
                                          +{pillarDirectCount}
                                        </span>
                                        <ChevronDown className="w-3 h-3" />
                                      </>
                                    ) : (
                                      <ChevronUp className="w-3 h-3" />
                                    )}
                                  </button>
                                )}
                              </div>

                              {/* 5. LEVEL 2 BOXES BELOW EACH COLUMN (Connected by short center vertical stems!) */}
                              {visibleLevel2Nodes.length > 0 && (
                                <div className="w-full flex flex-col items-center">
                                  {visibleLevel2Nodes.map((lvl2Node, l2Idx) => {
                                    const isLvl2Selected =
                                      selectedNodeId === lvl2Node.id;
                                    const lvl2DirectCount =
                                      getDirectChildrenCount(lvl2Node);
                                    const lvl2HasChildren = lvl2DirectCount > 0;
                                    const lvl2HasNotes =
                                      hasNodeClinicalNotes(lvl2Node);
                                    const lvl2Blurred = isNodeDepthBlurred(
                                      lvl2Node.id,
                                      2
                                    );
                                    const lvl2Badge = lvl2Node.badge
                                      ? SEMANTIC_BADGE_CONFIG[lvl2Node.badge]
                                      : null;
                                    const visibleLvl3Nodes =
                                      !lvl2Node.collapsed && lvl2Node.children
                                        ? lvl2Node.children
                                        : [];

                                    return (
                                      <React.Fragment key={lvl2Node.id}>
                                        {/* SHORT CENTER VERTICAL CONNECTOR SEGMENT BETWEEN BOXES */}
                                        <div className="flex flex-col items-center shrink-0">
                                          <div
                                            style={{
                                              backgroundColor:
                                                colTheme.spineColor,
                                            }}
                                            className="w-[2.5px] h-3"
                                          />
                                          <div
                                            style={{
                                              borderTopColor:
                                                colTheme.spineColor,
                                            }}
                                            className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px]"
                                          />
                                        </div>

                                        {/* LEVEL 2 CARD */}
                                        <div
                                          data-mindmap-node="true"
                                          onMouseEnter={() =>
                                            setHoveredNodeId(lvl2Node.id)
                                          }
                                          onMouseLeave={() =>
                                            setHoveredNodeId(null)
                                          }
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (
                                              activeRecallLevel !== 'off' &&
                                              !revealedNodeIds[lvl2Node.id]
                                            ) {
                                              setRevealedNodeIds((prev) => ({
                                                ...prev,
                                                [lvl2Node.id]: true,
                                              }));
                                            }
                                            onSelectNode(lvl2Node.id);
                                          }}
                                          style={{
                                            backgroundColor: colTheme.cardBg,
                                            border: isLvl2Selected
                                              ? '2px solid #ffffff'
                                              : `1.5px solid ${colTheme.cardBorder}`,
                                          }}
                                          className="group relative w-full h-auto px-3 py-2.5 rounded-xl shadow-md transition-all cursor-pointer hover:brightness-110"
                                        >
                                          {/* Optional Semantic Badge when toggled ON */}
                                          {showBadges && lvl2Badge && (
                                            <div className="mb-1">
                                              <span
                                                style={{
                                                  color: lvl2Badge.color,
                                                  backgroundColor:
                                                    lvl2Badge.bgColor,
                                                }}
                                                className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold"
                                              >
                                                {lvl2Badge.dot}{' '}
                                                {lvl2Badge.shortLabel}
                                              </span>
                                            </div>
                                          )}

                                          {/* Level 2 Header & Summary */}
                                          <div
                                            style={{
                                              borderBottomColor:
                                                visibleLvl3Nodes.length > 0 ||
                                                lvl2Node.summary
                                                  ? `${colTheme.cardBorder}55`
                                                  : 'transparent',
                                            }}
                                            className={`flex items-start justify-between gap-1.5 ${
                                              visibleLvl3Nodes.length > 0 ||
                                              lvl2Node.summary
                                                ? 'pb-1.5 mb-2 border-b'
                                                : ''
                                            }`}
                                          >
                                            <div
                                              className={`min-w-0 flex-1 transition-all duration-150 ${
                                                lvl2Blurred
                                                  ? 'blur-[5px] opacity-55 select-none'
                                                  : 'blur-0 opacity-100'
                                              }`}
                                            >
                                              <div
                                                style={{
                                                  color: colTheme.keywordColor,
                                                }}
                                                className="font-display font-bold text-[13px] leading-snug"
                                              >
                                                {!hasLeadingNumberPrefix(
                                                  lvl2Node.label
                                                ) && (
                                                  <span className="font-mono mr-1">
                                                    {pillarIndex}.{l2Idx + 1}.
                                                  </span>
                                                )}
                                                <span className="text-white">
                                                  {lvl2Node.label}
                                                </span>
                                              </div>
                                              {lvl2Node.summary && (
                                                <p className="text-[11.5px] text-[#cbd5e1] mt-1 leading-snug">
                                                  {lvl2Node.summary}
                                                </p>
                                              )}
                                            </div>

                                            <div className="flex items-center gap-1 shrink-0 pt-0.5">
                                              {lvl2HasNotes && (
                                                <span
                                                  title="Có ghi chú lâm sàng"
                                                  style={{
                                                    color: colTheme.keywordColor,
                                                  }}
                                                >
                                                  <BookOpen className="w-3 h-3" />
                                                </span>
                                              )}
                                              {lvl2Node.mastery ===
                                                'mastered' && (
                                                <span className="text-[11px] font-bold text-[#10b981]">
                                                  ✓
                                                </span>
                                              )}
                                              {lvl2Node.mastery ===
                                                'review' && (
                                                <span className="text-[11px] font-bold text-[#f59e0b]">
                                                  !
                                                </span>
                                              )}
                                            </div>
                                          </div>

                                          {/* 6. LEVEL 3 ITEMS INSIDE LEVEL 2 BOX (Colored numbered circles ① ② ③ + Bold keywords) */}
                                          {visibleLvl3Nodes.length > 0 && (
                                            <div className="space-y-1.5">
                                              {visibleLvl3Nodes.map(
                                                (lvl3Node, l3Idx) => {
                                                  const isLvl3Selected =
                                                    selectedNodeId ===
                                                    lvl3Node.id;
                                                  const lvl3Blurred =
                                                    isNodeDepthBlurred(
                                                      lvl3Node.id,
                                                      3
                                                    );
                                                  const lvl3Badge =
                                                    lvl3Node.badge
                                                      ? SEMANTIC_BADGE_CONFIG[
                                                          lvl3Node.badge
                                                        ]
                                                      : null;
                                                  const colonIdx =
                                                    lvl3Node.label.indexOf(':');
                                                  const hasKw =
                                                    colonIdx > 0 &&
                                                    colonIdx <= 48;

                                                  return (
                                                    <div key={lvl3Node.id}>
                                                      <div
                                                        onMouseEnter={() =>
                                                          setHoveredNodeId(
                                                            lvl3Node.id
                                                          )
                                                        }
                                                        onMouseLeave={() =>
                                                          setHoveredNodeId(null)
                                                        }
                                                        onClick={(e) => {
                                                          e.stopPropagation();
                                                          if (
                                                            activeRecallLevel !==
                                                              'off' &&
                                                            !revealedNodeIds[
                                                              lvl3Node.id
                                                            ]
                                                          ) {
                                                            setRevealedNodeIds(
                                                              (prev) => ({
                                                                ...prev,
                                                                [lvl3Node.id]:
                                                                  true,
                                                              })
                                                            );
                                                          }
                                                          onSelectNode(
                                                            lvl3Node.id
                                                          );
                                                        }}
                                                        className={`rounded-lg px-2 py-1 transition-colors cursor-pointer flex items-start gap-2 ${
                                                          isLvl3Selected
                                                            ? 'bg-white/15 ring-1 ring-white'
                                                            : 'hover:bg-white/[0.06]'
                                                        } ${
                                                          lvl3Blurred
                                                            ? 'blur-[5px] opacity-55 select-none'
                                                            : 'blur-0 opacity-100'
                                                        }`}
                                                      >
                                                        {/* Colored Number Circle ① ② ③ */}
                                                        <span
                                                          style={{
                                                            backgroundColor:
                                                              colTheme.badgeBg,
                                                          }}
                                                          className="w-4 h-4 rounded-full text-[10px] font-mono font-bold text-white flex items-center justify-center shrink-0 mt-0.5 shadow-xs"
                                                        >
                                                          {l3Idx + 1}
                                                        </span>

                                                        <div className="min-w-0 flex-1 text-[12px] text-[#f1f5f9] leading-snug">
                                                          {showBadges &&
                                                            lvl3Badge && (
                                                              <span
                                                                style={{
                                                                  color:
                                                                    lvl3Badge.color,
                                                                  backgroundColor:
                                                                    lvl3Badge.bgColor,
                                                                }}
                                                                className="inline-block mr-1.5 px-1.5 py-0.2 rounded text-[10px] font-semibold"
                                                              >
                                                                {lvl3Badge.dot}{' '}
                                                                {
                                                                  lvl3Badge.shortLabel
                                                                }
                                                              </span>
                                                            )}
                                                          {hasKw ? (
                                                            <>
                                                              <strong
                                                                style={{
                                                                  color:
                                                                    colTheme.keywordColor,
                                                                }}
                                                                className="font-bold"
                                                              >
                                                                {lvl3Node.label.slice(
                                                                  0,
                                                                  colonIdx + 1
                                                                )}
                                                              </strong>
                                                              <span>
                                                                {lvl3Node.label.slice(
                                                                  colonIdx + 1
                                                                )}
                                                              </span>
                                                            </>
                                                          ) : (
                                                            <span className="font-medium">
                                                              {lvl3Node.label}
                                                            </span>
                                                          )}
                                                          {lvl3Node.summary && (
                                                            <p className="text-[11px] text-[#94a3b8] mt-0.5 leading-snug">
                                                              {lvl3Node.summary}
                                                            </p>
                                                          )}
                                                        </div>
                                                      </div>

                                                      {/* Level 4 sub-bullets if any */}
                                                      {!lvl3Node.collapsed &&
                                                        lvl3Node.children &&
                                                        lvl3Node.children
                                                          .length > 0 && (
                                                          <div className="pl-6 pr-1 pt-0.5 space-y-0.5">
                                                            {lvl3Node.children.map(
                                                              (lvl4) => {
                                                                const l4Colon =
                                                                  lvl4.label.indexOf(
                                                                    ':'
                                                                  );
                                                                const l4HasKw =
                                                                  l4Colon > 0 &&
                                                                  l4Colon <= 42;
                                                                return (
                                                                  <div
                                                                    key={
                                                                      lvl4.id
                                                                    }
                                                                    onClick={(
                                                                      e
                                                                    ) => {
                                                                      e.stopPropagation();
                                                                      onSelectNode(
                                                                        lvl4.id
                                                                      );
                                                                    }}
                                                                    className="text-[11.5px] text-[#cbd5e1] leading-snug hover:text-white cursor-pointer flex items-start gap-1.5 py-0.5"
                                                                  >
                                                                    <span
                                                                      style={{
                                                                        color:
                                                                          colTheme.keywordColor,
                                                                      }}
                                                                      className="font-bold"
                                                                    >
                                                                      •
                                                                    </span>
                                                                    <span>
                                                                      {l4HasKw ? (
                                                                        <>
                                                                          <strong
                                                                            style={{
                                                                              color:
                                                                                colTheme.keywordColor,
                                                                            }}
                                                                            className="font-semibold"
                                                                          >
                                                                            {lvl4.label.slice(
                                                                              0,
                                                                              l4Colon +
                                                                                1
                                                                            )}
                                                                          </strong>
                                                                          {lvl4.label.slice(
                                                                            l4Colon +
                                                                              1
                                                                          )}
                                                                        </>
                                                                      ) : (
                                                                        lvl4.label
                                                                      )}
                                                                    </span>
                                                                  </div>
                                                                );
                                                              }
                                                            )}
                                                          </div>
                                                        )}
                                                    </div>
                                                  );
                                                }
                                              )}
                                            </div>
                                          )}

                                          {/* Active Recall Quick Mastery Actions */}
                                          {activeRecallLevel !== 'off' && (
                                            <div className="opacity-0 group-hover:opacity-100 absolute -top-2.5 right-4 flex items-center gap-1 bg-[#131314] border border-[#3c4043] rounded-md px-1.5 py-0.5 shadow-lg transition-opacity z-10">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onSetNodeMastery(
                                                    lvl2Node.id,
                                                    'mastered'
                                                  );
                                                }}
                                                title="Đánh dấu: Đã nhớ"
                                                className={`p-0.5 rounded hover:bg-[#10b981]/20 ${
                                                  lvl2Node.mastery ===
                                                  'mastered'
                                                    ? 'text-[#10b981]'
                                                    : 'text-[#9aa0a6]'
                                                }`}
                                              >
                                                <Check className="w-3 h-3" />
                                              </button>
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  onSetNodeMastery(
                                                    lvl2Node.id,
                                                    'review'
                                                  );
                                                }}
                                                title="Đánh dấu: Cần ôn lại"
                                                className={`p-0.5 rounded hover:bg-[#f59e0b]/20 ${
                                                  lvl2Node.mastery === 'review'
                                                    ? 'text-[#f59e0b]'
                                                    : 'text-[#9aa0a6]'
                                                }`}
                                              >
                                                <RotateCcw className="w-3 h-3" />
                                              </button>
                                            </div>
                                          )}

                                          {/* Quick Add Child on Level 2 */}
                                          {!isReadOnly && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                onQuickAddChild(lvl2Node.id);
                                              }}
                                              title="Thêm ý Cấp 3"
                                              className="opacity-0 group-hover:opacity-100 absolute -bottom-2 right-2.5 w-4.5 h-4.5 rounded-full bg-[#131314] hover:bg-white text-white hover:text-[#131314] border border-white/50 flex items-center justify-center transition-all shadow z-10"
                                            >
                                              <Plus className="w-2.5 h-2.5" />
                                            </button>
                                          )}

                                          {/* Collapse / Expand Level 3 bullets inside Level 2 */}
                                          {lvl2HasChildren && (
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleNodeToggleCollapse(
                                                  lvl2Node.id
                                                );
                                              }}
                                              title={
                                                lvl2Node.collapsed
                                                  ? `Mở ${lvl2DirectCount} ý chi tiết`
                                                  : `Thu gọn ${lvl2DirectCount} ý chi tiết`
                                              }
                                              className="absolute right-8 -bottom-2.5 h-5 px-1.5 rounded-full bg-[#131314] border border-white/40 text-white flex items-center justify-center gap-0.5 transition-all shadow-md cursor-pointer z-10"
                                            >
                                              {lvl2Node.collapsed ? (
                                                <>
                                                  <span className="text-[10px] font-mono font-bold text-[#93c5fd] pl-0.5">
                                                    +{lvl2DirectCount}
                                                  </span>
                                                  <ChevronDown className="w-3 h-3" />
                                                </>
                                              ) : (
                                                <ChevronUp className="w-3 h-3" />
                                              )}
                                            </button>
                                          )}
                                        </div>
                                      </React.Fragment>
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
              })()}
            </div>
          ) : (
            /* ================================================================= */
            /* MODE 1: INTERACTIVE HORIZONTAL TREE STAGE                         */
            /* ================================================================= */
            <div
              style={{
                transform: `translate3d(${transform.x}px, ${transform.y}px, 0) scale(${transform.scale})`,
                transformOrigin: '0 0',
                width: layout.totalWidth,
                height: layout.totalHeight,
              }}
              className="relative pointer-events-auto"
            >
              {/* SVG SMOOTH CONNECTOR LAYER */}
              <svg
                width={layout.totalWidth}
                height={layout.totalHeight}
                className="absolute inset-0 pointer-events-none overflow-visible"
              >
                {layout.edges.map((edge) => {
                  const dx = Math.max(24, (edge.endX - edge.startX) * 0.5);
                  const pathData = `M ${edge.startX} ${edge.startY} C ${
                    edge.startX + dx
                  } ${edge.startY}, ${edge.endX - dx} ${edge.endY}, ${
                    edge.endX
                  } ${edge.endY}`;

                  const strokeColor =
                    edge.depth === 1 ? '#8ab4f8' : edge.accentColor || '#8ab4f8';
                  const strokeWidth =
                    edge.depth === 1 ? 2 : edge.depth === 2 ? 1.6 : 1.4;
                  const strokeOpacity =
                    edge.depth === 1 ? 0.88 : edge.depth === 2 ? 0.72 : 0.58;

                  return (
                    <g key={edge.id}>
                      <path
                        d={pathData}
                        fill="none"
                        stroke={strokeColor}
                        strokeWidth={strokeWidth}
                        strokeOpacity={strokeOpacity}
                        strokeLinecap="round"
                      />
                      <circle
                        cx={edge.endX}
                        cy={edge.endY}
                        r={2.2}
                        fill={strokeColor}
                        fillOpacity={0.9}
                      />
                    </g>
                  );
                })}
              </svg>

              {/* CLEAN MINIMALIST NODE CARDS LAYER */}
              {layout.nodes.map((item) => {
                const {
                  node,
                  depth,
                  pillarIndex,
                  x,
                  y,
                  width,
                  height,
                  directChildrenCount,
                } = item;
                const isSelected = selectedNodeId === node.id;
                const hasChildren = directChildrenCount > 0;
                const hasClinicalNotes = hasNodeClinicalNotes(node);
                const blurred = isNodeDepthBlurred(node.id, depth);
                const badgeMeta = node.badge
                  ? SEMANTIC_BADGE_CONFIG[node.badge]
                  : null;
                const showPillarNum =
                  depth === 1 &&
                  pillarIndex !== undefined &&
                  !hasLeadingNumberPrefix(node.label);

                let containerClasses = '';
                let labelClasses = '';
                let inlineBorderStyle: React.CSSProperties = {};

                if (depth === 0) {
                  containerClasses =
                    'bg-[#3f3c5c] hover:bg-[#49456b] rounded-[12px] shadow-xl';
                  labelClasses =
                    'font-display font-bold text-[15.5px] text-white leading-snug';
                  inlineBorderStyle = {
                    border: isSelected
                      ? '2px solid #ffffff'
                      : '2px solid #8ab4f8',
                  };
                } else if (depth === 1) {
                  containerClasses =
                    'bg-[#2d2e30] hover:bg-[#35373a] rounded-[10px] shadow-md';
                  labelClasses =
                    'font-display font-semibold text-[14px] text-white leading-snug';
                  inlineBorderStyle = {
                    borderTop: isSelected
                      ? '2px solid #8ab4f8'
                      : '1px solid #4b5056',
                    borderRight: isSelected
                      ? '2px solid #8ab4f8'
                      : '1px solid #4b5056',
                    borderBottom: isSelected
                      ? '2px solid #8ab4f8'
                      : '1px solid #4b5056',
                    borderLeft: `4px solid ${node.accentColor || '#8ab4f8'}`,
                  };
                } else if (depth === 2) {
                  containerClasses =
                    'bg-[#242528] hover:bg-[#2d2f33] rounded-[10px] shadow-sm';
                  labelClasses =
                    'font-display font-semibold text-[13px] text-[#f1f3f4] leading-snug';
                  inlineBorderStyle = {
                    borderTop: isSelected
                      ? '1.5px solid #8ab4f8'
                      : '1px solid #3c4043',
                    borderRight: isSelected
                      ? '1.5px solid #8ab4f8'
                      : '1px solid #3c4043',
                    borderBottom: isSelected
                      ? '1.5px solid #8ab4f8'
                      : '1px solid #3c4043',
                    borderLeft: badgeMeta
                      ? `3.5px solid ${badgeMeta.color}`
                      : isSelected
                      ? '2px solid #8ab4f8'
                      : `3px solid ${node.accentColor || '#4b5056'}`,
                  };
                } else {
                  containerClasses =
                    'bg-[#1b1c1f] hover:bg-[#242529] rounded-[9px] shadow-sm';
                  labelClasses =
                    'font-medium text-[12.5px] text-[#e8eaed] leading-snug';
                  inlineBorderStyle = {
                    borderTop: isSelected
                      ? '1.5px solid #8ab4f8'
                      : '1px solid #3c4043',
                    borderRight: isSelected
                      ? '1.5px solid #8ab4f8'
                      : '1px solid #3c4043',
                    borderBottom: isSelected
                      ? '1.5px solid #8ab4f8'
                      : '1px solid #3c4043',
                    borderLeft: badgeMeta
                      ? `3.5px solid ${badgeMeta.color}`
                      : isSelected
                      ? '2px solid #8ab4f8'
                      : '1px solid #3c4043',
                  };
                }

                return (
                  <div
                    key={node.id}
                    data-mindmap-node="true"
                    style={{
                      left: x,
                      top: y,
                      width,
                      minHeight: height,
                      ...inlineBorderStyle,
                    }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (
                        activeRecallLevel !== 'off' &&
                        !revealedNodeIds[node.id]
                      ) {
                        setRevealedNodeIds((prev) => ({
                          ...prev,
                          [node.id]: true,
                        }));
                      }
                      onSelectNode(node.id);
                    }}
                    className={`group absolute px-3 py-2 flex flex-col justify-center transition-colors cursor-pointer select-none ${containerClasses}`}
                  >
                    {/* Optional Semantic Badge Chip (ONLY shown when user toggles "🏷️ Hiện nhãn" ON) */}
                    {showBadges && badgeMeta && depth >= 2 && (
                      <div className="mb-1">
                        <span
                          style={{
                            color: badgeMeta.color,
                            backgroundColor: badgeMeta.bgColor,
                          }}
                          className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold tracking-tight whitespace-nowrap"
                        >
                          {badgeMeta.dot} {badgeMeta.shortLabel}
                        </span>
                      </div>
                    )}

                    {/* Pure Knowledge Content Row (Title + Subtle Inline Indicators) */}
                    <div className="flex items-start justify-between gap-1.5">
                      <div
                        className={`min-w-0 flex-1 transition-all duration-150 ${
                          blurred
                            ? 'blur-[5px] opacity-55 select-none'
                            : 'blur-0 opacity-100'
                        }`}
                      >
                        <div className={labelClasses}>
                          {showPillarNum && (
                            <span
                              style={{ color: node.accentColor || '#8ab4f8' }}
                              className="font-mono font-bold mr-1"
                            >
                              {pillarIndex}.
                            </span>
                          )}
                          <span>{node.label}</span>
                        </div>

                        {node.summary && depth <= 2 && (
                          <p className="text-[11.5px] text-[#b8bdc2] mt-1 pt-1 border-t border-white/10 line-clamp-2 leading-snug">
                            {node.summary}
                          </p>
                        )}
                      </div>

                      {/* Subtle Inline Indicators (Clinical Notes icon & Mastery symbol) */}
                      {(hasClinicalNotes ||
                        node.mastery === 'mastered' ||
                        node.mastery === 'review') && (
                        <div className="flex items-center gap-1 shrink-0 pt-0.5">
                          {hasClinicalNotes && (
                            <span
                              title="Có ghi chú lâm sàng (Click để mở bảng phải)"
                              className="text-[#8ab4f8] opacity-85"
                            >
                              <BookOpen className="w-3 h-3" />
                            </span>
                          )}
                          {node.mastery === 'mastered' && (
                            <span
                              title="Đã thuộc nhánh này"
                              className="text-[11px] font-bold text-[#10b981]"
                            >
                              ✓
                            </span>
                          )}
                          {node.mastery === 'review' && (
                            <span
                              title="Cần ôn lại nhánh này"
                              className="text-[11px] font-bold text-[#f59e0b]"
                            >
                              !
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* ACTIVE RECALL QUICK MASTERY ACTIONS */}
                    {activeRecallLevel !== 'off' && depth >= 1 && (
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-2.5 right-4 flex items-center gap-1 bg-[#131314] border border-[#3c4043] rounded-md px-1.5 py-0.5 shadow-lg transition-opacity z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetNodeMastery(node.id, 'mastered');
                          }}
                          title="Đánh dấu: Đã nhớ"
                          className={`p-0.5 rounded hover:bg-[#10b981]/20 ${
                            node.mastery === 'mastered'
                              ? 'text-[#10b981]'
                              : 'text-[#9aa0a6]'
                          }`}
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSetNodeMastery(node.id, 'review');
                          }}
                          title="Đánh dấu: Cần ôn lại"
                          className={`p-0.5 rounded hover:bg-[#f59e0b]/20 ${
                            node.mastery === 'review'
                              ? 'text-[#f59e0b]'
                              : 'text-[#9aa0a6]'
                          }`}
                        >
                          <RotateCcw className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* QUICK ADD CHILD BUTTON (Owner only) */}
                    {!isReadOnly && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onQuickAddChild(node.id);
                        }}
                        title="Thêm nhánh con trực tiếp"
                        className="opacity-0 group-hover:opacity-100 absolute -bottom-2 right-2.5 w-4.5 h-4.5 rounded-full bg-[#2d2e30] hover:bg-[#8ab4f8] text-[#9aa0a6] hover:text-[#131314] border border-[#3c4043] flex items-center justify-center transition-all shadow z-10"
                      >
                        <Plus className="w-2.5 h-2.5" />
                      </button>
                    )}

                    {/* COLLAPSE / EXPAND BUTTON + DIRECT CHILDREN COUNT (+N) */}
                    {hasChildren && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNodeToggleCollapse(node.id);
                        }}
                        title={
                          node.collapsed
                            ? `Mở rộng ${directChildrenCount} nhánh con trực tiếp`
                            : `Thu gọn ${directChildrenCount} nhánh con trực tiếp`
                        }
                        className={`absolute -right-3 top-1/2 -translate-y-1/2 h-5 px-1.5 rounded-full border flex items-center justify-center gap-0.5 transition-all shadow-md cursor-pointer z-10 ${
                          node.collapsed
                            ? 'bg-[#3f3c5c] border-[#8ab4f8] text-white hover:bg-[#514d75]'
                            : 'bg-[#2d2e30] border-[#5f6368] text-[#e3e3e3] hover:bg-[#3c4043]'
                        }`}
                      >
                        {node.collapsed ? (
                          <>
                            <span className="text-[10px] font-mono font-bold text-[#8ab4f8] pl-0.5">
                              +{directChildrenCount}
                            </span>
                            <ChevronRight className="w-3 h-3" />
                          </>
                        ) : (
                          <ChevronLeft className="w-3 h-3" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
};
