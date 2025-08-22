
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Play, Pause, Square, Clock } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface RunningTimerProps {
  timer: {
    id: string;
    startTime: Date;
    description: string;
    project: {
      name: string;
      client: {
        name: string;
      };
    };
    task?: {
      name: string;
    };
  } | null;
  onStop: () => void;
  onPause: () => void;
}

export function RunningTimer({ timer, onStop, onPause }: RunningTimerProps) {
  const [currentDuration, setCurrentDuration] = useState(0);

  useEffect(() => {
    if (!timer) return;

    const updateDuration = () => {
      const now = new Date();
      const startTime = new Date(timer.startTime);
      const durationInHours = (now.getTime() - startTime.getTime()) / (1000 * 60 * 60);
      setCurrentDuration(durationInHours);
    };

    updateDuration();
    const interval = setInterval(updateDuration, 1000);

    return () => clearInterval(interval);
  }, [timer]);

  if (!timer) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-sm">
            <Clock className="w-4 h-4 mr-2" />
            Active Timer
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No active timer</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center text-sm">
          <Clock className="w-4 h-4 mr-2 text-green-500" />
          Active Timer
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between">
            <div className="text-2xl font-bold font-mono">
              {formatDuration(currentDuration)}
            </div>
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Running
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Started at {new Date(timer.startTime).toLocaleTimeString()}
          </p>
        </div>

        <div className="space-y-2">
          <div>
            <p className="text-sm font-medium">{timer.project.name}</p>
            <p className="text-xs text-muted-foreground">{timer.project.client.name}</p>
          </div>
          {timer.task && (
            <div>
              <p className="text-sm text-muted-foreground">Task: {timer.task.name}</p>
            </div>
          )}
          {timer.description && (
            <div>
              <p className="text-sm text-muted-foreground">"{timer.description}"</p>
            </div>
          )}
        </div>

        <div className="flex space-x-2">
          <Button onClick={onPause} variant="outline" size="sm">
            <Pause className="w-4 h-4 mr-2" />
            Pause
          </Button>
          <Button onClick={onStop} variant="outline" size="sm">
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
