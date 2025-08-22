
'use client';

import { useSession } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Settings, HelpCircle, Moon, Sun } from 'lucide-react';
import { NotificationBell } from '@/components/notifications/notification-bell';
import { useTheme } from 'next-themes';

export function Header() {
  const { data: session } = useSession();
  const { theme, setTheme } = useTheme();

  return (
    <header className="h-16 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between px-6">
      {/* Search */}
      <div className="flex items-center flex-1 max-w-lg">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search projects, tasks, or time entries..."
            className="pl-10 bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          />
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center space-x-4">
        {/* Theme toggle */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>

        {/* Notifications */}
        <NotificationBell />

        {/* Help */}
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => {
            // TODO: Implement help functionality
            console.log('Help clicked');
          }}
        >
          <HelpCircle className="w-4 h-4" />
          <span className="sr-only">Help</span>
        </Button>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="ghost" 
              className="relative h-8 w-8 rounded-full"
              onClick={() => {
                // Dropdown menu handled by DropdownMenu component
              }}
            >
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt={session?.user?.name || ''} />
                <AvatarFallback>
                  {session?.user?.name?.charAt(0) || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuItem
              onClick={() => {
                // TODO: Navigate to settings
                console.log('Settings clicked');
              }}
            >
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
