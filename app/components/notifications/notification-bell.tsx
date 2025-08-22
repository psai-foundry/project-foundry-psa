
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NotificationPanel } from './notification-panel';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  status: 'UNREAD' | 'READ' | 'DISMISSED';
  createdAt: string;
  userId: string;
}

export function NotificationBell() {
  const { data: session } = useSession();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);

  // Fetch notifications
  const fetchNotifications = async () => {
    if (!session?.user?.id) return;

    try {
      const response = await fetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  // Mark notification as read
  const markAsRead = async (notificationId: string) => {
    try {
      const response = await fetch(`/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification =>
            notification.id === notificationId
              ? { ...notification, status: 'READ' }
              : notification
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
    }
  };

  // Mark all as read
  const markAllAsRead = async () => {
    try {
      const response = await fetch('/api/notifications/mark-all-read', {
        method: 'PATCH',
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notification => ({ ...notification, status: 'READ' }))
        );
        setUnreadCount(0);
      }
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
    }
  };

  // Load notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [session?.user?.id]);

  // Auto-refresh notifications every 30 seconds
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [session?.user?.id]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="relative"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">
            Notifications {unreadCount > 0 && `(${unreadCount} unread)`}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        className="w-80 p-0" 
        align="end" 
        sideOffset={8}
      >
        <NotificationPanel
          notifications={notifications}
          onMarkAsRead={markAsRead}
          onMarkAllAsRead={markAllAsRead}
          onRefresh={fetchNotifications}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
