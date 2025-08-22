
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  ExternalLink, 
  AlertTriangle,
  Building2,
  Calendar,
  DollarSign,
  Globe,
  Zap
} from 'lucide-react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-hot-toast';

interface XeroConnectionData {
  connected: boolean;
  status?: {
    connected: boolean;
    organizationName?: string;
    lastSync?: string;
    error?: string;
    tenantId?: string;
  };
  organization?: {
    name: string;
    legalName: string;
    baseCurrency: string;
    countryCode: string;
    isDemoCompany: boolean;
    organisationStatus: string;
    organisationType: string;
  };
  timestamp: string;
}

export function XeroConnectionStatus() {
  const { data: session } = useSession() || {};
  const [connectionData, setConnectionData] = useState<XeroConnectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const isAdmin = session?.user?.role === 'ADMIN';
  const canViewXero = ['ADMIN', 'MANAGER'].includes(session?.user?.role || '');

  const fetchConnectionStatus = async () => {
    if (!canViewXero) {
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/xero/status');
      if (response.ok) {
        const data = await response.json();
        setConnectionData(data);
      } else {
        const error = await response.json();
        toast.error(`Failed to fetch Xero status: ${error.error}`);
      }
    } catch (error) {
      console.error('Error fetching Xero status:', error);
      toast.error('Failed to fetch Xero connection status');
    } finally {
      setLoading(false);
    }
  };

  const testConnection = async () => {
    if (!canViewXero) return;

    setTesting(true);
    try {
      const response = await fetch('/api/xero/test');
      const data = await response.json();
      
      if (response.ok && data.connected) {
        setConnectionData(data);
        toast.success('Xero connection test successful!');
      } else {
        toast.error(`Connection test failed: ${data.error || 'Unknown error'}`);
        setConnectionData(data);
      }
    } catch (error) {
      console.error('Error testing Xero connection:', error);
      toast.error('Failed to test Xero connection');
    } finally {
      setTesting(false);
    }
  };

  const connectToXero = async () => {
    if (!isAdmin) return;

    setConnecting(true);
    try {
      const response = await fetch('/api/xero/connect');
      const data = await response.json();
      
      if (response.ok && data.authorizationUrl) {
        // Redirect to Xero authorization page
        window.location.href = data.authorizationUrl;
      } else {
        toast.error(`Failed to initiate Xero connection: ${data.error}`);
      }
    } catch (error) {
      console.error('Error connecting to Xero:', error);
      toast.error('Failed to initiate Xero connection');
    } finally {
      setConnecting(false);
    }
  };

  const disconnectFromXero = async () => {
    if (!isAdmin) return;

    if (!confirm('Are you sure you want to disconnect from Xero? This will stop all automated syncing.')) {
      return;
    }

    setDisconnecting(true);
    try {
      const response = await fetch('/api/xero/disconnect', {
        method: 'POST'
      });
      
      if (response.ok) {
        toast.success('Successfully disconnected from Xero');
        await fetchConnectionStatus(); // Refresh status
      } else {
        const error = await response.json();
        toast.error(`Failed to disconnect: ${error.error}`);
      }
    } catch (error) {
      console.error('Error disconnecting from Xero:', error);
      toast.error('Failed to disconnect from Xero');
    } finally {
      setDisconnecting(false);
    }
  };

  useEffect(() => {
    fetchConnectionStatus();
  }, [canViewXero]);

  // Check URL parameters for OAuth callback status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const xeroConnected = urlParams.get('xero_connected');
    const xeroError = urlParams.get('xero_error');

    if (xeroConnected === 'true') {
      toast.success('Successfully connected to Xero!');
      fetchConnectionStatus();
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    } else if (xeroError) {
      toast.error(`Xero connection failed: ${decodeURIComponent(xeroError)}`);
      // Clean up URL parameters
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  if (!canViewXero) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-blue-600" />
            Xero Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <AlertTriangle className="w-12 h-12 mx-auto text-yellow-500 mb-3" />
            <p className="text-muted-foreground">
              Access restricted to administrators and managers.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-blue-600" />
            Xero Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6">
            <RefreshCw className="w-8 h-8 mx-auto animate-spin text-blue-500 mb-3" />
            <p className="text-muted-foreground">Loading Xero connection status...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isConnected = connectionData?.connected || connectionData?.status?.connected;
  const organization = connectionData?.organization;
  const status = connectionData?.status;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center">
            <Zap className="w-5 h-5 mr-2 text-blue-600" />
            Xero Integration
          </div>
          <Badge variant={isConnected ? "default" : "destructive"} className="flex items-center">
            {isConnected ? (
              <>
                <CheckCircle className="w-3 h-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 mr-1" />
                Not Connected
              </>
            )}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isConnected && organization ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Building2 className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Organization:</span>
                </div>
                <p className="font-medium">{organization.name}</p>
                {organization.legalName && organization.legalName !== organization.name && (
                  <p className="text-sm text-muted-foreground">
                    Legal: {organization.legalName}
                  </p>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <DollarSign className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Currency:</span>
                </div>
                <p className="font-medium">{organization.baseCurrency}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Globe className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Country:</span>
                </div>
                <p className="font-medium">{organization.countryCode}</p>
              </div>

              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground">Last Sync:</span>
                </div>
                <p className="font-medium">
                  {status?.lastSync ? 
                    new Date(status.lastSync).toLocaleString() : 
                    'Never'
                  }
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm font-medium">Status: {organization.organisationStatus}</p>
                <p className="text-xs text-muted-foreground">
                  Type: {organization.organisationType}
                  {organization.isDemoCompany && ' (Demo Company)'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <XCircle className="w-12 h-12 mx-auto text-red-500 mb-3" />
            <h3 className="font-semibold mb-2">Not Connected to Xero</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Connect to Xero to enable automated timesheet syncing and invoice generation.
            </p>
            {status?.error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
                <p className="text-sm text-red-800">{status.error}</p>
              </div>
            )}
          </div>
        )}

        <Separator />

        <div className="flex flex-wrap gap-3">
          {isAdmin && (
            <>
              {!isConnected ? (
                <Button 
                  onClick={connectToXero}
                  disabled={connecting}
                  className="flex items-center"
                >
                  {connecting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <ExternalLink className="w-4 h-4 mr-2" />
                  )}
                  Connect to Xero
                </Button>
              ) : (
                <Button 
                  variant="destructive"
                  onClick={disconnectFromXero}
                  disabled={disconnecting}
                  className="flex items-center"
                >
                  {disconnecting ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <XCircle className="w-4 h-4 mr-2" />
                  )}
                  Disconnect
                </Button>
              )}
            </>
          )}

          <Button 
            variant="outline"
            onClick={testConnection}
            disabled={testing}
            className="flex items-center"
          >
            {testing ? (
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Test Connection
          </Button>

          <Button 
            variant="outline"
            onClick={fetchConnectionStatus}
            disabled={loading}
            className="flex items-center"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Status
          </Button>
        </div>

        {connectionData?.timestamp && (
          <p className="text-xs text-muted-foreground text-center">
            Last updated: {new Date(connectionData.timestamp).toLocaleString()}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
