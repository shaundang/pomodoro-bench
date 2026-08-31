# Từ rộng sang sâu — lộ trình 12 tháng hướng Applied AI Engineer

Viết 2026-08-31. **Ghi chú về phạm vi:** file này không nói về ứng dụng Pomodoro. Nó nằm ở
đây vì đây là repo cá nhân đang giữ mọi tài liệu đã research xong. Nếu `docs/` được coi là
docs của sản phẩm thì file này nên chuyển ra ngoài.

**Vì sao file này tồn tại:** để khỏi phải research lại, và để lộ trình có chỗ đối chiếu khi
6 tháng sau nhìn lại xem đã đi đúng hay đã trôi.

**Chất lượng nguồn.** Theo hệ tầng của
[`research-roadmap.md`](research-roadmap.md#evidence-tiers-used-below):

| Loại nội dung | Tier | Ghi chú |
|---|---|---|
| Số liệu thị trường tuyển dụng, %, mức tiết kiệm chi phí | **D** | Blog tuyển dụng và blog agency. Không phương pháp, không mẫu công bố |
| Hiện tượng context rot, compaction, memory | **C** | Có preprint arXiv thật, nhưng mỗi kết quả một nhóm, chưa có replication độc lập |
| Số liệu thị trường AI trong giáo dục | **D** | Báo cáo dự phóng thị trường, loại tài liệu thường sai hệ thống về phía lạc quan |

Nên phần đáng tin của file này là **cấu trúc quyết định**, không phải các con số. Các con số
dùng để định hướng độ lớn, không dùng để trích dẫn.

---

## Điểm khởi đầu và mục tiêu

Tự đánh giá 2026-08-31: đã biết bề rộng (API, prompt, RAG, đã fine-tune, có nền toán, đã có
AI chạy production) nhưng **chưa sâu ở đâu cả**. Nhánh đã chọn: **Applied AI / AI Product
Engineer** — không phải research, không phải ML platform.

Ba kết quả muốn có trong 12–24 tháng: chuyển sang vai trò AI ở công ty · năng lực kỹ thuật
thật · được công nhận là chuyên gia.

**Luận điểm:** với người đã có breadth, điểm nghẽn không phải thiếu chủ đề. Depth đến từ
việc chọn một trục hẹp và đào tới mức tạo ra được kiến thức chưa ai công bố — một phép đo,
một taxonomy lỗi, hoặc một kết quả trái với giả định chung.

---

## Vòng lặp đào sâu

Áp cho mọi trục. Đây là phần không phụ thuộc nguồn nào cả.

| Bước | Việc | Kiểm tra đã xong |
|---|---|---|
| 1 · Tái hiện | Dựng lại một kết quả người khác công bố, không núp sau wrapper | Con số của mình khớp con số của họ, hoặc biết vì sao lệch |
| 2 · Đo | Accuracy, latency p95, token, chi phí mỗi request | Có baseline ghi lại được |
| 3 · Phá | Tìm chỗ nó sai, ghi thành taxonomy failure mode | Có tên cho ít nhất 4–5 kiểu lỗi |
| 4 · Viết | Công bố số liệu và cách đo | Người khác tái hiện được từ bài viết |

---

## Bốn trục, xếp theo đòn bẩy

Đòn bẩy = nhu cầu × mức khan hiếm × lợi thế sẵn có. Xếp hạng là phán đoán, không phải đo.

| # | Trục | Vì sao ở vị trí này | Tốc độ lỗi thời |
|---|---|---|---|
| 1 | **Evaluation** | Khoảng cách cung–cầu lớn nhất, và là dụng cụ đo bắt buộc phải có trước khi đào sâu bất cứ trục nào khác | Rất chậm |
| 2 | **Context engineering & agent reliability** | Biên giới kỹ thuật thật của 2026, còn đáy để đào, khan hiếm nhất | Trung bình |
| 3 | **Kinh tế của inference** (chi phí, latency) | Đòn bẩy nhanh nhất để đổi vai trò, vì nói bằng ngôn ngữ lãnh đạo nghe được | Chậm |
| 4 | **Chiều sâu domain: AI cho giáo dục** | Thứ duy nhất người khác không copy được trong sáu tháng | Rất chậm |

### Trục 1 — Evaluation

Đào trước tiên, vì không có harness đo thì mọi thí nghiệm ở trục 2 và 3 đều thành cảm tính.

- Thiết kế eval dataset từ **log lỗi production**, không từ benchmark công khai.
- Biết khi nào **LLM-as-judge** đủ tin: đo mức đồng thuận giữa judge và nhãn người, phát
  hiện bias của judge, biết khi nào phải rơi về exact-match hoặc người thật.
- **Thống kê thực nghiệm** — sample size, khoảng tin cậy. Không có phần này thì mọi kết luận
  "prompt mới tốt hơn" là nhiễu.
- **Gate CI theo điểm eval**: biến chất lượng phi tất định thành cửa chặn deploy.
- Thạo **một** công cụ, không phải biết sáu: Inspect, Promptfoo, Braintrust, LangSmith,
  Langfuse, Arize.

*Số liệu Tier D, chỉ để định hướng:* ~39,6% tin tuyển dụng AI-first được báo cáo có yêu cầu
liên quan evaluation; các công ty applied AI tuyển evals engineer trong nhóm 10 hire kỹ
thuật đầu.

### Trục 2 — Context engineering & agent reliability

- **Context rot** — model tụt chất lượng khi context dài ra dù thông tin cần vẫn còn nguyên.
  Failure mode trung tâm của mọi agent chạy dài.
- **Compaction**: reactive (gần cạn token budget) so với periodic (chu kỳ cố định), và cái
  giá của việc nén — gồm việc ràng buộc an toàn bị xoá âm thầm.
- **State offloading**: cái gì ở lại context hoạt động, cái gì nén thành summary, cái gì đẩy
  ra bộ nhớ ngoài rồi lấy lại bằng handle. Bài toán thiết kế hệ thống, không phải prompt.
- **Thiết kế tool**: số lượng, mô tả, hình dạng output, xử lý lỗi.
- **Tự viết harness** tối giản ít nhất một lần thay vì chỉ dùng framework.

*Số liệu Tier C:* một model đạt 98,1 điểm với prompt sạch tụt còn 64,1 khi cùng thông tin bị
rải qua nhiều lượt agent run; suy giảm do context dài được báo cáo 13,9–85%. Ngược lại
context editing +29%, kèm memory tool +39%, giảm 84% token trong một eval 100 lượt.

### Trục 3 — Kinh tế của inference

- **Prompt caching**: cơ chế, điều kiện cache hit, cấu trúc prompt để phần ổn định nằm trước.
- **Model routing**: request dễ sang model nhỏ, và dựng eval chứng minh việc hạ cấp không
  giảm chất lượng.
- **Batching, streaming, ngân sách latency** theo từng bước; đo p95 không đo trung bình.
- **Observability**: log theo step, token, cost, drift.

*Số liệu Tier D:* caching + routing được báo cáo tiết kiệm 40–70% hoá đơn production.

### Trục 4 — Chiều sâu domain

- **Đo chất lượng sư phạm, không chỉ chất lượng câu trả lời.** Một tutor AI trả lời đúng
  nhưng đưa luôn đáp án là sản phẩm tệ. Chưa có chuẩn eval cho việc đó.
- **Mastery model**: theo dõi năng lực người học, phát hiện ngộ nhận, chọn bước tiếp theo.
- **Đồng thuận với người chấm**: đo mức khớp giữa AI grading và giáo viên thật theo từng
  loại câu hỏi.
- **An toàn cho người học vị thành niên** — ràng buộc thật, biến năng lực eval thành yêu cầu
  bắt buộc chứ không phải điểm cộng.

Failure pattern được ghi nhận trong ngành: một lớp LLM mỏng phủ lên giáo trình, không có
mastery model, không có chiến lược sư phạm. Kết luận đi kèm: đây là bài toán sư phạm với
công cụ hình LLM, không phải bài toán LLM đi tìm sư phạm.

---

## Chủ động không đầu tư sâu

| Thứ | Vì sao bỏ |
|---|---|
| Train foundation model từ đầu | Chi phí và hạ tầng ngoài tầm cá nhân; hiểu nguyên lý là đủ cho applied |
| Fine-tuning như bản sắc | Đã tụt thành công cụ hẹp, dùng khi eval chỉ ra prompt và context không đủ |
| Chạy theo framework mới | Quay vòng mỗi vài tháng. "Prompt Engineer" đã tan vào context engineering |
| Chứng chỉ và khoá học | Các vai trò này tuyển bằng repo, agent đã chạy, eval suite |

---

## Ba giai đoạn

| Giai đoạn | Việc | Đầu ra |
|---|---|---|
| **Tháng 1–3** | Dựng eval harness cho một hệ thống AI thật đang chạy. Định nghĩa "đúng", lấy 100–300 case từ log lỗi thật, đo baseline, gắn vào CI | Eval suite + báo cáo baseline + taxonomy failure mode v1 |
| **Tháng 4–8** | Dùng harness đó làm thước đo, chạy chuỗi thí nghiệm có kiểm soát về context/agent. Ghi giả thuyết **trước** khi chạy | 3–5 thí nghiệm có số, ít nhất một kết quả trái giả định ban đầu |
| **Tháng 9–12** | Bên trong: đề xuất kèm số → vai trò. Bên ngoài: công bố phương pháp, harness, taxonomy | Đề xuất nội bộ có số + 2–3 công bố người khác tái hiện được |

---

## Đào vào thứ không rữa

| Bền — đầu tư chiều sâu | Rữa nhanh — học đủ dùng rồi dừng |
|---|---|
| Phương pháp đánh giá, thiết kế eval dataset | Framework agent đang hot |
| Thống kê thực nghiệm, đọc kết quả có nhiễu | Cú pháp SDK, tên tham số |
| Taxonomy failure mode của hệ thống phi tất định | Bảng xếp hạng model tháng này |
| Kinh tế inference: token, cache, batch, hàng đợi | Mức giá cụ thể của một model |
| Thiết kế hệ thống khi thành phần không tất định | Vector database đang được nhắc nhiều |
| Kiến thức domain: sư phạm, assessment, hành vi người học | Mẹo prompt thời thượng |

Quy tắc phân biệt: nếu một kỹ năng vẫn đúng khi model thế hệ sau ra mắt, nó thuộc cột trái.

---

## Trùng với phương pháp đã có trong repo

Đáng ghi lại vì nó không phải trùng hợp: lộ trình này và
[`research-roadmap.md`](research-roadmap.md#2-insight-integrity-layer) mô tả **cùng một kỷ
luật** trên hai miền khác nhau.

| Trong repo này | Trong lộ trình AI |
|---|---|
| N-of-1 experiment engine | Eval harness cho một hệ thống thật |
| Insight integrity layer — từ chối kết luận khi chưa đủ N | Thống kê thực nghiệm, sample size, khoảng tin cậy |
| Hệ tầng bằng chứng A/B/C/D | Phân biệt Tier C/D khi đọc claim về model |
| "Instrument and measure" thay vì đoán độ dài block | Đo trước, tối ưu sau, không tin trực giác về prompt |

Nghĩa là thói quen đã có khi viết ba file evidence trong `docs/` chính là năng lực cốt lõi
của trục 1. Phần còn thiếu là áp nó lên một hệ thống LLM thật, không phải học lại từ đầu.

---

## Nguồn

- Tier C — [Sourcegraph, Context engineering](https://sourcegraph.com/blog/context-engineering) ·
  [Claude Cookbook, memory & compaction](https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools) ·
  các preprint arXiv về compaction và long-horizon agent (2605.08580, 2606.10209, 2606.11213, 2606.22528)
- Tier D — [Digital Applied, AI hiring 2026](https://www.digitalapplied.com/blog/ai-developer-hiring-skills-that-matter-2026) ·
  [HeroHunt, recruiting evals engineers](https://www.herohunt.ai/blog/how-to-recruit-ai-evals-engineers-2026/) ·
  [AI Evals Engineer career guide](https://jobsbyculture.com/blog/ai-evals-engineer-career-guide-2026) ·
  [Context engineering playbook](https://www.digitalapplied.com/blog/context-engineering-agent-reliability-playbook-2026) ·
  [LLMOps roadmap](https://machinelearningmastery.com/the-roadmap-for-mastering-llmops-in-2026/) ·
  [94% agentic AI skills gap](https://www.barchart.com/story/news/36815858/94-of-engineering-leaders-report-agentic-ai-skills-gaps-as-autonomous-systems-move-into-production-interview-kickstart-launches-new-agentic-ai-course-for-engineers-2026) ·
  [AI tutoring platforms 2026](https://datasofttechnologies.com/blog/ai-tutoring-platforms-for-edtech-smes-in-2026-what-actually-improves-student-outcomes) ·
  [Cleveroad, AI in EdTech](https://www.cleveroad.com/blog/ai-edtech-case-studies/)
