

/**
 * Alert Engine Service
 * Phase 2B-8c: Automated Alerting System
 */

import { prisma } from '@/lib/db';
import { AlertCondition, AlertSeverity, AlertStatus, MetricType, HealthStatus, NotificationType, NotificationPriority } from '@prisma/client';
import { metricsService } from './metrics-service';

export interface AlertContext {
  entityId?: string;
  entityType?: string;
  userId?: string;
  executionId?: string;
  additionalData?: Record<string, any>;
}

export interface AlertNotificationChannel {
  type: 'email' | 'webhook' | 'in_app' | 'slack';
  config: Record<string, any>;
}

class AlertEngine {
  private static instance: AlertEngine;
  private isRunning = false;
  private evaluationInterval?: NodeJS.Timeout;
  
  public static getInstance(): AlertEngine {
    if (!AlertEngine.instance) {
      AlertEngine.instance = new AlertEngine();
    }
    return AlertEngine.instance;
  }

  /**
   * Start the alert evaluation engine
   */
  async start(): Promise<void> {
    if (this.isRunning) return;
    
    console.log('🚨 Starting Alert Engine...');
    this.isRunning = true;
    
    // Run initial evaluation
    await this.evaluateAllRules();
    
    // Schedule periodic evaluations every 60 seconds
    this.evaluationInterval = setInterval(async () => {
      try {
        await this.evaluateAllRules();
      } catch (error) {
        console.error('Alert evaluation failed:', error);
      }
    }, 60000);
    
    console.log('✅ Alert Engine started');
  }

  /**
   * Stop the alert evaluation engine
   */
  async stop(): Promise<void> {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    if (this.evaluationInterval) {
      clearInterval(this.evaluationInterval);
    }
    
    console.log('⏹️  Alert Engine stopped');
  }

  /**
   * Evaluate all active alert rules
   */
  private async evaluateAllRules(): Promise<void> {
    try {
      const activeRules = await prisma.alertRule.findMany({
        where: { isActive: true },
        orderBy: { severity: 'desc' }
      });

      console.log(`🔍 Evaluating ${activeRules.length} alert rules...`);

      for (const rule of activeRules) {
        try {
          await this.evaluateRule(rule);
        } catch (error) {
          console.error(`Failed to evaluate rule ${rule.id}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to fetch alert rules:', error);
    }
  }

  /**
   * Evaluate a specific alert rule
   */
  private async evaluateRule(rule: any): Promise<void> {
    // Check if rule was recently triggered and should be suppressed
    if (rule.lastTriggered) {
      const suppressUntil = new Date(rule.lastTriggered.getTime() + (rule.suppressDuration * 60 * 1000));
      if (new Date() < suppressUntil) {
        return; // Still in suppression period
      }
    }

    // Get metric data for evaluation
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - (rule.timeWindow * 60 * 1000));
    
    const metricValue = await this.getMetricValueForRule(rule, startTime, endTime);
    
    if (metricValue === null) return; // No data to evaluate
    
    // Evaluate condition
    const shouldTrigger = this.evaluateCondition(
      metricValue,
      rule.condition,
      rule.threshold
    );
    
    if (shouldTrigger) {
      await this.triggerAlert(rule, metricValue);
    }
  }

  /**
   * Get metric value for rule evaluation
   */
  private async getMetricValueForRule(rule: any, startTime: Date, endTime: Date): Promise<number | null> {
    try {
      const metrics = await prisma.performanceMetric.findMany({
        where: {
          name: rule.metricType,
          timestamp: {
            gte: startTime,
            lte: endTime
          }
        },
        orderBy: { timestamp: 'desc' }
      });

      if (metrics.length === 0) return null;
      
      // For simplicity, use the latest value
      // In production, you might want to use aggregations (avg, max, min, etc.)
      return metrics[0].value;
    } catch (error) {
      console.error('Failed to get metric value:', error);
      return null;
    }
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(
    value: number,
    condition: AlertCondition,
    threshold: number
  ): boolean {
    switch (condition) {
      case AlertCondition.GREATER_THAN:
        return value > threshold;
      case AlertCondition.LESS_THAN:
        return value < threshold;
      case AlertCondition.EQUALS:
        return value === threshold;
      case AlertCondition.NOT_EQUALS:
        return value !== threshold;
      case AlertCondition.GREATER_THAN_OR_EQUALS:
        return value >= threshold;
      case AlertCondition.LESS_THAN_OR_EQUALS:
        return value <= threshold;
      default:
        return false;
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(rule: any, metricValue: number): Promise<void> {
    try {
      // Check if there's already an open alert for this rule
      const existingAlert = await prisma.alert.findFirst({
        where: {
          ruleId: rule.id,
          status: AlertStatus.OPEN
        }
      });

      if (existingAlert) {
        // Update existing alert with new metric value
        await prisma.alert.update({
          where: { id: existingAlert.id },
          data: {
            metricValue,
            updatedAt: new Date()
          }
        });
      } else {
        // Create new alert
        const alert = await prisma.alert.create({
          data: {
            ruleId: rule.id,
            severity: rule.severity,
            title: `${rule.name} Alert`,
            message: this.generateAlertMessage(rule, metricValue),
            metricValue,
            threshold: rule.threshold,
            affectedEntity: rule.metricType,
            status: AlertStatus.OPEN
          }
        });

        console.log(`🚨 Alert triggered: ${alert.title} (ID: ${alert.id})`);

        // Send notifications
        await this.sendNotifications(alert, rule);
      }

      // Update rule trigger tracking
      await prisma.alertRule.update({
        where: { id: rule.id },
        data: {
          lastTriggered: new Date(),
          triggerCount: { increment: 1 }
        }
      });

    } catch (error) {
      console.error('Failed to trigger alert:', error);
    }
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(rule: any, metricValue: number): string {
    const conditionText = this.getConditionText(rule.condition);
    return `${rule.name} has triggered an alert. Current value: ${metricValue} ${conditionText} ${rule.threshold} (threshold).`;
  }

  /**
   * Get human-readable condition text
   */
  private getConditionText(condition: AlertCondition): string {
    switch (condition) {
      case AlertCondition.GREATER_THAN: return '>';
      case AlertCondition.LESS_THAN: return '<';
      case AlertCondition.EQUALS: return '=';
      case AlertCondition.NOT_EQUALS: return '!=';
      case AlertCondition.GREATER_THAN_OR_EQUALS: return '>=';
      case AlertCondition.LESS_THAN_OR_EQUALS: return '<=';
      default: return '';
    }
  }

  /**
   * Send notifications for an alert
   */
  private async sendNotifications(alert: any, rule: any): Promise<void> {
    try {
      const channels = rule.notificationChannels as AlertNotificationChannel[];
      
      for (const channel of channels) {
        try {
          await this.sendNotification(alert, rule, channel);
        } catch (error) {
          console.error(`Failed to send notification via ${channel.type}:`, error);
        }
      }
    } catch (error) {
      console.error('Failed to process notifications:', error);
    }
  }

  /**
   * Send a notification via a specific channel
   */
  private async sendNotification(
    alert: any,
    rule: any,
    channel: AlertNotificationChannel
  ): Promise<void> {
    switch (channel.type) {
      case 'in_app':
        await this.sendInAppNotification(alert, rule, channel);
        break;
      case 'email':
        await this.sendEmailNotification(alert, rule, channel);
        break;
      case 'webhook':
        await this.sendWebhookNotification(alert, rule, channel);
        break;
      case 'slack':
        await this.sendSlackNotification(alert, rule, channel);
        break;
      default:
        console.warn(`Unsupported notification channel: ${channel.type}`);
    }
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(alert: any, rule: any, channel: AlertNotificationChannel): Promise<void> {
    // Create in-app notifications for relevant users
    const recipients = channel.config.recipients || [];
    
    for (const userId of recipients) {
      try {
        await prisma.notifications.create({
          data: {
            id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            userId,
            type: NotificationType.SYSTEM_ALERT,
            title: alert.title,
            message: alert.message,
            priority: this.mapSeverityToPriority(alert.severity),
            updatedAt: new Date(),
            metadata: {
              alertId: alert.id,
              ruleId: rule.id,
              metricValue: alert.metricValue,
              threshold: alert.threshold
            }
          }
        });
      } catch (error) {
        console.error(`Failed to create in-app notification for user ${userId}:`, error);
      }
    }
  }

  /**
   * Send email notification (placeholder)
   */
  private async sendEmailNotification(alert: any, rule: any, channel: AlertNotificationChannel): Promise<void> {
    // Email service integration would go here
    console.log(`📧 Email notification would be sent: ${alert.title}`);
  }

  /**
   * Send webhook notification (placeholder)
   */
  private async sendWebhookNotification(alert: any, rule: any, channel: AlertNotificationChannel): Promise<void> {
    // Webhook integration would go here
    console.log(`🔗 Webhook notification would be sent: ${alert.title}`);
  }

  /**
   * Send Slack notification (placeholder)
   */
  private async sendSlackNotification(alert: any, rule: any, channel: AlertNotificationChannel): Promise<void> {
    // Slack integration would go here
    console.log(`💬 Slack notification would be sent: ${alert.title}`);
  }

  /**
   * Map alert severity to notification priority
   */
  private mapSeverityToPriority(severity: AlertSeverity): NotificationPriority {
    switch (severity) {
      case AlertSeverity.CRITICAL: return NotificationPriority.URGENT;
      case AlertSeverity.HIGH: return NotificationPriority.HIGH;
      case AlertSeverity.MEDIUM: return NotificationPriority.NORMAL;
      case AlertSeverity.LOW: return NotificationPriority.LOW;
      default: return NotificationPriority.NORMAL;
    }
  }


  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    try {
      await prisma.alert.update({
        where: { id: alertId },
        data: {
          status: AlertStatus.ACKNOWLEDGED,
          acknowledgedAt: new Date(),
          acknowledgedBy: userId
        }
      });
      
      console.log(`✅ Alert ${alertId} acknowledged by user ${userId}`);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, userId: string): Promise<void> {
    try {
      await prisma.alert.update({
        where: { id: alertId },
        data: {
          status: AlertStatus.RESOLVED,
          resolvedAt: new Date(),
          resolvedBy: userId
        }
      });
      
      console.log(`✅ Alert ${alertId} resolved by user ${userId}`);
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  }

  /**
   * Get active alerts
   */
  async getActiveAlerts(limit: number = 50): Promise<any[]> {
    try {
      return await prisma.alert.findMany({
        where: {
          status: {
            in: [AlertStatus.OPEN, AlertStatus.ACKNOWLEDGED]
          }
        },
        include: {
          rule: true
        },
        orderBy: [
          { severity: 'desc' },
          { createdAt: 'desc' }
        ],
        take: limit
      });
    } catch (error) {
      console.error('Failed to get active alerts:', error);
      return [];
    }
  }

  /**
   * Create a pre-defined alert rule for common scenarios
   */
  async createDefaultRules(userId: string): Promise<void> {
    const defaultRules = [
      {
        name: 'High API Response Time',
        description: 'Alerts when API response time exceeds 2 seconds',
        metricType: 'api_response_time',
        condition: AlertCondition.GREATER_THAN,
        threshold: 2000,
        timeWindow: 5,
        severity: AlertSeverity.HIGH,
        notificationChannels: [{ type: 'in_app', config: { recipients: [userId] } }]
      },
      {
        name: 'Database Connection Failure',
        description: 'Alerts when database health check fails',
        metricType: 'database_health',
        condition: AlertCondition.LESS_THAN,
        threshold: 1,
        timeWindow: 1,
        severity: AlertSeverity.CRITICAL,
        notificationChannels: [{ type: 'in_app', config: { recipients: [userId] } }]
      },
      {
        name: 'High Memory Usage',
        description: 'Alerts when memory usage exceeds 85%',
        metricType: 'memory_usage',
        condition: AlertCondition.GREATER_THAN,
        threshold: 85,
        timeWindow: 10,
        severity: AlertSeverity.MEDIUM,
        notificationChannels: [{ type: 'in_app', config: { recipients: [userId] } }]
      },
      {
        name: 'Sync Pipeline Failures',
        description: 'Alerts when sync pipeline fails frequently',
        metricType: 'sync_error_rate',
        condition: AlertCondition.GREATER_THAN,
        threshold: 10,
        timeWindow: 30,
        severity: AlertSeverity.HIGH,
        notificationChannels: [{ type: 'in_app', config: { recipients: [userId] } }]
      }
    ];

    for (const ruleData of defaultRules) {
      try {
        const existingRule = await prisma.alertRule.findFirst({
          where: { name: ruleData.name }
        });

        if (!existingRule) {
          await prisma.alertRule.create({
            data: {
              ...ruleData,
              createdById: userId
            }
          });
        }
      } catch (error) {
        console.error(`Failed to create default rule ${ruleData.name}:`, error);
      }
    }
  }
}

// Export singleton instance
export const alertEngine = AlertEngine.getInstance();
export default AlertEngine;

