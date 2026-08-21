# Physoom — tích hợp với app anh em (Offisoom, ACADsoom)

Physoom đóng vai trò **nhà cung cấp danh tính** và **nguồn dữ liệu lịch/phân công** cho
các app dùng chung tài khoản Khoa. Mỗi app là repo và cơ sở dữ liệu riêng, chỉ trao đổi
với Physoom qua hai đường: **SSO** (đăng nhập) và **`/api/integration/*`** (đọc dữ liệu).

Tất cả đều **thuần bổ sung** — không thay đổi hành vi sẵn có của Physoom.

## Mỗi client một bộ khoá riêng

Cấu hình trong `src/lib/ssoClients.js`. Với mỗi client, đặt ba biến môi trường:

| Biến | Dùng để |
| --- | --- |
| `<CLIENT>_SSO_SECRET` | Ký token SSO khi đăng nhập |
| `<CLIENT>_ORIGIN` | Allowlist `redirect_uri`, nhiều origin cách nhau bởi dấu phẩy |
| `<CLIENT>_SYNC_SECRET` | Bảo vệ endpoint `/api/integration/*` của client đó |

Và `SSO_CLIENTS` giới hạn tên client được chấp nhận (mặc định `offisoom,acadsoom`).

```bash
SSO_CLIENTS="offisoom,acadsoom"

OFFISOOM_SSO_SECRET="..."
OFFISOOM_ORIGIN="https://offisoom.example.vn,http://localhost:3100"
OFFISOOM_SYNC_SECRET="..."

ACADSOOM_SSO_SECRET="..."
ACADSOOM_ORIGIN="https://acadsoom.example.vn,http://localhost:3200"
ACADSOOM_SYNC_SECRET="..."
```

> Khoá tách riêng theo từng app là có chủ ý: nếu một app lộ secret thì nó vẫn không ký
> được token cho app còn lại. Tên client được kiểm tra theo `SSO_CLIENTS` **trước khi**
> dùng để ghép tên biến môi trường — nếu không, một `?client=` lạ có thể dò biến khác
> của tiến trình.

## Đăng nhập (SSO)

```
GET /api/sso/authorize?client=acadsoom&redirect_uri=<url>&state=<random>
```

1. Chưa đăng nhập Physoom → chuyển sang đăng nhập bình thường của Physoom rồi quay lại.
2. Đã đăng nhập → ký token HS256 hạn **120 giây** bằng `<CLIENT>_SSO_SECRET`, rồi 302 về
   `redirect_uri` kèm `?token=&state=`.

Payload token: `aud` (tên client), `email`, `name`, `teacher_id`, `isAdmin`, `iat`, `exp`.
Phía nhận verify chữ ký, kiểm tra `aud` khớp app mình, rồi tự tạo phiên.

Bỏ trống `client` thì mặc định là `offisoom` — Offisoom bản cũ không cần sửa gì.

## Đọc dữ liệu

Mọi endpoint đều cần header `x-<client>-secret` khớp `<CLIENT>_SYNC_SECRET`.

| Endpoint | Client | Trả về |
| --- | --- | --- |
| `GET /api/integration/members` | offisoom | Danh sách nhân sự + bộ môn |
| `GET /api/integration/freebusy?emails=&from=&to=` | offisoom | Khoảng bận theo giảng viên |
| `GET /api/integration/courses?from=&to=&emails=` | acadsoom | Phân công lớp theo học kỳ |

### `/api/integration/courses`

Hỏi theo **khoảng thời gian**, không theo tên học kỳ: hai hệ thống đặt tên học kỳ khác
nhau, còn ngày bắt đầu/kết thúc năm học thì đã sẵn khớp. Truyền `?term=<id>` nếu muốn chỉ
đích danh một `CalendarEvent` loại `term`.

Trả về một dòng cho mỗi cặp **(lớp × giảng viên)**:

```json
{
  "terms": [{ "id": "...", "title": "Học kỳ 1 2025-2026", "start": "...", "end": "..." }],
  "items": [{
    "externalId": "physoom:<courseId>:<email>",
    "teacherEmail": "gv@hcmus.edu.vn",
    "teacherCount": 2,
    "courseCode": "PHY10016", "courseName": "Kỹ thuật lập trình",
    "className": "24CLC01", "credit": 3, "weeks": 15, "population": 60,
    "sessions": 15, "scheduledMinutes": 2250,
    "termId": "...", "termTitle": "...", "locked": false, "warnings": []
  }]
}
```

**Physoom không quy đổi ra tiết hay giờ chuẩn.** Hệ số lớp chất lượng cao, thực hành,
lớp đông… là quy định của Khoa và nằm bên ACADsoom (`src/lib/physoom.js`). Physoom chỉ gửi
sự thật nó nắm: số buổi đã xếp lịch, tổng số phút, tín chỉ, số giảng viên của lớp. Đặt phép
quy đổi ở hai nơi thì sớm muộn hai nơi sẽ lệch nhau.

`sessions = 0` nghĩa là lớp chưa xếp lịch; bên ACADsoom sẽ tạm tính tiết thực từ tín chỉ và
đánh dấu rõ là **tạm tính** cho tới lần đồng bộ sau.
