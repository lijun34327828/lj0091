import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  Receipt,
  Lock,
  Settings,
  ChevronLeft,
  ChevronRight,
  Store,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavItem {
  to: string;
  icon: React.ElementType;
  label: string;
}

const sorterNav: NavItem[] = [
  { to: '/sorter', icon: Package, label: '订单列表' },
];

const adminNav: NavItem[] = [
  { to: '/admin', icon: LayoutDashboard, label: '仪表盘' },
  { to: '/admin/transactions', icon: Receipt, label: '交易记录' },
  { to: '/admin/locked', icon: Lock, label: '锁定订单' },
  { to: '/admin/pricing', icon: Settings, label: '费率配置' },
];

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const isAdmin = location.pathname.startsWith('/admin');

  const navItems = isAdmin ? adminNav : sorterNav;

  return (
    <aside
      className={cn(
        'flex h-screen flex-col border-r border-slate-200 bg-white transition-all duration-200',
        collapsed ? 'w-16' : 'w-56'
      )}
    >
      <div className="flex h-14 items-center border-b border-slate-200 px-4">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <Store className="h-5 w-5 text-primary-700" />
            <span className="text-sm font-semibold text-slate-800">
              {isAdmin ? '管理后台' : '分拣中心'}
            </span>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === '/sorter' || item.to === '/admin'}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-primary-50 text-primary-700'
                  : 'text-slate-600 hover:bg-slate-50 hover:text-slate-800',
                collapsed && 'justify-center px-2'
              )
            }
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {!collapsed && <span>{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-slate-200 p-2">
        <NavLink
          to="/"
          className={cn(
            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-800',
            collapsed && 'justify-center px-2'
          )}
        >
          <Store className="h-4 w-4 shrink-0" />
          {!collapsed && <span>取货入口</span>}
        </NavLink>
      </div>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex h-10 w-full items-center justify-center border-t border-slate-200 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
      >
        {collapsed ? (
          <ChevronRight className="h-4 w-4" />
        ) : (
          <ChevronLeft className="h-4 w-4" />
        )}
      </button>
    </aside>
  );
}
