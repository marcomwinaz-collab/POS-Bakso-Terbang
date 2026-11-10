"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  Receipt,
  FileBarChart,
  LineChart,
  UtensilsCrossed,
  Tags,
  Armchair,
  Store,
  Printer,
  Users,
  Settings,
  LogOut,
  Menu,
  X,
  MapPin,
  Wallet,
} from "lucide-react";
import { logout } from "@/app/actions/auth";
import { switchOutlet } from "@/app/actions/orders";

const GROUPS = [
  {
    title: "Operasional",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, admin: true },
      { href: "/kasir", label: "Kasir", icon: ShoppingCart },
      { href: "/pesanan", label: "Open Bill", icon: ClipboardList },
      { href: "/transaksi", label: "Transaksi", icon: Receipt },
      { href: "/tutup-kasir", label: "Tutup Kasir", icon: Wallet },
    ],
  },
  {
    title: "Laporan",
    admin: true,
    items: [
      { href: "/laporan", label: "Laporan Sales", icon: FileBarChart, admin: true },
      { href: "/analisis", label: "Analisis", icon: LineChart, admin: true },
    ],
  },
  {
    title: "Pengaturan",
    admin: true,
    items: [
      { href: "/produk", label: "Produk & Harga", icon: UtensilsCrossed, admin: true },
      { href: "/kategori", label: "Kategori", icon: Tags, admin: true },
      { href: "/meja", label: "No. Meja", icon: Armchair, admin: true },
      { href: "/outlet", label: "Outlet", icon: Store, admin: true },
      { href: "/printer", label: "Printer & Struk", icon: Printer, admin: true },
      { href: "/pengguna", label: "Pengguna", icon: Users, admin: true },
      { href: "/pengaturan", label: "Umum", icon: Settings, admin: true },
    ],
  },
];

type O = { id: number; name: string };

export function Sidebar({
  user,
  activeOutlet,
  outlets,
}: {
  user: { name: string; role: string };
  activeOutlet: O | null;
  outlets: O[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [, start] = useTransition();
  const isAdmin = user.role === "ADMIN";

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
        <div className="flex items-center gap-3 px-5 pt-5 pb-3">
          <div className="leading-tight">
            <img src="/logo.png" alt="Bakso Terbang" className="w-40" />
            <div className="mt-1 pl-1 text-[11px] tracking-wider text-stone-400 uppercase">Point of Sale</div>
          </div>
          <button className="ml-auto lg:hidden" onClick={() => setOpen(false)} aria-label="Tutup menu">
            <X size={18} />
          </button>
        </div>

        <div className="mx-3 mb-3 rounded-lg bg-stone-800 px-3 py-2">
          <div className="flex items-center gap-1 text-[11px] text-stone-400">
            <MapPin size={12} /> Outlet aktif
          </div>
          {isAdmin && outlets.length > 1 ? (
            <select
              className="mt-0.5 w-full bg-transparent text-sm font-medium text-white outline-none"
              value={activeOutlet?.id ?? ""}
              onChange={(e) =>
                start(async () => {
                  await switchOutlet(Number(e.target.value));
                  router.refresh();
                })
              }
            >
              {outlets.map((o) => (
                <option key={o.id} value={o.id} className="text-stone-900">
                  {o.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-sm font-medium text-white">{activeOutlet?.name ?? "Tidak ada outlet aktif"}</div>
          )}
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto px-3 pb-3">
          {GROUPS.filter((g) => !g.admin || isAdmin).map((g) => (
            <div key={g.title}>
              <div className="mb-1 px-3 text-[11px] font-semibold tracking-wider text-stone-500 uppercase">{g.title}</div>
              <div className="space-y-0.5">
                {g.items
                  .filter((n) => !n.admin || isAdmin)
                  .map(({ href, label, icon: Icon }) => {
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
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-stone-800 p-4">
          <div className="mb-3 text-sm">
            <div className="font-medium text-white">{user.name}</div>
            <div className="text-xs text-stone-400">{isAdmin ? "Administrator" : "Kasir"}</div>
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
