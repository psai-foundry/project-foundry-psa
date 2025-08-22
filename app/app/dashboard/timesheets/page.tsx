
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar, 
  CheckSquare, 
  Clock, 
  FileText,
  Plus,
  Timer,
  Users,
  BarChart3,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { WeeklyGrid } from '@/components/timesheet/weekly-grid';
import { TimeEntryForm } from '@/components/timesheet/time-entry-form';
import { TimesheetInsights } from '@/components/timesheet/timesheet-insights';
import { format, startOfWeek, addDays, subDays } from 'date-fns';
import { toast } from 'sonner';

export default function TimesheetsPage() {
  const { data: session } = useSession();
  const [currentWeek, setCurrentWeek] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [viewMode, setViewMode] = useState<'weekly' | 'insights'>('weekly');
  const [recentSubmissions, setRecentSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRecentSubmissions = async () => {
    try {
      const response = await fetch('/api/timesheets/submissions?limit=5');
      if (response.ok) {
        const data = await response.json();
        setRecentSubmissions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching recent submissions:', error);
    }
  };

  useEffect(() => {
    fetchRecentSubmissions();
    setLoading(false);
  }, []);

  const handleWeekChange = (date: string) => {
    setCurrentWeek(date);
  };

  const handleAddEntry = async (entryData: any) => {
    try {
      const response = await fetch('/api/timesheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryData),
      });

      if (response.ok) {
        setShowAddEntry(false);
        toast.success('Time entry added successfully');
        // Force refresh of the weekly grid
        window.location.reload();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to add time entry');
      }
    } catch (error) {
      console.error('Error adding time entry:', error);
      toast.error('Failed to add time entry');
    }
  };

  const handleSubmitWeek = () => {
    toast.success('Weekly timesheet submitted successfully');
    fetchRecentSubmissions();
  };

  const weekStartDate = startOfWeek(new Date(currentWeek), { weekStartsOn: 1 });
  const weekEndDate = addDays(weekStartDate, 6);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-muted-foreground">Loading timesheets...</p>
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
            Timesheets
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage your weekly timesheet entries and submissions
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={() => setShowAddEntry(!showAddEntry)}
            variant={showAddEntry ? "default" : "outline"}
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Entry
          </Button>
          <Button
            onClick={() => setViewMode(viewMode === 'weekly' ? 'insights' : 'weekly')}
            variant="outline"
          >
            {viewMode === 'weekly' ? (
              <>
                <BarChart3 className="w-4 h-4 mr-2" />
                Insights
              </>
            ) : (
              <>
                <Calendar className="w-4 h-4 mr-2" />
                Weekly View
              </>
            )}
          </Button>
          <Button variant="outline" asChild>
            <a href="/dashboard/time-tracker">
              <Timer className="w-4 h-4 mr-2" />
              Time Tracker
            </a>
          </Button>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="flex items-center justify-center space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <Button
          variant={viewMode === 'weekly' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('weekly')}
        >
          Weekly View
        </Button>
        <Button
          variant={viewMode === 'insights' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setViewMode('insights')}
        >
          Insights
        </Button>
      </div>

      {/* Add Entry Form */}
      {showAddEntry && (
        <TimeEntryForm
          onSave={handleAddEntry}
          onCancel={() => setShowAddEntry(false)}
          mode="create"
          date={currentWeek}
        />
      )}

      {/* Main Content */}
      {viewMode === 'weekly' ? (
        <WeeklyGrid
          weekStart={currentWeek}
          onWeekChange={handleWeekChange}
          onSubmit={handleSubmitWeek}
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <TimesheetInsights 
              userId={session?.user?.id} 
              weekStart={currentWeek}
            />
          </div>
          <div className="space-y-6">
            {/* Recent Submissions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <FileText className="w-5 h-5 mr-2" />
                  Recent Submissions
                </CardTitle>
              </CardHeader>
              <CardContent>
                {recentSubmissions.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckSquare className="w-12 h-12 mx-auto text-gray-400 mb-3" />
                    <p className="text-sm text-muted-foreground">
                      No recent submissions
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentSubmissions.map((submission) => (
                      <div
                        key={submission.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <div className="text-sm font-medium">
                            {format(new Date(submission.weekStartDate), 'MMM dd')} - {format(new Date(submission.weekEndDate), 'MMM dd')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {submission.totalHours}h total
                          </div>
                        </div>
                        <Badge variant={
                          submission.status === 'APPROVED' ? 'default' :
                          submission.status === 'PENDING' ? 'secondary' :
                          'destructive'
                        }>
                          {submission.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Plus className="w-5 h-5 mr-2" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setShowAddEntry(true)}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Add Time Entry
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    asChild
                  >
                    <a href="/dashboard/time-tracker">
                      <Timer className="w-4 h-4 mr-2" />
                      Start Timer
                    </a>
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setCurrentWeek(format(subDays(new Date(), 7), 'yyyy-MM-dd'))}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous Week
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setCurrentWeek(format(new Date(), 'yyyy-MM-dd'))}
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Current Week
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Weekly Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="w-5 h-5 mr-2" />
                  This Week
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-sm text-muted-foreground mb-2">
                    {format(weekStartDate, 'MMM dd')} - {format(weekEndDate, 'MMM dd')}
                  </div>
                  <div className="text-2xl font-bold text-blue-600 mb-1">
                    Loading...
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Total Hours
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Manager Section */}
      {['ADMIN', 'MANAGER'].includes(session?.user?.role || '') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="w-5 h-5 mr-2" />
              Team Management
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button variant="outline" className="h-auto p-4" asChild>
                <a href="/dashboard/approvals">
                  <div className="text-center">
                    <CheckSquare className="w-6 h-6 mx-auto mb-2 text-green-500" />
                    <div className="font-medium">Pending Approvals</div>
                    <div className="text-xs text-muted-foreground">Review team timesheets</div>
                  </div>
                </a>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto p-4"
                onClick={() => {
                  // TODO: Implement team reports functionality
                  console.log('Team Reports clicked');
                }}
              >
                <div className="text-center">
                  <BarChart3 className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <div className="font-medium">Team Reports</div>
                  <div className="text-xs text-muted-foreground">View team analytics</div>
                </div>
              </Button>
              
              <Button 
                variant="outline" 
                className="h-auto p-4"
                onClick={() => {
                  // TODO: Implement resource planning functionality
                  console.log('Resource Planning clicked');
                }}
              >
                <div className="text-center">
                  <Users className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                  <div className="font-medium">Resource Planning</div>
                  <div className="text-xs text-muted-foreground">Manage team capacity</div>
                </div>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
