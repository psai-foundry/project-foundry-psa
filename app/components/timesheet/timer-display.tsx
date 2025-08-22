
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Play, 
  Pause, 
  Square, 
  Clock, 
  FolderOpen,
  Edit2,
  Save,
  X
} from 'lucide-react';
import { format } from 'date-fns';

interface Timer {
  id: string;
  startTime: string;
  duration: number;
  isRunning: boolean;
  description?: string;
  project: {
    name: string;
    code: string;
    client: {
      name: string;
    };
  };
  task?: {
    name: string;
  };
}

interface TimerDisplayProps {
  timer: Timer;
  onStop: () => void;
  onPause: () => void;
  compact?: boolean;
}

export function TimerDisplay({ timer, onStop, onPause, compact = false }: TimerDisplayProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [description, setDescription] = useState(timer.description || '');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const calculateElapsedTime = () => {
    if (!timer.isRunning) return timer.duration;
    
    const startTime = new Date(timer.startTime);
    const elapsed = (currentTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // Convert to hours
    return elapsed;
  };

  const formatTime = (hours: number) => {
    const totalMinutes = Math.floor(hours * 60);
    const hrs = Math.floor(totalMinutes / 60);
    const mins = totalMinutes % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/timer/${timer.id}/stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description }),
      });

      if (response.ok) {
        onStop();
      }
    } catch (error) {
      console.error('Error stopping timer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePause = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/timer/${timer.id}/pause`, {
        method: 'POST',
      });

      if (response.ok) {
        onPause();
      }
    } catch (error) {
      console.error('Error pausing timer:', error);
    } finally {
      setLoading(false);
    }
  };

  const elapsedTime = calculateElapsedTime();

  if (compact) {
    return (
      <div className="flex items-center space-x-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
        <div className="flex items-center space-x-2">
          <Clock className="w-5 h-5 text-blue-600" />
          <span className="font-mono text-lg font-bold text-blue-600">
            {formatTime(elapsedTime)}
          </span>
        </div>
        
        <div className="flex-1">
          <div className="font-medium">{timer.project.name}</div>
          <div className="text-sm text-muted-foreground">{timer.project.client.name}</div>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={handlePause}
            disabled={loading}
          >
            <Pause className="w-4 h-4" />
          </Button>
          <Button 
            size="sm" 
            onClick={handleStop}
            disabled={loading}
          >
            <Square className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
            <span className="font-semibold text-gray-700">Timer Running</span>
            <Badge variant="outline" className="bg-white">
              Started: {format(new Date(timer.startTime), 'HH:mm')}
            </Badge>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handlePause}
              disabled={loading}
            >
              <Pause className="w-4 h-4 mr-2" />
              Pause
            </Button>
            <Button 
              size="sm" 
              onClick={handleStop}
              disabled={loading}
              className="bg-red-600 hover:bg-red-700"
            >
              <Square className="w-4 h-4 mr-2" />
              Stop
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Elapsed Time */}
            <div className="text-center">
              <div className="font-mono text-4xl font-bold text-blue-600 mb-2">
                {formatTime(elapsedTime)}
              </div>
              <div className="text-sm text-muted-foreground">
                {elapsedTime.toFixed(2)} hours
              </div>
            </div>

            {/* Project Info */}
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center space-x-2 mb-2">
                <FolderOpen className="w-5 h-5 text-blue-500" />
                <span className="font-medium">{timer.project.name}</span>
                <Badge variant="outline">{timer.project.code}</Badge>
              </div>
              <div className="text-sm text-muted-foreground mb-2">
                {timer.project.client.name}
              </div>
              {timer.task && (
                <div className="text-sm font-medium text-blue-600">
                  Task: {timer.task.name}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4">
            {/* Description */}
            <div className="bg-white rounded-lg p-4 border">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium">Description</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? <X className="w-4 h-4" /> : <Edit2 className="w-4 h-4" />}
                </Button>
              </div>
              
              {isEditing ? (
                <div className="space-y-2">
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What are you working on?"
                    rows={3}
                  />
                  <Button 
                    size="sm" 
                    onClick={() => setIsEditing(false)}
                  >
                    <Save className="w-4 h-4 mr-2" />
                    Save
                  </Button>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {description || 'No description yet. Click edit to add one.'}
                </p>
              )}
            </div>

            {/* Timer Stats */}
            <div className="bg-white rounded-lg p-4 border">
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Started:</span>
                  <span>{format(new Date(timer.startTime), 'HH:mm:ss')}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current:</span>
                  <span>{format(currentTime, 'HH:mm:ss')}</span>
                </div>
                <div className="flex justify-between font-medium">
                  <span className="text-muted-foreground">Duration:</span>
                  <span>{formatTime(elapsedTime)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
