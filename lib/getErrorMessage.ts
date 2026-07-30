import axios from 'axios';
import { ApiErrorResponse } from '@/types/error';

/**
 * Chuyển một lỗi bất kỳ (axios/Error/unknown) thành thông điệp thân thiện
 * tiếng Việt để hiển thị cho người dùng. Dùng chung toàn app.
 */
export function getErrorMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    if (!error.response) {
      return 'Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng và thử lại.';
    }

    const serverMessage = error.response.data?.message;

    if (serverMessage && isUserFriendlyMessage(serverMessage)) {
      return serverMessage;
    }

    switch (error.response.status) {
      case 400:
        return 'Thông tin gửi lên chưa hợp lệ. Vui lòng kiểm tra lại.';
      case 401:
        return 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn.';
      case 403:
        return 'Bạn không có quyền thực hiện thao tác này.';
      case 404:
        return 'Không tìm thấy dữ liệu cần xử lý.';
      case 409:
        return 'Dữ liệu đã tồn tại hoặc đang bị trùng. Vui lòng kiểm tra lại.';
      case 422:
        return 'Một vài trường thông tin chưa đúng. Vui lòng kiểm tra lại.';
      default:
        return 'Có lỗi xảy ra từ hệ thống. Vui lòng thử lại sau.';
    }
  }

  if (error instanceof Error) {
    return isUserFriendlyMessage(error.message)
      ? error.message
      : 'Có lỗi xảy ra. Vui lòng thử lại.';
  }

  return 'Có lỗi xảy ra. Vui lòng thử lại.';
}

/**
 * Message thô do BE trả về, KHÔNG lọc/dịch gì.
 *
 * Dùng khi màn hình cần nhận ra một lỗi nghiệp vụ cụ thể để nói rõ hơn câu
 * chung của `getErrorMessage` — vì BE trả nhiều lỗi nghiệp vụ bằng tiếng Anh
 * kỹ thuật (vd "Reschedule limit reached (2)") và những message đó bị
 * `isUserFriendlyMessage` loại. Chỉ so khớp, đừng đem thẳng ra UI.
 */
export function getRawServerMessage(error: unknown): string {
  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    return error.response?.data?.message ?? '';
  }
  return '';
}

function isUserFriendlyMessage(message: string): boolean {
  if (message.length > 140) return false;
  if (
    /(exception|stack|sql|jwt|token|undefined|null|\{|\}|<|>)/i.test(message)
  ) {
    return false;
  }
  // BE trả lẫn message tiếng Anh kỹ thuật ("Work order can only be created...").
  // Message dành cho người dùng của app này luôn là tiếng Việt có dấu — không
  // có dấu thì coi như message kỹ thuật và dùng câu fallback theo status.
  return /[àáảãạăằắẳẵặâầấẩẫậđèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵ]/i.test(
    message,
  );
}
