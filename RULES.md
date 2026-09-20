- Đặt quy chuẩn để AI tự kiểm tra
 + Con AI đôi khi nhầm do logic mà nó tự tin với kết quả nó findings ra 
 + Nối con AI vào trình duyệt, tự simulate những hành động của 1 real user dùng, rồi báo kết quả. Cần checklist quy chuẩn đầu ra
- Nhiều khi AI làm sai vì nó phải tự dò tìm (kiểu mò mẫm) (có thể là không tới được chỗ cần xem -> Cho AI biết sản phẩm có phần nào, chi tiết các thứ, gọi là tấm bản đồ, đi đến từng component bằng đường nào, chỉ cần file ngắn ghi lại những thứ mà mình hiển nhiên biết, để nó không cần tự dò tìm).
- Viết 1 cái trang, kiểm tra thật, check list thật, check hết rồi mới coi là xong
- Orchestrator Agent (viết tiêu chí chấm điểm) và Sub agents (Làm bài test, đưa vào worktree riêng, và tên các thư mục phải bình thường, không có test/benchmark, để Agent không bị bias)
- Dựng hàng rào (rào chắn mềm - lời nhắn trong prompt, có lần tuân thủ có lần bỏ sót), chưa hoàn toàn hiệu quả. Rào chắn cứng (viết 1 hệ thống để evaluate đằng sau) - CI
- Cấm AI tự viết ghi chú vào trong code (Nhắc lại mấy việc cũ không có giá trị hoặc AI hiểu sai ý của con người)
- Quy trình làm ẩu nhanh hơn là làm đúng thì AI sẽ làm ẩu -> Cần làm đúng

## Quy tắc dữ liệu và cache

- Mọi thứ user sửa tay trên giao diện đều là **data**, trừ khi được ghi rõ là trạng thái giao diện hoặc dữ liệu tạm thời.
- Data phải có schema/đường lưu ở Firestore, được đồng bộ khi online, có hàng đợi khi offline nếu cần, và đọc lại được trên client mới.
- `localStorage` chỉ được làm cache/mirror, offline queue, bản sao migration/backup có mục đích rõ ràng, hoặc preference riêng của thiết bị. Cache không phải source of truth.
- Không chấp nhận tính năng chỉ gọi `localStorage.setItem` sau thao tác user mà không có đường ghi DB tương ứng.
- Mỗi data field mới hoặc thay đổi phải có test theo chuỗi: user edit → DB write → fresh client read. Test chỉ kiểm tra localStorage là chưa đủ.
- Mỗi key localStorage mới phải được phân loại và ghi rõ lý do tồn tại; nếu không phân loại thì CI/review phải chặn merge.
- Trường hợp cố ý device-local phải được nêu trong persistence contract của repo và không được gọi là data đã đồng bộ.
