"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

export function AutoPrint({ auto }: { auto: boolean }) {
  useEffect(() => {
    if (!auto) return;
    const t = setTimeout(() => window.print(), 300);
    return () => clearTimeout(t);
  }, [auto]);
  return (
    <button className="btn-primary no-print mb-4" onClick={() => window.print()}>
      <Printer size={16} /> Cetak
    </button>
  );
}
