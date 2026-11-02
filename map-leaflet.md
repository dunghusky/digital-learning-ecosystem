# Kế hoạch: Bản đồ làng nghề & Kho tư liệu

> Tài liệu kế hoạch cho 2 việc tiếp theo sau `feature/villages` (đã merge vào `dev`).
> Dựa trên code hiện có: `apps.core.PublishableModel`, `apps.villages` (API `/api/v1/villages/`), frontend Next.js 16 + next-intl + Tailwind 4.

---

## ⏩ TIẾN ĐỘ (đọc mục này trước khi làm tiếp)

**Quy trình làm việc:** mỗi lần chỉ làm **1 bước nhỏ**, rồi dừng lại cho bạn kiểm tra. Bạn confirm xong mới làm bước tiếp theo. Xong bước nào thì đánh dấu `[x]` và ghi chú ngay tại đây.
Bạn tự tạo nhánh, chạy lệnh và commit. Claude viết code và ghi lại lệnh cần chạy.

### PR 1 – `feat/map-leaflet`
- [x] **1.1 Nền tảng UI**: `craft-meta.ts` (màu + icon theo nghề), `ui/Chip`, `ui/EmptyState`, `ui/Skeleton`, `loading.tsx`/`error.tsx` cho `/villages`, `VillageCard` có badge icon theo nghề
- [x] **1.2 Bộ lọc dạng chip**: cho `/villages` (thay `<select>`)
- [x] **1.3 BE bản đồ**: endpoint `/villages/map/` (GeoJSON), kiểm tra tọa độ trong `clean()`, bộ lọc admin "có tọa độ", test
- [x] ~~**1.4 FE bản đồ cơ bản (Leaflet)**~~ → bỏ, thay bằng MapLibre (xem nhật ký "Đổi hướng")
- [x] **1.4a Công cụ chọn tọa độ trong admin**: bản đồ nhỏ (Leaflet qua CDN, nền OSM/vệ tinh Esri) ở mục Location, tìm địa danh bằng Nominatim, bấm hoặc kéo ghim thì tự điền lat/lng
- [x] **1.4b Lệnh `geocode_villages`**: tự tìm tọa độ gợi ý cho các làng còn thiếu (Nominatim, giới hạn trong tỉnh, 1 request/giây, có `--dry-run`), in báo cáo độ tin cậy để bạn kiểm tra lại bằng 1.4a
- [ ] **1.4c Bản đồ MapLibre cơ bản** ⏳ _code xong, chờ bạn cài thư viện + kiểm tra_: gỡ leaflet và cài `maplibre-gl` + `react-map-gl`, nền OpenFreeMap (không cần key), nhãn tiếng Việt, nhãn **Hoàng Sa / Trường Sa (Việt Nam)**, địa hình 3D + đổ bóng núi, nút Bản đồ/Vệ tinh/3D, hiệu ứng bay từ toàn cảnh Việt Nam vào Quảng Trị
- [ ] **1.4d Marker động + gom cụm**: ghim React có animation (nảy lên, nhịp đập), gom cụm (supercluster), bấm thì camera bay tới + thẻ thông tin
- [ ] **1.5 FE panel tương tác**: panel/bottom sheet, danh sách đồng bộ với bản đồ, trạng thái trên URL, chú giải, "Vị trí của tôi", mục làng chưa định vị
- [ ] **1.6 Hoàn thiện**: bản đồ mini ở trang chi tiết làng, link "Bản đồ" ở header, a11y, `error.tsx` cho trang chủ (hiện tại backend tắt thì trang chủ lỗi trắng), rồi tạo PR

### PR 2, 3, 4
Chưa bắt đầu. Khi đến lượt sẽ chia nhỏ tương tự.
- PR 2: thêm trường `answer` cho `Document` (dùng cho câu đố, thẻ lật ở FE) + cột `answer` trong file Excel.

### Nhật ký
_(ghi lại các bước đã xong, lệnh đã chạy, vấn đề gặp phải)_

**1.1 – Nền tảng UI** ✅ (bạn đã xác nhận: badge hiển thị đúng ở trang chủ)
- Máy chưa có Node → đã cài Node 24 LTS bằng `winget install OpenJS.NodeJS.LTS`. Phải mở lại VS Code để nhận PATH.
- Lỗi `ECONNREFUSED 127.0.0.1:8000` = backend chưa chạy (`docker compose up -d db` + `uv run python manage.py runserver`), không phải lỗi code.
- File mới:
  - `frontend/src/lib/craft-meta.ts`: `CRAFT_META` (icon + màu hex theo `CraftType`), `CRAFT_TYPES`, `REGIONS`
  - `frontend/src/components/craft-badge.tsx`: badge tròn có màu + tên nghề
  - `frontend/src/components/ui/{chip,empty-state,skeleton}.tsx`
  - `frontend/src/components/route-error.tsx`: thân trang lỗi dùng chung, có nút "Thử lại"
  - `frontend/src/app/villages/{loading,error}.tsx`
- File sửa:
  - `village-card.tsx`: thêm badge + icon địa điểm, hiệu ứng hover nổi lên
  - `villages/page.tsx`: hiện `EmptyState` khi không có kết quả
  - `villages/[code]/page.tsx`: thêm badge nghề
  - `vi.json`: thêm `villages.emptyHint`, `error.title`, `error.retry`
- Lệnh bạn cần chạy (trong `frontend/`):
  - `npm install lucide-react`
  - `npm run lint && npm run typecheck && npm run build`
- Lưu ý: `village-filters.tsx` vẫn còn mảng `CRAFT_TYPES` riêng. Bước 1.2 sẽ thay bằng chip dùng `craft-meta.ts`.

**1.2 – Bộ lọc dạng chip** ✅ (bạn đã xác nhận)
- File mới: `frontend/src/lib/url.ts` – `buildHref(path, params)` bỏ giá trị rỗng và `page=1`
- File sửa:
  - `village-filters.tsx` viết lại: ô tìm kiếm bo tròn + hàng chip loại nghề (icon/màu từ `craft-meta`) + hàng chip khu vực. Bấm chip đang bật thì tắt lọc. Đổi lọc thì về trang 1. Trên mobile hàng chip cuộn ngang. Có nút "Xóa lọc" khi đang lọc
  - `villages/page.tsx`: `pageLink` dùng `buildHref`
  - `vi.json`: bỏ key `villages.filter` không còn dùng
- Lệnh: không cần cài gì thêm. Chỉ cần `npm run dev` và mở `/villages`

**1.3 – BE bản đồ** ✅ (bạn đã xác nhận)
- **Đổi so với kế hoạch ban đầu:** `/villages/map/` trả về **tất cả** làng đã xuất bản. Làng chưa có tọa độ vẫn có trong danh sách với `geometry: null` (GeoJSON cho phép). Vì vậy bỏ `meta.total_published`: FE tự đếm và tự liệt kê "làng chưa có vị trí" từ cùng một response.
- `models.py`: `PROVINCE_BOUNDS` (lat 16.0–18.2, lng 105.5–107.6), hàm `location_errors()` dùng chung, `CraftVillage.clean()`, `CraftVillageQuerySet.with_location()` (manager mới, không cần migration)
- `serializers.py`: `CraftVillageFeatureSerializer` → Feature `{id: code, geometry: Point [lng, lat] dạng số | null, properties}`
- `views.py`: action `map_features` (URL `/api/v1/villages/map/`, route name `village-map`), không phân trang, nhận các filter giống list, có mô tả OpenAPI
- `admin.py`: bộ lọc "on map" (Có / Thiếu tọa độ), hướng dẫn lấy tọa độ từ Google Maps ở fieldset Location
- `importers.py`: tọa độ nằm ngoài tỉnh hoặc thiếu 1 trong 2 → báo lỗi trong report, làng vẫn được import nhưng không có tọa độ
- Test mới: 5 test API map, 3 test `clean()`, 1 test importer
- Lệnh bạn chạy (trong `backend/`): `uv run pytest`, rồi `uv run python manage.py runserver` và mở http://localhost:8000/api/v1/villages/map/

**1.4 – FE bản đồ cơ bản** (code xong, CHƯA typecheck vì chưa cài thư viện)
- Thư viện: `leaflet@1.9` (bản 2.x bỏ biến toàn cục `L` mà markercluster cần), `react-leaflet`, `leaflet.markercluster` (dùng trực tiếp, không qua `react-leaflet-cluster`, để tránh lỗi peer dependency với React 19), cùng `@types/leaflet@1.9` và `@types/leaflet.markercluster`
- File mới:
  - `src/app/map/{page,loading,error}.tsx`: trang `/map` render server, `force-dynamic`
  - `src/components/map/map-config.ts`: `PROVINCE_BOUNDS` (khớp backend), `MAX_BOUNDS`, zoom, `BASEMAPS` (CARTO Voyager; vệ tinh Esri + lớp nhãn địa danh)
  - `src/components/map/map-villages.ts`: kiểu `MapVillage` + `locatedVillages(features)`
  - `src/components/map/marker-icons.ts`: render icon lucide ra chuỗi SVG một lần lúc load module (`createRoot` + `flushSync`, vì Next không cho dùng `react-dom/server` trong client), `villageIcon()` hình giọt nước, `clusterIcon()` (cụm cùng một nghề thì lấy màu nghề đó)
  - `src/components/map/leaflet-map.tsx`: `MapContainer` + tile + `VillageMarkers` (tạo marker trực tiếp bằng Leaflet, tooltip tên làng, popup có link "Xem hồ sơ", `fitBounds`) + `BasemapToggle`
  - `src/components/map/village-map.tsx`: `next/dynamic` với `ssr: false`
- File sửa:
  - `lib/api/villages.ts`: `VillageFeature`, `VillageFeatureCollection`, `fetchVillageMap()`
  - `globals.css`: `.village-pin`, `.village-cluster`, font cho `.leaflet-container`
  - `vi.json`: namespace `map`
- Chưa làm (để bước 1.5): panel/danh sách, lọc, URL state, chú giải, vị trí của tôi. Link header thuộc bước 1.6, tạm thời gõ thẳng `/map`

**Đổi hướng sau bước 1.4 (Leaflet)**
- Khi chạy thử, nền CARTO hiện "API KEY REQUIRED" vì CARTO không còn miễn phí không cần key. Ngoài ra bạn chưa có tọa độ nào (trang hiện "0/3 làng").
- Bạn chọn: (1) **MapLibre 3D** để bản đồ sinh động: nghiêng 3D, địa hình, bay mượt; (2) **công cụ chọn điểm trong admin + lệnh tự gợi ý tọa độ**.
- Code Leaflet ở 1.4 sẽ được thay ở bước 1.4c. Giữ lại `map-villages.ts`, `fetchVillageMap()`, trang `/map` + loading/error, và namespace `map` trong `vi.json`.
- **Chủ quyền:** dữ liệu OSM có thể ghi tên quần đảo không theo tiếng Việt. Bản đồ phải hiện nhãn "Quần đảo Hoàng Sa (Việt Nam)" và "Quần đảo Trường Sa (Việt Nam)" khi nhìn toàn cảnh, đồng thời ưu tiên `name:vi` cho mọi nhãn.

**1.4a – Công cụ chọn tọa độ trong admin** ✅ (bạn đã xác nhận)
- `apps/villages/static/villages/admin/location-picker.{js,css}`: JS thuần (không build), Leaflet 1.9.4 lấy từ unpkg qua `ModelAdmin.Media`. Có:
  - nền OSM / vệ tinh Esri
  - ô tìm kiếm Nominatim (giới hạn trong tỉnh, `accept-language=vi`; Enter không submit form)
  - bấm bản đồ hoặc kéo ghim thì ghi lat/lng (6 chữ số); gõ tay lat/lng thì ghim tự di chuyển
- `admin.py`: readonly field `location_picker` đặt dưới lat/lng trong fieldset Location, ô tìm kiếm điền sẵn "tên làng, xã". Mọi nhãn bọc `gettext_lazy` và truyền sang JS qua `data-*`. Mô tả fieldset được viết lại cho ngắn.
- Test: 2 test admin (trang sửa và trang thêm mới đều có picker)
- Ghi chú: admin đang hiện chữ tiếng Anh vì chưa có file dịch `.po`. Việc tạo bản dịch tiếng Việt cho admin để sau (`makemessages` / `compilemessages`).

**1.4b – Lệnh `geocode_villages`** (code xong; ruff và pytest 43/43 đều qua, chờ bạn chạy thử với mạng thật)
- `apps/villages/geocoding.py`:
  - `NominatimGeocoder` dùng `urllib` (không thêm thư viện). Gửi User-Agent lấy từ setting và tự đợi ≥ 1 giây giữa các request. Kết quả giới hạn trong `PROVINCE_BOUNDS`.
  - `place_name()` lấy phần tên riêng ở cuối tên làng ("Làng nón lá Trà Lộc" → "Trà Lộc").
  - `candidate_queries()` thử theo thứ tự: thôn + xã → tên + xã mới/cũ → tên → xã (độ chính xác `commune`).
  - `suggest_location()` bỏ qua kết quả nằm ngoài tỉnh.
- `management/commands/geocode_villages.py`:
  - Mặc định chỉ xử lý các làng thiếu tọa độ, hoặc truyền danh sách mã làng.
  - Cờ `--dry-run`, `--accept-commune` (mặc định KHÔNG lưu kết quả chỉ khớp tới mức xã).
  - In ra mỗi làng: tọa độ, loại địa điểm OSM, câu truy vấn đã dùng, và link Google Maps để kiểm tra.
  - Khi lưu thì ghi một dòng vào `notes` ("Coordinates suggested… Verify on the map"). Không đổi trạng thái xuất bản.
- `config/settings/base.py`: `GEOCODER_USER_AGENT` (env, có giá trị mặc định); `.env.example` có dòng gợi ý (đang comment)
- Test: `tests/test_geocoding.py` (11 test, dùng `FakeGeocoder`, không gọi mạng)
- README: sẽ thêm mục hướng dẫn lệnh này ở bước 1.6
- **Sự cố khi chạy thật:** `getaddrinfo failed`. DNS mặc định của mạng nhà bạn KHÔNG phân giải được `*.openstreetmap.org` (google.com vẫn được; DNS 8.8.8.8 và 1.1.1.1 thì được). Cách xử lý:
  - Lệnh giờ báo `CommandError` dễ hiểu, gợi ý đổi DNS sang 8.8.8.8 / 1.1.1.1 (thêm 1 test → 44/44)
  - Bản đồ chọn điểm trong admin đổi nền "Map" từ `tile.openstreetmap.org` sang Esri World Street Map
  - Ô tìm kiếm trong admin cũng gọi Nominatim, nên sẽ báo "Search is unavailable" cho tới khi đổi DNS
  - **Lưu ý cho 1.4c:** trang công khai KHÔNG dùng tên miền `openstreetmap.org` (học sinh có thể dùng cùng nhà mạng). `tiles.openfreemap.org` phân giải bình thường, nhưng vẫn cần chạy thử

**1.4b** ✅ Bạn đổi DNS card Wi-Fi sang 8.8.8.8 / 1.1.1.1 (`Set-DnsClientServerAddress`, PowerShell Admin) rồi chạy lệnh thành công. Muốn trả lại DNS cũ: `Set-DnsClientServerAddress -InterfaceAlias "Wi-Fi" -ResetServerAddresses`.

**1.4c – Bản đồ MapLibre cơ bản** (code xong, CHƯA typecheck vì chưa cài thư viện)
- Thư viện: gỡ `leaflet react-leaflet leaflet.markercluster @types/leaflet @types/leaflet.markercluster`; cài `maplibre-gl` (v5, có globe) + `react-map-gl` (v8.1, import từ `react-map-gl/maplibre`)
- Đã xóa `leaflet-map.tsx`, `marker-icons.ts` và CSS marker Leaflet trong `globals.css`
- `map-config.ts` viết lại theo thứ tự **[lng, lat]**:
  - `PROVINCE_BOUNDS`, `VIETNAM_VIEW`, `MAX_BOUNDS` (Việt Nam + biển Đông)
  - `TILT_3D` (pitch 55, bearing -15), `TERRAIN_EXAGGERATION` 1.5, `INTRO_DURATION_MS` 4000
  - `ARCHIPELAGOS` (Hoàng Sa ~[111.9, 16.4], Trường Sa ~[114.0, 9.9])
  - URL style, font, vệ tinh, địa hình
- `map-style.ts`:
  - `adaptVectorStyle()` tải style OpenFreeMap "liberty", đổi nhãn sang `coalesce(name:vi, name:latin, name)`, bỏ layer `boundary_disputed`, thêm nguồn DEM + layer `hillshade` (đặt dưới các nhãn)
  - `satelliteStyle` = Esri + DEM + glyphs
  - `loadBasemapStyle()` cache style vector; lỗi mạng thì component tự chuyển sang vệ tinh
  - (Style liberty vốn đã lọc `maritime` / `disputed` / `claimed_by` ở `boundary_2` và `boundary_3`.)
- `maplibre-map.tsx`:
  - `projection="globe"`, mở ở toàn cảnh Việt Nam rồi `flyTo` (4 giây, nghiêng 3D) tới vùng có làng (hoặc cả tỉnh). Không đặt `essential` nên MapLibre tự bỏ animation khi người dùng bật reduced-motion
  - `terrain` bật/tắt bằng nút 3D (`easeTo` pitch); `NavigationControl` ở góc dưới phải
  - Layer nhãn Hoàng Sa / Trường Sa (luôn hiện)
  - Làng hiển thị **tạm** bằng chấm tròn màu theo nghề + tên làng khi zoom ≥ 9 (bước 1.4d thay bằng marker động)
- `vi.json`: thêm `map.terrain3d`, `map.archipelago.{paracel,spratly}`
- Đã kiểm tra từ máy bạn: tải được style liberty, font Noto Sans có dải chữ Việt (7680-7935), tile địa hình AWS và vệ tinh Esri (HTTP 200)
- **Sự cố `Worker failed to load`:** npm cài **maplibre-gl 6.14** (không phải 5). Bản 6 chỉ có ESM và tìm worker `maplibre-gl-worker.mjs` cạnh file thư viện qua `import.meta.url`; Turbopack đóng gói lại nên không thấy file. Cách sửa:
  - `frontend/scripts/copy-maplibre-worker.mjs` chép worker (file tự chứa, không import gì) vào `public/vendor/`
  - `package.json`: thêm `postinstall` + `prebuild` chạy script trên
  - `.gitignore`: `frontend/public/vendor/`; `eslint.config.mjs`: bỏ qua `public/vendor/**`
  - `maplibre-map.tsx`: `setWorkerUrl("/vendor/maplibre-gl-worker.mjs?v=<version>")` ở cấp module
  - Sửa 2 lỗi kiểu: biểu thức `match` cast qua `unknown`; `MAX_BOUNDS` đổi sang dạng `[w, s, e, n]`
  - typecheck, lint và build đều qua (Claude đã chạy)

**Dữ liệu kho tư liệu** (chuẩn bị cho PR 2)
- Đã tạo `docs/data/documents.xlsx` theo mẫu 4.4: 22 tư liệu (15 ca dao/tục ngữ/vè/câu đố, 3 phóng sự tóm tắt, 4 bài "Bạn có biết").
- Thêm cột `notes` (nội bộ) ngoài mẫu. Câu đố tạm ghi "Đáp án: …" ở cuối `body`, nên cân nhắc thêm trường `answer` cho model.
- Mọi tư liệu dân gian còn lấy từ web (ô `source` nền vàng), phải đối chiếu sách trước khi `--publish`. Sheet `Can-tim-them` liệt kê các làng còn thiếu tư liệu.

---

## 0. Quyết định đã chốt

| # | Câu hỏi | Quyết định |
|---|---|---|
| 1 | Thêm thể loại? | **Có.** Thêm hò, vè, câu đố, đồng dao (xem 3.1). |
| 2 | Một tư liệu gắn nhiều làng? | **Có.** Dùng quan hệ M2M `Document.villages`. |
| 3 | Chia cấp học? | **Có, làm ngay.** Trường `grade_level`: tiểu học / THCS / dùng chung. |
| 4 | Nguồn tư liệu | Mình đã tìm hiểu, kết quả ở **mục 4**. |
| 5 | Nền bản đồ | ~~CARTO Voyager~~ (từ 2026 CARTO yêu cầu API key). **Đổi sang MapLibre GL 3D + OpenFreeMap** (miễn phí, không cần key), có nút chuyển sang **ảnh vệ tinh (Esri)**. |
| 6 | Nhập tọa độ | **Bản đồ chọn điểm trong admin + lệnh tự gợi ý tọa độ** (Nominatim). |

---

## 1. Thứ tự làm (4 PR, đều tách từ `dev` và merge về `dev`)

| PR | Nhánh | Nội dung |
|---|---|---|
| 1 | `feat/map-leaflet` **(bạn đã tạo)** | Nền tảng FE (màu/icon theo nghề, chip lọc) + bản đồ (BE + FE) |
| 2 | `feature/archive-backend` | Mixin admin dùng chung, tìm kiếm không dấu, app `archive` (model, admin, import Excel, API) |
| 3 | `feature/archive-frontend` | Trang kho tư liệu (danh sách + chi tiết) |
| 4 | `feature/connect-map-archive` | Ghép các phần: hồ sơ làng ↔ tư liệu ↔ bản đồ, "Ca dao hôm nay" ở trang chủ |

Trong lúc mình làm PR 1, bạn có thể **bắt đầu gom tư liệu vào file Excel** theo mẫu ở mục 4.4. Như vậy đến PR 2 là có dữ liệu thật để import.

---

## 2. Bản đồ làng nghề (PR 1)

### 2.1 FE: nền tảng chung
- [ ] Cài `lucide-react`.
- [ ] `src/lib/craft-meta.ts`: mỗi `CraftType` có **màu + icon** riêng. Thẻ làng, chip lọc, marker và chú giải đều dùng chung file này.
- [ ] `src/components/ui/`: `Chip`, `EmptyState`, `Skeleton`. Thêm `loading.tsx` / `error.tsx` cho `/villages` và `/map`.
- [ ] Đổi `VillageFilters` từ `<select>` sang **chip có icon**. Vẫn là form GET để chạy được khi không có JS và URL chia sẻ được.

### 2.2 BE
- [x] Thêm `GET /api/v1/villages/map/`: trả GeoJSON `FeatureCollection` gồm **mọi** làng đã xuất bản (làng chưa có tọa độ thì `geometry: null`), không phân trang, tọa độ là số (float). Vẫn nhận filter `craft_type`, `former_region`.
- [ ] `CraftVillage.clean()`: lat/lng phải nhập đủ cả hai hoặc bỏ trống cả hai, và phải nằm trong khung tỉnh Quảng Trị mới (đặt bbox thành hằng số). Mục đích là bắt lỗi đảo lat/lng.
- [ ] Admin: bộ lọc "Có/Chưa có tọa độ", `help_text` hướng dẫn copy tọa độ từ Google Maps.
- [ ] Test: không trả làng nháp, không trả làng thiếu tọa độ, filter đúng, đúng schema GeoJSON, validation bbox.

### 2.3 FE: trang `/map`
**Thư viện:** `leaflet`, `react-leaflet`, `react-leaflet-cluster`, `@types/leaflet`.

```
Desktop                                              Mobile
┌──────────────┬───────────────────────────────┐    ┌────────────────────┐
│ 🔍 Tìm làng… │              [🗺/🛰][⌖][+][-] │    │ 🔍  [Nón][Mắm][…] →│
│ [Nón lá][Mắm]│        ●  ③                   │    │      ●   ③         │
│ [Mây tre]…   │    ●        ●                 │    │   ●       ●        │
│ Đã định vị   │         ⑤                     │    ├────────────────────┤
│ 18/25 làng   │                ●              │    │ ━━  (kéo lên)      │
│──────────────│  ┌──────────────┐             │    │ Trà Lộc · Nón lá   │
│ ▸ Trà Lộc    │  │ Chú giải màu │             │    │ [Xem hồ sơ][Chỉ đg]│
└──────────────┴──┴──────────────┴─────────────┘    └────────────────────┘
```

- [ ] Server component fetch GeoJSON rồi truyền cho `MapExplorer` (client). Bản đồ tải bằng `next/dynamic(..., { ssr: false })`, nên Leaflet chỉ tải ở trang này.
- [ ] **Lọc ngay trên client**, không gọi lại API. Trạng thái đồng bộ lên URL (`/map?craft=conical_hat&village=tra-loc`) để chia sẻ link hoặc in QR.
- [ ] Nền bản đồ: CARTO Voyager và Esri World Imagery, chuyển qua lại bằng nút 🗺/🛰. Ghi attribution đầy đủ. URL tile đặt trong 1 hằng số.
- [ ] Đặt `maxBounds` + `minZoom` quanh khu vực Quảng Trị mới. Bản đồ tập trung vào tỉnh, đồng thời tránh hiển thị khu vực biển đảo với nhãn sai theo dữ liệu quốc tế.
- [ ] **Marker riêng theo nghề** (`L.divIcon`, màu + icon). Marker đang chọn to hơn và có hiệu ứng nhấp nháy. **Gom cụm** marker khi zoom xa.
- [ ] Panel bên (desktop) / bottom sheet (mobile): tìm kiếm, chip lọc nghề và khu vực, danh sách **đồng bộ với bản đồ** (rê chuột vào dòng thì marker sáng, bấm vào dòng thì `flyTo`). Thẻ xem nhanh có nút **Xem hồ sơ** và **Chỉ đường** (Google Maps).
- [ ] Chú giải thu gọn được. Nút **Vị trí của tôi**: nếu người dùng từ chối quyền thì ẩn nút. Mục **"Làng chưa có vị trí"** cuối danh sách.
- [ ] **Bản đồ mini** trên trang chi tiết làng, kèm link `/map?village=…`.
- [ ] Thêm "Bản đồ" vào header (key `nav.map` đã có). Thêm namespace `map` vào `vi.json`.
- [ ] Khả năng truy cập: marker focus được bằng bàn phím và có `aria-label`. Khi bật `prefers-reduced-motion` thì tắt `flyTo`.

---

## 3. Kho tư liệu (PR 2 + PR 3)

### 3.1 BE: nền tảng + app `apps/archive` (PR 2)

**Nền tảng chung:**
- [ ] Chuyển phần publish trong `villages/admin.py` thành `PublishableAdminMixin` trong `apps/core/admin.py`.
- [ ] Tìm kiếm **không dấu**: thêm `django.contrib.postgres` + migration `UnaccentExtension()`. Viết `AccentInsensitiveSearchFilter` trong `apps/core/filters.py`. Áp dụng luôn cho villages.

**Models:**

```
Document (PublishableModel)
├─ slug, title
├─ genre          ← folk_verse  (ca dao)        proverb    (tục ngữ)
│                   work_song   (hò)            narrative_verse (vè)
│                   riddle      (câu đố)        nursery_rhyme   (đồng dao)
│                   legend      (truyền thuyết) folk_tale  (truyện kể dân gian)
│                   poem        (thơ)           essay      (bài viết / tản văn)
│                   reportage   (phóng sự)      interview  (lời kể nghệ nhân)
├─ body           ← giữ nguyên xuống dòng
├─ summary
├─ villages       (M2M → CraftVillage, related_name="documents", blank)
├─ themes         (M2M → Theme)
├─ grade_level    ← primary / secondary / all
├─ author         ← để trống = "Dân gian"
├─ reading_questions  ← câu hỏi gợi mở đọc hiểu, mỗi dòng 1 câu
├─ source, source_url, collector
├─ license        ← folk_attributed  (dân gian, có ghi xuất xứ)
│                   own_work         (GV/HS tự viết, kể lại)
│                   permission_granted (tác giả/nghệ nhân đồng ý)
│                   cc_by
│                   unknown          (chưa rõ → không cho xuất bản)
├─ permission_note, notes   ← nội bộ, không trả ra API

GlossaryTerm (inline): document FK, term, explanation   ← chú giải từ địa phương
Theme: name, slug
```

- [ ] Kiểm tra trong `clean()`:
  - Không cho xuất bản khi `license = unknown`.
  - Thể loại dân gian (ca dao, tục ngữ, hò, vè, câu đố, đồng dao, truyền thuyết, truyện kể) **bắt buộc có `source`**, vì luật yêu cầu dẫn xuất xứ khi dùng tác phẩm dân gian (xem 4.3).
- [ ] Admin: `DocumentAdmin(PublishableAdminMixin)` với `autocomplete_fields` cho villages, `GlossaryTermInline`, bộ lọc thể loại/làng/cấp học/trạng thái/giấy phép.
- [ ] Lệnh `import_documents` (Excel, có `--dry-run`, `--publish`) theo mẫu 4.4. Tách phần dùng chung với `import_villages` nếu bị trùng.
- [ ] API (`AllowAny`, chỉ đọc):
  - `GET /documents/`: filter `genre`, `village`, `theme`, `grade_level`, tìm không dấu.
  - `GET /documents/{slug}/`: kèm villages, glossary, themes, `related` (tối đa 4).
  - `GET /documents/featured/?genre=folk_verse`: chọn 1 tư liệu theo ngày, dùng cho "Ca dao hôm nay".
  - `GET /documents/genres/`: đếm số tư liệu theo thể loại.
- [ ] Test models, admin, importer, API. Kiểm tra kỹ: không lộ bản nháp, không lộ `notes`/`permission_note`, tìm "nuoc mam" ra "nước mắm".

### 3.2 FE (PR 3)

**`/archive` (danh sách):**
- [ ] Tab thể loại có icon và số lượng. Chip cấp học **Tiểu học / THCS**. Lọc theo làng. Tìm kiếm có debounce. Mọi trạng thái nằm trên URL.
- [ ] Thẻ khác nhau theo thể loại:
  - Ca dao, hò, đồng dao: font serif, trình bày như tấm thiệp thơ.
  - Câu đố: thẻ **lật** để xem đáp án, tạo tương tác.
  - Truyền thuyết: tiêu đề + tóm tắt.
- [ ] Nút 🎲 **Ngẫu nhiên**.

**`/archive/[slug]` (chi tiết, giao diện tập trung vào việc đọc):**
- [ ] **Chú giải ngay trong bài**: từ có chú giải được gạch chân, bấm vào thì hiện popover giải nghĩa. Có khung "Từ ngữ" tổng hợp ở cuối.
- [ ] Nút **A-/A+** đổi cỡ chữ (lưu `localStorage`). Học sinh tiểu học mặc định chữ to hơn.
- [ ] **Tìm hiểu văn bản**: câu hỏi gợi mở trong khung gập/mở.
- [ ] 🔊 **Nghe đọc** (Web Speech `vi-VN`): chỉ hiện khi trình duyệt có giọng tiếng Việt.
- [ ] Chia sẻ / sao chép. Chip làng + bản đồ mini. Hộp **nguồn & giấy phép**. Tư liệu liên quan.
- [ ] SEO: `generateMetadata` + OpenGraph. Thêm "Kho tư liệu" vào header. Namespace i18n: `archive`, `genre`, `gradeLevel`.

---

## 4. Nguồn tư liệu (kết quả tìm hiểu)

### 4.1 Nhận xét chung
- Trên mạng có **rất ít** ca dao gắn trực tiếp với từng làng nghề Quảng Trị. Đa số bài báo chỉ nói về lịch sử và hiện trạng làng nghề, không trích văn bản dân gian. Vài trang tổng hợp có trích nhưng **không ghi sách gốc**, nên không nên dùng làm nguồn chính.
- Vì vậy nguồn đáng tin cậy nhất là **sách in tại thư viện** và **tư liệu học sinh tự sưu tầm từ nghệ nhân**. Cách thứ hai cũng đúng tinh thần đề tài ("Góc kể chuyện của học sinh").

### 4.2 Nguồn theo mức độ ưu tiên

| Ưu tiên | Nguồn | Dùng cho | Ghi chú |
|---|---|---|---|
| ⭐⭐⭐ | **Học sinh phỏng vấn nghệ nhân, người cao tuổi trong làng** (ghi âm + chép lại) | Truyền thuyết tổ nghề, hò lao động, lời kể | Tư liệu gốc, không vướng bản quyền. Cần phiếu đồng ý của người kể → `license = permission_granted`, `collector` = tên HS + lớp |
| ⭐⭐⭐ | **Thư viện tỉnh Quảng Trị** (gồm cả kho Quảng Bình cũ): các cuốn *Địa chí Quảng Trị*, *Địa chí Quảng Bình*, các tuyển tập văn học dân gian địa phương do Hội Văn học Nghệ thuật / Hội Văn nghệ dân gian xuất bản | Ca dao, tục ngữ, vè, câu đố về sản vật, địa danh | Chép nguyên câu dân gian và ghi rõ *sách, trang*. Truyện mà tác giả sách đã kể lại thì **tóm tắt hoặc kể lại bằng lời mình**, không chép nguyên văn |
| ⭐⭐ | *Kho tàng ca dao người Việt* (Nguyễn Xuân Kính, Phan Đăng Nhật chủ biên) | Tra, đối chiếu dị bản ca dao | Tuyển tập toàn quốc, dùng để kiểm tra một câu có đúng là ca dao hay không |
| ⭐⭐ | **Hồ sơ công nhận làng nghề** tại Sở VHTTDL / Sở NN&MT, UBND xã | Lịch sử làng, tổ nghề, năm hình thành | Văn bản hành chính, thường có phần "nguồn gốc nghề" |
| ⭐⭐ | **Tạp chí Cửa Việt**, Báo Quảng Trị, cổng thông tin các xã | Bài viết, phóng sự về làng nghề | Có bản quyền: chỉ **tóm tắt + gắn link**, trích ngắn có ghi nguồn |
| ⭐ | Trang tổng hợp trên mạng (e-cadao, blog…) | Gợi ý để tìm tiếp | Phải **đối chiếu lại với sách** trước khi xuất bản |

### 4.3 Một vài tư liệu tìm được (cần đối chiếu sách trước khi dùng)
- Tục ngữ về sản vật Quảng Trị: *"Nem chợ Sãi, vải La Vang; Khoai quán Ngang, dầu tràm Đại Nại; Gạo Phước Điền, chiêng Sắc Tứ; Khoai từ Trà Bát, quạt chợ Sông; Cá bống Bích La, gà Trại Lộc"*. Câu này hợp làm bài **"bản đồ sản vật"** trên trang bản đồ.
- Câu *"Nón đẹp Ba Đồn…"*: theo một bài báo, nón Ba Đồn nổi tiếng vì lính đồn Ba Đồn mua nón đẹp các vùng làm quà, chứ không phải vì nón được làm tại chỗ. Đây là một câu chuyện thú vị cho mục "Bạn có biết?".
- Vè về chợ, sản vật vùng Ba Lộng (Lê Văn Trạch sưu tầm) có nhắc mắm nục, lưỡi cày, lưỡi cuốc, nồi, dao… Hợp với làng rèn, làng mắm.
- Bài báo về nón Bố Liêu (Đại Đoàn Kết) có lời nghệ nhân và số liệu hiện trạng, dùng được làm thể loại "phóng sự" (tóm tắt + link).

**Lưu ý pháp lý:** Luật Sở hữu trí tuệ (Điều 23) yêu cầu người sử dụng tác phẩm văn học dân gian phải **dẫn chiếu xuất xứ** và giữ đúng giá trị gốc. Đó là lý do trường `source` bắt buộc với các thể loại dân gian.

### 4.4 Mẫu Excel `docs/data/documents.xlsx` (bắt đầu gom ngay được)

| Cột | Ví dụ | Bắt buộc |
|---|---|---|
| `slug` | `ai-ve-bo-lieu` | ✔ |
| `title` | Ai về Bố Liêu | ✔ |
| `genre` | `folk_verse` (giá trị trong 3.1) | ✔ |
| `body` | nội dung, xuống dòng bằng Alt+Enter | ✔ |
| `summary` | 1–2 câu | |
| `villages` | `bo-lieu, tra-loc` (mã làng, cách nhau dấu phẩy) | |
| `themes` | `lao-dong, que-huong` | |
| `grade_level` | `primary` / `secondary` / `all` | ✔ |
| `author` | để trống = Dân gian | |
| `collector` | Nguyễn Văn A – lớp 8A | |
| `source` | *Địa chí Quảng Trị*, tr. 512 | ✔ với thể loại dân gian |
| `source_url` | link nếu có | |
| `license` | `folk_attributed` / `own_work` / `permission_granted` / `cc_by` / `unknown` | ✔ |
| `glossary` | mỗi dòng `từ: giải nghĩa` (Alt+Enter) | |
| `reading_questions` | mỗi dòng 1 câu hỏi | |
| `permission_note` | "Bà X đồng ý ngày …" (nội bộ) | |

---

## 5. Ghép các phần lại (PR 4)
- [ ] Trang chi tiết làng: mục "Ca dao, truyền thuyết về làng" dạng thẻ cuộn ngang.
- [ ] Popup bản đồ: "📚 3 tư liệu" → `/archive?village=…`. BE annotate `document_count` vào `/villages/map/`.
- [ ] Trang chủ: thẻ **Ca dao hôm nay** + 2 ô lớn "Khám phá bản đồ" / "Vào kho tư liệu".
- [ ] Cập nhật `README.md` (tiếng Anh): endpoint mới, `import_documents`.

---

## 6. Các bước bạn cần làm

Mình viết code. Phần tạo nhánh, chạy lệnh, kiểm tra trên trình duyệt và tạo PR thì bạn làm. Các lệnh chạy từ thư mục gốc repo (Git Bash).

### PR 1 – Bản đồ (`feat/map-leaflet`, đã tạo)

**Trước khi mình code:** không cần làm gì, bạn đang ở đúng nhánh.

**Sau khi mình code xong:**
```bash
# 1. Cài thư viện FE mới
cd frontend && npm install && cd ..

# 2. Bật DB + backend (chưa có migration mới ở PR này)
docker compose up -d db
cd backend && uv run python manage.py runserver      # terminal 1

# 3. Frontend
cd frontend && npm run dev                           # terminal 2

# 4. Kiểm tra trước khi commit
cd backend  && uv run ruff check . && uv run ruff format --check . && uv run pytest
cd frontend && npm run lint && npm run typecheck && npm run build
```
- Mở http://localhost:3000/map và thử lọc, bấm marker, đổi nền vệ tinh, mở trên điện thoại (F12 → chế độ mobile).
- Vào admin, lọc "Chưa có tọa độ" và bổ sung tọa độ cho các làng còn thiếu.
- Commit, push, tạo PR `feat/map-leaflet` → `dev`.

### PR 2 – Kho tư liệu BE
```bash
git checkout dev && git pull
git checkout -b feature/archive-backend
```
**Sau khi mình code xong:**
```bash
cd backend
uv run python manage.py migrate                      # tạo extension unaccent + bảng archive
uv run pytest
uv run python manage.py import_documents ../docs/data/documents.xlsx --dry-run
uv run python manage.py import_documents ../docs/data/documents.xlsx
```
- Vào http://localhost:8000/admin/ và thử thêm 1 câu ca dao có chú giải. Thử xuất bản một tư liệu `license = unknown` (phải bị chặn).
- Kiểm tra http://localhost:8000/api/docs/ để xem các endpoint `/documents/`.

### PR 3 – Kho tư liệu FE
```bash
git checkout dev && git pull
git checkout -b feature/archive-frontend
```
Sau khi code: `cd frontend && npm install && npm run dev`, rồi thử http://localhost:3000/archive trên cả desktop và mobile.

### PR 4 – Ghép các phần
```bash
git checkout dev && git pull
git checkout -b feature/connect-map-archive
```

> Lưu ý: README quy ước tên nhánh là `feature/...`. Nhánh `feat/map-leaflet` vẫn dùng bình thường được, các nhánh sau nên theo `feature/...` cho đồng bộ.
