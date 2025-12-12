"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="mx-auto max-w-2xl px-6 py-6">
      <h2 className="mb-2 text-xl font-semibold">Bir hata oluştu</h2>
      <p className="text-sm text-zinc-600">{error.message}</p>
      <button onClick={reset} className="mt-3 rounded bg-black px-3 py-2 text-white">Tekrar dene</button>
    </div>
  );
}
