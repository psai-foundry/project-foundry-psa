
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  User,
  MessageCircle,
  Calendar,
  Send,
  AlertCircle
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface ApprovalWorkflowProps {
  submissions: any[];
  onApprove: (id: string, comments?: string) => void;
  onReject: (id: string, reason: string) => void;
  userRole: string;
}

export function ApprovalWorkflow({ 
  submissions, 
  onApprove, 
  onReject, 
  userRole 
}: ApprovalWorkflowProps) {
  const [selectedSubmission, setSelectedSubmission] = useState<any>(null);
  const [comments, setComments] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [loading, setLoading] = useState(false);

  const canApprove = ['ADMIN', 'MANAGER'].includes(userRole);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleApprove = async (submissionId: string) => {
    setLoading(true);
    try {
      await onApprove(submissionId, comments);
      toast.success('Timesheet approved successfully');
      setComments('');
      setSelectedSubmission(null);
    } catch (error) {
      toast.error('Failed to approve timesheet');
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async (submissionId: string) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setLoading(true);
    try {
      await onReject(submissionId, rejectionReason);
      toast.success('Timesheet rejected');
      setRejectionReason('');
      setSelectedSubmission(null);
    } catch (error) {
      toast.error('Failed to reject timesheet');
    } finally {
      setLoading(false);
    }
  };

  const pendingSubmissions = submissions.filter(s => s.status === 'PENDING');
  const recentSubmissions = submissions.filter(s => s.status !== 'PENDING').slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Pending Approvals */}
      {pendingSubmissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Clock className="w-5 h-5 mr-2 text-yellow-500" />
              Pending Approvals ({pendingSubmissions.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingSubmissions.map((submission) => (
                <div key={submission.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="font-medium">{submission.user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {submission.user.email}
                        </div>
                      </div>
                    </div>
                    <Badge className={getStatusColor(submission.status)}>
                      {submission.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium">Week</div>
                        <div className="text-sm text-muted-foreground">
                          {format(parseISO(submission.weekStartDate), 'MMM dd')} - {format(parseISO(submission.weekEndDate), 'MMM dd')}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium">Total Hours</div>
                        <div className="text-sm text-muted-foreground">
                          {submission.totalHours}h
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium">Billable</div>
                        <div className="text-sm text-muted-foreground">
                          {submission.totalBillable}h
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      View Details
                    </Button>

                    {canApprove && (
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => {
                            setSelectedSubmission(submission);
                            setRejectionReason('');
                          }}
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={() => handleApprove(submission.id)}
                          disabled={loading}
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Submissions */}
      {recentSubmissions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <MessageCircle className="w-5 h-5 mr-2" />
              Recent Submissions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentSubmissions.map((submission) => (
                <div key={submission.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="font-medium">{submission.user.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {format(parseISO(submission.weekStartDate), 'MMM dd')} - {format(parseISO(submission.weekEndDate), 'MMM dd')} | {submission.totalHours}h
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge className={getStatusColor(submission.status)}>
                      {submission.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedSubmission(submission)}
                    >
                      View
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Submission Detail Modal */}
      {selectedSubmission && (
        <Card className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Timesheet Details</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedSubmission(null)}
                >
                  ×
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Submission Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Employee</Label>
                  <div className="text-sm">{selectedSubmission.user.name}</div>
                </div>
                <div>
                  <Label>Week</Label>
                  <div className="text-sm">
                    {format(parseISO(selectedSubmission.weekStartDate), 'MMM dd')} - {format(parseISO(selectedSubmission.weekEndDate), 'MMM dd')}
                  </div>
                </div>
                <div>
                  <Label>Total Hours</Label>
                  <div className="text-sm">{selectedSubmission.totalHours}h</div>
                </div>
                <div>
                  <Label>Billable Hours</Label>
                  <div className="text-sm">{selectedSubmission.totalBillable}h</div>
                </div>
              </div>

              {/* Time Entries */}
              <div>
                <Label>Time Entries</Label>
                <div className="mt-2 space-y-2">
                  {selectedSubmission.entries?.map((entry: any) => (
                    <div key={entry.id} className="border rounded p-3 text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-medium">{entry.timeEntry.project.name}</div>
                          <div className="text-muted-foreground">{entry.timeEntry.description}</div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{entry.timeEntry.duration}h</div>
                          <div className="text-muted-foreground">
                            {format(parseISO(entry.timeEntry.date), 'MMM dd')}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Approval Actions */}
              {canApprove && selectedSubmission.status === 'PENDING' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Comments (Optional)</Label>
                    <Textarea
                      value={comments}
                      onChange={(e) => setComments(e.target.value)}
                      placeholder="Add any comments for the employee..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Rejection Reason</Label>
                    <Textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="If rejecting, please provide a reason..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button
                      variant="outline"
                      onClick={() => handleReject(selectedSubmission.id)}
                      disabled={loading || !rejectionReason.trim()}
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedSubmission.id)}
                      disabled={loading}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Approve
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      )}

      {/* Empty State */}
      {submissions.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <Clock className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium mb-2">No Submissions Found</h3>
            <p className="text-muted-foreground">
              There are no timesheet submissions to review at this time.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
