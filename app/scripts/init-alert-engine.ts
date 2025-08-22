

/**
 * Alert Engine CLI Initialization Script
 * Phase 2B-8c: Automated Alerting System
 * 
 * Usage: npx tsx scripts/init-alert-engine.ts
 */

import { PrismaClient } from '@prisma/client';
import { alertEngine } from '../lib/services/alert-engine';

const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Initializing Alert Engine for Project Foundry PSA...\n');

  try {
    // Find an admin user to create default rules for
    const adminUser = await prisma.user.findFirst({
      where: {
        role: { in: ['ADMIN', 'PARTNER', 'PRINCIPAL'] }
      }
    });

    if (!adminUser) {
      console.error('❌ No admin user found. Please create an admin user first.');
      process.exit(1);
    }

    console.log(`👤 Using admin user: ${adminUser.email} (${adminUser.role})`);

    // Initialize the alert engine
    console.log('\n📋 Step 1: Starting Alert Engine...');
    await alertEngine.start();

    // Create default alert rules
    console.log('\n📋 Step 2: Creating default alert rules...');
    await alertEngine.createDefaultRules(adminUser.id);

    // Get summary
    const [rulesCount, alertsCount] = await Promise.all([
      prisma.alertRule.count({ where: { isActive: true } }),
      prisma.alert.count({ where: { status: { in: ['OPEN', 'ACKNOWLEDGED'] } } })
    ]);

    console.log('\n✅ Alert Engine initialization completed!');
    console.log('\n📊 Summary:');
    console.log(`   • Active Alert Rules: ${rulesCount}`);
    console.log(`   • Current Active Alerts: ${alertsCount}`);
    console.log(`   • Engine Status: Running`);
    
    console.log('\n🔔 Default Alert Rules Created:');
    console.log('   • High API Response Time (>2 seconds)');
    console.log('   • Database Connection Failure');
    console.log('   • High Memory Usage (>85%)');
    console.log('   • Sync Pipeline Failures (>10% error rate)');
    
    console.log('\n🌐 Next Steps:');
    console.log('   1. Access the Alerts Dashboard in Settings > Alerts');
    console.log('   2. Customize alert rules as needed');
    console.log('   3. Configure notification channels (email, Slack, etc.)');
    console.log('   4. Monitor system health and performance metrics');
    
    // Stop the engine for CLI mode
    await alertEngine.stop();

  } catch (error) {
    console.error('❌ Failed to initialize Alert Engine:', error);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error('❌ Initialization script failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

