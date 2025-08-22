
'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  FolderOpen, 
  Star, 
  Building, 
  ChevronRight,
  Clock,
  Briefcase
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Project {
  id: string;
  name: string;
  code: string;
  client: {
    name: string;
  };
  tasks: Task[];
  status: string;
}

interface Task {
  id: string;
  name: string;
  status: string;
  estimatedHours?: number;
}

interface ProjectTaskSelectorProps {
  projectId: string;
  taskId?: string;
  onProjectChange: (projectId: string) => void;
  onTaskChange: (taskId: string | undefined) => void;
  disabled?: boolean;
}

interface ProjectsData {
  portfolios: any[];
  orphanProjects: any[];
}

export function ProjectTaskSelector({
  projectId,
  taskId,
  onProjectChange,
  onTaskChange,
  disabled = false
}: ProjectTaskSelectorProps) {
  const [projects, setProjects] = useState<ProjectsData | null>(null);
  const [favorites, setFavorites] = useState<Project[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [projectOpen, setProjectOpen] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/projects/hierarchical');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.data || { portfolios: [], orphanProjects: [] });
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchFavorites = async () => {
    try {
      const response = await fetch('/api/projects/favorites');
      if (response.ok) {
        const data = await response.json();
        setFavorites(data.data);
      }
    } catch (error) {
      console.error('Error fetching favorites:', error);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchFavorites();
  }, []);

  useEffect(() => {
    if (projectId && projects) {
      const findProject = (items: any[]): Project | null => {
        for (const item of items) {
          if (item.type === 'project' && item.id === projectId) {
            return item;
          }
          if (item.projects) {
            const found = findProject(item.projects);
            if (found) return found;
          }
          if (item.programs) {
            for (const program of item.programs) {
              const found = findProject(program.projects);
              if (found) return found;
            }
          }
        }
        return null;
      };

      const portfolios = projects.portfolios || [];
      const orphanProjects = projects.orphanProjects || [];
      const project = findProject([...portfolios, ...orphanProjects]);
      setSelectedProject(project);
    }
  }, [projectId, projects]);

  const getAllProjects = (): Project[] => {
    const allProjects: Project[] = [];
    
    const extractProjects = (items: any[]) => {
      items.forEach(item => {
        if (item.type === 'project') {
          allProjects.push(item);
        } else if (item.projects) {
          extractProjects(item.projects);
        } else if (item.programs) {
          item.programs.forEach((program: any) => {
            extractProjects(program.projects);
          });
        }
      });
    };

    if (projects && projects.portfolios) {
      extractProjects(projects.portfolios);
    }
    if (projects && projects.orphanProjects) {
      extractProjects(projects.orphanProjects);
    }

    return allProjects;
  };

  const filteredProjects = getAllProjects().filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    onProjectChange(project.id);
    onTaskChange(undefined); // Reset task selection
    setProjectOpen(false);
  };

  const handleTaskSelect = (value: string) => {
    onTaskChange(value === 'no-task' ? undefined : value);
  };

  const renderProjectHierarchy = (items: any[], level = 0) => {
    return items.map((item) => (
      <div key={item.id} className="space-y-1">
        {item.type === 'portfolio' && (
          <div className="space-y-2">
            <div className="flex items-center space-x-2 py-2 text-sm font-medium text-gray-700">
              <Building className="w-4 h-4" />
              <span>{item.name}</span>
            </div>
            {item.projects && item.projects.length > 0 && (
              <div className="ml-4 space-y-1">
                {renderProjectHierarchy(item.projects, level + 1)}
              </div>
            )}
            {item.programs && item.programs.length > 0 && (
              <div className="ml-4 space-y-1">
                {item.programs.map((program: any) => (
                  <div key={program.id} className="space-y-1">
                    <div className="flex items-center space-x-2 py-1 text-sm font-medium text-gray-600">
                      <Briefcase className="w-3 h-3" />
                      <span>{program.name}</span>
                    </div>
                    {program.projects && program.projects.length > 0 && (
                      <div className="ml-4 space-y-1">
                        {renderProjectHierarchy(program.projects, level + 2)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {item.type === 'project' && (
          <Button
            variant="ghost"
            className="w-full justify-start text-left h-auto p-2"
            onClick={() => handleProjectSelect(item)}
          >
            <div className="flex items-center space-x-2 w-full">
              <FolderOpen className="w-4 h-4 text-blue-500" />
              <div className="flex-1">
                <div className="font-medium">{item.name}</div>
                <div className="text-xs text-muted-foreground">{item.client.name}</div>
              </div>
              <Badge variant="outline" className="text-xs">
                {item.code}
              </Badge>
            </div>
          </Button>
        )}
      </div>
    ));
  };

  return (
    <div className="space-y-4">
      {/* Project Selector */}
      <div className="space-y-2">
        <Label>Project</Label>
        <Popover open={projectOpen} onOpenChange={setProjectOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              aria-expanded={projectOpen}
              className="w-full justify-between"
              disabled={disabled}
            >
              {selectedProject ? (
                <div className="flex items-center space-x-2">
                  <FolderOpen className="w-4 h-4" />
                  <span>{selectedProject.name}</span>
                  <Badge variant="outline" className="text-xs">
                    {selectedProject.code}
                  </Badge>
                </div>
              ) : (
                <span>Select project...</span>
              )}
              <ChevronRight className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-96 p-0">
            <div className="p-4 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search projects..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <ScrollArea className="h-96">
              {/* Favorites Section */}
              {favorites.length > 0 && !searchTerm && (
                <div className="p-4 border-b">
                  <div className="flex items-center space-x-2 mb-3 text-sm font-medium text-gray-700">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span>Favorites</span>
                  </div>
                  <div className="space-y-1">
                    {favorites.slice(0, 5).map((project) => (
                      <Button
                        key={project.id}
                        variant="ghost"
                        className="w-full justify-start text-left h-auto p-2"
                        onClick={() => handleProjectSelect(project)}
                      >
                        <div className="flex items-center space-x-2 w-full">
                          <FolderOpen className="w-4 h-4 text-blue-500" />
                          <div className="flex-1">
                            <div className="font-medium">{project.name}</div>
                            <div className="text-xs text-muted-foreground">{project.client.name}</div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {project.code}
                          </Badge>
                        </div>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Search Results or Full Hierarchy */}
              <div className="p-4">
                {searchTerm ? (
                  <div className="space-y-1">
                    {filteredProjects.map((project) => (
                      <Button
                        key={project.id}
                        variant="ghost"
                        className="w-full justify-start text-left h-auto p-2"
                        onClick={() => handleProjectSelect(project)}
                      >
                        <div className="flex items-center space-x-2 w-full">
                          <FolderOpen className="w-4 h-4 text-blue-500" />
                          <div className="flex-1">
                            <div className="font-medium">{project.name}</div>
                            <div className="text-xs text-muted-foreground">{project.client.name}</div>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {project.code}
                          </Badge>
                        </div>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {projects && projects.portfolios && renderProjectHierarchy(projects.portfolios)}
                    {projects && projects.orphanProjects && projects.orphanProjects.length > 0 && (
                      <div className="mt-4">
                        <div className="text-sm font-medium text-gray-700 mb-2">Other Projects</div>
                        {renderProjectHierarchy(projects.orphanProjects)}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>

      {/* Task Selector */}
      {selectedProject && (
        <div className="space-y-2">
          <Label>Task (Optional)</Label>
          <Select value={taskId || 'no-task'} onValueChange={handleTaskSelect} disabled={disabled}>
            <SelectTrigger>
              <SelectValue placeholder="Select task (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="no-task">No specific task</SelectItem>
              {selectedProject.tasks?.map((task) => (
                <SelectItem key={task.id} value={task.id}>
                  <div className="flex items-center justify-between w-full">
                    <span>{task.name}</span>
                    {task.estimatedHours && (
                      <Badge variant="outline" className="ml-2">
                        {task.estimatedHours}h
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Project Summary */}
      {selectedProject && (
        <div className="bg-gray-50 rounded-lg p-3">
          <div className="text-sm">
            <div className="font-medium flex items-center">
              <Building className="w-4 h-4 mr-2 text-blue-500" />
              {selectedProject.client.name}
            </div>
            <div className="text-muted-foreground mt-1">
              {selectedProject.tasks?.length || 0} tasks available
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
