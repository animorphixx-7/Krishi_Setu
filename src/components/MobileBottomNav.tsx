import { Link, useLocation } from "react-router-dom";
import { Tractor, CalendarCheck, TrendingUp, CloudSun, MessageCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/equipment", label: "Equipment", icon: Tractor },
  { to: "/my-bookings", label: "Bookings", icon: CalendarCheck },
  { to: "/market-prices", label: "Prices", icon: TrendingUp },
  { to: "/weather", label: "Weather", icon: CloudSun },
  { to: "/community", label: "Chat", icon: MessageCircle },
];

const MobileBottomNav = () => {
  const location = useLocation();
  const { pathname, search } = location;
  const [pulseKey, setPulseKey] = useState(0);

  // Trigger a brief visual confirmation whenever the URL changes,
  // including query-param-only changes (e.g. ?date=...).
  useEffect(() => {
    setPulseKey((k) => k + 1);
  }, [pathname, search]);

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
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 min-h-[56px] px-1 py-2 text-[11px] font-medium select-none touch-manipulation",
                  "transition-all duration-150 ease-out",
                  "active:scale-95 active:bg-primary/10",
                  "hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                style={{ WebkitTapHighlightColor: "transparent" }}
              >
                {/* Top accent bar shown on active tab */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute top-0 left-1/2 -translate-x-1/2 h-0.5 rounded-full bg-primary transition-all duration-300",
                    active ? "w-8 opacity-100" : "w-0 opacity-0"
                  )}
                />
                <Icon
                  key={active ? `active-${pulseKey}` : "idle"}
                  aria-hidden="true"
                  className={cn(
                    "h-5 w-5 transition-transform duration-300",
                    active ? "scale-110 animate-in zoom-in-75 fade-in" : "scale-100"
                  )}
                />
                <span
                  className={cn(
                    "transition-all duration-200",
                    active ? "font-semibold tracking-wide" : "font-medium"
                  )}
                >
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default MobileBottomNav;
