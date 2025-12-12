"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    if (res?.ok) {
      router.push("/dashboard");
    } else {
      setError("Giriş başarısız");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-md border bg-white p-6 shadow">
        <h1 className="text-xl font-semibold">Giriş</h1>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full rounded border px-3 py-2"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Şifre"
          className="w-full rounded border px-3 py-2"
          required
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" className="w-full rounded bg-black px-3 py-2 text-white">Giriş Yap</button>
      </form>
    </div>
  );
}
