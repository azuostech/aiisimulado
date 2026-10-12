"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { authClient } from "@/lib/auth-client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");

    const result = mode === "signup"
      ? await authClient.signUp.email({
          name: String(form.get("name") ?? "").trim(),
          email,
          password,
        })
      : await authClient.signIn.email({ email, password });

    if (result.error) {
      setError(mode === "signup"
        ? "Não foi possível criar a conta. Confira os dados e tente novamente."
        : "E-mail ou senha inválidos.");
      setPending(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return <main className="auth-page">
    <Link className="auth-back" href="/">← Voltar</Link>
    <section className="auth-card">
      <p className="overline">SIMULADO AI</p>
      <h1>{mode === "login" ? "Entre na sua conta" : "Crie sua conta"}</h1>
      <p>Salve seus simulados, respostas e evolução com segurança.</p>
      <div className="auth-tabs" role="tablist">
        <button type="button" className={mode === "login" ? "active" : ""} onClick={() => { setMode("login"); setError(""); }}>Entrar</button>
        <button type="button" className={mode === "signup" ? "active" : ""} onClick={() => { setMode("signup"); setError(""); }}>Criar conta</button>
      </div>
      <form onSubmit={submit}>
        {mode === "signup" && <label>Nome<input name="name" minLength={2} maxLength={80} autoComplete="name" required /></label>}
        <label>E-mail<input name="email" type="email" autoComplete="email" required /></label>
        <label>Senha<input name="password" type="password" minLength={10} maxLength={128} autoComplete={mode === "login" ? "current-password" : "new-password"} required /></label>
        {mode === "signup" && <small>Use pelo menos 10 caracteres.</small>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <button className="start-button" disabled={pending}>{pending ? "Aguarde…" : mode === "login" ? "Entrar" : "Criar conta"}</button>
      </form>
    </section>
  </main>;
}
