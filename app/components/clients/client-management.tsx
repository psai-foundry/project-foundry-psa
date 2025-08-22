
'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Plus, 
  Search, 
  Building2, 
  Globe, 
  Mail, 
  Phone, 
  MapPin,
  Edit,
  Eye,
  MoreHorizontal,
  Users
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

interface Client {
  id: string;
  name: string;
  description: string | null;
  industry: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  isActive: boolean;
  createdAt: Date;
  contacts?: Array<{
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
    role?: string;
    isPrimary: boolean;
  }>;
  projects?: Array<{
    id: string;
    name: string;
    status: string;
  }>;
}

interface ClientManagementProps {
  onClientSelect?: (client: Client) => void;
  viewMode?: 'table' | 'cards';
}

export default function ClientManagement({ onClientSelect, viewMode = 'table' }: ClientManagementProps) {
  const { data: session } = useSession();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  
  const [newClient, setNewClient] = useState({
    name: '',
    description: '',
    industry: '',
    website: '',
    email: '',
    phone: '',
    address: '',
    contacts: [
      {
        firstName: '',
        lastName: '',
        email: '',
        role: '',
        isPrimary: true,
      }
    ],
  });

  useEffect(() => {
    fetchClients();
  }, [search]);

  const fetchClients = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        includeContacts: 'true',
        includeProjects: 'true',
        limit: '100',
      });

      if (search) params.append('search', search);

      const response = await fetch(`/api/clients?${params}`);
      const data = await response.json();

      if (response.ok) {
        setClients(data.data || []);
      } else {
        console.error('Error fetching clients:', data.error);
      }
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateClient = async () => {
    try {
      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...newClient,
          contacts: newClient.contacts.filter(c => c.firstName && c.lastName),
        }),
      });

      if (response.ok) {
        setIsCreateDialogOpen(false);
        resetNewClient();
        fetchClients();
      } else {
        const data = await response.json();
        console.error('Error creating client:', data.error);
      }
    } catch (error) {
      console.error('Error creating client:', error);
    }
  };

  const handleUpdateClient = async (clientId: string, updates: Partial<Client>) => {
    try {
      const response = await fetch(`/api/clients/${clientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (response.ok) {
        setIsEditDialogOpen(false);
        fetchClients();
      } else {
        const data = await response.json();
        console.error('Error updating client:', data.error);
      }
    } catch (error) {
      console.error('Error updating client:', error);
    }
  };

  const resetNewClient = () => {
    setNewClient({
      name: '',
      description: '',
      industry: '',
      website: '',
      email: '',
      phone: '',
      address: '',
      contacts: [
        {
          firstName: '',
          lastName: '',
          email: '',
          role: '',
          isPrimary: true,
        }
      ],
    });
  };

  const addContact = () => {
    setNewClient({
      ...newClient,
      contacts: [...newClient.contacts, {
        firstName: '',
        lastName: '',
        email: '',
        role: '',
        isPrimary: false,
      }],
    });
  };

  const removeContact = (index: number) => {
    const updatedContacts = newClient.contacts.filter((_, i) => i !== index);
    setNewClient({ ...newClient, contacts: updatedContacts });
  };

  const updateContact = (index: number, field: string, value: any) => {
    const updatedContacts = [...newClient.contacts];
    updatedContacts[index] = { ...updatedContacts[index], [field]: value };
    setNewClient({ ...newClient, contacts: updatedContacts });
  };

  const canManageClients = ['ADMIN', 'MANAGER'].includes(session?.user?.role || '');

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Client Management</h2>
          <p className="text-gray-600">Manage your clients and their information</p>
        </div>
        {canManageClients && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                New Client
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Create New Client</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h4 className="font-medium">Basic Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Company Name *</Label>
                      <Input
                        id="name"
                        value={newClient.name}
                        onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                        placeholder="Enter company name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="industry">Industry</Label>
                      <Input
                        id="industry"
                        value={newClient.industry}
                        onChange={(e) => setNewClient({ ...newClient, industry: e.target.value })}
                        placeholder="e.g., Technology, Healthcare"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newClient.description}
                      onChange={(e) => setNewClient({ ...newClient, description: e.target.value })}
                      placeholder="Brief description of the client"
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={newClient.website}
                        onChange={(e) => setNewClient({ ...newClient, website: e.target.value })}
                        placeholder="https://example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newClient.email}
                        onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                        placeholder="info@company.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newClient.phone}
                        onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={newClient.address}
                      onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                      placeholder="Company address"
                    />
                  </div>
                </div>

                {/* Contacts */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Contacts</h4>
                    <Button type="button" variant="outline" size="sm" onClick={addContact}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Contact
                    </Button>
                  </div>
                  {newClient.contacts.map((contact, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium">Contact {index + 1}</h5>
                          {newClient.contacts.length > 1 && (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => removeContact(index)}
                              className="text-red-600"
                            >
                              Remove
                            </Button>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>First Name</Label>
                            <Input
                              value={contact.firstName}
                              onChange={(e) => updateContact(index, 'firstName', e.target.value)}
                              placeholder="First name"
                            />
                          </div>
                          <div>
                            <Label>Last Name</Label>
                            <Input
                              value={contact.lastName}
                              onChange={(e) => updateContact(index, 'lastName', e.target.value)}
                              placeholder="Last name"
                            />
                          </div>
                          <div>
                            <Label>Email</Label>
                            <Input
                              type="email"
                              value={contact.email}
                              onChange={(e) => updateContact(index, 'email', e.target.value)}
                              placeholder="email@company.com"
                            />
                          </div>
                          <div>
                            <Label>Role</Label>
                            <Input
                              value={contact.role}
                              onChange={(e) => updateContact(index, 'role', e.target.value)}
                              placeholder="e.g., Project Manager"
                            />
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={`primary-${index}`}
                            checked={contact.isPrimary}
                            onChange={(e) => updateContact(index, 'isPrimary', e.target.checked)}
                            className="rounded border-gray-300"
                          />
                          <Label htmlFor={`primary-${index}`}>Primary contact</Label>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="flex gap-2 pt-4">
                  <Button onClick={handleCreateClient} disabled={!newClient.name}>
                    Create Client
                  </Button>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Clients Table */}
      <Card>
        <CardHeader>
          <CardTitle>Clients ({clients.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead>Contact</TableHead>
                  <TableHead>Projects</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id} className="hover:bg-gray-50">
                    <TableCell>
                      <div>
                        <div className="font-medium text-gray-900">{client.name}</div>
                        {client.website && (
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <Globe className="h-3 w-3" />
                            <a 
                              href={client.website} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:text-blue-600"
                            >
                              {client.website}
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-gray-600">{client.industry || 'Not specified'}</span>
                    </TableCell>
                    <TableCell>
                      {client.contacts?.find(c => c.isPrimary) ? (
                        <div>
                          <div className="font-medium text-sm">
                            {client.contacts.find(c => c.isPrimary)?.firstName} {client.contacts.find(c => c.isPrimary)?.lastName}
                          </div>
                          {client.contacts.find(c => c.isPrimary)?.email && (
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {client.contacts.find(c => c.isPrimary)?.email}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500">No primary contact</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">{client.projects?.length || 0} projects</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={client.isActive ? 'default' : 'secondary'}>
                        {client.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => {
                            setSelectedClient(client);
                            setIsViewDialogOpen(true);
                          }}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          {canManageClients && (
                            <DropdownMenuItem onClick={() => {
                              setSelectedClient(client);
                              setIsEditDialogOpen(true);
                            }}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Client
                            </DropdownMenuItem>
                          )}
                          {onClientSelect && (
                            <DropdownMenuItem onClick={() => onClientSelect(client)}>
                              <Users className="mr-2 h-4 w-4" />
                              Select Client
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {clients.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No clients found</h3>
              <p className="text-gray-500 mb-4">
                {search ? 'Try adjusting your search terms' : 'Get started by creating your first client'}
              </p>
              {canManageClients && !search && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  Create First Client
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Client Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Client Details</DialogTitle>
          </DialogHeader>
          {selectedClient && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">{selectedClient.name}</h3>
                {selectedClient.description && (
                  <p className="text-gray-600 mb-4">{selectedClient.description}</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedClient.industry && (
                    <div>
                      <Label>Industry</Label>
                      <p className="text-gray-900">{selectedClient.industry}</p>
                    </div>
                  )}
                  {selectedClient.website && (
                    <div>
                      <Label>Website</Label>
                      <a 
                        href={selectedClient.website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {selectedClient.website}
                      </a>
                    </div>
                  )}
                  {selectedClient.email && (
                    <div>
                      <Label>Email</Label>
                      <p className="text-gray-900">{selectedClient.email}</p>
                    </div>
                  )}
                  {selectedClient.phone && (
                    <div>
                      <Label>Phone</Label>
                      <p className="text-gray-900">{selectedClient.phone}</p>
                    </div>
                  )}
                </div>
                {selectedClient.address && (
                  <div className="mt-4">
                    <Label>Address</Label>
                    <p className="text-gray-900">{selectedClient.address}</p>
                  </div>
                )}
              </div>

              {selectedClient.contacts && selectedClient.contacts.length > 0 && (
                <div>
                  <h4 className="font-medium mb-4">Contacts</h4>
                  <div className="space-y-3">
                    {selectedClient.contacts.map((contact) => (
                      <Card key={contact.id} className="p-4">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-medium">
                              {contact.firstName} {contact.lastName}
                              {contact.isPrimary && (
                                <Badge variant="secondary" className="ml-2">Primary</Badge>
                              )}
                            </p>
                            {contact.email && <p className="text-sm text-gray-600">{contact.email}</p>}
                            {contact.role && <p className="text-sm text-gray-500">{contact.role}</p>}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {selectedClient.projects && selectedClient.projects.length > 0 && (
                <div>
                  <h4 className="font-medium mb-4">Projects ({selectedClient.projects.length})</h4>
                  <div className="space-y-2">
                    {selectedClient.projects.map((project) => (
                      <div key={project.id} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                        <span>{project.name}</span>
                        <Badge>{project.status}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
