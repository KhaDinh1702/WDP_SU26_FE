'use client';

import { AdminTopbar } from '@/components/admin/AdminTopbar';
import { WasherStatusBoard } from '@/components/washers/WasherStatusBoard';

export default function AdminWashersPage() {
  return (
    <>
      <AdminTopbar
        title='Giám sát thợ rửa xe'
        subtitle='Ai đang rửa xe nào, ai rảnh, ai trong ca — tự cập nhật liên tục'
      />
      <main className='flex-1 overflow-y-auto bg-muted/30 p-4 sm:p-6 lg:p-8'>
        <div className='mx-auto flex max-w-7xl flex-col gap-5'>
          <WasherStatusBoard />
        </div>
      </main>
    </>
  );
}
