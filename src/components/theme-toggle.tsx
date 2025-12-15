"use client";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sun, Moon } from "lucide-react";

export default function ThemeToggle() {
  const [dark, setDark] = useState<boolean>(false);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("theme");
      const preferDark = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
      const initialDark = stored ? stored === "dark" : preferDark;
      setDark(initialDark);
      document.documentElement.classList.toggle("dark", initialDark);
    } catch {}
  }, []);
  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("theme", next ? "dark" : "light"); } catch {}
  };
  return (
    <Button variant="outline" size="sm" onClick={toggle} aria-label="Tema değiştir" className="transition-colors">
      {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
    </Button>
  );
}
