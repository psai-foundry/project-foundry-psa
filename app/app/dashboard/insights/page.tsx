
'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, TrendingUp, Lightbulb, Target } from 'lucide-react';

export default function InsightsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            AI Insights
          </h1>
          <p className="text-muted-foreground mt-1">
            AI-powered insights and productivity recommendations
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Brain className="w-5 h-5 mr-2 text-purple-500" />
            AI Insights & Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <Lightbulb className="w-16 h-16 mx-auto text-purple-500 mb-4" />
            <h3 className="text-xl font-semibold mb-2">AI Insights Module Coming Soon</h3>
            <p className="text-muted-foreground mb-6">
              The AI insights module will provide intelligent recommendations, 
              productivity patterns, and optimization suggestions.
            </p>
            <div className="flex justify-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <TrendingUp className="w-4 h-4" />
                <span>Productivity Patterns</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Target className="w-4 h-4" />
                <span>Time Optimization</span>
              </div>
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Brain className="w-4 h-4" />
                <span>Smart Suggestions</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
