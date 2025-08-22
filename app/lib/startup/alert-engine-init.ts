

/**
 * Alert Engine Initialization Script
 * Phase 2B-8c: Automated Alerting System
 */

import { alertEngine } from '@/lib/services/alert-engine';

let initialized = false;

export async function initializeAlertEngine(): Promise<void> {
  if (initialized) return;

  try {
    console.log('🚀 Initializing Alert Engine...');
    
    // Start the alert engine
    await alertEngine.start();
    
    initialized = true;
    console.log('✅ Alert Engine initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Alert Engine:', error);
  }
}

// Auto-initialize in production
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production') {
  // Initialize on module load in server environment
  setTimeout(() => {
    initializeAlertEngine().catch(console.error);
  }, 5000); // Delay to ensure database connections are ready
}

export async function createDefaultAlertRulesForUser(userId: string): Promise<void> {
  try {
    await alertEngine.createDefaultRules(userId);
    console.log(`✅ Default alert rules created for user ${userId}`);
  } catch (error) {
    console.error('❌ Failed to create default alert rules:', error);
  }
}

