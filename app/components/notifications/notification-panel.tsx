
'use client';

import { formatDistanceToNow } from 'date-fns';
import { 
  Bell, 
  CheckCheck, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle, 
  AlertTriangle, 
  Info 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  status: 'UNREAD' | 'READ' | 'DISMISSED';
  createdAt: string;
  userId: string;
}

interface NotificationPanelProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onRefresh: () => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'SUCCESS':
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    case 'WARNING':
      return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    case 'ERROR':
      return <AlertCircle className="w-4 h-4 text-red-500" />;
    default:
      return <Info className="w-4 h-4 text-blue-500" />;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'SUCCESS':
      return 'border-l-green-500';
    case 'WARNING':
      return 'border-l-yellow-500';
    case 'ERROR':
      return 'border-l-red-500';
    default:
      return 'border-l-blue-500';
  }
};

export function NotificationPanel({
  notifications,
  onMarkAsRead,
  onMarkAllAsRead,
  onRefresh,
}: NotificationPanelProps) {
  const unreadNotifications = notifications.filter(n => n.status === 'UNREAD');

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <Bell className="w-4 h-4" />
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unreadNotifications.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              {unreadNotifications.length}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onRefresh}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="sr-only">Refresh</span>
          </Button>
          {unreadNotifications.length > 0 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onMarkAllAsRead}
              className="h-8 px-2 text-xs"
            >
              <CheckCheck className="w-3 h-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <ScrollArea className="max-h-96">
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No notifications yet</p>
            <p className="text-xs text-muted-foreground mt-1">
              You'll see important updates here
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`p-4 hover:bg-muted/50 transition-colors cursor-pointer border-l-2 ${getNotificationColor(notification.type)} ${
                  notification.status === 'UNREAD' ? 'bg-muted/20' : ''
                }`}
                onClick={() => notification.status === 'UNREAD' && onMarkAsRead(notification.id)}
              >
                <div className="flex items-start gap-3">
                  <div className="mt-0.5">
                    {getNotificationIcon(notification.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className={`text-sm font-medium ${notification.status === 'UNREAD' ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {notification.title}
                      </h4>
                      {notification.status === 'UNREAD' && (
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-1 flex-shrink-0" />
                      )}
                    </div>
                    <p className={`text-xs mt-1 ${notification.status === 'UNREAD' ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {notification.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Footer */}
      {notifications.length > 0 && (
        <>
          <Separator />
          <div className="p-2">
            <Button variant="ghost" size="sm" className="w-full text-xs">
              View all notifications
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
