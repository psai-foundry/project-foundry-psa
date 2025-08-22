
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Brain, 
  TrendingUp, 
  AlertTriangle, 
  Users, 
  Clock, 
  Target, 
  X,
  Lightbulb,
  Calendar,
  BarChart3
} from 'lucide-react';
import Link from 'next/link';

interface ResourceInsight {
  id: string;
  title: string;
  description: string;
  type: 'optimization' | 'alert' | 'opportunity' | 'forecast';
  priority: 'high' | 'medium' | 'low';
  impact: string;
  actionText: string;
  actionUrl: string;
  metrics?: {
    value: number;
    label: string;
    change?: number;
  };
}

interface ResourceInsightsProps {
  userRole?: string;
  onDismiss?: (id: string) => void;
}

export function ResourceInsights({ userRole, onDismiss }: ResourceInsightsProps) {
  const [insights, setInsights] = useState<ResourceInsight[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchResourceInsights = async () => {
      try {
        const response = await fetch('/api/dashboard/resource-insights');
        if (response.ok) {
          const data = await response.json();
          setInsights(data.insights || []);
        }
      } catch (error) {
        console.error('Error fetching resource insights:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchResourceInsights();
  }, []);

  const handleDismiss = (insightId: string) => {
    setInsights(insights.filter(insight => insight.id !== insightId));
    onDismiss?.(insightId);
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'optimization': return TrendingUp;
      case 'alert': return AlertTriangle;
      case 'opportunity': return Lightbulb;
      case 'forecast': return BarChart3;
      default: return Brain;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'optimization': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'alert': return 'text-red-600 bg-red-50 border-red-200';
      case 'opportunity': return 'text-green-600 bg-green-50 border-green-200';
      case 'forecast': return 'text-purple-600 bg-purple-50 border-purple-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Resource Intelligence
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Resource Intelligence
          {insights.length > 0 && (
            <Badge variant="secondary">{insights.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length > 0 ? (
          <div className="space-y-4">
            {insights.slice(0, 3).map((insight) => {
              const IconComponent = getTypeIcon(insight.type);
              return (
                <div
                  key={insight.id}
                  className={`relative p-4 rounded-lg border ${getTypeColor(insight.type)}`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 flex-1">
                      <IconComponent className="h-5 w-5 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-semibold">{insight.title}</h4>
                          <Badge className={getPriorityColor(insight.priority)}>
                            {insight.priority}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {insight.description}
                        </p>
                        
                        {insight.metrics && (
                          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-2">
                            <span className="font-medium">
                              {insight.metrics.value} {insight.metrics.label}
                            </span>
                            {insight.metrics.change !== undefined && (
                              <span className={`flex items-center gap-1 ${
                                insight.metrics.change > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                <TrendingUp className="h-3 w-3" />
                                {insight.metrics.change > 0 ? '+' : ''}{insight.metrics.change}%
                              </span>
                            )}
                          </div>
                        )}

                        <div className="flex items-center gap-2">
                          <Button size="sm" variant="outline" asChild>
                            <Link href={insight.actionUrl}>
                              {insight.actionText}
                            </Link>
                          </Button>
                          <span className="text-xs text-muted-foreground">
                            Impact: {insight.impact}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                      onClick={() => handleDismiss(insight.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {insights.length > 3 && (
              <div className="pt-2 border-t">
                <Button variant="outline" size="sm" className="w-full" asChild>
                  <Link href="/dashboard/insights">
                    View All {insights.length} Insights
                  </Link>
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-6">
            <Lightbulb className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No resource insights available at the moment
            </p>
            <p className="text-xs text-muted-foreground">
              Check back later for AI-powered resource recommendations
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
