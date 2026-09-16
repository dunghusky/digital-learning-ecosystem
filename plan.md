# Hệ sinh thái học tập số – Làng nghề Quảng Trị

> **“Số hóa di sản – Đánh thức tình yêu quê hương.”**

## 1. Tầm nhìn & mục tiêu

- Chuỗi giá trị: **Tìm hiểu → Số hóa → Kể chuyện → Quảng bá → Giáo dục → Bảo tồn → Phát triển**.
- Điểm cốt lõi: không chỉ giới thiệu làng nghề, mà **chứng minh công nghệ số giúp học sinh học Ngữ văn sâu hơn** thông qua văn hóa quê hương (tư liệu làng nghề → bài học Ngữ văn địa phương → sản phẩm sáng tạo của học sinh).
- Phạm vi: **tỉnh Quảng Trị mới** (sau sáp nhập 01/7/2025, gồm cả địa bàn Quảng Bình cũ).
- Trường thí điểm: **Trường Tiểu học và THCS Thiện Thành, xã Diên Sanh, tỉnh Quảng Trị**. Học sinh gồm cả tiểu học (môn Tiếng Việt) và THCS (môn Ngữ văn).
- Thời hạn: **demo / hoàn thành đề tài vào tháng 1/2027**.
- Mục tiêu đo được: số làng nghề được số hóa, số tư liệu, số bài học, số sản phẩm học sinh, kết quả quiz, khảo sát trước/sau về hiểu biết & tình cảm với quê hương.

## 2. Đối tượng người dùng & vai trò

| Vai trò | Quyền chính |
|---|---|
| Khách (không đăng nhập) | Xem bản đồ, làng nghề, tư liệu đã xuất bản, quét QR, làm quiz công khai |
| Học sinh | + Làm bài học/quiz có lưu điểm, nộp bài (bài viết, ảnh, video), check-in QR, nhận huy hiệu |
| Giáo viên | + Quản lý lớp, tạo bài học & quiz, giao nhiệm vụ, chấm & duyệt bài học sinh |
| Nghệ nhân / đại diện làng nghề | + Cập nhật thông tin làng nghề, sản phẩm, sự kiện của mình (qua kiểm duyệt) |
| Biên tập viên / Kiểm duyệt | Duyệt mọi nội dung trước khi xuất bản công khai |
| Quản trị viên | Quản lý người dùng, trường/lớp, danh mục, cấu hình hệ thống |

> Giai đoạn thí điểm (1 trường): **không có đăng ký tự do**. Tài khoản học sinh/giáo viên do quản trị viên nhà trường tạo.

## 3. Các phân hệ chức năng

1. **Bản đồ số làng nghề** – bản đồ tương tác (Leaflet + OpenStreetMap), lọc theo loại nghề / địa bàn / khu vực (Quảng Trị cũ – Quảng Bình cũ), bấm vào điểm → hồ sơ làng nghề.
2. **Hồ sơ làng nghề** – lịch sử, quy trình làm nghề, sản phẩm, nghệ nhân, thư viện ảnh/video, tư liệu văn học liên quan, mã QR riêng.
3. **Mã QR** – mỗi làng nghề / sản phẩm / điểm tham quan có QR → mở trang tương ứng trên điện thoại; quét QR = check-in (cho học sinh đã đăng nhập).
4. **Kho tư liệu số** – truyền thuyết, truyện kể, ca dao, tục ngữ, bài viết, phóng sự, ảnh, video, ghi âm phỏng vấn nghệ nhân; gắn thẻ theo làng nghề, thể loại, chủ đề; tìm kiếm tiếng Việt có/không dấu.
5. **Góc kể chuyện của học sinh** – học sinh nộp bài viết, ảnh, video/phóng sự ngắn → giáo viên nhận xét, duyệt → xuất bản lên kho tư liệu (ghi rõ tác giả, lớp, trường).
6. **Bài học Ngữ văn / Tiếng Việt địa phương** (THCS / tiểu học) – giáo viên soạn bài học gắn với tư liệu (mục tiêu, nội dung đọc hiểu, nhiệm vụ, phiếu học tập, sản phẩm đầu ra); giao cho lớp, theo dõi tiến độ.
7. **Quiz & trò chơi tương tác** – trắc nghiệm, ghép cặp, điền khuyết ca dao/tục ngữ, đoán sản phẩm qua hình; bảng xếp hạng lớp/trường.
8. **Gamification** – điểm, huy hiệu, “Hộ chiếu làng nghề” (sưu tầm dấu check-in QR tại từng làng nghề).
9. **Trải nghiệm & quảng bá du lịch** – tour trải nghiệm, sự kiện, giới thiệu sản phẩm và thông tin liên hệ cơ sở (giai đoạn đầu **không** làm thương mại điện tử/thanh toán).
10. **Quản trị & kiểm duyệt**
    - Quy trình nội dung: Nháp → Chờ duyệt → Đã xuất bản / Từ chối; nhật ký thay đổi; báo cáo thống kê.
    - Quản lý tài khoản: **nhập hàng loạt từ Excel/CSV** (danh sách lớp), sinh mật khẩu ban đầu, bắt đổi mật khẩu ở lần đăng nhập đầu, giáo viên/quản trị đặt lại mật khẩu cho học sinh.

## 4. Kiến trúc kỹ thuật

- **Frontend:** **Next.js (App Router) + TypeScript**.
  - Trang công khai (làng nghề, tư liệu, bản đồ) render phía server → SEO tốt, mở link/QR nhanh trên điện thoại.
  - Khu vực học sinh/giáo viên render phía client.
  - Thư viện: TanStack Query, Tailwind CSS + shadcn/ui, react-leaflet (bản đồ), html5-qrcode (quét QR), next-intl (vi trước, en sau). Mobile-first, có thể làm PWA.
- **Backend:** Python – **Django + Django REST Framework**.
  - Lý do chọn thay vì FastAPI: Django có sẵn trang quản trị (Django Admin), đăng nhập, phân quyền, ORM, migration – hợp với web nhiều nội dung & kiểm duyệt. FastAPI không có admin sẵn, các phần này phải tự dựng.
- **Xác thực:** JWT (djangorestframework-simplejwt), phân quyền theo vai trò. (Đăng nhập Google: để sau, không làm ở giai đoạn thí điểm.)
- **CSDL:** PostgreSQL (full-text search + `unaccent` cho tiếng Việt; PostGIS nếu cần truy vấn không gian nâng cao).
- **Lưu trữ media:** S3-compatible (MinIO khi dev, Cloudflare R2/S3 khi chạy thật); video dài nhúng YouTube để tiết kiệm băng thông.
- **Tác vụ nền:** giai đoạn thí điểm xử lý trực tiếp trong request (resize ảnh, sinh QR, nhập tài khoản ~vài trăm dòng vẫn đủ nhanh) để chạy được trên hosting miễn phí; khi cần mới thêm Redis + Celery.
- **API docs:** OpenAPI (drf-spectacular) → sinh type/client TypeScript cho FE.
- **Môi trường dev:** Docker Compose (backend Django, frontend Next.js, postgres, minio) chạy trên máy cá nhân; CI bằng GitHub Actions (lint, test, build).

### Hạ tầng triển khai giai đoạn thí điểm (ưu tiên miễn phí)

> Chính sách gói miễn phí của các dịch vụ thay đổi thường xuyên – kiểm tra lại trước khi đăng ký.

| Thành phần | Dịch vụ miễn phí đề xuất | Lưu ý |
|---|---|---|
| Frontend Next.js | **Vercel** (gói Hobby) | Hợp nhất với Next.js; gói Hobby dành cho mục đích phi thương mại |
| Backend Django | **Render** (Free web service) | Tự "ngủ" khi không có truy cập ~15 phút, lần mở đầu chậm 30–60 giây → dùng dịch vụ ping định kỳ, hoặc chuyển sang VPS trước buổi demo |
| PostgreSQL | **Neon** (free) | Không dùng Postgres miễn phí của Render vì bị xóa sau một thời gian |
| Ảnh / tệp | **Cloudflare R2** (10 GB miễn phí) hoặc **Cloudinary** (free) | R2 có thể yêu cầu thẻ thanh toán khi đăng ký |
| Video | **YouTube** (để chế độ không công khai/công khai, nhúng vào web) | Không tốn dung lượng lưu trữ |
| Tên miền | Tên miền phụ miễn phí: `*.vercel.app` | Xem mục "Tên miền" bên dưới |

**Phương án thay thế – 1 máy chủ miễn phí cho toàn bộ:** Oracle Cloud Always Free (máy ảo ARM cấu hình khá mạnh), chạy toàn bộ Docker Compose. Mạnh hơn nhưng tự quản trị máy chủ, cần thẻ thanh toán khi đăng ký, đôi khi khó đăng ký.

**Khi dùng thật / trước buổi demo:** cân nhắc VPS giá rẻ (khoảng 100.000–200.000 đ/tháng) để không bị "ngủ" và chủ động hơn.

**Tên miền:**
- Miễn phí: dùng tên miền phụ `ten-du-an.vercel.app` (đủ cho giai đoạn phát triển).
- **Hỏi nhà trường / Phòng – Sở GD&ĐT** xem trường đã có tên miền `.edu.vn` chưa; nếu có, xin một tên miền con (ví dụ `langnghe.<ten-truong>.edu.vn`) – miễn phí và tăng độ tin cậy.
- Mua riêng: `.com` khoảng 250.000–350.000 đ/năm, `.vn` đắt hơn (năm đầu khoảng 500.000–800.000 đ). Giá tham khảo, tùy nhà đăng ký.
- Nếu có GitHub Student / Teacher Developer Pack: có thể nhận tên miền miễn phí 1 năm và credit hosting.

**Vận hành:** giai đoạn đầu **chủ dự án là quản trị viên cao nhất** (superuser Django), tự vận hành & biên tập nội dung. Sau này trao quyền bằng cách tạo tài khoản và gán vai trò (Biên tập viên, Quản trị viên nhà trường) trong trang quản trị – không cần sửa code.

## 5. Mô hình dữ liệu sơ bộ

- **Người dùng:** `User`, `Role`, `School`, `Classroom`, `ClassMembership` (giữ `School` dù chỉ 1 trường để sau này mở rộng nhiều trường không phải sửa cấu trúc)
- **Làng nghề:** `CraftVillage`, `Artisan`, `Product`, `Event/Tour`
  - `CraftVillage`: tên, loại nghề, mô tả, lịch sử, tọa độ; địa chỉ theo **đơn vị hành chính mới** (xã/phường – tỉnh Quảng Trị) + **địa danh cũ** (xã/huyện trước sáp nhập) + khu vực cũ (Quảng Trị cũ / Quảng Bình cũ) để lọc.
- **Tư liệu:** `Document` (loại: truyền thuyết, ca dao, tục ngữ, bài viết, phóng sự…), `MediaAsset` (ảnh/video/audio), `Tag`, `Source/License` (nguồn & bản quyền)
- **Học tập:** `Lesson`, `Assignment`, `Submission`, `Feedback`, `Quiz`, `Question`, `QuizAttempt`
- **Tương tác:** `QRCode`, `CheckIn`, `Badge`, `UserBadge`, `Comment`
- **Hệ thống:** trạng thái kiểm duyệt + `AuditLog` dùng chung cho các nội dung

## 6. Luồng người dùng tiêu biểu

1. Khách/học sinh quét QR tại làng nghề → trang làng nghề → đọc tư liệu, xem video → làm quiz → (đã đăng nhập) nhận dấu “Hộ chiếu” + huy hiệu.
2. Giáo viên tạo bài học Ngữ văn gắn tư liệu làng nghề → giao cho lớp → học sinh làm nhiệm vụ, nộp sản phẩm → giáo viên chấm, chọn bài hay để xuất bản.
3. Nghệ nhân cập nhật sản phẩm/sự kiện → biên tập viên duyệt → hiển thị công khai.
4. Quản trị viên nhà trường nhập file danh sách lớp → hệ thống tạo tài khoản → phát cho học sinh → học sinh đăng nhập lần đầu và đổi mật khẩu.

## 7. Danh sách làng nghề ban đầu

> Nguồn: internet – **cần xác minh với nguồn chính thức và bổ sung**.
> Số liệu tham khảo: sau sáp nhập, toàn tỉnh có 44 nghề / làng nghề / làng nghề truyền thống đã được công nhận (21 làng nghề, 21 làng nghề truyền thống, 2 nghề truyền thống); riêng Quảng Bình cũ có 19 làng nghề và 10 làng nghề truyền thống (số liệu 12/2024).

### Khu vực Quảng Trị cũ

| Làng nghề | Sản phẩm | Địa bàn (cũ) |
|---|---|---|
| Trà Lộc | Nón lá | Hải Xuân, Hải Lăng |
| Văn Quỹ, Văn Trị | Nón lá | Hải Tân, Hải Lăng |
| Bố Liêu | Nón lá | Triệu Hòa, Triệu Phong |
| Mỹ Thủy | Nước mắm | Hải An, Hải Lăng |
| Gia Đẳng | Nước mắm | Triệu Lăng, Triệu Phong |
| Kim Long | Rượu | Hải Quế, Hải Lăng |
| Phương Lang | Bún, bánh | Hải Ba, Hải Lăng |
| Cẩm Thạch | Bún, bánh | Cam An, Cam Lộ |
| Thượng Trạch, Linh Chiểu | Bún | Triệu Sơn, Triệu Phong |
| Văn Phong | Chổi đót | Hải Chánh, Hải Lăng |
| Mỹ Chánh | Mứt gừng (nghề truyền thống) | Hải Chánh, Hải Lăng |
| Lam Thủy | Giá đỗ (nghề truyền thống) | Hải Vĩnh, Hải Lăng |
| Cát Sơn | Mộc, chạm khảm | (cần xác minh) |
| Gia Độ | Mộc, nhà rường | Triệu Phong |
| Phương Ngạn | Quạt giấy | Triệu Phong |
| Lâm Xuân | Dệt chiếu | Gio Linh |
| Lan Đình | Mây tre đan | Gio Linh |

### Khu vực Quảng Bình cũ

| Làng nghề | Sản phẩm | Địa bàn (cũ) |
|---|---|---|
| Cảnh Dương | Nước mắm | Cảnh Dương, Quảng Trạch |
| Bảo Ninh | Nước mắm | Bảo Ninh, Đồng Hới |
| Tân An | Bánh tráng | Quảng Thanh |
| An Xá | Dệt chiếu | Lộc Thủy, Lệ Thủy |
| Quảng Tiến | Dệt chiếu | Quảng Tiến, Quảng Trạch |
| Quy Hậu | Nón lá | Lệ Thủy |
| Thổ Ngọa | Nón lá | Quảng Thuận, Ba Đồn |
| Mai Hồng | Rèn, đúc | Đồng Trạch, Bố Trạch |
| Thọ Đơn | Mây tre đan | Quảng Thọ, Quảng Trạch |

**Đề xuất cho MVP:** chọn khoảng 5–8 làng tiêu biểu, ưu tiên các làng thuộc **Hải Lăng cũ** vì gần xã Diên Sanh (học sinh dễ đi thực tế và quét QR), đa dạng loại nghề, ví dụ:
- Nón lá Trà Lộc
- Nước mắm Mỹ Thủy
- Rượu Kim Long
- Bún, bánh Phương Lang
- Chổi đót Văn Phong
- Mứt gừng Mỹ Chánh

Cần xác nhận tên xã mới của từng làng sau sáp nhập. Có thể thêm 1–2 làng Quảng Bình cũ để thể hiện phạm vi Quảng Trị mới.

**Nguồn:**
- [Báo Quảng Trị – Toàn tỉnh có 14 nghề truyền thống, làng nghề, làng nghề truyền thống đã được công nhận](https://baoquangtri.vn/toan-tinh-quang-tri-co-14-nghe-truyen-thong-lang-nghe-lang-nghe-truyen-thong-da-duoc-cong-nhan-102865.htm)
- [Sở NN&MT Quảng Trị – Phát triển ngành nghề nông thôn](https://snnmt.quangtri.gov.vn/chi-tiet-tin/-/view-article/1/1445748553374/1761032510129)
- [Lữ hành Việt Nam – Những làng nghề truyền thống ở Quảng Trị](https://luhanhvietnam.com.vn/du-lich/nhung-lang-nghe-truyen-thong-o-quang-tri.html)
- [Báo Quảng Bình – Quảng Bình có 19 làng nghề và 10 làng nghề truyền thống](https://www.baoquangbinh.vn/kinh-te/202412/quang-binh-co-19-lang-nghe-va-10-lang-nghe-truyen-thong-2222751/)
- [Làng nghề Việt – Những làng nghề nổi tiếng Quảng Bình](https://langngheviet.com.vn/nhung-lang-nghe-noi-tieng-quang-binh-20973.html)

## 8. Cấu trúc repo đề xuất (monorepo)

```
backend/     # Django project (apps: accounts, villages, archive, learning, quizzes, gamification)
frontend/    # Next.js (App Router)
docs/        # tài liệu, thiết kế, tư liệu thu thập
docker-compose.yml
plan.md
```

- Một repo, hai thư mục độc lập: mỗi bên có dependency, cấu hình, Dockerfile riêng; FE chỉ giao tiếp với BE qua API.
- Kiểu dữ liệu TypeScript của FE sinh tự động từ OpenAPI của BE → đổi API là thấy lỗi ngay ở FE.
- Triển khai: Vercel trỏ vào `frontend/`, Render trỏ vào `backend/`; CI chỉ chạy phần có thay đổi.
- Nếu sau này có nhóm riêng cho từng phần vẫn tách được thành 2 repo mà không phải viết lại.

## 9. Lộ trình (đến demo tháng 1/2027 – khoảng 4 tháng)

Thời gian ngắn nên tập trung vào những gì cần cho demo đề tài; phần quảng bá du lịch và song ngữ để sau.

| Thời gian | Nội dung |
|---|---|
| Cuối T9/2026 | **Chuẩn bị:** chốt 5–8 làng nghề, bắt đầu thu thập tư liệu & xin phép sử dụng, lấy danh sách lớp, wireframe UI, dựng khung repo + Docker |
| T10/2026 | **Nền tảng:** đăng nhập & phân quyền, nhập tài khoản hàng loạt, hồ sơ làng nghề, bản đồ, kho tư liệu + tìm kiếm, QR, admin kiểm duyệt |
| T11/2026 | **Học tập:** lớp học, bài học Tiếng Việt/Ngữ văn, giao bài & nộp bài, quiz có chấm điểm |
| T12/2026 | **Tương tác & nội dung thật:** hộ chiếu làng nghề, huy hiệu (bản đơn giản); nhập đủ tư liệu; cho học sinh dùng thử, thu góp ý |
| T1/2027 | **Hoàn thiện & demo:** sửa lỗi, khảo sát trước/sau, tổng hợp số liệu chứng minh hiệu quả, chuẩn bị demo |

**Sau demo (mở rộng):** bảng xếp hạng, bình luận, tour/sự kiện, trang sản phẩm, song ngữ Việt–Anh, nhiều trường, đăng nhập Google, trợ lý AI hỏi đáp về làng nghề, ảnh 360°/tham quan ảo, audio guide, app di động.

## 10. Yêu cầu phi chức năng

- Mobile-first, tải nhanh trên 4G (ảnh tối ưu, lazy load).
- SEO cho các trang công khai (làng nghề, tư liệu) – quan trọng cho mục tiêu quảng bá.
- **Hiệu năng truy vấn:** tránh lỗi N+1 bằng `select_related` / `prefetch_related`, đánh index cho các cột hay lọc (loại nghề, khu vực, trạng thái duyệt), phân trang mọi danh sách, cache trang công khai (Redis + cache của Next.js), dùng django-debug-toolbar khi phát triển để phát hiện truy vấn thừa.
- **Bảo vệ dữ liệu cá nhân học sinh** (phần lớn là trẻ vị thành niên): thu thập tối thiểu, cần sự đồng ý phù hợp, tuân thủ quy định bảo vệ dữ liệu cá nhân hiện hành của Việt Nam.
- **Bản quyền tư liệu:** ghi nguồn, sự đồng ý của nghệ nhân/tác giả, giấy phép sử dụng cho từng tư liệu.
- Khả năng truy cập (tương phản, cỡ chữ, alt ảnh), sao lưu dữ liệu định kỳ.
- **Phù hợp học sinh tiểu học:** giao diện đơn giản, chữ to, nhiều hình ảnh, ít thao tác gõ; nội dung và quiz chia theo cấp (tiểu học / THCS).

## 11. Quyết định đã chốt

- Phạm vi địa lý: **Quảng Trị mới** (gồm Quảng Bình cũ).
- Danh sách làng nghề ban đầu: lấy từ nguồn internet (mục 7), sẽ bổ sung sau.
- Trường thí điểm: **Trường Tiểu học và THCS Thiện Thành, xã Diên Sanh**; **nhà trường cấp tài khoản**.
- Không tích hợp với hệ thống sẵn có của trường (tài khoản, LMS).
- Thời hạn: **tháng 1/2027**.
- Frontend: **Next.js**.
- Backend: **Django + DRF**.
- Vận hành: **chủ dự án tự vận hành**, trao quyền cho người khác sau.
- Hosting: **bộ miễn phí Vercel + Render + Neon** (xem mục 4 – Hạ tầng triển khai); cân nhắc VPS trả phí trước buổi demo sau.
- Tên miền: tạm dùng tên miền phụ miễn phí `*.vercel.app` (dự án cá nhân). Trường đã có tên miền `.edu.vn` – có thể xin tên miền con khi chính thức triển khai.
- Mã nguồn: **monorepo** – FE và BE chung một repo, tách thư mục `frontend/` và `backend/` (xem mục 8).
- Chất lượng code: clean, rõ ràng, dễ mở rộng về sau (nhiều trường, thêm phân hệ).

## 12. Câu hỏi mở cần thảo luận

1. Chốt 5–8 làng nghề cho MVP (xem đề xuất ở mục 7) – *tạm hoãn*.
