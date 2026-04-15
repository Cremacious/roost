import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY?.trim();
const authEmailFrom = process.env.AUTH_EMAIL_FROM?.trim();

function getResendClient(): Resend {
  if (!resendApiKey) {
    throw new Error("[auth-email] RESEND_API_KEY is not configured");
  }

  return new Resend(resendApiKey);
}

function getFromAddress(): string {
  if (!authEmailFrom) {
    throw new Error("[auth-email] AUTH_EMAIL_FROM is not configured");
  }

  return authEmailFrom;
}

function buildResetPasswordHtml(resetUrl: string, name: string): string {
  return `
    <div style="background:#fff7f7;padding:32px 20px;font-family:Nunito,Arial,sans-serif;color:#2f0d0d;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border:1px solid #f5c5c5;border-bottom:4px solid #dbadb0;border-radius:24px;padding:32px 28px;">
        <p style="margin:0 0 8px;font-size:12px;font-weight:800;letter-spacing:0.08em;text-transform:uppercase;color:#b91c1c;">Roost account</p>
        <h1 style="margin:0 0 12px;font-size:28px;line-height:1.1;color:#7f1d1d;">Reset your password</h1>
        <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#5f3a3a;">
          Hi ${name || "there"}, we got a request to reset the password for your Roost account.
        </p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#5f3a3a;">
          Use the button below to choose a new password. This link expires in one hour.
        </p>
        <a
          href="${resetUrl}"
          style="display:inline-block;background:#b91c1c;color:#fff7f7;text-decoration:none;font-weight:800;font-size:14px;padding:14px 18px;border-radius:14px;border-bottom:3px solid #7f1d1d;"
        >
          Reset password
        </a>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#7a3f3f;">
          If the button does not work, copy and paste this link into your browser:
        </p>
        <p style="margin:8px 0 0;font-size:13px;line-height:1.6;word-break:break-word;color:#7f1d1d;">
          <a href="${resetUrl}" style="color:#7f1d1d;">${resetUrl}</a>
        </p>
        <p style="margin:24px 0 0;font-size:13px;line-height:1.6;color:#7a3f3f;">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    </div>
  `;
}

export async function sendPasswordResetEmail(params: {
  name: string;
  resetUrl: string;
  to: string;
}): Promise<void> {
  const resend = getResendClient();
  const from = getFromAddress();

  await resend.emails.send({
    from,
    to: params.to,
    subject: "Reset your Roost password",
    html: buildResetPasswordHtml(params.resetUrl, params.name),
    text: [
      `Hi ${params.name || "there"},`,
      "",
      "We got a request to reset the password for your Roost account.",
      `Reset it here: ${params.resetUrl}`,
      "",
      "If you did not request this, you can safely ignore this email.",
    ].join("\n"),
  });
}
