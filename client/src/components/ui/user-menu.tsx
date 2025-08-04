import React, { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { getUserInitials, getRoleDisplayName } from '@/lib/auth';
import { ChevronDown, User, Shield, LogOut, Bell } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export const UserMenu: React.FC = () => {
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) return null;

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="flex items-center space-x-4">
      {/* Notifications */}
      <Button variant="ghost" size="sm" className="relative" data-testid="notifications-button">
        <Bell className="h-5 w-5 text-gray-400 hover:text-neoloc-text" />
        <Badge className="absolute -top-1 -right-1 bg-neoloc-accent text-white text-xs w-5 h-5 rounded-full p-0 flex items-center justify-center">
          3
        </Badge>
      </Button>

      {/* User Dropdown */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            className="flex items-center space-x-3 text-neoloc-text hover:text-neoloc-primary p-2 rounded-lg transition-colors"
            data-testid="user-menu-trigger"
          >
            <div className="w-8 h-8 bg-neoloc-primary rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium" data-testid="user-initials">
                {getUserInitials(user.fullName)}
              </span>
            </div>
            <div className="text-left hidden sm:block">
              <p className="text-sm font-medium" data-testid="user-name">
                {user.fullName}
              </p>
              <p className="text-xs text-gray-500" data-testid="user-role">
                {getRoleDisplayName(user.role)}
              </p>
            </div>
            <ChevronDown className="text-sm" />
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none" data-testid="dropdown-user-name">
                {user.fullName}
              </p>
              <p className="text-xs leading-none text-muted-foreground" data-testid="dropdown-user-email">
                {user.email}
              </p>
            </div>
          </DropdownMenuLabel>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem data-testid="profile-settings">
            <User className="mr-2 h-4 w-4" />
            <span>Profile Settings</span>
          </DropdownMenuItem>
          
          <DropdownMenuItem data-testid="security-settings">
            <Shield className="mr-2 h-4 w-4" />
            <span>Security</span>
          </DropdownMenuItem>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="text-red-600 focus:text-red-600"
            data-testid="logout-button"
          >
            <LogOut className="mr-2 h-4 w-4" />
            <span>{isLoggingOut ? 'Signing out...' : 'Sign Out'}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
