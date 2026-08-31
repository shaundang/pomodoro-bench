# 48 giờ — checklist bấm máy

**Mục đích của file này:** để tối nay không phải mở [`script.md`](script.md) ra đọc lại rồi
quyết định gì nữa. Mọi quyết định đã chốt trong script và trong
[`publish.md`](publish.md). Đây chỉ là thứ tự việc làm.

**Tổng thời gian thực tế:** ~90 phút, trong đó ~15 phút là cài đặt một lần duy nhất.

**Quy tắc duy nhất:** không sửa script. Nếu nảy ra ý làm nó hay hơn — ghi vào cuối file này
ở mục *Cho video sau*, rồi quay tiếp.

---

## Bước 0 — Cài ffmpeg (một lần, ~10 phút)

Đã kiểm tra 2026-08-31: **máy chưa có ffmpeg**, và [`render.ps1`](render.ps1) cần nó.

```powershell
winget install Gyan.FFmpeg
```

Rồi **mở terminal mới** (PATH chỉ nạp lại ở tiến trình mới) và xác nhận:

```powershell
ffmpeg -version
```

- [ ] `ffmpeg -version` chạy được

---

## Bước 1 — Chuẩn bị chỗ quay (~10 phút)

- [ ] Điện thoại dựng dọc, cố định (chân đế / dựa vào chồng sách), **mắt ngang tầm ống kính**
- [ ] Một nguồn sáng phía trước mặt, không phía sau
- [ ] **Mic lav cắm vào** — script gọi đây là khoản đầu tư duy nhất đáng tiền. Không có mic
      thì để điện thoại **cách miệng dưới 1 m** và quay trong phòng có đồ đạc (không phòng trống)
- [ ] Tắt thông báo, đóng cửa
- [ ] Ngồi vào khung, quay thử **5 giây**, nghe lại bằng tai nghe. Nghe tiếng echo hoặc tiếng
      ồn nền → đổi phòng ngay bây giờ, không phải sau khi quay xong 10 take

---

## Bước 2 — Ba câu đọc trước khi bấm máy (~2 phút)

Đọc to. Đây là bốn câu **không được nói** trong VO, rút từ mục ⛔ Ranh giới:

1. Ngưỡng **không** phải 40 giờ — quanh **48–49**
2. Luật VN 48 giờ là **trùng hợp**, không phải dựa trên nghiên cứu này
3. **Không** có não bộ nào trong dữ liệu này — đây là kinh tế lao động, đo sản lượng
4. Làm quá 48 giờ **không** vô ích — vẫn tăng, chỉ là tăng chậm dần

Và hai câu **bắt buộc** phải có trong take: *"quanh 48 đến 49"* và *"trùng hợp"*.

- [ ] Đã đọc to cả sáu dòng trên

---

## Bước 3 — Quay (~30 phút)

Một take liên tục 44 giây, **nói cả tiếng** (không quay hình câm). Beat sheet ở
[`script.md`](script.md#beat-sheet) — dán lên tường sau điện thoại hoặc để trên laptop cạnh
ống kính, đừng nhìn xuống đọc.

Nhắc từ script:

- **Giây 0 là chữ "Luật".** Không "xin chào", không "hôm nay mình sẽ". Preamble = chết
- **Nói nhanh hơn cảm giác tự nhiên ~10%** — 44 giây cần nhịp gọn
- Beat cuối (0:38–0:44) **không được cắt**. Nếu thiếu thời gian, cắt beat 0:05–0:13

Quy tắc số take: **quay tối đa 6 take, chọn cái tốt nhất trong 6 cái đó.** Không quay tới khi
hoàn hảo — video này chấm bằng retention, và take thứ 15 không giữ người xem tốt hơn take thứ
4. Take nào có đủ hai câu bắt buộc và không có câu bị cấm là **đủ dùng**.

- [ ] Có một take đủ dùng
- [ ] Nghe lại take đó **một lần** với ba câu hỏi: có biến thành khoa học thần kinh không ·
      đã nói "trùng hợp" chưa · beat 52 giờ có nói **"cả năm"** hoặc **"bình quân"** không
      (nếu buột miệng thành "một tháng" thì con số phải là 57, không phải 52 — quay lại beat đó)

---

## Bước 4 — Đặt file đúng tên (~5 phút)

`render.ps1` cần đúng hai file này trong `content/48-gio/`:

| File | Là gì |
|---|---|
| `master.mp4` | take đã chọn |
| `vo.wav` | tiếng nói — **rút thẳng từ chính take đó** |

Copy take từ điện thoại về thư mục này, đổi tên thành `master.mp4`, rồi tách tiếng:

```powershell
ffmpeg -i master.mp4 -vn -ac 1 -ar 48000 vo.wav
```

**Vì sao rút từ take chứ không thu VO riêng:** `render.ps1` lấy tiếng từ `vo.wav` và bỏ tiếng
trong `master.mp4`. Thu VO riêng thì phải khớp môi — không cần thiết cho video này. Rút từ
chính take thì khớp môi tuyệt đối, và vẫn giữ được cấu trúc tách rời mà `render.ps1` cần.

- [ ] `master.mp4` và `vo.wav` đã có trong `content/48-gio/`

---

## Bước 5 — Render (~10 phút)

Xem nhịp trước, chưa cần đồ thị:

```powershell
.\render.ps1 -NoCurve -Out preview.mp4
```

- [ ] Xem `preview.mp4` **trên điện thoại thật**: phụ đề có nằm **trên** vùng UI của Shorts
      không (`MarginV 430` trong [`sub.ass`](sub.ass) là ước lượng). Bị che → sửa `MarginV`
      lên 480–520 rồi chạy lại
- [ ] Phụ đề có khớp lời không. Lệch → sửa timestamp trong `sub.ass`, không quay lại

Rồi bản thật:

```powershell
.\render.ps1
```

- [ ] Xem `out.mp4` trên điện thoại: đồ thị (0:13–0:38) **không che mặt**. Che → `.\render.ps1
      -CurveY 300` (lên) hoặc `-CurveY 460` (xuống)

---

## Bước 6 — Đăng (~10 phút)

Tiêu đề và mô tả đã viết sẵn trong [`publish.md`](publish.md) — **copy nguyên, đừng viết lại**.
Trên Shorts tiêu đề gần như không quyết định gì; thời gian dành cho nó là thời gian mất.

- [ ] Tiêu đề: `Quá 48 giờ/tuần thì mỗi giờ làm thêm tạo ra ít hơn`
- [ ] Mô tả: copy cả khối từ `publish.md`, **gồm phần NGUỒN** — đây là moat của kênh, không
      phải phần trang trí
- [ ] Đăng **công khai**, không phải "unlisted để xem lại sau"

---

## Sau khi đăng — làm đúng hai việc rồi đóng laptop

- [ ] Ghi vào [`../../docs/content-ideas.md`](../../docs/content-ideas.md) slate #4: đã đăng,
      kèm ngày
- [ ] Chọn video tiếp theo từ slate (#1, #2, #3 hoặc #5) và **chỉ tạo thư mục
      `content/<tên>/`** cho nó. Không viết script tối nay

**Không làm tối nay:** không xem analytics (chưa có số liệu nào có nghĩa trong 24 giờ đầu),
không mở YouTube feed, không mở file kế hoạch ngách nào. Video này chấm ở mốc video thứ 10,
không phải tối nay.

---

## Cho video sau

Mọi ý tưởng nảy ra trong lúc quay, ghi xuống đây rồi quay tiếp — không sửa script đang quay:

-
