
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Timer, 
  Play, 
  Plus, 
  Clock, 
  History,
  BarChart3,
  Calendar
} from 'lucide-react';
import { TimerDisplay } from '@/components/timesheet/timer-display';
import { TimerStart } from '@/components/timesheet/timer-start';
import { TimeEntryForm } from '@/components/timesheet/time-entry-form';
import { TimesheetInsights } from '@/components/timesheet/timesheet-insights';
import { format, subDays } from 'date-fns';
import { toast } from 'sonner';

export default function TimeTrackerPage() {
  const { data: session } = useSession();
  const [activeTimer, setActiveTimer] = useState<any>(null);
  const [recentEntries, setRecentEntries] = useState<any[]>([]);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchActiveTimer = async () => {
    try {
      const response = await fetch('/api/timer');
      if (response.ok) {
        const data = await response.json();
        setActiveTimer(data.data);
      }
    } catch (error) {
      console.error('Error fetching active timer:', error);
    }
  };

  const fetchRecentEntries = async () => {
    try {
      const weekAgo = format(subDays(new Date(), 7), 'yyyy-MM-dd');
      const today = format(new Date(), 'yyyy-MM-dd');
      
      const response = await fetch(`/api/timesheets?weekStart=${weekAgo}&weekEnd=${today}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setRecentEntries(data.data.timeEntries || []);
      }
    } catch (error) {
      console.error('Error fetching recent entries:', error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    await Promise.all([fetchActiveTimer(), fetchRecentEntries()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTimerStart = (timer: any) => {
    setActiveTimer(timer);
    toast.success('Timer started successfully');
  };

  const handleTimerStop = () => {
    setActiveTimer(null);
    fetchRecentEntries(); // Refresh recent entries
    toast.success('Timer stopped successfully');
  };

  const handleTimerPause = () => {
    setActiveTimer(null);
    toast.success('Timer paused');
  };

  const handleManualEntrySave = async (entryData: any) => {
    try {
      const response = await fetch('/api/timesheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryData),
      });

      if (response.ok) {
        setShowManualEntry(false);
        fetchRecentEntries();
        toast.success('Time entry saved successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save time entry');
      }
    } catch (error) {
      console.error('Error saving time entry:', error);
      toast.error('Failed to save time entry');
    }
  };

  const greeting = `Hello, ${session?.user?.name?.split(' ')[0] || 'there'}!`;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-muted-foreground">Loading time tracker...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Time Tracker
          </h1>
          <p className="text-muted-foreground mt-1">
            {greeting} Track your time with intelligent assistance
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowManualEntry(!showManualEntry)}
            variant={showManualEntry ? "default" : "outline"}
          >
            <Plus className="w-4 h-4 mr-2" />
            Manual Entry
          </Button>
          <Button variant="outline" asChild>
            <a href="/dashboard/timesheets">
              <History className="w-4 h-4 mr-2" />
              View Timesheets
            </a>
          </Button>
        </div>
      </div>

      {/* Active Timer */}
      {activeTimer ? (
        <TimerDisplay
          timer={activeTimer}
          onStop={handleTimerStop}
          onPause={handleTimerPause}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TimerStart
            onTimerStart={handleTimerStart}
            disabled={!!activeTimer}
          />
          <TimesheetInsights userId={session?.user?.id} />
        </div>
      )}

      {/* Manual Entry Form */}
      {showManualEntry && (
        <TimeEntryForm
          onSave={handleManualEntrySave}
          onCancel={() => setShowManualEntry(false)}
          mode="create"
        />
      )}

      {/* Recent Entries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <History className="w-5 h-5 mr-2" />
            Recent Time Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentEntries.length === 0 ? (
            <div className="text-center py-8">
              <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Recent Entries</h3>
              <p className="text-muted-foreground">
                Start tracking time to see your recent entries here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <div className="font-medium">{entry.project.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {entry.project.client.name}
                      </div>
                      {entry.task && (
                        <div className="text-sm text-blue-600">
                          {entry.task.name}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="font-medium">{entry.duration}h</div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(entry.date), 'MMM dd')}
                      </div>
                    </div>
                    <Badge variant={
                      entry.status === 'APPROVED' ? 'default' :
                      entry.status === 'SUBMITTED' ? 'secondary' :
                      entry.status === 'REJECTED' ? 'destructive' : 'outline'
                    }>
                      {entry.status}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">
                  {recentEntries.reduce((sum, entry) => sum + entry.duration, 0).toFixed(1)}h
                </div>
                <div className="text-sm text-muted-foreground">This Week</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold">
                  {recentEntries.filter(e => e.billable).reduce((sum, entry) => sum + entry.duration, 0).toFixed(1)}h
                </div>
                <div className="text-sm text-muted-foreground">Billable</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Calendar className="w-8 h-8 text-purple-500" />
              <div>
                <div className="text-2xl font-bold">
                  {new Set(recentEntries.map(e => e.projectId)).size}
                </div>
                <div className="text-sm text-muted-foreground">Projects</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
