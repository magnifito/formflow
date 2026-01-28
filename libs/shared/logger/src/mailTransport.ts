import winston from 'winston';
import * as nodemailer from 'nodemailer';

export interface SystemMailTransportOptions {
  to?: string;
  from?: string;
}

export class SystemMailTransport extends (winston as any).Transport {
  private transporter: nodemailer.Transporter | null = null;
  private to: string;
  private from: string;

  constructor(opts: SystemMailTransportOptions = {}) {
    super(opts);

    this.to = opts.to || process.env.SYSTEM_MAIL_TO || '';
    this.from = opts.from || process.env.SYSTEM_MAIL_USER || 'system-alerts@localhost';

    const host = process.env.SYSTEM_MAIL_HOST;
    const port = parseInt(process.env.SYSTEM_MAIL_SMTP_PORT || '587', 10);
    const user = process.env.SYSTEM_MAIL_USER;
    const pass = process.env.SYSTEM_MAIL_PASSWORD;

    if (this.to && host) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure: port === 465,
        auth: user && pass ? { user, pass } : undefined,
        tls: {
          rejectUnauthorized: false
        },
        ignoreTLS: host === '127.0.0.1' || host === 'localhost' || port === 1025 || port === 1026,
      });
    }
  }

  log(info: any, callback: () => void) {
    setImmediate(() => {
      this.emit('logged', info);
    });

    if (!this.transporter || !this.to || info.level !== 'error') {
      callback();
      return;
    }

    const { message, level, timestamp, service, stack, ...meta } = info;

    // Construct email content
    const subject = `[System Alert] [${service || 'Unknown'}] ${message}`;
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 800px; margin: 0 auto; padding: 20px; }
            .header { background-color: #dc3545; color: white; padding: 20px; border-radius: 5px 5px 0 0; }
            .header h1 { margin: 0; font-size: 24px; }
            .content { border: 1px solid #ddd; border-top: none; padding: 20px; border-radius: 0 0 5px 5px; }
            .meta-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px; background: #f8f9fa; padding: 15px; border-radius: 5px; }
            .meta-item strong { display: block; color: #666; font-size: 0.9em; text-transform: uppercase; margin-bottom: 5px; }
            .message-box { background-color: #fff3cd; border-left: 5px solid #ffc107; padding: 15px; margin-bottom: 20px; }
            .section-title { border-bottom: 2px solid #eee; padding-bottom: 10px; margin-top: 30px; margin-bottom: 15px; color: #444; }
            pre { background: #2d2d2d; color: #f8f8f2; padding: 15px; border-radius: 5px; overflow-x: auto; font-family: 'Menlo', 'Monaco', 'Courier New', monospace; font-size: 13px; }
            .footer { margin-top: 30px; text-align: center; color: #888; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>System Critical Alert</h1>
            </div>
            <div class="content">
              <div class="meta-grid">
                <div class="meta-item">
                  <strong>Service</strong>
                  ${service || 'Unknown Scanner'}
                </div>
                <div class="meta-item">
                  <strong>Environment</strong>
                  ${process.env.NODE_ENV || 'development'}
                </div>
                <div class="meta-item">
                  <strong>Level</strong>
                  <span style="color: #dc3545; font-weight: bold;">${level.toUpperCase()}</span>
                </div>
                <div class="meta-item">
                  <strong>Time</strong>
                  ${timestamp || new Date().toISOString()}
                </div>
              </div>

              <div class="message-box">
                <h3 style="margin-top: 0;">Error Message</h3>
                ${message}
              </div>

              ${stack ? `
                <h3 class="section-title">Stack Trace</h3>
                <pre>${stack}</pre>
              ` : ''}

              ${Object.keys(meta).length > 0 ? `
                <h3 class="section-title">Context Metadata</h3>
                <pre>${JSON.stringify(meta, null, 2)}</pre>
              ` : ''}
              
              <div class="footer">
                <p>This is an automated alert from the FormFlow System Notification Service.</p>
                <p>Host: ${process.env.SYSTEM_MAIL_HOST || 'local'}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `;

    this.transporter.sendMail({
      from: this.from,
      to: this.to,
      subject,
      html,
    }).catch(err => {
      // Prevent infinite loop by not logging with winston
      console.error('Failed to send system error email:', err);
    }).finally(() => {
      // We don't wait for email to send to call callback, to avoid blocking
    });

    callback();
  }
}
