import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, FileText, Send, LogOut, Menu, X, Home } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Button } from '../ui/button';
import { useState } from 'react';

const navigation = [
  { name: '대시보드', href: '/admin', icon: LayoutDashboard },
  { name: '프로필 관리', href: '/admin/profiles', icon: Users },
  { name: '의뢰 관리', href: '/admin/requests', icon: FileText },
  { name: '지원 관리', href: '/admin/applications', icon: Send },
];

export function Sidebar() {
  const location = useLocation();
  const { logout } = useAdminAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const NavContent = () => (
    <div className="tw-flex tw-flex-col tw-h-full">
      <div className="tw-flex tw-h-16 tw-shrink-0 tw-items-center tw-px-6">
        
      </div>
      <nav className="tw-flex tw-flex-1 tw-flex-col tw-px-4 tw-py-4">
        <ul className="tw-flex tw-flex-col tw-gap-1">
          {navigation.map((item) => {
            const isActive = location.pathname === item.href ||
              (item.href !== '/admin' && location.pathname.startsWith(item.href));
            return (
              <li key={item.name}>
                <Link
                  to={item.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    'tw-flex tw-items-center tw-gap-3 tw-rounded-lg tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-transition-colors',
                    isActive
                      ? 'tw-bg-white/10 tw-text-white'
                      : 'tw-text-gray-300 hover:tw-bg-white/5 hover:tw-text-white'
                  )}
                >
                  <item.icon className="tw-h-5 tw-w-5" />
                  {item.name}
                </Link>
              </li>
            );
          })}
        </ul>
        <div className="tw-mt-auto tw-pt-4 tw-border-t tw-border-white/10">
          <Link
            to="/"
            onClick={() => setMobileOpen(false)}
            className="tw-flex tw-items-center tw-gap-3 tw-rounded-lg tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-text-gray-300 tw-transition-colors hover:tw-bg-white/5 hover:tw-text-white tw-mb-2"
          >
            <Home className="tw-h-5 tw-w-5" />
            메인으로
          </Link>
          <button
            onClick={logout}
            className="tw-flex tw-w-full tw-items-center tw-gap-3 tw-rounded-lg tw-px-3 tw-py-2 tw-text-sm tw-font-medium tw-bg-transparent tw-border-0 tw-text-gray-300 tw-transition-colors tw-cursor-pointer hover:tw-bg-white/10 hover:tw-text-white"
          >
            <LogOut className="tw-h-5 tw-w-5" />
            로그아웃
          </button>
        </div>
      </nav>
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="tw-fixed tw-top-4 tw-left-4 tw-z-50 lg:tw-hidden">
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="tw-flex tw-items-center tw-justify-center tw-h-10 tw-w-10 tw-bg-white tw-rounded-lg tw-shadow-md tw-border-0 tw-cursor-pointer hover:tw-bg-gray-50 tw-transition-colors"
        >
          {mobileOpen ? <X className="tw-h-5 tw-w-5 tw-text-gray-700" /> : <Menu className="tw-h-5 tw-w-5 tw-text-gray-700" />}
        </button>
      </div>

      {/* Mobile sidebar */}
      {mobileOpen && (
        <div className="tw-fixed tw-inset-0 tw-z-40 lg:tw-hidden">
          <div className="tw-fixed tw-inset-0 tw-bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="tw-fixed tw-inset-y-0 tw-left-0 tw-w-64 tw-bg-gray-900 tw-flex tw-flex-col">
            <NavContent />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="tw-hidden lg:tw-fixed lg:tw-inset-y-0 lg:tw-flex lg:tw-w-64 lg:tw-flex-col tw-bg-gray-900">
        <NavContent />
      </div>
    </>
  );
}
