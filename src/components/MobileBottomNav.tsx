import { Link, useLocation } from "react-router-dom";
import { Tractor, CalendarCheck, TrendingUp, CloudSun, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/equipment", label: "Equipment", icon: Tractor },
  { to: "/my-bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/market-prices", label: "Prices", icon: TrendingUp },
  { to: "/weather", label: "Weather", icon: CloudSun },
  { to: "/community", label: "Chat", icon: MessageCircle },
];

const MobileBottomNav = () => {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Primary mobile"
      className="md:hidden fixed bottom-0 inset-x-0 z-50 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 pb-[env(safe-area-inset-bottom)]"
    >
      <ul className="grid grid-cols-5">
        {tabs.map(({ to, label, icon: Icon }) => {
          const active =
            pathname === to ||
            pathname === `${to}/` ||
            pathname.startsWith(`${to}/`);
          return (
            <li key={to}>
              <Link
                to={to}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 text-[11px] font-medium transition-colors",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon className={cn("h-5 w-5", active && "scale-110")} aria-hidden="true" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
