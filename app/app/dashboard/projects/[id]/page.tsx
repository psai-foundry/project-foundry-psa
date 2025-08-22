
import { Metadata } from 'next';
import ProjectDetail from '@/components/projects/project-detail';

export const metadata: Metadata = {
  title: 'Project Details | Project Foundry PSA',
  description: 'View and manage project details, tasks, and team',
};

interface ProjectPageProps {
  params: {
    id: string;
  };
}

export default function ProjectPage({ params }: ProjectPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <ProjectDetail projectId={params.id} />
    </div>
  );
}
