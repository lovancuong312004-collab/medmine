import React, { useState, useEffect } from 'react';
import {
  X,
  ChevronRight,
  Edit3,
  Save,
  Plus,
  Trash2,
  AlertTriangle,
  Stethoscope,
  Pill,
  Lightbulb,
  Microscope,
  CheckCircle2,
  RotateCcw,
  Circle,
  FileText,
} from 'lucide-react';
import {
  MindmapNode,
  SemanticBadgeType,
  SEMANTIC_BADGE_CONFIG,
  NodeMasteryStatus,
  LEVEL1_PILLAR_ACCENTS,
} from '../types/mindmap';

interface ClinicalDrawerProps {
  node: MindmapNode;
  depth: number;
  breadcrumb: { id: string; label: string; depth: number }[];
  isReadOnly?: boolean;
  onClose: () => void;
  onSelectBreadcrumbNode: (nodeId: string) => void;
  onUpdateNode: (nodeId: string, updater: (n: MindmapNode) => MindmapNode) => void;
  onAddChildNode: (parentId: string, child: MindmapNode) => void;
  onDeleteNode: (nodeId: string) => void;
}

/**
 * Lightweight structured Markdown + Table + Formula renderer for medical clinical notes
 */
const ClinicalMarkdownView: React.FC<{ content: string }> = ({ content }) => {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i].trim();

    if (!line) {
      i++;
      continue;
    }

    // Markdown Table block detection
    if (line.startsWith('|') && line.endsWith('|')) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }

      const rows = tableLines
        .filter((r) => !/^\|[\s:-]+\|$/.test(r.replace(/\|/g, '|')))
        .filter((r) => !r.includes('---'))
        .map((r) =>
          r
            .slice(1, -1)
            .split('|')
            .map((cell) => cell.trim())
        );

      if (rows.length > 0) {
        const header = rows[0];
        const body = rows.slice(1);
        elements.push(
          <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-lg border border-[#3c4043]">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead>
                <tr className="bg-[#2d2e30] text-white font-semibold">
                  {header.map((h, idx) => (
                    <th key={idx} className="p-2 border-b border-[#3c4043]">
                      {h.replace(/\*\*/g, '')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d2e30] bg-[#131314]/80">
                {body.map((r, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[#242528]">
                    {r.map((c, cIdx) => (
                      <td key={cIdx} className="p-2 text-[#d2d5d9]">
                        {c.replace(/\*\*/g, '')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      continue;
    }

    // Math formula block $$ ... $$
    if (line.startsWith('$$') && line.endsWith('$$')) {
      const formula = line.slice(2, -2).trim();
      elements.push(
        <div
          key={`formula-${i}`}
          className="my-2.5 p-3 rounded-lg bg-[#131314] border border-[#3c4043] font-mono text-[12px] text-[#8ab4f8] text-center overflow-x-auto"
        >
          {formula}
        </div>
      );
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('### ')) {
      elements.push(
        <h4
          key={`h3-${i}`}
          className="font-display font-semibold text-[13px] text-white mt-3 mb-1.5"
        >
          {line.replace('### ', '')}
        </h4>
      );
      i++;
      continue;
    }

    if (line.startsWith('#### ')) {
      elements.push(
        <h5
          key={`h4-${i}`}
          className="font-display font-medium text-[12px] text-[#8ab4f8] mt-2.5 mb-1"
        >
          {line.replace('#### ', '')}
        </h5>
      );
      i++;
      continue;
    }

    // Bullet item
    if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(
        <div key={`li-${i}`} className="flex items-start gap-2 text-[12.5px] text-[#d2d5d9] my-1">
          <span className="text-[#8ab4f8] mt-0.5">•</span>
          <span>{line.slice(2).replace(/\*\*/g, '')}</span>
        </div>
      );
      i++;
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${i}`} className="text-[12.5px] text-[#d2d5d9] leading-relaxed my-1.5">
        {line.replace(/\*\*/g, '')}
      </p>
    );
    i++;
  }

  return <div>{elements}</div>;
};

export const ClinicalDrawer: React.FC<ClinicalDrawerProps> = ({
  node,
  depth,
  breadcrumb,
  isReadOnly = false,
  onClose,
  onSelectBreadcrumbNode,
  onUpdateNode,
  onAddChildNode,
  onDeleteNode,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(node.label);
  const [editSummary, setEditSummary] = useState(node.summary || '');
  const [editBadge, setEditBadge] = useState<SemanticBadgeType | ''>(node.badge || '');
  const [editAccent, setEditAccent] = useState(node.accentColor || '#8ab4f8');
  const [editPathogenesis, setEditPathogenesis] = useState(
    node.clinicalNotes?.pathogenesis || ''
  );
  const [editClinicalFeatures, setEditClinicalFeatures] = useState(
    node.clinicalNotes?.clinicalFeatures || ''
  );
  const [editRedFlags, setEditRedFlags] = useState(
    (node.clinicalNotes?.redFlags || []).join('\n')
  );
  const [editTreatment, setEditTreatment] = useState(node.clinicalNotes?.treatment || '');
  const [editPearls, setEditPearls] = useState(node.clinicalNotes?.pearls || '');
  const [editMarkdown, setEditMarkdown] = useState(node.clinicalNotes?.markdown || '');

  // Quick Add Child state
  const [newChildLabel, setNewChildLabel] = useState('');
  const [newChildBadge, setNewChildBadge] = useState<SemanticBadgeType | ''>('');

  useEffect(() => {
    setEditLabel(node.label);
    setEditSummary(node.summary || '');
    setEditBadge(node.badge || '');
    setEditAccent(node.accentColor || '#8ab4f8');
    setEditPathogenesis(node.clinicalNotes?.pathogenesis || '');
    setEditClinicalFeatures(node.clinicalNotes?.clinicalFeatures || '');
    setEditRedFlags((node.clinicalNotes?.redFlags || []).join('\n'));
    setEditTreatment(node.clinicalNotes?.treatment || '');
    setEditPearls(node.clinicalNotes?.pearls || '');
    setEditMarkdown(node.clinicalNotes?.markdown || '');
    setIsEditing(false);
  }, [
    node?.id,
    node?.label,
    node?.summary,
    node?.badge,
    node?.accentColor,
    node?.clinicalNotes,
  ]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateNode(node.id, (prev) => ({
      ...prev,
      label: editLabel.trim() || prev.label,
      summary: editSummary.trim() || undefined,
      badge: editBadge ? (editBadge as SemanticBadgeType) : undefined,
      accentColor: depth === 1 ? editAccent : prev.accentColor,
      clinicalNotes: {
        pathogenesis: editPathogenesis.trim() || undefined,
        clinicalFeatures: editClinicalFeatures.trim() || undefined,
        redFlags: editRedFlags
          .split('\n')
          .map((s) => s.trim())
          .filter(Boolean),
        treatment: editTreatment.trim() || undefined,
        pearls: editPearls.trim() || undefined,
        markdown: editMarkdown.trim() || undefined,
      },
    }));
    setIsEditing(false);
  };

  const handleAddSubbranch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChildLabel.trim()) return;
    const childNode: MindmapNode = {
      id: `node-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      label: newChildLabel.trim(),
      badge: newChildBadge ? (newChildBadge as SemanticBadgeType) : undefined,
      mastery: 'untested',
      children: [],
    };
    onAddChildNode(node.id, childNode);
    setNewChildLabel('');
    setNewChildBadge('');
  };

  const levelDescriptions: Record<number, string> = {
    0: 'Cấp 0 · Chủ đề gốc (Root Node)',
    1: 'Cấp 1 · Nhánh trụ cột (Pillar Node)',
    2: 'Cấp 2 · Nhánh phân nhóm (Subgroup)',
    3: 'Cấp 3 · Chi tiết sâu (Clinical / Molecular Detail)',
  };

  const badgeMeta = node.badge ? SEMANTIC_BADGE_CONFIG[node.badge] : null;
  const notes = node.clinicalNotes;
  const hasAnyNotes = Boolean(
    notes &&
      (notes.pathogenesis ||
        notes.clinicalFeatures ||
        notes.treatment ||
        notes.pearls ||
        notes.markdown ||
        (notes.redFlags && notes.redFlags.length > 0))
  );

  return (
    <>
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-xs md:hidden"
      />
      <aside className="fixed inset-y-0 right-0 z-50 w-[92vw] max-w-[410px] md:static md:w-[410px] h-full bg-[#1e1f20] border-l border-[#2d2e30] flex flex-col shrink-0 md:z-20 select-text shadow-2xl">
      {/* Drawer Header */}
      <div className="px-4 py-3 border-b border-[#2d2e30] flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-[#8ab4f8]" />
          <span className="font-display font-semibold text-[13px] text-white">
            Chi tiết Lâm sàng & Phân cấp
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {!isReadOnly && (
            <button
              onClick={() => setIsEditing(!isEditing)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                isEditing
                  ? 'bg-[#8ab4f8] text-[#131314] font-semibold'
                  : 'bg-[#2d2e30] text-[#e3e3e3] hover:bg-[#3c4043]'
              }`}
            >
              <Edit3 className="w-3 h-3" />
              <span>{isEditing ? 'Đang sửa' : 'Sửa Node'}</span>
            </button>
          )}
          <button
            onClick={onClose}
            title="Đóng bảng chi tiết"
            className="p-1.5 rounded-lg text-[#9aa0a6] hover:text-white hover:bg-[#2d2e30] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Hierarchical Breadcrumb Bar (Cấp 0 > Cấp 1 > Cấp 2...) */}
      <div className="px-4 py-2.5 bg-[#161718] border-b border-[#2d2e30] flex items-center flex-wrap gap-1 text-[11px]">
        {breadcrumb.map((crumb, idx) => {
          const isLast = idx === breadcrumb.length - 1;
          return (
            <React.Fragment key={crumb.id}>
              <button
                onClick={() => onSelectBreadcrumbNode(crumb.id)}
                className={`text-left transition-colors cursor-pointer ${
                  isLast
                    ? 'text-[#8ab4f8] font-semibold'
                    : 'text-[#9aa0a6] hover:text-white'
                }`}
              >
                <span className="font-mono text-[10px] opacity-75 mr-1">
                  [C{crumb.depth}]
                </span>
                <span>
                  {crumb.label.length > 26
                    ? `${crumb.label.slice(0, 26)}...`
                    : crumb.label}
                </span>
              </button>
              {!isLast && <ChevronRight className="w-3 h-3 text-[#5f6368] shrink-0" />}
            </React.Fragment>
          );
        })}
      </div>

      {/* Scrollable Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!isEditing ? (
          <>
            {/* Node Title, Level & Semantic Medical Badge */}
            <div className="p-3.5 rounded-xl bg-[#131314] border border-[#2d2e30] space-y-2">
              <div className="flex items-center justify-between gap-2 text-[11px] text-[#9aa0a6]">
                <span>{levelDescriptions[depth] || `Cấp ${depth} · Chi tiết sâu`}</span>
                {badgeMeta && (
                  <span
                    style={{
                      color: badgeMeta.color,
                      backgroundColor: badgeMeta.bgColor,
                    }}
                    className="px-2 py-0.5 rounded font-semibold"
                  >
                    {badgeMeta.dot} {badgeMeta.label}
                  </span>
                )}
              </div>

              <h2 className="font-display font-bold text-[16px] text-white leading-snug">
                {node.label}
              </h2>

              {node.summary && (
                <p className="text-[12.5px] text-[#9aa0a6] leading-relaxed">
                  {node.summary}
                </p>
              )}

              {/* Active Recall Mastery Selector for this Node */}
              <div className="pt-2 border-t border-[#2d2e30] flex items-center justify-between">
                <span className="text-[11px] text-[#9aa0a6]">Mức độ thuộc bài:</span>
                <div className="flex items-center gap-1 bg-[#1e1f20] p-1 rounded-lg border border-[#2d2e30]">
                  {(
                    [
                      { id: 'untested', label: 'Chưa ôn', icon: Circle, color: 'text-[#9aa0a6]' },
                      {
                        id: 'review',
                        label: 'Cần ôn lại',
                        icon: RotateCcw,
                        color: 'text-[#f59e0b]',
                      },
                      {
                        id: 'mastered',
                        label: 'Đã nhớ',
                        icon: CheckCircle2,
                        color: 'text-[#10b981]',
                      },
                    ] as const
                  ).map((st) => {
                    const Icon = st.icon;
                    const active = (node.mastery || 'untested') === st.id;
                    return (
                      <button
                        key={st.id}
                        onClick={() =>
                          onUpdateNode(node.id, (n) => ({ ...n, mastery: st.id }))
                        }
                        className={`px-2 py-1 rounded text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#2d2e30] text-white shadow-sm'
                            : 'text-[#70757a] hover:text-[#e3e3e3]'
                        }`}
                      >
                        <Icon className={`w-3 h-3 ${active ? st.color : ''}`} />
                        <span>{st.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Clinical Notes Sections */}
            {hasAnyNotes ? (
              <div className="space-y-3">
                {/* Red Flags Alert */}
                {notes?.redFlags && notes.redFlags.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-[#ef4444]/10 border border-[#ef4444]/35 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[12px] font-display font-semibold text-[#ef4444]">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Dấu hiệu Cờ đỏ / Cảnh báo Lâm sàng (Red Flags)</span>
                    </div>
                    <ul className="space-y-1 text-[12.5px] text-[#fca5a5]">
                      {notes.redFlags.map((flag, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="mt-0.5">🔴</span>
                          <span>{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Pathogenesis / Mechanism */}
                {notes?.pathogenesis && (
                  <div className="p-3.5 rounded-xl bg-[#131314] border border-[#2d2e30] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[12px] font-display font-semibold text-[#c58af9]">
                      <Microscope className="w-4 h-4" />
                      <span>Cơ chế Bệnh sinh & Giải phẫu bệnh</span>
                    </div>
                    <p className="text-[12.5px] text-[#d2d5d9] leading-relaxed">
                      {notes.pathogenesis}
                    </p>
                  </div>
                )}

                {/* Clinical Features & Diagnostics */}
                {notes?.clinicalFeatures && (
                  <div className="p-3.5 rounded-xl bg-[#131314] border border-[#2d2e30] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[12px] font-display font-semibold text-[#8ab4f8]">
                      <Stethoscope className="w-4 h-4" />
                      <span>Triệu chứng Lâm sàng & Cận lâm sàng</span>
                    </div>
                    <p className="text-[12.5px] text-[#d2d5d9] leading-relaxed">
                      {notes.clinicalFeatures}
                    </p>
                  </div>
                )}

                {/* Treatment & Dosage */}
                {notes?.treatment && (
                  <div className="p-3.5 rounded-xl bg-[#131314] border border-[#2d2e30] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[12px] font-display font-semibold text-[#81c995]">
                      <Pill className="w-4 h-4" />
                      <span>Phác đồ Điều trị & Liều lượng</span>
                    </div>
                    <p className="text-[12.5px] text-[#d2d5d9] leading-relaxed">
                      {notes.treatment}
                    </p>
                  </div>
                )}

                {/* Clinical Pearls */}
                {notes?.pearls && (
                  <div className="p-3.5 rounded-xl bg-[#f59e0b]/10 border border-[#f59e0b]/30 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[12px] font-display font-semibold text-[#fdd663]">
                      <Lightbulb className="w-4 h-4" />
                      <span>Ghi nhớ Lâm sàng (Clinical Pearls)</span>
                    </div>
                    <p className="text-[12.5px] text-[#fde68a] leading-relaxed">
                      {notes.pearls}
                    </p>
                  </div>
                )}

                {/* Rich Markdown (Tables, Formulas) */}
                {notes?.markdown && (
                  <div className="p-3.5 rounded-xl bg-[#131314] border border-[#2d2e30] space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[12px] font-display font-semibold text-[#e3e3e3]">
                      <FileText className="w-4 h-4 text-[#8ab4f8]" />
                      <span>Ghi chú Chuyên sâu / Bảng biểu & Công thức</span>
                    </div>
                    <ClinicalMarkdownView content={notes.markdown} />
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#131314] border border-[#2d2e30] text-center space-y-2">
                <p className="text-[12px] text-[#9aa0a6]">
                  Nhánh này chưa có ghi chú lâm sàng chuyên sâu (cơ chế, liều thuốc, bảng biểu).
                </p>
                {!isReadOnly && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-3 py-1.5 rounded-lg bg-[#2d2e30] hover:bg-[#3c4043] text-[12px] text-[#8ab4f8] font-medium transition-colors cursor-pointer"
                  >
                    + Thêm ghi chú lâm sàng & nhãn Y khoa
                  </button>
                )}
              </div>
            )}

            {/* Quick Add Sub-branch Form (Owner only) */}
            {!isReadOnly && (
              <form
                onSubmit={handleAddSubbranch}
                className="p-3.5 rounded-xl bg-[#131314] border border-[#2d2e30] space-y-2.5"
              >
                <h4 className="text-[12px] font-display font-semibold text-white flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-[#8ab4f8]" />
                  <span>Thêm nhánh con trực tiếp (Cấp {depth + 1})</span>
                </h4>

                <input
                  type="text"
                  value={newChildLabel}
                  onChange={(e) => setNewChildLabel(e.target.value)}
                  placeholder="Nhập nội dung nhánh con mới..."
                  className="w-full bg-[#1e1f20] border border-[#3c4043] focus:border-[#8ab4f8] rounded-lg px-3 py-1.5 text-[12px] text-white focus:outline-none"
                />

                <div className="flex items-center justify-between gap-2">
                  <select
                    value={newChildBadge}
                    onChange={(e) =>
                      setNewChildBadge(e.target.value as SemanticBadgeType | '')
                    }
                    className="flex-1 bg-[#1e1f20] border border-[#3c4043] rounded-lg px-2.5 py-1.5 text-[11px] text-[#e3e3e3] focus:outline-none"
                  >
                    <option value="">-- Không gắn nhãn màu --</option>
                    <option value="danger">🔴 danger (Cờ đỏ / Cấp cứu)</option>
                    <option value="warning">🟡 warning (Lưu ý lâm sàng)</option>
                    <option value="treatment">🟢 treatment (Phác đồ / Thuốc)</option>
                    <option value="diagnostic">🔵 diagnostic (Tiêu chuẩn vàng)</option>
                    <option value="mechanism">🟣 mechanism (Cơ chế / GPB)</option>
                  </select>

                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-lg bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] text-[12px] font-semibold transition-colors cursor-pointer"
                  >
                    Thêm nhánh
                  </button>
                </div>
              </form>
            )}

            {/* Delete Node Action (Owner only, not allowed for Root Node) */}
            {!isReadOnly && depth > 0 && (
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => onDeleteNode(node.id)}
                  className="px-3 py-1.5 rounded-lg bg-[#ef4444]/15 hover:bg-[#ef4444]/25 text-[#ef4444] text-[11px] font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa nhánh này và các nhánh con</span>
                </button>
              </div>
            )}
          </>
        ) : (
          /* DIRECT NODE EDITOR FORM */
          <form onSubmit={handleSaveEdit} className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-[#9aa0a6] mb-1">
                Tên hiển thị của Node (Cấp {depth})
              </label>
              <textarea
                rows={2}
                value={editLabel}
                onChange={(e) => setEditLabel(e.target.value)}
                className="w-full bg-[#131314] border border-[#3c4043] focus:border-[#8ab4f8] rounded-lg p-2.5 text-[13px] text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#9aa0a6] mb-1">
                Mô tả tóm tắt (Hiển thị dưới tên Node ở Cấp 0–2)
              </label>
              <input
                type="text"
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value)}
                placeholder="Tóm tắt ngắn gọn 1 dòng..."
                className="w-full bg-[#131314] border border-[#3c4043] focus:border-[#8ab4f8] rounded-lg px-2.5 py-1.5 text-[12px] text-white focus:outline-none"
              />
            </div>

            {/* Semantic Medical Badge Selector */}
            <div>
              <label className="block text-[11px] font-medium text-[#9aa0a6] mb-1">
                Nhãn phân loại Y khoa (Semantic Medical Badge)
              </label>
              <select
                value={editBadge}
                onChange={(e) =>
                  setEditBadge(e.target.value as SemanticBadgeType | '')
                }
                className="w-full bg-[#131314] border border-[#3c4043] rounded-lg px-2.5 py-2 text-[12px] text-white focus:outline-none"
              >
                <option value="">Không gắn nhãn</option>
                <option value="danger">
                  🔴 danger — Cờ đỏ / Cấp cứu / Chống chỉ định (#ef4444)
                </option>
                <option value="warning">
                  🟡 warning — Lưu ý lâm sàng / Biến chứng (#f59e0b)
                </option>
                <option value="treatment">
                  🟢 treatment — Phác đồ / Thuốc / Liều lượng (#10b981)
                </option>
                <option value="diagnostic">
                  🔵 diagnostic — Tiêu chuẩn vàng / Cận lâm sàng (#3b82f6)
                </option>
                <option value="mechanism">
                  🟣 mechanism — Cơ chế phân tử / Giải phẫu bệnh (#a855f7)
                </option>
              </select>
            </div>

            {/* Left Accent Color Picker for Level 1 Pillar */}
            {depth === 1 && (
              <div>
                <label className="block text-[11px] font-medium text-[#9aa0a6] mb-1">
                  Màu vạch đánh dấu trụ cột Cấp 1 (Left Accent Bar)
                </label>
                <div className="flex items-center gap-2">
                  {LEVEL1_PILLAR_ACCENTS.map((col) => (
                    <button
                      type="button"
                      key={col}
                      onClick={() => setEditAccent(col)}
                      style={{ backgroundColor: col }}
                      className={`w-6 h-6 rounded-full transition-transform ${
                        editAccent === col
                          ? 'scale-110 ring-2 ring-white'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-[11px] font-medium text-[#c58af9] mb-1">
                🟣 Cơ chế bệnh sinh & Giải phẫu bệnh
              </label>
              <textarea
                rows={2}
                value={editPathogenesis}
                onChange={(e) => setEditPathogenesis(e.target.value)}
                className="w-full bg-[#131314] border border-[#3c4043] rounded-lg p-2 text-[12px] text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#8ab4f8] mb-1">
                🔵 Triệu chứng Lâm sàng & Cận lâm sàng
              </label>
              <textarea
                rows={2}
                value={editClinicalFeatures}
                onChange={(e) => setEditClinicalFeatures(e.target.value)}
                className="w-full bg-[#131314] border border-[#3c4043] rounded-lg p-2 text-[12px] text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#ef4444] mb-1">
                🔴 Dấu hiệu Cờ đỏ (Mỗi dòng 1 dấu hiệu)
              </label>
              <textarea
                rows={2}
                value={editRedFlags}
                onChange={(e) => setEditRedFlags(e.target.value)}
                className="w-full bg-[#131314] border border-[#3c4043] rounded-lg p-2 text-[12px] text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#81c995] mb-1">
                🟢 Phác đồ Điều trị & Liều lượng thuốc
              </label>
              <textarea
                rows={2}
                value={editTreatment}
                onChange={(e) => setEditTreatment(e.target.value)}
                className="w-full bg-[#131314] border border-[#3c4043] rounded-lg p-2 text-[12px] text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#fdd663] mb-1">
                🟡 Mẹo nhớ Lâm sàng (Clinical Pearls)
              </label>
              <textarea
                rows={2}
                value={editPearls}
                onChange={(e) => setEditPearls(e.target.value)}
                className="w-full bg-[#131314] border border-[#3c4043] rounded-lg p-2 text-[12px] text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-[#e3e3e3] mb-1">
                Ghi chú Markdown (Bảng biểu `|...|`, Công thức `$$...$$`)
              </label>
              <textarea
                rows={4}
                value={editMarkdown}
                onChange={(e) => setEditMarkdown(e.target.value)}
                placeholder="Hỗ trợ bảng Markdown và công thức y khoa..."
                className="w-full bg-[#131314] border border-[#3c4043] rounded-lg p-2 font-mono text-[11.5px] text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="submit"
                className="flex-1 py-2 rounded-lg bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-semibold text-[12px] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Lưu thay đổi</span>
              </button>
              <button
                type="button"
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 rounded-lg bg-[#2d2e30] text-[#9aa0a6] hover:text-white text-[12px] cursor-pointer"
              >
                Hủy
              </button>
            </div>
          </form>
        )}
      </div>
      </aside>
    </>
  );
};
