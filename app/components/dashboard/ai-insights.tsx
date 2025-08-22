
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Brain, TrendingUp, Clock, AlertCircle, X, CheckCircle } from 'lucide-react';

interface AIInsightsProps {
  insights: Array<{
    id: string;
    type: 'PRODUCTIVITY_PATTERN' | 'TIME_OPTIMIZATION' | 'PROJECT_SUGGESTION' | 'BILLING_ANOMALY' | 'DUPLICATE_DETECTION';
    title: string;
    description: string;
    confidence: number;
    actionable: boolean;
    createdAt: Date;
  }>;
  onDismiss: (id: string) => void;
}

export function AIInsights({ insights, onDismiss }: AIInsightsProps) {
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'PRODUCTIVITY_PATTERN':
        return TrendingUp;
      case 'TIME_OPTIMIZATION':
        return Clock;
      case 'PROJECT_SUGGESTION':
        return CheckCircle;
      case 'BILLING_ANOMALY':
        return AlertCircle;
      case 'DUPLICATE_DETECTION':
        return AlertCircle;
      default:
        return Brain;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'PRODUCTIVITY_PATTERN':
        return 'bg-green-100 text-green-800';
      case 'TIME_OPTIMIZATION':
        return 'bg-blue-100 text-blue-800';
      case 'PROJECT_SUGGESTION':
        return 'bg-purple-100 text-purple-800';
      case 'BILLING_ANOMALY':
        return 'bg-yellow-100 text-yellow-800';
      case 'DUPLICATE_DETECTION':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-sm">
          <Brain className="w-4 h-4 mr-2 text-purple-500" />
          AI Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        {insights.length === 0 ? (
          <p className="text-sm text-muted-foreground">No insights available</p>
        ) : (
          <div className="space-y-4">
            {insights.map((insight) => {
              const Icon = getInsightIcon(insight.type);
              return (
                <div key={insight.id} className="border border-gray-200 rounded-lg p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <Icon className="w-4 h-4 text-purple-500" />
                      <Badge variant="secondary" className={getInsightColor(insight.type)}>
                        {insight.type.replace('_', ' ')}
                      </Badge>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDismiss(insight.id)}
                      className="h-6 w-6 p-0"
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                  <h4 className="text-sm font-medium mb-1">{insight.title}</h4>
                  <p className="text-xs text-muted-foreground mb-2">{insight.description}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Confidence: {Math.round(insight.confidence * 100)}%</span>
                    <span>{new Date(insight.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
