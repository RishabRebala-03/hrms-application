import os
from email_service import EmailService  # provides the class

# ---- Credentials (use env vars in prod) ----
EMAIL_USERNAME = os.getenv("MAIL_USERNAME", "rishabrebala@naxrita.com")
EMAIL_PASSWORD = os.getenv("MAIL_PASSWORD", "Rishab@057203")  # MFA OFF -> regular password works
EMAIL_SENDER   = os.getenv("MAIL_SENDER", EMAIL_USERNAME)

# ---- Outlook SMTP ----
SMTP_SERVER = "smtp.office365.com"
SMTP_PORT   = 587       # STARTTLS
USE_TLS     = True
USE_SSL     = False
TIMEOUT_SEC = 30

# ---- Export a ready-to-use service instance ----
email_service = EmailService(
    smtp_server=SMTP_SERVER,
    smtp_port=SMTP_PORT,
    sender_email=EMAIL_SENDER,
    sender_password=EMAIL_PASSWORD,
    timeout=TIMEOUT_SEC,
)