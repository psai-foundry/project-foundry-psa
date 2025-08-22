
/**
 * Application Startup Script
 * Phase 2B-3: Real-time Sync Pipeline
 * 
 * Initializes background services and workers
 */

import { QueueWorkerManager } from './queue/queue-worker';

export async function initializeApplication() {
  console.log('[Startup] Initializing application services...');
  
  try {
    // Initialize queue worker
    const queueWorker = QueueWorkerManager.getInstance();
    await queueWorker.start();
    
    console.log('[Startup] Application initialization completed');
    
    // Setup graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      console.log(`[Startup] Received ${signal}, shutting down gracefully...`);
      
      try {
        await queueWorker.stop();
        console.log('[Startup] Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('[Startup] Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    // Register shutdown handlers
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon
    
  } catch (error) {
    console.error('[Startup] Application initialization failed:', error);
    
    // In development, continue without queue worker
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Startup] Continuing without queue worker in development mode');
      return;
    }
    
    throw error;
  }
}

// Auto-initialize if not in test environment
if (process.env.NODE_ENV !== 'test' && typeof window === 'undefined') {
  // Only run on server-side
  initializeApplication().catch(error => {
    console.error('[Startup] Failed to initialize application:', error);
    
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
  });
}

export default initializeApplication;
