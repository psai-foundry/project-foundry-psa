
import { Metadata } from 'next';
import ClientManagement from '@/components/clients/client-management';

export const metadata: Metadata = {
  title: 'Clients | Project Foundry PSA',
  description: 'Manage your clients and their contact information',
};

export default function ClientsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ClientManagement />
    </div>
  );
}
