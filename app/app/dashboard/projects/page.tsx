
import { Metadata } from 'next';
import ProjectList from '@/components/projects/project-list';

export const metadata: Metadata = {
  title: 'Projects | Project Foundry PSA',
  description: 'Manage your projects and track their progress',
};

export default function ProjectsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ProjectList />
    </div>
  );
}
