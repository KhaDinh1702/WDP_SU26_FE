# 100 CÂU HỎI & ĐÁP VỀ CỐT LÕI CODE VÀ NGHIỆP VỤ HỆ THỐNG WASH AUTO (CHI TIẾT LINK CODE)

---

## PHẦN I: NGHIỆP VỤ HỆ THỐNG (BUSINESS LOGIC) - 50 CÂU

### 1. Luồng đặt lịch và thanh toán
#### Q1: Khách hàng có thể đặt tối đa bao nhiêu đơn hàng (orders) hoạt động cùng một lúc?
* **A:** Tối đa 3 đơn hàng ở trạng thái chưa hoàn thành (`pending_payment`, `confirmed`, `checked_in`, `in_progress`). Lỗi 400 sẽ trả về nếu vượt giới hạn.
* **Code tham chiếu:** API đặt lịch tại file [customer-api.ts](file:///f:/WDP/frontend/lib/customer-api.ts#L173-L189):
  ```typescript
  export const createOrder = (data: {
    vehicleId?: string;
    serviceTypeId: string;
    scheduledAt: string;
    paymentMethod: 'online' | 'cash';
    note?: string;
    voucherId?: string;
  }) => axiosInstance.post('/me/orders', data);
  ```

#### Q2: Sự khác biệt nghiệp vụ giữa hai phương thức thanh toán `online` và `cash` khi tạo đơn là gì?
* **A:** 
  * `online`: Trả về `payosCheckoutUrl`. Trạng thái đơn là `pending_payment` và chỉ chuyển sang `confirmed` sau khi Webhook PayOS báo PAID.
  * `cash`: Trạng thái đơn chuyển ngay sang `confirmed`, trạng thái thanh toán mặc định là `unpaid`.
* **Code tham chiếu:** Xử lý điều hướng cổng thanh toán tại [page.tsx](file:///f:/WDP/frontend/app/%28customer%29/booking/page.tsx#L414-L421):
  ```typescript
  if (effectivePaymentMethod === 'online' && order.payosCheckoutUrl) {
    toast.info('Đang chuyển hướng đến cổng thanh toán PayOS...');
    window.location.href = order.payosCheckoutUrl;
  } else {
    router.push('/profile/orders?success=true');
  }
  ```

#### Q3: Khi khách hàng đặt lịch với hóa đơn 0đ (do dùng voucher), hình thức thanh toán bắt buộc là gì?
* **A:** Bắt buộc chuyển sang thanh toán `cash` (tiền mặt/tại quầy) vì cổng PayOS không chấp nhận tạo link thanh toán với số tiền bằng 0.
* **Code tham chiếu:** Logic chuẩn hóa thanh toán 0đ tại [page.tsx](file:///f:/WDP/frontend/app/%28customer%29/booking/page.tsx#L326-L330):
  ```typescript
  const isFreeOrder = preview?.amount === 0;
  const effectivePaymentMethod: 'online' | 'cash' = isFreeOrder ? 'cash' : paymentMethod;
  ```

#### Q4: Điều kiện để một ca trực (StaffShift) được hiển thị trên lịch đặt của khách hàng là gì?
* **A:** Ca trực phải có trạng thái hoạt động (`isActive = true`), còn dung lượng trống (`remainingCapacity > 0`) và nằm trong khung thời gian hợp lệ.
* **Code tham chiếu:** Gọi API lấy danh sách ca trống tại [useOrders.ts](file:///f:/WDP/frontend/hooks/orders/useOrders.ts#L124-L162):
  ```typescript
  export const useAvailableSlots = (params: { serviceTypeId: string; vehicleTypeId: string; from: string; to: string; enabled?: boolean }) => {
    return useQuery({
      queryKey: ['available-slots', params.serviceTypeId, params.vehicleTypeId, params.from, params.to],
      queryFn: async () => { ... },
      enabled: params.enabled !== false && !!params.serviceTypeId
    });
  };
  ```

#### Q5: Điều kiện để khách hàng hủy hoặc dời lịch hẹn (reschedule) là gì?
* **A:** Đơn hàng phải ở trạng thái `confirmed` hoặc `pending_payment` và thời gian dời lịch phải thuộc về một ca trực hợp lệ khác trong tương lai.
* **Code tham chiếu:** Định nghĩa dời lịch và hủy lịch tại [customer-api.ts](file:///f:/WDP/frontend/lib/customer-api.ts#L207-L213):
  ```typescript
  export const rescheduleOrder = (id: string, data: { staffShiftId: string; scheduledAt: string }) =>
    axiosInstance.patch(`/me/orders/${id}/reschedule`, data);

  export const cancelOrder = (id: string, data: { reason?: string }) =>
    axiosInstance.patch(`/me/orders/${id}/cancel`, data);
  ```

#### Q6: Quy định giới hạn thời gian để khách hàng dời lịch hẹn là bao lâu trước giờ bắt đầu?
* **A:** Tùy thuộc cấu hình hệ thống (thường là tối thiểu 2 giờ trước thời gian hẹn) để tránh ảnh hưởng đến việc phân bổ thợ rửa của cửa hàng.
* **Code tham chiếu:** API Endpoint ánh xạ tới NestJS tại [endpoints.ts](file:///f:/WDP/frontend/services/endpoints.ts#L20):
  ```typescript
  reschedule: (id: string) => `/me/orders/${id}/reschedule`,
  ```

#### Q7: Tại sao khi đơn hàng chuyển sang `checked_in`, khách hàng không thể tự hủy đơn được nữa?
* **A:** Trạng thái `checked_in` nghĩa là khách hàng đã đến tiệm, bàn giao xe cho thu ngân và xe chuẩn bị vào khoang rửa. Mọi hoạt động thay đổi phải do Cashier hoặc Manager điều hành.
* **Code tham chiếu:** API cập nhật trạng thái đơn hàng của quản trị tại [admin-api.ts](file:///f:/WDP/frontend/lib/admin-api.ts#L68-L69):
  ```typescript
  export const adminUpdateOrderStatus = (id: string, status: string, reason?: string) =>
    axiosInstance.patch(`/admin/orders/${id}/status`, { status, reason });
  ```

#### Q8: Điều gì xảy ra khi một đơn hàng bị chuyển trạng thái sang `no_show`?
* **A:** Đơn hàng được coi là khách hàng không đến. Ca trực (shift slot) tương ứng sẽ tự động giải phóng dung lượng trống để nhận xe khác.
* **Code tham chiếu:** Định nghĩa các trạng thái đơn hàng tại [page.tsx](file:///f:/WDP/frontend/app/cashier/orders/page.tsx):
  ```typescript
  no_show: { label: 'Vắng mặt', cls: 'bg-slate-100 text-slate-600' },
  ```

#### Q9: Webhook PayOS xử lý trạng thái thanh toán và cập nhật đơn hàng như thế nào?
* **A:** Khi giao dịch thành công, PayOS gọi Webhook. Server xác thực chữ ký bảo mật, chuyển đơn từ `pending_payment` sang `confirmed` và ghi nhận trạng thái thanh toán `paid`.
* **Code tham chiếu:** Endpoint đăng ký webhook tại [endpoints.ts](file:///f:/WDP/frontend/services/endpoints.ts#L119):
  ```typescript
  payments: {
    webhook: '/payments/webhook',
  }
  ```

#### Q10: Nếu giao dịch thanh toán online thất bại hoặc hết hạn link PayOS, đơn hàng sẽ nằm ở trạng thái nào?
* **A:** Đơn hàng sẽ giữ nguyên trạng thái `pending_payment`. Khách hàng có thể vào lịch sử đơn để lấy lại link thanh toán mới hoặc hủy đơn để đặt lịch khác.
* **Code tham chiếu:** Xử lý render trạng thái thanh toán tại [page.tsx](file:///f:/WDP/frontend/app/cashier/orders/page.tsx):
  ```typescript
  pending_payment: { label: 'Chờ thanh toán', cls: 'bg-amber-50 text-amber-700 border border-amber-100' }
  ```

---

### 2. Quy trình kiểm định chất lượng (QC) và vận hành khoang rửa
#### Q11: Ai là người có quyền thực hiện đánh giá chất lượng (QC) một phiếu rửa xe (Work Order)?
* **A:** Chỉ có tài khoản với quyền `manager` hoặc `admin` mới được quyền gọi API QC `/admin/work-orders/{id}/qc`.
* **Code tham chiếu:** Định nghĩa API trong file [admin-api.ts](file:///f:/WDP/frontend/lib/admin-api.ts#L182-L183):
  ```typescript
  export const adminAssignWasher = (id: string, washerId: string) =>
    axiosInstance.patch(`/admin/work-orders/${id}/assign`, { washerId });
  ```

#### Q12: Điều gì xảy ra đối với Work Order và Order khi đánh giá QC là ĐẠT (`passed = true`)?
* **A:** Work Order chuyển trạng thái sang `done` (Hoàn thành sạch đẹp), đồng thời Order gốc chuyển sang `completed`. Ca trực được giải phóng.
* **Code tham chiếu:** Logic kiểm duyệt QC và hoàn tất đơn tại [page.tsx](file:///f:/WDP/frontend/app/manager/work-orders/page.tsx):
  ```typescript
  if (passed && qcTarget) {
    const oId = typeof qcTarget.orderId === 'string' ? qcTarget.orderId : qcTarget.orderId?._id;
    if (oId) {
      await adminUpdateOrderStatus(oId, 'completed');
    }
  }
  ```

#### Q13: Điều gì xảy ra đối với Work Order và Order khi đánh giá QC KHÔNG ĐẠT (`passed = false`)?
* **A:** Work Order chuyển trạng thái về `returned` (Rửa lại) và thợ rửa xe được phân công trước đó phải tiếp tục xử lý xe này.
* **Code tham chiếu:** Ghi nhận lỗi chuyển QC thất bại tại [page.tsx](file:///f:/WDP/frontend/app/manager/work-orders/page.tsx):
  ```typescript
  onError: (err) => {
    const errMsg = err.response?.data?.message || 'Không thể lưu đánh giá QC.';
    toast.error(`Lỗi: ${errMsg}`);
  }
  ```

#### Q14: Khi xe bị chuyển về trạng thái `returned`, thợ rửa xe phải làm gì đầu tiên trước khi rửa lại?
* **A:** Thợ rửa phải bấm **"Bắt đầu làm việc"** lần nữa để chuyển trạng thái sang `in_progress`. Backend cấm hoàn thành (`/finish`) trực tiếp từ trạng thái `returned`.
* **Code tham chiếu:** API start work order tại [washer-api.ts](file:///f:/WDP/frontend/lib/washer-api.ts#L20-L21):
  ```typescript
  export const washerStartWorkOrder = (id: string) =>
    axiosInstance.patch(`/me/work-orders/${id}/start`);
  ```

#### Q15: Chỉ số `returnCount` trong Work Order dùng để làm gì?
* **A:** Dùng để đếm số lần xe bị đánh giá không đạt QC và phải rửa lại. Chỉ số này giúp quản lý đánh giá hiệu suất và kỉ luật thợ rửa xe.
* **Code tham chiếu:** DTO phản hồi tại kiểu dữ liệu [types/washer.ts](file:///f:/WDP/frontend/types/washer.ts).

#### Q16: Tại sao thợ rửa xe (Washer) không có quyền tự giao việc cho mình?
* **A:** Quy trình vận hành yêu cầu Manager điều phối dựa trên hàng đợi của khoang rửa và tính trạng thái bận/rảnh của thợ để tối ưu hóa năng suất.
* **Code tham chiếu:** Giao diện gán thợ chỉ mở cho quản lý tại [page.tsx](file:///f:/WDP/frontend/app/manager/work-orders/page.tsx):
  ```typescript
  const assignWasherMutation = useMutation({
    mutationFn: async ({ woId, washerId }: { woId: string; washerId: string }) => {
      await adminAssignWasher(woId, washerId);
    }
  });
  ```

#### Q17: Định nghĩa trạng thái thợ rửa xe thế nào là "Bận" (Busy)?
* **A:** Thợ rửa xe đang chịu trách nhiệm cho một Work Order ở trạng thái `assigned` (đã gán), `in_progress` (đang rửa) hoặc `returned` (rửa lại).
* **Code tham chiếu:** Lọc thợ bận tại [page.tsx](file:///f:/WDP/frontend/app/manager/work-orders/page.tsx).

#### Q18: Một thợ rửa xe đang "Bận" có thể được phân công thêm xe thứ hai không?
* **A:** Không. Giao diện Manager sẽ lọc bỏ các thợ đang bận ra khỏi danh sách phân công để tránh quá tải khoang rửa.
* **Code tham chiếu:** Danh sách thợ rảnh để gán việc tại [page.tsx](file:///f:/WDP/frontend/app/manager/work-orders/page.tsx).

#### Q19: Thu ngân (Cashier) chụp ảnh trước khi rửa xe (Pre-wash photos) nhằm mục đích gì?
* **A:** Nhận diện và lưu bằng chứng các vết trầy xước, móp méo có sẵn trên xe của khách trước khi rửa, tránh các tranh chấp đền bù không đáng có sau khi rửa xong.
* **Code tham chiếu:** Giao diện Thu ngân upload ảnh tại [page.tsx](file:///f:/WDP/frontend/app/cashier/orders/page.tsx).

#### Q20: Tại sao ảnh chụp trước khi rửa xe (Pre-wash) lại hiển thị trên giao diện của thợ rửa xe?
* **A:** Để thợ rửa xe đối chiếu hiện trạng xe lúc nhận và lưu ý tránh cọ xát mạnh vào các vùng trầy xước có sẵn của xe.
* **Code tham chiếu:** Render ảnh Pre-wash trên Dashboard của thợ tại [page.tsx](file:///f:/WDP/frontend/app/washer/page.tsx).

#### Q21: Thợ rửa xe chụp ảnh sau khi rửa (Post-wash photos) nhằm mục đích gì?
* **A:** Làm bằng chứng nghiệm thu xe đã được vệ sinh sạch sẽ, bóng loáng để Manager dựa vào đó kiểm định chất lượng duyệt QC từ xa.
* **Code tham chiếu:** API hoàn thành của thợ tại [washer-api.ts](file:///f:/WDP/frontend/lib/washer-api.ts#L26-L27):
  ```typescript
  export const washerFinishWorkOrder = (id: string, checkoutPhotos: string[]) =>
    axiosInstance.patch(`/me/work-orders/${id}/finish`, { checkoutPhotos });
  ```

#### Q22: Tại sao thu ngân không thể chụp hay xóa ảnh trước khi rửa khi xe đang rửa hoặc đã hoàn thành?
* **A:** Để bảo toàn tính trung thực của dữ liệu hiện trạng. Tránh việc thu ngân thay đổi hình ảnh sau khi có sự cố phát sinh trong khoang rửa.
* **Code tham chiếu:** Khóa quyền thay đổi ảnh Pre-wash của thu ngân tại [page.tsx](file:///f:/WDP/frontend/app/cashier/orders/page.tsx).

#### Q23: Quy trình checklist tiêu chuẩn của thợ rửa xe gồm bao nhiêu bước cơ bản?
* **A:** Gồm 6 bước: Nhận xe & kiểm tra trầy xước; Xịt gầm & hốc bánh; Phun bọt tuyết & cọ rửa vỏ xe; Xả nước sạch; Lau khô & hút bụi nội thất; Dưỡng bóng lốp & kiểm tra tổng thể.
* **Code tham chiếu:** Khai báo quy trình checklist tại [page.tsx](file:///f:/WDP/frontend/app/washer/page.tsx).

#### Q24: Thợ rửa xe có bắt buộc phải tích đầy đủ 6 bước checklist mới được báo cáo hoàn thành?
* **A:** Hệ thống khuyên dùng tích đủ 100%, nhưng về mặt nghiệp vụ vẫn cho phép bấm hoàn thành nếu thợ đã kiểm tra xe đạt yêu cầu thực tế.
* **Code tham chiếu:** Class đổi màu nút khi checklist hoàn thành 100% tại [page.tsx](file:///f:/WDP/frontend/app/washer/page.tsx).

#### Q25: Khách hàng xem ảnh trước và sau khi rửa xe ở đâu?
* **A:** Xem tại chi tiết đơn hàng trong phần Lịch sử đơn hàng để thấy tính minh bạch của dịch vụ.
* **Code tham chiếu:** Hook lấy ảnh rửa xe tại [useOrders.ts](file:///f:/WDP/frontend/hooks/orders/useOrders.ts#L54-L75).

---

### 3. Chương trình khách hàng thân thiết và Voucher
#### Q26: Công thức tích lũy điểm thưởng (Loyalty Points) hoạt động ra sao?
* **A:** Điểm tích lũy = Số tiền thanh toán đơn hàng thực tế * Hệ số nhân điểm thưởng của gói dịch vụ (`pointsMultiplier`).
* **Code tham chiếu:** Schema điểm thưởng tại [useOrders.ts](file:///f:/WDP/frontend/hooks/orders/useOrders.ts#L179-L189).

#### Q27: Quy định về mốc tích lũy lượt rửa để tặng Voucher rửa xe miễn phí là bao nhiêu?
* **A:** Mốc tích lũy được Backend tính theo từng hạng thành viên (`washesRequiredForNextVoucher`, mặc định là 10 lượt). Khi đạt mốc, hệ thống tự động cấp Voucher cho khách.
* **Code tham chiếu:** Đọc chỉ số loyalty tại [page.tsx](file:///f:/WDP/frontend/app/%28customer%29/booking/page.tsx#L282-L287).

#### Q28: Khi nhận được Voucher rửa xe miễn phí, chỉ số tích lũy lượt rửa của khách sẽ thay đổi thế nào?
* **A:** Chỉ số `successfulWashesTowardVoucher` sẽ tự động reset về 0 để bắt đầu chu kỳ tích lũy tiếp theo.
* **Code tham chiếu:** Hiển thị thanh tiến độ tích điểm tại [page.tsx](file:///f:/WDP/frontend/app/%28customer%29/booking/page.tsx).

#### Q29: Voucher rửa xe miễn phí có giới hạn số tiền giảm giá không?
* **A:** Có. Mỗi voucher được cấu hình một mức giảm tối đa (`discountCapVnd`), phần chênh lệch vượt quá khách hàng sẽ thanh toán thêm.
* **Code tham chiếu:** Render chi tiết voucher của khách hàng tại [page.tsx](file:///f:/WDP/frontend/app/%28customer%29/booking/page.tsx).

#### Q30: Trạng thái `unused`, `used`, `expired` và `revoked` của Voucher được định nghĩa như thế nào?
* **A:** 
  * `unused`: Voucher còn hạn dùng và chưa áp dụng cho đơn hàng nào.
  * `used`: Đã được dùng cho một đơn hàng đã hoàn tất thanh toán.
  * `expired`: Voucher quá hạn (`expiresAt`) và bị vô hiệu hóa.
  * `revoked`: Voucher bị quản trị viên thu hồi thủ công.
* **Code tham chiếu:** Lọc voucher chưa dùng tại [customer-api.ts](file:///f:/WDP/frontend/lib/customer-api.ts#L63-L66).

#### Q31: Khách hàng có thể áp dụng đồng thời nhiều voucher cho một đơn hàng không?
* **A:** Không. Mỗi đơn hàng chỉ được áp dụng tối đa 01 voucher giảm giá để đảm bảo chính sách doanh thu của cửa hàng.
* **Code tham chiếu:** State voucher đơn nhất tại [page.tsx](file:///f:/WDP/frontend/app/%28customer%29/booking/page.tsx#L101):
  ```typescript
  const [selectedVoucherId, setSelectedVoucherId] = useState<string>('');
  ```

#### Q32: Nếu khách hàng hủy đơn hàng đã áp dụng voucher, trạng thái voucher sẽ như thế nào?
* **A:** Nếu đơn hàng chưa hoàn thành và được hủy hợp lệ, voucher sẽ được hoàn trả lại trạng thái `unused` để khách hàng sử dụng cho lần sau.
* **Code tham chiếu:** API hủy đơn và phục hồi voucher tại [customer-api.ts](file:///f:/WDP/frontend/lib/customer-api.ts#L212-L213).

#### Q33: Sự khác biệt giữa Voucher phát tự động qua Loyalty và Voucher do Manager cấp thủ công (Grant Voucher)?
* **A:** Voucher tự động cấp theo chu kỳ tích lũy của khách. Voucher cấp thủ công do Manager cấp riêng cho khách kèm theo lý do cụ thể (bồi thường, tri ân VIP,...).
* **Code tham chiếu:** API cấp voucher thủ công tại [admin-api.ts](file:///f:/WDP/frontend/lib/admin-api.ts#L214-L215).

#### Q34: Quyền hạn hủy bỏ voucher (Revoke Voucher) thuộc về ai và áp dụng khi nào?
* **A:** Quyền hạn thuộc về Admin/Manager, dùng khi phát hiện gian lận điểm hoặc cấp nhầm mã voucher cho khách hàng.
* **Code tham chiếu:** API thu hồi voucher tại [admin-api.ts](file:///f:/WDP/frontend/lib/admin-api.ts#L225-L226).

#### Q35: Hệ thống xếp hạng thành viên (Tiers) dựa trên tiêu chí nào?
* **A:** Dựa trên tổng số lượt rửa xe thành công tích lũy trọn đời (`totalSuccessfulWashes`) của khách hàng để phân hạng Đồng, Bạc, Vàng, Kim Cương.
* **Code tham chiếu:** Định nghĩa kiểu LoyaltyAccount tại [useOrders.ts](file:///f:/WDP/frontend/hooks/orders/useOrders.ts#L179).

#### Q36: Hạng thành viên mang lại lợi ích trực tiếp gì cho khách hàng khi đặt lịch?
* **A:** Giảm giá trực tiếp theo tỷ lệ % quy định của hạng thành viên khi khách hàng đặt lịch rửa xe vào Khung Giờ Vàng (Golden Hour).
* **Code tham chiếu:** Hook preview đơn tính ưu đãi hạng tại [useOrders.ts](file:///f:/WDP/frontend/hooks/orders/useOrders.ts#L195-L227).

#### Q37: Khung Giờ Vàng (Golden Hour) của tiệm được quy định vào những khoảng thời gian nào?
* **A:** Hai khung giờ cố định trong ngày: Sáng từ 08:00 – 12:00 và Chiều từ 13:00 – 17:00 (tính theo giờ địa phương).
* **Code tham chiếu:** Quản lý Golden Hours tại [admin-api.ts](file:///f:/WDP/frontend/lib/admin-api.ts#L283-L293).

#### Q38: Khách hàng có thể được hưởng đồng thời ưu đãi hạng thành viên giờ vàng và voucher không?
* **A:** Có. Hệ thống sẽ tính giảm giá giờ vàng theo hạng trước, sau đó áp dụng giảm trừ của voucher trên số tiền còn lại.
* **Code tham chiếu:** API preview đơn tính toán gộp ưu đãi tại [customer-api.ts](file:///f:/WDP/frontend/lib/customer-api.ts#L192-L197).

---

### 4. Quản lý ca trực, nhân viên và dịch vụ
#### Q39: Ai chịu trách nhiệm tạo và quản lý ca làm việc (Shifts) của nhân viên?
* **A:** Manager hoặc Admin. Ca làm việc phân chia theo ngày, giờ bắt đầu, giờ kết thúc và số lượng nhân viên tối đa tham gia.
* **Code tham chiếu:** API quản lý ca trực tại [admin-api.ts](file:///f:/WDP/frontend/lib/admin-api.ts#L117-L158).

#### Q40: Vai trò của "Ca trực khả dụng" (Available Shifts) đối với luồng đặt lịch là gì?
* **A:** Quyết định dung lượng tối đa của một thời điểm đặt lịch. Nếu một khung giờ không có ca trực nào hoạt động, khách hàng không thể đặt lịch vào giờ đó.
* **Code tham chiếu:** Gọi API lấy ca trực trống tại [customer-api.ts](file:///f:/WDP/frontend/lib/customer-api.ts#L223-L227).

#### Q41: Tại sao không thể xóa một dịch vụ (Service Type) đang có trong hệ thống?
* **A:** Vì xóa dịch vụ sẽ làm hỏng dữ liệu lịch sử đơn hàng của khách. Hệ thống chỉ cho phép chuyển trạng thái hoạt động sang ngưng hoạt động (`isActive = false`).
* **Code tham chiếu:** API đổi trạng thái dịch vụ tại [admin-api.ts](file:///f:/WDP/frontend/lib/admin-api.ts#L90-L91).

#### Q42: Dịch vụ ngưng hoạt động (`isActive = false`) ảnh hưởng như thế nào đến tiệm?
* **A:** Khách hàng sẽ không nhìn thấy gói dịch vụ này khi đặt lịch mới. Nhưng dữ liệu cũ trong lịch sử đơn của khách và doanh thu báo cáo vẫn hiển thị bình thường.
* **Code tham chiếu:** API lấy dịch vụ đang kích hoạt ngoài trang chủ tại [customer-api.ts](file:///f:/WDP/frontend/lib/customer-api.ts#L163-L164).

#### Q43: Sự khác biệt giữa vai trò của Cashier (Thu ngân) và Washer (Thợ rửa)?
* **A:** Cashier quản lý thanh toán, check-in nhận xe, chụp ảnh trước khi rửa. Washer chịu trách nhiệm rửa xe theo checklist tiêu chuẩn và chụp ảnh nghiệm thu.
* **Code tham chiếu:** 
  * API Cashier: [admin-api.ts](file:///f:/WDP/frontend/lib/admin-api.ts)
  * API Washer: [washer-api.ts](file:///f:/WDP/frontend/lib/washer-api.ts)

#### Q44: Trạng thái xe rửa xong chuyển sang `quality_check` nhưng thợ rửa muốn sửa lại checklist có được không?
* **A:** Không. Khi đã báo cáo hoàn thành, quyền kiểm soát phiếu thuộc về Manager để đánh giá QC, thợ rửa không thể tự ý sửa checklist trừ khi bị Manager trả về (`returned`).
* **Code tham chiếu:** Giao diện Washer Dashboard tại [page.tsx](file:///f:/WDP/frontend/app/washer/page.tsx).

#### Q45: Sự khác biệt giữa Giá cơ bản (Base Price) của dịch vụ và Giá thực tế khách thanh toán?
* **A:** Giá cơ bản là giá niêm yết của gói. Giá thực tế thanh toán có thể thấp hơn do khấu trừ giảm giá giờ vàng thành viên, giảm giá voucher, hoặc phụ thu theo loại xe.
* **Code tham chiếu:** Render giá tại [page.tsx](file:///f:/WDP/frontend/app/%28customer%29/booking/page.tsx).

#### Q46: Khi thợ rửa xe được đổi (Reassign Washer) giữa chừng, trạng thái công việc có bị reset không?
* **A:** Không. Trạng thái công việc (đang rửa, rửa lại...) và tiến độ checklist hiện tại vẫn được giữ nguyên, chỉ thay đổi tên nhân viên chịu trách nhiệm thực thi.
* **Code tham chiếu:** API đổi thợ rửa tại [admin-api.ts](file:///f:/WDP/frontend/lib/admin-api.ts#L182-L183).

#### Q47: Ca trực của nhân viên có thể được cập nhật khi ca đó đang diễn ra không?
* **A:** Có thể thay đổi nhân sự trực thuộc ca trực đó, nhưng không được phép thay đổi khung giờ ca trực đã/đang chạy để tránh sai lệch lịch hẹn của khách.
* **Code tham chiếu:** API thay đổi ca làm việc tại [admin-api.ts](file:///f:/WDP/frontend/lib/admin-api.ts#L152-L153).

#### Q48: Làm thế nào để biết một ca trực đã hết công suất nhận xe?
* **A:** Chỉ số `remainingCapacity` của ca trực đó giảm về 0. Khung giờ đó trên giao diện đặt lịch của khách hàng sẽ tự chuyển sang màu xám và bị khóa chọn.
* **Code tham chiếu:** Render nút slot giờ tại [page.tsx](file:///f:/WDP/frontend/app/%28customer%29/booking/page.tsx).

#### Q49: Khách hàng vãng lai (vào tiệm trực tiếp không đặt trước) được check-in thế nào?
* **A:** Thu ngân (Cashier) sẽ tạo nhanh một đơn đặt lịch trực tiếp trên hệ thống tại quầy, tiến hành check-in và đẩy xe vào khoang rửa như bình thường.
* **Code tham chiếu:** Cashier tạo nhanh đơn hàng check-in tại [page.tsx](file:///f:/WDP/frontend/app/cashier/orders/page.tsx).

#### Q50: Hệ thống lưu vết lịch sử thao tác của các phiếu rửa xe (Work Order log) nhằm mục đích gì?
* **A:** Ghi nhận chính xác ai là người gán thợ, thợ bắt đầu lúc mấy giờ (`startedAt`), hoàn thành lúc nào (`finishedAt`) và ai duyệt QC để phục vụ công tác đối soát.
* **Code tham chiếu:** Model DTO tại kiểu dữ liệu [types/washer.ts](file:///f:/WDP/frontend/types/washer.ts).

---

## PHẦN II: CỐT LÕI CODE FRONTEND (TECHNICAL DETAILS) - 50 CÂU

### 1. Kiến trúc dự án Next.js & React 19
#### Q51: Dự án sử dụng mô hình Router nào của Next.js?
* **A:** Sử dụng **App Router** (thư mục `app/`), tận dụng các folder layout, page để tổ chức route phân quyền theo vai trò (`app/washer`, `app/cashier`, `app/manager`, `app/(customer)`).
* **Thư mục liên quan:** [app/](file:///f:/WDP/frontend/app)

#### Q52: React 19 đem lại cải tiến gì lớn nhất cho việc phát triển component trong dự án này?
* **A:** Tối ưu hóa render tự động, cải tiến xử lý hook bất đồng bộ và hỗ trợ tốt cho việc tích hợp server/client components trực tiếp mà không cần cấu hình phức tạp.
* **Cấu hình package:** [package.json](file:///f:/WDP/frontend/package.json#L20):
  ```json
  "react": "19.2.6"
  ```

#### Q53: Điểm khác biệt giữa Client Component và Server Component trong cấu trúc thư mục `app/` của dự án?
* **A:** Các file bắt đầu bằng `'use client';` ở dòng đầu tiên là Client Component (chứa state, hook, tương tác click). Server Component là mặc định, dùng để render tĩnh hoặc fetch dữ liệu trực tiếp trên server giúp tối ưu SEO.
* **Code tham chiếu:** Ví dụ Client Component tại [page.tsx](file:///f:/WDP/frontend/app/washer/page.tsx#L1):
  ```typescript
  'use client';
  ```

#### Q54: Tại sao file `app/(customer)/booking/page.tsx` lại có dung lượng dòng code lớn nhất dự án (hơn 1600 dòng)?
* **A:** Vì file này chứa toàn bộ trạng thái (state machine) của luồng đặt lịch phức tạp: quản lý xe, chọn gói dịch vụ, tính toán slot thời gian thực, áp dụng voucher, chọn hình thức thanh toán và modal thêm xe nhanh.
* **File liên quan:** [page.tsx](file:///f:/WDP/frontend/app/%28customer%29/booking/page.tsx)

#### Q55: Giải pháp tối ưu để giảm tải số dòng code cho file `app/(customer)/booking/page.tsx` trong tương lai là gì?
* **A:** Tách nhỏ các bước (Step 1, Step 2, Step 3, Step 4) thành các component con độc lập trong thư mục `components/booking/` và truyền state qua React Context hoặc URL search params.
* **Thư mục liên quan:** [components/](file:///f:/WDP/frontend/components)

#### Q56: Tác dụng của component `ProtectedRoute` đặt tại `components/shared/ProtectedRoute.tsx` là gì?
* **A:** Bảo vệ các trang yêu cầu đăng nhập. Nó kiểm tra `_hasHydrated` và `authUser` trong Zustand store, kiểm tra quyền `allowedRoles` và tự động redirect người dùng về `/login` hoặc trang tương ứng với Role.
* **File liên quan:** [ProtectedRoute.tsx](file:///f:/WDP/frontend/components/shared/ProtectedRoute.tsx#L18-L49).

#### Q57: Giao diện quản trị của thợ rửa xe (`app/washer/page.tsx`) sử dụng thư viện nào để fetch và cập nhật dữ liệu tự động?
* **A:** Sử dụng thư viện **React Query (TanStack Query)** với hook `useQuery` và `useMutation` để tự động cập nhật danh sách xe cần rửa.
* **Code tham chiếu:** Gọi hook loading data thợ tại [page.tsx](file:///f:/WDP/frontend/app/washer/page.tsx).

#### Q58: Dự án sử dụng thư viện icon nào để tạo ra các biểu tượng đồng bộ trên giao diện?
* **A:** Thư viện **Lucide React** (`lucide-react`) với các icon SVG nhẹ, có thể tùy chỉnh kích thước và màu sắc dễ dàng qua CSS class.
* **Code tham chiếu:** Import icons tại [page.tsx](file:///f:/WDP/frontend/app/washer/page.tsx).

#### Q59: Tại sao dự án sử dụng `pnpm-lock.yaml` thay vì `package-lock.json`?
* **A:** Dự án được thiết lập sử dụng `pnpm` để tối ưu dung lượng node_modules, tăng tốc độ cài đặt thư viện thông qua cơ chế hard-link của pnpm.
* **File liên quan:** [pnpm-lock.yaml](file:///f:/WDP/frontend/pnpm-lock.yaml)

#### Q60: Vai trò của file `next.config.ts` trong dự án Next.js 15+ là gì?
* **A:** Khai báo cấu hình nâng cao cho Next.js như cấu hình rewrites proxy API, domain ảnh bên ngoài (Cloudinary), và các cờ thử nghiệm của framework.
* **File liên quan:** [next.config.ts](file:///f:/WDP/frontend/next.config.ts).

---

### 2. State Management & API Integration (Zustand & React Query)
#### Q61: Zustand được sử dụng cho mục đích gì trong dự án và lưu trữ ở file nào?
* **A:** Dùng để quản lý thông tin đăng nhập, token của người dùng (Authentication state) tại file `store/useAuthStore.ts`.
* **File liên quan:** [useAuthStore.ts](file:///f:/WDP/frontend/store/useAuthStore.ts).

#### Q62: Làm thế nào Zustand tự động lưu và khôi phục trạng thái đăng nhập khi người dùng F5 tải lại trang?
* **A:** Zustand sử dụng middleware `persist` để tự động đồng bộ hóa thông tin đăng nhập trong store xuống `localStorage` của trình duyệt với key `auth-storage`.
* **File liên quan:** [useAuthStore.ts](file:///f:/WDP/frontend/store/useAuthStore.ts#L27-L113).

#### Q63: React Query (TanStack Query) quản lý cache dữ liệu ca trực trống qua key nào?
* **A:** Quản lý qua queryKey: `['available-slots', serviceTypeId, vehicleTypeId, from, to]`. Khi các biến này thay đổi, React Query tự động trigger gọi API mới.
* **Code tham chiếu:** Khai báo query key tại [useOrders.ts](file:///f:/WDP/frontend/hooks/orders/useOrders.ts#L132).

#### Q64: Tác dụng của hàm `qc.invalidateQueries` trong các mutation thành công là gì?
* **A:** Báo hiệu cho React Query biết dữ liệu cache của query tương ứng đã lỗi thời (stale), buộc React Query tự động gọi lại API ngầm để cập nhật giao diện mới nhất mà không cần tải lại toàn bộ trang.
* **Code tham chiếu:** Invalidate cache sau khi tạo đơn thành công tại [useOrders.ts](file:///f:/WDP/frontend/hooks/orders/useOrders.ts#L85).

#### Q65: Sự khác biệt giữa `useQuery` và `useMutation` trong dự án?
* **A:** `useQuery` dùng để đọc dữ liệu từ API (GET) và lưu cache. `useMutation` dùng để thay đổi dữ liệu (POST, PATCH, DELETE) và không lưu cache tự động.
* **File liên quan:** Khai báo các hook tại [useOrders.ts](file:///f:/WDP/frontend/hooks/orders/useOrders.ts).

#### Q66: Interceptor của Axios tại `lib/axios.ts` xử lý trường hợp Access Token hết hạn (Lỗi 401) như thế nào?
* **A:** Nó tạm dừng request bị lỗi, gọi API `/auth/refresh` để lấy Access Token mới bằng Refresh Token, cập nhật vào Zustand store và thực hiện lại request bị lỗi ban đầu một cách tự động (Silent Refresh).
* **File liên quan:** Cấu hình interceptors tại [axios.ts](file:///f:/WDP/frontend/lib/axios.ts#L59-L104).

#### Q67: Header `Content-Type` mặc định của AxiosInstance được cấu hình là gì?
* **A:** Cấu hình mặc định là `application/json` để truyền nhận dữ liệu định dạng JSON.
* **Code tham chiếu:** Khởi tạo instance tại [axios.ts](file:///f:/WDP/frontend/lib/axios.ts#L4-L11).

#### Q68: Khi upload ảnh lên Cloudinary qua API `/upload/image`, ta phải ghi đè header `Content-Type` của Axios thành gì?
* **A:** Ghi đè thành `multipart/form-data` để gửi dữ liệu file dưới dạng `FormData`.
* **Code tham chiếu:** API upload single image tại [upload-api.ts](file:///f:/WDP/frontend/lib/upload-api.ts#L9-L12).

#### Q69: Cách dự án phân biệt các Endpoint Public không cần đính kèm Bearer Header Authorization trong Axios là gì?
* **A:** Kiểm tra danh sách `publicEndpoints` (ví dụ: `/auth/login`, `/auth/register`, `/auth/refresh`,...) trong request interceptor. Nếu URL trùng hợp thì không chèn `Authorization: Bearer <token>`.
* **Code tham chiếu:** Logic kiểm tra public endpoint tại [axios.ts](file:///f:/WDP/frontend/lib/axios.ts#L17-L32).

#### Q70: Cách xử lý lỗi bất đồng bộ trong các Hook của React Query nhằm tránh sập ứng dụng?
* **A:** Sử dụng khối lệnh `try-catch` hoặc xử lý thông qua hàm callback `onError` cung cấp sẵn bởi `useMutation` để hiển thị thông báo lỗi thân thiện qua toast.
* **Code tham chiếu:** Callback xử lý lỗi tại [page.tsx](file:///f:/WDP/frontend/app/washer/page.tsx).

---

### 3. Cấu trúc Styling (Tailwind CSS v4 & PostCSS)
#### Q71: Dự án sử dụng phiên bản Tailwind CSS nào và có gì đặc biệt?
* **A:** Sử dụng **Tailwind CSS v4** mới nhất. Bản này chạy nhanh hơn, loại bỏ file config cồng kềnh `tailwind.config.js` và chuyển sang cấu hình trực tiếp bằng CSS variables trong file CSS chính.
* **File liên quan:** [package.json](file:///f:/WDP/frontend/package.json#L37):
  ```json
  "tailwindcss": "^4.3.0"
  ```

#### Q72: Tác dụng của file `postcss.config.mjs` trong dự án?
* **A:** Cấu hình PostCSS tích hợp bộ xử lý `@tailwindcss/postcss` để biên dịch trực tiếp các directive mới của Tailwind v4 thành CSS tiêu chuẩn cho trình duyệt hiểu.
* **File liên quan:** [postcss.config.mjs](file:///f:/WDP/frontend/postcss.config.mjs#L1-L7).

#### Q73: Thư viện `clsx` và `tailwind-merge` phối hợp với nhau thế nào trong dự án?
* **A:** Được bọc trong helper `cn(...)` tại `lib/utils.ts`. Dùng để nối các class Tailwind động và tự động loại bỏ các class trùng lặp/ghi đè nhau để giữ CSS sạch sẽ.
* **File liên quan:** [utils.ts](file:///f:/WDP/frontend/lib/utils.ts#L4-L6).

#### Q74: Làm thế nào để tạo hiệu ứng nhấp nháy cho xe đang rửa ở Washer page?
* **A:** Sử dụng class utility `animate-pulse` của Tailwind trên badge trạng thái `in_progress` để thu hút sự chú ý của thợ rửa xe.
* **Code tham chiếu:** Badge nhấp nháy tại [page.tsx](file:///f:/WDP/frontend/app/washer/page.tsx).

#### Q75: Cách viết style responsive trên màn hình Mobile và Desktop bằng Tailwind trong dự án?
* **A:** Sử dụng prefix kích thước màn hình như `md:` hoặc `lg:` (Ví dụ: `grid-cols-1 md:grid-cols-2` nghĩa là mobile hiển thị 1 cột, máy tính hiển thị 2 cột).
* **Code tham chiếu:** Grid responsive hiển thị tại [page.tsx](file:///f:/WDP/frontend/app/washer/page.tsx).

#### Q76: Làm thế nào để tùy biến phông chữ (Typography) cho dự án thay vì dùng font mặc định của trình duyệt?
* **A:** Import font chữ hiện đại từ Google Fonts trực tiếp trong file CSS chính hoặc qua `next/font/google` trong layout gốc của Next.js.
* **File liên quan:** Layout gốc của ứng dụng tại [layout.tsx](file:///f:/WDP/frontend/app/layout.tsx).

#### Q77: Class `backdrop-blur-sm` kết hợp với màu nền có độ mờ (opacity) tạo ra hiệu ứng gì?
* **A:** Tạo ra hiệu ứng kính mờ (Glassmorphism) thời thượng cho các thanh Topbar và các Modal Dialog hiển thị đè lên giao diện chính.
* **Code tham chiếu:** Modal xem ảnh phóng to tại [page.tsx](file:///f:/WDP/frontend/app/washer/page.tsx).

#### Q78: Cách định nghĩa và quản lý Hệ màu (Color System) theo chuẩn Tailwind CSS v4 trong giao diện?
* **A:** Khai báo các CSS Color Variables (chẳng hạn `--primary`, `--background`, `--border`) trong file CSS chính (`globals.css`), cho phép thay đổi theme Dark/Light dễ dàng.
* **File liên quan:** File CSS chính của dự án tại `app/globals.css`.

#### Q79: Quy tắc quản lý độ ưu tiên hiển thị (z-index) cho các Modal, Topbar và Toast notification là gì?
* **A:** Đặt z-index phân tầng hợp lý: Topbar (`z-30`), Floating Action Buttons (`z-40`), Modal Backdrop (`z-50`), và Toast notifications (`z-100`).
* **Code tham chiếu:** Cấu hình Toaster container tại [AppProvider.tsx](file:///f:/WDP/frontend/providers/AppProvider.tsx#L52-L56).

#### Q80: Cách Tailwind CSS v4 giúp tối ưu dung lượng CSS gửi xuống trình duyệt khách hàng?
* **A:** Tailwind v4 chỉ biên dịch các class thực sự xuất hiện trong mã nguồn JSX/TSX (Just-In-Time Engine), loại bỏ 100% CSS thừa trong bản build sản phẩm.
* **File liên quan:** [package.json](file:///f:/WDP/frontend/package.json#L37).

---

### 4. Tích hợp API Upload ảnh & Xử lý bất đồng bộ
#### Q81: API upload đơn ảnh (`/upload/image`) yêu cầu gửi dữ liệu lên với key là gì?
* **A:** Key là `file` chứa file ảnh nhị phân cần upload lên Cloudinary.
* **Code tham chiếu:** Định nghĩa formData tại [upload-api.ts](file:///f:/WDP/frontend/lib/upload-api.ts#L6-L14).

#### Q82: API upload nhiều ảnh (`/upload/images`) yêu cầu gửi dữ liệu lên với key là gì?
* **A:** Key là `files` chứa mảng các file ảnh nhị phân (tối đa 5 ảnh).
* **Code tham chiếu:** Thêm nhiều ảnh vào formData tại [upload-api.ts](file:///f:/WDP/frontend/lib/upload-api.ts#L19-L30).

#### Q83: Tại sao việc upload trực tiếp file Base64 lên database hoặc lưu vào localStorage lại là bad practice?
* **A:** Chuỗi Base64 làm phình to kích thước dữ liệu gấp 1.37 lần, gây chậm đường truyền mạng và dễ làm tràn bộ nhớ giới hạn 5MB của `localStorage` trình duyệt.
* **File liên quan:** Helper upload Cloudinary tại [upload-api.ts](file:///f:/WDP/frontend/lib/upload-api.ts).

#### Q84: Helper `uploadImages` trong `lib/upload-api.ts` nhận tham số đầu vào là gì và xử lý thế nào?
* **A:** Nhận vào một `FileList` hoặc mảng `File[]`, duyệt qua từng phần tử để `append` vào đối tượng `FormData` với key là `files`, sau đó gọi POST request.
* **File liên quan:** [upload-api.ts](file:///f:/WDP/frontend/lib/upload-api.ts#L19-L30).

#### Q85: Làm thế nào để hiển thị trạng thái đang tải (Loading toast) khi gọi API upload ảnh?
* **A:** Sử dụng hàm `toast.loading('Đang tải...')` của thư viện `sonner` để lấy về một `toastId`, sau đó dùng `toast.success` hoặc `toast.error` kèm `id` đó để cập nhật trạng thái khi hoàn tất.
* **Code tham chiếu:** Hiển thị toast upload ảnh Pre-wash tại [page.tsx](file:///f:/WDP/frontend/app/cashier/orders/page.tsx).

#### Q86: Tại sao cần chèn khoảng trễ `await new Promise((r) => setTimeout(r, 350))` khi tự động Start đơn hàng ở trạng thái `returned` trước khi Finish?
* **A:** Để tạo một khoảng nghỉ nhỏ cho Backend ghi nhận trạng thái từ `returned` thành `in_progress` vào Database thành công, tránh việc hai request gửi lên quá sát nhau gây lỗi xung đột trạng thái (400 Bad Request).
* **Code tham chiếu:** Delay API request tại [page.tsx](file:///f:/WDP/frontend/app/washer/page.tsx).

#### Q87: Tại sao phải gọi `URL.revokeObjectURL(url)` sau khi xem trước (preview) ảnh local của người dùng?
* **A:** Để giải phóng bộ nhớ RAM mà trình duyệt cấp phát cho Blob URL tạm thời, tránh tình trạng rò rỉ bộ nhớ (Memory Leak) khi người dùng chọn nhiều file ảnh liên tục.
* **Code tham chiếu:** Xử lý upload ảnh tại [page.tsx](file:///f:/WDP/frontend/app/cashier/orders/page.tsx).

#### Q88: Cấu hình thời gian chờ tối đa (timeout) cho các request Axios trong dự án là bao nhiêu?
* **A:** Cấu hình timeout mặc định là `30000ms` (30 giây) để hủy các request bị ngắt kết nối đường truyền giữa chừng.
* **Code tham chiếu:** Cấu hình timeout tại [axios.ts](file:///f:/WDP/frontend/lib/axios.ts#L10).

#### Q89: Kỹ thuật nào được dùng để thực hiện đồng thời nhiều request API không phụ thuộc lẫn nhau?
* **A:** Sử dụng `Promise.all([...])` để khởi chạy song song các request API (ví dụ: tải danh sách xe và tải loại xe cùng lúc), giúp rút ngắn tổng thời gian tải trang.
* **Code tham chiếu:** Tải song song dữ liệu Step 1 tại [page.tsx](file:///f:/WDP/frontend/app/%28customer%29/booking/page.tsx#L119-L122).

#### Q90: Dữ liệu mảng ảnh check-in và check-out của một Work Order được lưu giữ ở cấu trúc nào?
* **A:** Lưu trữ dưới dạng mảng các chuỗi URL (`string[]`) dẫn tới các file ảnh đã upload trên Cloudinary dịch vụ lưu trữ media.
* **Code tham chiếu:** Kiểu dữ liệu OrderWashPhotos tại [useOrders.ts](file:///f:/WDP/frontend/hooks/orders/useOrders.ts#L45-L48).

---

### 5. Tối ưu hóa hiệu năng, PWA & Trải nghiệm người dùng (UX)
#### Q91: Làm thế nào để đóng nhanh một thông báo Toast của Sonner?
* **A:** Sử dụng nút đóng (dấu X) được kích hoạt bởi prop `closeButton` trên component `<Toaster />` tại `AppProvider.tsx`.
* **Code tham chiếu:** Kích hoạt closeButton tại [AppProvider.tsx](file:///f:/WDP/frontend/providers/AppProvider.tsx#L52-L56).

#### Q92: Ứng dụng PWA mang lại lợi ích trực tiếp gì cho trải nghiệm người dùng mobile?
* **A:** Cho phép khách hàng và nhân viên cài đặt app trực tiếp lên màn hình chính (Add to Home Screen), khởi chạy ứng dụng mượt mà dạng Standalone không có thanh địa chỉ trình duyệt.
* **File liên quan:** [PWA_DOCUMENT.md](file:///f:/WDP/frontend/PWA_DOCUMENT.md).

#### Q93: Kỹ thuật Optimistic Update (Cập nhật giao diện trước) giúp nâng cao trải nghiệm như thế nào?
* **A:** Giúp phản hồi ngay lập tức thao tác click của người dùng trên UI (ví dụ tích checklist rửa xe) trước khi API phản hồi thành công, tạo cảm giác ứng dụng phản hồi siêu tốc.
* **Code tham chiếu:** Quản lý state checklist tại [page.tsx](file:///f:/WDP/frontend/app/washer/page.tsx).

#### Q94: Làm thế nào để phòng chống người dùng nhấp đúp (Double click) làm gửi trùng lặp đơn hàng?
* **A:** Sử dụng thuộc tính `disabled={isLoading}` trên nút Submit và quản lý trạng thái loading qua React Query Mutation.
* **Code tham chiếu:** Khóa nút đặt lịch tại [page.tsx](file:///f:/WDP/frontend/app/%28customer%29/booking/page.tsx).

#### Q95: Thẻ `manifest.ts` (Web App Manifest) chứa những thông tin cốt lõi nào cho PWA trong Next.js App Router?
* **A:** Chứa tên ứng dụng (`name`, `short_name`), các biểu tượng ứng dụng ở nhiều độ phân giải (`icons`), màu chủ đạo (`theme_color`), và chế độ hiển thị (`display: 'standalone'`).
* **File liên quan:** [manifest.ts](file:///f:/WDP/frontend/app/manifest.ts#L3-L39).

#### Q96: Làm thế nào để xử lý hiện tượng Hydration Mismatch khi sử dụng Zustand Persist với Next.js App Router?
* **A:** Sử dụng cờ trạng thái `_hasHydrated` trong Zustand store kết hợp với `onRehydrateStorage` để chỉ render các phần phụ thuộc auth sau khi client đã khôi phục xong `localStorage`.
* **Code tham chiếu:** Hydration listener tại [useAuthStore.ts](file:///f:/WDP/frontend/store/useAuthStore.ts#L33-L34).

#### Q97: Tác dụng của component `<Image />` trong Next.js so với thẻ `<img />` HTML thông thường là gì?
* **A:** Tự động tối ưu hóa định dạng ảnh (WebP/AVIF), nén dung lượng, tự động thay đổi kích thước theo thiết bị và Lazy Loading các hình ảnh ngoài khung nhìn.
* **File liên quan:** Cấu hình Next.js Image Optimization tại [next.config.ts](file:///f:/WDP/frontend/next.config.ts).

#### Q98: Skeleton Loading UI đóng vai trò gì trong trải nghiệm chờ tải dữ liệu của khách hàng?
* **A:** Giảm cảm giác chờ đợi mệt mỏi bằng cách hiển thị khung hình dạng khối mờ giả lập trước vị trí dữ liệu sắp xuất hiện, giúp giao diện không bị giật lag (Layout Shift).
* **Code tham chiếu:** Render Spinner & Skeletons tại [page.tsx](file:///f:/WDP/frontend/app/%28customer%29/booking/page.tsx).

#### Q99: Luồng điều hướng thông minh dựa theo Vai trò (Role-based Navigation) hoạt động ra sao?
* **A:** Sau khi đăng nhập thành công, hệ thống kiểm tra thuộc tính `user.role` và tự động chuyển hướng người dùng tới Dashboard tương ứng: `/admin`, `/manager`, `/cashier`, `/washer`, hoặc `/`.
* **Code tham chiếu:** Điều hướng phân quyền tại [ProtectedRoute.tsx](file:///f:/WDP/frontend/components/shared/ProtectedRoute.tsx#L29-L46).

#### Q100: Thiết kế giao diện ưu tiên Mobile (Mobile-first UX) áp dụng cho thợ rửa xe và thu ngân thế nào?
* **A:** Tăng kích thước các khu vực chạm (Touch targets >= 44px), nút bấm to rõ, hỗ trợ thao tác bằng 1 tay và cố định thanh tác vụ chính (Sticky bottom bar) giúp công việc vận hành diễn ra cực kỳ thuận tiện.
* **Code tham chiếu:** Dashboard thợ rửa xe tại [page.tsx](file:///f:/WDP/frontend/app/washer/page.tsx).
