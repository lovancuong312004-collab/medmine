# MedMind Studio — Hệ thống Sơ đồ Tư duy Y khoa Phân cấp Chuẩn NotebookLM

Ứng dụng quản lý và học tập kiến thức Y khoa chuyên sâu thông qua Sơ đồ tư duy tương tác ngang (Horizontal Interactive Tree) lấy cảm hứng từ Google NotebookLM, được nâng cấp với **Hệ thống Phân cấp Thị giác 5 tầng (Cấp 0 đến Cấp 4+)**, **Nhãn phân loại Y khoa (Semantic Medical Badges)**, **Bộ điều khiển Cấp độ (Level Controller)**, **Sidebar Quản lý Học phần 3 tầng** và cơ chế **AI Importer 3 Tab**.

---

## User Review & Critical Decisions

> [!IMPORTANT]
> Kế hoạch đã được cập nhật toàn diện theo yêu cầu phân cấp mới của bạn, kết hợp cùng các tùy chọn đã xác nhận trước đó:

- **Hệ thống Phân cấp Thị giác 5 Tầng (Level 0 -> Level 4+)**: Mỗi cấp độ trên sơ đồ có kích thước chữ, màu nền, độ dày viền và kiểu dáng riêng biệt để sinh viên Y nhìn vào biết ngay đâu là trụ cột chính, đâu là phân nhóm và đâu là chi tiết lâm sàng/phân tử.
- **Nhãn Phân loại Y khoa (Semantic Medical Badges)** & **Đếm nhánh ẩn (`+N`)**: Các node chi tiết (đặc biệt ở Cấp 3 & 4+) gắn kèm nhãn ngữ nghĩa (`danger`, `warning`, `treatment`, `diagnostic`, `mechanism`). Khi thu gọn một nhánh (`>`), hiển thị rõ badge số lượng node con đang ẩn bên trong (VD: `+5`).
- **Thanh lọc Cấp độ nhanh (Level Filter Bar)**: Đặt ngay trên thanh công cụ chính với các nút `[Chỉ Cấp 1]`, `[Đến Cấp 2]`, `[Đến Cấp 3]`, `[Mở tất cả]` giúp chuyển đổi tức thì giữa góc nhìn tổng quan và chi tiết sâu.
- **Quản lý Học phần 3 Tầng (3-Tier Curriculum Sidebar)**: Tổ chức chặt chẽ theo **Tầng 1 (Khối / Hệ cơ quan)** $\rightarrow$ **Tầng 2 (Học phần / Phân môn)** $\rightarrow$ **Tầng 3 (Bài học Mindmap + Trạng thái: Chưa học / Đang ôn / Đã thuộc)**.
- **Chế độ Ôn thi (Active Recall) theo Cấp độ**: Hỗ trợ tùy chọn *"Làm mờ từ Cấp 2 trở đi"* hoặc *"Làm mờ từ Cấp 3 trở đi"*, kết hợp mở khóa khi rê chuột/click và đánh dấu thuộc bài từng nhánh.
- **Lưu trữ LocalStorage + Supabase Sync + File JSON Backup**: Tự động lưu vào `LocalStorage`, hỗ trợ xuất/nhập toàn bộ kho dữ liệu `.json` và giữ sẵn tích hợp đồng bộ đám mây Supabase theo lựa chọn trước đó của bạn.

---

## 1. Overview & Core Concept

- **What It Does**: MedMind Studio giúp sinh viên Y khoa hệ thống hóa bệnh học phức tạp thành cây tư duy phân cấp chặt chẽ từ trái sang phải. Người học có thể thu phóng theo từng tầng kiến thức, xem chi tiết lâm sàng qua ngăn kéo bên phải (Medical Clinical Drawer) và tạo bài học mới chỉ trong vài giây bằng cách dán kết quả JSON/Markdown từ Gemini, ChatGPT hoặc Claude.
- **Target Audience / Persona**: Sinh viên Y khoa (Y1–Y6), Bác sĩ nội trú, Học viên ôn thi cần công cụ trực quan hóa cơ chế bệnh sinh, triệu chứng, cận lâm sàng và phác đồ điều trị.
- **Key Value**: Khắc phục hoàn toàn nhược điểm "các node trông giống hệt nhau gây rối mắt" của các công cụ mindmap thông thường bằng hệ thống phân cấp thị giác Y khoa chuyên biệt và bộ lọc độ sâu 1-click.

---

## 2. User Experience & Visual Design

### A. Hệ thống Phân cấp Thị giác trên Mindmap (Visual Level Hierarchy)
Sơ đồ mở rộng từ trái sang phải trên nền Dark Mode (`#131314`) với đường cong nối Bezier mượt mà (`#8ab4f8`):

| Cấp độ | Vai trò Y khoa | Thiết kế Thị giác & Typography | Thành phần Đi kèm |
| :--- | :--- | :--- | :--- |
| **Cấp 0 (Root Node)** | Tên Bệnh / Chủ đề chính | Chữ in đậm `16px`, nền tím than `#3f3c5c`, viền sáng `#8ab4f8` (`1.5px`), bo tròn `12px`, đổ bóng nổi bật | Nút đóng/mở tổng + Badge tổng số nhánh |
| **Cấp 1 (Nhánh trụ cột)** | Đại cương, Cơ chế, Lâm sàng, Cận lâm sàng, Điều trị... | Chữ `14px` Semi-Bold (`600`), nền `#2d2e30`, bo góc `10px`, **vạch màu đánh dấu bên trái (Left Accent Bar `4px`)** | Đánh số thứ tự tự động (`1.`, `2.`, `3.`...) + Nút `>` / `<` + Badge `+N` khi ẩn |
| **Cấp 2 (Nhánh phân nhóm)** | Triệu chứng cơ năng, Thực thể, Nhóm thuốc, Giai đoạn... | Chữ `13px` Medium (`500`), nền `#242528`, viền mảnh `#3c4043` (`1px`), bo góc `8px` | Chỉ báo ghi chú lâm sàng + Nút `>` / `<` + Badge `+N` khi ẩn |
| **Cấp 3 & Cấp 4+ (Chi tiết sâu)** | Cơ chế phân tử, Liều thuốc, Tiêu chuẩn vàng, Cờ đỏ... | Thiết kế nhỏ gọn (`12px`), nền `#1b1c1e`, tối ưu hiển thị đa dòng ngắn gọn | **Nhãn phân loại Y khoa (Semantic Badges)** + Trạng thái thuộc bài |

### B. Hệ thống Nhãn Phân loại Y khoa (Semantic Medical Badges)
Áp dụng cho các node (đặc biệt ở Cấp 3 & Cấp 4+) để nhận diện nhanh tính chất lâm sàng:
- 🔴 **`danger` (Cờ đỏ / Cấp cứu / Chống chỉ định)**: Viền/nhãn đỏ `#ef4444` (nền mờ `rgba(239, 68, 68, 0.14)`).
- 🟡 **`warning` (Lưu ý lâm sàng / Tác dụng phụ / Biến chứng)**: Viền/nhãn vàng cam `#f59e0b` (nền mờ `rgba(245, 158, 11, 0.14)`).
- 🟢 **`treatment` (Phác đồ / Thuốc / Liều lượng)**: Viền/nhãn xanh lá `#10b981` (nền mờ `rgba(16, 185, 129, 0.14)`).
- 🔵 **`diagnostic` (Tiêu chuẩn vàng / Cận lâm sàng)**: Viền/nhãn xanh dương `#3b82f6` (nền mờ `rgba(59, 130, 246, 0.14)`).
- 🟣 **`mechanism` (Cơ chế / Giải phẫu bệnh)**: Viền/nhãn tím `#a855f7` (nền mờ `rgba(168, 85, 247, 0.14)`).

### C. Điều khiển Sơ đồ, Bộ lọc Cấp độ & Khung Chi tiết Lâm sàng
1. **Thanh lọc cấp độ nhanh (Level Filter Bar — Góc trên Canvas)**:
   - Cụm nút chuyển đổi nhanh: `[Chỉ Cấp 1]`, `[Đến Cấp 2]`, `[Đến Cấp 3]`, `[Mở tất cả]`.
   - Khi bấm `[Chỉ Cấp 1]`, toàn bộ các node Cấp 1 sẽ đóng nhánh con lại và hiển thị badge số lượng nhánh ẩn (`+4`, `+6`...), giúp sinh viên nắm bắt khung sườn bài học ngay lập tức.
2. **Cụm nút điều khiển nổi góc trái (NotebookLM Floating Dock)**:
   - Phóng to (`+`), Thu nhỏ (`-`), Căn giữa toàn sơ đồ (`Fit View`), Mở/Đóng nhanh và Tải xuống (`Xuất Ảnh PNG` / `Xuất JSON`).
3. **Khung chi tiết Lâm sàng (Medical Clinical Drawer — Trượt bên phải)**:
   - **Đường dẫn phân cấp (Breadcrumb)**: Hiển thị rõ vị trí hiện tại `Cấp 0 > Cấp 1 > Cấp 2 > Cấp 3` (có thể click vào từng cấp trên breadcrumb để nhảy tới node cha).
   - **Nội dung chuyên sâu**: Hỗ trợ hiển thị Markdown, bảng biểu phân biệt chẩn đoán, công thức tính y khoa, cơ chế bệnh sinh, liều thuốc và lưu ý cờ đỏ.
   - **Chỉnh sửa trực tiếp (Direct Node Editor)**: Cho phép sửa tên node, đổi nhãn màu y khoa (`danger`, `warning`, `treatment`, `diagnostic`, `mechanism`), cập nhật ghi chú Markdown, thêm nhánh con cấp tiếp theo hoặc xóa nhánh.

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Tổ chức Sidebar Quản lý Học phần 3 Tầng (3-Tier Medical Hierarchy)**
  - *Chosen Approach*: Thiết kế cây thư mục 3 cấp rõ ràng:
    - **Tầng 1 (Khối / Hệ cơ quan)**: *Ung bướu*, *Cơ sở Y học*, *Hệ Tim mạch*, *Hệ Hô hấp*, *Hệ Tiêu hóa*, *Ngoại khoa*, *Sản - Nhi*...
    - **Tầng 2 (Học phần / Phân môn)**: *Bệnh học đại cương*, *Giải phẫu bệnh*, *Sinh lý bệnh*, *Nội bệnh lý*, *Dược lý lâm sàng*...
    - **Tầng 3 (Bài học Mindmap)**: Hiển thị tên bài học + trạng thái tiến độ (`Chưa học`, `Đang ôn`, `Đã thuộc`) + tỷ lệ `%` node đã nhớ.
  - *Why*: Phù hợp 100% với chương trình đào tạo Y khoa theo hệ cơ quan (System-based curriculum) và tiền lâm sàng/lâm sàng.
- **Decision 2: AI Importer Modal 3 Tab Chuẩn Hóa Phân Cấp**
  - *Chosen Approach*:
    - **Tab 1 — Dán JSON Chuẩn**: Tự động làm sạch mã, kiểm tra lỗi cấu trúc 4–5 tầng, nhận diện trường `badge` (`danger`, `warning`, `treatment`, `diagnostic`, `mechanism`) và `clinicalNotes` (hỗ trợ Markdown/bảng biểu).
    - **Tab 2 — Dán Markdown**: Tự động phân tích `#` (Cấp 0), `##` (Cấp 1), `-` (Cấp 2), `  -` (Cấp 3), `    -` (Cấp 4+) cùng cú pháp gắn nhãn nhanh (VD: `[danger]`, `[treatment]`) để dựng cây tức thì.
    - **Tab 3 — Copy Prompt mẫu cho AI**: Cung cấp sẵn câu lệnh Prompt chi tiết giải thích rõ quy tắc 4–5 cấp độ và 5 nhãn màu y khoa để người dùng copy sang Gemini/ChatGPT xử lý giáo trình PDF/Word.
- **Decision 3: Chế độ Ôn thi (Active Recall) Phân tầng**
  - *Chosen Approach*: Cho phép chọn mức độ thử thách: **"Làm mờ từ Cấp 2 trở đi"** (ôn khung bài học) hoặc **"Làm mờ từ Cấp 3 trở đi"** (ôn chi tiết cơ chế/liều thuốc). Hỗ trợ mở khóa tạm thời khi rê chuột hoặc click để lật mở cố định, kèm nút đánh dấu *Đã nhớ / Cần ôn lại*.

---

## 4. Technical Architecture & Data Strategy

### Architecture & Component Diagram

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                    MedMind Studio                                      │
├──────────────────────────┬───────────────────────────────────┬─────────────────────────┤
│  3-Tier Medical Sidebar  │   Hierarchical Mindmap Viewport   │ Medical Clinical Drawer │
│        (#1e1f20)         │             (#131314)             │        (#1e1f20)        │
├──────────────────────────┼───────────────────────────────────┼─────────────────────────┤
│ • Tìm kiếm toàn cục      │ • Top Level Controller Bar:       │ • Breadcrumb Phân cấp:  │
│   (Xuyên suốt 3 tầng)    │   [Chỉ Cấp 1] [Đến Cấp 2]         │   Cấp 0 > Cấp 1 > Cấp 2 │
│                          │   [Đến Cấp 3] [Mở tất cả]         │                         │
│ • Tầng 1: Hệ cơ quan     │ • Active Recall Selector:         │ • Nhãn Y khoa & Cấp độ: │
│   └─ Tầng 2: Phân môn    │   [Tắt | Mờ Cấp 2+ | Mờ Cấp 3+]   │   [🔴 Danger / Cấp 3]   │
│      └─ Tầng 3: Bài học  │ • Nút "+ Nhập bài học từ AI"      │                         │
│         [Chưa học]       │                                   │ • Ghi chú Chuyên sâu:   │
│         [Đang ôn]        │ • 5-Level Horizontal Tree Canvas: │   - Render Markdown,    │
│         [Đã thuộc]       │   - Cấp 0: Root (#3f3c5c, 16px)   │     Bảng biểu, Công thức│
│                          │   - Cấp 1: Trụ cột (1., 2. + Bar) │   - Cơ chế & Lâm sàng   │
│ • Quản lý Thêm Hệ/Môn    │   - Cấp 2: Phân nhóm (#242528)    │   - Phác đồ & Liều thuốc│
│ • Backup JSON & Supabase │   - Cấp 3-4+: Chi tiết + Badges   │                         │
│                          │   - Badge đếm nhánh ẩn (+5)       │ • Trình sửa Node &      │
│                          │                                   │   Thêm nhánh con trực   │
│                          │ • Left Floating Dock:             │   tiếp                  │
│                          │   [+] [-] [Fit] [PNG/JSON]        │                         │
└──────────────────────────┴─────────────────┬─────────────────┴─────────────────────────┘
                                             │
                      ┌──────────────────────┴──────────────────────┐
                      │         3-Tab AI Importer Modal             │
                      ├─────────────────────────────────────────────┤
                      │ • Tab 1: Dán JSON Chuẩn (4-5 cấp + Badges)  │
                      │ • Tab 2: Dán Markdown (#, ##, -, thụt lề)   │
                      │ • Tab 3: Copy Prompt Mẫu Chuẩn Phân Cấp     │
                      └─────────────────────────────────────────────┘
```

### Data Model & Sample Lesson ("Các đặc tính cơ bản của bệnh ung thư")
Bài học mẫu được khởi tạo sẵn trong **Tầng 1: Ung bướu** $\rightarrow$ **Tầng 2: Bệnh học đại cương** $\rightarrow$ **Tầng 3: Các đặc tính cơ bản của bệnh ung thư (Đang ôn)** với đầy đủ **4 cấp độ sâu**:
- **Cấp 0 (Root)**: `Các đặc tính cơ bản của bệnh ung thư`
- **Cấp 1 (5 Nhánh trụ cột có đánh số `1.` -> `5.` và vạch màu trái)**:
  1. `1. Tổn thương đa hình thái tế bào`
  2. `2. Tính chất xâm lấn`
  3. `3. Tính chất di căn`
  4. `4. Ung thư là bệnh mạn tính`
  5. `5. Tính chất hay tái phát`
- **Cấp 2 (Các nhánh phân nhóm chính)**:
  - Dưới nhánh 1: *Đa hình thái đại thể*, *Đa hình thái vi thể (Tế bào & Nhân)*, *Rối loạn cấu trúc mô học*.
  - Dưới nhánh 2: *Cơ chế sinh học xâm lấn*, *Đặc điểm lan rộng tại chỗ*, *Ý nghĩa lâm sàng & Phẫu thuật*.
  - Dưới nhánh 3: *Di căn đường bạch huyết*, *Di căn đường máu*, *Di căn theo đường kế cận & hố tự nhiên*.
  - Dưới nhánh 4: *Quá trình sinh ung thư đa giai đoạn*, *Thời gian tiềm ẩn lâm sàng*, *Chiến lược tầm soát sớm*.
  - Dưới nhánh 5: *Nguyên nhân tái phát sau điều trị*, *Phân loại tái phát*, *Theo dõi định kỳ sau điều trị*.
- **Cấp 3 & Cấp 4 (Chi tiết giải phẫu bệnh, cơ chế phân tử, đường di căn, ý nghĩa lâm sàng kèm Semantic Badges)**:
  - Gắn đầy đủ các nhãn `mechanism` (🟣 *Giảm biểu hiện E-cadherin làm mất kết dính gian bào*, *Tiết enzyme MMP phá hủy màng đáy*, *Đột biến gen sinh ung Oncogenes & gen đè nén bướu TP53, RB*), `diagnostic` (🔵 *Tỷ lệ Nhân/Bào tương N/C > 1/1, nhân quái, nhân chia bất thường*, *Sinh thiết mô bệnh học là tiêu chuẩn vàng*), `danger` (🔴 *Xâm lấn mạch máu lớn gây xuất huyết ồ ạt*, *Di căn não/phổi/gan/xương giai đoạn muộn*, *Tái phát tại chỗ hoặc di căn xa kháng trị*), `warning` (🟡 *Giai đoạn tiềm ẩn kéo dài 5–20 năm không triệu chứng*, *Tế bào ung thư ngủ đông - Dormant micrometastases*), và `treatment` (🟢 *Nguyên tắc phẫu thuật cắt rộng đảm bảo diện cắt âm tính R0*, *Điều trị đa mô thức: Phẫu thuật + Hóa trị + Xạ trị + Đích*).
  - Mỗi node đều tích hợp sẵn ghi chú Markdown chi tiết (bao gồm bảng phân biệt U lành vs U ác, công thức tính thời gian nhân đôi khối u, và lưu ý lâm sàng) hiển thị trong **Medical Clinical Drawer**.
