import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";

import { getDb } from "@/lib/db";

export const auth = betterAuth({
  appName: "Clareza AI",
  database: prismaAdapter(getDb(), { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 10,
    maxPasswordLength: 128,
  },
  user: { modelName: "User" },
  session: {
    modelName: "AuthSession",
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
  },
  account: { modelName: "AuthAccount" },
  verification: { modelName: "AuthVerification" },
  plugins: [nextCookies()],
});
