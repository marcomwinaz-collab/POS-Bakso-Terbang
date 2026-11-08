"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Receipt,
  UtensilsCrossed,
  Tags,
  Boxes,
  Armchair,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { logout } from "@/app/actions/auth";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, admin: true },
  { href: "/kasir", label: "Kasir", icon: ShoppingCart },
  { href: "/pesanan", label: "Open Bill", icon: ClipboardList },
  { href: "/transaksi", label: "Transaksi", icon: Receipt },
  { href: "/produk", label: "Produk", icon: UtensilsCrossed, admin: true },
  { href: "/kategori", label: "Kategori", icon: Tags, admin: true },
  { href: "/stok", label: "Stok", icon: Boxes, admin: true },
  { href: "/meja", label: "Meja", icon: Armchair, admin: true },
  { href: "/pengguna", label: "Pengguna", icon: Users, admin: true },
  { href: "/pengaturan", label: "Pengaturan", icon: Settings, admin: true },
];

export function Sidebar({ user }: { user: { name: string; role: string } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = NAV.filter((n) => !n.admin || user.role === "ADMIN");

  return (
    <>
      <button
        className="no-print fixed top-3 left-3 z-40 rounded-lg bg-white p-2 shadow lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="Buka menu"
      >
        <Menu size={20} />
      </button>
      {open && <div className="fixed inset-0 z-40 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
      <aside
        className={`no-print fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-stone-900 text-stone-300 transition-transform lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-3 px-5 py-5">
          <img src="/logo.svg" alt="" className="h-9 w-9" />
          <div className="leading-tight">
            <div className="font-bold text-white">Bakso Terbang</div>
            <div className="text-xs text-stone-400">Point of Sale</div>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu">
            <X size={18} />
          </button>
        </div>
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3">
          {items.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition ${
                  active ? "bg-brand-600 text-white" : "hover:bg-stone-800 hover:text-white"
                }`}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-stone-800 p-4">
          <div className="mb-3 text-sm">
            <div className="font-medium text-white">{user.name}</div>
            <div className="text-xs text-stone-400">{user.role === "ADMIN" ? "Administrator" : "Kasir"}</div>
          </div>
          <form action={logout}>
            <button className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-stone-800 hover:text-white">
              <LogOut size={16} /> Keluar
            </button>
          </form>
        </div>
      </aside>
    </>
  );
}
