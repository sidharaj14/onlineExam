import asyncio
import logging
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional
from fastapi import HTTPException, status

from app.core.config import settings

logger = logging.getLogger(__name__)

def _build_html_email(otp_code: str, action: str, recipient_email: str) -> str:
    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Security Verification Code</title>
  <style>
    body {{
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f8fafc;
      margin: 0;
      padding: 32px 16px;
      color: #0f172a;
    }}
    .container {{
      max-width: 520px;
      margin: 0 auto;
      background: #ffffff;
      border-radius: 16px;
      border: 1px solid #e2e8f0;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05);
      overflow: hidden;
    }}
    .header {{
      background: linear-gradient(135deg, #3730a3 0%, #4f46e5 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }}
    .header h1 {{
      margin: 0 0 6px 0;
      font-size: 22px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }}
    .header p {{
      margin: 0;
      font-size: 13px;
      opacity: 0.9;
    }}
    .body {{
      padding: 32px 24px;
      text-align: center;
    }}
    .greeting {{
      font-size: 15px;
      color: #334155;
      margin-bottom: 20px;
      line-height: 1.5;
    }}
    .otp-box {{
      margin: 24px auto;
      padding: 18px 24px;
      background: #f1f5f9;
      border: 2px dashed #6366f1;
      border-radius: 12px;
      display: inline-block;
    }}
    .otp-code {{
      font-family: 'Courier New', Courier, monospace;
      font-size: 34px;
      font-weight: 800;
      letter-spacing: 8px;
      color: #312e81;
      margin: 0;
    }}
    .expiry {{
      font-size: 13px;
      color: #64748b;
      margin-top: 8px;
    }}
    .notice {{
      margin-top: 28px;
      padding: 14px 16px;
      background: #fffbeb;
      border: 1px solid #fef3c7;
      border-radius: 8px;
      font-size: 12px;
      color: #92400e;
      text-align: left;
      line-height: 1.5;
    }}
    .footer {{
      background: #f8fafc;
      padding: 18px 24px;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      font-size: 11px;
      color: #94a3b8;
    }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Online Examination System</h1>
      <p>Secure AI-Proctored Examination Platform</p>
    </div>
    <div class="body">
      <div class="greeting">
        Hello,<br />
        You requested a verification code for <strong>{action}</strong> on the examination portal.
      </div>
      <div class="otp-box">
        <div class="otp-code">{otp_code}</div>
      </div>
      <div class="expiry">
        This single-use code expires in <strong>{settings.OTP_EXPIRE_MINUTES} minutes</strong>.
      </div>
      <div class="notice">
        <strong>Security Notice:</strong> Never share this code with anyone, including exam invigilators or proctors. If you did not request this code, please disregard this email.
      </div>
    </div>
    <div class="footer">
      This is an automated security notification sent to {recipient_email}.<br />
      &copy; 2026 AI-Powered Secure Examination System. All rights reserved.
    </div>
  </div>
</body>
</html>"""

def _send_smtp_sync(to_email: str, subject: str, html_content: str, text_content: str) -> None:
    """Synchronous SMTP email delivery to run inside a thread pool."""
    if settings.DEV_MODE:
        logger.info(f"[DEV_MODE / TESTS] Skipping live SMTP delivery for {to_email}")
        return

    smtp_user = settings.SMTP_USER.strip() if settings.SMTP_USER else ""
    smtp_password = settings.SMTP_PASSWORD.replace(" ", "").strip() if settings.SMTP_PASSWORD else ""

    if not settings.SMTP_HOST or not smtp_user or not smtp_password:
        raise ValueError(
            "SMTP server is not configured. Please set SMTP_HOST, SMTP_USER, and SMTP_PASSWORD in backend/.env"
        )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = settings.SMTP_FROM or smtp_user
    msg["To"] = to_email

    # Attach plain text and HTML fallback
    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))

    if settings.SMTP_PORT == 465:
        # SSL
        server = smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
    else:
        # STARTTLS (Port 587 or 25)
        server = smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=15)
        server.ehlo()
        server.starttls()
        server.ehlo()

    try:
        server.login(smtp_user, smtp_password)
        server.sendmail(settings.SMTP_FROM or smtp_user, [to_email], msg.as_string())
        logger.info(f"Successfully dispatched OTP email to {to_email} via {settings.SMTP_HOST}")
    finally:
        try:
            server.quit()
        except Exception:
            pass

async def send_otp_email(to_email: str, otp_code: str, action: str = "Account Verification") -> None:
    """
    Asynchronously delivers a real 6-digit OTP email to the candidate's inbox.
    Runs non-blocking inside asyncio thread pool.
    """
    subject = "Your Verification Code - Online Examination System"
    text_content = (
        f"Online Examination System\n\n"
        f"Your verification code is: {otp_code}\n\n"
        f"This code expires in {settings.OTP_EXPIRE_MINUTES} minutes.\n\n"
        f"If you did not request this code, ignore this email."
    )
    html_content = _build_html_email(otp_code, action, to_email)

    try:
        await asyncio.to_thread(_send_smtp_sync, to_email, subject, html_content, text_content)
    except ValueError as ve:
        logger.warning(f"SMTP not configured: {ve}")
        # When SMTP is not yet configured, provide a clear friendly instruction
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "SMTP email service is not yet configured in backend/.env. "
                "Please add SMTP_HOST, SMTP_USER, and SMTP_PASSWORD to send real emails."
            )
        )
    except smtplib.SMTPAuthenticationError as auth_err:
        logger.error(f"SMTP Authentication Error: {auth_err}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Email delivery failed: Invalid SMTP credentials. Please check your Gmail App Password."
        )
    except Exception as exc:
        logger.error(f"Failed to send email to {to_email}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="We couldn't send the verification email. Please try again in a moment."
        )
