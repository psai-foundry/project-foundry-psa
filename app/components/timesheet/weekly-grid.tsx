
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Clock, 
  Plus, 
  Edit2, 
  Trash2, 
  Play, 
  CheckCircle, 
  AlertCircle,
  Calendar,
  Save,
  Send
} from 'lucide-react';
import { format, parseISO, startOfWeek, endOfWeek, eachDayOfInterval, addDays } from 'date-fns';
import { ProjectTaskSelector } from './project-task-selector';
import { TimerDisplay } from './timer-display';
import { toast } from 'sonner';

interface WeeklyGridProps {
  weekStart: string;
  userId?: string;
  onWeekChange: (date: string) => void;
  canEdit?: boolean;
  onSubmit?: () => void;
}

interface TimeEntry {
  id: string;
  projectId: string;
  taskId?: string;
  date: string;
  duration: number;
  description?: string;
  status: 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';
  billable: boolean;
  project: {
    id: string;
    name: string;
    code: string;
    client: {
      name: string;
    };
  };
  task?: {
    id: string;
    name: string;
  };
}

interface DayData {
  date: string;
  dayName: string;
  entries: TimeEntry[];
  totalHours: number;
  billableHours: number;
}

export function WeeklyGrid({ 
  weekStart, 
  userId, 
  onWeekChange, 
  canEdit = true, 
  onSubmit 
}: WeeklyGridProps) {
  const [weekData, setWeekData] = useState<{
    weekStart: string;
    weekEnd: string;
    entriesByDay: DayData[];
    weeklyTotals: {
      totalHours: number;
      billableHours: number;
      entryCount: number;
    };
    submission?: any;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [editingEntry, setEditingEntry] = useState<string | null>(null);
  const [newEntry, setNewEntry] = useState<{
    date: string;
    projectId: string;
    taskId?: string;
    duration: number;
    description: string;
  } | null>(null);
  const [runningTimer, setRunningTimer] = useState<any>(null);

  // Get week boundaries
  const weekStartDate = startOfWeek(parseISO(weekStart), { weekStartsOn: 1 });
  const weekEndDate = endOfWeek(parseISO(weekStart), { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStartDate, end: weekEndDate });

  const fetchWeekData = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        weekStart: format(weekStartDate, 'yyyy-MM-dd'),
        ...(userId && { userId }),
      });

      const response = await fetch(`/api/timesheets/weekly?${params}`);
      if (response.ok) {
        const data = await response.json();
        setWeekData(data.data);
      }
    } catch (error) {
      console.error('Error fetching week data:', error);
      toast.error('Failed to fetch timesheet data');
    } finally {
      setLoading(false);
    }
  };

  const fetchRunningTimer = async () => {
    try {
      const response = await fetch('/api/timer');
      if (response.ok) {
        const data = await response.json();
        setRunningTimer(data.data);
      }
    } catch (error) {
      console.error('Error fetching running timer:', error);
    }
  };

  useEffect(() => {
    fetchWeekData();
    fetchRunningTimer();
  }, [weekStart, userId]);

  const handleSaveEntry = async (entryData: any) => {
    try {
      const response = await fetch('/api/timesheets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(entryData),
      });

      if (response.ok) {
        await fetchWeekData();
        setNewEntry(null);
        toast.success('Time entry saved');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to save time entry');
      }
    } catch (error) {
      console.error('Error saving time entry:', error);
      toast.error('Failed to save time entry');
    }
  };

  const handleUpdateEntry = async (id: string, updates: Record<string, any>) => {
    try {
      const response = await fetch(`/api/timesheets/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        await fetchWeekData();
        setEditingEntry(null);
        toast.success('Time entry updated');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to update time entry');
      }
    } catch (error) {
      console.error('Error updating time entry:', error);
      toast.error('Failed to update time entry');
    }
  };

  const handleDeleteEntry = async (id: string) => {
    try {
      const response = await fetch(`/api/timesheets/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchWeekData();
        toast.success('Time entry deleted');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to delete time entry');
      }
    } catch (error) {
      console.error('Error deleting time entry:', error);
      toast.error('Failed to delete time entry');
    }
  };

  const handleSubmitWeek = async () => {
    if (!weekData) return;

    try {
      const response = await fetch('/api/timesheets/weekly', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          weekStart: weekData.weekStart,
        }),
      });

      if (response.ok) {
        await fetchWeekData();
        toast.success('Weekly timesheet submitted for approval');
        onSubmit?.();
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to submit timesheet');
      }
    } catch (error) {
      console.error('Error submitting timesheet:', error);
      toast.error('Failed to submit timesheet');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            onClick={() => onWeekChange(format(addDays(weekStartDate, -7), 'yyyy-MM-dd'))}
          >
            Previous Week
          </Button>
          <h2 className="text-xl font-semibold">
            {format(weekStartDate, 'MMM dd')} - {format(weekEndDate, 'MMM dd, yyyy')}
          </h2>
          <Button
            variant="outline"
            onClick={() => onWeekChange(format(addDays(weekStartDate, 7), 'yyyy-MM-dd'))}
          >
            Next Week
          </Button>
        </div>
        
        <div className="flex items-center space-x-2">
          {weekData?.submission && (
            <Badge variant={
              weekData.submission.status === 'APPROVED' ? 'default' :
              weekData.submission.status === 'PENDING' ? 'secondary' : 'destructive'
            }>
              {weekData.submission.status}
            </Badge>
          )}
          
          {canEdit && !weekData?.submission && (
            <Button onClick={handleSubmitWeek} className="bg-blue-600 hover:bg-blue-700">
              <Send className="w-4 h-4 mr-2" />
              Submit Week
            </Button>
          )}
        </div>
      </div>

      {/* Running Timer */}
      {runningTimer && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="py-4">
            <TimerDisplay 
              timer={runningTimer}
              onStop={() => fetchRunningTimer()}
              onPause={() => fetchRunningTimer()}
            />
          </CardContent>
        </Card>
      )}

      {/* Weekly Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <Calendar className="w-5 h-5 mr-2" />
              Weekly Timesheet
            </span>
            <div className="text-sm text-muted-foreground">
              Total: {weekData?.weeklyTotals.totalHours.toFixed(1)}h | 
              Billable: {weekData?.weeklyTotals.billableHours.toFixed(1)}h
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-3 font-medium">Project/Task</th>
                  {weekDays.map((day) => (
                    <th key={day.toISOString()} className="text-center p-3 font-medium min-w-[120px]">
                      <div>{format(day, 'EEE')}</div>
                      <div className="text-sm text-muted-foreground">{format(day, 'dd')}</div>
                    </th>
                  ))}
                  <th className="text-center p-3 font-medium">Total</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {weekData?.entriesByDay.map((dayData) => 
                  dayData.entries.map((entry) => (
                    <TimeEntryRow
                      key={entry.id}
                      entry={entry}
                      weekDays={weekDays}
                      weekData={weekData}
                      canEdit={canEdit}
                      isEditing={editingEntry === entry.id}
                      onEdit={() => setEditingEntry(entry.id)}
                      onSave={(updates) => handleUpdateEntry(entry.id, updates)}
                      onDelete={() => handleDeleteEntry(entry.id)}
                      onCancel={() => setEditingEntry(null)}
                    />
                  ))
                )}
                
                {/* New Entry Row */}
                {newEntry && (
                  <NewEntryRow
                    newEntry={newEntry}
                    weekDays={weekDays}
                    onSave={handleSaveEntry}
                    onCancel={() => setNewEntry(null)}
                  />
                )}
              </tbody>
            </table>
          </div>

          {/* Add Entry Button */}
          {canEdit && (
            <div className="mt-4 flex justify-center">
              <Button
                variant="outline"
                onClick={() => setNewEntry({
                  date: format(weekStartDate, 'yyyy-MM-dd'),
                  projectId: '',
                  taskId: undefined,
                  duration: 0,
                  description: '',
                })}
                className="flex items-center"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Time Entry
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Weekly Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Weekly Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {weekData?.weeklyTotals.totalHours.toFixed(1)}h
              </div>
              <div className="text-sm text-muted-foreground">Total Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {weekData?.weeklyTotals.billableHours.toFixed(1)}h
              </div>
              <div className="text-sm text-muted-foreground">Billable Hours</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {weekData?.weeklyTotals.totalHours ? 
                  Math.round((weekData.weeklyTotals.billableHours / weekData.weeklyTotals.totalHours) * 100) 
                  : 0}%
              </div>
              <div className="text-sm text-muted-foreground">Utilization</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {weekData?.weeklyTotals.entryCount || 0}
              </div>
              <div className="text-sm text-muted-foreground">Entries</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Helper component for time entry rows
interface TimeEntryRowProps {
  entry: TimeEntry;
  weekDays: Date[];
  weekData: any;
  canEdit: boolean;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Record<string, any>) => void;
  onDelete: () => void;
  onCancel: () => void;
}

function TimeEntryRow({ entry, weekDays, weekData, canEdit, isEditing, onEdit, onSave, onDelete, onCancel }: TimeEntryRowProps) {
  const [editData, setEditData] = useState(entry);

  if (isEditing) {
    return (
      <tr className="border-b bg-yellow-50">
        <td className="p-3">
          <ProjectTaskSelector
            projectId={editData.projectId}
            taskId={editData.taskId}
            onProjectChange={(projectId) => setEditData({ ...editData, projectId })}
            onTaskChange={(taskId) => setEditData({ ...editData, taskId })}
          />
        </td>
        {weekDays.map((day: Date) => (
          <td key={day.toISOString()} className="p-3 text-center">
            {format(day, 'yyyy-MM-dd') === format(parseISO(entry.date), 'yyyy-MM-dd') ? (
              <Input
                type="number"
                step="0.5"
                value={editData.duration}
                onChange={(e) => setEditData({ ...editData, duration: parseFloat(e.target.value) || 0 })}
                className="w-20 text-center"
              />
            ) : (
              <span className="text-muted-foreground">-</span>
            )}
          </td>
        ))}
        <td className="p-3 text-center font-medium">{editData.duration.toFixed(1)}h</td>
        <td className="p-3 text-center">
          <div className="flex justify-center space-x-2">
            <Button size="sm" onClick={() => onSave(editData)}>
              <Save className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b hover:bg-gray-50">
      <td className="p-3">
        <div className="flex flex-col">
          <span className="font-medium">{entry.project.name}</span>
          <span className="text-sm text-muted-foreground">{entry.project.client.name}</span>
          {entry.task && (
            <span className="text-sm text-blue-600">{entry.task.name}</span>
          )}
        </div>
      </td>
      {weekDays.map((day: Date) => (
        <td key={day.toISOString()} className="p-3 text-center">
          {format(day, 'yyyy-MM-dd') === format(parseISO(entry.date), 'yyyy-MM-dd') ? (
            <div className="flex flex-col items-center">
              <span className="font-medium">{entry.duration.toFixed(1)}h</span>
              {entry.status === 'APPROVED' && (
                <CheckCircle className="w-4 h-4 text-green-500" />
              )}
              {entry.status === 'REJECTED' && (
                <AlertCircle className="w-4 h-4 text-red-500" />
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">-</span>
          )}
        </td>
      ))}
      <td className="p-3 text-center font-medium">{entry.duration.toFixed(1)}h</td>
      <td className="p-3 text-center">
        {canEdit && entry.status === 'DRAFT' && (
          <div className="flex justify-center space-x-2">
            <Button size="sm" variant="outline" onClick={onEdit}>
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button size="sm" variant="outline" onClick={onDelete}>
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        )}
      </td>
    </tr>
  );
}

// Helper component for new entry row
interface NewEntryRowProps {
  newEntry: any;
  weekDays: Date[];
  onSave: (data: any) => void;
  onCancel: () => void;
}

function NewEntryRow({ newEntry, weekDays, onSave, onCancel }: NewEntryRowProps) {
  const [entryData, setEntryData] = useState(newEntry);

  return (
    <tr className="border-b bg-green-50">
      <td className="p-3">
        <ProjectTaskSelector
          projectId={entryData.projectId}
          taskId={entryData.taskId}
          onProjectChange={(projectId) => setEntryData({ ...entryData, projectId })}
          onTaskChange={(taskId) => setEntryData({ ...entryData, taskId })}
        />
      </td>
      {weekDays.map((day: Date) => {
        const dayDate = format(day, 'yyyy-MM-dd');
        const isCurrentDay = dayDate === entryData.date;
        return (
          <td key={day.toISOString()} className="p-3 text-center">
            <Input
              type="number"
              step="0.5"
              min="0"
              max="24"
              placeholder="Hours"
              value={isCurrentDay ? entryData.duration || '' : ''}
              onChange={(e) => {
                const newDuration = parseFloat(e.target.value) || 0;
                if (isCurrentDay) {
                  // Same day, just update duration
                  setEntryData({ ...entryData, duration: newDuration });
                } else {
                  // Different day, change date and set new duration
                  setEntryData({ ...entryData, date: dayDate, duration: newDuration });
                }
              }}
              className="w-20 text-center"
            />
          </td>
        );
      })}
      <td className="p-3 text-center font-medium">{(entryData.duration || 0).toFixed(1)}h</td>
      <td className="p-3 text-center">
        <div className="flex justify-center space-x-2">
          <Button 
            size="sm" 
            onClick={() => onSave(entryData)}
            disabled={!entryData.projectId || !entryData.duration || entryData.duration <= 0}
          >
            <Save className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </td>
    </tr>
  );
}
