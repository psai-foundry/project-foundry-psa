
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Clock, 
  DollarSign, 
  Calendar,
  X,
  Sparkles
} from 'lucide-react';
import { ProjectTaskSelector } from './project-task-selector';
import { format, parseISO } from 'date-fns';
import { toast } from 'sonner';

interface TimeEntryFormProps {
  entry?: any;
  date?: string;
  onSave: (entry: any) => void;
  onCancel: () => void;
  mode?: 'create' | 'edit';
}

export function TimeEntryForm({ 
  entry, 
  date, 
  onSave, 
  onCancel, 
  mode = 'create' 
}: TimeEntryFormProps) {
  const [formData, setFormData] = useState({
    projectId: entry?.projectId || '',
    taskId: entry?.taskId || undefined,
    date: entry?.date || date || format(new Date(), 'yyyy-MM-dd'),
    startTime: entry?.startTime ? format(parseISO(entry.startTime), 'HH:mm') : '',
    endTime: entry?.endTime ? format(parseISO(entry.endTime), 'HH:mm') : '',
    duration: entry?.duration || 0,
    description: entry?.description || '',
    billable: entry?.billable ?? true,
    billRate: entry?.billRate || 0,
  });
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const fetchSuggestions = async () => {
    if (mode === 'create') {
      try {
        const response = await fetch(`/api/timesheets/suggestions?date=${formData.date}`);
        if (response.ok) {
          const data = await response.json();
          setSuggestions(data.data.suggestions || []);
          setShowSuggestions(data.data.suggestions.length > 0);
        }
      } catch (error) {
        console.error('Error fetching suggestions:', error);
      }
    }
  };

  useEffect(() => {
    fetchSuggestions();
  }, [formData.date, mode]);

  const calculateDuration = () => {
    if (formData.startTime && formData.endTime) {
      const start = new Date(`1970-01-01T${formData.startTime}:00`);
      const end = new Date(`1970-01-01T${formData.endTime}:00`);
      const diffMs = end.getTime() - start.getTime();
      const hours = diffMs / (1000 * 60 * 60);
      
      if (hours > 0) {
        setFormData(prev => ({ ...prev, duration: Math.round(hours * 100) / 100 }));
      }
    }
  };

  useEffect(() => {
    calculateDuration();
  }, [formData.startTime, formData.endTime]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.projectId || !formData.duration || formData.duration <= 0) {
      toast.error('Please select a project and enter a valid duration');
      return;
    }

    setLoading(true);
    try {
      const entryData = {
        ...formData,
        startTime: formData.startTime ? `${formData.date}T${formData.startTime}:00` : undefined,
        endTime: formData.endTime ? `${formData.date}T${formData.endTime}:00` : undefined,
      };

      await onSave(entryData);
    } catch (error) {
      console.error('Error saving time entry:', error);
      toast.error('Failed to save time entry');
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setFormData(prev => ({
      ...prev,
      projectId: suggestion.project.id,
      taskId: suggestion.task?.id,
      duration: suggestion.suggestedDuration,
      description: suggestion.description,
    }));
    setShowSuggestions(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center">
            <Clock className="w-5 h-5 mr-2" />
            {mode === 'create' ? 'Add Time Entry' : 'Edit Time Entry'}
          </span>
          <Button variant="ghost" size="sm" onClick={onCancel}>
            <X className="w-4 h-4" />
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* AI Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-3">
                <Sparkles className="w-4 h-4 text-blue-500" />
                <span className="font-medium text-blue-700">AI Suggestions</span>
              </div>
              <div className="space-y-2">
                {suggestions.slice(0, 3).map((suggestion) => (
                  <Button
                    key={suggestion.id}
                    type="button"
                    variant="outline"
                    className="w-full text-left h-auto p-3 bg-white hover:bg-blue-50"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium">{suggestion.project.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {suggestion.suggestedDuration}h - {suggestion.description}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {Math.round(suggestion.confidence * 100)}%
                      </Badge>
                    </div>
                  </Button>
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowSuggestions(false)}
                className="mt-2"
              >
                Hide suggestions
              </Button>
            </div>
          )}

          {/* Project and Task Selection */}
          <ProjectTaskSelector
            projectId={formData.projectId}
            taskId={formData.taskId}
            onProjectChange={(projectId) => setFormData(prev => ({ ...prev, projectId }))}
            onTaskChange={(taskId) => setFormData(prev => ({ ...prev, taskId }))}
          />

          {/* Date and Time */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time (Optional)</Label>
              <Input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time (Optional)</Label>
              <Input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
              />
            </div>
          </div>

          {/* Duration */}
          <div className="space-y-2">
            <Label htmlFor="duration">Duration (Hours)</Label>
            <Input
              id="duration"
              type="number"
              step="0.25"
              min="0"
              max="24"
              value={formData.duration}
              onChange={(e) => setFormData(prev => ({ ...prev, duration: parseFloat(e.target.value) || 0 }))}
              placeholder="e.g., 2.5"
              required
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="What did you work on?"
              rows={3}
            />
          </div>

          {/* Billing Settings */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="billable"
                checked={formData.billable}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, billable: checked }))}
              />
              <Label htmlFor="billable">Billable</Label>
            </div>

            {formData.billable && (
              <div className="space-y-2">
                <Label htmlFor="billRate">Bill Rate ($/hour)</Label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="billRate"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.billRate}
                    onChange={(e) => setFormData(prev => ({ ...prev, billRate: parseFloat(e.target.value) || 0 }))}
                    placeholder="0.00"
                    className="pl-10"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium mb-2">Summary</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span>Duration:</span>
                <span>{formData.duration} hours</span>
              </div>
              {formData.billable && formData.billRate > 0 && (
                <div className="flex justify-between">
                  <span>Estimated Value:</span>
                  <span>${(formData.duration * formData.billRate).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Type:</span>
                <span>{formData.billable ? 'Billable' : 'Non-billable'}</span>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <Button type="button" variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !formData.projectId || !formData.duration}
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Entry'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
