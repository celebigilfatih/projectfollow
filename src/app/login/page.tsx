"use client";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
 

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const res = await signIn("credentials", { email, password, redirect: false });
      if (res?.ok) {
        router.replace("/");
      } else {
        setError("Giriş başarısız");
      }
    } catch {
      setError("Giriş başarısız");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-md border bg-white p-6 shadow">
        <h1 className="text-xl font-semibold">Giriş</h1>
        <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Şifre" required />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" className="w-full">Giriş Yap</Button>
      </form>
    </div>
  );
}
