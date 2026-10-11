import "server-only";

import { headers } from "next/headers";

import { getAuth } from "@/lib/auth";

export async function getAuthenticatedUser() {
  const session = await getAuth().api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function requireAuthenticatedUser() {
  const user = await getAuthenticatedUser();

  if (!user) {
    throw new Error("UNAUTHORIZED");
  }

  return user;
}
