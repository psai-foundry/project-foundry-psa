
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  AlertCircle, 
  Clock, 
  Target,
  Sparkles,
  X,
  BarChart3,
  Calendar
} from 'lucide-react';
import { format, subDays, startOfWeek, endOfWeek } from 'date-fns';

interface TimesheetInsightsProps {
  userId?: string;
  weekStart?: string;
}

interface Insight {
  id: string;
  type: string;
  title: string;
  description: string;
  confidence: number;
  actionable: boolean;
  dismissed: boolean;
  createdAt: string;
  metadata?: any;
}

export function TimesheetInsights({ userId, weekStart }: TimesheetInsightsProps) {
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any>(null);

  const fetchInsights = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        ...(userId && { userId }),
        ...(weekStart && { weekStart }),
      });

      const response = await fetch(`/api/ai/insights?${params}`);
      if (response.ok) {
        const data = await response.json();
        setInsights(data.data.insights || []);
        setStats(data.data.stats || null);
      }
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
  }, [userId, weekStart]);

  const handleDismissInsight = async (id: string) => {
    try {
      const response = await fetch(`/api/ai/insights/${id}/dismiss`, {
        method: 'POST',
      });

      if (response.ok) {
        setInsights(insights.filter(insight => insight.id !== id));
      }
    } catch (error) {
      console.error('Error dismissing insight:', error);
    }
  };

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'PRODUCTIVITY_PATTERN':
        return <TrendingUp className="w-5 h-5 text-blue-500" />;
      case 'TIME_OPTIMIZATION':
        return <Clock className="w-5 h-5 text-green-500" />;
      case 'PROJECT_SUGGESTION':
        return <Target className="w-5 h-5 text-purple-500" />;
      case 'BILLING_ANOMALY':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'WORKLOAD_BALANCE':
        return <BarChart3 className="w-5 h-5 text-orange-500" />;
      case 'BURNOUT_WARNING':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'EFFICIENCY_TREND':
        return <TrendingUp className="w-5 h-5 text-green-500" />;
      default:
        return <Sparkles className="w-5 h-5 text-gray-500" />;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'PRODUCTIVITY_PATTERN':
        return 'bg-blue-50 border-blue-200';
      case 'TIME_OPTIMIZATION':
        return 'bg-green-50 border-green-200';
      case 'PROJECT_SUGGESTION':
        return 'bg-purple-50 border-purple-200';
      case 'BILLING_ANOMALY':
        return 'bg-red-50 border-red-200';
      case 'WORKLOAD_BALANCE':
        return 'bg-orange-50 border-orange-200';
      case 'BURNOUT_WARNING':
        return 'bg-red-50 border-red-200';
      case 'EFFICIENCY_TREND':
        return 'bg-green-50 border-green-200';
      default:
        return 'bg-gray-50 border-gray-200';
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
      {/* Weekly Stats */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <BarChart3 className="w-5 h-5 mr-2" />
              Weekly Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {stats.totalHours?.toFixed(1)}h
                </div>
                <div className="text-sm text-muted-foreground">Total Hours</div>
                {stats.hoursChange && (
                  <div className={`text-xs flex items-center justify-center mt-1 ${
                    stats.hoursChange > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stats.hoursChange > 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(stats.hoursChange).toFixed(1)}h vs last week
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {stats.productivity?.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Productivity</div>
                {stats.productivityChange && (
                  <div className={`text-xs flex items-center justify-center mt-1 ${
                    stats.productivityChange > 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {stats.productivityChange > 0 ? (
                      <TrendingUp className="w-3 h-3 mr-1" />
                    ) : (
                      <TrendingDown className="w-3 h-3 mr-1" />
                    )}
                    {Math.abs(stats.productivityChange).toFixed(0)}% vs last week
                  </div>
                )}
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {stats.utilization?.toFixed(0)}%
                </div>
                <div className="text-sm text-muted-foreground">Utilization</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {stats.projectCount || 0}
                </div>
                <div className="text-sm text-muted-foreground">Active Projects</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* AI Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="w-5 h-5 mr-2" />
            AI Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          {insights.length === 0 ? (
            <div className="text-center py-8">
              <Sparkles className="w-16 h-16 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Insights Available</h3>
              <p className="text-muted-foreground">
                AI insights will appear here as you track more time entries.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {insights.map((insight) => (
                <div
                  key={insight.id}
                  className={`p-4 rounded-lg border-2 ${getInsightColor(insight.type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        {getInsightIcon(insight.type)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{insight.title}</h4>
                          <Badge variant="secondary" className="text-xs">
                            {Math.round(insight.confidence * 100)}%
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">
                          {insight.description}
                        </p>
                        
                        {insight.actionable && (
                          <div className="flex items-center space-x-2">
                            <Button size="sm" variant="outline">
                              Apply Suggestion
                            </Button>
                            <Button size="sm" variant="ghost">
                              Learn More
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDismissInsight(insight.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
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
            <Target className="w-5 h-5 mr-2" />
            Recommended Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
            >
              <div className="text-left">
                <div className="font-medium">Optimize Work Schedule</div>
                <div className="text-sm text-muted-foreground">
                  Based on your patterns, consider scheduling focused work during morning hours
                </div>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
            >
              <div className="text-left">
                <div className="font-medium">Set Time Tracking Reminders</div>
                <div className="text-sm text-muted-foreground">
                  Enable smart reminders to improve time entry consistency
                </div>
              </div>
            </Button>
            
            <Button
              variant="outline"
              className="w-full justify-start h-auto p-4"
            >
              <div className="text-left">
                <div className="font-medium">Review Project Allocation</div>
                <div className="text-sm text-muted-foreground">
                  Consider redistributing time across projects for better balance
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
