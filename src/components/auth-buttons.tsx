"use client";
import { signOut } from "next-auth/react";
import Link from "next/link";

export default function AuthButtons({ session }: { session: any }) {
  if (session) {
    return (
      <button onClick={() => signOut()} className="rounded bg-blue-600 hover:bg-blue-700 px-3 py-1 text-white">Çıkış</button>
    );
  }
  return <Link href="/login" className="rounded border px-3 py-1">Giriş</Link>;
}
