import React, { useState } from 'react';
import {
  X,
  FileJson,
  FileText,
  Copy,
  Check,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  Wand2,
} from 'lucide-react';
import {
  OrganSystem,
  MedicalSubject,
  MindmapNode,
} from '../types/mindmap';
import {
  parseAndValidateAIJson,
  parseMarkdownToMindmap,
} from '../utils/mindmapLayout';
import {
  AI_PROMPT_TEMPLATE,
  SAMPLE_MARKDOWN_IMPORT,
} from '../data/sampleLessons';

interface AIImporterModalProps {
  systems: OrganSystem[];
  subjects: MedicalSubject[];
  defaultSystemId: string;
  defaultSubjectId: string;
  onClose: () => void;
  onImportLesson: (payload: {
    title: string;
    systemId: string;
    subjectId: string;
    tags: string[];
    rootNode: MindmapNode;
  }) => void;
}

export const AIImporterModal: React.FC<AIImporterModalProps> = ({
  systems,
  subjects,
  defaultSystemId,
  defaultSubjectId,
  onClose,
  onImportLesson,
}) => {
  const [activeTab, setActiveTab] = useState<'json' | 'markdown' | 'prompt'>('json');
  const [selectedSystemId, setSelectedSystemId] = useState(
    defaultSystemId || systems[0]?.id || ''
  );
  const filteredSubjects = subjects.filter((s) => s.systemId === selectedSystemId);
  const [selectedSubjectId, setSelectedSubjectId] = useState(
    defaultSubjectId || filteredSubjects[0]?.id || ''
  );

  const [jsonInput, setJsonInput] = useState('');
  const [markdownInput, setMarkdownInput] = useState('');
  const [validationMessage, setValidationMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState(false);

  const handleSystemChange = (sysId: string) => {
    setSelectedSystemId(sysId);
    const firstSub = subjects.find((s) => s.systemId === sysId);
    if (firstSub) setSelectedSubjectId(firstSub.id);
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(AI_PROMPT_TEMPLATE);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2500);
  };

  const handleValidateJson = () => {
    const res = parseAndValidateAIJson(jsonInput);
    if (!res.valid || !res.data) {
      setValidationMessage({
        type: 'error',
        text: res.error || 'Dữ liệu JSON không hợp lệ.',
      });
    } else {
      setValidationMessage({
        type: 'success',
        text: `Hợp lệ! Đã nhận diện bài "${res.data.title}" với ${res.data.nodeCount} node (Độ sâu: Cấp ${res.data.maxDepth}). Sẵn sàng dựng sơ đồ.`,
      });
    }
  };

  const handleBuildFromJson = () => {
    const res = parseAndValidateAIJson(jsonInput);
    if (!res.valid || !res.data) {
      setValidationMessage({
        type: 'error',
        text: res.error || 'Vui lòng kiểm tra lại cấu trúc JSON.',
      });
      return;
    }

    onImportLesson({
      title: res.data.title,
      systemId: selectedSystemId,
      subjectId: selectedSubjectId,
      tags: res.data.tags,
      rootNode: res.data.rootNode,
    });
    onClose();
  };

  const handleBuildFromMarkdown = () => {
    const res = parseMarkdownToMindmap(markdownInput);
    if (!res.valid || !res.data) {
      setValidationMessage({
        type: 'error',
        text: res.error || 'Vui lòng nhập nội dung Markdown hợp lệ.',
      });
      return;
    }

    onImportLesson({
      title: res.data.title,
      systemId: selectedSystemId,
      subjectId: selectedSubjectId,
      tags: ['Markdown Import', 'Y khoa'],
      rootNode: res.data.rootNode,
    });
    onClose();
  };

  const loadSampleJsonDemo = () => {
    const sampleJson = {
      title: 'Nhồi máu cơ tim cấp ST chênh lên (STEMI)',
      tags: ['Cấp cứu Tim mạch', 'ESC', 'Nội khoa'],
      rootNode: {
        id: 'stemi-root',
        label: 'Nhồi máu cơ tim cấp ST chênh lên (STEMI)',
        summary: 'Hoại tử cơ tim cấp tính do tắc hoàn toàn động mạch vành thượng tâm mạc',
        clinicalNotes: {
          pathogenesis:
            'Nứt vỡ mảng xơ vữa không ổn định -> Hoạt hóa kết tập tiểu cầu và dòng thác đông máu -> Huyết khối đỏ làm tắc hoàn toàn lòng mạch vành.',
          redFlags: [
            'Đau thắt ngực kiểu mạch vành kéo dài > 20 phút không đáp ứng Nitroglycerin',
            'Sốc tim (Huyết áp tâm thu < 90 mmHg, chi lạnh ẩm, thiểu niệu)',
          ],
          treatment:
            'Tái tưới máu mạch vành khẩn cấp: Can thiệp mạch vành qua da thì đầu (Primary PCI) trong vòng <= 90-120 phút.',
        },
        children: [
          {
            id: 'stemi-c1-1',
            label: 'Chẩn đoán xác định (Tiêu chuẩn Định nghĩa toàn cầu lần 4)',
            accentColor: '#8ab4f8',
            children: [
              {
                id: 'stemi-c2-1',
                label: 'Tiêu chuẩn Điện tâm đồ 12 chuyển đạo (Trong vòng 10 phút đầu)',
                children: [
                  {
                    id: 'stemi-c3-1',
                    label: 'ST chênh lên mới tại điểm J ở >= 2 chuyển đạo liên tiếp (V2-V3 >= 2mm ở nam, >= 1.5mm ở nữ)',
                    badge: 'diagnostic',
                  },
                  {
                    id: 'stemi-c3-2',
                    label: 'Block nhánh trái (LBBB) mới xuất hiện hoặc theo tiêu chuẩn Sgarbossa',
                    badge: 'danger',
                  },
                ],
              },
              {
                id: 'stemi-c2-2',
                label: 'Động học Men tim Troponin siêu nhạy (hs-cTn)',
                children: [
                  {
                    id: 'stemi-c3-3',
                    label: 'Không chờ kết quả Troponin mới quyết định tái tưới máu nếu ECG đã có ST chênh lên điển hình',
                    badge: 'warning',
                  },
                ],
              },
            ],
          },
          {
            id: 'stemi-c1-2',
            label: 'Xử trí Cấp cứu & Tái tưới máu',
            accentColor: '#81c995',
            children: [
              {
                id: 'stemi-c2-3',
                label: 'Kháng kết tập tiểu cầu kép (DAPT) liều nạp',
                children: [
                  {
                    id: 'stemi-c3-4',
                    label: 'Aspirin 150-300mg nhai + Ticagrelor 180mg (hoặc Prasugrel 60mg / Clopidogrel 600mg)',
                    badge: 'treatment',
                  },
                ],
              },
            ],
          },
        ],
      },
    };
    setJsonInput(JSON.stringify(sampleJson, null, 2));
    setValidationMessage({
      type: 'success',
      text: 'Đã nạp dữ liệu mẫu JSON "Nhồi máu cơ tim cấp (STEMI)" 4 cấp độ!',
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 select-text">
      <div className="w-full max-w-4xl bg-[#1e1f20] border border-[#3c4043] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#2d2e30] flex items-center justify-between bg-[#161718]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#8ab4f8]/15 border border-[#8ab4f8]/40 flex items-center justify-center text-[#8ab4f8]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-[17px] text-white">
                AI-Ready Importer — Nhập bài học từ Gemini / ChatGPT / Claude
              </h2>
              <p className="text-[12px] text-[#9aa0a6]">
                Chuyển đổi tức thì dữ liệu JSON hoặc Markdown 4–5 tầng thành Sơ đồ tư duy Y khoa tương tác
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#9aa0a6] hover:text-white hover:bg-[#2d2e30] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Target Curriculum Selector (Tier 1 & Tier 2) */}
        <div className="px-6 py-3 bg-[#1b1c1e] border-b border-[#2d2e30] grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-[#9aa0a6] mb-1">
              Lưu vào Tầng 1 (Khối / Hệ cơ quan):
            </label>
            <select
              value={selectedSystemId}
              onChange={(e) => handleSystemChange(e.target.value)}
              className="w-full bg-[#131314] border border-[#3c4043] rounded-lg px-3 py-1.5 text-[12.5px] text-white focus:outline-none focus:border-[#8ab4f8]"
            >
              {systems.map((sys) => (
                <option key={sys.id} value={sys.id}>
                  {sys.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-[#9aa0a6] mb-1">
              Lưu vào Tầng 2 (Học phần / Phân môn):
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full bg-[#131314] border border-[#3c4043] rounded-lg px-3 py-1.5 text-[12.5px] text-white focus:outline-none focus:border-[#8ab4f8]"
            >
              {filteredSubjects.map((sub) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 Mode Tabs */}
        <div className="px-6 pt-3 border-b border-[#2d2e30] flex items-center gap-2 bg-[#1e1f20]">
          <button
            onClick={() => {
              setActiveTab('json');
              setValidationMessage(null);
            }}
            className={`px-4 py-2.5 text-[13px] font-display font-semibold rounded-t-xl border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'json'
                ? 'border-[#8ab4f8] text-[#8ab4f8] bg-[#131314]/60'
                : 'border-transparent text-[#9aa0a6] hover:text-white'
            }`}
          >
            <FileJson className="w-4 h-4" />
            <span>1. Dán JSON Chuẩn (Khuyên dùng)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('markdown');
              setValidationMessage(null);
            }}
            className={`px-4 py-2.5 text-[13px] font-display font-semibold rounded-t-xl border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'markdown'
                ? 'border-[#8ab4f8] text-[#8ab4f8] bg-[#131314]/60'
                : 'border-transparent text-[#9aa0a6] hover:text-white'
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>2. Dán Markdown Nhanh (#, -)</span>
          </button>

          <button
            onClick={() => {
              setActiveTab('prompt');
              setValidationMessage(null);
            }}
            className={`px-4 py-2.5 text-[13px] font-display font-semibold rounded-t-xl border-b-2 flex items-center gap-2 transition-colors cursor-pointer ${
              activeTab === 'prompt'
                ? 'border-[#81c995] text-[#81c995] bg-[#131314]/60'
                : 'border-transparent text-[#9aa0a6] hover:text-white'
            }`}
          >
            <Copy className="w-4 h-4" />
            <span>3. Copy Prompt Mẫu cho AI</span>
          </button>
        </div>

        {/* Tab Body */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4">
          {activeTab === 'json' && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] text-[#b0b5ba]">
                  Dán đoạn mã JSON do Gemini, ChatGPT hoặc Claude tạo ra (hỗ trợ đầy đủ 4–5 cấp độ, nhãn màu y khoa <code className="text-[#8ab4f8]">danger, warning, treatment, diagnostic, mechanism</code> và ghi chú lâm sàng).
                </p>
                <button
                  onClick={loadSampleJsonDemo}
                  className="px-3 py-1.5 rounded-lg bg-[#2d2e30] hover:bg-[#3c4043] text-[11.5px] font-medium text-[#8ab4f8] flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Nạp JSON mẫu (STEMI)</span>
                </button>
              </div>

              <textarea
                rows={12}
                value={jsonInput}
                onChange={(e) => {
                  setJsonInput(e.target.value);
                  setValidationMessage(null);
                }}
                placeholder={`{\n  "title": "Tên bài học Y khoa",\n  "rootNode": {\n    "label": "Chủ đề chính (Cấp 0)",\n    "children": [ ... ]\n  }\n}`}
                className="w-full bg-[#131314] border border-[#3c4043] focus:border-[#8ab4f8] rounded-xl p-4 font-mono text-[12px] text-[#e3e3e3] focus:outline-none leading-relaxed"
              />

              {validationMessage && (
                <div
                  className={`p-3 rounded-xl border flex items-center gap-2.5 text-[12.5px] ${
                    validationMessage.type === 'success'
                      ? 'bg-[#10b981]/10 border-[#10b981]/40 text-[#81c995]'
                      : 'bg-[#ef4444]/10 border-[#ef4444]/40 text-[#f28b82]'
                  }`}
                >
                  {validationMessage.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 shrink-0" />
                  )}
                  <span>{validationMessage.text}</span>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleValidateJson}
                  className="px-4 py-2 rounded-xl bg-[#2d2e30] hover:bg-[#3c4043] text-[13px] font-medium text-white transition-colors cursor-pointer"
                >
                  Kiểm tra lỗi JSON
                </button>
                <button
                  type="button"
                  onClick={handleBuildFromJson}
                  className="px-5 py-2 rounded-xl bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-display font-semibold text-[13px] shadow-md transition-colors cursor-pointer"
                >
                  Vẽ Sơ đồ Tư duy ngay
                </button>
              </div>
            </>
          )}

          {activeTab === 'markdown' && (
            <>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12.5px] text-[#b0b5ba]">
                  Dán danh sách Markdown thụt đầu dòng (<code className="text-[#8ab4f8]"># Cấp 0</code>, <code className="text-[#8ab4f8]">## Cấp 1</code>, <code className="text-[#8ab4f8]">- Cấp 2</code>, <code className="text-[#8ab4f8]">  - Cấp 3</code>). Thêm <code className="text-[#ef4444]">[danger]</code>, <code className="text-[#10b981]">[treatment]</code>, <code className="text-[#3b82f6]">[diagnostic]</code>, <code className="text-[#a855f7]">[mechanism]</code> ở cuối dòng để tự động gắn nhãn màu.
                </p>
                <button
                  onClick={() => setMarkdownInput(SAMPLE_MARKDOWN_IMPORT)}
                  className="px-3 py-1.5 rounded-lg bg-[#2d2e30] hover:bg-[#3c4043] text-[11.5px] font-medium text-[#8ab4f8] flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Wand2 className="w-3.5 h-3.5" />
                  <span>Nạp Markdown mẫu (Viêm tụy cấp)</span>
                </button>
              </div>

              <textarea
                rows={12}
                value={markdownInput}
                onChange={(e) => setMarkdownInput(e.target.value)}
                placeholder={`# Tên Bệnh Lý (Cấp 0)\n## 1. Cơ chế bệnh sinh (Cấp 1)\n- Nhóm nguyên nhân chính (Cấp 2)\n  - Chi tiết cơ chế phân tử [mechanism] (Cấp 3)\n  - Dấu hiệu cờ đỏ nguy kịch [danger] (Cấp 3)`}
                className="w-full bg-[#131314] border border-[#3c4043] focus:border-[#8ab4f8] rounded-xl p-4 font-mono text-[12px] text-[#e3e3e3] focus:outline-none leading-relaxed"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleBuildFromMarkdown}
                  className="px-5 py-2 rounded-xl bg-[#8ab4f8] hover:bg-[#aecbfa] text-[#131314] font-display font-semibold text-[13px] shadow-md transition-colors cursor-pointer"
                >
                  Chuyển đổi Markdown thành Sơ đồ
                </button>
              </div>
            </>
          )}

          {activeTab === 'prompt' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-[#131314] border border-[#2d2e30] flex items-center justify-between gap-4">
                <div>
                  <h4 className="font-display font-semibold text-[14px] text-white">
                    Câu lệnh (Prompt) chuẩn hóa 4–5 Cấp độ & Nhãn Y khoa cho Gemini / ChatGPT
                  </h4>
                  <p className="text-[12px] text-[#9aa0a6] mt-0.5">
                    Bấm nút Copy bên phải, sau đó dán kèm nội dung bài giảng PDF/Word của bạn vào Gemini hoặc ChatGPT.
                  </p>
                </div>
                <button
                  onClick={handleCopyPrompt}
                  className="px-4 py-2.5 rounded-xl bg-[#81c995] hover:bg-[#a8dab5] text-[#131314] font-display font-semibold text-[13px] flex items-center gap-2 shrink-0 transition-colors cursor-pointer"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Đã Copy Prompt!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy Prompt Mẫu</span>
                    </>
                  )}
                </button>
              </div>

              <pre className="w-full bg-[#131314] border border-[#3c4043] rounded-xl p-4 font-mono text-[11.5px] text-[#b0b5ba] overflow-x-auto whitespace-pre-wrap max-h-[340px]">
                {AI_PROMPT_TEMPLATE}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
