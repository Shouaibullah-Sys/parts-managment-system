import { db } from "@/db/drizzle";
import { schema, user } from "@/db/schema";
import { eq } from "drizzle-orm";

import ForgotPasswordEmail from "@/components/emails/reset-password";
import VerifyEmail from "@/components/emails/verify-email";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { lastLoginMethod } from "better-auth/plugins";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY as string);

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: true,
        defaultValue: "staff",
        input: false,
      },
      approved: {
        type: "boolean",
        required: true,
        defaultValue: false,
        input: false,
      },
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      resend.emails.send({
        from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
        to: user.email,
        subject: "Verify your email",
        react: VerifyEmail({ username: user.name, verifyUrl: url }),
      });
    },
    sendOnSignUp: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    },
  },
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      resend.emails.send({
        from: `${process.env.EMAIL_SENDER_NAME} <${process.env.EMAIL_SENDER_ADDRESS}>`,
        to: user.email,
        subject: "Reset your password",
        react: ForgotPasswordEmail({
          username: user.name,
          resetUrl: url,
          userEmail: user.email,
        }),
      });
    },
    requireEmailVerification: true,
  },
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  plugins: [lastLoginMethod(), nextCookies()],
});
