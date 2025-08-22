
import { Metadata } from 'next';
import ProjectForm from '@/components/projects/project-form';

export const metadata: Metadata = {
  title: 'Edit Project | Project Foundry PSA',
  description: 'Edit project details, team assignments, and settings',
};

interface EditProjectPageProps {
  params: {
    id: string;
  };
}

export default function EditProjectPage({ params }: EditProjectPageProps) {
  return (
    <div className="container mx-auto px-4 py-8">
      <ProjectForm projectId={params.id} />
    </div>
  );
}
