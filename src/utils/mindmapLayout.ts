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
 * Checks whether a label already starts with an explicit numbering prefix (e.g. "1.", "2)", "1 -")
 * to prevent duplicate numbering like "1. 1. ..."
 */
export function hasLeadingNumberPrefix(label: string): boolean {
  return /^\s*\d+[\.\)\-:]/.test(label);
}

/**
 * Strips leading numbering or bullet characters (e.g., "1. ", "1.1. ", "I. ", "A. ", "a) ", "• ") for clean rubric/print display
 */
export function cleanNodeLabel(label: unknown): string {
  if (label === null || label === undefined) return '';
  const str = typeof label === 'string' ? label : String(label);
  if (!str) return '';
  return str
    .replace(
      /^\s*(?:(?:Mục|Phần|Ý)\s+\d+[\.\)\-:]?\s*|\d+(?:\.\d+)*[\.\)\-:]?\s*|[IVX]+[\.\)\-:]\s*|[A-Da-d][\.\)]\s+|[•◦▪➔\-+*]\s*)+/i,
      ''
    )
    .trim();
}

/**
 * Extracts explicit question/lesson number from titles like:
 * "Câu 1: ...", "Câu 13 - ...", "Bài 02: ...", "Chủ đề 5.", "10. Dị vật..."
 */
export function extractNaturalLessonNumber(title: unknown): number | null {
  if (!title) return null;
  const s = String(title).trim();
  const matchNamed = s.match(
    /^(?:câu|bài|chủ\s*đề|vấn\s*đề|chương|trạm|ca)\s*0*(\d+)\b/i
  );
  if (matchNamed) {
    return parseInt(matchNamed[1], 10);
  }
  const matchLeadingNum = s.match(/^0*(\d+)[\.\)\-:]/);
  if (matchLeadingNum) {
    return parseInt(matchLeadingNum[1], 10);
  }
  return null;
}

const viCollator = new Intl.Collator('vi', {
  numeric: true,
  sensitivity: 'base',
});

/**
 * Natural comparator for lessons so "Câu 1", "Câu 2", ..., "Câu 10", "Câu 13"
 * always sort in clean ascending order (1 -> 2 -> ... -> 13).
 */
export function compareLessonsNaturally(
  a: { title?: string; rootNode?: { label?: string } },
  b: { title?: string; rootNode?: { label?: string } }
): number {
  const titleA = String(a?.title || a?.rootNode?.label || '').trim();
  const titleB = String(b?.title || b?.rootNode?.label || '').trim();

  const numA = extractNaturalLessonNumber(titleA);
  const numB = extractNaturalLessonNumber(titleB);

  if (numA !== null && numB !== null && numA !== numB) {
    return numA - numB;
  }
  if (numA !== null && numB === null) return -1;
  if (numA === null && numB !== null) return 1;

  return viCollator.compare(titleA, titleB);
}

/**
 * Formats a lesson's display title for Print Studio headers and Table of Contents
 * WITHOUT duplicating prefixes like "BÀI 4: CÂU 10: ...".
 */
export function formatCleanLessonHeading(
  lessonTitle: unknown,
  rootLabel: unknown,
  fallbackIndex: number
): {
  fullHeading: string;
  shortBadge: string;
  cleanTopicTitle: string;
} {
  const rawTitle = String(lessonTitle || rootLabel || '').trim();
  const explicitNum = extractNaturalLessonNumber(rawTitle);

  // Check if rawTitle already starts with "Câu X", "Bài X", "Chủ đề X"
  const prefixMatch = rawTitle.match(
    /^((?:câu|bài|chủ\s*đề|vấn\s*đề|trạm)\s*\d+)\s*[\.\)\-:]?\s*(.*)$/i
  );
  if (prefixMatch) {
    const badgeRaw = prefixMatch[1].toUpperCase().replace(/\s+/g, ' ');
    const topicPart = prefixMatch[2].trim() || rawTitle;
    return {
      fullHeading: `${badgeRaw}: ${topicPart}`,
      shortBadge: badgeRaw,
      cleanTopicTitle: topicPart,
    };
  }

  // Check if rawTitle starts with "1. Topic..."
  const leadingNumMatch = rawTitle.match(/^(\d+)\s*[\.\)\-:]\s*(.+)$/);
  if (leadingNumMatch) {
    const n = parseInt(leadingNumMatch[1], 10);
    const topicPart = leadingNumMatch[2].trim();
    return {
      fullHeading: `CÂU ${n}: ${topicPart}`,
      shortBadge: `CÂU ${String(n).padStart(2, '0')}`,
      cleanTopicTitle: topicPart,
    };
  }

  const cleanTopic = cleanNodeLabel(rawTitle || rootLabel) || `Bài học ${fallbackIndex + 1}`;
  const displayNum = explicitNum ?? fallbackIndex + 1;
  return {
    fullHeading: `BÀI ${displayNum}: ${cleanTopic}`,
    shortBadge: `BÀI ${String(displayNum).padStart(2, '0')}`,
    cleanTopicTitle: cleanTopic,
  };
}

/**
 * Extracts leading outline numbers or letters from a node label (e.g. "2.1.", "1.", "A.", "I.")
 * for sorting sibling branches inside a lesson.
 */
function extractNodeOutlineOrderKey(label: unknown): number | null {
  if (!label) return null;
  const s = String(label).trim();
  const decMatch = s.match(/^(\d+)(?:\.(\d+))?(?:\.(\d+))?[\.\)\-:\s]/);
  if (decMatch) {
    const p1 = parseInt(decMatch[1], 10);
    const p2 = decMatch[2] ? parseInt(decMatch[2], 10) : 0;
    const p3 = decMatch[3] ? parseInt(decMatch[3], 10) : 0;
    return p1 * 10000 + p2 * 100 + p3;
  }
  const letterMatch = s.match(/^([A-Da-d])[\.\)]\s+/);
  if (letterMatch) {
    return letterMatch[1].toUpperCase().charCodeAt(0) - 64;
  }
  return null;
}

/**
 * Standard medical textbook section priority for Level 1 pillars
 * (Định nghĩa/Đại cương -> Dịch tễ -> Nguyên nhân/Bệnh sinh -> Giải phẫu bệnh -> Triệu chứng/Lâm sàng -> Cận lâm sàng -> Chẩn đoán -> Biến chứng -> Điều trị/Xử trí -> Tiên lượng/Phòng bệnh)
 */
function getMedicalPillarPriority(label: unknown): number {
  const s = cleanNodeLabel(label).toLowerCase();
  if (/(định nghĩa|đại cương|khái niệm|tổng quan|nhắc lại giải phẫu|sinh lý)/.test(s)) return 10;
  if (/(dịch tễ|tần suất|phân loại|thể lâm sàng)/.test(s)) return 20;
  if (/(nguyên nhân|căn nguyên|yếu tố nguy cơ|yếu tố thuận lợi|cơ chế|bệnh sinh|sinh bệnh học)/.test(s)) return 30;
  if (/(giải phẫu bệnh|tổn thương|vi thể|đại thể)/.test(s)) return 40;
  if (/(triệu chứng|lâm sàng|biểu hiện|khởi phát|toàn phát|diễn biến|thực thể|cơ năng)/.test(s)) return 50;
  if (/(cận lâm sàng|xét nghiệm|hình ảnh|x\s*quang|ct|mri|nội soi|siêu âm)/.test(s)) return 60;
  if (/(chẩn đoán|tiêu chuẩn|phân biệt)/.test(s)) return 70;
  if (/(biến chứng|hậu quả)/.test(s)) return 80;
  if (/(điều trị|xử trí|phác đồ|phẫu thuật|thuốc|nguyên tắc)/.test(s)) return 90;
  if (/(tiên lượng|phòng bệnh|dự phòng|theo dõi)/.test(s)) return 100;
  return 999;
}

/**
 * Recursively sorts a MindmapNode's children according to `mode`:
 * - 'keep': preserves exact canvas order
 * - 'natural_number': sorts siblings that have explicit numbering (1 -> 2 -> 3, 2.1 -> 2.2) while preserving relative order of unnumbered nodes
 * - 'medical_standard': sorts Level 1 pillars by standard medical textbook sequence (Định nghĩa -> Nguyên nhân -> Triệu chứng -> Chẩn đoán -> Điều trị) and sorts sub-branches by natural number
 */
export function sortMindmapTreeForPrint(
  node: MindmapNode,
  mode: 'keep' | 'natural_number' | 'medical_standard' = 'natural_number',
  depth = 0
): MindmapNode {
  if (!node || !Array.isArray(node.children) || node.children.length === 0) {
    return node;
  }

  const childrenCopy = node.children.map((child) =>
    sortMindmapTreeForPrint(child, mode, depth + 1)
  );

  if (mode === 'keep') {
    return { ...node, children: childrenCopy };
  }

  // Check if at least 2 siblings have explicit numbering
  const numberedCount = childrenCopy.filter(
    (c) => extractNodeOutlineOrderKey(c.label) !== null
  ).length;

  const sortedChildren = [...childrenCopy]
    .map((item, idx) => ({ item, idx }))
    .sort((a, b) => {
      if (mode === 'medical_standard' && depth === 0) {
        const keyA = extractNodeOutlineOrderKey(a.item.label);
        const keyB = extractNodeOutlineOrderKey(b.item.label);
        if (keyA !== null && keyB !== null && keyA !== keyB) {
          return keyA - keyB;
        }
        const prioA = getMedicalPillarPriority(a.item.label);
        const prioB = getMedicalPillarPriority(b.item.label);
        if (prioA !== prioB) {
          return prioA - prioB;
        }
      }

      if (numberedCount >= 2) {
        const keyA = extractNodeOutlineOrderKey(a.item.label);
        const keyB = extractNodeOutlineOrderKey(b.item.label);
        if (keyA !== null && keyB !== null && keyA !== keyB) {
          return keyA - keyB;
        }
      }

      return a.idx - b.idx;
    })
    .map((entry) => entry.item);

  return {
    ...node,
    children: sortedChildren,
  };
}


/**
 * Estimates node dimensions based on depth, label length, summary, and whether semantic badges are visible.
 * In 'vertical' mode, Level 3 & Level 4+ items are grouped as compact bullet items inside their Level 2 card.
 */
export function getNodeDimensions(
  node: MindmapNode,
  depth: number,
  orientation: 'horizontal' | 'vertical' = 'horizontal',
  showBadges = false
): { width: number; height: number } {
  const widthByDepthHorizontal: Record<number, number> = {
    0: 270, // Root Node
    1: 255, // Pillar Node
    2: 245, // Subgroup Node
    3: 250, // Detail Node
  };
  const widthByDepthVertical: Record<number, number> = {
    0: 310,
    1: 276,
    2: 264,
    3: 264,
  };

  const width =
    orientation === 'horizontal'
      ? widthByDepthHorizontal[depth] ?? 245
      : widthByDepthVertical[depth] ?? 264;

  const charsPerLine = depth === 0 ? 26 : depth === 1 ? 26 : depth === 2 ? 28 : 30;
  const labelLines = Math.max(1, Math.ceil(node.label.length / charsPerLine));
  const lineHeight = depth === 0 ? 22 : depth === 1 ? 20 : 18;

  // Compact px-3 py-2 padding (16px vertical padding) with no redundant meta header
  let height = 18 + labelLines * lineHeight;

  if (node.summary && depth <= 2) {
    const summaryLines = Math.min(2, Math.ceil(node.summary.length / 34));
    height += summaryLines * 16 + 8;
  }

  if (showBadges && node.badge && depth >= 2) {
    height += 20;
  }

  // In Vertical Flowchart mode, Level 3 & Level 4+ children are rendered as compact bullet items inside Level 2
  if (
    orientation === 'vertical' &&
    depth === 2 &&
    !node.collapsed &&
    node.children &&
    node.children.length > 0
  ) {
    height += 10; // top border + margin before bullet list
    const countBulletHeight = (items: MindmapNode[], subDepth: number) => {
      for (const item of items) {
        const bLines = Math.max(1, Math.ceil(item.label.length / 29));
        height += bLines * 17 + 6;
        if (showBadges && item.badge) {
          height += 16;
        }
        if (!item.collapsed && item.children && item.children.length > 0) {
          countBulletHeight(item.children, subDepth + 1);
        }
      }
    };
    countBulletHeight(node.children, 3);
  }

  const minHeight = depth === 0 ? 48 : depth === 1 ? 42 : depth === 2 ? 38 : 34;
  return { width, height: Math.max(minHeight, height) };
}

/**
 * Computes compact, non-overlapping Horizontal Hierarchical Tree coordinates (Left -> Right)
 */
export function computeHorizontalTreeLayout(
  rootNode: MindmapNode,
  showBadges = false
): {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  totalWidth: number;
  totalHeight: number;
} {
  const HORIZONTAL_GAP_BY_DEPTH: Record<number, number> = {
    0: 60,
    1: 52,
    2: 46,
    3: 42,
  };
  const VERTICAL_SIBLING_GAP = 9;
  const VERTICAL_PILLAR_GAP = 16;

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
    const { width, height } = getNodeDimensions(node, depth, 'horizontal', showBadges);
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
      const horizontalGap = HORIZONTAL_GAP_BY_DEPTH[tree.depth] ?? 42;
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

  assignCoordinates(measuredRoot, 48, 48, null, null, null, null, null);

  return {
    nodes: layoutNodes,
    edges: layoutEdges,
    totalWidth: maxRight + 100,
    totalHeight: maxBottom + 100,
  };
}

/**
 * Computes compact Vertical Flowchart Tree coordinates (Top-to-Bottom)
 * - Root Node at top center
 * - Vertical gap from Root (Level 0) to Level 1 row: 40px (36px - 44px)
 * - Horizontal gap between Level 1 columns: 14px (12px - 16px)
 * - Vertical gap between Level 2 nodes below: 9px (8px - 10px)
 * - Level 3 & Level 4+ nodes are grouped inside their parent Level 2 box as compact infographic bullet points!
 */
export function computeVerticalFlowchartLayout(
  rootNode: MindmapNode,
  showBadges = false
): {
  nodes: LayoutNode[];
  edges: LayoutEdge[];
  totalWidth: number;
  totalHeight: number;
} {
  const COLUMN_GAP = 14;
  const ROOT_TO_LEVEL1_GAP = 40;
  const VERTICAL_FLOW_GAP = 9;
  const INDENT_PER_LEVEL = 12;

  const rootDim = getNodeDimensions(rootNode, 0, 'vertical', showBadges);
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

  // Build each Level 1 Pillar as a compact vertical column (Level 1 + Level 2 cards; Level 3+ are bullets inside Level 2)
  const columns: PillarColumn[] = level1Children.map((pillar, idx) => {
    const pillarIndex = idx + 1;
    const accentColor =
      pillar.accentColor ||
      LEVEL1_PILLAR_ACCENTS[idx % LEVEL1_PILLAR_ACCENTS.length];
    const items: ColumnItem[] = [];
    let currentY = 0;
    let maxColWidth = 276;

    function traverseDownColumn(
      n: MindmapNode,
      depth: number,
      parentId: string,
      crumb: { id: string; label: string; depth: number }[]
    ) {
      const { width, height } = getNodeDimensions(n, depth, 'vertical', showBadges);
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

      // Only expand Level 1 -> Level 2 as separate flowchart boxes;
      // Level 3 & Level 4+ are rendered inside the Level 2 box as compact bullet items.
      if (depth < 2 && !isCol && n.children && n.children.length > 0) {
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

  const canvasStartX = 48;
  const rootY = 44;
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
          // Root -> Level 1 Pillar: Smooth Top-to-Bottom Bezier curve
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
          // Level 1 -> Level 2: Clean left spine connector inside the 12px indent gutter
          layoutEdges.push({
            id: `v-edge-${item.parentId}-${item.node.id}`,
            sourceId: item.parentId,
            targetId: item.node.id,
            startX: parentPos.x + 6,
            startY: parentPos.y + parentPos.height,
            endX: absX,
            endY: absY + 18,
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
    totalWidth: maxRight + 80,
    totalHeight: maxBottom + 80,
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
 * Sanitizes raw JSON text copied from external AI tools / PDFs / chat windows:
 * 1. Strips leading/trailing ```json and ``` markdown fences (and any surrounding text outside the outer { ... }).
 * 2. Replaces curly quotes (“ ”) outside string literals with standard double quotes (").
 * 3. Iterates character-by-character: if inside a string literal ("..."), replaces raw line breaks (\n, \r)
 *    or unescaped control characters (ASCII < 32) with a single space ' ' to prevent
 *    `SyntaxError: Bad control character in string literal`.
 */
export function sanitizeJsonString(rawText: string): string {
  if (!rawText) return '';

  // 1. Strip ```json ... ``` fences at both ends
  let text = rawText.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Extract outermost JSON object if extra prose was copied
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    text = text.slice(firstBrace, lastBrace + 1);
  }

  // 2 & 3. Character-by-character state machine
  let result = '';
  let inString = false;
  let isEscaped = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const code = text.charCodeAt(i);

    if (inString) {
      if (isEscaped) {
        // Previous character was a backslash '\'
        // If someone had a literal backslash followed by an actual newline, drop the newline
        if (ch === '\n' || ch === '\r') {
          result = result.slice(0, -1) + ' ';
        } else {
          result += ch;
        }
        isEscaped = false;
        continue;
      }

      if (ch === '\\') {
        isEscaped = true;
        result += ch;
        continue;
      }

      if (ch === '"' || ch === '”' || ch === '“' || ch === '‟') {
        inString = false;
        result += '"';
        continue;
      }

      // Inside a JSON string literal: replace raw line breaks (\n, \r) or any control char (ASCII < 32) with ' '
      if (ch === '\n' || ch === '\r' || code < 32) {
        // Collapse consecutive spaces when joining broken lines
        if (!result.endsWith(' ')) {
          result += ' ';
        }
        continue;
      }

      result += ch;
    } else {
      // Outside a string literal: normalize smart/curly double quotes (“ ” „ ‟) to standard '"'
      if (ch === '“' || ch === '”' || ch === '„' || ch === '‟') {
        inString = true;
        result += '"';
        continue;
      }

      if (ch === '"') {
        inString = true;
        result += ch;
        continue;
      }

      result += ch;
    }
  }

  // Also remove trailing commas before } or ] outside strings if AI generated them
  return result.replace(/,\s*([}\]])/g, '$1');
}

/**
 * Cleans and parses AI-generated JSON (strips ```json fences, sanitizes control chars, validates structure, assigns IDs)
 * Supports flexible recursive AI schemas:
 * - Root wrapper: rootNode | root | mindmap | tree | data | top-level object
 * - Title/Label: label | title | name | text | topic
 * - Subtitle/Summary: summary | subtitle | description | shortDescription
 * - Clinical notes: clinicalNotes | clinicalNote | note | notes | details | content | explanation
 * - Children array: children | subNodes | items | branches | nodes | subtopics
 */
export function parseAndValidateAIJson(rawInput: string): {
  valid: boolean;
  error?: string;
  sanitizedText?: string;
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

  const cleaned = sanitizeJsonString(rawInput);

  try {
    const parsed = JSON.parse(cleaned);

    // Find the root node candidate flexibly
    let rootCandidate: any =
      parsed.rootNode ||
      parsed.root ||
      parsed.mindmap ||
      parsed.tree ||
      parsed.data ||
      parsed;

    // If parsed has top-level children/subNodes/items/branches directly, treat parsed itself as the root node
    if (
      !rootCandidate ||
      typeof rootCandidate !== 'object' ||
      (!rootCandidate.children &&
        !rootCandidate.subNodes &&
        !rootCandidate.items &&
        !rootCandidate.branches &&
        !rootCandidate.nodes &&
        (Array.isArray(parsed.children) ||
          Array.isArray(parsed.subNodes) ||
          Array.isArray(parsed.items) ||
          Array.isArray(parsed.branches)))
    ) {
      rootCandidate = parsed;
    }

    const title = String(
      parsed.title ||
        parsed.lessonTitle ||
        rootCandidate.label ||
        rootCandidate.title ||
        rootCandidate.name ||
        rootCandidate.text ||
        'Bài học Y khoa mới'
    ).trim();

    const tags = Array.isArray(parsed.tags)
      ? parsed.tags.map((t: any) => String(t))
      : ['AI Imported'];

    if (!rootCandidate || typeof rootCandidate !== 'object') {
      return { valid: false, error: 'Cấu trúc JSON không hợp lệ: Không tìm thấy node gốc.' };
    }

    let nodeCount = 0;
    let maxDepth = 0;
    const lessonRandomSuffix = Math.random().toString(36).slice(2, 7);

    const validBadges: SemanticBadgeType[] = [
      'danger',
      'warning',
      'treatment',
      'diagnostic',
      'mechanism',
    ];

    function extractClinicalNotes(raw: any): MindmapNode['clinicalNotes'] {
      const cn = raw.clinicalNotes || raw.clinicalNote;
      const fallbackNote =
        raw.note ??
        raw.notes ??
        raw.details ??
        raw.detail ??
        raw.content ??
        raw.explanation;

      if (cn && typeof cn === 'object') {
        const redFlags = Array.isArray(cn.redFlags)
          ? cn.redFlags.map((r: any) => String(r))
          : typeof cn.redFlags === 'string' && cn.redFlags.trim()
          ? [cn.redFlags.trim()]
          : undefined;

        const markdownVal =
          cn.markdown ||
          cn.note ||
          cn.notes ||
          cn.details ||
          (typeof fallbackNote === 'string' ? fallbackNote : undefined);

        return {
          pathogenesis: cn.pathogenesis || cn.mechanism || undefined,
          clinicalFeatures: cn.clinicalFeatures || cn.symptoms || cn.clinical || undefined,
          redFlags,
          treatment: cn.treatment || cn.management || cn.therapy || undefined,
          pearls: cn.pearls || cn.clinicalPearl || cn.tip || undefined,
          markdown: markdownVal ? String(markdownVal) : undefined,
        };
      }

      if (typeof cn === 'string' && cn.trim()) {
        return { markdown: cn.trim() };
      }

      if (typeof fallbackNote === 'string' && fallbackNote.trim()) {
        return { markdown: fallbackNote.trim() };
      }

      if (Array.isArray(fallbackNote) && fallbackNote.length > 0) {
        return {
          markdown: fallbackNote.map((item: any) => `- ${String(item)}`).join('\n'),
        };
      }

      return undefined;
    }

    function extractChildrenArray(raw: any): any[] {
      const candidates = [
        raw.children,
        raw.subNodes,
        raw.subnodes,
        raw.items,
        raw.branches,
        raw.subbranches,
        raw.nodes,
        raw.subtopics,
      ];
      for (const arr of candidates) {
        if (Array.isArray(arr)) {
          return arr;
        }
      }
      return [];
    }

    function normalizeNode(raw: any, depth: number, idx: number): MindmapNode {
      nodeCount++;
      maxDepth = Math.max(maxDepth, depth);

      if (typeof raw === 'string' || typeof raw === 'number') {
        return {
          id: `node-${Date.now()}-${lessonRandomSuffix}-${nodeCount}`,
          label: String(raw).trim(),
          mastery: 'untested',
        };
      }

      const label = String(
        raw.label ||
          raw.title ||
          raw.name ||
          raw.text ||
          raw.topic ||
          (depth === 0 ? title : `Nhánh ${depth}.${idx + 1}`)
      ).trim();

      const rawBadge = String(raw.badge || raw.tag || raw.type || '').toLowerCase();
      const badge = validBadges.includes(rawBadge as SemanticBadgeType)
        ? (rawBadge as SemanticBadgeType)
        : undefined;

      const summaryVal =
        raw.summary ||
        raw.subtitle ||
        raw.description ||
        raw.shortDescription ||
        undefined;

      const childItems = extractChildrenArray(raw);

      const rawIdStr = raw.id != null ? String(raw.id).trim() : '';
      const isGenericId =
        !rawIdStr ||
        /^(root|c\d+(?:-\d+)*|node(?:-\d+)*|n\d+|item-\d+|branch-\d+|p\d+|l\d+(?:-\d+)*)$/i.test(
          rawIdStr
        );
      const uniqueNodeId = !rawIdStr
        ? `node-${Date.now()}-${lessonRandomSuffix}-${nodeCount}`
        : isGenericId
        ? `${rawIdStr}-${lessonRandomSuffix}`
        : rawIdStr;

      const normalizedChildren =
        childItems.length > 0
          ? childItems.map((c: any, cIdx: number) => normalizeNode(c, depth + 1, cIdx))
          : undefined;

      const builtNode: MindmapNode = {
        id: uniqueNodeId,
        label,
        summary: summaryVal ? String(summaryVal).trim() : undefined,
        badge,
        accentColor:
          depth === 1
            ? raw.accentColor || LEVEL1_PILLAR_ACCENTS[idx % LEVEL1_PILLAR_ACCENTS.length]
            : undefined,
        collapsed: Boolean(raw.collapsed),
        mastery: raw.mastery || 'untested',
        clinicalNotes: extractClinicalNotes(raw),
        children: normalizedChildren,
      };

      return synchronizeMindmapNode(builtNode, depth, false);
    }

    const normalizedRoot = synchronizeMindmapNode(
      normalizeNode(rootCandidate, 0, 0),
      0,
      true
    );

    return {
      valid: true,
      sanitizedText: cleaned,
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
      sanitizedText: cleaned,
      error: `Lỗi cú pháp JSON: ${err.message}. Hãy bấm "Tự động sửa & Làm sạch JSON" hoặc kiểm tra dấu ngoặc kép.`,
    };
  }
}

/**
 * Synchronizes a MindmapNode tree across all views (Diagram, Bento, Cornell, Fishbone, Print Studio, Essay Rubric):
 * 1. Removes redundant AI meta-summaries (`summary`) on Level 1 & Level 2 parent boxes that already have `children`.
 * 2. Surfaces hidden medical details from `clinicalNotes` (`clinicalFeatures`, `pathogenesis`, `treatment`, `redFlags`, `pearls`)
 *    on childless leaf nodes (depth >= 2) directly into `label` and `children` so no node ever appears as an empty heading.
 */
export function synchronizeMindmapNode(
  node: MindmapNode,
  depth = 0,
  recursive = true
): MindmapNode {
  if (!node || typeof node !== 'object') return node;

  const syncedChildren =
    recursive && Array.isArray(node.children) && node.children.length > 0
      ? node.children.map((child) => synchronizeMindmapNode(child, depth + 1, true))
      : node.children;

  const hasChildren = Array.isArray(syncedChildren) && syncedChildren.length > 0;

  // 1. For Level 1 & Level 2 parent boxes that already have children, strip redundant filler `summary`
  if (depth >= 1 && depth <= 2 && hasChildren) {
    return {
      ...node,
      summary: undefined,
      children: syncedChildren,
    };
  }

  // 2. For childless leaf nodes at depth >= 2, surface any hidden details from `clinicalNotes` or `summary`
  if (depth >= 2 && !hasChildren) {
    let nextLabel = String(node.label || '').trim();
    let nextSummary = node.summary ? String(node.summary).trim() : undefined;
    const synthesizedChildren: MindmapNode[] = [];

    const cn = node.clinicalNotes as any;
    const noteItems: { text: string; badge?: SemanticBadgeType }[] = [];

    const pushNoteText = (val: unknown, badgeType?: SemanticBadgeType) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach((v) => pushNoteText(v, badgeType));
        return;
      }
      const str = String(val).trim();
      if (!str) return;
      if (nextLabel.toLowerCase().includes(str.toLowerCase().slice(0, 28))) {
        return;
      }
      noteItems.push({ text: str, badge: badgeType || node.badge });
    };

    if (cn && typeof cn === 'object') {
      pushNoteText(cn.clinicalFeatures, node.badge || 'diagnostic');
      pushNoteText(cn.pathogenesis, node.badge || 'mechanism');
      pushNoteText(cn.treatment, node.badge || 'treatment');
      pushNoteText(cn.redFlags, 'danger');
      pushNoteText(cn.pearls, 'warning');
    }

    // Merge concise summary into label if label has no colon
    if (nextSummary && !nextLabel.includes(':')) {
      nextLabel = `${nextLabel}: ${nextSummary}`;
      nextSummary = undefined;
    }

    if (noteItems.length > 0) {
      // If label is just a bare heading without ':' (e.g., "Triệu chứng Toàn thân"), attach the first note directly after ':'
      let startIdx = 0;
      if (!nextLabel.includes(':')) {
        nextLabel = `${nextLabel}: ${noteItems[0].text}`;
        startIdx = 1;
      }

      for (let i = startIdx; i < noteItems.length; i++) {
        synthesizedChildren.push({
          id: `${node.id}-auto-${i + 1}`,
          label: noteItems[i].text,
          badge: noteItems[i].badge,
          mastery: node.mastery || 'untested',
        });
      }
    }

    return {
      ...node,
      label: nextLabel,
      summary: nextSummary,
      children: synthesizedChildren.length > 0 ? synthesizedChildren : undefined,
    };
  }

  return {
    ...node,
    children: syncedChildren,
  };
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

  const startIndex = lines[0].startsWith('#') ? 1 : 0;
  let lastHeadingLevel = 1;

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
      lastHeadingLevel = targetLevel;
      contentText = headingMatch[2];
    } else if (bulletMatch) {
      const indentSpaces = bulletMatch[1].replace(/\t/g, '  ').length;
      const indentDepth = Math.floor(indentSpaces / 2);
      targetLevel = lastHeadingLevel + 1 + indentDepth;
      contentText = bulletMatch[3];
    } else {
      targetLevel = lastHeadingLevel + 1;
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
