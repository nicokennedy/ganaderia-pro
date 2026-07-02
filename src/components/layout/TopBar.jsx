import { Bell, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import NotificationsDropdown from "@/components/layout/NotificationsDropdown";
import GlobalSearch from "@/components/layout/GlobalSearch";

export default function TopBar() {
  const today = new Date().toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <header className="h-16 bg-card border-b border-border flex items-center justify-between px-4 md:px-6 sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex md:hidden items-center gap-2">
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <span className="text-xs">🐄</span>
          </div>
          <span className="font-bold text-foreground text-base hidden sm:inline">GanaderíaPro</span>
        </div>
        <p className="hidden md:block text-sm text-muted-foreground capitalize">{today}</p>
      </div>

      <div className="flex-1 px-3 md:px-6 min-w-0">
        <GlobalSearch />
      </div>

      <div className="flex items-center gap-2">
        <Link to="/eventos/nuevo">
          <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 h-8">
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs font-semibold">Nuevo Evento</span>
            <span className="sm:hidden text-xs font-semibold">+</span>
          </Button>
        </Link>
        <div className="relative">
          <button
            onClick={() => setShowNotifications(v => !v)}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-secondary relative text-muted-foreground hover:text-foreground transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
          </button>
          {showNotifications && <NotificationsDropdown onClose={() => setShowNotifications(false)} />}
        </div>
      </div>
    </header>
  );
}
