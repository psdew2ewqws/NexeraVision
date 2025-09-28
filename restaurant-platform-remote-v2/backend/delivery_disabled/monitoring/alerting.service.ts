import { Injectable, Logger } from '@nestjs/common';
import { Alert, AlertSeverity, AlertChannel, AlertRule } from '../interfaces/monitoring.interface';

@Injectable()
export class AlertingService {
  private readonly logger = new Logger(AlertingService.name);
  private readonly alertChannels: Map<string, AlertChannel> = new Map();
  private readonly alertRules: AlertRule[] = [];
  private readonly recentAlerts: Map<string, Date> = new Map();
  private readonly alertSuppressionWindow = 300000; // 5 minutes in milliseconds

  constructor() {
    this.setupDefaultChannels();
    this.setupDefaultRules();
  }

  private setupDefaultChannels(): void {
    // Email channel
    this.alertChannels.set('email', {
      type: 'email',
      name: 'Email Notifications',
      enabled: true,
      config: {
        recipients: [
          'devops@restaurant-platform.com',
          'system-admin@restaurant-platform.com'
        ],
        smtpServer: process.env.SMTP_SERVER || 'localhost',
        smtpPort: parseInt(process.env.SMTP_PORT || '587'),
        username: process.env.SMTP_USERNAME,
        password: process.env.SMTP_PASSWORD
      },
      severityFilter: [AlertSeverity.HIGH, AlertSeverity.CRITICAL]
    });

    // Slack channel
    this.alertChannels.set('slack', {
      type: 'slack',
      name: 'Slack Notifications',
      enabled: true,
      config: {
        webhookUrl: process.env.SLACK_WEBHOOK_URL || 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
        channel: '#delivery-alerts',
        username: 'DeliveryBot'
      },
      severityFilter: [AlertSeverity.WARNING, AlertSeverity.HIGH, AlertSeverity.CRITICAL]
    });

    // SMS channel (for critical alerts)
    this.alertChannels.set('sms', {
      type: 'sms',
      name: 'SMS Notifications',
      enabled: true,
      config: {
        provider: 'twilio',
        accountSid: process.env.TWILIO_ACCOUNT_SID,
        authToken: process.env.TWILIO_AUTH_TOKEN,
        fromNumber: process.env.TWILIO_FROM_NUMBER,
        recipients: [
          '+962791234567', // On-call engineer
          '+962791234568'  // Backup contact
        ]
      },
      severityFilter: [AlertSeverity.CRITICAL]
    });

    // PagerDuty integration
    this.alertChannels.set('pagerduty', {
      type: 'pagerduty',
      name: 'PagerDuty',
      enabled: true,
      config: {
        integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
        serviceKey: process.env.PAGERDUTY_SERVICE_KEY
      },
      severityFilter: [AlertSeverity.CRITICAL]
    });

    // Microsoft Teams
    this.alertChannels.set('teams', {
      type: 'teams',
      name: 'Microsoft Teams',
      enabled: true,
      config: {
        webhookUrl: process.env.TEAMS_WEBHOOK_URL,
        channel: 'Delivery System Alerts'
      },
      severityFilter: [AlertSeverity.WARNING, AlertSeverity.HIGH, AlertSeverity.CRITICAL]
    });
  }

  private setupDefaultRules(): void {
    this.alertRules.push(
      {
        name: 'High Error Rate',
        condition: (alert) => alert.title.includes('Error Rate') && alert.severity === AlertSeverity.HIGH,
        channels: ['slack', 'email'],
        suppressionTime: 600000 // 10 minutes
      },
      {
        name: 'Critical System Issues',
        condition: (alert) => alert.severity === AlertSeverity.CRITICAL,
        channels: ['email', 'slack', 'sms', 'pagerduty'],
        suppressionTime: 300000 // 5 minutes
      },
      {
        name: 'Provider Issues',
        condition: (alert) => alert.title.includes('Provider') && alert.severity === AlertSeverity.HIGH,
        channels: ['slack', 'email'],
        suppressionTime: 900000 // 15 minutes
      },
      {
        name: 'Memory Issues',
        condition: (alert) => alert.title.includes('Memory'),
        channels: ['email', 'slack'],
        suppressionTime: 1200000 // 20 minutes
      }
    );
  }

  async sendAlert(alert: Alert): Promise<void> {
    try {
      // Check if alert should be suppressed
      if (this.shouldSuppressAlert(alert)) {
        this.logger.debug(`Alert suppressed: ${alert.title}`);
        return;
      }

      // Enrich alert with additional context
      const enrichedAlert = await this.enrichAlert(alert);

      // Apply alert rules to determine channels
      const targetChannels = this.getTargetChannels(enrichedAlert);

      // Send to each target channel
      const sendPromises = targetChannels.map(channelName => 
        this.sendToChannel(channelName, enrichedAlert)
      );

      await Promise.allSettled(sendPromises);

      // Record alert for suppression tracking
      this.recordAlert(enrichedAlert);

      this.logger.debug(`Alert sent: ${alert.title} to channels: ${targetChannels.join(', ')}`);

    } catch (error) {
      this.logger.error('Failed to send alert:', error);
      // Try to send a fallback alert about the alerting system failure
      await this.sendFallbackAlert(error, alert);
    }
  }

  private shouldSuppressAlert(alert: Alert): boolean {
    const alertKey = this.getAlertKey(alert);
    const lastSentTime = this.recentAlerts.get(alertKey);
    
    if (!lastSentTime) {
      return false;
    }

    const timeSinceLastAlert = Date.now() - lastSentTime.getTime();
    return timeSinceLastAlert < this.alertSuppressionWindow;
  }

  private async enrichAlert(alert: Alert): Promise<Alert> {
    return {
      ...alert,
      id: this.generateAlertId(),
      environment: process.env.NODE_ENV || 'development',
      hostname: require('os').hostname(),
      processId: process.pid,
      memoryUsage: this.getMemoryUsage(),
      uptime: process.uptime()
    };
  }

  private getTargetChannels(alert: Alert): string[] {
    const applicableRules = this.alertRules.filter(rule => rule.condition(alert));
    
    if (applicableRules.length > 0) {
      // Use channels from matching rules
      const ruleChannels = applicableRules.flatMap(rule => rule.channels);
      return [...new Set(ruleChannels)]; // Remove duplicates
    }

    // Default channels based on severity
    return Array.from(this.alertChannels.entries())
      .filter(([_, channel]) => 
        channel.enabled && channel.severityFilter.includes(alert.severity)
      )
      .map(([name]) => name);
  }

  private async sendToChannel(channelName: string, alert: Alert): Promise<void> {
    const channel = this.alertChannels.get(channelName);
    
    if (!channel || !channel.enabled) {
      this.logger.warn(`Channel ${channelName} is not available or disabled`);
      return;
    }

    try {
      switch (channel.type) {
        case 'email':
          await this.sendEmailAlert(channel, alert);
          break;
        case 'slack':
          await this.sendSlackAlert(channel, alert);
          break;
        case 'sms':
          await this.sendSmsAlert(channel, alert);
          break;
        case 'pagerduty':
          await this.sendPagerDutyAlert(channel, alert);
          break;
        case 'teams':
          await this.sendTeamsAlert(channel, alert);
          break;
        default:
          this.logger.warn(`Unknown channel type: ${channel.type}`);
      }
    } catch (error) {
      this.logger.error(`Failed to send alert to ${channelName}:`, error);
      throw error;
    }
  }

  private async sendEmailAlert(channel: AlertChannel, alert: Alert): Promise<void> {
    // Email implementation would go here
    // For now, we'll simulate the email sending
    this.logger.debug(`📧 EMAIL ALERT: ${alert.title} to ${channel.config.recipients?.join(', ')}`);
    
    const emailContent = this.formatEmailContent(alert);
    
    // Simulate email sending delay
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // In a real implementation, you would use nodemailer or similar:
    /*
    const transporter = nodemailer.createTransporter({
      host: channel.config.smtpServer,
      port: channel.config.smtpPort,
      secure: channel.config.smtpPort === 465,
      auth: {
        user: channel.config.username,
        pass: channel.config.password
      }
    });

    await transporter.sendMail({
      from: channel.config.username,
      to: channel.config.recipients.join(','),
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      html: emailContent
    });
    */
  }

  private async sendSlackAlert(channel: AlertChannel, alert: Alert): Promise<void> {
    this.logger.debug(`💬 SLACK ALERT: ${alert.title} to ${channel.config.channel}`);
    
    const slackPayload = this.formatSlackPayload(alert);
    
    // Simulate Slack API call
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // In a real implementation:
    /*
    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackPayload)
    });

    if (!response.ok) {
      throw new Error(`Slack API error: ${response.statusText}`);
    }
    */
  }

  private async sendSmsAlert(channel: AlertChannel, alert: Alert): Promise<void> {
    this.logger.debug(`📱 SMS ALERT: ${alert.title} to ${channel.config.recipients?.join(', ')}`);
    
    const smsMessage = this.formatSmsMessage(alert);
    
    // Simulate SMS sending
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // In a real implementation with Twilio:
    /*
    const client = twilio(channel.config.accountSid, channel.config.authToken);
    
    for (const recipient of channel.config.recipients) {
      await client.messages.create({
        body: smsMessage,
        from: channel.config.fromNumber,
        to: recipient
      });
    }
    */
  }

  private async sendPagerDutyAlert(channel: AlertChannel, alert: Alert): Promise<void> {
    this.logger.debug(`📟 PAGERDUTY ALERT: ${alert.title}`);
    
    const pagerDutyPayload = this.formatPagerDutyPayload(alert, channel);
    
    // Simulate PagerDuty API call
    await new Promise(resolve => setTimeout(resolve, 250));
    
    // In a real implementation:
    /*
    const response = await fetch('https://events.pagerduty.com/v2/enqueue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(pagerDutyPayload)
    });

    if (!response.ok) {
      throw new Error(`PagerDuty API error: ${response.statusText}`);
    }
    */
  }

  private async sendTeamsAlert(channel: AlertChannel, alert: Alert): Promise<void> {
    this.logger.debug(`👥 TEAMS ALERT: ${alert.title} to ${channel.config.channel}`);
    
    const teamsPayload = this.formatTeamsPayload(alert);
    
    // Simulate Teams webhook call
    await new Promise(resolve => setTimeout(resolve, 150));
    
    // In a real implementation:
    /*
    const response = await fetch(channel.config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamsPayload)
    });

    if (!response.ok) {
      throw new Error(`Teams webhook error: ${response.statusText}`);
    }
    */
  }

  private formatEmailContent(alert: Alert): string {
    const severityColor = this.getSeverityColor(alert.severity);
    
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: ${severityColor}; border-bottom: 2px solid ${severityColor}; padding-bottom: 10px;">
              🚨 ${alert.title}
            </h2>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Severity:</strong> <span style="color: ${severityColor}; font-weight: bold;">${alert.severity.toUpperCase()}</span></p>
              <p><strong>Source:</strong> ${alert.source}</p>
              <p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
              <p><strong>Environment:</strong> ${alert.environment}</p>
            </div>
            
            <div style="background: #fff; border-left: 4px solid ${severityColor}; padding: 15px; margin: 20px 0;">
              <h3>Message</h3>
              <p>${alert.message}</p>
            </div>
            
            ${alert.details ? `
              <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
                <h3>Additional Details</h3>
                <pre style="background: #fff; padding: 10px; border-radius: 3px; overflow-x: auto;">
${JSON.stringify(alert.details, null, 2)}
                </pre>
              </div>
            ` : ''}
            
            <div style="background: #e9ecef; padding: 15px; border-radius: 5px; margin: 20px 0; font-size: 12px;">
              <p><strong>System Information:</strong></p>
              <ul>
                <li>Hostname: ${alert.hostname}</li>
                <li>Process ID: ${alert.processId}</li>
                <li>Uptime: ${Math.floor(alert.uptime || 0)} seconds</li>
                <li>Memory Usage: ${alert.memoryUsage?.heapUsed}MB / ${alert.memoryUsage?.heapTotal}MB</li>
              </ul>
            </div>
            
            <p style="text-align: center; color: #666; font-size: 12px; margin-top: 30px;">
              This alert was generated by the Delivery System Monitoring Service
            </p>
          </div>
        </body>
      </html>
    `;
  }

  private formatSlackPayload(alert: Alert): any {
    const color = this.getSeverityColor(alert.severity);
    const emoji = this.getSeverityEmoji(alert.severity);
    
    return {
      username: 'DeliveryBot',
      icon_emoji: ':robot_face:',
      attachments: [{
        color: color,
        title: `${emoji} ${alert.title}`,
        text: alert.message,
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Source',
            value: alert.source,
            short: true
          },
          {
            title: 'Environment',
            value: alert.environment || 'Unknown',
            short: true
          },
          {
            title: 'Time',
            value: alert.timestamp.toISOString(),
            short: true
          }
        ],
        footer: 'Delivery Monitoring System',
        ts: Math.floor(alert.timestamp.getTime() / 1000)
      }]
    };
  }

  private formatSmsMessage(alert: Alert): string {
    return `🚨 DELIVERY ALERT
${alert.severity.toUpperCase()}: ${alert.title}
${alert.message}
Time: ${alert.timestamp.toLocaleTimeString()}
Environment: ${alert.environment}`;
  }

  private formatPagerDutyPayload(alert: Alert, channel: AlertChannel): any {
    return {
      routing_key: channel.config.integrationKey,
      event_action: 'trigger',
      payload: {
        summary: `${alert.title} - ${alert.message}`,
        source: alert.hostname || 'delivery-system',
        severity: this.mapToPagerDutySeverity(alert.severity),
        component: alert.source,
        group: 'delivery-platform',
        class: 'system-alert',
        custom_details: {
          environment: alert.environment,
          uptime: alert.uptime,
          memory_usage: alert.memoryUsage,
          details: alert.details
        }
      }
    };
  }

  private formatTeamsPayload(alert: Alert): any {
    const color = this.getSeverityColor(alert.severity);
    
    return {
      "@type": "MessageCard",
      "@context": "http://schema.org/extensions",
      themeColor: color.replace('#', ''),
      summary: alert.title,
      sections: [{
        activityTitle: `🚨 ${alert.title}`,
        activitySubtitle: `Severity: ${alert.severity.toUpperCase()}`,
        facts: [
          { name: 'Message', value: alert.message },
          { name: 'Source', value: alert.source },
          { name: 'Environment', value: alert.environment || 'Unknown' },
          { name: 'Time', value: alert.timestamp.toISOString() }
        ]
      }]
    };
  }

  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL: return '#dc3545';
      case AlertSeverity.HIGH: return '#fd7e14';
      case AlertSeverity.WARNING: return '#ffc107';
      case AlertSeverity.INFO: return '#17a2b8';
      default: return '#6c757d';
    }
  }

  private getSeverityEmoji(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL: return '🔴';
      case AlertSeverity.HIGH: return '🟠';
      case AlertSeverity.WARNING: return '🟡';
      case AlertSeverity.INFO: return '🔵';
      default: return '⚪';
    }
  }

  private mapToPagerDutySeverity(severity: AlertSeverity): string {
    switch (severity) {
      case AlertSeverity.CRITICAL: return 'critical';
      case AlertSeverity.HIGH: return 'error';
      case AlertSeverity.WARNING: return 'warning';
      case AlertSeverity.INFO: return 'info';
      default: return 'info';
    }
  }

  private getAlertKey(alert: Alert): string {
    return `${alert.source}-${alert.title}-${alert.severity}`;
  }

  private recordAlert(alert: Alert): void {
    const alertKey = this.getAlertKey(alert);
    this.recentAlerts.set(alertKey, alert.timestamp);
    
    // Clean up old entries periodically
    setTimeout(() => {
      this.recentAlerts.delete(alertKey);
    }, this.alertSuppressionWindow);
  }

  private generateAlertId(): string {
    return `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private getMemoryUsage() {
    const usage = process.memoryUsage();
    return {
      heapUsed: Math.round(usage.heapUsed / (1024 * 1024)),
      heapTotal: Math.round(usage.heapTotal / (1024 * 1024)),
      rss: Math.round(usage.rss / (1024 * 1024))
    };
  }

  private async sendFallbackAlert(error: Error, originalAlert: Alert): Promise<void> {
    try {
      this.logger.error(`🚨 ALERTING SYSTEM FAILURE - Original alert: ${originalAlert.title}`);
      this.logger.error(`Error: ${error.message}`);
      
      // Try to send a simple email or log to external system
      // This would be implemented based on your fallback requirements
      
    } catch (fallbackError) {
      this.logger.error('Even fallback alerting failed:', fallbackError);
    }
  }

  // Public methods for configuration
  addAlertChannel(name: string, channel: AlertChannel): void {
    this.alertChannels.set(name, channel);
  }

  removeAlertChannel(name: string): boolean {
    return this.alertChannels.delete(name);
  }

  addAlertRule(rule: AlertRule): void {
    this.alertRules.push(rule);
  }

  getAlertChannels(): Map<string, AlertChannel> {
    return new Map(this.alertChannels);
  }

  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }
}