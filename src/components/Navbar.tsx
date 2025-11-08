import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Tractor, User, LogOut, Menu } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const Navbar = () => {
  const { user, userRole, signOut } = useAuth();

  const navLinks = [
    { to: "/", label: "Home" },
    { to: "/equipment", label: "Equipment" },
    { to: "/market-prices", label: "Market Prices" },
    { to: "/weather", label: "Weather" },
    { to: "/helpline", label: "Helpline" },
  ];

  const NavLinks = () => (
    <>
      {navLinks.map((link) => (
        <Link key={link.to} to={link.to}>
          <Button variant="ghost" className="text-foreground hover:text-primary">
            {link.label}
          </Button>
        </Link>
      ))}
      {user && userRole === "admin" && (
        <Link to="/admin">
          <Button variant="ghost" className="text-foreground hover:text-primary">
            Admin
          </Button>
        </Link>
      )}
      {user && (userRole === "equipment_owner" || userRole === "admin") && (
        <Link to="/my-equipment">
          <Button variant="ghost" className="text-foreground hover:text-primary">
            My Equipment
          </Button>
        </Link>
      )}
      {user && (
        <Link to="/my-bookings">
          <Button variant="ghost" className="text-foreground hover:text-primary">
            My Bookings
          </Button>
        </Link>
      )}
    </>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <Tractor className="h-8 w-8 text-primary" />
          <span className="text-xl font-bold text-primary">Krishi Setu</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-1">
          <NavLinks />
        </div>

        {/* User Menu / Auth Buttons */}
        <div className="flex items-center space-x-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <User className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <Link to="/profile" className="cursor-pointer">
                    <User className="mr-2 h-4 w-4" />
                    Profile
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={signOut} className="cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link to="/auth">
              <Button variant="default">Login</Button>
            </Link>
          )}

          {/* Mobile Menu */}
          <Sheet>
            <SheetTrigger asChild className="md:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <div className="flex flex-col space-y-4 mt-8">
                <NavLinks />
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
