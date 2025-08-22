
'use client';

import { useState } from 'react';
import { Calendar, Clock, Users, Settings, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// Mock data for capacity calendar
const mockGovernanceMeetings = [
  {
    id: '1',
    date: '2024-01-12',
    type: 'Monthly Review',
    status: 'upcoming',
    attendees: 8,
    agenda: ['Resource allocation review', 'Q1 capacity planning', 'New project approvals'],
  },
  {
    id: '2',
    date: '2024-01-26',
    type: 'Bi-weekly Check-in',
    status: 'upcoming',
    attendees: 5,
    agenda: ['Sprint capacity review', 'Resource conflicts resolution'],
  },
  {
    id: '3',
    date: '2023-12-29',
    type: 'Monthly Review',
    status: 'completed',
    attendees: 7,
    agenda: ['Year-end capacity analysis', 'Q1 planning preparation'],
  },
];

const mockSubmissionDeadlines = [
  {
    date: '2024-01-10',
    type: 'Capacity Submissions Due',
    status: 'upcoming',
    description: 'All teams submit Q1 capacity plans',
  },
  {
    date: '2024-01-24',
    type: 'Resource Requests Due',
    status: 'upcoming',
    description: 'New resource allocation requests',
  },
];

const mockCalendarSettings = {
  dayZero: '2024-01-01',
  forecastingPeriodMonths: 3,
  reviewFrequency: 'MONTHLY',
  governanceMeetingDay: 'FRIDAY',
  governanceMeetingTime: '09:00:00',
  submissionDeadlineDays: 2,
};

export default function CapacityCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState('2024-01');
  const [viewMode, setViewMode] = useState('meetings'); // meetings, deadlines, settings

  const upcomingMeetings = mockGovernanceMeetings.filter(m => m.status === 'upcoming');
  const upcomingDeadlines = mockSubmissionDeadlines.filter(d => d.status === 'upcoming');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Capacity Calendar</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Governance meetings and submission deadlines for capacity management
          </p>
        </div>
        <div className="flex gap-2">
          <Select value={viewMode} onValueChange={setViewMode}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="meetings">Meetings</SelectItem>
              <SelectItem value="deadlines">Deadlines</SelectItem>
              <SelectItem value="settings">Settings</SelectItem>
            </SelectContent>
          </Select>
          <Button className="gap-2" onClick={() => console.log('Schedule Meeting clicked')}>
            <Plus className="w-4 h-4" />
            Schedule Meeting
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Upcoming Meetings</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{upcomingMeetings.length}</div>
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Deadline</CardTitle>
            <Clock className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3</div>
            <p className="text-xs text-muted-foreground">
              Days remaining
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Attendees</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">6.7</div>
            <p className="text-xs text-muted-foreground">
              Per meeting
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Review Frequency</CardTitle>
            <Settings className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Monthly</div>
            <p className="text-xs text-muted-foreground">
              Current cadence
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Month Navigation */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Calendar View</CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm">
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Select value={currentMonth} onValueChange={setCurrentMonth}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2023-12">Dec 2023</SelectItem>
                  <SelectItem value="2024-01">Jan 2024</SelectItem>
                  <SelectItem value="2024-02">Feb 2024</SelectItem>
                  <SelectItem value="2024-03">Mar 2024</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm">
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {viewMode === 'meetings' && (
        <Card>
          <CardHeader>
            <CardTitle>Governance Meetings</CardTitle>
            <CardDescription>
              Scheduled capacity governance meetings and reviews
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockGovernanceMeetings.map((meeting) => (
                <div key={meeting.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{meeting.type}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(meeting.date).toLocaleDateString('en-US', { 
                          weekday: 'long', 
                          year: 'numeric', 
                          month: 'long', 
                          day: 'numeric' 
                        })}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={meeting.status === 'upcoming' ? 'default' : 'secondary'}>
                        {meeting.status}
                      </Badge>
                      <div className="text-sm text-gray-600 mt-1">
                        {meeting.attendees} attendees
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Agenda:</div>
                    <ul className="text-sm text-gray-600 space-y-1">
                      {meeting.agenda.map((item, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-gray-400 mt-2 flex-shrink-0"></span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  {meeting.status === 'upcoming' && (
                    <div className="flex gap-2 mt-4">
                      <Button size="sm" variant="outline" onClick={() => console.log('Edit Meeting clicked')}>
                        Edit Meeting
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => console.log('Send Invites clicked')}>
                        Send Invites
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'deadlines' && (
        <Card>
          <CardHeader>
            <CardTitle>Submission Deadlines</CardTitle>
            <CardDescription>
              Important deadlines for capacity submissions and requests
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockSubmissionDeadlines.map((deadline, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold">{deadline.type}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Due: {new Date(deadline.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-gray-600 mt-1">
                        {deadline.description}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant={deadline.status === 'upcoming' ? 'destructive' : 'secondary'}>
                        {deadline.status}
                      </Badge>
                      <div className="text-sm text-gray-600 mt-1">
                        3 days remaining
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {viewMode === 'settings' && (
        <Card>
          <CardHeader>
            <CardTitle>Calendar Settings</CardTitle>
            <CardDescription>
              Configure capacity management calendar and governance settings
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Day Zero</label>
                    <p className="text-sm text-gray-600 mb-2">
                      Start date for capacity planning cycle
                    </p>
                    <div className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      {mockCalendarSettings.dayZero}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Forecasting Period</label>
                    <p className="text-sm text-gray-600 mb-2">
                      Number of months to forecast ahead
                    </p>
                    <div className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      {mockCalendarSettings.forecastingPeriodMonths} months
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Review Frequency</label>
                    <p className="text-sm text-gray-600 mb-2">
                      How often to conduct governance reviews
                    </p>
                    <div className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      {mockCalendarSettings.reviewFrequency}
                    </div>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Meeting Day</label>
                    <p className="text-sm text-gray-600 mb-2">
                      Default day for governance meetings
                    </p>
                    <div className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      {mockCalendarSettings.governanceMeetingDay}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Meeting Time</label>
                    <p className="text-sm text-gray-600 mb-2">
                      Default time for governance meetings
                    </p>
                    <div className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      {mockCalendarSettings.governanceMeetingTime}
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Submission Deadline</label>
                    <p className="text-sm text-gray-600 mb-2">
                      Days before meeting for submissions
                    </p>
                    <div className="text-sm font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded">
                      {mockCalendarSettings.submissionDeadlineDays} days prior
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-2 pt-4">
                <Button onClick={() => console.log('Update Settings clicked')}>
                  Update Settings
                </Button>
                <Button variant="outline" onClick={() => console.log('Reset to Defaults clicked')}>
                  Reset to Defaults
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>
            Common capacity calendar actions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button className="h-20 flex flex-col gap-2" variant="outline" onClick={() => console.log('Schedule Meeting clicked')}>
              <Calendar className="w-6 h-6" />
              <span>Schedule Meeting</span>
            </Button>
            <Button className="h-20 flex flex-col gap-2" variant="outline" onClick={() => console.log('Set Deadline clicked')}>
              <Clock className="w-6 h-6" />
              <span>Set Deadline</span>
            </Button>
            <Button className="h-20 flex flex-col gap-2" variant="outline" onClick={() => console.log('Update Settings clicked')}>
              <Settings className="w-6 h-6" />
              <span>Update Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
