# Frontend Changelog — Refactor Voucher & Loyalty + Đăng nhập Google

> Tổng hợp mọi thay đổi **ảnh hưởng tới frontend** sau đợt refactor voucher/loyalty (nhánh `refactor-voucher`, Phase 1–4) **và tính năng đăng nhập/đăng ký bằng Google** (mục 16–18).
> Chi tiết kỹ thuật đầy đủ: `API_DOCUMENTATION.md` (repo backend).
> Cập nhật: 2026-07-28.

## Quy ước trong tài liệu này

- **Mọi đường dẫn API đều tính từ base `${NEXT_PUBLIC_API_URL}/api`.** Ví dụ `POST /auth/google` nghĩa là `POST https://wash-auto.vercel.app/api/auth/google`. Chỗ nào cần URL tuyệt đối (thẻ `<a>`, redirect trình duyệt) sẽ ghi rõ đầy đủ.
- Đường dẫn màn hình (route Next.js) viết dạng `/profile/orders` — theo cấu trúc thật của repo FE.
- Số tiền có hậu tố `Vnd` luôn là **integer VND**, không phải số thập phân.

## Đọc nhanh

| Mức độ | Số lượng | Ý nghĩa |
| --- | --- | --- |
| 🔴 **Phải sửa** | 7 | Không sửa → FE hỏng hoặc hiển thị sai |
| 🟡 **Nên sửa** | 6 | Không sửa vẫn chạy, nhưng mất tính năng / hiển thị thiếu |
| 🟢 **Mới, tuỳ chọn** | 7 | Field/endpoint mới để làm tính năng mới |

**Không có endpoint nào bị xoá. Không có field nào bị xoá.** Toàn bộ response cũ giữ nguyên, chỉ thêm.

⚠️ **Một ngoại lệ duy nhất:** `user.phone` không bị xoá nhưng đổi từ **luôn có** sang **có thể vắng mặt** — xem [mục 16](#16--userphone-giờ-có-thể-không-có). Đây là thay đổi duy nhất có thể làm FE **crash** chứ không chỉ hiển thị thiếu.

> 📎 Phụ lục cuối tài liệu có sẵn **[type TypeScript để dán thẳng vào repo](#phụ-lục-a--type-typescript-cần-cập-nhật)** và **[danh sách file FE cần sửa kèm số dòng](#phụ-lục-b--điểm-chạm-đã-xác-minh-trong-repo-fe)**.

---

## 🔴 PHẢI SỬA

### 1. Enum `paymentStatus` có giá trị thứ 4: `no_payment_required`

```diff
- 'unpaid' | 'paid' | 'refunded'
+ 'unpaid' | 'paid' | 'refunded' | 'no_payment_required'
```

Xuất hiện khi **giảm giá phủ hết giá trị đơn** (đơn 0đ). Nghĩa là *đã tất toán, không phải thu tiền* — nhưng **cố ý không phải `paid`** để báo cáo doanh thu không tính 0đ là tiền đã thu.

**Cần làm:**
- Bổ sung nhãn hiển thị: gợi ý **"Không cần thanh toán"**, badge **xanh lá** (cùng tone `success` với `paid`).
- Rà mọi `switch`/`if`/ternary trên `paymentStatus`. Pattern `paymentStatus === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'` sẽ làm đơn 0đ hiện **sai** thành "Chưa thanh toán".
- Nút "Thanh toán ngay" phải ẩn với trạng thái này.

> 💡 Nếu thêm giá trị vào `PaymentStatus` trước, TypeScript sẽ **tự chỉ ra** mọi `Record<PaymentStatus, …>` còn thiếu key. Làm theo thứ tự đó để không sót chỗ nào.

---

### 2. Đơn 0đ KHÔNG còn `payosCheckoutUrl` và vào thẳng `confirmed`

Trước đây `POST /me/orders` với đơn online 0đ **ném lỗi 400** *"Order total is 0 VND after discounts - please pay in cash at the counter"*. Nay là luồng hợp lệ.

**Luồng mới:**

```
amount === 0  →  status: 'confirmed'
                 paymentStatus: 'no_payment_required'
                 payosCheckoutUrl: undefined   ← không có!
```

**Cần làm:** logic sau khi tạo đơn phải kiểm tra trước khi redirect:

```ts
// ❌ Sẽ redirect vào undefined với đơn 0đ
window.location.href = order.payosCheckoutUrl;

// ✅ Điều kiện dựa trên status, không dựa trên paymentMethod đã chọn
if (order.status === 'pending_payment' && order.payosCheckoutUrl) {
  window.location.href = order.payosCheckoutUrl;
} else {
  // Đơn đã confirmed (tiền mặt hoặc 0đ) → sang màn hình thành công
  router.push(`/profile/orders/${order.id}`);
}
```

> ⚠️ Điều kiện `paymentMethod === 'online' && order.payosCheckoutUrl` **không crash**, nhưng vẫn nên đổi sang kiểm tra `status`: khi đơn online 0đ rơi vào nhánh `else`, thông điệp "đang chuyển tới cổng thanh toán" bị bỏ qua đúng, nhưng ta mất khả năng phân biệt "đã confirmed" với "BE quên trả URL". Dựa vào `status` là nguồn sự thật duy nhất.

---

### 3. Enum `VoucherStatus` có 2 giá trị mới: `reserved`, `revoked`

```diff
- 'unused' | 'used' | 'expired'
+ 'unused' | 'reserved' | 'used' | 'expired' | 'revoked'
```

| Giá trị | Nghĩa | Gợi ý hiển thị |
| --- | --- | --- |
| `reserved` | Đang được giữ cho một đơn chưa hoàn tất của chính khách | "Đang dùng cho đơn #…" — **không** cho chọn lại |
| `revoked` | Admin đã thu hồi | "Đã thu hồi" + hiện `revokeReason` |

**Cần làm:**
- Tab/filter trong ví voucher: `reserved` nên nằm cùng nhóm "khả dụng" nhưng **disabled**, không phải nhóm "đã dùng".
- **Không gộp `revoked` vào `expired`** ở phía hiển thị — khách cần biết voucher bị thu hồi (kèm lý do) chứ không phải tự hết hạn.
- Với `reserved`, dùng `reservedOrderId` + `reservedUntil` ([mục 14.2](#142-voucherresponsedto--các-field-audit-khác)) để deep-link sang đơn đang giữ và hiện thời hạn giữ.

---

### 4. Định dạng mã voucher đã đổi — bỏ mọi regex validate cũ

```diff
- WASH-20260620-0001      (tuần tự, đoán được)
+ WASH-4KP9XM2A7B         (ngẫu nhiên CSPRNG, 10 ký tự sau dấu gạch)
```

Ngoài ra ô nhập mã giờ nhận **2 loại**:

| Loại | Dạng | Ví dụ |
| --- | --- | --- |
| Mã voucher đơn lẻ | `PREFIX-` + 10 ký tự | `WASH-4KP9XM2A7B` |
| **Mã chiến dịch** (`publicClaimCode`) | 3–20 ký tự `A-Z0-9`, không dấu gạch | `TET2026` |

**Cần làm:**
- **Xoá** mọi regex kiểu `/^[A-Z]+-\d{8}-\d{4}$/` trên ô nhập mã — sẽ chặn nhầm cả hai loại mã mới.
- Validate tối thiểu ở FE: chỉ `trim()` + `toUpperCase()`, để server quyết định. Server tự chuẩn hoá: bỏ khoảng trắng, viết hoa, **giữ dấu gạch ngang**.
- Rà cả **placeholder / text gợi ý** trong form admin — chỗ nào còn in mẫu `WASH-YYYYMMDD-0001` là đang dạy sai người dùng.
- Bảng chữ mã không chứa `I`, `L`, `O`, `U` (tránh nhìn nhầm 1/I/L, 0/O). Đừng tự sinh mã ở FE, nhưng nếu có ô "mã gợi ý" thì tuân theo bảng chữ này.

---

### 5. Mọi lỗi claim voucher trả CÙNG một thông báo — đừng branch theo message

Mã không tồn tại / đã bị người khác nhận / hết hạn / pool rỗng đều trả **cùng một câu** (chống dò mã):

```
404 → "Mã voucher không hợp lệ, đã được nhận, hoặc đã hết hạn"
```

Ngoại lệ có message riêng (`409`): đã nhận đủ số voucher của chương trình, hoặc chương trình không còn nhận người tham gia.

**Cần làm:** nếu FE đang so sánh chuỗi message để rẽ nhánh UI → bỏ, chỉ dựa vào HTTP status.

---

### 6. `POST /me/vouchers/claim` có rate limit riêng → phải xử lý `429`

**10 lần / 10 phút, tính theo tài khoản** (không phải IP).

```
429 → { statusCode: 429, message: "ThrottlerException: Too Many Requests" }
```

**Cần làm:** bắt `429` và hiện thông báo tử tế kiểu *"Bạn đã thử quá nhiều lần, vui lòng đợi ít phút"* thay vì hiện lỗi kỹ thuật. Đọc header `RateLimit-Reset` nếu muốn đếm ngược.

> Vì giới hạn tính **theo tài khoản**, nút "Nhận mã" nên tự disable sau lần thứ 10 trong phiên thay vì để user bấm tiếp rồi ăn lỗi.

---

## 🟡 NÊN SỬA

### 7. `/me/orders/preview` — dùng `invalidReasonCode` thay cho `voucherError`

`voucherError` **vẫn còn** (alias deprecated), nhưng nay có mã lỗi ổn định để rẽ nhánh.

**Trường hợp voucher bị từ chối:**

```jsonc
{
  // ... các field cũ giữ nguyên
  "voucherAccepted": false,
  "invalidReasonCode": "ORDER_BELOW_MINIMUM",
  "invalidReasonMessage": "Đơn tối thiểu 250.000đ để dùng voucher này (đơn hiện tại 200.000đ)",

  // breakdown mới, integer VND
  "eligibleAmountVnd": 200000,
  "promotionDiscountVnd": 20000,   // giờ vàng vẫn được áp
  "tierDiscountVnd": 16000,        // hạng Bạc 8% vẫn được áp
  "voucherDiscountVnd": 0          // ← 0 vì voucher bị từ chối
}
```

**Trường hợp voucher được chấp nhận:**

```jsonc
{
  "voucherAccepted": true,
  "invalidReasonCode": null,
  "eligibleAmountVnd": 300000,
  "promotionDiscountVnd": 30000,
  "tierDiscountVnd": 24000,
  "voucherDiscountVnd": 50000
}
```

**15 mã lỗi** — rất hữu ích cho UI vì mỗi mã ứng một hành động khác nhau:

| Code | Gợi ý UI |
| --- | --- |
| `ORDER_BELOW_MINIMUM` | "Thêm …đ nữa để dùng voucher" + gợi ý nâng gói |
| `TIER_NOT_ELIGIBLE` | 🔒 "Mở khoá ở hạng Vàng" → link sang màn hình hạng |
| `SERVICE_NOT_ELIGIBLE` | "Không áp dụng cho dịch vụ này" + gợi ý dịch vụ hợp lệ |
| `VEHICLE_NOT_ELIGIBLE` | "Không áp dụng cho loại xe này" |
| `VOUCHER_RESERVED` | "Đang dùng cho đơn khác của bạn" |
| `CAMPAIGN_BUDGET_EXCEEDED` | "Chương trình đã hết ngân sách" |
| `VOUCHER_EXPIRED` / `VOUCHER_REVOKED` / `VOUCHER_ALREADY_USED` | Trạng thái tương ứng |
| `CAMPAIGN_NOT_ACTIVE` / `VOUCHER_NOT_ACTIVE` | "Chưa tới ngày áp dụng" |
| `USAGE_LIMIT_REACHED` | "Đã dùng hết lượt" |
| `STACKING_NOT_ALLOWED` | "Không dùng chung ưu đãi khác" |
| `VOUCHER_NOT_FOUND` / `VOUCHER_NOT_OWNED` | Lỗi chung |

> ⚠️ **Voucher bị từ chối KHÔNG làm mất phần giảm giá còn lại** — khách vẫn được giờ vàng + hạng. Đừng hiện "không có ưu đãi nào" khi `voucherAccepted === false`; hãy hiện breakdown thật.

**Nhân tiện:** breakdown 3 thành phần cho phép hiện

```
Giờ vàng          −20.000đ
Hạng Bạc          −16.000đ
Voucher           −50.000đ
```

thay vì một cục "Giảm giá −86.000đ".

---

### 8. `POST /me/orders` có thể trả `409` mới

Voucher đang được đơn khác giữ hoặc vừa bị đơn khác dùng mất:

```
409 → "Voucher không còn khả dụng (đã được dùng hoặc đang giữ cho đơn khác)"
409 → "Voucher đang được dùng cho một đơn khác của bạn"
```

**Cần làm:** bắt `409`, tự refetch danh sách voucher rồi mời khách chọn lại — đừng để lỗi chung chung.

Ngoài ra `400` giờ có thể mang message từ reason code khi voucher không hợp lệ ở thời điểm submit, **dù preview đã pass** — trạng thái có thể đổi giữa hai lần gọi. Đừng coi "preview OK" là bảo đảm.

---

### 9. Bổ sung nhãn cho 10 loại notification mới

`NotificationTypeEnum` từ 5 → 15 giá trị. Loại chưa map sẽ render **trống/không icon**.

| Type mới | Gợi ý icon |
| --- | --- |
| `voucher_granted` | 🎁 |
| `voucher_claimed` | 🎟️ |
| `voucher_expiring` | ⏰ (đỏ, ưu tiên cao) |
| `voucher_used` | ✅ |
| `voucher_revoked` | ⚠️ |
| `tier_upgraded` | 🎉 (nên có animation chúc mừng) |
| `tier_near_upgrade` | 📈 |
| `voucher_milestone_near` | 🔥 |
| `loyalty_reset_warning` | ⏳ (ưu tiên cao) |
| `loyalty_reset_done` | 🔄 |

Mỗi notification có `data` chứa id liên quan (`voucherId`, `orderId`, `tierName`…) → dùng để deep-link.

> 💡 Dù map đủ 15 loại, vẫn nên có **nhánh fallback** cho type lạ (icon 🔔 + title thô). BE có thể thêm loại mới trước khi FE kịp deploy.

---

### 10. Admin — `GET /admin/vouchers/stats` đổi ý nghĩa

```diff
  { total, inPool, claimed, used, expired }
+ { total, inPool, claimed, reserved, used, expired, revoked }
```

⚠️ **`expired` nay KHÔNG còn bao gồm voucher bị thu hồi.** Trước đây revoke được ghi đè thành `expired` nên 2 chỉ số bị trộn. Nếu dashboard đang vẽ biểu đồ theo `expired` thì con số sẽ **giảm** sau khi deploy — đó là đúng, không phải bug.

6 nhóm loại trừ nhau và cộng lại đúng bằng `total`:

```
inPool + claimed + reserved + used + expired + revoked === total
```

> ❓ *Cần BE xác nhận:* bản gốc ghi "7 nhóm", nhưng response chỉ có 6 key ngoài `total`. Nếu `claimed` là **tổng luỹ kế** (bao gồm cả `used`) chứ không phải "đã nhận & chưa dùng" thì công thức trên sai — hỏi lại trước khi vẽ biểu đồ tròn.

---

### 11. Admin — `GET /admin/vouchers/batches` đã deprecated

Vẫn chạy (cho dữ liệu cũ) nhưng vẫn suy ra "lô" từ format mã — mà format mã đã đổi ([mục 4](#4-định-dạng-mã-voucher-đã-đổi--bỏ-mọi-regex-validate-cũ)), nên voucher mới sẽ **không gom lô đúng**. Dùng thay thế:

```
GET /admin/voucher-campaigns/:id/stats
```

---

## 🟢 MỚI — làm được tính năng gì

### 12. `GET /me/loyalty` — đủ dữ liệu cho màn hình gamification

Server tính sẵn, **FE không cần tự suy luật nghiệp vụ** từ danh sách tier nữa (bản sao đó hỏng ngay khi admin sửa một hạng):

```jsonc
{
  // cũ
  "tierName": "Silver", "pointsBalance": 320, "successfulWashesTowardVoucher": 3,

  // MỚI — tiến độ hạng
  "currentTierRank": 2,
  "nextTier": "Gold",
  "pointsToNextTier": 180,
  "progressPercent": 64,

  // MỚI — tiến độ voucher
  "washesRequiredForNextVoucher": 9,
  "washesRemainingForNextVoucher": 6,
  "estimatedNextVoucherVnd": 55000,

  // MỚI — trọn đời (không bị reset hàng năm)
  "lifetimePoints": 4320,
  "lifetimeSpendVnd": 8600000,
  "totalSavedVnd": 340000
}
```

**Map thẳng sang UI:**

| Field | Dùng cho |
| --- | --- |
| `progressPercent` + `nextTier` + `pointsToNextTier` | Thanh tiến độ hạng: *"Bạc · 320/500 · còn 180 điểm lên Vàng"* |
| `washesRemainingForNextVoucher` + `washesRequiredForNextVoucher` | Thẻ tem: `⬤⬤⬤○○○○○○🎁` *"Còn 6 lượt"* |
| `estimatedNextVoucherVnd` | *"Phần thưởng ước tính ~55.000đ"* — số này do **chính hàm sẽ mint voucher** tính ra, không phải ước lượng ở UI |
| `totalSavedVnd` | *"Năm nay bạn đã tiết kiệm 340.000đ"* |
| `lifetimePoints` | *"Bạn đã tích 4.320 điểm với chúng tôi"* — vẫn hiện đúng **sau khi reset hàng năm** |

> ⚠️ Ở hạng cao nhất, `nextTier` / `pointsToNextTier` sẽ vắng mặt hoặc `null` — render trạng thái "Bạn đang ở hạng cao nhất" thay vì thanh tiến độ 100%.

---

### 13. `GET /tier-configs` (public) — dựng bảng so sánh hạng trung thực

Mỗi tier nay trả thêm 9 trường quyền lợi:

```jsonc
{
  "tierName": "Gold", "discountPercent": 10, "bookingWindowDays": 14,
  "washesPerRewardVoucher": 8,        // Gold cần 8 lượt, None cần 10
  "voucherRewardMultiplier": 1.5,     // thưởng đậm hơn 50%
  "voucherRewardCeilVnd": 150000,
  "voucherExpiryDays": 180,           // hạn dài hơn
  "birthdayVoucherVnd": 100000,
  "exclusiveCampaignAccess": true,
  "voucherRewardRatePercent": 5, "voucherRewardFloorVnd": 30000,
  "minimumValidWashVnd": 40000
}
```

→ Vẽ được **bảng so sánh 4 hạng có ô khoá 🔒** mà không hardcode gì. Các hạng thực sự khác nhau nên bảng này có nội dung để hiển thị:

| | None | Bronze | Silver | Gold |
| --- | --- | --- | --- | --- |
| Giảm giá | 2% | 5% | 8% | **10%** |
| Lượt/voucher | 10 | 10 | 9 | **8** |
| Hệ số thưởng | 1.0 | 1.1 | 1.25 | **1.5** |
| Hạn voucher | 90 ngày | 90 | 120 | **180** |
| Quà sinh nhật | — | 30k | 50k | **100k** |

> Lưu ý: `birthdayVoucherVnd` và `exclusiveCampaignAccess` **đã có trong config nhưng backend chưa có logic dùng**. Có thể hiển thị như quyền lợi sắp có, hoặc tạm ẩn — đừng hứa với khách là đã chạy.
>
> Số trong bảng trên là **dữ liệu mẫu tại thời điểm viết**; admin sửa được. Luôn render từ API, đừng chép bảng này vào code.

---

### 14. Card voucher — campaign được **nhúng sẵn**, không cần gọi thêm

`GET /me/vouchers` trả về object `campaign` **ngay trong từng voucher**, nên màn hình ví render toàn bộ card từ **một request** thay vì một lượt gọi mỗi thẻ:

```jsonc
// GET /me/vouchers
[
  {
    "id": "...", "code": "TET2026-4KP9XM2A7B", "status": "unused",
    "discountCapVnd": 50000, "expiresAt": "2026-08-25T00:00:00.000Z",

    "campaign": {                          // ← MỚI, nhúng sẵn
      "id": "...",
      "title": "Giảm 50K mừng Tết 2026",
      "description": "Áp dụng cho mọi gói rửa xe.",
      "terms": "Không áp dụng cùng ưu đãi khác.",
      "imageUrl": "https://cdn.example.com/tet.png",
      "themeColor": "#E4572E",
      "status": "active",
      "benefitType": "fixed_amount",
      "discountValue": 50000,
      "discountCapVnd": null,
      "minOrderVnd": 150000,
      "validFrom": "...", "validUntil": "...",
      "stackingPolicy": "with_tier",
      "allowedTierIds": ["..."],           // rỗng = mọi hạng
      "applicableServiceTypeIds": ["..."], // rỗng = mọi dịch vụ
      "applicableVehicleTypeIds": []
    }
  }
]
```

Có mặt ở: `GET /me/vouchers`, `GET /me/vouchers/:id`, **`POST /me/vouchers/claim`** (để hiện card hoàn chỉnh ngay sau khi nhận), `GET /admin/vouchers`, `GET /admin/vouchers/:id`.

**Đủ để dựng card đầy đủ:**

| Field | Dùng cho |
| --- | --- |
| `title` + `imageUrl` + `themeColor` | Header card có ảnh + màu thương hiệu |
| `description` / `terms` | Mô tả + điều khoản (nút "Xem điều kiện") |
| `minOrderVnd` | Dòng *"Đơn từ 150.000đ"* |
| `allowedTierIds` | 🔒 *"Chỉ dành cho hạng Vàng"* — join với `/tier-configs` để lấy tên |
| `applicableServiceTypeIds` | *"Áp dụng gói Detailing"* — join với `/service-types` |
| `stackingPolicy` | Cảnh báo *"Không dùng chung ưu đãi khác"* khi ≠ `with_tier_and_promotion` |
| `campaign.status === 'paused'` | *"Chương trình tạm dừng"* thay vì để khách chọn rồi lỗi ở checkout |

**⚠️ `campaign` là optional** — vắng mặt với voucher cũ chưa backfill. Luôn kiểm tra trước khi đọc; fallback về `discountCapVnd` + `expiresAt` của chính voucher.

**⚠️ Mảng rỗng nghĩa là "áp dụng tất cả", KHÔNG phải "không áp dụng gì".** Đây là chỗ dễ code ngược:

```ts
// ❌ Sai: mảng rỗng bị hiểu thành "không hạng nào dùng được"
const tierLabel = campaign.allowedTierIds.map(nameOf).join(', ');

// ✅
const tierLabel = campaign.allowedTierIds.length === 0
  ? 'Mọi hạng thành viên'
  : campaign.allowedTierIds.map(nameOf).join(', ');
```

**Những field cố ý KHÔNG trả về** (nội bộ thương mại): `budgetVnd`, `redeemedVnd`, `redeemedCount`, `maxUsesTotal`, `publicClaimCode`, `createdBy`, `source`, `name`. Nếu cần cho màn hình admin thì dùng `GET /admin/voucher-campaigns/:id`.

#### 14.1. `GET /voucher-campaigns/:id` — public, cho deep-link

```
GET /voucher-campaigns/:id      (không cần auth)
```

Trả về đúng object `campaign` ở trên. Dùng khi cần trang chi tiết chương trình từ deep-link/QR mà chưa có voucher trong ví.

- Campaign `DRAFT` → **404** (chương trình đang soạn, không lộ ra ngoài)
- Campaign `PAUSED` → vẫn trả về, để UI giải thích được vì sao voucher tạm không dùng được

> Với màn hình ví, **đừng dùng endpoint này** — dùng `campaign` nhúng sẵn để tránh N+1.

#### 14.2. `VoucherResponseDto` — các field audit khác

```jsonc
{
  "id": "...", "code": "TET2026-4KP9XM2A7B", "status": "unused",
  "discountCapVnd": 50000, "expiresAt": "2026-08-25T00:00:00.000Z",

  // MỚI
  "campaignId": "...",           // → GET campaign để lấy title/description/image/terms
  "grantedSource": "campaign",   // loyalty_milestone | admin_grant | campaign | birthday | referral | winback | legacy
  "grantedAt": "...",
  "grantedReason": "Chiến dịch Tết 2026",   // giờ LUÔN có giá trị (trước đây luôn rỗng)
  "reservedOrderId": "...",      // khi status = reserved
  "reservedUntil": "...",
  "revokedAt": "...", "revokeReason": "..."  // khi status = revoked
}
```

Các field này bổ sung cho object `campaign` ở trên — dùng cho lịch sử/audit và cho badge `reserved`/`revoked` ([mục 3](#3-enum-voucherstatus-có-2-giá-trị-mới-reserved-revoked)), không phải để render card.

---

### 15. Admin — 8 endpoint quản lý chiến dịch

| Method | Path |
| --- | --- |
| POST | `/admin/voucher-campaigns` |
| GET | `/admin/voucher-campaigns` (query: `status`, `source`, `page`, `limit`) |
| GET | `/admin/voucher-campaigns/:id` |
| PATCH | `/admin/voucher-campaigns/:id` |
| POST | `/admin/voucher-campaigns/:id/activate` |
| POST | `/admin/voucher-campaigns/:id/pause` |
| POST | `/admin/voucher-campaigns/:id/end` |
| GET | `/admin/voucher-campaigns/:id/stats` |

**Form tạo campaign cần:** benefit type (3 lựa chọn), giá trị + trần, đơn tối thiểu, khung thời gian, **multi-select hạng/dịch vụ/loại xe** (bỏ trống = áp dụng tất cả), stacking policy, giới hạn lượt + ngân sách, mã claim công khai.

**Ràng buộc form (server enforce, FE nên chặn sớm):**

- `validFrom < validUntil`
- `percent_off`: giá trị 1–100; **chỉ loại này** mới được đặt `discountCapVnd`
- `free_service`: **bắt buộc** chọn ít nhất 1 dịch vụ
- `status` **không** sửa qua `PATCH` — dùng 3 nút activate/pause/end
- Campaign `ended` là bất biến (mọi nút sửa phải disable)

**Màn hình stats** có `countersInSync: false` → hiện cảnh báo "số liệu đang lệch, chạy job đối soát".

**DTO cũ cũng mở rộng:** `GrantVoucherAdminDto` + `BulkCreateVoucherDto` nhận thêm `reason`; bulk nhận thêm `campaignId`. `UpdateTierConfigDto` nhận thêm 9 trường kinh tế voucher ([mục 13](#13-get-tier-configs-public--dựng-bảng-so-sánh-hạng-trung-thực)).

---

## 🔐 ĐĂNG NHẬP / ĐĂNG KÝ BẰNG GOOGLE

### 16. 🔴 `user.phone` giờ có thể **không có**

```diff
- phone: string
+ phone?: string
```

Google **không bao giờ** trả về số điện thoại, nên tài khoản tạo bằng Google sinh ra với `phone` vắng mặt hoàn toàn (không phải chuỗi rỗng, không phải `null` — key không tồn tại trong JSON).

Xuất hiện ở **mọi nơi trả về user**: `AuthResponse.user` (login/register/google), `GET /me/profile`, `GET /admin/users`, `GET /admin/users/:id`.

**Cần làm:**

- Sửa type `User` phía FE → `phone?: string`. (Type của **form đăng ký** giữ `phone: string` — form đó vẫn bắt buộc nhập.)
- Rà mọi chỗ gọi thẳng lên `user.phone`. `user.phone.slice(0, 3)`, `user.phone.length`, `user.phone.trim()`, `user.phone.replace(…)` sẽ **ném lỗi runtime**, không phải hiện sai. Dùng `user.phone?.` hoặc `user.phone ?? ''`.
- Chỗ hiển thị: fallback **"Chưa cập nhật"** thay vì để trống.
- **Quan trọng nhất:** bắt user nhập số điện thoại **trước khi đặt lịch**. Thợ cần số để liên hệ. Gợi ý: sau khi đăng nhập Google lần đầu, nếu `!user.phone` thì đưa thẳng sang màn hình hoàn thiện hồ sơ.

Cập nhật số bằng endpoint đã có:

```
PATCH /me/profile
{ "phone": "0901234567" }
```

---

### 17. 🟢 Đăng nhập & đăng ký bằng Google

**Không có endpoint đăng ký riêng.** Lần đầu bấm nút → tự tạo tài khoản; các lần sau → đăng nhập. FE chỉ cần **một nút duy nhất**.

Tài khoản mới sinh ra: role `customer`, **email đã verified sẵn**, có avatar Google, **không có phone**, **không có mật khẩu**.

#### Cách A — SPA gửi `idToken` (khuyến nghị)

```
POST /auth/google
Content-Type: application/json

{ "idToken": "<google id_token>" }
```

Trả về **giống hệt `POST /auth/login`** → lưu token bằng đúng code cũ, không cần nhánh riêng:

```json
{ "accessToken": "...", "refreshToken": "...", "user": { ... } }
```

Với `@react-oauth/google`, `idToken` chính là `credentialResponse.credential`:

```tsx
<GoogleLogin
  onSuccess={async (res) => {
    const r = await fetch(`${API}/api/auth/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: res.credential }),
    });
    if (!r.ok) return handleError(await r.json());
    const auth = await r.json();
    saveTokens(auth);           // đúng hàm đang dùng cho /auth/login
    router.push(auth.user.phone ? '/' : '/profile?complete=phone');
  }}
/>
```

Nên dùng cách này: không có token nào đi qua thanh địa chỉ, và không cần thêm route mới.

#### Cách B — redirect qua trình duyệt

Dùng khi muốn một link "Đăng nhập với Google" thuần, không nhúng SDK Google.

```html
<!-- URL tuyệt đối tới BACKEND, không phải route Next.js -->
<a href="https://wash-auto.vercel.app/api/auth/google">Đăng nhập với Google</a>
```

> Phải là **điều hướng thật của trình duyệt** (thẻ `<a>` hoặc `window.location.href`). Gọi bằng `fetch`/`axios` sẽ **không** hoạt động — response là 302 sang domain Google, và CORS chặn.

Muốn quay về đúng trang cũ thì thêm `?redirect=`. Chỉ chấp nhận URL **cùng origin với `FRONTEND_URL`**; sai origin sẽ bị âm thầm thay bằng mặc định (vì URL này mang token, mở redirect tự do là tặng token cho người khác):

```
https://wash-auto.vercel.app/api/auth/google?redirect=https://wave-wash.vercel.app/dashboard
                └─ backend ─┘                            └──── frontend ────┘
```

FE cần thêm route mặc định **`/auth/google/callback`**. Token nằm ở **fragment (`#`)**, **không phải query (`?`)** — fragment không được gửi lên server nên refresh token không lọt vào access log của Vercel hay header `Referer`:

```js
// Trang /auth/google/callback
const p = new URLSearchParams(window.location.hash.slice(1));
const error = p.get('error');

if (error) {
  showError(error);
  router.replace('/login');
} else {
  saveTokens({
    accessToken: p.get('accessToken'),
    refreshToken: p.get('refreshToken'),
  });
  // Xoá token khỏi thanh địa chỉ ngay, đừng để nằm trong lịch sử duyệt web
  history.replaceState(null, '', window.location.pathname);
  router.replace('/');
}
```

Lỗi ở luồng này **luôn quay về `#error=<thông báo>`**, không bao giờ trả JSON — vì lúc đó trình duyệt đang điều hướng chứ không phải `fetch`.

#### Mã lỗi (cách A)

| Code | Khi nào | Hiện gì cho user |
| --- | --- | --- |
| `401` | Token sai/hết hạn, **email Google chưa verified**, hoặc tài khoản bị khoá | "Đăng nhập Google thất bại, thử lại" |
| `409` | Email này đã gắn với **một tài khoản Google khác** | "Email đã liên kết tài khoản Google khác, dùng email khác hoặc đăng nhập bằng mật khẩu" |
| `503` | Server chưa cấu hình `GOOGLE_*` | Ẩn nút Google đi |

---

### 18. 🟡 Hệ quả với các luồng đăng nhập đang có

Bốn điểm dễ bị bỏ sót:

**18.1. Trùng email → tự động gộp, không tạo tài khoản trùng.**
User đã đăng ký bằng mật khẩu, sau đó bấm nút Google với **cùng email** → vẫn vào **đúng tài khoản cũ** (giữ nguyên đơn hàng, voucher, điểm loyalty), và từ đó dùng được cả hai cách đăng nhập. FE không cần làm gì, nhưng đừng cảnh báo "email đã tồn tại".

**18.2. Tài khoản chỉ có Google mà đăng nhập bằng mật khẩu → `401 Invalid credentials`.**
Server **cố ý** trả cùng thông báo với trường hợp sai mật khẩu, để không lộ email nào đã đăng ký. Hệ quả: user quên mình đã dùng Google sẽ thấy "sai mật khẩu" và bối rối.

→ Ở màn hình login, khi gặp `401`, nên hiện thêm dòng gợi ý:
> *"Nếu bạn đăng ký bằng Google, hãy dùng nút Đăng nhập với Google."*

Không phải ngõ cụt: `POST /auth/forgot-password` **chạy được** trên tài khoản Google và là cách chính thức để đặt mật khẩu.

**18.3. `POST /me/profile/change-password` trên tài khoản Google-only → `400`.**
Message: *"This account signs in with Google and has no password yet - use forgot-password to set one"*.

→ Trong màn hình cài đặt: nếu tài khoản chưa có mật khẩu thì đổi form "Đổi mật khẩu" thành nút **"Đặt mật khẩu"** dẫn sang luồng forgot-password.

**18.4. Tài khoản Google mới không cần nhập OTP.**
`email_verified_at` được đóng dấu sẵn (Google đã xác minh hộ). Nếu FE có bước xác thực email, gọi `POST /auth/otp/send` sẽ trả luôn `{ message: 'Already verified', token }` mà **không gửi mail** → bỏ qua màn hình nhập OTP thay vì bắt user chờ mã không bao giờ tới. (Cửa sổ bỏ qua là 7 ngày, sau đó lại gửi OTP như thường.)

**Ảnh đại diện:** lấy từ Google khi tài khoản **chưa có** ảnh. User đã tự upload avatar thì **không bị ghi đè**.

---

## Còn thiếu / cần bàn

| Việc | Ghi chú |
| --- | --- |
| **`isCurrentlyUsable` trên voucher** | FE hiện phải tự đoán voucher có dùng được cho đơn đang xem không, hoặc gọi `/me/orders/preview`. Lý do chưa làm: "dùng được" phụ thuộc **đơn cụ thể** (dịch vụ, loại xe, giá trị), nên một cờ boolean trên voucher sẽ nói dối ở màn hình ví. Nếu chỉ cần "voucher này còn hạn & chưa dùng" thì `status` đã đủ. |
| **Tên hạng/dịch vụ trong `campaign`** | Trả về **id**, không phải tên — FE join với `/tier-configs` và `/service-types` (hai endpoint public app đã tải sẵn). Làm join phía backend sẽ tốn thêm 2 query mỗi lần đọc ví. |
| Voucher sinh nhật | Config đã có, **logic chưa có** (thiếu `date_of_birth` trên user) |
| Campaign độc quyền theo hạng | Cờ `exclusiveCampaignAccess` chưa nối vào eligibility (giới hạn hạng hiện làm qua `allowedTierIds` của campaign) |
| Hoàn tiền thật | `paymentStatus: 'refunded'` tồn tại nhưng chưa luồng nào set. Huỷ đơn đã trả tiền chỉ hoàn voucher |
| **Gỡ liên kết Google** | Chưa có endpoint. Đã gắn rồi thì không tự bỏ được — cần admin sửa DB. Chưa làm vì gỡ liên kết trên tài khoản **chưa có mật khẩu** sẽ khoá user ra ngoài vĩnh viễn, nên phải ép đặt mật khẩu trước; để dành khi thực sự cần |
| **Đăng nhập Google cho staff/admin** | Luồng Google **chỉ tạo tài khoản `customer`**. Staff/admin vẫn đăng nhập bằng mật khẩu. Nếu email staff trùng với Google của họ thì vẫn gộp được (mục 18.1) và giữ nguyên role cũ |
| **Số điện thoại từ Google** | Không lấy được. Google chỉ trả phone khi xin thêm scope `people.phonenumbers.read` **và** user đã điền số vào hồ sơ Google — phần lớn là không có, nên không đáng thêm scope |

---

## Câu hỏi cần backend xác nhận

| # | Câu hỏi | Vì sao quan trọng |
| --- | --- | --- |
| 1 | `/admin/vouchers/stats` có **6** hay **7** nhóm loại trừ nhau? `claimed` là "đã nhận & chưa dùng" hay tổng luỹ kế? | Sai thì biểu đồ tròn không khớp `total` ([mục 10](#10-admin--get-adminvouchersstats-đổi-ý-nghĩa)) |
| 2 | Ở hạng cao nhất, `nextTier` / `pointsToNextTier` / `progressPercent` trả `null`, `0`, hay vắng mặt? | Quyết định cách render thanh tiến độ ([mục 12](#12-get-meloyalty--đủ-dữ-liệu-cho-màn-hình-gamification)) |
| 3 | Khi `voucherAccepted === false`, `voucherDiscountVnd` chắc chắn là `0` chứ không phải "số lẽ ra được giảm"? | Nếu không, tổng breakdown sẽ lệch với số tiền phải trả ([mục 7](#7-meorderspreview--dùng-invalidreasoncode-thay-cho-vouchererror)) |
| 4 | `invalidReasonCode` khi voucher hợp lệ là `null` hay vắng mặt? | Ảnh hưởng type: `string \| null` vs `string \| undefined` |

---

## Phụ lục A — Type TypeScript cần cập nhật

Dán trực tiếp vào repo FE. Đây là **toàn bộ** thay đổi type do đợt refactor này.

```ts
// types/order.ts
export type PaymentStatus =
  | 'unpaid'
  | 'paid'
  | 'refunded'
  | 'no_payment_required';   // MỚI — đơn 0đ sau giảm giá

// types/voucher.ts
export type VoucherStatus =
  | 'unused'
  | 'reserved'   // MỚI — đang giữ cho một đơn chưa hoàn tất
  | 'used'
  | 'expired'
  | 'revoked';   // MỚI — admin thu hồi

export type VoucherGrantedSource =
  | 'loyalty_milestone' | 'admin_grant' | 'campaign'
  | 'birthday' | 'referral' | 'winback' | 'legacy';

export type CampaignBenefitType = 'fixed_amount' | 'percent_off' | 'free_service';
export type CampaignStatus = 'draft' | 'active' | 'paused' | 'ended';
export type StackingPolicy =
  | 'exclusive' | 'with_tier' | 'with_promotion' | 'with_tier_and_promotion';

export interface VoucherCampaign {
  id: string;
  title: string;
  description?: string;
  terms?: string;
  imageUrl?: string;
  themeColor?: string;
  status: CampaignStatus;
  benefitType: CampaignBenefitType;
  discountValue: number;
  discountCapVnd: number | null;
  minOrderVnd: number;
  validFrom: string;
  validUntil: string;
  stackingPolicy: StackingPolicy;
  /** Mảng RỖNG = áp dụng cho TẤT CẢ. Không phải "không áp dụng gì". */
  allowedTierIds: string[];
  applicableServiceTypeIds: string[];
  applicableVehicleTypeIds: string[];
}

export interface Voucher {
  // ... field cũ giữ nguyên
  status: VoucherStatus;
  /** Vắng mặt với voucher cũ chưa backfill — luôn kiểm tra trước khi đọc. */
  campaign?: VoucherCampaign;
  campaignId?: string;
  grantedSource?: VoucherGrantedSource;
  grantedAt?: string;
  grantedReason?: string;      // giờ LUÔN có giá trị
  reservedOrderId?: string;    // khi status = 'reserved'
  reservedUntil?: string;
  revokedAt?: string;          // khi status = 'revoked'
  revokeReason?: string;
}

// types/auth.ts
export type User = {
  // ... field cũ giữ nguyên
  phone?: string;   // ĐỔI: Google không trả phone → key có thể vắng mặt
};

// types/notification.ts
export type NotificationType =
  // 5 loại cũ
  | 'order_created' | 'wash_assigned' | 'wash_started'
  | 'wash_completed' | 'feedback_created'
  // 10 loại mới
  | 'voucher_granted' | 'voucher_claimed' | 'voucher_expiring'
  | 'voucher_used' | 'voucher_revoked'
  | 'tier_upgraded' | 'tier_near_upgrade' | 'voucher_milestone_near'
  | 'loyalty_reset_warning' | 'loyalty_reset_done';

// types/order.ts — preview response
export type VoucherInvalidReasonCode =
  | 'ORDER_BELOW_MINIMUM' | 'TIER_NOT_ELIGIBLE'
  | 'SERVICE_NOT_ELIGIBLE' | 'VEHICLE_NOT_ELIGIBLE'
  | 'VOUCHER_RESERVED' | 'CAMPAIGN_BUDGET_EXCEEDED'
  | 'VOUCHER_EXPIRED' | 'VOUCHER_REVOKED' | 'VOUCHER_ALREADY_USED'
  | 'CAMPAIGN_NOT_ACTIVE' | 'VOUCHER_NOT_ACTIVE'
  | 'USAGE_LIMIT_REACHED' | 'STACKING_NOT_ALLOWED'
  | 'VOUCHER_NOT_FOUND' | 'VOUCHER_NOT_OWNED';

export interface OrderPreviewResponse {
  // ... field cũ giữ nguyên
  voucherAccepted: boolean;
  invalidReasonCode?: VoucherInvalidReasonCode | null;
  invalidReasonMessage?: string;
  /** @deprecated dùng invalidReasonCode */
  voucherError?: string;
  eligibleAmountVnd: number;
  promotionDiscountVnd: number;
  tierDiscountVnd: number;
  voucherDiscountVnd: number;
}

// types/loyalty.ts
export interface LoyaltySummary {
  tierName: string;
  pointsBalance: number;
  successfulWashesTowardVoucher: number;
  currentTierRank: number;
  nextTier?: string | null;
  pointsToNextTier?: number | null;
  progressPercent: number;
  washesRequiredForNextVoucher: number;
  washesRemainingForNextVoucher: number;
  estimatedNextVoucherVnd: number;
  lifetimePoints: number;
  lifetimeSpendVnd: number;
  totalSavedVnd: number;
}
```

---

## Phụ lục B — Điểm chạm đã xác minh trong repo FE

Đã grep repo `WDP_SU26_FE` tại commit `c36dcd1`. Đây là chỗ thật cần sửa, không phải danh sách suy đoán.

### 🔴 Chắc chắn hỏng nếu không sửa

| File | Vấn đề |
| --- | --- |
| `types/order.ts:11` | `PaymentStatus` thiếu `no_payment_required` |
| `types/voucher.ts:3` | `VoucherStatus` thiếu `reserved`, `revoked` |
| `types/auth.ts:18` | `User.phone: string` → phải thành `phone?: string` |
| `types/notification.ts:1-6` | Mới có 5/15 loại notification |
| `constants/payment.ts:29-36` | `PAYMENT_STATUS_META` là `Record<PaymentStatus, …>` → **tsc sẽ báo lỗi ngay** khi mở rộng enum. Đó là điều tốt: sửa type trước, để compiler dẫn đường. |
| `app/(customer)/profile/orders/page.tsx:527` | Ternary `paymentStatus === 'paid'` → đơn 0đ hiện sai "Chưa thanh toán" |
| `app/admin/orders/page.tsx:39-40` | Map nhãn chỉ có `paid`/`unpaid` → đơn 0đ render trống |
| `app/(customer)/profile/page.tsx:161` | `formData.phone.replace(…)` — hiện an toàn nhờ `user.phone \|\| ''` ở dòng 40, nhưng sẽ hiện **chuỗi rỗng** thay vì "Chưa cập nhật" |

### 🟡 Nên sửa

| File | Vấn đề |
| --- | --- |
| `components/voucher/VoucherManagement.tsx:253` | Còn in mẫu mã cũ `WASH-YYYYMMDD-0001` cho admin — dạy sai định dạng ([mục 4](#4-định-dạng-mã-voucher-đã-đổi--bỏ-mọi-regex-validate-cũ)) |
| `app/(customer)/booking/page.tsx:391` | `paymentMethod === 'online' && payosCheckoutUrl` — **không crash**, nhưng nên đổi sang kiểm tra `status === 'pending_payment'` ([mục 2](#2-đơn-0đ-không-còn-payoscheckouturl-và-vào-thẳng-confirmed)) |
| `app/(customer)/booking/page.tsx:399-405` | `catch` chung một `toast.error` → chưa tách `409` ([mục 8](#8-post-meorders-có-thể-trả-409-mới)) |
| `app/(customer)/profile/my-voucher/page.tsx:144` | ✅ Đã `trim().toUpperCase()` đúng chuẩn. Chỉ cần thêm nhánh bắt `429` ([mục 6](#6-post-mevouchersclaim-có-rate-limit-riêng--phải-xử-lý-429)) |
| `app/(customer)/profile/orders/[id]/page.tsx:494` | `paymentStatus === 'paid' \|\| isFree` — cờ `isFree` là workaround; thay bằng `no_payment_required` |

### ✅ Không cần sửa

- `app/(customer)/profile/orders/[id]/page.tsx:282` và `app/(customer)/profile/orders/page.tsx:546` — đã guard `status === 'pending_payment' && payosCheckoutUrl`, đúng chuẩn mục 2.
- `schemas/auth.ts:30,60` — regex số điện thoại VN, **không liên quan** tới mã voucher, giữ nguyên.
- `types/auth.ts:5` (`UserRegister.phone`) — form đăng ký thường vẫn bắt buộc nhập, giữ `string`.

---

## Checklist bàn giao

**Bước 0 — làm trước tiên, compiler sẽ dẫn đường phần còn lại**

- [ ] Cập nhật toàn bộ type ở [Phụ lục A](#phụ-lục-a--type-typescript-cần-cập-nhật)
- [ ] Chạy `pnpm tsc --noEmit` → sửa hết chỗ compiler chỉ ra

**🔴 Phải sửa**

- [ ] Nhãn + badge cho `no_payment_required`, ẩn nút "Thanh toán ngay"
- [ ] Đổi điều kiện redirect PayOS sang kiểm tra `order.status`
- [ ] Filter + badge cho `reserved` / `revoked` trong ví voucher
- [ ] Xoá regex mã voucher cũ + sửa placeholder `WASH-YYYYMMDD-0001` ở form admin
- [ ] Bắt `429` ở màn hình nhập mã
- [ ] Bắt `409` ở màn hình tạo đơn (kèm refetch voucher)
- [ ] `phone?: string` — rà hết `user.phone.` (nguy cơ crash) + fallback "Chưa cập nhật"

**🟡 Nên sửa**

- [ ] Chuyển sang `invalidReasonCode`, hiện breakdown 3 thành phần
- [ ] Giữ nguyên phần giảm giá khác khi `voucherAccepted === false`
- [ ] Map 10 notification type mới + nhánh fallback cho type lạ
- [ ] Dashboard admin: tách `revoked` khỏi `expired`
- [ ] Bỏ `GET /admin/vouchers/batches`, chuyển sang `/admin/voucher-campaigns/:id/stats`
- [ ] Ép nhập số điện thoại trước khi đặt lịch (`PATCH /me/profile`)

**🟢 Tính năng mới**

- [ ] Màn hình loyalty: dùng 10 field gamification mới
- [ ] Bảng so sánh hạng dựng từ `/tier-configs`
- [ ] Card voucher: dùng `voucher.campaign` nhúng sẵn (ảnh, điều khoản, đơn tối thiểu)
- [ ] ⚠️ Nhớ: mảng eligibility **RỖNG = "áp dụng tất cả"**
- [ ] Admin: màn hình quản lý campaign (8 endpoint)
- [ ] Trang public chi tiết campaign cho deep-link/QR

**🔐 Đăng nhập Google**

- [ ] Thêm nút "Đăng nhập với Google" (`POST /auth/google` + `idToken`)
- [ ] Bắt `409` (email đã gắn tài khoản Google khác) và `503` (chưa cấu hình → ẩn nút)
- [ ] Sau đăng nhập, nếu `!user.phone` → chuyển sang màn hình hoàn thiện hồ sơ
- [ ] Màn hình login: khi `401` thì gợi ý "có thể bạn đã đăng ký bằng Google"
- [ ] Màn hình cài đặt: tài khoản chưa có mật khẩu → đổi thành nút "Đặt mật khẩu"
- [ ] Bỏ qua bước OTP khi `POST /auth/otp/send` trả `Already verified`
- [ ] *(Chỉ nếu dùng luồng redirect)* route `/auth/google/callback`, đọc `window.location.hash`, xoá hash sau khi đọc
