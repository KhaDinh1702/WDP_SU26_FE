'use client';

import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { VoucherCampaignManagement } from '@/components/voucher/VoucherCampaignManagement';

export default function AdminVoucherCampaignsPage() {
  return (
    <>
      <AdminTopbar
        title='Chiến dịch ưu đãi'
        subtitle='Chương trình khuyến mãi hiển thị cho khách ở trang Ưu đãi'
      />
      <VoucherCampaignManagement />
    </>
  );
}
