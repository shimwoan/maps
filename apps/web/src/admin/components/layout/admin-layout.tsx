import { Sidebar } from './sidebar';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <div className="tw-min-h-screen tw-bg-gray-50">
      <Sidebar />
      <div className="lg:tw-pl-64">
        <main className="tw-pt-16 tw-pb-6 tw-px-4 sm:tw-px-6 lg:tw-pt-6 lg:tw-px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
