
import { XeroClient, AccountingApi, TokenSet, XeroAccessToken, XeroIdToken } from 'xero-node';
import { prisma } from '@/lib/db';

export interface XeroConfig {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

export interface XeroConnectionStatus {
  connected: boolean;
  organizationName?: string;
  lastSync?: Date;
  error?: string;
  tenantId?: string;
}

export class XeroApiWrapper {
  private xero: XeroClient;
  private config: XeroConfig;

  constructor() {
    this.config = {
      clientId: process.env.XERO_CLIENT_ID || '',
      clientSecret: process.env.XERO_CLIENT_SECRET || '',
      redirectUri: process.env.XERO_REDIRECT_URI || '',
      scopes: [
        'openid',
        'profile', 
        'email',
        'accounting.transactions',
        'accounting.contacts',
        'accounting.settings'
      ]
    };

    if (!this.config.clientId || !this.config.clientSecret) {
      throw new Error('Xero credentials not configured. Please set XERO_CLIENT_ID and XERO_CLIENT_SECRET environment variables.');
    }

    this.xero = new XeroClient({
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      redirectUris: [this.config.redirectUri],
      scopes: this.config.scopes,
      state: 'returnPage=my-app',
      httpTimeout: 3000
    });
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  async getAuthorizationUrl(): Promise<string> {
    try {
      const consentUrl = await this.xero.buildConsentUrl();
      return consentUrl;
    } catch (error) {
      console.error('Error generating Xero authorization URL:', error);
      throw new Error('Failed to generate Xero authorization URL');
    }
  }

  /**
   * Exchange authorization code for tokens
   */
  async handleCallback(callbackUrl: string): Promise<any> {
    try {
      const tokenSet = await this.xero.apiCallback(callbackUrl);
      
      // Store tokens in database
      await this.storeTokens(tokenSet);
      
      return tokenSet;
    } catch (error) {
      console.error('Error handling Xero callback:', error);
      throw new Error('Failed to exchange authorization code for tokens');
    }
  }

  /**
   * Store tokens in database
   */
  private async storeTokens(tokenSet: any): Promise<void> {
    try {
      // Get tenants to extract tenant info
      await this.xero.updateTenants();
      const tenantId = this.xero.tenants.length > 0 ? this.xero.tenants[0].tenantId : '';

      // Store or update Xero connection in database
      await prisma.xeroConnection.upsert({
        where: { id: 'default' },
        update: {
          accessToken: tokenSet.access_token || '',
          refreshToken: tokenSet.refresh_token || '',
          idToken: tokenSet.id_token || '',
          expiresAt: new Date(Date.now() + (tokenSet.expires_in || 1800) * 1000),
          tenantId: tenantId || '',
          scopes: tokenSet.scope || '',
          updatedAt: new Date()
        },
        create: {
          id: 'default',
          accessToken: tokenSet.access_token || '',
          refreshToken: tokenSet.refresh_token || '',
          idToken: tokenSet.id_token || '',
          expiresAt: new Date(Date.now() + (tokenSet.expires_in || 1800) * 1000),
          tenantId: tenantId || '',
          scopes: tokenSet.scope || '',
          connected: true,
          lastSync: new Date()
        }
      });

      console.log('Xero tokens stored successfully');
    } catch (error) {
      console.error('Error storing Xero tokens:', error);
      throw error;
    }
  }

  /**
   * Get stored tokens from database
   */
  private async getStoredTokens(): Promise<any | null> {
    try {
      const connection = await prisma.xeroConnection.findUnique({
        where: { id: 'default' }
      });

      if (!connection) {
        return null;
      }

      return {
        access_token: connection.accessToken,
        refresh_token: connection.refreshToken,
        id_token: connection.idToken,
        expires_at: Math.floor(connection.expiresAt.getTime() / 1000),
        token_type: 'Bearer'
      };
    } catch (error) {
      console.error('Error retrieving stored tokens:', error);
      return null;
    }
  }

  /**
   * Check if tokens need refreshing and refresh if necessary
   */
  private async ensureValidTokens(): Promise<any> {
    const storedTokens = await this.getStoredTokens();
    
    if (!storedTokens) {
      throw new Error('No Xero tokens found. Please authorize the application first.');
    }

    // Check if token is expired (with 5 minute buffer)
    const expiresAt = (storedTokens.expires_at || 0) * 1000;
    const now = Date.now();
    const buffer = 5 * 60 * 1000; // 5 minutes

    if (now >= (expiresAt - buffer)) {
      console.log('Xero token expired, refreshing...');
      try {
        const refreshedTokenSet = await this.xero.refreshToken();
        await this.storeTokens(refreshedTokenSet);
        return refreshedTokenSet;
      } catch (error) {
        console.error('Error refreshing Xero tokens:', error);
        throw new Error('Failed to refresh Xero tokens. Please re-authorize the application.');
      }
    }

    return storedTokens;
  }

  /**
   * Initialize API with current tokens
   */
  private async initializeApi(): Promise<void> {
    const tokenSet = await this.ensureValidTokens();
    this.xero.setTokenSet(tokenSet);
  }

  /**
   * Test connection to Xero and return status
   */
  async getConnectionStatus(): Promise<XeroConnectionStatus> {
    try {
      await this.initializeApi();

      // Get tenant info to verify connection
      const tenants = await this.xero.updateTenants();

      if (!tenants || tenants.length === 0) {
        throw new Error('No Xero organizations found');
      }

      const primaryTenant = tenants[0];
      
      // Test API call to verify connection works
      const organisationsResponse = await this.xero.accountingApi.getOrganisations(
        primaryTenant.tenantId
      );

      const organization = organisationsResponse.body.organisations?.[0];

      return {
        connected: true,
        organizationName: organization?.name,
        tenantId: primaryTenant.tenantId,
        lastSync: new Date()
      };

    } catch (error) {
      console.error('Xero connection test failed:', error);
      
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Get organization details
   */
  async getOrganizationInfo(): Promise<any> {
    try {
      await this.initializeApi();
      
      // Ensure we have tenants
      await this.xero.updateTenants();
      
      if (!this.xero.tenants || this.xero.tenants.length === 0) {
        throw new Error('No Xero tenants found');
      }
      
      const response = await this.xero.accountingApi.getOrganisations(
        this.xero.tenants[0].tenantId
      );

      return response.body.organisations?.[0];
    } catch (error) {
      console.error('Error getting organization info:', error);
      throw error;
    }
  }

  /**
   * Disconnect from Xero (revoke tokens)
   */
  async disconnect(): Promise<void> {
    try {
      // Update database to mark as disconnected
      await prisma.xeroConnection.update({
        where: { id: 'default' },
        data: {
          connected: false,
          accessToken: '',
          refreshToken: '',
          idToken: '',
          updatedAt: new Date()
        }
      });

      console.log('Xero connection disconnected successfully');
    } catch (error) {
      console.error('Error disconnecting from Xero:', error);
      throw error;
    }
  }

  /**
   * Get Accounting API instance with authenticated tokens
   */
  async getAccountingApi(): Promise<any | null> {
    try {
      await this.initializeApi();
      
      // Ensure we have tenants
      await this.xero.updateTenants();
      
      if (!this.xero.tenants || this.xero.tenants.length === 0) {
        console.error('No Xero tenants available');
        return null;
      }

      return this.xero.accountingApi;
    } catch (error) {
      console.error('Failed to get Accounting API:', error);
      return null;
    }
  }

  /**
   * Get current tenant ID
   */
  async getTenantId(): Promise<string | null> {
    try {
      await this.initializeApi();
      await this.xero.updateTenants();
      
      return this.xero.tenants.length > 0 ? this.xero.tenants[0].tenantId : null;
    } catch (error) {
      console.error('Failed to get tenant ID:', error);
      return null;
    }
  }

  /**
   * Test Xero connection (alias for getConnectionStatus for compatibility)
   */
  async testConnection(): Promise<{ success: boolean; message: string; organizationName?: string }> {
    try {
      const status = await this.getConnectionStatus();
      return {
        success: status.connected,
        message: status.connected ? 'Connection successful' : (status.error || 'Connection failed'),
        organizationName: status.organizationName
      };
    } catch (error) {
      console.error('Xero connection test failed:', error);
      return { 
        success: false, 
        message: `Connection test failed: ${error}` 
      };
    }
  }
}

// Singleton instance
export const xeroApi = new XeroApiWrapper();
