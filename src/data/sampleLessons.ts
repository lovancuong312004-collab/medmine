import { MedMindDatabase } from '../types/mindmap';

export const INITIAL_MEDMIND_DATA: MedMindDatabase = {
  systems: [
    { id: 'sys-oncology', name: 'Ung bướu', iconName: 'Dna' },
    { id: 'sys-basic', name: 'Cơ sở Y học', iconName: 'Microscope' },
    { id: 'sys-cardio', name: 'Hệ Tim mạch', iconName: 'HeartPulse' },
    { id: 'sys-resp', name: 'Hệ Hô hấp', iconName: 'Wind' },
    { id: 'sys-surg', name: 'Ngoại khoa', iconName: 'Scissors' },
    { id: 'sys-obped', name: 'Sản - Nhi', iconName: 'Baby' },
  ],
  subjects: [
    { id: 'sub-onco-path', systemId: 'sys-oncology', name: 'Bệnh học đại cương', code: 'ONC101' },
    { id: 'sub-onco-clin', systemId: 'sys-oncology', name: 'Ung thư học lâm sàng', code: 'ONC202' },
    { id: 'sub-basic-anat', systemId: 'sys-basic', name: 'Giải phẫu bệnh', code: 'PAT101' },
    { id: 'sub-basic-phys', systemId: 'sys-basic', name: 'Sinh lý bệnh - Miễn dịch', code: 'PHY102' },
    { id: 'sub-cardio-int', systemId: 'sys-cardio', name: 'Nội bệnh lý Tim mạch', code: 'CAR301' },
    { id: 'sub-cardio-pharm', systemId: 'sys-cardio', name: 'Dược lý lâm sàng Tim mạch', code: 'PHA305' },
    { id: 'sub-resp-int', systemId: 'sys-resp', name: 'Nội khoa Hô hấp', code: 'RES201' },
    { id: 'sub-surg-gen', systemId: 'sys-surg', name: 'Ngoại bệnh lý Tiêu hóa', code: 'SUR301' },
    { id: 'sub-obped-ob', systemId: 'sys-obped', name: 'Sản phụ khoa', code: 'OBG401' },
  ],
  lessons: [
    {
      id: 'lesson-cancer-characteristics',
      title: 'Các đặc tính cơ bản của bệnh ung thư',
      systemId: 'sys-oncology',
      subjectId: 'sub-onco-path',
      status: 'Đang ôn',
      tags: ['Giải phẫu bệnh', 'Ung bướu', 'Thi cuối kỳ', 'Cốt lõi'],
      updatedAt: '2026-10-24T08:30:00.000Z',
      rootNode: {
        id: 'cancer-root',
        label: 'Các đặc tính cơ bản của bệnh ung thư',
        summary: '5 đặc tính sinh học & lâm sàng cốt lõi phân biệt u ác tính với u lành tính',
        mastery: 'mastered',
        clinicalNotes: {
          pathogenesis:
            'Ung thư là bệnh lý ác tính của tế bào, đặc trưng bởi sự tăng sinh không kiểm soát, thoát khỏi cơ chế tự chết theo chương trình (Apoptosis), có khả năng xâm lấn mô lân cận và di căn xa.',
          clinicalFeatures:
            'Biểu hiện qua 5 trụ cột: (1) Tổn thương đa hình thái tế bào, (2) Tính chất xâm lấn, (3) Tính chất di căn, (4) Bệnh lý mạn tính đa giai đoạn, và (5) Tính chất hay tái phát.',
          redFlags: [
            'Khối u phát triển nhanh, mật độ cứng chắc, bờ không đều, dính chặt mô xung quanh',
            'Hội chứng cận u hoặc sụt cân không rõ nguyên nhân (>10% trọng lượng cơ thể trong 6 tháng)',
            'Hạch ngoại vi to, cứng, không đau, di động kém (VD: Hạch thượng đòn trái Virchow-Troisier)',
          ],
          treatment:
            'Phối hợp đa mô thức (Multimodal Therapy): Phẫu thuật triệt căn (diện cắt R0) + Xạ trị + Hóa chất toàn thân + Điều trị đích (Targeted therapy) + Miễn dịch (Immunotherapy).',
          pearls:
            'Nhớ quy tắc 5 ĐẶC TÍNH: Đa hình thái (Hình thái học) -> Xâm lấn (Tại chỗ) -> Di căn (Toàn thân) -> Mạn tính (Thời gian sinh u) -> Hay tái phát (Tiên lượng & Theo dõi).',
          markdown: `### Bảng Phân Biệt U Lành Tính và U Ác Tính (Ung Thư)

| Tiêu chí | U lành tính (Benign) | U ác tính / Ung thư (Malignant) |
| :--- | :--- | :--- |
| **Độ biệt hóa** | Biệt hóa tốt, giống mô gốc | Kém biệt hóa hoặc bất sản (Anaplasia), đa hình thái |
| **Tốc độ phát triển** | Chậm, có thể ngừng lớn | Nhanh, tăng sinh tự động không ngừng |
| **Vỏ bao & Ranh giới** | Có vỏ xơ rõ, di động tốt | Không có vỏ thật, bờ tua gai, xâm lấn dính mô lành |
| **Tính chất di căn** | Không bao giờ di căn | Có di căn (bạch huyết, đường máu, kế cận) |
| **Tái phát sau mổ** | Hiếm gặp (nếu bóc hết vỏ) | Rất hay tái phát (tại chỗ hoặc di căn xa) |

#### Công thức ước tính Thời gian nhân đôi khối u (Doubling Time - $DT$):
$$DT = \\frac{(t_2 - t_1) \\times \\ln(2)}{\\ln(V_2 / V_1)}$$
*Lưu ý: Một tế bào ung thư ($10\\,\\mu\\text{m}$) cần khoảng **30 lần nhân đôi** để đạt kích thước $1\\,\\text{cm}^3$ ($10^9$ tế bào, nặng $\\approx 1\\,\\text{gam}$) — ngưỡng phát hiện được trên lâm sàng.*`,
        },
        children: [
          // ==================== CẤP 1 - NHÁNH 1 ====================
          {
            id: 'c1-pleomorphism',
            label: 'Tổn thương đa hình thái tế bào',
            summary: 'Biến đổi hình thái đại thể, vi thể và cấu trúc mô học (Anaplasia)',
            accentColor: '#8ab4f8',
            mastery: 'mastered',
            clinicalNotes: {
              pathogenesis:
                'Do sự mất ổn định bộ gen (Genomic instability) và rối loạn phân bào đa cực khiến các dòng tế bào con phát triển không đồng đều về kích thước, hình dạng và mức độ biệt hóa.',
              clinicalFeatures:
                'Là tiêu chuẩn nền tảng để bác sĩ Giải phẫu bệnh chẩn đoán xác định ác tính trên tiêu bản nhuộm HE và Hóa mô miễn dịch.',
              pearls:
                'Đa hình thái (Pleomorphism) = Tế bào to nhỏ không đều + Nhân quái/nhân kiềm tính + Nhân chia bất thường.',
              markdown: `### Tiêu chuẩn Ác tính trên Vi thể (Cytologic Atypia)
- **Tỷ lệ Nhân / Bào tương ($N/C$ ratio)**: Tăng cao tới $1:1$ (bình thường $1:4$ đến $1:6$).
- **Đặc điểm Nhân**: Nhân lớn, màng nhân dày không đều, chất nhiễm sắc (Chromatin) vón cục thô, hạt nhân (Nucleoli) to và rõ.
- **Phân bào (Mitosis)**: Nhiều hình ảnh nhân chia, đặc biệt là **nhân chia bất thường** (3 cực, 4 cực, multipolar spindles).`,
            },
            children: [
              {
                id: 'c2-macro',
                label: 'Đa hình thái về đại thể',
                summary: 'Hình dạng khối u đa dạng khi quan sát bằng mắt thường / nội soi',
                mastery: 'mastered',
                clinicalNotes: {
                  clinicalFeatures:
                    'Trên cùng một cơ quan, khối u có thể biểu hiện dưới dạng thể sùi (như súp lơ), thể loét (bờ cứng nham nhở, đáy hoại tử chảy máu) hoặc thể thâm nhiễm cứng (Linitis plastica ở dạ dày).',
                },
                children: [
                  {
                    id: 'c3-macro-forms',
                    label: 'Thể sùi, thể loét, thể thâm nhiễm hoặc hỗn hợp',
                    badge: 'diagnostic',
                    mastery: 'mastered',
                    clinicalNotes: {
                      clinicalFeatures:
                        'Nội soi tiêu hóa hoặc phế quản thường gặp thể sùi loét dễ chảy máu khi chạm ống soi; thể thâm nhiễm làm cứng vách cơ quan gây hẹp lòng.',
                    },
                  },
                  {
                    id: 'c3-macro-necrosis',
                    label: 'Vùng hoại tử trung tâm và xuất huyết trong u do tăng sinh mạch không kịp',
                    badge: 'mechanism',
                    mastery: 'mastered',
                    clinicalNotes: {
                      pathogenesis:
                        'Tốc độ nhân đôi của tế bào u vượt quá khả năng cấp máu của hệ mạch tân sinh (Angiogenesis), gây thiếu oxy (Hypoxia) và hoại tử đông ở trung tâm u.',
                    },
                  },
                ],
              },
              {
                id: 'c2-micro-cell',
                label: 'Đa hình thái về vi thể (Tế bào & Nhân)',
                summary: 'Biến đổi sâu sắc cấu trúc nhân và bào tương trên tiêu bản giải phẫu bệnh',
                mastery: 'review',
                clinicalNotes: {
                  clinicalFeatures:
                    'Quan sát dưới kính hiển vi quang học thấy mất tính đồng nhất: tế bào khổng lồ nhiều nhân xen lẫn tế bào nhỏ sẫm màu.',
                },
                children: [
                  {
                    id: 'c3-nc-ratio',
                    label: 'Tỷ lệ Nhân/Bào tương (N/C) tăng cao > 1:1, nhân quái, kiềm tính đậm',
                    badge: 'diagnostic',
                    mastery: 'mastered',
                    clinicalNotes: {
                      clinicalFeatures:
                        'Nhân tế bào ung thư chứa lượng ADN bội thể bất thường (Aneuploidy) nên bắt màu Hematoxylin rất đậm (Hyperchromasia).',
                    },
                  },
                  {
                    id: 'c3-atypical-mitosis',
                    label: 'Nhân chia bất thường (3 cực, 4 cực) và mất cực tính tế bào',
                    badge: 'mechanism',
                    mastery: 'review',
                    clinicalNotes: {
                      pathogenesis:
                        'Rối loạn trung thể (Centrosome amplification) dẫn đến thoi vô sắc chia nhiều hướng, tạo các dòng tế bào đột biến mới.',
                    },
                    children: [
                      {
                        id: 'c4-biopsy-gold',
                        label: 'Sinh thiết mô bệnh học + Hóa mô miễn dịch là Tiêu chuẩn vàng chẩn đoán',
                        badge: 'diagnostic',
                        mastery: 'mastered',
                        clinicalNotes: {
                          clinicalFeatures:
                            'Chẩn đoán xác định ung thư bắt buộc phải có bằng chứng Giải phẫu bệnh (Mô bệnh học + Hóa mô miễn dịch xác định nguồn gốc tế bào).',
                        },
                      },
                    ],
                  },
                ],
              },
              {
                id: 'c2-grading',
                label: 'Mức độ biệt hóa & Độ mô học (Grading)',
                summary: 'Đánh giá mức độ giống mô gốc để tiên lượng độ ác tính',
                mastery: 'mastered',
                children: [
                  {
                    id: 'c3-grade-scale',
                    label: 'Chia độ G1 (biệt hóa rõ) -> G2 (vừa) -> G3 (kém) -> G4 (bất sản/Anaplastic)',
                    badge: 'diagnostic',
                    mastery: 'mastered',
                    clinicalNotes: {
                      clinicalFeatures:
                        'Độ mô học (Grade) phản ánh bản chất sinh học của u, khác với Giai đoạn (Stage - TNM) phản ánh mức độ lan rộng giải phẫu.',
                    },
                  },
                  {
                    id: 'c3-anaplasia-warn',
                    label: 'U kém biệt hóa / bất sản (G3-G4) phát triển cực nhanh, tiên lượng xấu',
                    badge: 'warning',
                    mastery: 'review',
                    clinicalNotes: {
                      pearls:
                        'Tuy u G3-G4 tiến triển nhanh và di căn sớm nhưng lại thường nhạy cảm hơn với Hóa trị và Xạ trị (do tỷ lệ tế bào đang phân chia Ki-67 cao).',
                    },
                  },
                ],
              },
            ],
          },

          // ==================== CẤP 1 - NHÁNH 2 ====================
          {
            id: 'c1-invasion',
            label: 'Tính chất xâm lấn',
            summary: 'Khả năng phá hủy màng đáy và lan rộng kiểu "chân cua" vào mô lành lân cận',
            accentColor: '#c58af9',
            mastery: 'mastered',
            clinicalNotes: {
              pathogenesis:
                'Quá trình xâm lấn gồm 4 bước: (1) Giảm kết dính giữa các tế bào u, (2) Tiết enzyme phân hủy màng đáy và chất nền ngoại bào (ECM), (3) Bám dính vào thành phần ECM đã biến đổi, (4) Di chuyển chủ động (Chemotaxis).',
              clinicalFeatures:
                'Khối u không có vỏ bọc thật sự, ranh giới không rõ ràng, khám lâm sàng thấy u cố định, dính vào da hoặc cơ xương bên dưới.',
              redFlags: [
                'Dấu hiệu co kéo da / núm vú hoặc da cam (Peau d’orange) trong ung thư vú',
                'Liệt dây thanh âm (khàn tiếng) do u phổi/thực quản xâm lấn thần kinh quặt ngược',
                'Hội chứng chèn ép tĩnh mạch chủ trên (SVC syndrome)',
              ],
            },
            children: [
              {
                id: 'c2-inv-mech',
                label: 'Cơ chế phân tử của sự xâm lấn',
                summary: 'Mất kết dính gian bào, chuyển dạng EMT và tiết enzyme tiêu hủy màng đáy',
                mastery: 'review',
                children: [
                  {
                    id: 'c3-ecadherin',
                    label: 'Mất biểu hiện E-cadherin làm rời rạc liên kết giữa các tế bào biểu mô',
                    badge: 'mechanism',
                    mastery: 'mastered',
                    clinicalNotes: {
                      pathogenesis:
                        'E-cadherin là protein xuyên màng giữ các tế bào biểu mô gắn chặt với nhau. Đột biến hoặc bất hoạt gen CDH1 làm tế bào u tách rời dễ dàng (đặc trưng trong K dạ dày thể lan tỏa).',
                    },
                  },
                  {
                    id: 'c3-mmp-enzymes',
                    label: 'Tiết enzyme Matrix Metalloproteinases (MMP-2, MMP-9) phá hủy Collagen type IV màng đáy',
                    badge: 'mechanism',
                    mastery: 'review',
                    clinicalNotes: {
                      pathogenesis:
                        'Màng đáy là ranh giới phân định Ung thư biểu mô tại chỗ (Carcinoma in situ - CIS) và Ung thư xâm lấn (Invasive carcinoma). Khi màng đáy bị MMP xuyên thủng, u chính thức có khả năng xâm nhập mạch máu/bạch huyết.',
                    },
                  },
                  {
                    id: 'c3-emt-process',
                    label: 'Chuyển dạng Biểu mô - Trung mô (EMT) giúp tế bào u có chân giả di động',
                    badge: 'mechanism',
                    mastery: 'review',
                  },
                ],
              },
              {
                id: 'c2-inv-clinical',
                label: 'Biểu hiện lâm sàng & Biến chứng tại chỗ',
                summary: 'Chèn ép, xâm nhiễm thần kinh, mạch máu và tạng lân cận',
                mastery: 'mastered',
                children: [
                  {
                    id: 'c3-crab-sign',
                    label: 'Khối u bờ tua gai (Spiculated), mật độ cứng, cố định, dính chặt mô xung quanh',
                    badge: 'diagnostic',
                    mastery: 'mastered',
                    clinicalNotes: {
                      pearls:
                        'Thuật ngữ "Cancer" xuất phát từ tiếng Hy Lạp "Karkinos" (Con cua) do Hippocrates đặt vì các nhánh xâm lấn tỏa ra xung quanh khối u giống hệt chân cua.',
                    },
                  },
                  {
                    id: 'c3-vascular-erosion',
                    label: 'Ăn mòn mạch máu lớn gây xuất huyết ồ ạt, xâm lấn đám rối thần kinh gây đau dữ dội',
                    badge: 'danger',
                    mastery: 'mastered',
                    clinicalNotes: {
                      redFlags: [
                        'Ho ra máu sét đánh trong K phổi xâm lấn động mạch phổi',
                        'Chảy máu mũi/họng ồ ạt trong K vòm mũi họng xâm lấn động mạch cảnh trong',
                        'Thủng tạng rỗng gây viêm phúc mạc trong K dạ dày / đại trực tràng',
                      ],
                    },
                  },
                ],
              },
              {
                id: 'c2-inv-surgery',
                label: 'Ý nghĩa trong Phẫu thuật & Xạ trị',
                summary: 'Quyết định phạm vi cắt bỏ rộng để tránh bỏ sót vi xâm lấn',
                mastery: 'mastered',
                children: [
                  {
                    id: 'c3-r0-resection',
                    label: 'Bắt buộc cắt rộng cách bờ u 2–5 cm đảm bảo diện cắt âm tính trên vi thể (R0)',
                    badge: 'treatment',
                    mastery: 'mastered',
                    clinicalNotes: {
                      treatment:
                        'Không được chỉ "bóc u" (Enucleation) như u lành tính vì các chân xâm lấn vi thể nằm ngoài vỏ giả sẽ gây tái phát 100%. Cần sinh thiết tức thì (Frozen section) diện cắt trong mổ.',
                    },
                  },
                ],
              },
            ],
          },

          // ==================== CẤP 1 - NHÁNH 3 ====================
          {
            id: 'c1-metastasis',
            label: 'Tính chất di căn',
            summary: 'Tế bào ung thư di chuyển từ ổ nguyên phát đến định cư và tạo khối u thứ phát ở cơ quan xa',
            accentColor: '#f28b82',
            mastery: 'review',
            clinicalNotes: {
              pathogenesis:
                'Chuỗi di căn (Metastatic cascade): Xâm lấn tại chỗ -> Xâm nhập lòng mạch (Intravasation) -> Sống sót trong tuần hoàn bằng cách kết cụm với tiểu cầu -> Thoát mạch tại cơ quan đích (Extravasation) -> Tăng sinh mạch máu mới (VEGF) tạo ổ di căn.',
              clinicalFeatures:
                'Là nguyên nhân chính gây tử vong ở 90% bệnh nhân ung thư. Vị trí di căn phụ thuộc vào dẫn lưu giải phẫu và ái tính sinh học ("Hạt giống và Đất trồng" - Seed and Soil hypothesis của Paget).',
              redFlags: [
                'Đau cột sống về đêm kèm chèn ép tủy sống cấp tính (Di căn xương cột sống)',
                'Đau đầu tăng dần, nôn vọt, phù gai thị, co giật (Di căn não)',
                'Khó thở tiến triển, tràn dịch màng phổi dịch máu tái lập nhanh (Di căn phổi/màng phổi)',
              ],
            },
            children: [
              {
                id: 'c2-meta-lymph',
                label: 'Di căn theo đường Bạch huyết (Lymphatic spread)',
                summary: 'Con đường ưu thế của Ung thư biểu mô (Carcinoma)',
                mastery: 'mastered',
                children: [
                  {
                    id: 'c3-sentinel-node',
                    label: 'Lan tuần tự qua Hạch cửa (Sentinel lymph node) đến các chặng hạch vùng',
                    badge: 'mechanism',
                    mastery: 'mastered',
                    clinicalNotes: {
                      clinicalFeatures:
                        'Sinh thiết hạch cửa (Sentinel Lymph Node Biopsy - SLNB) được ứng dụng rộng rãi trong K vú và Melanoma để tránh vét hạch nách không cần thiết.',
                    },
                  },
                  {
                    id: 'c3-virchow-node',
                    label: 'Hạch thượng đòn trái (Hạch Virchow - Troisier) gợi ý K dạ dày / tiêu hóa di căn qua ống ngực',
                    badge: 'diagnostic',
                    mastery: 'mastered',
                  },
                ],
              },
              {
                id: 'c2-meta-blood',
                label: 'Di căn theo đường Máu (Hematogenous spread)',
                summary: 'Con đường điển hình của Sarcoma và giai đoạn muộn của Carcinoma',
                mastery: 'review',
                children: [
                  {
                    id: 'c3-target-organs',
                    label: '4 cơ quan đích hay gặp nhất: Gan (tĩnh mạch cửa), Phổi (tĩnh mạch chủ), Xương, Não',
                    badge: 'danger',
                    mastery: 'mastered',
                    clinicalNotes: {
                      pearls:
                        'Các ung thư có ái tính di căn xương cao (Bony metastasis): Tuyến tiền liệt (đặc xương), Vú, Phổi, Tuyến giáp, Thận (tiêu xương).',
                    },
                  },
                  {
                    id: 'c3-ctc-emboli',
                    label: 'Tế bào u lưu hành (CTCs) kết tụ với tiểu cầu tạo vi huyết khối u né tránh tế bào NK',
                    badge: 'mechanism',
                    mastery: 'review',
                  },
                ],
              },
              {
                id: 'c2-meta-cavity',
                label: 'Di căn theo đường Kế cận & Hố tự nhiên (Transcoelomic)',
                summary: 'Gieo rắc qua khoang màng bụng, màng phổi, dịch não tủy hoặc dụng cụ phẫu thuật',
                mastery: 'review',
                children: [
                  {
                    id: 'c3-krukenberg',
                    label: 'U Krukenberg: K dạ dày gieo rắc qua phúc mạc xuống buồng trứng hai bên',
                    badge: 'diagnostic',
                    mastery: 'review',
                    clinicalNotes: {
                      clinicalFeatures:
                        'Về mặt mô học, u Krukenberg chứa các tế bào nhẫn tiết nhầy (Signet-ring cells) di căn từ dạ dày hoặc đại tràng xuống buồng trứng.',
                    },
                  },
                  {
                    id: 'c3-peritoneal-carcinomatosis',
                    label: 'Gieo rắc phúc mạc gây cổ trướng dịch máu ác tính trong K buồng trứng, K dạ dày',
                    badge: 'danger',
                    mastery: 'mastered',
                  },
                ],
              },
            ],
          },

          // ==================== CẤP 1 - NHÁNH 4 ====================
          {
            id: 'c1-chronic',
            label: 'Ung thư là bệnh mạn tính',
            summary: 'Quá trình sinh ung thư kéo dài nhiều năm qua 3 giai đoạn trước khi có triệu chứng',
            accentColor: '#81c995',
            mastery: 'mastered',
            clinicalNotes: {
              pathogenesis:
                'Ung thư không phải là bệnh cấp tính xuất hiện đột ngột mà là quá trình tích lũy đa đột biến (Multi-hit carcinogenesis) diễn ra âm thầm từ 5 đến 20 năm.',
              pearls:
                '3/4 cuộc đời tự nhiên của khối u diễn ra ở giai đoạn tiền lâm sàng (không triệu chứng). Do đó tầm soát phát hiện sớm là chìa khóa vàng.',
            },
            children: [
              {
                id: 'c2-carcino-stages',
                label: 'Quá trình sinh ung thư 3 giai đoạn',
                summary: 'Khởi phát (Initiation) -> Thúc đẩy (Promotion) -> Tiến triển (Progression)',
                mastery: 'mastered',
                children: [
                  {
                    id: 'c3-stage-init',
                    label: 'Giai đoạn Khởi phát: Đột biến ADN không hồi phục ở Gen sinh ung (Oncogenes) & Gen ức chế u (TP53, RB)',
                    badge: 'mechanism',
                    mastery: 'mastered',
                  },
                  {
                    id: 'c3-stage-promo',
                    label: 'Giai đoạn Thúc đẩy: Tác nhân kích thích tăng sinh chọn lọc dòng tế bào đột biến (có thể đảo ngược)',
                    badge: 'warning',
                    mastery: 'review',
                  },
                  {
                    id: 'c3-stage-prog',
                    label: 'Giai đoạn Tiến triển: Bất ổn định nhiễm sắc thể, chọn lọc dòng ác tính xâm lấn & tăng sinh mạch',
                    badge: 'mechanism',
                    mastery: 'mastered',
                  },
                ],
              },
              {
                id: 'c2-latent-phase',
                label: 'Giai đoạn tiềm ẩn lâm sàng kéo dài (Pre-clinical phase)',
                summary: 'Cơ sở khoa học cho chiến lược Dự phòng và Sàng lọc sớm',
                mastery: 'mastered',
                children: [
                  {
                    id: 'c3-1cm-threshold',
                    label: 'Khối u cần 30 lần nhân đôi (5–15 năm) để đạt kích thước 1 cm (1 tỷ tế bào) mới phát hiện được',
                    badge: 'warning',
                    mastery: 'mastered',
                    clinicalNotes: {
                      clinicalFeatures:
                        'Từ 1cm (1g) chỉ cần thêm 10 lần nhân đôi nữa là khối u đạt 1kg (10^12 tế bào) — giới hạn gây tử vong cho cơ thể vật chủ.',
                    },
                  },
                  {
                    id: 'c3-screening-rx',
                    label: 'Tầm soát ở giai đoạn Tiền ung thư / CIS (Pap smear, Nội soi đại tràng, Low-dose CT) giúp chữa khỏi >90%',
                    badge: 'treatment',
                    mastery: 'mastered',
                  },
                ],
              },
            ],
          },

          // ==================== CẤP 1 - NHÁNH 5 ====================
          {
            id: 'c1-recurrence',
            label: 'Tính chất hay tái phát',
            summary: 'Khối u xuất hiện trở lại tại chỗ, tại vùng hoặc di căn xa sau thời gian lui bệnh hoàn toàn',
            accentColor: '#fdd663',
            mastery: 'review',
            clinicalNotes: {
              pathogenesis:
                'Do còn sót các ổ tế bào ung thư vi thể ở diện cắt, các ổ vi di căn ngủ đông (Dormant micrometastases) ở tủy xương/tạng xa, hoặc do quần thể tế bào gốc ung thư (Cancer Stem Cells - CSCs) kháng lại hóa-xạ trị.',
              treatment:
                'Bắt buộc điều trị bổ trợ (Adjuvant therapy) sau phẫu thuật ở nhóm nguy cơ cao và theo dõi định kỳ chặt chẽ ít nhất 5 năm sau điều trị.',
            },
            children: [
              {
                id: 'c2-rec-causes',
                label: 'Cơ chế & Nguyên nhân tái phát',
                summary: 'Tế bào gốc ung thư kháng trị và vi di căn ngủ đông',
                mastery: 'review',
                children: [
                  {
                    id: 'c3-csc-dormancy',
                    label: 'Tế bào gốc ung thư (CSCs) và Vi di căn ngủ đông (G0 phase) kháng lại hóa chất & tia xạ',
                    badge: 'mechanism',
                    mastery: 'review',
                    clinicalNotes: {
                      pathogenesis:
                        'Hóa trị cổ điển chỉ tiêu diệt hiệu quả các tế bào đang phân chia mạnh (pha S, M). Các tế bào ngủ đông ở pha G0 hoặc có bơm đẩy thuốc MDR1 sẽ sống sót và tái hoạt động sau nhiều năm.',
                    },
                  },
                  {
                    id: 'c3-r1-margin',
                    label: 'Diện cắt phẫu thuật còn tế bào u vi thể (R1) hoặc bỏ sót hạch di căn nhảy cóc (Skip metastasis)',
                    badge: 'warning',
                    mastery: 'mastered',
                  },
                ],
              },
              {
                id: 'c2-rec-types',
                label: 'Phân loại tái phát trên lâm sàng',
                summary: 'Tái phát tại chỗ, tại vùng hạch và tái phát di căn xa',
                mastery: 'mastered',
                children: [
                  {
                    id: 'c3-rec-patterns',
                    label: 'Tái phát tại chỗ (nền u cũ), Tái phát tại vùng (hạch khu vực) và Tái phát xa (di căn muộn)',
                    badge: 'danger',
                    mastery: 'mastered',
                  },
                ],
              },
              {
                id: 'c2-rec-followup',
                label: 'Chiến lược phòng ngừa & Theo dõi sau điều trị',
                summary: 'Điều trị bổ trợ (Adjuvant) và mốc theo dõi 5 năm',
                mastery: 'mastered',
                children: [
                  {
                    id: 'c3-adjuvant-therapy',
                    label: 'Phối hợp Hóa trị / Xạ trị / Nội tiết / Đích bổ trợ sau mổ nhằm diệt sạch vi di căn',
                    badge: 'treatment',
                    mastery: 'mastered',
                  },
                  {
                    id: 'c3-surveillance-5yr',
                    label: 'Khám định kỳ mỗi 3–6 tháng trong 2 năm đầu (giai đoạn 80% tái phát xảy ra) và theo dõi suốt đời',
                    badge: 'diagnostic',
                    mastery: 'mastered',
                    clinicalNotes: {
                      clinicalFeatures:
                        'Theo dõi lâm sàng kết hợp chất chỉ điểm khối u (Tumor markers: CEA, AFP, PSA, CA 15-3, CA 19-9...) và chẩn đoán hình ảnh định kỳ.',
                    },
                  },
                ],
              },
            ],
          },
        ],
      },
    },
    {
      id: 'lesson-heart-failure',
      title: 'Suy tim mạn tính: Cơ chế & Điều trị Tứ trụ (GDMT)',
      systemId: 'sys-cardio',
      subjectId: 'sub-cardio-int',
      status: 'Đã thuộc',
      tags: ['Tim mạch', 'ESC 2023', 'Nội khoa', 'Phác đồ'],
      updatedAt: '2026-10-23T14:20:00.000Z',
      rootNode: {
        id: 'hf-root',
        label: 'Suy tim mạn tính & Phác đồ Tứ trụ',
        summary: 'Hội chứng lâm sàng do bất thường cấu trúc/chức năng tim làm giảm cung lượng tim hoặc tăng áp lực đổ đầy',
        mastery: 'mastered',
        clinicalNotes: {
          pathogenesis:
            'Hoạt hóa kéo dài hệ Giao cảm (SNS) và hệ Renin-Angiotensin-Aldosterone (RAAS) gây tái cấu trúc cơ tim bệnh lý, xơ hóa và chết tế bào cơ tim.',
          treatment:
            'Tứ trụ điều trị Suy tim phân suất tống máu giảm (HFrEF <= 40%): (1) ARNI/ACEi, (2) Chẹn Beta, (3) Kháng Aldosterone (MRA), (4) Ức chế SGLT2 (Dapagliflozin/Empagliflozin).',
        },
        children: [
          {
            id: 'hf-c1-class',
            label: 'Phân loại theo Phân suất tống máu (LVEF)',
            accentColor: '#8ab4f8',
            mastery: 'mastered',
            children: [
              {
                id: 'hf-c2-hfref',
                label: 'HFrEF (Suy tim EF giảm)',
                children: [
                  {
                    id: 'hf-c3-hfref-val',
                    label: 'LVEF <= 40% kèm triệu chứng cơ năng/thực thể của suy tim',
                    badge: 'diagnostic',
                  },
                ],
              },
              {
                id: 'hf-c2-hfmr',
                label: 'HFmrEF (EF giảm nhẹ) & HFpEF (EF bảo tồn)',
                children: [
                  {
                    id: 'hf-c3-hfpef-val',
                    label: 'HFmrEF: LVEF 41-49% | HFpEF: LVEF >= 50% kèm tăng NT-proBNP và rối loạn tâm trương',
                    badge: 'diagnostic',
                  },
                ],
              },
            ],
          },
          {
            id: 'hf-c1-gdmt',
            label: 'Điều trị Tứ trụ giảm tử vong trong HFrEF',
            accentColor: '#81c995',
            mastery: 'mastered',
            children: [
              {
                id: 'hf-c2-arni',
                label: 'Nhóm ARNI (Sacubitril/Valsartan) hoặc ACEi/ARB',
                children: [
                  {
                    id: 'hf-c3-arni-note',
                    label: 'Khởi trị sớm, lưu ý ngưng ACEi tối thiểu 36 giờ trước khi chuyển sang ARNI để tránh phù mạch',
                    badge: 'danger',
                  },
                ],
              },
              {
                id: 'hf-c2-sglt2',
                label: 'Nhóm Ức chế SGLT2 (Dapagliflozin / Empagliflozin)',
                children: [
                  {
                    id: 'hf-c3-sglt2-dose',
                    label: 'Liều chuẩn 10mg uống 1 lần/ngày bất kể có Đái tháo đường hay không, có lợi trên mọi mức EF',
                    badge: 'treatment',
                  },
                ],
              },
            ],
          },
        ],
      },
    },
  ],
};

export const AI_PROMPT_TEMPLATE = `Bạn là một Giáo sư Y khoa và Chuyên gia Giải phẫu bệnh / Lâm sàng. Hãy chuyển đổi nội dung bài học Y khoa tôi cung cấp bên dưới thành cấu trúc JSON chuẩn cho hệ thống sơ đồ tư duy phân cấp **MedMind Studio**.

### YÊU CẦU CẤU TRÚC PHÂN CẤP 4-5 TẦNG (CỰC KỲ QUAN TRỌNG):
- **Cấp 0 (Root Node)**: Tên bệnh lý hoặc Chủ đề bài học chính.
- **Cấp 1 (Nhánh trụ cột)**: Các phần lớn của bài học (VD: Đại cương, Cơ chế bệnh sinh, Triệu chứng Lâm sàng, Cận lâm sàng, Chẩn đoán, Điều trị, Tiên lượng...).
- **Cấp 2 (Nhánh phân nhóm)**: Các nhóm triệu chứng, giai đoạn bệnh, nhóm xét nghiệm hoặc nhóm thuốc chính.
- **Cấp 3 & Cấp 4 (Chi tiết sâu)**: Cơ chế phân tử, giải phẫu bệnh, tiêu chuẩn vàng, dấu hiệu cờ đỏ, liều lượng thuốc cụ thể. **Bắt buộc gắn nhãn phân loại y khoa (\`badge\`)** cho các node Cấp 3 & Cấp 4 theo 1 trong 5 giá trị sau:
  - \`"danger"\`: 🔴 Cờ đỏ lâm sàng, cấp cứu, chống chỉ định tuyệt đối, biến chứng tử vong.
  - \`"warning"\`: 🟡 Lưu ý lâm sàng, tác dụng phụ, biến chứng, yếu tố nguy cơ.
  - \`"treatment"\`: 🟢 Phác đồ điều trị, tên thuốc, liều lượng, nguyên tắc phẫu thuật.
  - \`"diagnostic"\`: 🔵 Tiêu chuẩn vàng, dấu hiệu mô bệnh học, cận lâm sàng, chẩn đoán xác định.
  - \`"mechanism"\`: 🟣 Cơ chế bệnh sinh, sinh lý bệnh, đột biến gen, giải phẫu bệnh.

### ĐỊNH DẠNG JSON ĐẦU RA (CHỈ TRẢ VỀ JSON HỢP LỆ):
\`\`\`json
{
  "title": "Tên Bài Học Y Khoa",
  "tags": ["Chuyên khoa", "Từ khóa 1", "Từ khóa 2"],
  "rootNode": {
    "id": "root-1",
    "label": "Tên Bệnh / Chủ Đề Chính (Cấp 0)",
    "summary": "Tóm tắt cốt lõi 1 câu về bệnh lý",
    "clinicalNotes": {
      "pathogenesis": "Tóm tắt cơ chế bệnh sinh cốt lõi...",
      "clinicalFeatures": "Triệu chứng lâm sàng và cận lâm sàng điển hình...",
      "redFlags": ["Dấu hiệu cờ đỏ 1", "Dấu hiệu cờ đỏ 2"],
      "treatment": "Nguyên tắc và phác đồ điều trị chuẩn...",
      "pearls": "Mẹo nhớ lâm sàng nhanh (Clinical Pearls)...",
      "markdown": "### Bảng phân biệt / Công thức tính y khoa chi tiết (nếu có)"
    },
    "children": [
      {
        "id": "level1-1",
        "label": "Tên Nhánh Trụ Cột (Cấp 1)",
        "summary": "Mô tả ngắn nhánh Cấp 1",
        "accentColor": "#8ab4f8",
        "clinicalNotes": {
          "pathogenesis": "Giải thích chuyên sâu cho nhánh này..."
        },
        "children": [
          {
            "id": "level2-1",
            "label": "Tên Nhánh Phân Nhóm (Cấp 2)",
            "children": [
              {
                "id": "level3-1",
                "label": "Chi tiết sâu Cấp 3 (cơ chế, liều thuốc, tiêu chuẩn...)",
                "badge": "mechanism",
                "clinicalNotes": {
                  "pearls": "Ghi chú lâm sàng sâu hơn khi click vào node..."
                },
                "children": [
                  {
                    "id": "level4-1",
                    "label": "Chi tiết Cấp 4 (nếu cần phân tích sâu hơn)",
                    "badge": "diagnostic"
                  }
                ]
              }
            ]
          }
        ]
      }
    ]
  }
}
\`\`\`

---
### NỘI DUNG TÀI LIỆU Y KHOA CẦN CHUYỂN ĐỔI:
[Dán nội dung bài giảng PDF / Word / Slide của bạn vào đây]`;

export const SAMPLE_MARKDOWN_IMPORT = `# Viêm tụy cấp (Acute Pancreatitis)
## Đại cương & Nguyên nhân
- Nguyên nhân hàng đầu (chiếm 80%)
  - Sỏi mật (Gallstones) kẹt cơ vòng Oddi gây trào ngược dịch mật [mechanism]
  - Lạm dụng rượu bia kéo dài làm tăng độ quánh dịch tụy [warning]
- Nguyên nhân ít gặp khác
  - Tăng Triglyceride máu nặng (> 1000 mg/dL hoặc > 11.3 mmol/L) [diagnostic]
  - Chấn thương bụng kín hoặc sau ERCP [warning]
## Chẩn đoán xác định (Tiêu chuẩn Atlanta hiệu chỉnh 2012)
- Cần tối thiểu 2 trong 3 tiêu chuẩn
  - Đau bụng cấp tính vùng thượng vị điển hình, lan ra sau lưng, giảm khi ngồi cúi người ra trước [diagnostic]
  - Amylase và/hoặc Lipase huyết thanh tăng >= 3 lần giới hạn trên bình thường [diagnostic]
    - Lipase có độ nhạy và độ đặc hiệu cao hơn, tồn tại lâu hơn Amylase [mechanism]
  - Hình ảnh học (CT cản quang, MRI hoặc Siêu âm) điển hình của viêm tụy cấp [diagnostic]
## Dấu hiệu Cờ đỏ & Tiên lượng nặng
- Dấu hiệu xuất huyết nội (Hiếm gặp nhưng tử vong cao)
  - Dấu Cullen (bầm tím quanh rốn) và Dấu Grey-Turner (bầm tím vùng hông lưng) [danger]
- Suy tạng kéo dài > 48 giờ (Theo thang điểm Marshall)
  - Sốc tuần hoàn (HA tâm thu < 90 mmHg), Suy hô hấp (PaO2/FiO2 <= 300), Suy thận cấp (Creatinin > 2.0 mg/dL) [danger]
## Nguyên tắc Điều trị
- Bồi phụ dịch tích cực sớm (Trong 12-24h đầu)
  - Ưu tiên dung dịch Ringer Lactate tốc độ 5-10 mL/kg/giờ (giảm viêm tốt hơn NaCl 0.9%) [treatment]
  - Theo dõi sát Hematocrit, BUN và lượng nước tiểu (> 0.5 mL/kg/giờ) để tránh quá tải dịch [warning]
- Kiểm soát đau & Dinh dưỡng
  - Giảm đau bậc thang (Opioid đường tĩnh mạch như Fentanyl/Meperidine) [treatment]
  - Cho ăn đường miệng sớm ngay khi giảm đau và hết buồn nôn giúp bảo vệ hàng rào niêm mạc ruột [treatment]
  - Không dùng kháng sinh dự phòng thường quy nếu không có bằng chứng nhiễm trùng hoại tử tụy [danger]`;
