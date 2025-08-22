
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Clock, 
  Lightbulb, 
  Star,
  TrendingUp,
  Calendar
} from 'lucide-react';
import { ProjectTaskSelector } from './project-task-selector';
import { toast } from 'sonner';

interface TimerStartProps {
  onTimerStart: (timer: any) => void;
  disabled?: boolean;
}

interface Suggestion {
  id: string;
  type: 'pattern' | 'recent_project' | 'recent_task';
  confidence: number;
  project: any;
  task?: any;
  suggestedDuration: number;
  description: string;
  metadata: any;
}

export function TimerStart({ onTimerStart, disabled = false }: TimerStartProps) {
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState<string | undefined>();
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  const fetchSuggestions = async () => {
    try {
      setLoadingSuggestions(true);
      const now = new Date();
      const timeOfDay = now.getHours() < 12 ? 'morning' : 
                       now.getHours() < 17 ? 'afternoon' : 'evening';
      
      const response = await fetch(`/api/timesheets/suggestions?context=${timeOfDay}`);
      if (response.ok) {
        const data = await response.json();
        setSuggestions(data.data.suggestions || []);
      }
    } catch (error) {
      console.error('Error fetching suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, []);

  const handleStartTimer = async () => {
    if (!projectId) {
      toast.error('Please select a project');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/timer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          projectId,
          taskId,
          description,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        onTimerStart(data.data);
        toast.success('Timer started successfully');
        
        // Reset form
        setProjectId('');
        setTaskId(undefined);
        setDescription('');
      } else {
        const error = await response.json();
        toast.error(error.message || 'Failed to start timer');
      }
    } catch (error) {
      console.error('Error starting timer:', error);
      toast.error('Failed to start timer');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: Suggestion) => {
    setProjectId(suggestion.project.id);
    setTaskId(suggestion.task?.id);
    setDescription(suggestion.description);
  };

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'pattern':
        return <TrendingUp className="w-4 h-4 text-blue-500" />;
      case 'recent_project':
        return <Star className="w-4 h-4 text-yellow-500" />;
      case 'recent_task':
        return <Calendar className="w-4 h-4 text-green-500" />;
      default:
        return <Lightbulb className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Main Timer Start Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            Start New Timer
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <ProjectTaskSelector
            projectId={projectId}
            taskId={taskId}
            onProjectChange={setProjectId}
            onTaskChange={setTaskId}
            disabled={disabled}
          />

          <div className="space-y-2">
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What are you working on?"
              rows={3}
              disabled={disabled}
            />
          </div>

          <Button
            onClick={handleStartTimer}
            disabled={!projectId || loading || disabled}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            <Play className="w-4 h-4 mr-2" />
            {loading ? 'Starting Timer...' : 'Start Timer'}
          </Button>
        </CardContent>
      </Card>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lightbulb className="w-5 h-5 mr-2" />
              AI Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingSuggestions ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              </div>
            ) : (
              <div className="space-y-3">
                {suggestions.slice(0, 5).map((suggestion) => (
                  <Button
                    key={suggestion.id}
                    variant="outline"
                    className="w-full text-left h-auto p-4 hover:bg-gray-50"
                    onClick={() => handleSuggestionClick(suggestion)}
                    disabled={disabled}
                  >
                    <div className="flex items-start space-x-3 w-full">
                      <div className="flex-shrink-0 mt-1">
                        {getSuggestionIcon(suggestion.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium">{suggestion.project.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {suggestion.project.code}
                          </Badge>
                          <Badge 
                            variant="secondary" 
                            className="text-xs"
                          >
                            {Math.round(suggestion.confidence * 100)}%
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground mb-1">
                          {suggestion.project.client.name}
                        </div>
                        {suggestion.task && (
                          <div className="text-sm font-medium text-blue-600 mb-1">
                            Task: {suggestion.task.name}
                          </div>
                        )}
                        <div className="text-xs text-muted-foreground">
                          {suggestion.description}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Suggested duration: {suggestion.suggestedDuration}h
                        </div>
                      </div>
                    </div>
                  </Button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Star className="w-5 h-5 mr-2" />
            Quick Actions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="justify-start h-auto p-3"
              disabled={disabled}
            >
              <div className="text-left">
                <div className="font-medium">Continue Yesterday</div>
                <div className="text-xs text-muted-foreground">
                  Resume last project
                </div>
              </div>
            </Button>
            <Button
              variant="outline"
              className="justify-start h-auto p-3"
              disabled={disabled}
            >
              <div className="text-left">
                <div className="font-medium">Start Meeting</div>
                <div className="text-xs text-muted-foreground">
                  Track meeting time
                </div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
