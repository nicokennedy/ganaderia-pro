import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, MapPin, DollarSign, Calendar, 
  BarChart2, Settings, User, Menu, ChevronRight, Milk, Shield, Syringe, Pill
} from "lucide-react";
import { cn } from "@/lib/utils";
import CowIcon from "@/components/icons/CowIcon.jsx";
import { useAuth } from "@/lib/AuthContext";
import { isPlatformAdmin } from "@/lib/platform-admins";

const navItems = [
  { path: "/", icon: LayoutDashboard, label: "Inicio" },
  { path: "/ganado", icon: CowIcon, label: "Ganado" },
  { path: "/potreros", icon: MapPin, label: "Potreros" },
  { path: "/finanzas", icon: DollarSign, label: "Finanzas" },
  { path: "/calendario", icon: Calendar, label: "Calendario" },
  { path: "/reportes", icon: BarChart2, label: "Reportes" },
  { path: "/registro-leche", icon: Milk, label: "Reg. Lechero" },
  { path: "/inventario-ia", icon: Syringe, label: "Inventario IA" },
  { path: "/inventario-medicinas", icon: Pill, label: "Medicinas" },
  { path: "/configuracion", icon: Settings, label: "Configuración" },
  { path: "/perfil", icon: User, label: "Perfil" },
];

export default function Sidebar({ collapsed, setCollapsed }) {
  const location = useLocation();
  const { user } = useAuth();
const items = isPlatformAdmin(user)
  ? [...navItems, { path: "/admin", icon: Shield, label: "Admin" }]
  : navItems;

  return (
    <aside className={cn(
      "hidden md:flex flex-col h-screen sticky top-0 bg-sidebar transition-all duration-300 z-30",
      collapsed ? "w-16" : "w-64"
    )}>
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 px-4 border-b border-sidebar-border",
        collapsed ? "justify-center" : "justify-between"
      )}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <span className="text-white text-sm">🐄</span>
            </div>
            <span className="text-white font-bold text-lg">GanaderíaPro</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-sm">🐄</span>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-sidebar-foreground hover:text-white p-1 rounded ml-2"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-hide">
        {items.map((item) => {
          const active = location.pathname === item.path;
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-4 py-3 mx-2 rounded-lg transition-all duration-200",
                active
                  ? "bg-sidebar-primary text-white"
                  : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-white"
              )}
              title={collapsed ? item.label : undefined}
            >
              {Icon ? (
                <Icon className={cn("w-5 h-5 flex-shrink-0")} />
              ) : (
                <span className="w-5 h-5 flex-shrink-0 text-center text-base leading-5">{item.emoji}</span>
              )}
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="p-4 border-t border-sidebar-border">
          <p className="text-sidebar-foreground text-xs opacity-60">GanaderíaPro V1.0</p>
          <p className="text-sidebar-foreground text-xs opacity-40">Ecuador 🇪🇨</p>
        </div>
      )}
    </aside>
  );
}
