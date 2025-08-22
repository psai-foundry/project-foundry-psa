
import { Metadata } from 'next';
import ProjectForm from '@/components/projects/project-form';

export const metadata: Metadata = {
  title: 'Create Project | Project Foundry PSA',
  description: 'Create a new project with team assignments and tasks',
};

export default function NewProjectPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ProjectForm />
    </div>
  );
}
