"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

export function AccountShortcut() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  if (pathname === "/login" || isPending) {
    return null;
  }

  if (!session) {
    return <Link className="account-shortcut" href="/login">Entrar</Link>;
  }

  if (pathname === "/") {
    return null;
  }

  return <button
    className="account-shortcut"
    type="button"
    onClick={async () => {
      await authClient.signOut();
      router.refresh();
    }}
  >Sair</button>;
}
