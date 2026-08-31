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
├── js/sync.js       # sync đa thiết bị qua Firebase (tuỳ chọn)
├── docs/
│   ├── session-length-evidence.md   # bằng chứng đằng sau các con số phút
│   ├── motivation-evidence.md       # bằng chứng về động lực & engagement
│   ├── research-roadmap.md          # các hướng nghiên cứu còn lại + việc nên/không nên làm
│   ├── content-ideas.md             # kịch bản video short rút từ các file evidence
│   ├── youtube-niche-criteria.md    # khung chấm điểm ngách (nguồn Tier D, không trích dẫn)
│   ├── ai-career-depth-roadmap.md   # lộ trình Applied AI Engineer (ngoài phạm vi sản phẩm)
│   └── deferred/                    # kế hoạch đã hoãn — đọc README.md trong đó trước
│       ├── README.md                        # vì sao hoãn + điều kiện mở lại (12 Shorts đã đăng)
│       ├── youtube-health-claims-plan.md    # kênh tiếng Anh: kiểm toán claim sức khoẻ
│       └── youtube-financial-crime-plan.md  # kênh tiếng Anh: tội phạm tài chính
├── content/
│   └── 48-gio/     # video #1: kịch bản, phụ đề, đồ thị, script render, checklist bấm máy
├── test/           # vitest + jsdom, chạy trên chính app thật
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

Trang có 3 tab: **⏱ Timer** (mặc định), **📊 Statistics** và **🌱 Garden**.

- Tab **Timer**: 1 khối duy nhất chia 3 phần **ngang hàng** — Session length |
  Focus (đồng hồ to ở giữa) | Tasks — ngăn nhau bằng 1 nét mờ (không phải 3
  card riêng). Trên màn hẹp, 3 phần tự xếp dọc, nét mờ đổi thành đường kẻ trên.
  Mỗi preset trong "Session length" giờ nằm 1 hàng riêng (tên trái, số phút
  phải) thay vì lưới nhiều cột.
- Tab **Statistics**: toàn bộ số liệu — 3 thẻ tổng hợp, "Today's log", card
  "Insights" (category + giờ trong ngày), heatmap cả năm — dồn sang đây để
  tab Timer gọn, không bị số liệu che mất đồng hồ.
- Tab **Garden**: khu vườn — số token còn lại, shop nằm ngay trong màn hình
  game, và luống đất **leo lên theo tầng** (10 ô mỗi tầng, tối đa 200 tầng).
  Trước đây nó là 1 card nằm trong Statistics; giờ tách hẳn ra vì nó **không
  phải số liệu** — đây là chỗ để xây, không phải chỗ để đọc, và nó cần cả chiều
  ngang của trang.
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
ra 1 dropdown chứa Export/Import/nút copy. Ưu điểm: bấm được từ **cả 3 tab**
(Timer, Statistics và Garden), không cần chuyển tab mới backup được. Bấm ra ngoài
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

## Garden

Ở tab riêng **🌱 Garden**. Đây là **chỗ để xây, không phải log để cuộn** — khác
hẳn bản trước (xem "Vì sao bản trước bị bỏ hẳn" bên dưới).

### Vòng lặp

- **1 pomodoro hoàn thành = 1 token.** Chỉ phiên focus có
  `status === 'completed'` mới tính; phiên nghỉ và phiên bị skip không tính.
- Số token khả dụng **luôn được tính lại từ lịch sử phiên**:
  `available = max(0, earned + income − spent)` — **không lưu thành một số dư
  riêng**, nên nó không thể lệch với log và không thể âm. Thứ được lưu chỉ là
  `spent` (tổng đã tiêu), `income` (tổng bán nông sản), giỏ hàng chưa bán, và
  danh sách những gì đã trồng.
- **Shop** nằm **trong màn hình game**: bấm nút 🛒 thì nó **phủ kín cả màn hình**
  (có padding), chia theo nhóm rõ ràng. Chọn 1 món → shop tự đóng → bấm 1 ô đất
  trống để đặt xuống. Bấm lại món đang giữ để bỏ xuống.
- **Trồng xuống rồi thì di chuyển được, miễn phí** (bấm cây → bấm ô trống khác),
  nhưng **không bán lại, không dỡ ra, không hoàn token**.
- **Thu hoạch**: cây/vật nuôi tới lúc có nông sản thì bấm vào là lấy, vào **giỏ**
  ở đáy màn hình, bấm *Sell all* để đổi thành token và tiêu tiếp.

### Bảng giá

Sinh thẳng từ `SHOP_ITEMS` và `PRODUCE` trong `js/app.js` — nếu bảng này lệch
với code thì là README sai, không phải code sai.

**Hoa**

| Món | Giá | Lớn hết sau | Ra nông sản mỗi | Nông sản | Bán được | Lãi/pomodoro |
|---|---|---|---|---|---|---|
| Sunflower | 3 | 12 pom | một lần rồi hết | Petals | 5 | 0,17 |
| Rose | 9 | 19 pom | một lần rồi hết | Roses | 13 | 0,21 |
| Tulip | 10 | 19 pom | một lần rồi hết | Tulips | 14 | 0,21 |

**Rau củ & gia vị**

| Món | Giá | Lớn hết sau | Ra nông sản mỗi | Nông sản | Bán được | Lãi/pomodoro |
|---|---|---|---|---|---|---|
| Rice | 2 | 12 pom | một lần rồi hết | Rice | 3 | 0,08 |
| Carrot | 4 | 12 pom | một lần rồi hết | Carrots | 6 | 0,17 |
| Tomato | 6 | 13 pom | một lần rồi hết | Tomatoes | 8 | 0,15 |
| Cucumber | 7 | 16 pom | một lần rồi hết | Cucumbers | 10 | 0,19 |
| Corn | 8 | 16 pom | một lần rồi hết | Corn | 11 | 0,19 |
| Aubergine | 13 | 26 pom | một lần rồi hết | Aubergines | 18 | 0,19 |
| Garlic | 14 | 30 pom | một lần rồi hết | Garlic | 20 | 0,20 |
| Onion | 16 | 34 pom | một lần rồi hết | Onions | 22 | 0,18 |
| Potato | 18 | 38 pom | một lần rồi hết | Potatoes | 25 | 0,18 |
| Watermelon | 20 | 42 pom | một lần rồi hết | Watermelons | 28 | 0,19 |
| Aloe vera | 24 | 46 pom | một lần rồi hết | Aloe leaves | 34 | 0,22 |

**Cây ăn trái & cây gỗ**

| Món | Giá | Lớn hết sau | Ra nông sản mỗi | Nông sản | Bán được | Lãi/pomodoro |
|---|---|---|---|---|---|---|
| Cherry | 8 | 18 pom | 20 pom | Cherries | 3 | 0,15 |
| Oak | 12 | 22 pom | 24 pom | Acorns | 4 | 0,17 |
| Pine | 16 | 26 pom | 28 pom | Resin | 5 | 0,18 |
| Birch | 20 | 30 pom | 32 pom | Birch bark | 6 | 0,19 |
| Maple | 24 | 34 pom | 36 pom | Maple syrup | 7 | 0,19 |
| Cypress | 28 | 38 pom | 40 pom | Cones | 8 | 0,20 |
| Mango | 26 | 24 pom | 28 pom | Mangoes | 5 | 0,18 |
| Pineapple | 30 | 20 pom | 33 pom | Pineapples | 6 | 0,18 |
| Dragon fruit | 34 | 26 pom | 32 pom | Dragon fruit | 6 | 0,19 |
| Grapes | 42 | 28 pom | 42 pom | Grapes | 8 | 0,19 |
| Apple | 46 | 32 pom | 46 pom | Apples | 9 | 0,20 |

**Đặc biệt**

| Món | Giá | Lớn hết sau | Ra nông sản mỗi | Nông sản | Bán được | Lãi/pomodoro |
|---|---|---|---|---|---|---|
| Ginseng | 38 | 30 pom | 37 pom | Ginseng root | 7 | 0,19 |

**Vật nuôi**

| Món | Giá | Lớn hết sau | Ra nông sản mỗi | Nông sản | Bán được | Lãi/pomodoro |
|---|---|---|---|---|---|---|
| Cat | 26 | — | — | — | — | — |
| Dog | 30 | — | — | — | — | — |
| Chicken | 18 | — | 18 pom | Eggs | 3 | 0,17 |
| Cow | 34 | — | 30 pom | Milk | 6 | 0,20 |

**Cá**

| Món | Giá | Lớn hết sau | Ra nông sản mỗi | Nông sản | Bán được | Lãi/pomodoro |
|---|---|---|---|---|---|---|
| Fish pond | 36 | — | 32 pom | Fish | 7 | 0,22 |

**Trang trí**

| Món | Giá |
|---|---|
| Pot | 5 |
| Fence | 9 |
| Lantern | 14 |
| Bench | 22 |

### Kinh tế: vì sao không có món nào "phá game"

Toàn bộ 29 món có nông sản đều nằm trong khoảng
**0,08 – 0,22 token/pomodoro** lãi ròng. Đó không phải trùng hợp, mà là điều
kiện thiết kế, và nó bị test tự động canh.

Vì sao phải canh: token chỉ dùng để mua đồ trong vườn, **không có chỗ tiêu nào
khác**. Nên nếu một món trả lãi cao, nó không làm người chơi giàu — nó làm
**cả cái shop mất nghĩa**, và mất luôn cái đích để mà nhắm tới. Đã có đúng một
lần suýt như thế: Maple và Cypress từng trả **1,00 token/pomodoro vĩnh viễn** —
một cây tự nó nhân đôi thu nhập, 40 cây là 40 lần. Đó là lỗi cân bằng, không
phải thiết kế, và đã sửa.

Hai cách giữ nó ở trong khoảng:

- **`mature` riêng cho từng món** — số pomodoro để lớn hết. Món đắt lớn lâu hơn
  *đúng theo tỉ lệ* giá của nó. Nếu dùng một bảng chung cho tất cả (bản trước
  dùng `GROWTH_STEPS` cứng) thì cây đắt nhất chín nhanh y như cây rẻ nhất, và
  nha đam sẽ trả ~2,7 token/pomodoro.
- **Cây ngắn ngày (`annual`) bị lấy đi cùng lúc thu hoạch** — phải mua lại.
  Đó là công việc đổi lấy tỉ lệ cao hơn một chút so với cây lâu năm. Nông sản
  **luôn bán được nhiều hơn giá giống**, nên bấm nhầm không bao giờ làm bạn lỗ.

Hoàn vốn trải từ **12 pomodoro** (lúa) tới **235 pomodoro** (táo), nên món đắt
vẫn là món đáng để dành dụm, chứ không phải một cái bẫy.

### Cây lớn theo việc đã làm, không theo thời gian

**Cây lớn theo số pomodoro hoàn thành *sau khi* nó được trồng** — lúc trồng,
app lưu `plantedSeeds` = tổng pomodoro tại thời điểm đó, và tuổi cây là hiệu số
so với hiện tại. Không có đồng hồ treo tường ở đây: **chờ không làm cây lớn
thêm, và nghỉ không làm cây tụt lại** — nó đứng nguyên ở giai đoạn đã tới.

Cùng lý do đó, **nông sản cũng đếm bằng pomodoro chứ không bằng giờ**. Nếu tính
theo giờ thật thì app đang **trả tiền cho việc để nó mở**, tức là cắt đúng cái
sợi dây làm cả tab này có nghĩa. Đếm bằng pomodoro thì một cái cây là **hệ số
nhân lên công việc**, không phải đường tránh nó: cây đắt làm mỗi phiên đáng giá
hơn, còn một khu vườn không ai làm việc thì không ra gì cả.

5 giai đoạn. `GROWTH_STEPS = [0, 2, 4, 7, 12]` giờ là **tỉ lệ**, không phải số
đếm — nó bị kéo giãn theo `mature` của từng món:

| Mốc | Công thức | Oak (`mature: 22`) | Lúa (`mature: 12`) | Nha đam (`mature: 46`) |
|---|---|---|---|---|
| 1 — mầm | 0 | 0 | 0 | 0 |
| 2 — cây non | 2/12 × mature | 4 | 2 | 8 |
| 3 | 4/12 × mature | 8 | 4 | 16 |
| 4 | 7/12 × mature | 13 | 7 | 27 |
| 5 — lớn hết | mature | 22 | 12 | 46 |

Giai đoạn 2 **không phải bản thu nhỏ của cây trưởng thành**: thu nhỏ nguyên tỉ
lệ thân/tán ra đúng cái hình "lollipop" mà bản trước bị mắc. Nên mỗi loài có
riêng một tán giai đoạn 2 **thấp và rộng trên một thân ngắn** (`trunkShort`) —
hình mà một cây non thật sự có.

### Thu hoạch: vẽ ra bao nhiêu thì được đúng bấy nhiêu

Số quả **vẽ trên cây** chính là số đơn vị **sẽ nhận được** khi bấm — không bao
giờ vẽ 9 quả rồi cho 1 đơn vị.

- Cây lâu năm: **1 đơn vị cho mỗi chu kỳ đã chờ**, **chặn ở 9**. Chặn ở đó để
  luống không thành chỗ để tích trữ thay vì chỗ để chăm.
- Cây ngắn ngày: **1 đơn vị**, và cây bị lấy đi cùng nông sản (như nhổ một cây
  xà lách). Nó **chỉ xảy ra vì bạn bấm** — không có gì bị lấy đi vì bỏ mặc hay
  vì thời gian trôi.
- Chưa chín thì **vẽ 0 quả**, không vẽ một phần của mục tiêu — xem luật "không
  bao giờ vẽ phần còn thiếu" bên dưới.

### Tầng: luống leo lên không giới hạn

Luống **không cố định ở 4 hàng nữa**. Mỗi tầng là 10 ô; số tầng =
`max(4, tầng cao nhất đã trồng + 1 + 2)`, chặn trên ở **200 tầng** (2.000 ô).
Nghĩa là: **luôn có tầng trống ở trên đầu để trồng tiếp**, và khu vườn *leo lên*
thay vì kéo dài sang phải.

- Trong DOM, **tầng cao nhất nằm trước**, nên tầng 0 ở đáy — ngay trên mặt đất.
- Lần mở đầu tiên **cuộn xuống mặt đất**, chỗ khu vườn bắt đầu. Sau đó khung
  nhìn **giữ đúng chỗ bạn để nó**: cả luống bị dựng lại sau mỗi lần bấm, nên vị
  trí cuộn phải được mang qua bằng tay — nếu không, trồng ở tầng 12 là bị ném về
  trời.
- Tầng chưa có gì được đánh dấu `plot-row-bare` để **vẽ thấp lại**. Trước đó
  tầng rỗng chiếm đúng chiều cao mà một cây cổ thụ cần, nên hơn nửa màn hình là
  đất trống và khu vườn đọc thành "còn dở dang".

### Hình vẽ

- Toàn bộ là **SVG viết tay**, dựng bởi `drawPlant()` / `drawDecor()` từ các
  *part spec* riêng cho từng loài (path, hình tròn, hoặc vòng cánh hoa sinh tự
  động). Không ảnh, không thư viện. Hiện có **26 loài cây** × 5 giai đoạn, cộng
  vật nuôi và đồ trang trí.
- Mỗi cây có một **độ lệch riêng, deterministic, hash từ `id` của chính nó** —
  xoay ±2,5°, phóng ±5,6%, và có thể bị lật ngang — nên **một luống không trông
  như đúc ra từ một khuôn**. Cùng một cây thì lần nào vẽ lại cũng lệch y như vậy.
- Trong **shop** thì độ lệch đó bị tắt (`flat`): các món đứng cạnh nhau phải so
  sánh được với nhau, chỗ đó mà lệch thì đọc thành "hình vẽ không nhất quán".
  Shop vẽ cây ở giai đoạn 4.
- **Màu**: mỗi cây chỉ có **một dải màu được tô theo món** (`deep`/`base`/
  `light`) — dành cho **thứ bạn trồng ra**. Còn lá, thân, bẹ, dây leo luôn lấy
  `stem`/`stemdark`, nên **rau vẫn xanh bất kể bảng màu của nó là gì**.
- **Chuyển động**: cây **chưa tới giai đoạn cuối** thì lay nhẹ, và **lệch pha
  nhau** (mỗi ô một `--sway-delay`, chu kỳ 7 ô) để cả luống không thở cùng một
  nhịp. Cây đã xong thì đứng yên — ở đây không có "cây bị lỗi", chỉ có cây còn
  đang trên đường.
- Một cái bẫy đã mắc một lần, ghi lại để không mắc nữa: **CSS `transform` THAY
  THẾ thuộc tính `transform` của SVG chứ không cộng vào nó.** Animation lay đặt
  trên `.plant-body` đã xoá sạch `scale()` của giai đoạn, làm cây non vẽ ra
  đúng cỡ cây lớn. Vì vậy markup phải lồng `g.plant-sway` **ở ngoài**
  `g.plant-body`.

### Vì sao bản trước bị bỏ hẳn

Bản cũ **mọc 1 cây cho mỗi ngày có làm việc**, rồi xếp các ngày thành hàng, vô
hạn. Nó chết vì một lý do đáng ghi lại:

- **Trần nội dung bị đụng trong khoảng sáu tuần** — 5 giai đoạn × 6 loài =
  **30 hình vẽ**, hết.
- Còn **số lượng thì tăng không giới hạn**: một năm dùng = **365 cây trên 37
  hàng**, trong đó **hàng 12 và hàng 31 không phân biệt được với nhau**.

**Số lượng mà không có cái mới là giấy dán tường.** Bản mới đảo ngược đúng chỗ
đó: luống có **biên**, nên một năm làm việc *lấp đầy một khu vườn* thay vì kéo
dài một danh sách — và cái bạn nhận được sau một chuỗi dài là **một chỗ trông
giống của bạn**, chứ không phải một chỗ dài hơn.

### Luật "không bao giờ vẽ phần còn thiếu"

**Shop hiện giá, không bao giờ hiện bạn còn thiếu bao nhiêu.** Món chưa đủ token
chỉ **bị làm mờ** và vẫn hiện giá; bấm vào thì bị bỏ qua **im lặng**, không câu
nào mắng, và **không có chữ "cần thêm N token" ở bất cứ đâu trong tab này**.

Lý do rút từ [`motivation-evidence.md`](docs/motivation-evidence.md), phần "the
single most actionable reward finding" (Deci, Koestner & Ryan 1999,
performance-contingent breakdown, Qb(3)=25,06, p<,001): phần thưởng kiểu **"bạn
được 3 trên 8 có thể"** là **thiết kế tệ nhất trong toàn bộ literature về
reward** — free-choice **d = −0,80 đến −0,88** — trong khi kiểu "ai làm được thì
nhận đủ" gần như vô hại (**d = −0,15**; re-analysis của Cameron 2001 còn
**−0,03, không đáng kể**). Chính DKR viết: thiết kế tai hại nhất là thiết kế mà
*"nếu không đạt hiệu suất tối ưu thì nhận phần thưởng nhỏ hơn"*.

Phân biệt mà thiết kế này dựa vào: **một bảng giá bạn có thể dành dụm để với
tới là một cái menu bạn chọn, không phải một phần thưởng bạn được hứa rồi bị
trả cho một phần.**

Nói cho công bằng: **đây là một phán đoán, không phải điều nghiên cứu được
trích ở trên kết luận.** DKR đo phần thưởng *bị chia tỉ lệ theo mức bạn hụt*
trong một thí nghiệm có người trao thưởng, không đo một bảng giá trong shop; và
chính file evidence đó đã ghi lại một lần app này **cố tình đi ngược** nó (skill
bar, vì áp dụng quá rộng). Ở đây lằn ranh được vẽ ở đúng một chỗ: **giá thì
hiện, khoảng cách tới giá thì không** — nếu về sau thấy chỗ này vẫn đọc thành
"bạn còn hụt", thì phần cần sửa là shop, không phải cái luật.

Cùng lý do đó, **số token không bao giờ xuất hiện cạnh đồng hồ**: không banner,
không toast, không con số nào của khu vườn ở tab Timer. Riêng việc làm một tín
hiệu phần thưởng **nổi bật về mặt hình ảnh** đã đủ đảo dấu tác dụng của nó
(salient **d = −0,78** so với non-salient **d = +0,24**). Việc tách vườn thành
một tab riêng thì rõ ràng *dễ thấy hơn* một card nằm lọt trong Statistics —
cũng là một phán đoán, đánh đổi để khu vườn có chỗ mà thở, với điều kiện bạn
vẫn phải tự bấm sang mới thấy nó.

### Ba luật an toàn

1. **Token không bao giờ hết hạn**, không rơi rụng, không mất giá theo thời gian —
   token đã kiếm là đã kiếm.
2. **Không có gì thu phí duy trì.** Trồng xuống là xong: không tưới, không nuôi,
   không phải quay lại để giữ.
3. **Không có gì héo hay chết vì bị bỏ mặc.** Cây không có việc mới phía sau chỉ
   *đứng chờ* ở giai đoạn nó đã tới — nghỉ một ngày, một tuần, một tháng đều
   không trừ gì cả.

### Một lỗ hổng đã biết: vườn không nằm trong backup

**Bố cục khu vườn (`pomodoroBench.garden.v1`) KHÔNG được xuất trong
Export/Import, và KHÔNG được sync qua Firebase.** `buildBackupData()` trong
`js/app.js` chỉ đóng gói `sessions`, `tasks`, `categories`, `presets`; `js/sync.js`
push đúng cái object đó, nên phía sync thiếu y như vậy.
(`pomodoroBench.skillMarks.v1` hiện cũng đang bị để ngoài, nên đây là chuyện có
tiền lệ, không phải một trường hợp lẻ.)

Hậu quả cụ thể: **đổi máy hoặc import một file backup sẽ không mang khu vườn
theo.** Số token *kiếm được* thì tự tính lại đúng (nó rút từ `sessions`, mà
`sessions` có trong backup) — nhưng `spent` và toàn bộ vị trí đã bày sẽ về rỗng,
nên máy mới hiện toàn bộ pomodoro thành token chưa tiêu trên một luống đất trắng.
Chưa sửa; ghi ra đây để không ai tưởng nó đã được sao lưu.

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

## Animation

Thêm vài hiệu ứng động nhẹ, tôn trọng `prefers-reduced-motion` (tắt hết nếu
hệ điều hành đặt giảm hiệu ứng động):

- **Chuyển tab / mở Statistics**: nội dung mờ dần trượt lên khi hiện ra, các
  card/tile xuất hiện lệch nhịp nhau (stagger) 1 chút thay vì bật hết cùng lúc.
- **Bấm nút**: mọi nút (preset, tab, icon-btn, checkbox task...) hơi co lại
  khi bấm — phản hồi chạm rõ hơn.
- **Vòng đồng hồ**: "thở" nhẹ (glow mờ dần) trong lúc đang chạy, để biết ngay
  đồng hồ có đang tính giờ không mà không cần nhìn số.
- **Thanh tiến trình pomodoro** trên task card chuyển động mượt khi tăng lên,
  không nhảy khựng.
- **Banner hết phiên, toast Undo, dropdown Backup**: trượt/mờ dần vào thay vì
  hiện đột ngột.
- **Biểu đồ "By category" và "By hour of day"**: vẽ dần (donut quét theo
  chiều kim đồng hồ, cột giờ mọc lên) mỗi khi đổi tab Day/Month/Year/All time,
  thay vì hiện khựng toàn bộ ngay lập tức.

## Tuỳ biến

- **Preset độ dài phiên**: thêm/xoá ngay trong app bằng nút "+ New session
  type" dưới lưới preset (lưu ở `pomodoroBench.customPresets.v1`). Muốn sửa
  các preset dựng sẵn thì vào mảng `PRESETS` ở đầu `js/app.js` (id, tên, số
  phút tập trung/nghỉ, ghi chú gợi ý).
  > **Trước khi đổi bất kỳ con số phút nào, đọc
  > [`docs/session-length-evidence.md`](docs/session-length-evidence.md).**
  > File đó ghi lại phần đã tra cứu: cái gì thật sự có bằng chứng, con số nào
  > được lặp lại khắp nơi nhưng **không truy được về nghiên cứu nào** (25/5,
  > "15–25 phút để vào flow", chu kỳ 90 phút, "long break sau 4 pomodoro"…),
  > và vì sao từng giá trị hiện tại là như vậy. Viết ra để khỏi phải search
  > lại lần nữa.
- **Màu sắc / font**: khai báo ở đầu `css/style.css` dưới dạng CSS variables
  (`--accent`, `--paper`, v.v.), có bản riêng cho dark mode.
- **Dữ liệu lưu ở đâu**: `localStorage` key `pomodoroBench.sessions.v1` (lịch
  sử phiên), `pomodoroBench.tasks.v1` (danh sách task),
  `pomodoroBench.categories.v1` (danh sách category),
  `pomodoroBench.customPresets.v1` (session type tự tạo),
  `pomodoroBench.garden.v1` (token đã tiêu, tiền bán nông sản, giỏ hàng và bố
  cục khu vườn) và
  `pomodoroBench.timer.v1` (trạng thái đồng hồ hiện tại). Xoá các key này
  trong DevTools nếu muốn làm sạch hoàn toàn.
