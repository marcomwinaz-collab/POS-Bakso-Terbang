"use client";

import { useEffect } from "react";
import { Printer } from "lucide-react";

export function PrintButton() {
  useEffect(() => {
    const t = setTimeout(() => window.print(), 400);
    return () => clearTimeout(t);
  }, []);
  return (
    <button className="btn-primary" onClick={() => window.print()}>
      <Printer size={16} /> Cetak
    </button>
  );
}
