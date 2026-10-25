import { MindmapNode, SemanticBadgeType, LEVEL1_PILLAR_ACCENTS } from '../types/mindmap';

export interface LayoutNode {
  node: MindmapNode;
  depth: number; // 0 = Root, 1 = Pillar, 2 = Group, 3 = Detail, 4+ = Sub-detail
  pillarIndex?: number; // 1-based index for Level 1 nodes (1., 2., 3...)
  x: number;
  y: number;
  width: number;
  height: number;
  subtreeSpan: number; // Height in horizontal mode, Width in vertical mode
  parentId: string | null;
  parentX: number | null;
  parentY: number | null;
  parentWidth: number | null;
  parentHeight: number | null;
  directChildrenCount: number; // ONLY direct children count (node.children.length), never recursive
  breadcrumb: { id: string; label: string; depth: number }[];
}

export interface LayoutEdge {
  id: string;
  sourceId: string;
  targetId: string;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  depth: number;
  accentColor?: string;
}

/**
 * Counts ONLY direct children of a node (node.children.length)
 * Never recursively sums grandchildren/great-grandchildren.
 */
export function getDirectChildrenCount(node: MindmapNode): number {
  return node.children ? node.children.length : 0;
}

/**
 * Counts total nodes and mastered/review nodes for lesson mastery progress
 */
export function calculateMasteryStats(root: MindmapNode): {
  total: number;
  mastered: number;
  review: number;
  untested: number;
  percent: number;
} {
  let total = 0;
  let mastered = 0;
  let review = 0;
  let untested = 0;

  function traverse(n: MindmapNode) {
    total++;
    if (n.mastery === 'mastered') mastered++;
    else if (n.mastery === 'review') review++;
    else untested++;

    if (n.children) {
      n.children.forEach(traverse);
    }
  }

  traverse(root);
  const percent = total > 0 ? Math.round((mastered / total) * 100) : 0;
  return { total, mastered, review, untested, percent };
}

/**
 * Estimates node dimensions based on depth, label length, summary, and badge
 */
export function getNodeDimensions(
  node: MindmapNode,
  depth: number,
  orientation: 'horizontal' | 'vertical' = 'horizontal'
): { width: number; height: number } {
  const widthByDepthHorizontal: Record<number, number> = {
    0: 320, // Root Node
    1: 300, // Pillar Node
    2: 285, // Subgroup Node
    3: 305, // Detail Node with badge
  };
  const widthByDepthVertical: Record<number, number> = {
    0: 340,
    1: 295,
    2: 275,
    3: 275,
  };

  const width =
    orientation === 'horizontal'
      ? widthByDepthHorizontal[depth] ?? 295
      : widthByDepthVertical[depth] ?? 270;

  const charsPerLine = depth === 0 ? 25 : depth === 1 ? 26 : depth === 2 ? 28 : 31;
  const labelLines = Math.max(1, Math.ceil(node.label.length / charsPerLine));
  const lineHeight = depth === 0 ? 24 : depth === 1 ? 22 : 20;

  let height = 38 + labelLines * lineHeight;

  if (node.summary && depth <= 2) {
    const summaryLines = Math.min(2, Math.ceil(node.summary.length / 34));
    height += summaryLines * 17 + 14;
  }

  if (node.badge || depth >= 1) {
    height += 22;
  }

  const minHeight = depth === 0 ? 86 : depth === 1 ? 76 : depth === 2 ? 64 : 60;
  return { width, height: Math.max(minHeight, height) };
}

/**
 * Computes non-overlapping Horizontal Hierarchical Tree coordinates (Left -> Right)
 */
export function computeHorizontalTreeLayout(rootNode: MindmapNode): {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  totalWidth: number;
  totalHeight: number;
} {
  const HORIZONTAL_GAP_BY_DEPTH: Record<number, number> = {
    0: 105,
    1: 95,
    2: 85,
    3: 80,
  };
  const VERTICAL_SIBLING_GAP = 22;
  const VERTICAL_PILLAR_GAP = 36;

  interface TempTree {
    node: MindmapNode;
    depth: number;
    pillarIndex?: number;
    accentColor?: string;
    width: number;
    height: number;
    subtreeHeight: number;
    x: number;
    y: number;
    directChildrenCount: number;
    breadcrumb: { id: string; label: string; depth: number }[];
    children: TempTree[];
  }

  // Pass 1: Measure dimensions and subtree heights bottom-up
  function buildMeasuredTree(
    node: MindmapNode,
    depth: number,
    breadcrumb: { id: string; label: string; depth: number }[],
    pillarIndex?: number,
    inheritedAccent?: string
  ): TempTree {
    const { width, height } = getNodeDimensions(node, depth, 'horizontal');
    const currentCrumb = [...breadcrumb, { id: node.id, label: node.label, depth }];
    const accentColor =
      depth === 1
        ? node.accentColor ||
          LEVEL1_PILLAR_ACCENTS[(pillarIndex ? pillarIndex - 1 : 0) % LEVEL1_PILLAR_ACCENTS.length]
        : inheritedAccent;

    const directChildrenCount = getDirectChildrenCount(node);
    const isCollapsed = Boolean(node.collapsed);
    const visibleChildren = !isCollapsed && node.children ? node.children : [];

    const childTrees = visibleChildren.map((child, idx) =>
      buildMeasuredTree(
        child,
        depth + 1,
        currentCrumb,
        depth === 0 ? idx + 1 : pillarIndex,
        accentColor
      )
    );

    let childrenTotalHeight = 0;
    if (childTrees.length > 0) {
      const gap = depth === 0 ? VERTICAL_PILLAR_GAP : VERTICAL_SIBLING_GAP;
      childrenTotalHeight =
        childTrees.reduce((acc, c) => acc + c.subtreeHeight, 0) +
        gap * (childTrees.length - 1);
    }

    const subtreeHeight = Math.max(height, childrenTotalHeight);

    return {
      node,
      depth,
      pillarIndex: depth === 1 ? pillarIndex : undefined,
      accentColor,
      width,
      height,
      subtreeHeight,
      x: 0,
      y: 0,
      directChildrenCount,
      breadcrumb: currentCrumb,
      children: childTrees,
    };
  }

  const measuredRoot = buildMeasuredTree(rootNode, 0, []);

  const layoutNodes: LayoutNode[] = [];
  const layoutEdges: LayoutEdge[] = [];
  let maxRight = 0;
  let maxBottom = 0;

  // Pass 2: Assign exact (x, y) coordinates top-down
  function assignCoordinates(
    tree: TempTree,
    x: number,
    topY: number,
    parentId: string | null,
    parentX: number | null,
    parentY: number | null,
    parentWidth: number | null,
    parentHeight: number | null
  ) {
    const centerY = topY + tree.subtreeHeight / 2;
    const nodeY = centerY - tree.height / 2;

    tree.x = x;
    tree.y = nodeY;

    maxRight = Math.max(maxRight, x + tree.width);
    maxBottom = Math.max(maxBottom, nodeY + tree.height);

    layoutNodes.push({
      node: {
        ...tree.node,
        accentColor: tree.accentColor,
      },
      depth: tree.depth,
      pillarIndex: tree.pillarIndex,
      x: tree.x,
      y: tree.y,
      width: tree.width,
      height: tree.height,
      subtreeSpan: tree.subtreeHeight,
      parentId,
      parentX,
      parentY,
      parentWidth,
      parentHeight,
      directChildrenCount: tree.directChildrenCount,
      breadcrumb: tree.breadcrumb,
    });

    if (parentId !== null && parentX !== null && parentY !== null && parentWidth !== null) {
      layoutEdges.push({
        id: `edge-${parentId}-${tree.node.id}`,
        sourceId: parentId,
        targetId: tree.node.id,
        startX: parentX + parentWidth,
        startY: parentY,
        endX: tree.x,
        endY: centerY,
        depth: tree.depth,
        accentColor: tree.accentColor,
      });
    }

    if (tree.children.length > 0) {
      const gap = tree.depth === 0 ? VERTICAL_PILLAR_GAP : VERTICAL_SIBLING_GAP;
      const totalChildrenSpan =
        tree.children.reduce((acc, c) => acc + c.subtreeHeight, 0) +
        gap * (tree.children.length - 1);

      let childCurrentTopY = centerY - totalChildrenSpan / 2;
      const horizontalGap = HORIZONTAL_GAP_BY_DEPTH[tree.depth] ?? 80;
      const childX = x + tree.width + horizontalGap;

      for (const child of tree.children) {
        assignCoordinates(
          child,
          childX,
          childCurrentTopY,
          tree.node.id,
          tree.x,
          centerY,
          tree.width,
          tree.height
        );
        childCurrentTopY += child.subtreeHeight + gap;
      }
    }
  }

  assignCoordinates(measuredRoot, 60, 60, null, null, null, null, null);

  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    totalWidth: maxRight + 120,
    totalHeight: maxBottom + 120,
  };
}

/**
 * Computes Vertical Flowchart Tree coordinates (Top-to-Bottom)
 * - Root Node at top center
 * - Level 1 Pillars arranged horizontally below Root with generous spacing (64px)
 * - Level 2, 3, 4+ flow vertically downward inside each Pillar column with a dedicated left spine gutter (36px per level)
 *   so that vertical connector lines travel in the empty gutter on the left and NEVER cross over sibling cards!
 */
export function computeVerticalFlowchartLayout(rootNode: MindmapNode): {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  totalWidth: number;
  totalHeight: number;
} {
  const COLUMN_GAP = 64;
  const ROOT_TO_LEVEL1_GAP = 96;
  const VERTICAL_FLOW_GAP = 26;
  const INDENT_PER_LEVEL = 38;

  const rootDim = getNodeDimensions(rootNode, 0, 'vertical');
  const rootCrumb = [{ id: rootNode.id, label: rootNode.label, depth: 0 }];
  const rootDirectChildrenCount = getDirectChildrenCount(rootNode);
  const rootCollapsed = Boolean(rootNode.collapsed);
  const level1Children = !rootCollapsed && rootNode.children ? rootNode.children : [];

  const layoutNodes: LayoutNode[] = [];
  const layoutEdges: LayoutEdge[] = [];

  interface ColumnItem {
    node: MindmapNode;
    depth: number;
    pillarIndex: number;
    accentColor: string;
    width: number;
    height: number;
    indentOffset: number;
    relY: number;
    parentId: string;
    directChildrenCount: number;
    breadcrumb: { id: string; label: string; depth: number }[];
  }

  interface PillarColumn {
    pillarNode: MindmapNode;
    pillarIndex: number;
    accentColor: string;
    columnWidth: number;
    columnHeight: number;
    items: ColumnItem[];
  }

  // Build each Level 1 Pillar as a clean vertical flowchart column
  const columns: PillarColumn[] = level1Children.map((pillar, idx) => {
    const pillarIndex = idx + 1;
    const accentColor =
      pillar.accentColor ||
      LEVEL1_PILLAR_ACCENTS[idx % LEVEL1_PILLAR_ACCENTS.length];
    const items: ColumnItem[] = [];
    let currentY = 0;
    let maxColWidth = 320;

    function traverseDownColumn(
      n: MindmapNode,
      depth: number,
      parentId: string,
      crumb: { id: string; label: string; depth: number }[]
    ) {
      const { width, height } = getNodeDimensions(n, depth, 'vertical');
      const indentOffset = Math.max(0, (depth - 1) * INDENT_PER_LEVEL);
      const currentCrumb = [...crumb, { id: n.id, label: n.label, depth }];
      const directCount = getDirectChildrenCount(n);
      const isCol = Boolean(n.collapsed);

      items.push({
        node: { ...n, accentColor },
        depth,
        pillarIndex,
        accentColor,
        width,
        height,
        indentOffset,
        relY: currentY,
        parentId,
        directChildrenCount: directCount,
        breadcrumb: currentCrumb,
      });

      maxColWidth = Math.max(maxColWidth, indentOffset + width);
      currentY += height + VERTICAL_FLOW_GAP;

      if (!isCol && n.children && n.children.length > 0) {
        for (const child of n.children) {
          traverseDownColumn(child, depth + 1, n.id, currentCrumb);
        }
      }
    }

    traverseDownColumn(pillar, 1, rootNode.id, rootCrumb);

    return {
      pillarNode: pillar,
      pillarIndex,
      accentColor,
      columnWidth: maxColWidth,
      columnHeight: Math.max(0, currentY - VERTICAL_FLOW_GAP),
      items,
    };
  });

  const totalColumnsWidth =
    columns.length > 0
      ? columns.reduce((acc, col) => acc + col.columnWidth, 0) +
        COLUMN_GAP * (columns.length - 1)
      : rootDim.width;

  const canvasStartX = 60;
  const rootY = 50;
  const rootX = canvasStartX + Math.max(0, (totalColumnsWidth - rootDim.width) / 2);

  // Add Root Node
  layoutNodes.push({
    node: rootNode,
    depth: 0,
    x: rootX,
    y: rootY,
    width: rootDim.width,
    height: rootDim.height,
    subtreeSpan: totalColumnsWidth,
    parentId: null,
    parentX: null,
    parentY: null,
    parentWidth: null,
    parentHeight: null,
    directChildrenCount: rootDirectChildrenCount,
    breadcrumb: rootCrumb,
  });

  let currentColumnX = canvasStartX;
  const level1StartY = rootY + rootDim.height + ROOT_TO_LEVEL1_GAP;
  let maxRight = rootX + rootDim.width;
  let maxBottom = rootY + rootDim.height;

  const positionedMap: Record<
    string,
    { x: number; y: number; width: number; height: number; depth: number }
  > = {
    [rootNode.id]: {
      x: rootX,
      y: rootY,
      width: rootDim.width,
      height: rootDim.height,
      depth: 0,
    },
  };

  for (const col of columns) {
    for (const item of col.items) {
      const absX = currentColumnX + item.indentOffset;
      const absY = level1StartY + item.relY;

      positionedMap[item.node.id] = {
        x: absX,
        y: absY,
        width: item.width,
        height: item.height,
        depth: item.depth,
      };

      const parentPos = positionedMap[item.parentId];

      layoutNodes.push({
        node: item.node,
        depth: item.depth,
        pillarIndex: item.pillarIndex,
        x: absX,
        y: absY,
        width: item.width,
        height: item.height,
        subtreeSpan: col.columnWidth,
        parentId: item.parentId,
        parentX: parentPos ? parentPos.x : null,
        parentY: parentPos ? parentPos.y : null,
        parentWidth: parentPos ? parentPos.width : null,
        parentHeight: parentPos ? parentPos.height : null,
        directChildrenCount: item.directChildrenCount,
        breadcrumb: item.breadcrumb,
      });

      if (parentPos) {
        if (item.depth === 1) {
          // Root -> Level 1 Pillar: Smooth Top-to-Bottom Bezier curve from bottom center of Root to top center of Pillar
          layoutEdges.push({
            id: `v-edge-${item.parentId}-${item.node.id}`,
            sourceId: item.parentId,
            targetId: item.node.id,
            startX: parentPos.x + parentPos.width / 2,
            startY: parentPos.y + parentPos.height,
            endX: absX + item.width / 2,
            endY: absY,
            depth: item.depth,
            accentColor: item.accentColor,
          });
        } else {
          // Level 1 -> Level 2 -> Level 3+:
          // Spine drops straight down inside the empty 38px left indent gutter (startX = parentPos.x + 18)
          // Because child and all its siblings are indented by +38px to the right, this vertical line at parentPos.x + 18
          // sits completely in the empty left gutter and NEVER crosses through any sibling card!
          layoutEdges.push({
            id: `v-edge-${item.parentId}-${item.node.id}`,
            sourceId: item.parentId,
            targetId: item.node.id,
            startX: parentPos.x + 18,
            startY: parentPos.y + parentPos.height,
            endX: absX,
            endY: absY + item.height / 2,
            depth: item.depth,
            accentColor: item.accentColor,
          });
        }
      }

      maxRight = Math.max(maxRight, absX + item.width);
      maxBottom = Math.max(maxBottom, absY + item.height);
    }

    currentColumnX += col.columnWidth + COLUMN_GAP;
  }

  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    totalWidth: maxRight + 100,
    totalHeight: maxBottom + 100,
  };
}

/**
 * Sets collapsed state across the tree according to a target max visible level
 * - maxVisibleLevel = 1 ('Chỉ Cấp 1'): Level 0 is expanded (`collapsed: false`), Level 1 and deeper are collapsed (`collapsed: true`).
 * - maxVisibleLevel = 2 ('Đến Cấp 2'): Level 0 and Level 1 are expanded (`collapsed: false`), Level 2 and deeper are collapsed (`collapsed: true`).
 * - maxVisibleLevel = 3 ('Đến Cấp 3'): Level 0, 1, 2 are expanded (`collapsed: false`), Level 3 and deeper are collapsed (`collapsed: true`).
 * - maxVisibleLevel = 99 ('Mở tất cả'): Every node in the tree is expanded (`collapsed: false`).
 */
export function setTreeExpansionByLevel(
  node: MindmapNode,
  maxVisibleLevel: number,
  currentDepth = 0
): MindmapNode {
  const hasChildren = Boolean(node.children && node.children.length > 0);
  const shouldCollapse =
    maxVisibleLevel >= 99 ? false : hasChildren && currentDepth >= maxVisibleLevel;

  return {
    ...node,
    collapsed: shouldCollapse,
    children: node.children
      ? node.children.map((child) =>
          setTreeExpansionByLevel(child, maxVisibleLevel, currentDepth + 1)
        )
      : undefined,
  };
}

/**
 * Toggles collapsed state for a single node ID
 */
export function toggleNodeCollapseById(node: MindmapNode, targetId: string): MindmapNode {
  if (node.id === targetId) {
    return {
      ...node,
      collapsed: !node.collapsed,
    };
  }
  if (!node.children) return node;
  return {
    ...node,
    children: node.children.map((c) => toggleNodeCollapseById(c, targetId)),
  };
}

/**
 * Updates a specific node by ID
 */
export function updateNodeById(
  node: MindmapNode,
  targetId: string,
  updater: (n: MindmapNode) => MindmapNode
): MindmapNode {
  if (node.id === targetId) {
    return updater(node);
  }
  if (!node.children) return node;
  return {
    ...node,
    children: node.children.map((c) => updateNodeById(c, targetId, updater)),
  };
}

/**
 * Adds a child node to a specific parent node ID
 */
export function addChildNodeById(
  node: MindmapNode,
  parentId: string,
  newChild: MindmapNode
): MindmapNode {
  if (node.id === parentId) {
    return {
      ...node,
      collapsed: false,
      children: [...(node.children || []), newChild],
    };
  }
  if (!node.children) return node;
  return {
    ...node,
    children: node.children.map((c) => addChildNodeById(c, parentId, newChild)),
  };
}

/**
 * Deletes a node by ID (cannot delete root node)
 */
export function deleteNodeById(node: MindmapNode, targetId: string): MindmapNode {
  if (!node.children) return node;
  return {
    ...node,
    children: node.children
      .filter((c) => c.id !== targetId)
      .map((c) => deleteNodeById(c, targetId)),
  };
}

/**
 * Finds a node and its depth/breadcrumb by ID
 */
export function findNodeWithContext(
  root: MindmapNode,
  targetId: string,
  depth = 0,
  breadcrumb: { id: string; label: string; depth: number }[] = []
): {
  node: MindmapNode;
  depth: number;
  breadcrumb: { id: string; label: string; depth: number }[];
} | null {
  const currentCrumb = [...breadcrumb, { id: root.id, label: root.label, depth }];
  if (root.id === targetId) {
    return { node: root, depth, breadcrumb: currentCrumb };
  }
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeWithContext(child, targetId, depth + 1, currentCrumb);
      if (found) return found;
    }
  }
  return null;
}

/**
 * Cleans and parses AI-generated JSON (strips ```json fences, validates structure, assigns IDs)
 */
export function parseAndValidateAIJson(rawInput: string): {
  valid: boolean;
  error?: string;
  data?: {
    title: string;
    tags: string[];
    rootNode: MindmapNode;
    nodeCount: number;
    maxDepth: number;
  };
} {
  if (!rawInput.trim()) {
    return { valid: false, error: 'Vui lòng dán đoạn mã JSON từ AI vào ô nhập liệu.' };
  }

  let cleaned = rawInput.trim();
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned);
    let rootCandidate: any = parsed.rootNode || parsed;
    const title =
      parsed.title ||
      rootCandidate.label ||
      rootCandidate.title ||
      rootCandidate.name ||
      'Bài học Y khoa mới';
    const tags = Array.isArray(parsed.tags) ? parsed.tags : ['AI Imported'];

    if (!rootCandidate || typeof rootCandidate !== 'object') {
      return { valid: false, error: 'Cấu trúc JSON không hợp lệ: Không tìm thấy node gốc.' };
    }

    let nodeCount = 0;
    let maxDepth = 0;

    const validBadges: SemanticBadgeType[] = [
      'danger',
      'warning',
      'treatment',
      'diagnostic',
      'mechanism',
    ];

    function normalizeNode(raw: any, depth: number, idx: number): MindmapNode {
      nodeCount++;
      maxDepth = Math.max(maxDepth, depth);
      const label = String(raw.label || raw.title || raw.name || `Nhánh ${depth}.${idx + 1}`).trim();
      const badge = validBadges.includes(raw.badge) ? (raw.badge as SemanticBadgeType) : undefined;

      return {
        id: raw.id || `node-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${nodeCount}`,
        label,
        summary: raw.summary || raw.description || undefined,
        badge,
        accentColor:
          depth === 1
            ? raw.accentColor || LEVEL1_PILLAR_ACCENTS[idx % LEVEL1_PILLAR_ACCENTS.length]
            : undefined,
        collapsed: Boolean(raw.collapsed),
        mastery: raw.mastery || 'untested',
        clinicalNotes: raw.clinicalNotes
          ? {
              pathogenesis: raw.clinicalNotes.pathogenesis,
              clinicalFeatures: raw.clinicalNotes.clinicalFeatures,
              redFlags: Array.isArray(raw.clinicalNotes.redFlags)
                ? raw.clinicalNotes.redFlags
                : undefined,
              treatment: raw.clinicalNotes.treatment,
              pearls: raw.clinicalNotes.pearls,
              markdown: raw.clinicalNotes.markdown || raw.notes,
            }
          : raw.notes
          ? { markdown: String(raw.notes) }
          : undefined,
        children: Array.isArray(raw.children)
          ? raw.children.map((c: any, cIdx: number) => normalizeNode(c, depth + 1, cIdx))
          : undefined,
      };
    }

    const normalizedRoot = normalizeNode(rootCandidate, 0, 0);

    return {
      valid: true,
      data: {
        title,
        tags,
        rootNode: normalizedRoot,
        nodeCount,
        maxDepth,
      },
    };
  } catch (err: any) {
    return {
      valid: false,
      error: `Lỗi cú pháp JSON: ${err.message}. Hãy kiểm tra lại dấu ngoặc kép hoặc dấu phẩy cuối dòng.`,
    };
  }
}

/**
 * Parses hierarchical Markdown (#, ##, ###, -, *) into a 4-5 level MindmapNode tree
 */
export function parseMarkdownToMindmap(rawMarkdown: string): {
  valid: boolean;
  error?: string;
  data?: {
    title: string;
    rootNode: MindmapNode;
    nodeCount: number;
    maxDepth: number;
  };
} {
  const lines = rawMarkdown
    .split('\n')
    .map((l) => l.replace(/\r$/, ''))
    .filter((l) => l.trim().length > 0);

  if (lines.length === 0) {
    return { valid: false, error: 'Vui lòng nhập nội dung Markdown (dùng #, ##, -).' };
  }

  let nodeCounter = 0;
  let maxDepth = 0;

  function extractBadgeAndLabel(text: string): { label: string; badge?: SemanticBadgeType } {
    const badgeRegex = /\[(danger|warning|treatment|diagnostic|mechanism)\]/i;
    const match = text.match(badgeRegex);
    if (match) {
      return {
        label: text.replace(badgeRegex, '').trim(),
        badge: match[1].toLowerCase() as SemanticBadgeType,
      };
    }
    return { label: text.trim() };
  }

  const rootTitleRaw = lines[0].startsWith('#')
    ? lines[0].replace(/^#+\s*/, '')
    : 'Bài học Y khoa từ Markdown';
  const { label: rootLabel } = extractBadgeAndLabel(rootTitleRaw);

  const rootNode: MindmapNode = {
    id: `md-root-${Date.now()}`,
    label: rootLabel,
    mastery: 'untested',
    children: [],
  };
  nodeCounter = 1;

  const stack: { node: MindmapNode; level: number }[] = [{ node: rootNode, level: 0 }];

  const startIndex = lines[0].startsWith('# ') ? 1 : 0;

  for (let i = startIndex; i < lines.length; i++) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();
    if (!trimmed) continue;

    let targetLevel = 1;
    let contentText = trimmed;

    const headingMatch = trimmed.match(/^(#{1,5})\s+(.*)$/);
    const bulletMatch = rawLine.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);

    if (headingMatch) {
      const hashes = headingMatch[1].length;
      targetLevel = Math.max(1, hashes - 1);
      contentText = headingMatch[2];
    } else if (bulletMatch) {
      const indentSpaces = bulletMatch[1].replace(/\t/g, '  ').length;
      const indentDepth = Math.floor(indentSpaces / 2);
      targetLevel = 2 + indentDepth;
      contentText = bulletMatch[3];
    } else {
      targetLevel = 2;
      contentText = trimmed;
    }

    const { label, badge } = extractBadgeAndLabel(contentText);
    nodeCounter++;
    maxDepth = Math.max(maxDepth, targetLevel);

    const newNode: MindmapNode = {
      id: `md-node-${Date.now()}-${nodeCounter}`,
      label,
      badge,
      mastery: 'untested',
      children: [],
    };

    while (stack.length > 1 && stack[stack.length - 1].level >= targetLevel) {
      stack.pop();
    }

    const parentEntry = stack[stack.length - 1];
    if (!parentEntry.node.children) parentEntry.node.children = [];
    if (parentEntry.level === 0) {
      newNode.accentColor =
        LEVEL1_PILLAR_ACCENTS[parentEntry.node.children.length % LEVEL1_PILLAR_ACCENTS.length];
    }
    parentEntry.node.children.push(newNode);
    stack.push({ node: newNode, level: targetLevel });
  }

  return {
    valid: true,
    data: {
      title: rootLabel,
      rootNode,
      nodeCount: nodeCounter,
      maxDepth,
    },
  };
}
