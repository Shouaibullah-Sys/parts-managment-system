// // lib/sms-notifications.ts
// import twilio from "twilio";

// const client = twilio(
//   process.env.TWILIO_ACCOUNT_SID,
//   process.env.TWILIO_AUTH_TOKEN
// );

// export async function sendSMSNotification(
//   phoneNumber: string,
//   message: string
// ) {
//   try {
//     const result = await client.messages.create({
//       body: message,
//       from: process.env.TWILIO_PHONE_NUMBER,
//       to: phoneNumber,
//     });

//     console.log("SMS sent:", result.sid);
//     return true;
//   } catch (error) {
//     console.error("Error sending SMS:", error);
//     return false;
//   }
// }

// // Format low stock SMS message
// export function formatLowStockSMS(parts: LowStockNotification[]) {
//   const criticalCount = parts.filter((p) => p.current_stock === 0).length;
//   const totalCount = parts.length;

//   if (criticalCount > 0) {
//     return `🚨 هشدار موجودی: ${criticalCount} قطعه تمام شده و ${totalCount} قطعه کمبود موجودی دارد. لطفا سریعا اقدام کنید.`;
//   }

//   return `⚠️ اخطار موجودی: ${totalCount} قطعه کمبود موجودی دارد. لطفا بررسی کنید.`;
// }
