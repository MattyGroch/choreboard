import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  CheckSquare,
  ListTodo,
  Gift,
  Star,
  ShoppingBag,
  BookOpen,
  SlidersHorizontal,
  LogOut,
  PlusCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import clsx from 'clsx';

const nav = [
  { to: 'overview', label: 'Overview', icon: LayoutDashboard },
  { to: 'children', label: 'Children', icon: Users },
  { to: 'chores', label: 'Chores', icon: CheckSquare },
  { to: 'chore-templates', label: 'Chore Templates', icon: ListTodo },
  { to: 'bounties', label: 'Bounties', icon: Star },
  { to: 'prizes', label: 'Prize Shop', icon: Gift },
  { to: 'prize-requests', label: 'Prize Requests', icon: ShoppingBag },
  { to: 'ledger', label: 'Ledger', icon: BookOpen },
  { to: 'adjustments', label: 'Adjustments', icon: PlusCircle },
  { to: 'settings', label: 'Settings', icon: SlidersHorizontal },
];

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/admin/login');
  };

  return (
    <div className="flex h-screen bg-slate-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-slate-900 border-r border-slate-800 flex flex-col">
        <div className="px-4 py-5 border-b border-slate-800">
          <span className="text-xl font-bold text-indigo-400">ChoreBoard</span>
          <p className="text-xs text-slate-500 mt-0.5">Admin Panel</p>
        </div>

        <nav className="flex-1 py-3 overflow-y-auto">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors',
                  isActive
                    ? 'bg-indigo-600/20 text-indigo-400 font-medium'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                )
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-slate-800">
          <p className="text-xs text-slate-500 mb-2">{user?.name}</p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors"
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto bg-slate-950">
        <Outlet />
      </main>
    </div>
  );
}
