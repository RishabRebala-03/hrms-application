import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

OUTLOOK_SMTP_SERVER = "smtp.office365.com"
OUTLOOK_SMTP_PORT = 587  # STARTTLS

class EmailService:
    def __init__(self, smtp_server=OUTLOOK_SMTP_SERVER, smtp_port=OUTLOOK_SMTP_PORT,
                 sender_email="", sender_password="", timeout=30):
        self.smtp_server = smtp_server
        self.smtp_port = smtp_port
        self.sender_email = sender_email
        self.sender_password = sender_password
        self.timeout = timeout
    
    def send_email(self, to_email, cc_email, subject, html_content):
        """Send an email with HTML content via Outlook SMTP (STARTTLS)."""
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.sender_email
            msg['To'] = to_email
            if cc_email:
                msg['Cc'] = cc_email
            
            # Attach HTML content
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Build recipients (supports comma-separated CC)
            recipients = [addr.strip() for addr in [to_email] if addr]
            if cc_email:
                recipients += [addr.strip() for addr in cc_email.split(",") if addr.strip()]

            # Send email via Outlook SMTP (STARTTLS)
            with smtplib.SMTP(self.smtp_server, self.smtp_port, timeout=self.timeout) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(self.sender_email, self.sender_password)
                server.sendmail(self.sender_email, recipients, msg.as_string())
            
            print(f"✅ Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            print(f"❌ Failed to send email: {str(e)}")
            return False
    
    def send_leave_application_notification(self, employee_data, manager_data, leave_data):
        """Send leave application notification to manager with CC to employee"""
        
        subject = f"🔔 Leave Application from {employee_data['name']}"
        
        # Format dates
        start_date = datetime.strptime(leave_data['start_date'], '%Y-%m-%d').strftime('%B %d, %Y')
        end_date = datetime.strptime(leave_data['end_date'], '%Y-%m-%d').strftime('%B %d, %Y')
        
        # Create HTML email content
        html_content = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <style>
                body {{
                    font-family: Arial, sans-serif;
                    line-height: 1.6;
                    color: #333;
                }}
                .container {{
                    max-width: 600px;
                    margin: 0 auto;
                    padding: 20px;
                    background-color: #f9fafb;
                }}
                .header {{
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 30px;
                    border-radius: 12px 12px 0 0;
                    text-align: center;
                }}
                .content {{
                    background: white;
                    padding: 30px;
                    border-radius: 0 0 12px 12px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                }}
                .info-row {{
                    display: flex;
                    padding: 12px 0;
                    border-bottom: 1px solid #e5e7eb;
                }}
                .info-label {{
                    font-weight: 600;
                    color: #6b7280;
                    width: 140px;
                }}
                .info-value {{
                    color: #111827;
                }}
                .leave-type {{
                    display: inline-block;
                    background: #fffbeb;
                    color: #d97706;
                    padding: 6px 16px;
                    border-radius: 20px;
                    font-weight: 600;
                    margin: 10px 0;
                }}
                .footer {{
                    text-align: center;
                    padding: 20px;
                    color: #6b7280;
                    font-size: 12px;
                }}
                .button {{
                    display: inline-block;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 12px 32px;
                    text-decoration: none;
                    border-radius: 8px;
                    margin-top: 20px;
                    font-weight: 600;
                }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1 style="margin: 0; font-size: 24px;">📋 New Leave Application</h1>
                    <p style="margin: 10px 0 0 0; opacity: 0.9;">Requires Your Approval</p>
                </div>
                
                <div class="content">
                    <p>Dear {manager_data['name']},</p>
                    
                    <p>A new leave application has been submitted and requires your approval.</p>
                    
                    <h3 style="color: #667eea; margin-top: 25px;">Employee Details</h3>
                    
                    <div class="info-row">
                        <div class="info-label">Employee Name:</div>
                        <div class="info-value">{employee_data['name']}</div>
                    </div>
                    
                    <div class="info-row">
                        <div class="info-label">Designation:</div>
                        <div class="info-value">{employee_data['designation']}</div>
                    </div>
                    
                    <div class="info-row">
                        <div class="info-label">Department:</div>
                        <div class="info-value">{employee_data['department']}</div>
                    </div>
                    
                    <div class="info-row">
                        <div class="info-label">Email:</div>
                        <div class="info-value">{employee_data['email']}</div>
                    </div>
                    
                    <h3 style="color: #667eea; margin-top: 25px;">Leave Details</h3>
                    
                    <div class="info-row">
                        <div class="info-label">Leave Type:</div>
                        <div class="info-value">
                            <span class="leave-type">{leave_data['leave_type']}</span>
                        </div>
                    </div>
                    
                    <div class="info-row">
                        <div class="info-label">Start Date:</div>
                        <div class="info-value">{start_date}</div>
                    </div>
                    
                    <div class="info-row">
                        <div class="info-label">End Date:</div>
                        <div class="info-value">{end_date}</div>
                    </div>
                    
                    <div class="info-row">
                        <div class="info-label">Duration:</div>
                        <div class="info-value">{leave_data['days']} day(s)</div>
                    </div>
                    
                    {f'''
                    <div class="info-row" style="border-bottom: none;">
                        <div class="info-label">Reason:</div>
                        <div class="info-value">{leave_data['reason']}</div>
                    </div>
                    ''' if leave_data.get('reason') else ''}
                    
                    <div style="text-align: center, margin-top: 30px;">
                        <p style="color: #6b7280; font-size: 14px;">Please log in to the HR Portal to approve or reject this leave application.</p>
                        <a href="http://localhost:3000" class="button">Go to HR Portal</a>
                    </div>
                </div>
                
                <div class="footer">
                    <p>This is an automated notification from the Naxrita HR Portal.</p>
                    <p>© {datetime.now().year} Naxrita. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return self.send_email(
            to_email=manager_data['email'],
            cc_email=employee_data['email'],
            subject=subject,
            html_content=html_content
        )