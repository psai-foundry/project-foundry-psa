
import { Metadata } from 'next';
import ProjectDashboard from '@/components/projects/project-dashboard';

export const metadata: Metadata = {
  title: 'Project Dashboard | Project Foundry PSA',
  description: 'Overview of projects, team performance, and key metrics',
};

export default function ProjectDashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ProjectDashboard />
    </div>
  );
}
