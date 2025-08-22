
'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface Resource {
  name: string;
  role: string;
  department: string;
  employmentType: string;
  cost: number;
  utilization: number;
  skills: string[];
  status: 'active' | 'inactive' | 'on-leave';
  startDate: string;
  manager: string;
}

interface AddResourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (resource: Resource) => void;
}

export function AddResourceModal({ isOpen, onClose, onAdd }: AddResourceModalProps) {
  const [formData, setFormData] = useState<Resource>({
    name: '',
    role: '',
    department: '',
    employmentType: '',
    cost: 0,
    utilization: 0,
    skills: [],
    status: 'active',
    startDate: '',
    manager: ''
  });
  const [newSkill, setNewSkill] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API call
      onAdd(formData);
      handleReset();
    } catch (error) {
      console.error('Error adding resource:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setFormData({
      name: '',
      role: '',
      department: '',
      employmentType: '',
      cost: 0,
      utilization: 0,
      skills: [],
      status: 'active',
      startDate: '',
      manager: ''
    });
    setNewSkill('');
  };

  const addSkill = () => {
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData({
        ...formData,
        skills: [...formData.skills, newSkill.trim()]
      });
      setNewSkill('');
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setFormData({
      ...formData,
      skills: formData.skills.filter(skill => skill !== skillToRemove)
    });
  };

  const handleInputChange = (field: keyof Resource, value: any) => {
    setFormData({
      ...formData,
      [field]: value
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Resource</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Information */}
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Enter full name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role/Position *</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                placeholder="e.g., Senior Developer"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              <Select
                value={formData.department}
                onValueChange={(value) => handleInputChange('department', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Engineering">Engineering</SelectItem>
                  <SelectItem value="Design">Design</SelectItem>
                  <SelectItem value="Operations">Operations</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="HR">Human Resources</SelectItem>
                  <SelectItem value="Finance">Finance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="employmentType">Employment Type *</Label>
              <Select
                value={formData.employmentType}
                onValueChange={(value) => handleInputChange('employmentType', value)}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employment type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Full Time">Full Time</SelectItem>
                  <SelectItem value="Part Time">Part Time</SelectItem>
                  <SelectItem value="Contract">Contract</SelectItem>
                  <SelectItem value="Freelance">Freelance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="manager">Manager</Label>
              <Input
                id="manager"
                value={formData.manager}
                onChange={(e) => handleInputChange('manager', e.target.value)}
                placeholder="Manager's name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="startDate">Start Date *</Label>
              <Input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cost">Annual Cost (USD) *</Label>
              <Input
                id="cost"
                type="number"
                value={formData.cost || ''}
                onChange={(e) => handleInputChange('cost', parseInt(e.target.value) || 0)}
                placeholder="65000"
                required
                min="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="utilization">Current Utilization (%)</Label>
              <Input
                id="utilization"
                type="number"
                value={formData.utilization || ''}
                onChange={(e) => handleInputChange('utilization', parseInt(e.target.value) || 0)}
                placeholder="80"
                min="0"
                max="100"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value: 'active' | 'inactive' | 'on-leave') => 
                  handleInputChange('status', value)
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="on-leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Skills Section */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="skills">Skills</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  id="skills"
                  value={newSkill}
                  onChange={(e) => setNewSkill(e.target.value)}
                  placeholder="Add a skill (e.g., React, Python, Project Management)"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      addSkill();
                    }
                  }}
                />
                <Button type="button" onClick={addSkill}>
                  Add
                </Button>
              </div>
            </div>

            {formData.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.skills.map((skill, index) => (
                  <Badge key={index} variant="secondary" className="pr-1">
                    {skill}
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="ml-2 hover:bg-gray-200 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Adding...' : 'Add Resource'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
