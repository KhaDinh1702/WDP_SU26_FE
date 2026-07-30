# Kiến trúc và Cách hoạt động của Progressive Web App (PWA)

Tài liệu này mô tả chi tiết cơ chế hoạt động của Progressive Web App (PWA) nói chung và cách áp dụng cụ thể vào dự án Next.js của hệ thống WAVE.

```mermaid
graph LR
    subgraph ClientDevice ["Thiết bị người dùng (Client Machine)"]
        CacheStorage[ Cache Storage: HTML, CSS, JS, Assets ]
        ClientRender[ Giao diện UI: Load & Render trực tiếp trên máy client ]
    end

    subgraph BackendServer ["Máy chủ Backend (Server)"]
        DataAPI[ Data API: Chỉ nhận và trả dữ liệu JSON ]
    end

    CacheStorage -->|1. Nạp HTML/CSS/JS local (0ms delay)| ClientRender
    ClientRender <-->|2. Gọi HTTP/REST lấy data JSON| DataAPI
```

---

## 🌟 PWA là gì? Tác dụng & Lợi ích mang lại

### 1. Progressive Web App (PWA) là gì?
Progressive Web App (PWA) là một công nghệ kết hợp giữa **Website truyền thống** và **Ứng dụng di động Native App**. Nó cho phép người dùng truy cập trang web thông qua trình duyệt nhưng lại mang lại trải nghiệm mượt mà, độc lập và có khả năng cài đặt trực tiếp lên thiết bị di động/máy tính giống như một ứng dụng được tải từ App Store hay Google Play.

### 2. Tác dụng cốt lõi của PWA (Client-Side Loading vs Server Rendering)
Tác dụng quan trọng và bản chất nhất của PWA là **đưa toàn bộ việc tải và xử lý giao diện (HTML, CSS, JavaScript và Assets) về thực thi trực tiếp trên máy của người dùng (Client-side)** thay vì phụ thuộc vào máy chủ (Server-side):

*   **Load HTML/CSS/JS trực tiếp trên máy người dùng (Local Client-Side Loading):**
    *   **Trước khi có PWA (Website truyền thống):** Mỗi khi người dùng bấm chuyển trang hay tải lại, trình duyệt phải gửi request lên Server để Server render và gửi lại tệp HTML, CSS, JS mới. Điều này gây trễ mạng (latency), tốn băng thông và làm cho giao diện bị "trắng trang" trong lúc chờ đợi.
    *   **Khi có PWA (App Shell Architecture):** Service Worker sẽ lưu toàn bộ khung ứng dụng (HTML, CSS, JavaScript, Font, Icon) vào **Cache Storage** ngay tại máy của người dùng. Khi mở ứng dụng, giao diện HTML/CSS được nạp thẳng từ ổ cứng/bộ nhớ máy local với thời gian gần như bằng 0ms mà **không cần chờ Server trả về HTML/CSS**.
*   **Tách biệt hoàn toàn Giao diện (UI) và Dữ liệu (Data):**
    *   **Máy Client (Người dùng):** Đảm nhận nạp HTML/CSS/JS, hiển thị layout và xử lý tương tác người dùng local.
    *   **Máy chủ (Server):** Được giải phóng 100% khỏi việc render giao diện. Server chỉ đóng vai trò cung cấp dữ liệu thuần (**JSON API**) khi client cần lấy thông tin mới.
*   **Hoạt động mượt mà khi Mạng yếu & Offline:** Nhờ HTML/CSS đã nằm sẵn trên máy người dùng, ứng dụng vẫn mở lên và hiển thị khung giao diện bình thường ngay cả khi mất mạng internet hoặc ở khu vực sóng chập chờn.
*   **Khả năng cài đặt (Installability):** Cho phép người dùng "Thêm vào màn hình chính" (Add to Home Screen). Ứng dụng chạy trong cửa sổ độc lập (standalone - không có thanh địa chỉ trình duyệt), mang lại cảm giác của một Native App thực thụ.
*   **Thông báo đẩy (Push Notifications):** Cho phép gửi thông báo, nhắc nhở lịch đặt, thông tin khuyến mãi trực tiếp tới thiết bị người dùng.

### 3. Lợi ích mang lại cho dự án WAVE
Áp dụng PWA vào hệ thống WAVE mang lại những giá trị lớn cho cả khách hàng lẫn doanh nghiệp:
*   **Giảm tải cực lớn cho Server Backend:** Server không phải tốn tài nguyên CPU/RAM để render HTML/CSS cho hàng ngàn người dùng cùng lúc, chỉ cần xử lý nhẹ nhàng các API dữ liệu JSON.
*   **Tiết kiệm chi phí phát triển:** Chỉ cần xây dựng và tối ưu một phiên bản Web duy nhất (Next.js), hệ thống có thể chạy mượt mà trên cả máy tính (Desktop), điện thoại iOS, và Android mà không cần code riêng app Native bằng Swift/Java.
*   **Tăng tỷ lệ giữ chân khách hàng (User Retention):** Shortcut của WAVE xuất hiện ngay trên màn hình điện thoại của khách hàng giúp họ dễ dàng truy cập và thực hiện đặt lịch dịch vụ rửa xe chỉ với một chạm.
*   **Trải nghiệm người dùng cao cấp:** Khách hàng có thể mở app xem lịch hẹn rửa xe, hạng thành viên của mình ngay cả khi đang đứng ở bãi đỗ xe hầm chung cư (nơi sóng điện thoại cực kỳ yếu hoặc mất kết nối).
*   **Không tốn dung lượng thiết bị:** Thay vì tải một app nặng hàng chục, hàng trăm MB trên App Store, PWA của WAVE chỉ tốn chưa tới vài MB lưu trữ tĩnh trên bộ nhớ cache trình duyệt.

---

## 2. Ba Thành phần Cốt lõi của PWA

### 2.1 Web App Manifest (Định danh Ứng dụng)
`manifest.json` (hoặc `manifest.ts` trong Next.js App Router) là một tệp cấu hình JSON chứa siêu dữ liệu (metadata) của ứng dụng để trình duyệt nhận diện và cài đặt.

*   **Tải trang:** Trình duyệt đọc thẻ `<link rel="manifest" href="/manifest.webmanifest">`.
*   **Điều kiện Installable:**
    *   Có `name` hoặc `short_name`.
    *   Có `start_url` hợp lệ.
    *   Thuộc tính `display` cấu hình là `standalone`, `fullscreen`, hoặc `minimal-ui`.
    *   Cung cấp ít nhất hai icon kích thước `192x192` và `512x512` định dạng PNG.
*   **Cài đặt:** Khi đáp ứng đủ điều kiện, trình duyệt kích hoạt tính năng **Install (Cài đặt)**, tạo shortcut trên màn hình thiết bị và chạy ứng dụng độc lập, không có thanh địa chỉ trình duyệt.

### 2.2 Service Worker (Trái tim của PWA)
Service Worker là một JavaScript file chạy ngầm dưới nền (background thread), hoàn toàn độc lập với luồng xử lý giao diện người dùng (main UI thread) của ứng dụng.

#### Vòng đời của Service Worker (Lifecycle)

```mermaid
stateDiagram-v2
    [*] --> Register: Đăng ký SW từ Client (main.js)
    Register --> Install: Cài đặt (Sự kiện 'install')
    Install --> CacheStatic: Cache tệp tĩnh quan trọng
    CacheStatic --> Activate: Kích hoạt (Sự kiện 'activate')
    Activate --> DeleteOldCache: Dọn dẹp cache cũ
    DeleteOldCache --> Active: Trạng thái hoạt động (Idle/Fetch)
    Active --> FetchEvent: Bắt sự kiện request mạng
```

1.  **Register (Đăng ký):** Client gọi hàm `navigator.serviceWorker.register('/sw.js')`.
2.  **Install (Cài đặt):** Kích hoạt sự kiện `install`. Dùng để tải trước và lưu cache các tài nguyên tĩnh quan trọng (như logo, trang offline fallback).
3.  **Activate (Kích hoạt):** SW mới sẵn sàng hoạt động. Thường dùng để xóa các bộ nhớ cache phiên bản cũ.
4.  **Active (Hoạt động):** SW bắt đầu lắng nghe và chặn các sự kiện mạng (`fetch`).

### 2.3 Cổng mạng an toàn (HTTPS)
Để tránh các cuộc tấn công trung gian (Man-in-the-middle) do Service Worker có khả năng can thiệp trực tiếp vào dữ liệu truyền tải:
*   Trình duyệt chỉ cho phép đăng ký Service Worker trên môi trường **HTTPS**.
*   Ngoại lệ duy nhất là **`localhost`** (hoặc `127.0.0.1`) phục vụ cho mục đích lập trình local.

---

## 3. Các Chiến lược Caching phổ biến

Mọi request HTTP đi ra từ ứng dụng web đều đi qua Service Worker. SW sẽ quyết định phản hồi dữ liệu dựa trên một trong các chiến lược sau:

### 3.1 Cache First (Ưu tiên bộ nhớ đệm)
> Áp dụng cho static assets: Hình ảnh, Font chữ, CSS biên dịch, JS tĩnh.

```mermaid
sequenceDiagram
    participant Web as Web App
    participant SW as Service Worker
    participant Cache as Cache Storage
    participant Net as Internet / Server

    Web->>SW: Yêu cầu tải /logo-wave.png
    SW->>Cache: Kiểm tra có trong Cache không?
    alt Có trong Cache
        Cache-->>SW: Trả về file ảnh từ Cache
        SW-->>Web: Phản hồi lập tức (Instant load)
    else Không có trong Cache
        SW->>Net: Tải file từ Internet
        Net-->>SW: Trả về file ảnh mới
        SW->>Cache: Lưu bản sao vào Cache
        SW-->>Web: Phản hồi ảnh cho ứng dụng
    end
```

### 3.2 Network First (Ưu tiên mạng)
> Áp dụng cho dữ liệu động: Thông tin cá nhân, danh sách đơn hàng, API biến động.
1.  SW gửi request lên internet trước để lấy dữ liệu mới nhất từ Server.
2.  Nếu lấy thành công, trả về ứng dụng và ghi đè bản mới vào Cache.
3.  Nếu mất mạng, SW tự động lấy dữ liệu cũ đã lưu từ cache ra để thay thế, tránh hiển thị trang lỗi.

### 3.3 Stale-While-Revalidate (Lấy cache trước, cập nhật ngầm sau)
> Chiến lược tối ưu nhất cho PWA hiện đại.
1.  SW trả về dữ liệu lưu trong cache ngay lập tức để màn hình hiển thị không bị trễ (0ms delay).
2.  Đồng thời, SW âm thầm gửi request lên internet để lấy dữ liệu mới từ Server.
3.  Khi có dữ liệu mới, SW cập nhật lại bộ nhớ cache cho lần hiển thị tiếp theo.
