import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/use-auth";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import { 
  Home, 
  Settings, 
  Users, 
  Shield, 
  Grid3X3, 
  Bell, 
  LogOut, 
  User,
  Menu,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

const navigationItems = [
  { path: "/", label: "Dashboard", icon: Home },
  { path: "/admin", label: "Administration", icon: Settings, adminOnly: true },
];

const adminItems = [
  { path: "/admin", label: "Overview", icon: Settings },
  { path: "/admin/users", label: "User Management", icon: Users },
  { path: "/admin/roles", label: "Role Management", icon: Shield },
  { path: "/admin/modules", label: "Module Management", icon: Grid3X3 },
];

export default function Navbar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { user, logout } = useAuth();
  const [location] = useLocation();

  const isAdmin = user?.role === 'administrator';
  const isAdminSection = location.startsWith('/admin');

  const handleLogout = async () => {
    await logout();
  };

  const currentItems = isAdminSection ? adminItems : navigationItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {/* Logo */}
            <Link href="/">
              <div className="flex items-center space-x-3 cursor-pointer">
                <div className="w-8 h-8 bg-neoloc-primary rounded-lg flex items-center justify-center">
                  <Grid3X3 className="w-5 h-5 text-white" />
                </div>
                <div className="hidden sm:block">
                  <h1 className="text-xl font-bold text-neoloc-primary">NeoLoc One</h1>
                </div>
              </div>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-1">
              {currentItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path || 
                  (item.path === "/admin" && location.startsWith("/admin") && location !== "/admin");
                
                return (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      size="sm"
                      className={cn(
                        "flex items-center space-x-2",
                        isActive && "bg-neoloc-primary hover:bg-neoloc-primary/90"
                      )}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Notifications */}
            <NotificationCenter />

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 px-2">
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="text-xs bg-neoloc-primary text-white">
                      {user?.fullName?.split(' ').map(n => n[0]).join('').toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium">{user?.fullName}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <p className="font-medium">{user?.fullName}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  Profile Settings
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem asChild>
                    <Link href="/admin">
                      <Settings className="mr-2 h-4 w-4" />
                      Administration
                    </Link>
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            >
              {isMobileMenuOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pt-4 border-t border-gray-200">
            <div className="space-y-2">
              {currentItems.map((item) => {
                const Icon = item.icon;
                const isActive = location === item.path || 
                  (item.path === "/admin" && location.startsWith("/admin") && location !== "/admin");
                
                return (
                  <Link key={item.path} href={item.path}>
                    <Button
                      variant={isActive ? "default" : "ghost"}
                      className={cn(
                        "w-full justify-start flex items-center space-x-2",
                        isActive && "bg-neoloc-primary hover:bg-neoloc-primary/90"
                      )}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Button>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </nav>

      {/* Breadcrumb for Admin Section */}
      {isAdminSection && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2">
          <div className="flex items-center space-x-2 text-sm text-gray-600">
            <Link href="/" className="hover:text-neoloc-primary">
              Dashboard
            </Link>
            <span>/</span>
            <Link href="/admin" className="hover:text-neoloc-primary">
              Administration
            </Link>
            {location !== "/admin" && (
              <>
                <span>/</span>
                <span className="text-gray-900 font-medium">
                  {currentItems.find(item => item.path === location)?.label || "Current Page"}
                </span>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}