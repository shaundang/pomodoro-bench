# Pomodoro Bench

Bộ đếm Pomodoro chạy hoàn toàn ở phía client — không server, không tài khoản,
không gửi dữ liệu đi đâu. Toàn bộ lịch sử phiên làm việc lưu trong
`localStorage` của trình duyệt trên máy bạn.

## Cấu trúc

```
pomodoro-bench/
├── index.html      # nội dung trang
├── css/style.css   # giao diện, hỗ trợ cả light/dark theme
├── js/app.js        # logic đồng hồ, preset, thống kê
└── README.md
```

## Chạy thử ngay (không cần deploy)

Mở trực tiếp `index.html` bằng trình duyệt (double-click hoặc kéo vào tab
trình duyệt). Mọi thứ hoạt động qua `file://`, chỉ cần có mạng để tải font
từ Google Fonts (nếu offline, trang vẫn chạy, chỉ là dùng font hệ thống thay
thế).

## Tự deploy

Đây là site tĩnh thuần HTML/CSS/JS — deploy lên bất kỳ static hosting nào,
không cần build step. Vài lựa chọn:

### GitHub Pages
```
git init
git add .
git commit -m "Pomodoro Bench"
git branch -M main
git remote add origin <repo-url-của-bạn>
git push -u origin main
```
Sau đó vào Settings → Pages → chọn branch `main`, thư mục `/ (root)`.

### Netlify
Kéo cả folder `pomodoro-bench` vào https://app.netlify.com/drop — xong, có
link ngay. Hoặc dùng Netlify CLI: `netlify deploy --dir=. --prod`.

### Vercel
```
npx vercel --prod
```
Chạy trong thư mục này, chọn "no framework" khi được hỏi.

### Chạy server local để test (tuỳ chọn)
```
npx serve .
```

## Categories

Không có khu quản lý category riêng — category được tạo và gắn ngay tại nơi
dùng nó, kiểu Jira:

- **Khi thêm task**: chọn category từ dropdown, hoặc chọn "+ New category…"
  để gõ tên mới ngay tại chỗ (Enter để tạo, Esc để huỷ). Category mới xuất
  hiện ngay trong mọi dropdown khác từ đó.
- **Trên từng task card**: category hiện thành 1 chip màu (ví dụ AI, English,
  Reading — mỗi tên tự động có 1 màu riêng, 6 màu xoay vòng). Bấm vào chip để
  đổi category ngay tại card, không cần mở form sửa đầy đủ.
- Mặc định có sẵn 3 category khởi điểm (Learning / Work / Personal) cho lần
  đầu chạy — cứ đổi tên hoặc bấm "+ New category…" để thay bằng cái khác.
- Category dùng chung một danh sách nền (lưu ở `pomodoroBench.categories.v1`)
  nên tên luôn nhất quán giữa các task, không lo gõ sai/lệch chính tả.
- Hiện chưa có cách xoá 1 category khỏi danh sách nền (chỉ có thể đổi category
  của từng task sang cái khác) — nói mình nếu bạn cần thêm tính năng này.

## Bố cục màn hình

Trang có 2 tab: **⏱ Timer** (mặc định) và **📊 Statistics**.

- Tab **Timer**: 1 khối duy nhất chia 3 phần **ngang hàng** — Session length |
  Focus (đồng hồ to ở giữa) | Tasks — ngăn nhau bằng 1 nét mờ (không phải 3
  card riêng). Trên màn hẹp, 3 phần tự xếp dọc, nét mờ đổi thành đường kẻ trên.
  Mỗi preset trong "Session length" giờ nằm 1 hàng riêng (tên trái, số phút
  phải) thay vì lưới nhiều cột.
- Tab **Statistics**: toàn bộ số liệu — 3 thẻ tổng hợp, "Today's log", card
  "Insights" (category + giờ trong ngày), heatmap cả năm — dồn sang đây để
  tab Timer gọn, không bị số liệu che mất đồng hồ.
- App tự nhớ tab bạn đang mở (lưu ở `localStorage`), lần sau mở lại vào đúng
  tab cũ.

## Mô hình Task (kiểu Pomofocus)

Mỗi task là 1 card trong khu vực "Tasks", hiện đủ 3 thứ cần biết chỉ bằng
mắt: **tên việc** (VD "Anki"), **session length** (VD "Study & practice") và
**category** (chip màu, VD "English") — cùng số pomodoro ước tính/đã làm
(`2/4 🍅`) và thanh tiến trình.

- Click vào card để chọn làm "task đang chạy". Khi chọn, đồng hồ **tự áp
  dụng session length đã gắn cho task đó** (phút làm/nghỉ) — không cần chọn
  lại preset ở khu "Session length" phía trên mỗi lần đổi task.
- Preset "Session length" ở trên vẫn hoạt động như cũ (chip + số phút tự
  chỉnh) — chọn preset nào trước khi bấm "Add" thì task mới sẽ mang preset
  đó. Chỉnh số phút khi 1 task đang active cũng tự lưu lại vào task đó, lần
  sau chọn lại nó là nhớ nguyên.
- Category (chip màu) bấm được ngay trên card để đổi nhanh, giống mô tả kỳ
  trước.
- ✎ để mở form sửa đầy đủ: tên, session length, category, số ước tính, và
  **Notes** (xem bên dưới). ✕ để xoá (có "Undo" 6 giây).
- Xoá một task không xoá lịch sử đã log của nó — log/thống kê giữ nguyên tên
  + category tại thời điểm ghi.
- Không thể đổi task đang chạy khi đồng hồ đang chạy (phải Pause hoặc chờ
  xong phiên).

## Notes trên từng task

Trong form sửa task (✎), có khu "Notes" — danh sách các ghi chú theo từng
pomodoro, mỗi dòng gồm 2 phần: **số pomodoro** (ô số nhỏ) và **description**
(mô tả bạn đã làm gì). Mặc định chỉ 1 dòng trống, không tự sinh ra theo số
pomodoro ước tính — bấm "+ Add note" để thêm dòng, ✕ trên từng dòng để xoá.
Card ngoài (chưa mở edit) hiện gọn 1 chỉ báo "📝 N" nếu task có ghi chú.

## Màu session length trên task card

Mỗi preset ở "Session length" (Deep work, Writing, Study & practice, …) có
1 màu nhạt riêng, cố định (không đổi theo dữ liệu) — hiện như 1 chấm màu nhỏ
ngay trong danh sách preset, và tô màu cho chip session trên từng task card.
Nhìn màu là nhận ra ngay task đó đang dùng preset nào, tách biệt với màu
category (chip category dùng bảng màu khác, dạng pill tròn).

## Card "Insights" — By category + By hour of day, cùng chung 1 khoảng thời gian

Bỏ chart "Last 7 days" (không có thang đo, nhãn ngày lặp, và trùng ý với
heatmap) — thay bằng card **"Insights"** full-width, gộp 2 biểu đồ dùng
**chung 4 tab Day / Month / Year / All time**, để không còn tình trạng mỗi
widget trong trang nói một khoảng thời gian khác nhau:

- **By category**: biểu đồ tròn (donut) + danh sách — mỗi lát cắt là 1
  category, độ lớn = % thời gian focus trong khoảng đã chọn, màu khớp với
  chip category ở mọi nơi khác. Giữa vòng tròn hiện tổng thời gian của khoảng
  đó.
- **By hour of day**: biểu đồ cột 24 giờ (00–23) — cột nào cao là giờ đó bạn
  tập trung nhiều, cột peak được tô đậm nhất; dưới chart có câu tóm tắt
  "Peak focus hours: HH:00–HH:00".

Bấm 1 tab, cả 2 biểu đồ đổi theo cùng lúc. App nhớ tab đã chọn lần cuối (lưu
ở `localStorage`).

Layout tab Statistics: "Today's log" full-width; "Insights" và "Pomodoro
heatmap" cũng full-width, xếp theo cột đơn giản (không còn ghép 2 card/hàng
như trước, vì mọi card giờ đều đáng để full-width).

## Today's log — giới hạn chiều cao + nút mở rộng

"Today's log" mặc định cao tối đa ~300px, cuộn được nếu ngày đó log nhiều
phiên — nhưng để đỡ phải cuộn trong khung nhỏ khi cần xem hết, có thêm nút
**⤢** cạnh nút "Today": bấm vào để mở rộng khung log lên tới ~640px, xem
được nhiều phiên hơn cùng lúc; bấm lại (⤡) để thu về như cũ. Khi 1 ngày có
trên 5 phiên, dưới danh sách hiện thêm dòng nhỏ báo tổng số phiên + gợi ý bấm
nút mở rộng. App nhớ trạng thái mở/thu gọn lần cuối.

## Backup — menu góc phải trên

Backup không còn là 1 card riêng trong tab Statistics nữa (nằm ở đó trông vô
duyên) — chuyển thành nút **"💾 Backup"** ở góc phải, ngay trong header, mở
ra 1 dropdown chứa Export/Import/nút copy. Ưu điểm: bấm được từ **cả 2 tab**
(Timer và Statistics), không cần chuyển tab mới backup được. Bấm ra ngoài
hoặc nhấn Esc để đóng dropdown.

## Tính năng thống kê

- **Today's log**: xem/sửa/xoá từng phiên đã ghi, duyệt qua lại theo ngày bằng
  nút ‹ › hoặc bấm "Today" để quay lại hôm nay. Xoá có "Undo" trong 6 giây.
- Phiên bị **Skip** giữa lúc đang chạy vẫn được ghi lại (đánh dấu "cut short")
  nếu đã làm ít nhất 1 phút — không tính vào số pomodoro của task, nhưng vẫn
  tính vào tổng thời gian.
- **3 thẻ thống kê** (rút từ 5 xuống 3, đơn vị thời gian đồng nhất bằng
  `formatDuration` ở mọi nơi — không còn tile nào hiện phút thô):
  - **Today** (tile nổi bật nhất): thời gian đã focus hôm nay (VD "2h 15m"),
    kèm số pomodoro, và **so sánh với trung bình mỗi ngày của bạn** (VD
    "▲ 20% vs daily average") nếu đã có đủ dữ liệu.
  - **Day streak**: streak hiện tại + "Best N" (streak dài nhất từng đạt).
  - **All time**: tổng thời gian + tổng số pomodoro từ trước tới nay.
- **Backup**: nút "Export data" xuất file JSON gồm cả sessions và tasks (tải
  xuống hoặc copy tay), "Import data" nhập lại — dùng để sao lưu hoặc chuyển
  dữ liệu sang máy khác.

## Pomodoro heatmap

Ở tab **Statistics**, card "Pomodoro heatmap" vẽ cả năm hiện tại (1/1 → 31/12,
kiểu lịch GitHub) — mỗi ô là 1 ngày, màu xanh đậm dần theo **số pomodoro hoàn
thành trong ngày đó** (không tính phiên bị skip, không chia theo giờ/phút).

Ngưỡng màu cố định (không đổi theo dữ liệu, để so sánh được xuyên suốt cả
năm):

| Số pomodoro/ngày | Màu |
|---|---|
| 0 | xám nhạt (không làm gì) |
| 1–2 | xanh nhạt |
| 3–4 | xanh vừa |
| 5–6 | xanh đậm |
| 7+ | xanh đậm nhất |

Hover vào 1 ô để xem đúng ngày đó làm bao nhiêu pomodoro (tooltip kiểu
"22 Aug 2026 — 5 pomodoros"). Khu vực heatmap có thể kéo ngang (scroll) nếu
màn hình hẹp.

Có nút **‹ ›** cạnh năm để xem lại các năm trước (không giới hạn quá khứ,
chỉ chặn không cho đi tới năm tương lai); dưới heatmap hiện tổng số pomodoro
đã làm trong năm đang xem. Legend đổi thứ tự thành **màu trước, số sau**
(nhóm chặt bằng khoảng cách CSS) để tránh nhìn lẫn màu của ô này với số của
ô bên cạnh.

## Tuỳ biến

- **Preset độ dài phiên**: sửa mảng `PRESETS` ở đầu file `js/app.js` (id, tên,
  số phút tập trung/nghỉ, ghi chú gợi ý).
- **Màu sắc / font**: khai báo ở đầu `css/style.css` dưới dạng CSS variables
  (`--accent`, `--paper`, v.v.), có bản riêng cho dark mode.
- **Dữ liệu lưu ở đâu**: `localStorage` key `pomodoroBench.sessions.v1` (lịch
  sử phiên), `pomodoroBench.tasks.v1` (danh sách task),
  `pomodoroBench.categories.v1` (danh sách category) và
  `pomodoroBench.timer.v1` (trạng thái đồng hồ hiện tại). Xoá các key này
  trong DevTools nếu muốn làm sạch hoàn toàn.
