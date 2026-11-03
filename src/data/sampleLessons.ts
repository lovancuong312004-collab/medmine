import { MedMindDatabase, LessonMindmap } from '../types/mindmap';

export const OTITIS_MEDIA_ACUTE_LESSON: LessonMindmap = {
  id: 'lesson-vtg-cap-tinh-mu',
  title: 'Câu 1: Viêm tai giữa cấp tính (Trọng tâm: Viêm tai giữa cấp tính mủ)',
  systemId: 'sys-ent',
  subjectId: 'sub-ent-clin',
  status: 'Đang ôn',
  tags: ['Tai Mũi Họng', 'Viêm tai giữa cấp', 'Nhi khoa', 'Đề cương Tự luận'],
  updatedAt: '2026-11-03T12:00:00.000Z',
  rootNode: {
    id: 'vtg-cap-root',
    label: 'Câu 1: Viêm tai giữa cấp tính (Trọng tâm: Viêm tai giữa cấp tính mủ)',
    summary:
      'Viêm toàn bộ hệ thống hòm nhĩ – xương chũm trong khoảng 3 tuần đầu (các khoang chứa khí trong xương thái dương thông với nhau nên viêm có thể lan đến các nhóm tế bào xương chũm).',
    mastery: 'untested',
    clinicalNotes: {
      pathogenesis:
        'Các khoang chứa khí trong xương thái dương (vòi nhĩ – hòm nhĩ – sào đạo – sào bào – các nhóm thông bào xương chũm) thông thương trực tiếp với nhau, nên quá trình viêm niêm mạc tai giữa dễ dàng lan đến các nhóm tế bào của xương chũm.',
      clinicalFeatures:
        'Diễn biến điển hình qua 2 giai đoạn: (1) Giai đoạn khởi phát (xung huyết màng nhĩ dọc cán búa/màng chùng) -> (2) Giai đoạn toàn phát gồm Thời kỳ ứ mủ (sốt 39-40°C, đau tai dữ dội theo nhịp mạch, màng nhĩ phồng mặt kính đồng hồ / hình vú bò) và Thời kỳ vỡ mủ (ngày thứ 4, giảm đau giảm sốt, ống tai đầy mủ, soi thấy lỗ thủng màng nhĩ).',
      redFlags: [
        'Sốt cao 39-40°C kéo dài, trẻ nhỏ co giật, quấy khóc, bỏ ăn, rối loạn tiêu hóa (70-80% trẻ ỉa chảy, sống phân, nôn trớ)',
        'Ấn vùng sào bào / sau tai đau chói, sưng nề sau tai (nghi ngờ Viêm xương chũm cấp)',
        'Biến chứng nội sọ nguy kịch: Viêm màng não, Áp xe não, Viêm tắc tĩnh mạch bên, Liệt mặt ngoại biên (dây VII), Viêm mê nhĩ',
      ],
      treatment:
        'Khởi phát: Co mạch mũi + Nhỏ tai giảm đau sung huyết + Kháng sinh toàn thân. Thời kỳ ứ mủ: Chích rạch màng nhĩ góc 1/4 sau dưới dẫn lưu mủ + Kháng sinh β-lactam (Amoxicillin, Ampicillin) hoặc Macrolid (Erythromycin). Thời kỳ vỡ mủ: Làm thuốc tai hàng ngày (oxy già loãng, kháng sinh tại chỗ) + Mở rộng lỗ thủng nếu tự vỡ quá nhỏ.',
      pearls:
        'Quy tắc vàng: Thời kỳ ứ mủ BẮT BUỘC chủ động chích rạch màng nhĩ ở 1/4 sau dưới (lỗ thủng rộng, bờ mỏng, dễ thoát mủ, liền sẹo tốt). Không để tự vỡ (lỗ thủng nhỏ, bờ dày, dẫn lưu kém, dễ thành VTG mạn hoặc biến chứng xương chũm).',
    },
    children: [
      // ==================== NHÁNH 1: ĐỊNH NGHĨA ====================
      {
        id: 'vtg-c1-def',
        label: '1. Định nghĩa Viêm tai giữa cấp tính',
        accentColor: '#8ab4f8',
        children: [
          {
            id: 'vtg-c2-def-core',
            label: '1.1. Bản chất bệnh học & Phạm vi giải phẫu',
            children: [
              {
                id: 'vtg-c3-def-1',
                label: 'Quá trình viêm toàn bộ hệ thống hòm nhĩ – xương chũm: Không có bệnh sinh và căn bệnh đặc hiệu nào',
                badge: 'mechanism',
              },
              {
                id: 'vtg-c3-def-2',
                label: 'Liên thông giải phẫu xương thái dương: Vì những khoang chứa khí trong xương thái dương thông với nhau nên quá trình viêm có thể lan đến các nhóm tế bào của xương chũm',
                badge: 'mechanism',
              },
            ],
          },
          {
            id: 'vtg-c2-def-time',
            label: '1.2. Mốc thời gian chẩn đoán Viêm tai giữa cấp',
            children: [
              {
                id: 'vtg-c3-def-3',
                label: 'Thời gian diễn biến cấp tính: VTG cấp là quá trình viêm xảy ra trong khoảng 3 tuần đầu',
                badge: 'diagnostic',
              },
            ],
          },
        ],
      },

      // ==================== NHÁNH 2: NGUYÊN NHÂN VTG CẤP TÍNH MỦ ====================
      {
        id: 'vtg-c1-cause',
        label: '2. Nguyên nhân Viêm tai giữa cấp tính mủ (2.1)',
        accentColor: '#c58af9',
        children: [
          {
            id: 'vtg-c2-cause-1',
            label: '2.1.1. Viêm nhiễm ở mũi họng (Nguyên nhân chính)',
            children: [
              {
                id: 'vtg-c3-cause-1a',
                label: 'Thường gặp nhất: Viêm V.A, viêm mũi xoang, viêm họng lan lên tai giữa qua vòi nhĩ (Eustachian)',
                badge: 'mechanism',
              },
            ],
          },
          {
            id: 'vtg-c2-cause-2',
            label: '2.1.2. Các bệnh nhiễm trùng lây toàn thân',
            children: [
              {
                id: 'vtg-c3-cause-2a',
                label: 'Cần đặc biệt chú ý: Cúm, Sởi... (độc lực cao, dễ gây hoại tử màng nhĩ rộng)',
                badge: 'warning',
              },
            ],
          },
          {
            id: 'vtg-c2-cause-3',
            label: '2.1.3. Tắc nghẽn cơ học vòi nhĩ',
            children: [
              {
                id: 'vtg-c3-cause-3a',
                label: 'Khối u vòm mũi họng & Polyp mũi: Chèn ép lỗ vòi nhĩ gây ứ đọng dịch và nhiễm khuẩn hòm nhĩ',
                badge: 'mechanism',
              },
              {
                id: 'vtg-c3-cause-3b',
                label: 'Can thiệp y tế: Cần chú ý những trường hợp nhét mèche mũi sau quá lâu',
                badge: 'warning',
              },
            ],
          },
          {
            id: 'vtg-c2-cause-4',
            label: '2.1.4. Chấn thương gây rách, thủng màng nhĩ',
            children: [
              {
                id: 'vtg-c3-cause-4a',
                label: 'Chấn thương trực tiếp & Áp lực: Ngoáy tai bằng vật cứng, chấn thương do tiếng nổ, sức ép làm vi khuẩn từ ống tai ngoài xâm nhập thẳng vào hòm nhĩ',
                badge: 'danger',
              },
            ],
          },
        ],
      },

      // ==================== NHÁNH 3: TRIỆU CHỨNG LÂM SÀNG (2.2) ====================
      {
        id: 'vtg-c1-sym',
        label: '3. Triệu chứng Lâm sàng theo Giai đoạn (2.2)',
        accentColor: '#81c995',
        children: [
          {
            id: 'vtg-c2-sym-init',
            label: '2.2.1. Giai đoạn Khởi phát (Xung huyết màng nhĩ)',
            children: [
              {
                id: 'vtg-c3-sym-init-1',
                label: 'Bối cảnh & Toàn thân: Bệnh nhân đang viêm mũi họng (sốt, ngạt mũi, chảy mũi, ho; một số có rối loạn tiêu hóa)',
                badge: 'diagnostic',
              },
              {
                id: 'vtg-c3-sym-init-2',
                label: 'Triệu chứng Cơ năng tai: Đột nhiên xuất hiện đau tai (đau sâu trong tai), ù tai, nghe kém',
                badge: 'diagnostic',
              },
              {
                id: 'vtg-c3-sym-init-3',
                label: 'Thực thể (Soi màng nhĩ): Màng nhĩ đỏ, xung huyết dọc theo cán xương búa hoặc ở màng chùng (Shrapnell)',
                badge: 'diagnostic',
              },
            ],
          },
          {
            id: 'vtg-c2-sym-pus',
            label: '2.2.2a. Giai đoạn Toàn phát — Thời kỳ Ứ mủ (Triệu chứng rầm rộ)',
            children: [
              {
                id: 'vtg-c3-sym-pus-all',
                label: 'Triệu chứng Toàn thân: Sốt cao 39–40°C kéo dài, mệt mỏi, ngủ ít, kém ăn, suy nhược',
                badge: 'danger',
                children: [
                  {
                    id: 'vtg-c4-sym-pus-child1',
                    label: 'Đặc điểm ở trẻ nhỏ: Có thể co giật, quấy khóc, bỏ ăn (đưa tay lên tai đau hoặc lắc đầu)',
                    badge: 'danger',
                  },
                  {
                    id: 'vtg-c4-sym-pus-child2',
                    label: 'Rối loạn tiêu hóa đi kèm: 70–80% trẻ nhỏ có ỉa chảy, sống phân hoặc nôn trớ',
                    badge: 'warning',
                  },
                ],
              },
              {
                id: 'vtg-c3-sym-pus-func',
                label: 'Triệu chứng Cơ năng: Đau tai dữ dội ngày càng tăng, đau sâu trong tai, đau theo nhịp đập của mạch, lan ra thái dương – nửa đầu – sau tai (rất sợ cử động đầu); nghe kém rõ, ù tai tiếng trầm',
                badge: 'danger',
              },
              {
                id: 'vtg-c3-sym-pus-exam',
                label: 'Thực thể (Soi tai & Khám): Màng nhĩ dày, mất bóng, xóa hết mốc giải phẫu (không thấy tam giác sáng, cán xương búa)',
                badge: 'diagnostic',
                children: [
                  {
                    id: 'vtg-c4-sym-pus-ex1',
                    label: 'Hình thái màng nhĩ căng phồng: Màu đỏ sẫm hoặc vàng nhạt; phồng toàn bộ kiểu "mặt kính đồng hồ" hoặc phồng một phần kiểu "hình vú bò" (thường ở góc sau trên)',
                    badge: 'diagnostic',
                  },
                  {
                    id: 'vtg-c4-sym-pus-ex2',
                    label: 'Điểm đau thực thể: Ấn nắp tai và vùng sào bào có phản ứng đau rõ rệt',
                    badge: 'danger',
                  },
                ],
              },
            ],
          },
          {
            id: 'vtg-c2-sym-rupt',
            label: '2.2.2b. Giai đoạn Toàn phát — Thời kỳ Vỡ mủ (Thường từ ngày thứ 4)',
            children: [
              {
                id: 'vtg-c3-sym-rupt-mech',
                label: 'Cơ chế thoát mủ: Do mủ ứ đọng trong hòm nhĩ tự phá vỡ màng nhĩ hoặc do thầy thuốc chích rạch màng nhĩ tháo mủ',
                badge: 'mechanism',
              },
              {
                id: 'vtg-c3-sym-rupt-sub',
                label: 'Toàn thân & Cơ năng giảm hẳn: Hết đau tai, nhiệt độ giảm, ăn ngủ được, hết rối loạn tiêu hóa; chỉ còn ù tai và nghe kém',
                badge: 'diagnostic',
              },
              {
                id: 'vtg-c3-sym-rupt-obj',
                label: 'Thực thể (Soi tai sau khi lau sạch mủ loãng vàng nhạt -> đặc vàng): Hình thái lỗ thủng màng nhĩ tùy nguyên nhân',
                badge: 'diagnostic',
                children: [
                  {
                    id: 'vtg-c4-rupt-1',
                    label: 'Đã chích rạch màng nhĩ: Lỗ thủng rộng ở góc 1/4 sau dưới, bờ mỏng, mủ thoát ra dễ dàng',
                    badge: 'treatment',
                  },
                  {
                    id: 'vtg-c4-rupt-2',
                    label: 'Để tự vỡ mủ: Lỗ thủng nhỏ, bờ dày, nằm ở bất kỳ vị trí nào trên màng nhĩ (dẫn lưu kém)',
                    badge: 'warning',
                  },
                  {
                    id: 'vtg-c4-rupt-3',
                    label: 'Do Cúm / Sởi / Chấn thương: Cúm (dát xuất huyết màng nhĩ & ống tai ngoài, lỗ thủng nhỏ); Sởi (lỗ thủng rộng, bờ nham nhở); Chấn thương (lỗ thủng bờ nham nhở, tụ máu xung quanh)',
                    badge: 'diagnostic',
                  },
                ],
              },
            ],
          },
        ],
      },

      // ==================== NHÁNH 4: TIẾN TRIỂN & BIẾN CHỨNG (2.3) ====================
      {
        id: 'vtg-c1-prog',
        label: '4. Tiến triển & Biến chứng của VTG mủ cấp (2.3)',
        accentColor: '#f28b82',
        children: [
          {
            id: 'vtg-c2-prog-good',
            label: '2.3.1. Tiến triển lành tính (Khi được điều trị tốt)',
            children: [
              {
                id: 'vtg-c3-prog-good-1',
                label: 'Khỏi hoàn toàn trong ≤ 3 tuần: Mủ giảm dần rồi khô hẳn, lỗ thủng nhỏ liền sẹo, màng nhĩ trở lại bình thường, không ảnh hưởng sức nghe',
                badge: 'treatment',
              },
            ],
          },
          {
            id: 'vtg-c2-prog-bad',
            label: '2.3.2. Tiến triển xấu & Biến chứng (Khi không điều trị / điều trị sai)',
            children: [
              {
                id: 'vtg-c3-prog-bad-1',
                label: 'Mạn tính hóa & Lan xương chũm: Chuyển sang Viêm tai giữa mạn tính (thường là VTG mạn tính mủ nhầy) hoặc Viêm xương chũm cấp/mạn tính',
                badge: 'warning',
              },
              {
                id: 'vtg-c3-prog-bad-2',
                label: 'Biến chứng nội sọ & Thần kinh nguy kịch: Viêm màng não, Áp xe não, Viêm tắc tĩnh mạch bên, Liệt mặt ngoại biên (dây VII), Viêm mê nhĩ',
                badge: 'danger',
              },
              {
                id: 'vtg-c3-prog-bad-3',
                label: 'Nguy cơ tử vong ở trẻ nhỏ: Sốt cao kéo dài + ỉa chảy mất nước + nhiễm độc nặng có thể dẫn tới tử vong',
                badge: 'danger',
              },
            ],
          },
        ],
      },

      // ==================== NHÁNH 5: CHẨN ĐOÁN (2.4) ====================
      {
        id: 'vtg-c1-diag',
        label: '5. Chẩn đoán Xác định & Phân biệt (2.4)',
        accentColor: '#fdd663',
        children: [
          {
            id: 'vtg-c2-diag-confirm',
            label: '2.4.1. Chẩn đoán xác định',
            children: [
              {
                id: 'vtg-c3-diag-conf-1',
                label: 'Kết hợp Lâm sàng & Soi tai: Dựa vào triệu chứng toàn thân, cơ năng và hình ảnh màng nhĩ đặc trưng qua từng giai đoạn (Xung huyết -> Ứ mủ phồng mặt kính đồng hồ/vú bò -> Vỡ mủ)',
                badge: 'diagnostic',
              },
            ],
          },
          {
            id: 'vtg-c2-diag-diff',
            label: '2.4.2. Chẩn đoán phân biệt (3 bệnh lý dễ nhầm)',
            children: [
              {
                id: 'vtg-c3-diag-diff-1',
                label: 'Nhọt ống tai ngoài (hoặc Viêm ống tai ngoài cấp): Đau tăng dữ dội khi nhai/kéo vành tai/ấn nắp tai, soi thấy nhọt ở ống tai ngoài, màng nhĩ bình thường',
                badge: 'diagnostic',
              },
              {
                id: 'vtg-c3-diag-diff-2',
                label: 'Viêm tấy hạch hoặc tổ chức liên kết sau tai: Sưng đỏ đau sau tai nhưng soi màng nhĩ bình thường (cần phân biệt với phản ứng xương chũm)',
                badge: 'diagnostic',
              },
              {
                id: 'vtg-c3-diag-diff-3',
                label: 'Viêm tai giữa cấp tính xuất tiết dịch thấm: Không sốt cao kịch phát, màng nhĩ lõm hoặc có mức dịch/bóng khí sau màng nhĩ, không thủng chảy mủ',
                badge: 'diagnostic',
              },
            ],
          },
        ],
      },

      // ==================== NHÁNH 6: ĐIỀU TRỊ THEO GIAI ĐOẠN (2.5) ====================
      {
        id: 'vtg-c1-treat',
        label: '6. Phác đồ Điều trị theo Giai đoạn (2.5)',
        accentColor: '#5eead4',
        children: [
          {
            id: 'vtg-c2-treat-init',
            label: '2.5.1. Điều trị Giai đoạn Khởi phát (Xung huyết)',
            children: [
              {
                id: 'vtg-c3-treat-init-1',
                label: 'Điều trị tại chỗ Mũi & Tai: Nhỏ mũi thuốc co mạch (thông vòi nhĩ) + Nhỏ tai thuốc giảm đau chống sung huyết (Glycerin borat 2%, Otipax...)',
                badge: 'treatment',
              },
              {
                id: 'vtg-c3-treat-init-2',
                label: 'Điều trị toàn thân & Nâng đỡ: Kháng sinh, chống viêm, hạ sốt, giảm đau; ăn nhẹ dễ tiêu, bù nước – điện giải nếu trẻ có ỉa chảy',
                badge: 'treatment',
              },
            ],
          },
          {
            id: 'vtg-c2-treat-pus',
            label: '2.5.2. Điều trị Giai đoạn Toàn phát — Thời kỳ Ứ mủ',
            children: [
              {
                id: 'vtg-c3-treat-pus-1',
                label: 'Thủ thuật ngoại khoa bắt buộc: Chích rạch màng nhĩ ở vị trí 1/4 sau dưới để chủ động dẫn lưu mủ và giải áp hòm nhĩ ngay',
                badge: 'treatment',
              },
              {
                id: 'vtg-c3-treat-pus-2',
                label: 'Kháng sinh toàn thân & Triệu chứng: Ưu tiên nhóm β-lactam (Amoxicillin, Ampicillin), nếu dị ứng dùng Macrolid (Erythromycin); kèm hạ sốt, giảm đau, chống viêm',
                badge: 'treatment',
              },
            ],
          },
          {
            id: 'vtg-c2-treat-rupt',
            label: '2.5.3. Điều trị Giai đoạn Toàn phát — Thời kỳ Vỡ mủ',
            children: [
              {
                id: 'vtg-c3-treat-rupt-1',
                label: 'Chăm sóc tại chỗ hàng ngày (Rất quan trọng): Lau sạch mủ hoặc rửa bằng oxy già (H₂O₂) loãng, nhỏ kháng sinh tại chỗ không độc tai trong (Rifamycin, Ciplox...)',
                badge: 'treatment',
              },
              {
                id: 'vtg-c3-treat-rupt-2',
                label: 'Đảm bảo dẫn lưu & Toàn thân: Nếu lỗ thủng tự vỡ quá nhỏ gây ứ đọng mủ -> phải chích rạch rộng thêm lỗ thủng; tiếp tục kháng sinh, chống viêm và nâng cao thể trạng',
                badge: 'treatment',
              },
            ],
          },
        ],
      },
    ],
  },
};

export const INITIAL_MEDMIND_DATA: MedMindDatabase = {
  systems: [
    { id: 'sys-ent', name: 'Tai Mũi Họng', iconName: 'Stethoscope' },
    { id: 'sys-oncology', name: 'Ung bướu', iconName: 'Dna' },
    { id: 'sys-basic', name: 'Cơ sở Y học', iconName: 'Microscope' },
    { id: 'sys-cardio', name: 'Hệ Tim mạch', iconName: 'HeartPulse' },
    { id: 'sys-resp', name: 'Hệ Hô hấp', iconName: 'Wind' },
    { id: 'sys-surg', name: 'Ngoại khoa', iconName: 'Scissors' },
    { id: 'sys-obped', name: 'Sản - Nhi', iconName: 'Baby' },
  ],
  subjects: [
    { id: 'sub-ent-clin', systemId: 'sys-ent', name: 'Bệnh học Tai Mũi Họng', code: 'ENT301' },
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
    OTITIS_MEDIA_ACUTE_LESSON,
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

export const AI_PROMPT_TEMPLATE = `Bạn là một Giáo sư Y khoa đầu ngành. Hãy chuyển đổi toàn bộ nội dung bài học Y khoa tôi cung cấp bên dưới thành cấu trúc JSON chuẩn cho hệ thống sơ đồ tư duy & luyện thi tự luận **MedMind Studio**.

### 1. 4 QUY TẮC SỐNG CÒN (TUYỆT ĐỐI TUÂN THỦ ĐỂ SƠ ĐỒ KHÔNG BỊ "NGHỆ ẢO" HAY MẤT Ý):
1. **GIỮ NGUYÊN 100% BỐ CỤC MỤC LỚN CỦA TÀI LIỆU GỐC (KHÔNG GỘP BỪA, KHÔNG NHẢY CÓC):**
   - Tài liệu có mục nào thì tạo Nhánh Cấp 1 đúng theo thứ tự đó (Ví dụ: **1. Định nghĩa** -> **2. Nguyên nhân** -> **3. Triệu chứng** -> **4. Tiến triển & Biến chứng** -> **5. Chẩn đoán** -> **6. Điều trị**).
   - **TUYỆT ĐỐI KHÔNG** bỏ qua phần **1. Định nghĩa** hoặc nhét Định nghĩa vào chung với Nguyên nhân rồi nhảy thẳng vào liệt kê nguyên nhân! Mọi câu trong phần Định nghĩa phải được tách thành các nhánh con rõ ràng trong Nhánh 1.
2. **CẤM VIẾT DÒNG TÓM TẮT RÁC (\`summary\`) Ở DƯỚI Ô LỚN CẤP 1 VÀ CẤP 2:**
   - Chỉ duy nhất \`rootNode\` (Cấp 0) được phép có \`"summary"\` (tóm tắt cốt lõi toàn bài).
   - Ở tất cả các node **Cấp 1, Cấp 2, Cấp 3, Cấp 4**: **TUYỆT ĐỐI KHÔNG ĐƯỢC TẠO TRƯỜNG \`"summary"\`** (không viết những câu nhận xét sáo rỗng kiểu *"Định nghĩa bệnh học và các yếu tố nguy cơ..."*, *"Nguyên nhân chính và thường gặp nhất"* ở dưới ô lớn).
3. **100% KIẾN THỨC Y KHOA PHẢI HIỂN THỊ TRỰC TIẾP TRÊN SƠ ĐỒ (\`children\` -> \`label\`):**
   - **TUYỆT ĐỐI CẤM** tạo một node rỗng chỉ có tiêu đề chung chung (như \`"Triệu chứng Toàn thân"\`, \`"Triệu chứng Cơ năng"\`, \`"Kháng sinh toàn thân"\`) rồi giấu nội dung thực tế vào trong \`clinicalNotes\`!
   - Mọi triệu chứng, số liệu (39–40°C, 70–80%, 3 tuần, 1/4 sau dưới...), cơ chế, tên thuốc và liều lượng **BẮT BUỘC phải nằm trực tiếp trong \`label\` của Cấp 3 và Cấp 4** theo cấu trúc chuẩn Barem chấm thi:
     \`"Từ khóa Y khoa chính: Nội dung chi tiết đầy đủ, rõ ràng, không cắt xén"\`
     *(Ví dụ: \`"Triệu chứng Toàn thân: Sốt cao 39–40°C kéo dài, mệt mỏi, ngủ ít, kém ăn, suy nhược"\`, và tạo tiếp nhánh con Cấp 4 cho các ý nhỏ hơn).*
4. **GẮN NHÃN MÀU Y KHOA (\`badge\`) CHO CÁC NODE CẤP 3 & CẤP 4:**
   - \`"danger"\`: 🔴 Cờ đỏ lâm sàng, cấp cứu, biến chứng nặng/tử vong, triệu chứng rầm rộ.
   - \`"warning"\`: 🟡 Lưu ý lâm sàng, yếu tố nguy cơ, tiến triển mạn tính.
   - \`"treatment"\`: 🟢 Phác đồ điều trị, thủ thuật (chích rạch màng nhĩ...), tên thuốc, chăm sóc tại chỗ.
   - \`"diagnostic"\`: 🔵 Tiêu chuẩn chẩn đoán xác định, chẩn đoán phân biệt, dấu hiệu soi khám thực thể.
   - \`"mechanism"\`: 🟣 Định nghĩa, cơ chế bệnh sinh, liên thông giải phẫu.

### 2. QUY TẮC CÚ PHÁP JSON NGHIÊM NGẶT:
- Chỉ trả về **1 khối mã JSON duy nhất** hợp lệ.
- Tuyệt đối **KHÔNG ngắt dòng (Enter) trực tiếp bên trong chuỗi \`"..."\`**.

### 3. MẪU ĐỊNH DẠNG JSON ĐẦU RA CHUẨN 100%:
\`\`\`json
{
  "title": "Câu 1: Tên Bài Học Y Khoa Đầy Đủ",
  "tags": ["Chuyên khoa", "Đề cương Tự luận"],
  "rootNode": {
    "id": "root-1",
    "label": "Câu 1: Tên Bệnh / Chủ Đề Chính (Cấp 0)",
    "summary": "Định nghĩa cốt lõi và trọng tâm bài học trong 1-2 câu chuẩn giáo trình.",
    "clinicalNotes": {
      "pathogenesis": "Tóm tắt cơ chế bệnh sinh và giải phẫu liên quan...",
      "clinicalFeatures": "Tóm tắt chuỗi diễn biến lâm sàng qua các giai đoạn...",
      "redFlags": ["Dấu hiệu cờ đỏ / biến chứng nguy kịch 1", "Dấu hiệu cờ đỏ 2"],
      "treatment": "Tóm tắt phác đồ điều trị theo từng giai đoạn...",
      "pearls": "Mẹo nhớ lâm sàng & quy tắc vàng khi thi tự luận..."
    },
    "children": [
      {
        "id": "c1-def",
        "label": "1. Định nghĩa",
        "accentColor": "#8ab4f8",
        "children": [
          {
            "id": "c2-def-1",
            "label": "1.1. Bản chất bệnh học & Giải phẫu",
            "children": [
              {
                "id": "c3-def-1a",
                "label": "Khái niệm cốt lõi: Ghi đầy đủ từng chữ định nghĩa trong giáo trình, không bỏ sót",
                "badge": "mechanism"
              },
              {
                "id": "c3-def-1b",
                "label": "Đặc điểm lan truyền / Mốc thời gian: Ghi đầy đủ mốc thời gian (VD: trong khoảng 3 tuần đầu)",
                "badge": "diagnostic"
              }
            ]
          }
        ]
      },
      {
        "id": "c1-cause",
        "label": "2. Nguyên nhân",
        "accentColor": "#c58af9",
        "children": [
          {
            "id": "c2-cause-1",
            "label": "2.1. Nhóm nguyên nhân chính",
            "children": [
              {
                "id": "c3-cause-1a",
                "label": "Từ khóa nguyên nhân: Chi tiết đầy đủ các bệnh lý cụ thể trong bài (VD: viêm V.A, viêm mũi xoang, viêm họng...)",
                "badge": "mechanism"
              }
            ]
          }
        ]
      },
      {
        "id": "c1-sym",
        "label": "3. Triệu chứng Lâm sàng",
        "accentColor": "#81c995",
        "children": [
          {
            "id": "c2-sym-stage1",
            "label": "3.1. Giai đoạn / Thời kỳ bệnh cụ thể",
            "children": [
              {
                "id": "c3-sym-all",
                "label": "Triệu chứng Toàn thân: Ghi trực tiếp toàn bộ triệu chứng toàn thân ra đây (VD: Sốt cao 39-40°C kéo dài, mệt mỏi, suy nhược...)",
                "badge": "danger",
                "children": [
                  {
                    "id": "c4-sym-sub1",
                    "label": "Biểu hiện ở trẻ nhỏ / Rối loạn kèm theo: Ghi chi tiết số liệu (VD: 70-80% trẻ có ỉa chảy, sống phân, co giật...)",
                    "badge": "warning"
                  }
                ]
              },
              {
                "id": "c3-sym-func",
                "label": "Triệu chứng Cơ năng: Ghi trực tiếp tính chất đau, hướng lan, ù tai, nghe kém...",
                "badge": "danger"
              },
              {
                "id": "c3-sym-exam",
                "label": "Triệu chứng Thực thể (Khám / Soi): Ghi trực tiếp hình ảnh tổn thương thực thể",
                "badge": "diagnostic"
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
