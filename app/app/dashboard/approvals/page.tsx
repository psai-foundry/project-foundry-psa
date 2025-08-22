
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  CheckSquare, 
  Clock, 
  Users, 
  TrendingUp,
  AlertCircle,
  Calendar,
  Search,
  Filter
} from 'lucide-react';
import { ApprovalWorkflow } from '@/components/timesheet/approval-workflow';
import { ApprovalVelocityWidget } from '@/components/timesheet/approval-velocity-widget';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';

export default function ApprovalsPage() {
  const { data: session } = useSession();
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState<any>(null);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(filter !== 'all' && { status: filter }),
        ...(searchTerm && { search: searchTerm }),
      });

      const response = await fetch(`/api/timesheets/submissions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Failed to load timesheet submissions');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/approvals/stats');
      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching approval stats:', error);
    }
  };

  useEffect(() => {
    if (!['ADMIN', 'MANAGER'].includes(session?.user?.role || '')) {
      toast.error('You do not have permission to access this page');
      return;
    }
    
    fetchSubmissions();
    fetchStats();
  }, [session?.user?.role, filter, searchTerm]);

  const handleApprove = async (id: string, comments?: string) => {
    try {
      const response = await fetch(`/api/timesheets/submissions/${id}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ comments }),
      });

      if (response.ok) {
        await fetchSubmissions();
        await fetchStats();
        toast.success('Timesheet approved successfully');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to approve timesheet');
      }
    } catch (error) {
      console.error('Error approving timesheet:', error);
      toast.error('Failed to approve timesheet');
    }
  };

  const handleReject = async (id: string, reason: string) => {
    try {
      const response = await fetch(`/api/timesheets/submissions/${id}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason }),
      });

      if (response.ok) {
        await fetchSubmissions();
        await fetchStats();
        toast.success('Timesheet rejected');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to reject timesheet');
      }
    } catch (error) {
      console.error('Error rejecting timesheet:', error);
      toast.error('Failed to reject timesheet');
    }
  };

  const handleBulkApprove = async () => {
    const pendingSubmissions = submissions.filter(s => s.status === 'PENDING');
    
    if (pendingSubmissions.length === 0) {
      toast.info('No pending submissions to approve');
      return;
    }

    const confirmMessage = `Are you sure you want to approve ${pendingSubmissions.length} timesheet(s)?`;
    if (!confirm(confirmMessage)) return;

    try {
      const promises = pendingSubmissions.map(submission => 
        fetch(`/api/timesheets/submissions/${submission.id}/approve`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ comments: 'Bulk approved' }),
        })
      );

      await Promise.all(promises);
      await fetchSubmissions();
      await fetchStats();
      toast.success(`${pendingSubmissions.length} timesheets approved successfully`);
    } catch (error) {
      console.error('Error bulk approving timesheets:', error);
      toast.error('Failed to bulk approve timesheets');
    }
  };

  // Check permissions
  if (!['ADMIN', 'MANAGER'].includes(session?.user?.role || '')) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <AlertCircle className="w-16 h-16 mx-auto text-red-500" />
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            You do not have permission to access the approvals page.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
          <p className="text-muted-foreground">Loading approvals...</p>
        </div>
      </div>
    );
  }

  const pendingCount = submissions.filter(s => s.status === 'PENDING').length;
  const approvedCount = submissions.filter(s => s.status === 'APPROVED').length;
  const rejectedCount = submissions.filter(s => s.status === 'REJECTED').length;

  // Handle drill-down actions from the velocity widget
  const handleVelocityDrillDown = (data: any) => {
    const { metric } = data;
    
    switch (metric) {
      case 'urgent':
        setFilter('PENDING');
        toast.info('Showing urgent pending approvals (6+ days)');
        break;
      case 'aging':
        setFilter('PENDING');
        toast.info('Showing pending approvals breakdown');
        break;
      case 'managers':
        toast.info('Manager performance details displayed');
        break;
      case 'overview':
        toast.info('Full approval velocity analysis');
        break;
      default:
        console.log('Drill-down data:', data);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Timesheet Approvals
          </h1>
          <p className="text-muted-foreground mt-1">
            Review and approve team timesheet submissions
          </p>
        </div>
        <div className="flex space-x-3">
          <Button
            onClick={handleBulkApprove}
            disabled={pendingCount === 0}
            className="bg-green-600 hover:bg-green-700"
          >
            <CheckSquare className="w-4 h-4 mr-2" />
            Bulk Approve ({pendingCount})
          </Button>
        </div>
      </div>

      {/* Approval Velocity Widget */}
      <ApprovalVelocityWidget 
        stats={stats} 
        onDrillDown={handleVelocityDrillDown}
        className="lg:col-span-2"
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="w-8 h-8 text-yellow-500" />
              <div>
                <div className="text-2xl font-bold text-yellow-600">
                  {pendingCount}
                </div>
                <div className="text-sm text-muted-foreground">Pending</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckSquare className="w-8 h-8 text-green-500" />
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {approvedCount}
                </div>
                <div className="text-sm text-muted-foreground">Approved</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-8 h-8 text-red-500" />
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {rejectedCount}
                </div>
                <div className="text-sm text-muted-foreground">Rejected</div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <TrendingUp className="w-8 h-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {stats?.avgApprovalTime || 0}h
                </div>
                <div className="text-sm text-muted-foreground">Avg. Approval Time</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filter & Search
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by employee name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Submissions</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Priority Actions */}
      {pendingCount > 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center text-yellow-800">
              <AlertCircle className="w-5 h-5 mr-2" />
              Action Required
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-yellow-800">
                  You have {pendingCount} timesheet{pendingCount > 1 ? 's' : ''} waiting for approval
                </p>
                <p className="text-sm text-yellow-600">
                  Review and approve them to ensure timely payroll processing
                </p>
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFilter('PENDING')}
                >
                  View Pending
                </Button>
                <Button
                  size="sm"
                  onClick={handleBulkApprove}
                  className="bg-yellow-600 hover:bg-yellow-700"
                >
                  Approve All
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Approval Workflow */}
      <ApprovalWorkflow
        submissions={submissions}
        onApprove={handleApprove}
        onReject={handleReject}
        userRole={session?.user?.role || ''}
      />

      {/* Manager Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="w-5 h-5 mr-2" />
            Team Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">
                {stats?.totalHoursThisWeek || 0}h
              </div>
              <div className="text-sm text-muted-foreground">Team Hours This Week</div>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {stats?.utilizationRate || 0}%
              </div>
              <div className="text-sm text-muted-foreground">Team Utilization</div>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {stats?.activeTeamMembers || 0}
              </div>
              <div className="text-sm text-muted-foreground">Active Team Members</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
