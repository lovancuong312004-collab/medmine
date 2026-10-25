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
} from '../utils/mindmapLayout';

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
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [viewMode, setViewMode] = useState<MindmapViewMode>('horizontal');
  const [transform, setTransform] = useState({ x: 80, y: 80, scale: 0.96 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [activeLevelFilterBtn, setActiveLevelFilterBtn] = useState<number>(99);

  // Track nodes unlocked by clicking during Active Recall
  const [revealedNodeIds, setRevealedNodeIds] = useState<Record<string, boolean>>({});
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);

  const layout = useMemo(() => {
    if (viewMode === 'vertical') {
      return computeVerticalFlowchartLayout(rootNode);
    }
    return computeHorizontalTreeLayout(rootNode);
  }, [rootNode, viewMode]);

  // Reset revealed nodes when active recall level changes
  useEffect(() => {
    setRevealedNodeIds({});
  }, [activeRecallLevel, rootNode.id]);

  /**
   * Smart Fit View & Readable Zoom (92% - 96%)
   */
  const fitViewReadable = useCallback(
    (targetMode: MindmapViewMode = viewMode) => {
      if (!containerRef.current || targetMode === 'bento') return;
      const rect = containerRef.current.getBoundingClientRect();
      const rootLayoutNode = layout.nodes.find((n) => n.depth === 0);

      const targetScale = targetMode === 'horizontal' ? 0.96 : 0.92;

      if (rootLayoutNode) {
        if (targetMode === 'horizontal') {
          const rootCenterY = rootLayoutNode.y + rootLayoutNode.height / 2;
          const newX = 72;
          const newY = rect.height / 2 - rootCenterY * targetScale;
          setTransform({
            x: newX,
            y: newY,
            scale: targetScale,
          });
        } else {
          const rootCenterX = rootLayoutNode.x + rootLayoutNode.width / 2;
          const newX = Math.max(40, rect.width / 2 - rootCenterX * targetScale);
          const newY = 68;
          setTransform({
            x: newX,
            y: newY,
            scale: targetScale,
          });
        }
      } else {
        setTransform({ x: 72, y: 80, scale: 0.96 });
      }
    },
    [layout.nodes, viewMode]
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
      // In Bento Board mode, allow normal vertical scrolling unless the user is pinching (ctrlKey/metaKey)
      if (viewMode === 'bento') {
        if (e.ctrlKey || e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }

      // In Horizontal & Vertical Mindmap modes, always block browser page zoom/scroll
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      const cursorX = e.clientX - rect.left;
      const cursorY = e.clientY - rect.top;

      if (e.ctrlKey || e.metaKey) {
        // Touchpad pinch-to-zoom OR Ctrl + mouse wheel -> smooth focal zoom around cursor
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
        // Two-finger pan on touchpad (or regular scroll wheel) -> pan canvas smoothly
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
  }, [viewMode]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (viewMode === 'bento') return;
    if ((e.target as HTMLElement).closest('[data-mindmap-node="true"]')) return;
    if ((e.target as HTMLElement).closest('[data-floating-ui="true"]')) return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - transform.x, y: e.clientY - transform.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || viewMode === 'bento') return;
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
    // Clear active level filter button highlight when manually toggling individual nodes
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
            <text x="14" y="${item.height / 2 + 4}" fill="#e3e3e3" font-size="${
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

  // Recursive Nested Card Renderer for Mode 3: Medical Bento Board / Card Grid View
  const renderBentoNestedNode = (
    node: MindmapNode,
    depth: number,
    accentColor: string,
    indexPrefix: string
  ): React.ReactNode => {
    const isSelected = selectedNodeId === node.id;
    const directCount = getDirectChildrenCount(node);
    const hasChildren = directCount > 0;
    const isCollapsed = Boolean(node.collapsed);
    const badgeMeta = node.badge ? SEMANTIC_BADGE_CONFIG[node.badge] : null;
    const hasNotes = hasNodeClinicalNotes(node);
    const blurred = isNodeDepthBlurred(node.id, depth);

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
        className={`rounded-xl border transition-all cursor-pointer ${
          depth === 2
            ? 'bg-[#242528] border-[#3c4043] hover:border-[#5f6368] p-3.5 shadow-sm'
            : 'bg-[#18191b] border-[#2d2e30] hover:border-[#4b5056] p-2.5'
        } ${isSelected ? 'ring-2 ring-[#8ab4f8] border-[#8ab4f8]' : ''}`}
        style={
          badgeMeta
            ? {
                borderColor: isSelected ? '#8ab4f8' : badgeMeta.borderColor,
              }
            : undefined
        }
      >
        {/* Framed Box Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center flex-wrap gap-1.5 min-w-0">
            <span
              style={{ color: accentColor }}
              className="font-mono text-[11px] font-bold shrink-0"
            >
              {indexPrefix}
            </span>

            {badgeMeta && (
              <span
                style={{
                  color: badgeMeta.color,
                  backgroundColor: badgeMeta.bgColor,
                }}
                className="px-2 py-0.5 rounded text-[11px] font-semibold whitespace-nowrap"
              >
                {badgeMeta.dot} {badgeMeta.shortLabel}
              </span>
            )}

            {hasNotes && (
              <span
                title="Click để xem chi tiết lâm sàng bên phải"
                className="text-[11px] text-[#8ab4f8] flex items-center gap-0.5"
              >
                <BookOpen className="w-3.5 h-3.5" />
              </span>
            )}

            {node.mastery === 'mastered' && (
              <span className="text-[11px] font-semibold text-[#10b981]">✓ Đã thuộc</span>
            )}
            {node.mastery === 'review' && (
              <span className="text-[11px] font-semibold text-[#f59e0b]">! Cần ôn</span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {!isReadOnly && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickAddChild(node.id);
                }}
                title="Thêm mục con trực tiếp"
                className="w-6 h-6 rounded-lg bg-[#2d2e30] hover:bg-[#8ab4f8] text-[#9aa0a6] hover:text-[#131314] flex items-center justify-center transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
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
                    ? `Mở ${directCount} nhánh con trực tiếp`
                    : `Thu gọn ${directCount} nhánh con trực tiếp`
                }
                className={`h-6 px-2 rounded-lg border text-[11px] font-mono flex items-center gap-1 transition-colors ${
                  isCollapsed
                    ? 'bg-[#3f3c5c] border-[#8ab4f8] text-white'
                    : 'bg-[#2d2e30] border-[#4b5056] text-[#e3e3e3] hover:bg-[#3c4043]'
                }`}
              >
                {isCollapsed ? (
                  <>
                    <span className="text-[#8ab4f8] font-semibold">+{directCount}</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </>
                ) : (
                  <ChevronDown className="w-3.5 h-3.5" />
                )}
              </button>
            )}
          </div>
        </div>

        {/* Framed Box Main Content & Summary */}
        <div
          className={`mt-1.5 transition-all duration-150 ${
            blurred ? 'blur-[5px] opacity-55 select-none' : 'blur-0 opacity-100'
          }`}
        >
          <p
            className={
              depth === 2
                ? 'font-display font-semibold text-[14.5px] text-white leading-snug'
                : 'font-medium text-[13.5px] text-[#e8eaed] leading-relaxed'
            }
          >
            {node.label}
          </p>

          {node.summary && (
            <p className="mt-1.5 pt-1.5 border-t border-[#3c4043]/60 text-[12px] text-[#b0b5ba] leading-relaxed">
              {node.summary}
            </p>
          )}
        </div>

        {/* Nested Children Boxes (Level 3, Level 4+) */}
        {hasChildren && !isCollapsed && (
          <div className="mt-2.5 pl-2.5 border-l-2 border-[#3c4043] space-y-2">
            {node.children!.map((child, cIdx) =>
              renderBentoNestedNode(
                child,
                depth + 1,
                accentColor,
                `${indexPrefix}.${cIdx + 1}`
              )
            )}
          </div>
        )}
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
        viewMode === 'bento'
          ? 'cursor-default'
          : isDragging
          ? 'cursor-grabbing'
          : 'cursor-grab'
      }`}
    >
      {/* TOP BAR: 3-MODE LAYOUT SWITCHER + LEVEL CONTROLLER + ACTIVE RECALL */}
      <div
        data-floating-ui="true"
        className="absolute top-3.5 left-4 right-4 z-20 flex flex-wrap items-center justify-between gap-2.5 pointer-events-none"
      >
        <div className="flex flex-wrap items-center gap-2 pointer-events-auto">
          {/* 1. LAYOUT SWITCHER (3 VIEW MODES) */}
          <div className="flex items-center gap-1 bg-[#1e1f20]/95 backdrop-blur-md border border-[#3c4043] rounded-xl p-1 shadow-lg">
            <button
              onClick={() => setViewMode('horizontal')}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-display font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                viewMode === 'horizontal'
                  ? 'bg-[#8ab4f8] text-[#131314] shadow-sm'
                  : 'text-[#e3e3e3] hover:bg-[#2d2e30]'
              }`}
            >
              <GitCommitHorizontal className="w-4 h-4" />
              <span>Cây Ngang</span>
            </button>

            <button
              onClick={() => setViewMode('vertical')}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-display font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                viewMode === 'vertical'
                  ? 'bg-[#8ab4f8] text-[#131314] shadow-sm'
                  : 'text-[#e3e3e3] hover:bg-[#2d2e30]'
              }`}
            >
              <GitFork className="w-4 h-4 rotate-180" />
              <span>Cây Dọc (Lưu đồ)</span>
            </button>

            <button
              onClick={() => setViewMode('bento')}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-display font-semibold flex items-center gap-1.5 transition-all whitespace-nowrap cursor-pointer ${
                viewMode === 'bento'
                  ? 'bg-[#8ab4f8] text-[#131314] shadow-sm'
                  : 'text-[#e3e3e3] hover:bg-[#2d2e30]'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span>Khung Bảng Y Khoa</span>
            </button>
          </div>

          {/* 2. LEVEL FILTER BAR (Synchronized across Horizontal, Vertical, and Bento Board) */}
          <div className="flex items-center gap-1 bg-[#1e1f20]/95 backdrop-blur-md border border-[#2d2e30] rounded-xl p-1 shadow-lg">
            <span className="text-[11px] font-medium text-[#9aa0a6] px-2 whitespace-nowrap hidden xl:inline">
              Cấp độ:
            </span>
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
        </div>

        {/* Right: Active Recall Selector */}
        <div className="pointer-events-auto flex items-center gap-1.5 bg-[#1e1f20]/95 backdrop-blur-md border border-[#2d2e30] rounded-xl p-1 shadow-lg">
          <div className="flex items-center gap-1.5 px-2">
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

      {/* ===================================================================== */}
      {/* MODE 3: MEDICAL BENTO BOARD / FRAMED CARD GRID VIEW                   */}
      {/* ===================================================================== */}
      {viewMode === 'bento' ? (
        <div className="w-full h-full overflow-y-auto pt-20 pb-16 px-6 select-text">
          <div className="max-w-[1600px] mx-auto space-y-6">
            {/* Root Topic Hero Card */}
            <div
              onClick={() => onSelectNode(rootNode.id)}
              className={`p-5 rounded-2xl bg-[#3f3c5c] border-2 transition-all cursor-pointer shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
                selectedNodeId === rootNode.id ? 'border-white' : 'border-[#8ab4f8]'
              }`}
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-[#8ab4f8]">
                  <span>CHỦ ĐỀ BÀI HỌC (CẤP 0)</span>
                  <span>·</span>
                  <span>{getDirectChildrenCount(rootNode)} NHÁNH TRỤ CỘT TRỰC TIẾP</span>
                </div>
                <h1 className="font-display font-bold text-[20px] text-white">
                  {rootNode.label}
                </h1>
                {rootNode.summary && (
                  <p className="text-[13.5px] text-[#e3e3e3]/90">{rootNode.summary}</p>
                )}
              </div>

              {!isReadOnly && (
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onQuickAddChild(rootNode.id);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-display font-semibold text-[12.5px] flex items-center gap-1.5 shadow cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>+ Thêm Khung Trụ cột (Cấp 1)</span>
                  </button>
                </div>
              )}
            </div>

            {/* Framed Pillar Columns / Bento Cards for Level 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5 items-start">
              {(rootNode.children || []).map((pillar, idx) => {
                const pillarIndex = idx + 1;
                const accentColor =
                  pillar.accentColor ||
                  LEVEL1_PILLAR_ACCENTS[idx % LEVEL1_PILLAR_ACCENTS.length];
                const isSelected = selectedNodeId === pillar.id;
                const isCollapsed = Boolean(pillar.collapsed);
                const directCount = getDirectChildrenCount(pillar);
                const hasNotes = hasNodeClinicalNotes(pillar);

                return (
                  <div
                    key={pillar.id}
                    onClick={() => onSelectNode(pillar.id)}
                    style={{ borderTop: `4px solid ${accentColor}` }}
                    className={`rounded-2xl bg-[#1e1f20] border border-[#3c4043] shadow-xl overflow-hidden transition-all cursor-pointer ${
                      isSelected ? 'ring-2 ring-[#8ab4f8]' : ''
                    }`}
                  >
                    {/* Pillar Card Header */}
                    <div className="p-4 bg-[#26272b] border-b border-[#3c4043] flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            style={{
                              backgroundColor: `${accentColor}22`,
                              color: accentColor,
                              borderColor: `${accentColor}55`,
                            }}
                            className="px-2 py-0.5 rounded-md border font-mono font-bold text-[12px]"
                          >
                            KHUNG {pillarIndex}
                          </span>
                          {hasNotes && (
                            <span className="text-[11px] text-[#8ab4f8] flex items-center gap-1">
                              <BookOpen className="w-3.5 h-3.5" />
                              <span>Có ghi chú LS</span>
                            </span>
                          )}
                        </div>
                        <h3 className="font-display font-bold text-[16px] text-white leading-snug pt-0.5">
                          {pillarIndex}. {pillar.label}
                        </h3>
                        {pillar.summary && (
                          <p className="text-[12.5px] text-[#b0b5ba] leading-relaxed">
                            {pillar.summary}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {!isReadOnly && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onQuickAddChild(pillar.id);
                            }}
                            title="Thêm nhánh Cấp 2 vào khung này"
                            className="w-7 h-7 rounded-lg bg-[#2d2e30] hover:bg-[#8ab4f8] text-[#e3e3e3] hover:text-[#131314] flex items-center justify-center transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )}

                        {directCount > 0 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNodeToggleCollapse(pillar.id);
                            }}
                            title={
                              isCollapsed
                                ? `Mở ${directCount} nhánh Cấp 2 trực tiếp`
                                : `Thu gọn ${directCount} nhánh Cấp 2 trực tiếp`
                            }
                            className={`px-2.5 h-7 rounded-lg border text-[11px] font-mono flex items-center gap-1 transition-colors ${
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
                                <ChevronRight className="w-3.5 h-3.5" />
                              </>
                            ) : (
                              <ChevronUp className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Pillar Card Body: Nested Boxes for Level 2, 3, 4+ */}
                    {!isCollapsed && pillar.children && pillar.children.length > 0 ? (
                      <div className="p-4 space-y-3">
                        {pillar.children.map((sub, sIdx) =>
                          renderBentoNestedNode(
                            sub,
                            2,
                            accentColor,
                            `${pillarIndex}.${sIdx + 1}`
                          )
                        )}
                      </div>
                    ) : isCollapsed ? (
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNodeToggleCollapse(pillar.id);
                        }}
                        className="p-4 text-center text-[12.5px] text-[#9aa0a6] hover:text-white hover:bg-[#242528]/50 transition-colors"
                      >
                        Đang ẩn{' '}
                        <span className="text-[#8ab4f8] font-mono font-semibold">
                          +{directCount}
                        </span>{' '}
                        nhánh Cấp 2 trực tiếp bên trong. Click vào đây để mở rộng.
                      </div>
                    ) : (
                      <div className="p-4 text-center text-[12px] text-[#70757a]">
                        Chưa có nhánh con. Bấm dấu + để thêm.
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
        /* MODE 1 & MODE 2: INTERACTIVE HORIZONTAL TREE & VERTICAL FLOWCHART     */
        /* ===================================================================== */
        <>
          {/* NOTEBOOKLM FLOATING CONTROL DOCK (LEFT SIDE) */}
          <div
            data-floating-ui="true"
            className="absolute left-4 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1.5 bg-[#1e1f20]/95 backdrop-blur-md border border-[#2d2e30] p-1.5 rounded-2xl shadow-xl"
          >
            <button
              onClick={handleZoomIn}
              title="Phóng to (+)"
              className="w-9 h-9 rounded-xl hover:bg-[#2d2e30] text-[#e3e3e3] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
            <div className="text-[10px] font-mono font-semibold text-center text-[#8ab4f8] py-0.5 select-none">
              {Math.round(transform.scale * 100)}%
            </div>
            <button
              onClick={handleZoomOut}
              title="Thu nhỏ (-)"
              className="w-9 h-9 rounded-xl hover:bg-[#2d2e30] text-[#e3e3e3] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>

            <div className="h-[1px] bg-[#2d2e30] my-0.5" />

            <button
              onClick={() => fitViewReadable(viewMode)}
              title="Căn giữa chuẩn tỷ lệ đọc 95% (Fit View)"
              className="w-9 h-9 rounded-xl hover:bg-[#2d2e30] text-[#8ab4f8] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            <div className="h-[1px] bg-[#2d2e30] my-0.5" />

            <button
              onClick={handleExportSvgSnapshot}
              title="Tải ảnh Sơ đồ Tư duy (.SVG Vector sắc nét)"
              className="w-9 h-9 rounded-xl hover:bg-[#2d2e30] text-[#81c995] flex items-center justify-center transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4" />
            </button>

            <button
              onClick={onExportCurrentLessonJson}
              title="Tải file JSON của bài học này"
              className="w-9 h-9 rounded-xl hover:bg-[#2d2e30] text-[#c58af9] flex items-center justify-center transition-colors cursor-pointer"
            >
              <FileJson className="w-4 h-4" />
            </button>
          </div>

          {/* TRANSFORMABLE MINDMAP STAGE */}
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
                let pathData = '';
                if (viewMode === 'horizontal') {
                  const dx = Math.max(38, (edge.endX - edge.startX) * 0.5);
                  pathData = `M ${edge.startX} ${edge.startY} C ${edge.startX + dx} ${
                    edge.startY
                  }, ${edge.endX - dx} ${edge.endY}, ${edge.endX} ${edge.endY}`;
                } else {
                  if (edge.depth === 1) {
                    // Top-to-Bottom smooth Bezier from Root to Pillar
                    const dy = Math.max(36, (edge.endY - edge.startY) * 0.5);
                    pathData = `M ${edge.startX} ${edge.startY} C ${edge.startX} ${
                      edge.startY + dy
                    }, ${edge.endX} ${edge.endY - dy}, ${edge.endX} ${edge.endY}`;
                  } else {
                    // Clean rounded L-connector traveling inside the empty 38px left gutter
                    const cornerY = edge.endY;
                    pathData = `M ${edge.startX} ${edge.startY} L ${edge.startX} ${
                      cornerY - 8
                    } Q ${edge.startX} ${cornerY} ${edge.startX + 8} ${cornerY} L ${
                      edge.endX
                    } ${edge.endY}`;
                  }
                }

                const strokeColor =
                  edge.depth === 1 ? '#8ab4f8' : edge.accentColor || '#8ab4f8';
                const strokeWidth = edge.depth === 1 ? 2.4 : edge.depth === 2 ? 1.8 : 1.5;
                const strokeOpacity =
                  edge.depth === 1 ? 0.9 : edge.depth === 2 ? 0.75 : 0.6;

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
                      r={2.8}
                      fill={strokeColor}
                      fillOpacity={0.9}
                    />
                  </g>
                );
              })}
            </svg>

            {/* INTERACTIVE FRAMED NODE CARDS LAYER */}
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
              const badgeMeta = node.badge ? SEMANTIC_BADGE_CONFIG[node.badge] : null;

              let containerClasses = '';
              let labelClasses = '';
              let inlineBorderStyle: React.CSSProperties = {};

              if (depth === 0) {
                containerClasses =
                  'bg-[#3f3c5c] hover:bg-[#49456b] rounded-[14px] shadow-2xl';
                labelClasses = 'font-display font-bold text-[17px] text-white leading-snug';
                inlineBorderStyle = {
                  border: isSelected ? '2.5px solid #ffffff' : '2px solid #8ab4f8',
                };
              } else if (depth === 1) {
                containerClasses =
                  'bg-[#2d2e30] hover:bg-[#35373a] rounded-[12px] shadow-lg';
                labelClasses =
                  'font-display font-bold text-[15px] text-white leading-snug';
                inlineBorderStyle = {
                  borderTop: isSelected ? '2px solid #8ab4f8' : '1.5px solid #4b5056',
                  borderRight: isSelected ? '2px solid #8ab4f8' : '1.5px solid #4b5056',
                  borderBottom: isSelected ? '2px solid #8ab4f8' : '1.5px solid #4b5056',
                  borderLeft: `5px solid ${node.accentColor || '#8ab4f8'}`,
                };
              } else if (depth === 2) {
                containerClasses =
                  'bg-[#242528] hover:bg-[#2d2f33] rounded-[10px] shadow-md';
                labelClasses =
                  'font-display font-semibold text-[14px] text-[#f1f3f4] leading-snug';
                inlineBorderStyle = {
                  border: isSelected
                    ? '2px solid #8ab4f8'
                    : badgeMeta
                    ? `1.5px solid ${badgeMeta.borderColor}`
                    : '1.5px solid #4b5056',
                };
              } else {
                containerClasses =
                  'bg-[#1b1c1f] hover:bg-[#242529] rounded-[10px] shadow-sm';
                labelClasses =
                  'font-medium text-[13px] text-[#e8eaed] leading-relaxed';
                inlineBorderStyle = {
                  border: isSelected
                    ? '2px solid #8ab4f8'
                    : badgeMeta
                    ? `1.5px solid ${badgeMeta.borderColor}`
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
                    if (activeRecallLevel !== 'off' && !revealedNodeIds[node.id]) {
                      setRevealedNodeIds((prev) => ({ ...prev, [node.id]: true }));
                    }
                    onSelectNode(node.id);
                  }}
                  className={`group absolute px-4 py-3 flex flex-col justify-between transition-colors cursor-pointer select-none ${containerClasses}`}
                >
                  {/* CARD HEADER BAR */}
                  <div className="flex items-center justify-between gap-2 mb-1.5 pb-1 border-b border-white/10">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {depth === 0 ? (
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-[#8ab4f8]">
                          CHỦ ĐỀ GỐC · CẤP 0
                        </span>
                      ) : depth === 1 ? (
                        <span
                          style={{ color: node.accentColor || '#8ab4f8' }}
                          className="text-[11px] font-mono font-bold uppercase tracking-wider"
                        >
                          TRỤ CỘT {pillarIndex} · CẤP 1
                        </span>
                      ) : badgeMeta ? (
                        <span
                          style={{
                            color: badgeMeta.color,
                            backgroundColor: badgeMeta.bgColor,
                          }}
                          className="px-2 py-0.5 rounded text-[10.5px] font-semibold tracking-tight whitespace-nowrap"
                        >
                          {badgeMeta.dot} {badgeMeta.shortLabel}
                        </span>
                      ) : (
                        <span className="text-[10.5px] font-mono text-[#9aa0a6]">
                          Phân mục · Cấp {depth}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {hasClinicalNotes && (
                        <span
                          title="Có ghi chú lâm sàng chuyên sâu (Click để mở bảng phải)"
                          className="text-[10px] text-[#8ab4f8] bg-[#8ab4f8]/15 px-1.5 py-0.5 rounded flex items-center gap-1"
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
                  </div>

                  {/* MAIN FRAMED NODE CONTENT & SUMMARY */}
                  <div
                    className={`transition-all duration-150 ${
                      blurred
                        ? 'blur-[5px] opacity-55 select-none'
                        : 'blur-0 opacity-100'
                    }`}
                  >
                    <div className={labelClasses}>
                      {depth === 1 && pillarIndex !== undefined && (
                        <span
                          style={{ color: node.accentColor || '#8ab4f8' }}
                          className="font-mono font-bold mr-1.5"
                        >
                          {pillarIndex}.
                        </span>
                      )}
                      <span>{node.label}</span>
                    </div>

                    {node.summary && depth <= 2 && (
                      <p className="text-[12px] text-[#b8bdc2] mt-1.5 pt-1.5 border-t border-white/10 line-clamp-2 leading-snug">
                        {node.summary}
                      </p>
                    )}
                  </div>

                  {/* ACTIVE RECALL QUICK MASTERY ACTIONS */}
                  {activeRecallLevel !== 'off' && depth >= 1 && (
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-3 right-6 flex items-center gap-1 bg-[#131314] border border-[#3c4043] rounded-md px-1.5 py-0.5 shadow-lg transition-opacity z-10">
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
                      className="opacity-0 group-hover:opacity-100 absolute -bottom-2.5 right-3 w-5 h-5 rounded-full bg-[#2d2e30] hover:bg-[#8ab4f8] text-[#9aa0a6] hover:text-[#131314] border border-[#3c4043] flex items-center justify-center transition-all shadow z-10"
                    >
                      <Plus className="w-3 h-3" />
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
                      className={`absolute ${
                        viewMode === 'horizontal'
                          ? '-right-3.5 top-1/2 -translate-y-1/2'
                          : 'right-10 -bottom-3'
                      } h-6 px-1.5 rounded-full border flex items-center justify-center gap-0.5 transition-all shadow-md cursor-pointer z-10 ${
                        node.collapsed
                          ? 'bg-[#3f3c5c] border-[#8ab4f8] text-white hover:bg-[#514d75]'
                          : 'bg-[#2d2e30] border-[#5f6368] text-[#e3e3e3] hover:bg-[#3c4043]'
                      }`}
                    >
                      {node.collapsed ? (
                        <>
                          <span className="text-[10.5px] font-mono font-bold text-[#8ab4f8] pl-0.5">
                            +{directChildrenCount}
                          </span>
                          {viewMode === 'horizontal' ? (
                            <ChevronRight className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </>
                      ) : viewMode === 'horizontal' ? (
                        <ChevronLeft className="w-3.5 h-3.5" />
                      ) : (
                        <ChevronUp className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* BOTTOM VISUAL HIERARCHY & SEMANTIC BADGE LEGEND */}
      <div
        data-floating-ui="true"
        className="absolute bottom-3.5 left-4 z-20 flex flex-wrap items-center gap-2.5 bg-[#1e1f20]/95 backdrop-blur-md border border-[#2d2e30] px-3.5 py-2 rounded-xl text-[11px] text-[#9aa0a6] shadow-lg"
      >
        <span className="font-semibold text-[#e3e3e3]">Nhãn Y khoa:</span>
        <span className="text-[#ef4444]">🔴 Cờ đỏ / Cấp cứu</span>
        <span aria-hidden="true">·</span>
        <span className="text-[#f59e0b]">🟡 Lưu ý LS</span>
        <span aria-hidden="true">·</span>
        <span className="text-[#10b981]">🟢 Điều trị / Thuốc</span>
        <span aria-hidden="true">·</span>
        <span className="text-[#3b82f6]">🔵 Tiêu chuẩn / CLS</span>
        <span aria-hidden="true">·</span>
        <span className="text-[#a855f7]">🟣 Cơ chế / GPB</span>
      </div>
    </div>
  );
};
