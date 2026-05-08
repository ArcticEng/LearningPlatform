/**
 * Email sending utility using Resend API.
 * Set RESEND_API_KEY in env vars. Free tier: 100 emails/day.
 * https://resend.com
 */

const RESEND_KEY = () => process.env.RESEND_API_KEY;

export async function sendEmail({ to, subject, html, from }) {
  const key = RESEND_KEY();
  if (!key) {
    console.warn("[EMAIL] RESEND_API_KEY not set, skipping email to", to);
    return { success: false, error: "Email not configured" };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: from || "Training Platform <noreply@onyxdigital.co.za>",
        to: Array.isArray(to) ? to : [to],
        subject,
        html,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      console.error("[EMAIL] Failed:", data);
      return { success: false, error: data.message || "Send failed" };
    }

    return { success: true, id: data.id };
  } catch (err) {
    console.error("[EMAIL] Error:", err.message);
    return { success: false, error: err.message };
  }
}

export function bookingConfirmationEmail({ studentName, courseName, date, startTime, endTime, location, tenantName, tenantLogo }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0; padding:0; background:#f5f5f5; font-family:-apple-system,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px; margin:0 auto; background:#fff;">
  <div style="background:#1a1a2e; padding:32px; text-align:center;">
    ${tenantLogo ? `<img src="${tenantLogo}" alt="" style="height:60px; border-radius:12px; margin-bottom:12px;">` : ""}
    <h1 style="margin:0; color:#fff; font-size:22px;">${tenantName}</h1>
  </div>
  <div style="padding:32px;">
    <h2 style="color:#1a1a2e; margin:0 0 8px; font-size:20px;">Booking Confirmed ✓</h2>
    <p style="color:#666; margin:0 0 24px; font-size:15px;">Hi ${studentName}, your booking has been confirmed.</p>

    <div style="background:#f8f9fb; border-radius:12px; padding:20px; margin-bottom:24px;">
      ${courseName ? `<div style="margin-bottom:12px;"><span style="color:#888; font-size:12px; text-transform:uppercase; letter-spacing:0.05em;">Course</span><br><strong style="font-size:15px; color:#1a1a2e;">${courseName}</strong></div>` : ""}
      <div style="display:flex; gap:24px; flex-wrap:wrap;">
        <div style="flex:1; min-width:120px;">
          <span style="color:#888; font-size:12px; text-transform:uppercase; letter-spacing:0.05em;">Date</span><br>
          <strong style="font-size:15px; color:#1a1a2e;">${date}</strong>
        </div>
        <div style="flex:1; min-width:120px;">
          <span style="color:#888; font-size:12px; text-transform:uppercase; letter-spacing:0.05em;">Time</span><br>
          <strong style="font-size:15px; color:#1a1a2e;">${startTime}${endTime ? ` – ${endTime}` : ""}</strong>
        </div>
      </div>
      ${location ? `<div style="margin-top:12px;"><span style="color:#888; font-size:12px; text-transform:uppercase; letter-spacing:0.05em;">Location</span><br><strong style="font-size:15px; color:#1a1a2e;">${location}</strong></div>` : ""}
    </div>

    <p style="color:#888; font-size:13px; margin:0;">If you need to cancel or reschedule, please contact us directly.</p>
  </div>
  <div style="background:#f8f9fb; padding:20px 32px; text-align:center; border-top:1px solid #eee;">
    <p style="color:#aaa; font-size:12px; margin:0;">${tenantName} • Powered by Onyx Digital</p>
  </div>
</div>
</body>
</html>`;
}

export function bookingAdminNotificationEmail({ studentName, studentEmail, studentPhone, courseName, date, startTime, endTime, location, tenantName }) {
  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0; padding:0; background:#f5f5f5; font-family:-apple-system,'Segoe UI',Roboto,sans-serif;">
<div style="max-width:560px; margin:0 auto; background:#fff;">
  <div style="background:#1a2e6b; padding:24px 32px;">
    <h1 style="margin:0; color:#fff; font-size:18px;">New Booking Received</h1>
  </div>
  <div style="padding:32px;">
    <div style="background:#f8f9fb; border-radius:12px; padding:20px; margin-bottom:20px;">
      <div style="margin-bottom:12px;"><span style="color:#888; font-size:12px; text-transform:uppercase;">Student</span><br><strong style="font-size:15px;">${studentName}</strong></div>
      <div style="margin-bottom:12px;"><span style="color:#888; font-size:12px; text-transform:uppercase;">Email</span><br><strong style="font-size:15px;">${studentEmail}</strong></div>
      ${studentPhone ? `<div style="margin-bottom:12px;"><span style="color:#888; font-size:12px; text-transform:uppercase;">Phone</span><br><strong style="font-size:15px;">${studentPhone}</strong></div>` : ""}
    </div>
    <div style="background:#f8f9fb; border-radius:12px; padding:20px;">
      ${courseName ? `<div style="margin-bottom:12px;"><span style="color:#888; font-size:12px; text-transform:uppercase;">Course</span><br><strong style="font-size:15px;">${courseName}</strong></div>` : ""}
      <div style="margin-bottom:12px;"><span style="color:#888; font-size:12px; text-transform:uppercase;">Date</span><br><strong style="font-size:15px;">${date}</strong></div>
      <div style="margin-bottom:12px;"><span style="color:#888; font-size:12px; text-transform:uppercase;">Time</span><br><strong style="font-size:15px;">${startTime}${endTime ? ` – ${endTime}` : ""}</strong></div>
      ${location ? `<div><span style="color:#888; font-size:12px; text-transform:uppercase;">Location</span><br><strong style="font-size:15px;">${location}</strong></div>` : ""}
    </div>
  </div>
  <div style="background:#f8f9fb; padding:16px 32px; text-align:center; border-top:1px solid #eee;">
    <p style="color:#aaa; font-size:12px; margin:0;">${tenantName} • Onyx Digital Training Platform</p>
  </div>
</div>
</body>
</html>`;
}
