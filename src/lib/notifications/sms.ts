// SMS notification stub for Africa's Talking integration
// Set VITE_AFRICA_TALKING_API_KEY and VITE_AFRICA_TALKING_USERNAME in .env
// (Cloudflare secrets) to activate live SMS delivery.

export interface SmsPayload {
  to: string; // phone number with country code e.g. "+250788687288"
  message: string;
  from?: string; // sender ID if configured
}

export interface SmsResult {
  sent: boolean;
  provider: "africa_talking" | "stub";
  message?: string;
}

export async function sendSms(payload: SmsPayload): Promise<SmsResult> {
  const apiKey = import.meta.env.VITE_AFRICA_TALKING_API_KEY;
  const username = import.meta.env.VITE_AFRICA_TALKING_USERNAME;

  if (!apiKey || !username) {
    // Stub mode — log what would be sent, return gracefully without throwing.
    // SMS is supplementary; a failed/unconfigured send must never break the
    // main UI flow.
    console.info("[SMS stub] Would send:", payload);
    return { sent: false, provider: "stub", message: "SMS not configured yet" };
  }

  // TODO: implement Africa's Talking API call here when key is available.
  // Reference: https://developers.africastalking.com/docs/sms/sending
  // const response = await fetch("https://api.africastalking.com/version1/messaging", {
  //   method: "POST",
  //   headers: {
  //     "Content-Type": "application/x-www-form-urlencoded",
  //     Accept: "application/json",
  //     apiKey,
  //   },
  //   body: new URLSearchParams({
  //     username,
  //     to: payload.to,
  //     message: payload.message,
  //     ...(payload.from ? { from: payload.from } : {}),
  //   }),
  // });
  return { sent: false, provider: "stub", message: "Africa's Talking integration pending" };
}

// Pre-built message templates for San Brothers use cases.
export const SMS_TEMPLATES = {
  caseStatusUpdate: (clientName: string, status: string, caseId: string) =>
    `Hi ${clientName}, your San Brothers case (${caseId.slice(0, 8)}) has been updated to: ${status}. Login to track: https://san-brothers.aroi-dev00.workers.dev/dashboard`,

  paymentReceived: (clientName: string, amount: string) =>
    `Hi ${clientName}, San Brothers received your payment of ${amount}. Thank you! Questions? Reply or call +250 788 687 288`,

  caseCompleted: (clientName: string, serviceName: string) =>
    `Hi ${clientName}, great news! Your ${serviceName} with San Brothers is complete. Login to download your documents: https://san-brothers.aroi-dev00.workers.dev/dashboard`,

  newMessageFromStaff: (clientName: string) =>
    `Hi ${clientName}, you have a new message from San Brothers. Login to reply: https://san-brothers.aroi-dev00.workers.dev/dashboard/messages`,
};
