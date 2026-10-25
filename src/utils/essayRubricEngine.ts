import { MindmapNode, LessonMindmap, ClinicalNote } from '../types/mindmap';
import { cleanNodeLabel } from './mindmapLayout';

/**
 * Safely convert any value (array, string, null, undefined) into a string[]
 */
function ensureStringArray(val: unknown): string[] {
  if (Array.isArray(val)) {
    return val
      .map((item) => (item == null ? '' : String(item).trim()))
      .filter(Boolean);
  }
  if (typeof val === 'string' && val.trim().length > 0) {
    return val
      .split(/[;\n]+/)
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Recursively normalize any mindmap node so `.children`, `.label`, `.summary`, and `.clinicalNotes`
 * are 100% guaranteed to be safe for rendering and array methods.
 */
export function normalizeNodeForPrint(
  rawNode: any,
  fallbackId = 'node-0'
): MindmapNode {
  if (!rawNode || typeof rawNode !== 'object') {
    return {
      id: fallbackId,
      label: 'Mục kiến thức',
      summary: '',
      children: [],
    };
  }

  const rawNotes = rawNode.clinicalNotes;
  let normalizedNotes: ClinicalNote | undefined = undefined;
  if (rawNotes && typeof rawNotes === 'object') {
    normalizedNotes = {
      redFlags: ensureStringArray(rawNotes.redFlags),
      clinicalFeatures: ensureStringArray(rawNotes.clinicalFeatures),
      treatment: ensureStringArray(rawNotes.treatment),
      pathogenesis:
        rawNotes.pathogenesis != null ? String(rawNotes.pathogenesis) : undefined,
      pearls: rawNotes.pearls != null ? String(rawNotes.pearls) : undefined,
    };
  } else if (typeof rawNotes === 'string' && rawNotes.trim()) {
    normalizedNotes = {
      pearls: rawNotes.trim(),
    };
  }

  const rawChildren = Array.isArray(rawNode?.children)
    ? rawNode.children
    : Array.isArray(rawNode?.items)
    ? rawNode.items
    : Array.isArray(rawNode?.nodes)
    ? rawNode.nodes
    : [];

  const safeId = String(rawNode?.id || fallbackId);
  const safeLabel = String(
    rawNode?.label || rawNode?.title || rawNode?.name || 'Mục kiến thức'
  );
  const safeSummary =
    rawNode?.summary != null
      ? String(rawNode.summary)
      : rawNode?.note != null
      ? String(rawNode.note)
      : '';

  return {
    ...rawNode,
    id: safeId,
    label: safeLabel,
    summary: safeSummary,
    badge: rawNode?.badge != null ? String(rawNode.badge) : undefined,
    clinicalNotes: normalizedNotes,
    children: rawChildren
      .filter((c: any) => c != null)
      .map((child: any, idx: number) =>
        normalizeNodeForPrint(child, `${safeId}-${idx + 1}`)
      ),
  };
}

/**
 * Normalize a lesson object before rendering in Print Studio:
 * - Guarantees valid `rootNode` (supports `lesson.rootNode` or legacy `lesson.root`)
 * - Guarantees valid `children: MindmapNode[]` on every node at every level
 * - Guarantees valid `id`, `title`, `systemId`, `subjectId`, `tags`
 */
export function normalizeLessonForPrint(
  rawLesson: any,
  index = 0
): LessonMindmap {
  const safeId = String(rawLesson?.id || `lesson-print-${index + 1}`);
  const safeTitle = String(
    rawLesson?.title ||
      rawLesson?.name ||
      rawLesson?.rootNode?.label ||
      rawLesson?.root?.label ||
      `Bài học ${index + 1}`
  );
  const rawRoot =
    rawLesson?.rootNode ||
    rawLesson?.root || {
      id: `${safeId}-root`,
      label: safeTitle,
      summary: '',
      children: [],
    };

  const normalizedRoot = normalizeNodeForPrint(rawRoot, `${safeId}-root`);
  if (!normalizedRoot.label || normalizedRoot.label === 'Mục kiến thức') {
    normalizedRoot.label = safeTitle;
  }

  return {
    id: safeId,
    title: safeTitle,
    systemId: String(rawLesson?.systemId || 'sys-default'),
    subjectId: String(rawLesson?.subjectId || 'sub-default'),
    updatedAt: String(rawLesson?.updatedAt || new Date().toISOString()),
    status:
      rawLesson?.status === 'mastered' ||
      rawLesson?.status === 'review_needed' ||
      rawLesson?.status === 'learning'
        ? rawLesson.status
        : 'learning',
    tags: Array.isArray(rawLesson?.tags)
      ? rawLesson.tags.map((t: any) => String(t))
      : [],
    rootNode: normalizedRoot,
  };
}

export type RubricGradeStatus = 'full' | 'half' | 'missed' | 'ungraded';

export interface RubricCriterionItem {
  id: string;
  nodeId: string;
  pillarIndex: number;
  pillarLabel: string;
  code: string;
  title: string;
  standardContent: string;
  subPoints: string[];
  requiredKeywords: string[];
  allocatedPoints: number; // Always a clean multiple of 0.25 (e.g., 0.25, 0.5, 0.75, 1.0)
  semanticBadge?: string;
}

export interface RubricEvaluationRow {
  criterion: RubricCriterionItem;
  matchedKeywords: string[];
  missingKeywords: string[];
  autoSuggestedStatus: RubricGradeStatus;
}

export interface OutlineTargetItem {
  id: string;
  nodeId: string;
  level: 1 | 2;
  code: string;
  title: string;
  summary?: string;
  coreKeywords: string[];
}

export interface ClozeSegment {
  type: 'text' | 'blank';
  text: string;
  blankId?: string;
  hint?: string;
}

export interface ClozeLineItem {
  id: string;
  nodeId: string;
  level: 2 | 3 | 4;
  code: string;
  segments: ClozeSegment[];
}

export interface ClozePillarGroup {
  pillarId: string;
  pillarCode: string;
  pillarTitle: string;
  lines: ClozeLineItem[];
}

export interface MissedRubricItemRecord {
  criterionId: string;
  nodeId: string;
  lessonId: string;
  lessonTitle: string;
  code: string;
  title: string;
  standardContent: string;
  requiredKeywords: string[];
  missedCount: number;
  lastMissedAt: string;
}

export interface EssayExamHistoryRecord {
  id: string;
  lessonId: string;
  lessonTitle: string;
  scopeTitle: string;
  earnedPoints: number;
  totalPoints: number;
  fullCount: number;
  halfCount: number;
  missedCount: number;
  createdAt: string;
}

const VIETNAMESE_STOPWORDS = new Set([
  'của',
  'và',
  'các',
  'những',
  'trong',
  'trên',
  'dưới',
  'theo',
  'hoặc',
  'như',
  'với',
  'được',
  'không',
  'làm',
  'cho',
  'khi',
  'tại',
  'về',
  'từ',
  'đến',
  'này',
  'đó',
  'một',
  'hai',
  'ba',
  'có',
  'là',
  'do',
  'bị',
  'gồm',
  'nhiều',
  'ít',
  'rất',
  'thường',
  'hay',
  'gây',
  'ra',
  'ở',
]);

/**
 * Normalize Vietnamese string for flexible keyword matching
 */
export function normalizeViText(str: string): string {
  return String(str ?? '')
    .toLowerCase()
    .replace(/[.,/#!$%^&*;:{}=\-_`~()?"'[\]\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Strip Vietnamese diacritics for fallback matching
 */
export function removeViDiacritics(str: string): string {
  return String(str ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract high-value medical keywords from a node and its sub-points
 * Prioritizes:
 * 1. Keyword phrases before colon `:`
 * 2. Medical terms/acronyms inside parentheses `(...)`
 * 3. Quantitative thresholds or numbers (`> 2cm`, `p53`, `TNM`, `0.25`, etc.)
 * 4. Core medical phrases from the title & summary
 */
const GENERIC_NOTE_LABELS = new Set([
  'cờ đỏ',
  'lâm sàng',
  'xử trí',
  'cơ chế',
  'mẹo nhớ',
  'ghi chú',
  'ví dụ',
  'định nghĩa',
  'khái niệm',
]);

/**
 * Extract high-value medical keywords from a node's Level 3 sub-points, summary, and parentheses.
 * Strictly avoids:
 * - Repeating the Level 2 title itself
 * - Slicing/truncating words mid-string
 * - Splitting Vietnamese Unicode characters with ASCII \b regexes
 */
export function extractMedicalKeywordsFromText(
  title: string,
  summary?: string,
  subTexts: string[] = [],
  maxKeywords = 5
): string[] {
  const candidates: string[] = [];
  const cleanedTitle = cleanNodeLabel(title)
    .replace(/^[•◦▪➔\-+*\d.)\s]+/, '')
    .trim();
  const normTitle = normalizeViText(cleanedTitle);
  const titleBeforeColon =
    cleanedTitle.indexOf(':') > 1
      ? normalizeViText(cleanedTitle.slice(0, cleanedTitle.indexOf(':')))
      : '';

  const safeSubTexts = Array.isArray(subTexts) ? subTexts : [];

  // 1. Extract phrases before ':' in Level 3 / Level 4 sub-items (Highest priority in medical rubrics!)
  for (const rawSub of safeSubTexts) {
    const cleanedSub = cleanNodeLabel(rawSub)
      .replace(/^[•◦▪➔\-+*\d.)\s]+/, '')
      .trim();
    const colonIdx = cleanedSub.indexOf(':');
    if (colonIdx > 1 && colonIdx <= 60) {
      const beforeColon = cleanedSub.slice(0, colonIdx).trim();
      const normBefore = normalizeViText(beforeColon);
      if (GENERIC_NOTE_LABELS.has(normBefore)) {
        // For clinical notes like "Cờ đỏ: Sụt cân; Ho ra máu", extract the items after ':'
        const afterColon = cleanedSub.slice(colonIdx + 1).trim();
        afterColon
          .split(/[;,.—–]/)
          .map((s) => s.trim())
          .filter((s) => s.length >= 3 && s.split(/\s+/).length <= 8)
          .forEach((s) => candidates.push(s));
      } else if (beforeColon.length >= 3) {
        candidates.push(beforeColon);
      }
    } else {
      // If sub-point has ' — ' separator (from Level 3 label — Level 3 summary), take the Level 3 label
      const dashIdx = cleanedSub.indexOf(' — ');
      if (dashIdx > 2 && dashIdx <= 60) {
        candidates.push(cleanedSub.slice(0, dashIdx).trim());
      } else if (
        cleanedSub.length >= 3 &&
        cleanedSub.split(/\s+/).length <= 8
      ) {
        candidates.push(cleanedSub);
      }
    }
  }

  // 2. Extract complete terms inside genuine parentheses (...) across subTexts, summary, and title
  const allSources = [...safeSubTexts, String(summary || ''), cleanedTitle].filter(Boolean);
  for (const src of allSources) {
    const parenMatches = String(src).matchAll(/\(([^()]+)\)/g);
    for (const match of parenMatches) {
      const inner = match[1].trim();
      if (inner.length < 3 || inner.length > 65) continue;
      if (inner.includes(',') || inner.includes(';')) {
        inner
          .split(/[,;]/)
          .map((s) => s.trim())
          .filter((s) => s.length >= 3 && s.split(/\s+/).length <= 7)
          .forEach((s) => candidates.push(s));
      } else {
        candidates.push(inner);
      }
    }
  }

  // 3. Extract Unicode-safe medical acronyms (e.g., TNM, BRCA1/2, EGFR, CEA) and numeric thresholds with full Vietnamese units
  for (const src of allSources) {
    // Uppercase medical acronyms bounded by non-letters
    const acronymMatches = String(src).matchAll(
      /(?<![\p{L}\p{N}_])([A-Z]{2,}[0-9A-Za-z/-]*)(?![\p{L}\p{N}_])/gu
    );
    for (const m of acronymMatches) {
      if (m[1] && m[1].length >= 2 && m[1] !== 'II' && m[1] !== 'III' && m[1] !== 'IV') {
        candidates.push(m[1].trim());
      }
    }

    // Numeric thresholds with complete Vietnamese units
    const numUnitMatches = String(src).matchAll(
      /(?<![\p{L}\p{N}])((?:[><≥≤±]\s*)?\d+(?:[.,–-]\d+)?\s*(?:%|cm|mm|mg|mcg|g|kg|ml|lít|mmol\/l|ng\/ml|u\/l|ngày|tuần|tháng|năm|tuổi|độ|giai đoạn|lần|điểm))(?![\p{L}])/giu
    );
    for (const m of numUnitMatches) {
      if (m[1] && m[1].trim().length >= 2) {
        candidates.push(m[1].trim());
      }
    }
  }

  // 4. Extract concise complete clauses from summary or subTexts (after ':') if more keywords are needed
  for (const src of [String(summary || ''), ...safeSubTexts]) {
    if (!src) continue;
    const afterColon =
      src.indexOf(':') >= 0 ? src.slice(src.indexOf(':') + 1) : src;
    const clauses = afterColon
      .split(/[;.,—–→]/)
      .map((s) =>
        s
          .replace(/\([^()]*\)/g, '')
          .replace(/^[•◦▪➔\-+*\d.)\s]+/, '')
          .trim()
      )
      .filter((s) => {
        const wordCount = s.split(/\s+/).filter(Boolean).length;
        return s.length >= 4 && wordCount >= 2 && wordCount <= 7;
      });
    candidates.push(...clauses);
  }

  // 5. Deduplicate & filter out the Level 2 title itself so it never repeats in the keyword column
  const unique: string[] = [];
  const seen = new Set<string>();

  for (const rawCand of candidates) {
    const c = String(rawCand ?? '')
      .replace(/^[•◦▪➔\-+*\d.)\s]+/, '')
      .replace(/[.:;,]+$/, '')
      .trim();
    if (c.length < 2) continue;

    const norm = normalizeViText(c);
    if (!norm || norm.length < 2 || VIETNAMESE_STOPWORDS.has(norm)) continue;

    // Never repeat the Level 2 title itself
    if (norm === normTitle || (titleBeforeColon && norm === titleBeforeColon)) {
      continue;
    }

    if (!seen.has(norm)) {
      seen.add(norm);
      unique.push(c);
    }
    if (unique.length >= maxKeywords) break;
  }

  // Fallback only if node has zero subTexts and zero summary: split title into clean terms without slicing mid-word
  if (unique.length === 0 && cleanedTitle) {
    const parts = cleanedTitle
      .split(/[:;,–—-]| và | hoặc /)
      .map((s) => s.trim())
      .filter((s) => s.length >= 3);
    if (parts.length > 1) {
      return parts.slice(0, maxKeywords);
    }
    return [cleanedTitle];
  }

  return unique;
}

/**
 * Helper to gather clinical notes text snippets from a node safely
 * Handles arrays, strings, or undefined without ever throwing .join errors
 */
export function getClinicalNoteSnippets(node?: MindmapNode | null): string[] {
  if (!node || typeof node !== 'object') return [];
  const notes = node.clinicalNotes as any;
  if (!notes) return [];
  if (typeof notes === 'string') {
    return notes.trim() ? [`Ghi chú: ${notes.trim()}`] : [];
  }
  const list: string[] = [];
  const redFlags = ensureStringArray(notes.redFlags);
  if (redFlags.length > 0) {
    list.push(`Cờ đỏ: ${redFlags.join('; ')}`);
  }
  const clinicalFeatures = ensureStringArray(notes.clinicalFeatures);
  if (clinicalFeatures.length > 0) {
    list.push(`Lâm sàng: ${clinicalFeatures.join('; ')}`);
  }
  const treatment = ensureStringArray(notes.treatment);
  if (treatment.length > 0) {
    list.push(`Xử trí: ${treatment.join('; ')}`);
  }
  if (notes.pathogenesis != null && String(notes.pathogenesis).trim()) {
    list.push(`Cơ chế: ${String(notes.pathogenesis).trim()}`);
  }
  if (notes.pearls != null && String(notes.pearls).trim()) {
    list.push(`Mẹo nhớ: ${String(notes.pearls).trim()}`);
  }
  return list;
}

/**
 * Build Barem Rubric Criteria (0.25đ / 0.5đ increments) that sum EXACTLY to `totalPoints`
 */
export function buildMedicalRubricCriteria(
  rawRootNode: MindmapNode,
  scopeId: string, // 'all' or a Level 1 pillar ID
  totalPoints: number
): RubricCriterionItem[] {
  try {
    const rootNode = normalizeNodeForPrint(rawRootNode, 'rubric-root');
    const allPillars = Array.isArray(rootNode?.children) ? rootNode.children : [];
    const filteredPillars =
      scopeId === 'all'
        ? allPillars
        : allPillars.filter((p) => p?.id === scopeId);
    const targetPillars =
      filteredPillars.length > 0 ? filteredPillars : allPillars;

    const totalQuarters = Math.max(4, Math.round((totalPoints || 5) * 4)); // Number of 0.25đ units


  // Collect candidate items at Level 2 (and Level 3 if scope is a single pillar or few Level 2s)
  interface RawCandidate {
    nodeId: string;
    pillarIndex: number;
    pillarLabel: string;
    code: string;
    title: string;
    standardContent: string;
    subPoints: string[];
    requiredKeywords: string[];
    weightScore: number;
    semanticBadge?: string;
  }

  const level2Candidates: RawCandidate[] = [];
  const level3GranularCandidates: RawCandidate[] = [];

  targetPillars.forEach((pillar, idx) => {
    const pIdx =
      scopeId === 'all'
        ? idx + 1
        : allPillars.findIndex((p) => p.id === pillar.id) + 1 || 1;
    const pCleanLabel = cleanNodeLabel(pillar.label);
    const lvl2Nodes = pillar.children || [];

    if (lvl2Nodes.length === 0) {
      const notes = getClinicalNoteSnippets(pillar);
      const kws = extractMedicalKeywordsFromText(
        pillar.label,
        pillar.summary,
        notes,
        5
      );
      const item: RawCandidate = {
        nodeId: pillar.id,
        pillarIndex: pIdx,
        pillarLabel: pCleanLabel,
        code: `${pIdx}.1`,
        title: pCleanLabel,
        standardContent: pillar.summary || pCleanLabel,
        subPoints: notes,
        requiredKeywords: kws,
        weightScore: 2,
        semanticBadge: pillar.badge,
      };
      level2Candidates.push(item);
      level3GranularCandidates.push(item);
      return;
    }

    lvl2Nodes.forEach((lvl2, l2Idx) => {
      const l2Code = `${pIdx}.${l2Idx + 1}`;
      const l2Clean = cleanNodeLabel(lvl2.label);
      const lvl3Nodes = lvl2.children || [];
      const lvl3Texts = lvl3Nodes.map((c) => {
        const cClean = cleanNodeLabel(c.label);
        const lvl4Texts = (c.children || []).map((g) => cleanNodeLabel(g.label));
        const extra = [c.summary, ...lvl4Texts].filter(Boolean).join('; ');
        return extra ? `${cClean} — ${extra}` : cClean;
      });
      const noteSnippets = getClinicalNoteSnippets(lvl2);
      const allSubPoints = [...lvl3Texts, ...noteSnippets];

      const kws = extractMedicalKeywordsFromText(
        lvl2.label,
        lvl2.summary,
        allSubPoints,
        5
      );

      const stdParts = [l2Clean];
      if (lvl2.summary) stdParts.push(lvl2.summary);

      level2Candidates.push({
        nodeId: lvl2.id,
        pillarIndex: pIdx,
        pillarLabel: pCleanLabel,
        code: l2Code,
        title: l2Clean,
        standardContent: stdParts.join(' — '),
        subPoints: allSubPoints,
        requiredKeywords: kws,
        weightScore: Math.max(1, allSubPoints.length + (lvl2.summary ? 1 : 0)),
        semanticBadge: lvl2.badge || pillar.badge,
      });

      // Also build granular Level 3 candidates in case the user picked a single pillar or high score scale
      if (lvl3Nodes.length > 0 && scopeId !== 'all') {
        lvl3Nodes.forEach((lvl3, l3Idx) => {
          const l3Code = `${l2Code}.${l3Idx + 1}`;
          const l3Clean = cleanNodeLabel(lvl3.label);
          const lvl4Sub = (lvl3.children || []).map((g) => cleanNodeLabel(g.label));
          const l3Notes = getClinicalNoteSnippets(lvl3);
          const subPts = [...lvl4Sub, ...l3Notes];
          const l3Kws = extractMedicalKeywordsFromText(
            lvl3.label,
            lvl3.summary,
            subPts,
            4
          );
          level3GranularCandidates.push({
            nodeId: lvl3.id,
            pillarIndex: pIdx,
            pillarLabel: `${pCleanLabel} › ${l2Clean}`,
            code: l3Code,
            title: l3Clean,
            standardContent: lvl3.summary
              ? `${l3Clean} — ${lvl3.summary}`
              : l3Clean,
            subPoints: subPts,
            requiredKeywords: l3Kws,
            weightScore: Math.max(1, subPts.length + 1),
            semanticBadge: lvl3.badge || lvl2.badge,
          });
        });
      } else {
        level3GranularCandidates.push(level2Candidates[level2Candidates.length - 1]);
      }
    });
  });

  // Choose whether to use granular Level 3 rows or Level 2 rows so row count <= totalQuarters
  let chosenPool =
    scopeId !== 'all' &&
    level3GranularCandidates.length <= totalQuarters &&
    level3GranularCandidates.length > level2Candidates.length
      ? level3GranularCandidates
      : level2Candidates;

  if (chosenPool.length === 0) {
    return [];
  }

  // If chosenPool has more items than totalQuarters (e.g., 20 Level 2 nodes on a 3.0pt = 12 quarters test),
  // merge sibling items within the same pillar so count <= totalQuarters
  if (chosenPool.length > totalQuarters) {
    const mergedPool: RawCandidate[] = [];
    const groupSize = Math.ceil(chosenPool.length / totalQuarters);
    for (let i = 0; i < chosenPool.length; i += groupSize) {
      const slice = chosenPool.slice(i, i + groupSize);
      const first = slice[0];
      if (slice.length === 1) {
        mergedPool.push(first);
      } else {
        const combinedTitle = slice.map((s) => s.title).join(' & ');
        const combinedSubs = slice.flatMap((s) => [
          s.standardContent,
          ...s.subPoints,
        ]);
        const combinedKws = Array.from(
          new Set(slice.flatMap((s) => s.requiredKeywords))
        ).slice(0, 6);
        mergedPool.push({
          nodeId: first.nodeId,
          pillarIndex: first.pillarIndex,
          pillarLabel: first.pillarLabel,
          code: first.code,
          title: combinedTitle,
          standardContent: combinedTitle,
          subPoints: combinedSubs,
          requiredKeywords: combinedKws,
          weightScore: slice.reduce((acc, s) => acc + s.weightScore, 0),
          semanticBadge: first.semanticBadge,
        });
      }
    }
    chosenPool = mergedPool;
  }

  // Distribute `totalQuarters` (units of 0.25đ) across `chosenPool.length` items:
  // Step 1: Give every item at least 1 quarter (0.25đ)
  const quartersPerItem = new Array(chosenPool.length).fill(1);
  let remainingQuarters = totalQuarters - chosenPool.length;

  // Step 2: Distribute remaining quarters proportionally by weightScore
  if (remainingQuarters > 0) {
    // Sort indices by weightScore descending
    const sortedIndices = chosenPool
      .map((item, index) => ({ index, weight: item.weightScore }))
      .sort((a, b) => b.weight - a.weight);

    let ptr = 0;
    while (remainingQuarters > 0) {
      const targetIdx = sortedIndices[ptr % sortedIndices.length].index;
      quartersPerItem[targetIdx] += 1;
      remainingQuarters -= 1;
      ptr += 1;
    }
  }

    return chosenPool.map((item, idx) => ({
      id: `rubric-${item.nodeId}-${idx}`,
      nodeId: item.nodeId,
      pillarIndex: item.pillarIndex,
      pillarLabel: item.pillarLabel,
      code: item.code,
      title: item.title,
      standardContent: item.standardContent,
      subPoints: item.subPoints,
      requiredKeywords: item.requiredKeywords,
      allocatedPoints: Number((quartersPerItem[idx] * 0.25).toFixed(2)),
      semanticBadge: item.semanticBadge,
    }));
  } catch (err) {
    console.warn('buildMedicalRubricCriteria fallback due to malformed node:', err);
    return [];
  }
}

/**
 * Evaluate student's essay text against the Barem Rubric Criteria
 */
export function evaluateEssayAgainstRubric(
  essayText: string,
  criteria: RubricCriterionItem[]
): RubricEvaluationRow[] {
  const normEssay = normalizeViText(essayText);
  const noAccentEssay = removeViDiacritics(essayText);
  const hasEssayContent = normEssay.length >= 5;

  return criteria.map((criterion) => {
    const matchedKeywords: string[] = [];
    const missingKeywords: string[] = [];

    for (const kw of criterion.requiredKeywords) {
      const normKw = normalizeViText(kw);
      const noAccentKw = removeViDiacritics(kw);

      if (!hasEssayContent) {
        missingKeywords.push(kw);
        continue;
      }

      // Direct substring match or token match for multi-word medical keywords
      const isDirectMatch =
        normEssay.includes(normKw) ||
        (noAccentKw.length >= 4 && noAccentEssay.includes(noAccentKw));

      if (isDirectMatch) {
        matchedKeywords.push(kw);
      } else {
        // Check if at least 75% of significant words in a long keyword phrase appear in the essay
        const words = normKw
          .split(' ')
          .filter((w) => w.length >= 2 && !VIETNAMESE_STOPWORDS.has(w));
        if (words.length >= 3) {
          const hitWords = words.filter((w) => normEssay.includes(w));
          if (hitWords.length / words.length >= 0.75) {
            matchedKeywords.push(kw);
            continue;
          }
        }
        missingKeywords.push(kw);
      }
    }

    let autoSuggestedStatus: RubricGradeStatus = 'ungraded';
    if (hasEssayContent) {
      const totalKw = Math.max(1, criterion.requiredKeywords.length);
      const ratio = matchedKeywords.length / totalKw;
      if (ratio >= 0.6) {
        autoSuggestedStatus = 'full';
      } else if (ratio >= 0.25 || matchedKeywords.length >= 1) {
        autoSuggestedStatus = 'half';
      } else {
        autoSuggestedStatus = 'missed';
      }
    }

    return {
      criterion,
      matchedKeywords,
      missingKeywords,
      autoSuggestedStatus,
    };
  });
}

/**
 * Build Outline Target Items (Level 1 & Level 2 headings) for Mode 1: Outline Recall
 */
export function buildOutlineTargets(
  rootNode: MindmapNode,
  scopeId: string
): OutlineTargetItem[] {
  const allPillars = rootNode.children || [];
  const targetPillars =
    scopeId === 'all'
      ? allPillars
      : allPillars.filter((p) => p.id === scopeId);

  const items: OutlineTargetItem[] = [];

  targetPillars.forEach((pillar, idx) => {
    const pIdx =
      scopeId === 'all'
        ? idx + 1
        : allPillars.findIndex((p) => p.id === pillar.id) + 1 || 1;
    const pClean = cleanNodeLabel(pillar.label);

    items.push({
      id: `outline-l1-${pillar.id}`,
      nodeId: pillar.id,
      level: 1,
      code: `Mục lớn ${pIdx}`,
      title: pClean,
      summary: pillar.summary,
      coreKeywords: extractMedicalKeywordsFromText(pClean, pillar.summary, [], 3),
    });

    (pillar.children || []).forEach((lvl2, l2Idx) => {
      const l2Clean = cleanNodeLabel(lvl2.label);
      items.push({
        id: `outline-l2-${lvl2.id}`,
        nodeId: lvl2.id,
        level: 2,
        code: `${pIdx}.${l2Idx + 1}`,
        title: l2Clean,
        summary: lvl2.summary,
        coreKeywords: extractMedicalKeywordsFromText(l2Clean, lvl2.summary, [], 3),
      });
    });
  });

  return items;
}

/**
 * Convert a line of medical text into Cloze segments (`[.......]`) for Mode 2
 */
function buildClozeSegmentsForText(
  rawText: string,
  linePrefixId: string,
  difficulty: 'standard' | 'hard'
): ClozeSegment[] {
  const cleaned = cleanNodeLabel(rawText);
  const segments: ClozeSegment[] = [];

  // Pattern 1: If there is a colon ':', blank out the medical keyword before ':'
  const colonIdx = cleaned.indexOf(':');
  if (colonIdx > 1 && colonIdx <= 52) {
    const beforeColon = cleaned.slice(0, colonIdx).trim();
    const afterColon = cleaned.slice(colonIdx); // starts with ':'

    const hintWords = beforeColon
      .split(/\s+/)
      .map((w) => (w.length > 1 ? `${w[0]}..` : w))
      .join(' ');

    segments.push({
      type: 'blank',
      text: beforeColon,
      blankId: `${linePrefixId}-colon`,
      hint: hintWords,
    });

    if (difficulty === 'hard') {
      // Also blank out parenthetical terms or numbers in afterColon
      const subSegs = splitParentheticalBlanks(afterColon, `${linePrefixId}-after`);
      segments.push(...subSegs);
    } else {
      segments.push({
        type: 'text',
        text: afterColon,
      });
    }
    return segments;
  }

  // Pattern 2: If there are parenthetical medical terms (...), blank them out
  const hasParen = /\(([^()]{2,36})\)/.test(cleaned);
  if (hasParen) {
    return splitParentheticalBlanks(cleaned, `${linePrefixId}-paren`);
  }

  // Pattern 3: Fallback — blank out the core extracted keyword inside the sentence
  const kws = extractMedicalKeywordsFromText(cleaned, undefined, [], 1);
  if (kws.length > 0) {
    const targetKw = kws[0];
    const idx = cleaned.toLowerCase().indexOf(targetKw.toLowerCase());
    if (idx !== -1 && targetKw.length >= 2) {
      const before = cleaned.slice(0, idx);
      const match = cleaned.slice(idx, idx + targetKw.length);
      const after = cleaned.slice(idx + targetKw.length);
      const hintWords = match
        .split(/\s+/)
        .map((w) => (w.length > 1 ? `${w[0]}..` : w))
        .join(' ');

      if (before) segments.push({ type: 'text', text: before });
      segments.push({
        type: 'blank',
        text: match,
        blankId: `${linePrefixId}-kw`,
        hint: hintWords,
      });
      if (after) segments.push({ type: 'text', text: after });
      return segments;
    }
  }

  return [{ type: 'text', text: cleaned }];
}

function splitParentheticalBlanks(
  text: string,
  prefixId: string
): ClozeSegment[] {
  const regex = /\(([^()]{2,36})\)/g;
  const result: ClozeSegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let count = 0;

  while ((match = regex.exec(text)) !== null) {
    const fullMatch = match[0];
    const inner = match[1].trim();
    const startIdx = match.index;

    if (startIdx > lastIndex) {
      result.push({
        type: 'text',
        text: text.slice(lastIndex, startIdx) + '(',
      });
    } else {
      result.push({ type: 'text', text: '(' });
    }

    const hintWords = inner
      .split(/\s+/)
      .map((w) => (w.length > 1 ? `${w[0]}..` : w))
      .join(' ');

    result.push({
      type: 'blank',
      text: inner,
      blankId: `${prefixId}-${count}`,
      hint: hintWords,
    });

    result.push({ type: 'text', text: ')' });
    lastIndex = startIdx + fullMatch.length;
    count++;
  }

  if (lastIndex < text.length) {
    result.push({
      type: 'text',
      text: text.slice(lastIndex),
    });
  }

  return result.length > 0 ? result : [{ type: 'text', text }];
}

/**
 * Build Medical Keyword Cloze Exercise Groups for Mode 2
 */
export function buildMedicalClozeGroups(
  rootNode: MindmapNode,
  scopeId: string,
  difficulty: 'standard' | 'hard' = 'standard'
): ClozePillarGroup[] {
  const allPillars = rootNode.children || [];
  const targetPillars =
    scopeId === 'all'
      ? allPillars
      : allPillars.filter((p) => p.id === scopeId);

  return targetPillars.map((pillar, idx) => {
    const pIdx =
      scopeId === 'all'
        ? idx + 1
        : allPillars.findIndex((p) => p.id === pillar.id) + 1 || 1;
    const lines: ClozeLineItem[] = [];

    (pillar.children || []).forEach((lvl2, l2Idx) => {
      const l2Code = `${pIdx}.${l2Idx + 1}`;
      const l2Text = lvl2.summary
        ? `${cleanNodeLabel(lvl2.label)}: ${lvl2.summary}`
        : cleanNodeLabel(lvl2.label);

      lines.push({
        id: `cloze-l2-${lvl2.id}`,
        nodeId: lvl2.id,
        level: 2,
        code: l2Code,
        segments: buildClozeSegmentsForText(
          l2Text,
          `b-${lvl2.id}`,
          difficulty
        ),
      });

      (lvl2.children || []).forEach((lvl3, l3Idx) => {
        const l3Code = `${l2Code}.${l3Idx + 1}`;
        const l3Text = lvl3.summary
          ? `${cleanNodeLabel(lvl3.label)}: ${lvl3.summary}`
          : cleanNodeLabel(lvl3.label);

        lines.push({
          id: `cloze-l3-${lvl3.id}`,
          nodeId: lvl3.id,
          level: 3,
          code: l3Code,
          segments: buildClozeSegmentsForText(
            l3Text,
            `b-${lvl3.id}`,
            difficulty
          ),
        });

        (lvl3.children || []).forEach((lvl4, l4Idx) => {
          const l4Code = `${l3Code}.${l4Idx + 1}`;
          const l4Text = lvl4.summary
            ? `${cleanNodeLabel(lvl4.label)}: ${lvl4.summary}`
            : cleanNodeLabel(lvl4.label);

          lines.push({
            id: `cloze-l4-${lvl4.id}`,
            nodeId: lvl4.id,
            level: 4,
            code: l4Code,
            segments: buildClozeSegmentsForText(
              l4Text,
              `b-${lvl4.id}`,
              difficulty
            ),
          });
        });
      });
    });

    return {
      pillarId: pillar.id,
      pillarCode: `MỤC ${pIdx}`,
      pillarTitle: cleanNodeLabel(pillar.label),
      lines,
    };
  });
}

/**
 * Check if a student's typed Cloze answer matches the target medical keyword
 */
export function isClozeAnswerCorrect(
  userInput: string,
  expectedAnswer: string
): boolean {
  const normUser = normalizeViText(userInput);
  const normExpected = normalizeViText(expectedAnswer);
  if (!normUser || !normExpected) return false;
  if (normUser === normExpected) return true;

  // Also allow matching without diacritics if length >= 4 and exact word count
  const noAccUser = removeViDiacritics(userInput);
  const noAccExpected = removeViDiacritics(expectedAnswer);
  if (noAccExpected.length >= 4 && noAccUser === noAccExpected) {
    return true;
  }

  return false;
}
