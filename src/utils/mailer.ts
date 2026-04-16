import nodemailer from "nodemailer";

interface SendOnboardingEmailArgs {
  to: string;
  role: string;
  password?: string;
  schoolCode?: string;
  vendorName?: string;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Send onboarding credentials to newly created users
 */
export const sendOnboardingEmail = async (args: SendOnboardingEmailArgs) => {
  const { to, role, password, schoolCode, vendorName } = args;
  
  const loginUrl = process.env.FRONTEND_URL || "https://id-card-frontend.onrender.com";
  const systemName = "I-Card Print System";

  // Pretty role names
  const roleDisplay = role.replace("_", " ");

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
      <h2 style="color: #0E5484; text-align: center;">Welcome to ${systemName}</h2>
      <p>Hello,</p>
      <p>Your account has been successfully created as a <strong>${roleDisplay}</strong>.</p>
      
      <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
        <h3 style="margin-top: 0; font-size: 16px;">Your Login Credentials:</h3>
        <p style="margin: 5px 0;"><strong>Email:</strong> ${to}</p>
        ${password ? `<p style="margin: 5px 0;"><strong>Temporary Password:</strong> <code style="background: #eee; padding: 2px 5px;">${password}</code></p>` : ""}
        ${schoolCode ? `<p style="margin: 5px 0;"><strong>School Code:</strong> ${schoolCode}</p>` : ""}
        ${vendorName ? `<p style="margin: 5px 0;"><strong>Vendor Name:</strong> ${vendorName}</p>` : ""}
      </div>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${loginUrl}" style="background-color: #0E5484; color: white; padding: 12px 25px; text-decoration: none; border-radius: 5px; font-weight: bold;">Login to Dashboard</a>
      </div>

      <p style="color: #666; font-size: 14px;"><strong>Important:</strong> For security reasons, please change your password immediately after your first login.</p>
      <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
      <p style="color: #999; font-size: 12px; text-align: center;">This is an automated message, please do not reply to this email.</p>
    </div>
  `;

  const text = `
Welcome to ${systemName}

Your account has been created as a ${roleDisplay}.

Your Login Credentials:
Email: ${to}
${password ? `Temporary Password: ${password}` : ""}
${schoolCode ? `School Code: ${schoolCode}` : ""}
${vendorName ? `Vendor Name: ${vendorName}` : ""}

Login to Dashboard: ${loginUrl}

Please change your password immediately after logging in.
  `;

  try {
    const info = await transporter.sendMail({
      from: `"${systemName}" <${process.env.SMTP_USER}>`,
      to,
      subject: `Your ${roleDisplay} Account Credentials - ${systemName}`,
      text,
      html,
    });

    console.log("📧 Onboarding email sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("❌ Failed to send onboarding email:", error);
    // We don't throw here to avoid failing the user creation if email fails
    // but in a production app you might want to log this to a monitoring service
    return null;
  }
};

// Deprecated: kept for backward compatibility if needed during transition
export const sendSchoolAdminCredentials = async ({ to, schoolCode, password }: any) => {
  return sendOnboardingEmail({ to, role: "SCHOOL_ADMIN", password, schoolCode });
};
