import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Building2, LogOut, Settings, User, Menu, X, ShieldCheck } from "lucide-react";
import { useState } from "react";

export function Navbar() {
  const { user, profile, signOut, hasRole } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isAdmin = hasRole("admin");

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div className="hidden sm:block">
              <span className="font-display text-lg font-bold text-foreground">
                TaxAudit
              </span>
              <span className="ml-1 text-xs text-muted-foreground">Uganda</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            {user && (
              <>
                <Link
                  to="/dashboard"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Dashboard
                </Link>
                <Link
                  to="/businesses"
                  className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  Businesses
                </Link>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <ShieldCheck className="h-4 w-4" />
                    Admin
                  </Link>
                )}
              </>
            )}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      className="relative h-9 w-9 rounded-full"
                    >
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-primary text-primary-foreground text-sm font-medium">
                          {profile?.name ? getInitials(profile.name) : "U"}
                        </AvatarFallback>
                      </Avatar>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56" align="end" forceMount>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">
                          {profile?.name || "User"}
                        </p>
                        <p className="text-xs leading-none text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate("/profile")}>
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                      <Settings className="mr-2 h-4 w-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut}>
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile menu button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="md:hidden"
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                >
                  {mobileMenuOpen ? (
                    <X className="h-5 w-5" />
                  ) : (
                    <Menu className="h-5 w-5" />
                  )}
                </Button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Button variant="ghost" asChild>
                  <Link to="/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link to="/register">Get Started</Link>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && user && (
          <div className="md:hidden border-t border-border py-4 animate-fade-in">
            <div className="flex flex-col space-y-2">
              <Link
                to="/dashboard"
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <Link
                to="/businesses"
                className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
                onClick={() => setMobileMenuOpen(false)}
              >
                Businesses
              </Link>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors flex items-center gap-2"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <ShieldCheck className="h-4 w-4" />
                  Admin
                </Link>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
