import { Navbar } from '@/components/home/Navbar';
import ProfileSidebar from '@/components/profile/ProfileSidebar';

// Bảo vệ route do app/(customer)/layout.tsx lo (ProtectedRoute allowedRoles=['customer']).
export default function ProfileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className='min-h-screen bg-muted/30 transition-colors duration-300'>
      <Navbar />
      <div className='mx-auto max-w-[1440px] px-4 pb-12 pt-20 sm:px-6 lg:px-8 lg:pb-16 lg:pt-24'>
        <div className='grid grid-cols-1 gap-6 md:grid-cols-[220px_minmax(0,1fr)] lg:gap-10 xl:grid-cols-[240px_minmax(0,1fr)]'>
          {/* Sidebar */}
          <aside className='min-w-0 md:sticky md:top-24 md:self-start'>
            <ProfileSidebar />
          </aside>

          {/* Main Content */}
          <main className='min-w-0'>{children}</main>
        </div>
      </div>
    </div>
  );
}
