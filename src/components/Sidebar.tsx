import { NavLink, useLocation } from 'react-router-dom';
import {
  Leaf,
  FlaskConical,
  Ruler,
  FileText,
  BookOpen,
} from 'lucide-react';

const navItems = [
  { path: '/materials', label: '原料录入', icon: Leaf },
  { path: '/mixture', label: '纸浆配比', icon: FlaskConical },
  { path: '/thickness', label: '抄纸厚薄', icon: Ruler },
  { path: '/archives', label: '工艺档案', icon: FileText },
  { path: '/formulas', label: '配方库', icon: BookOpen },
];

export default function Sidebar() {
  const location = useLocation();

  return (
    <aside className="w-64 bg-xuan-paper/80 backdrop-blur-md border-r border-gilt-gold/20 h-screen fixed left-0 top-0 flex flex-col">
      <div className="p-6 border-b border-gilt-gold/20">
        <h1 className="text-xl font-bold font-serif-cn text-ink-black">
          传统手工造纸
        </h1>
        <p className="text-sm text-ash-gray mt-1">抄纸生产力系统</p>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`nav-item ${isActive ? 'active' : ''}`}
            >
              <Icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gilt-gold/20">
        <div className="text-xs text-ash-gray text-center">
          <p>传承千年工艺</p>
          <p className="mt-1">数字化匠心</p>
        </div>
      </div>
    </aside>
  );
}
