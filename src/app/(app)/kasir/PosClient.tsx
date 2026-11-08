"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Search, Trash2, ShoppingBag, CheckCircle2, Printer, MessageSquare } from "lucide-react";
import type { Category, DiningTable, Order, OrderItem, OrderType, Product } from "@/db/schema";
import { rupiah } from "@/lib/format";
import { computeTotals } from "@/lib/pricing";
import { saveOrder } from "@/app/actions/orders";
import type { PaymentMethod } from "@/db/schema";
import { previewOrder, printOrder } from "@/lib/print";
import { PaymentModal } from "@/components/PaymentModal";

type CartLine = { productId: number; name: string; price: number; qty: number; note: string };

type OutletInfo = { name: string; taxPercent: number; servicePercent: number; autoPrint: boolean; kitchen: boolean };

const TYPES: { id: OrderType; label: string }[] = [
  { id: "DINE_IN", label: "Makan di tempat" },
  { id: "TAKEAWAY", label: "Bawa pulang" },
  { id: "ONLINE", label: "Online / Ojol" },
];

export function PosClient({
  outlet,
  products,
  categories,
  tables,
  occupiedTableIds,
  editing,
}: {
  outlet: OutletInfo;
  products: Product[];
  categories: Category[];
  tables: DiningTable[];
  occupiedTableIds: number[];
  editing: { order: Order; items: OrderItem[] } | null;
}) {
  const router = useRouter();
  const productById = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);

  const [cat, setCat] = useState<number | "all">("all");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState<CartLine[]>(
    () =>
      editing?.items
        .filter((i) => i.productId && productById.has(i.productId))
        .map((i) => ({ productId: i.productId!, name: i.name, price: productById.get(i.productId!)!.price, qty: i.qty, note: i.note ?? "" })) ?? [],
  );
  const { taxPercent, servicePercent } = outlet;
  const [type, setType] = useState<OrderType>(editing?.order.type ?? "DINE_IN");
  const [guests, setGuests] = useState<number | "">(editing?.order.guests ?? "");
  const [tableId, setTableId] = useState<number | "">(editing?.order.tableId ?? "");
  const [customer, setCustomer] = useState(editing?.order.customerName ?? "");
  const [discType, setDiscType] = useState<"NOMINAL" | "PERCENT">("NOMINAL");
  const [discValue, setDiscValue] = useState<number>(editing?.order.discount ?? 0);
  const [noteFor, setNoteFor] = useState<number | null>(null);
  const [showPay, setShowPay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ orderId: number; code: string; change?: number; paid: boolean } | null>(null);
  const [pending, startTransition] = useTransition();

  const filtered = products.filter(
    (p) => (cat === "all" || p.categoryId === cat) && p.name.toLowerCase().includes(q.toLowerCase()),
  );
  const totals = computeTotals(cart, { type: discType, value: discValue }, taxPercent, servicePercent);
  const cartQty = (id: number) => cart.find((l) => l.productId === id)?.qty ?? 0;

  function add(p: Product) {
    setError(null);
    setCart((c) => {
      const i = c.findIndex((l) => l.productId === p.id);
      if (i >= 0) return c.map((l, j) => (j === i ? { ...l, qty: l.qty + 1 } : l));
      return [...c, { productId: p.id, name: p.name, price: p.price, qty: 1, note: "" }];
    });
  }

  function changeQty(id: number, delta: number) {
    setCart((c) => c.map((l) => (l.productId === id ? { ...l, qty: l.qty + delta } : l)).filter((l) => l.qty > 0));
  }

  function reset() {
    setCart([]);
    setCustomer("");
    setTableId("");
    setGuests("");
    setDiscValue(0);
    setDone(null);
    setError(null);
    if (editing) router.push("/kasir");
  }

  function submit(pay: { method: PaymentMethod; paidAmount: number } | null) {
    setError(null);
    if (type === "DINE_IN" && !tableId && !pay) {
      setError("Pilih meja untuk open bill makan di tempat.");
      return;
    }
    startTransition(async () => {
      const res = await saveOrder({
        orderId: editing?.order.id,
        type,
        tableId: type === "DINE_IN" ? tableId || null : null,
        guests: type === "DINE_IN" && guests ? guests : null,
        customerName: customer,
        items: cart.map((l) => ({ productId: l.productId, qty: l.qty, note: l.note })),
        discount: { type: discType, value: discValue },
        pay,
      });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setShowPay(false);
      setDone({ orderId: res.orderId, code: res.code, change: res.change, paid: !!pay });
      // cetak otomatis sesuai pengaturan printer outlet
      if (pay && outlet.autoPrint) printOrder(res.orderId, outlet.kitchen && !editing ? "both" : "receipt");
      else if (!pay && outlet.kitchen) printOrder(res.orderId, "kitchen");
      router.refresh();
    });
  }

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="card w-full max-w-sm p-8 text-center">
          <CheckCircle2 className="mx-auto mb-3 text-green-600" size={56} />
          <h2 className="text-xl font-bold">{done.paid ? "Pembayaran berhasil" : "Open bill tersimpan"}</h2>
          <p className="mb-4 text-sm text-stone-500">{done.code}</p>
          {done.paid && done.change !== undefined && (
            <div className="mb-5 rounded-xl bg-green-50 p-4">
              <div className="text-xs text-green-800">Kembalian</div>
              <div className="text-3xl font-bold text-green-700">{rupiah(done.change)}</div>
            </div>
          )}
          <div className="flex flex-col gap-2">
            <button className="btn-secondary" onClick={() => printOrder(done.orderId, done.paid ? "receipt" : "bill")}>
              <Printer size={16} /> {done.paid ? "Cetak Ulang Struk" : "Cetak Tagihan"}
            </button>
            <button className="btn-secondary" onClick={() => printOrder(done.orderId, "kitchen")}>
              <Printer size={16} /> Cetak Tiket Dapur
            </button>
            <button className="btn-ghost text-xs" onClick={() => previewOrder(done.orderId, done.paid ? "receipt" : "bill")}>
              Lihat struk
            </button>
            <button className="btn-primary" onClick={reset} autoFocus>
              Pesanan Baru
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col lg:h-screen lg:flex-row">
      {/* Daftar produk */}
      <section className="flex min-h-0 flex-1 flex-col px-4 pt-16 pb-4 sm:px-6 lg:pt-6">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold">{editing ? `Ubah ${editing.order.code}` : "Kasir"}</h1>
            <p className="text-xs text-stone-500">{outlet.name}</p>
          </div>
          <div className="relative ml-auto w-full sm:w-64">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
            <input className="input pl-9" placeholder="Cari menu..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
        </div>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {[{ id: "all" as const, name: "Semua" }, ...categories].map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.id)}
              className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium ${
                cat === c.id ? "bg-brand-600 text-white" : "bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50"
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
        <div className="grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-3 overflow-y-auto sm:grid-cols-3 xl:grid-cols-4">
          {filtered.map((p) => {
            const inCart = cartQty(p.id);
            return (
              <button
                key={p.id}
                onClick={() => add(p)}
                className="card relative flex min-h-24 flex-col items-start p-4 text-left transition hover:border-brand-400 hover:shadow-md active:scale-[0.98]"
              >
                {inCart > 0 && (
                  <span className="absolute top-2 right-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-600 px-1.5 text-xs font-bold text-white">
                    {inCart}
                  </span>
                )}
                <span className="mb-1 line-clamp-2 pr-6 font-semibold text-stone-900">{p.name}</span>
                <span className="mt-auto text-sm font-bold text-brand-700">{rupiah(p.price)}</span>
              </button>
            );
          })}
          {!filtered.length && <p className="col-span-full py-10 text-center text-stone-400">Menu tidak ditemukan.</p>}
        </div>
      </section>

      {/* Keranjang */}
      <aside className="flex w-full flex-col border-t border-stone-200 bg-white lg:h-screen lg:w-[400px] lg:border-t-0 lg:border-l">
        <div className="space-y-3 border-b border-stone-200 p-4">
          <div className="grid grid-cols-3 gap-1 rounded-lg bg-stone-100 p-1">
            {TYPES.map((t) => (
              <button
                key={t.id}
                onClick={() => setType(t.id)}
                className={`rounded-md py-1.5 text-xs font-medium sm:text-sm ${type === t.id ? "bg-white shadow-sm" : "text-stone-500"}`}
              >
                {t.label}
              </button>
            ))}
          </div>
          {type === "DINE_IN" ? (
            <div className="grid grid-cols-[1fr_72px_1fr] gap-2">
              <select className="input" value={tableId} onChange={(e) => setTableId(e.target.value ? Number(e.target.value) : "")} aria-label="No. meja">
                <option value="">No. meja</option>
                {tables.map((t) => (
                  <option key={t.id} value={t.id} disabled={occupiedTableIds.includes(t.id)}>
                    Meja {t.number}
                    {occupiedTableIds.includes(t.id) ? " (terisi)" : ""}
                  </option>
                ))}
              </select>
              <input
                className="input"
                inputMode="numeric"
                placeholder="Tamu"
                aria-label="Jumlah tamu"
                value={guests}
                onChange={(e) => setGuests(Number(e.target.value.replace(/\D/g, "")) || "")}
              />
              <input className="input" placeholder="Nama" value={customer} onChange={(e) => setCustomer(e.target.value)} />
            </div>
          ) : (
            <input
              className="input"
              placeholder={type === "ONLINE" ? "Platform / no. order (mis. GoFood #123)" : "Nama pelanggan"}
              value={customer}
              onChange={(e) => setCustomer(e.target.value)}
            />
          )}
        </div>

        <div className="min-h-[160px] flex-1 overflow-y-auto p-4">
          {!cart.length && (
            <div className="flex h-full flex-col items-center justify-center py-8 text-stone-400">
              <ShoppingBag size={40} className="mb-2" />
              <p className="text-sm">Pilih menu untuk ditambahkan</p>
            </div>
          )}
          <ul className="space-y-3">
            {cart.map((l) => (
              <li key={l.productId} className="rounded-lg border border-stone-100 p-3">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{l.name}</div>
                    <div className="text-xs text-stone-500">{rupiah(l.price)}</div>
                  </div>
                  <div className="text-sm font-semibold">{rupiah(l.price * l.qty)}</div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <button className="rounded-md border border-stone-200 p-1 hover:bg-stone-50" onClick={() => changeQty(l.productId, -1)} aria-label="Kurangi">
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold">{l.qty}</span>
                  <button className="rounded-md border border-stone-200 p-1 hover:bg-stone-50" onClick={() => changeQty(l.productId, 1)} aria-label="Tambah">
                    <Plus size={14} />
                  </button>
                  <button
                    className={`ml-auto rounded-md p-1 hover:bg-stone-100 ${l.note ? "text-brand-600" : "text-stone-400"}`}
                    onClick={() => setNoteFor(noteFor === l.productId ? null : l.productId)}
                    aria-label="Catatan"
                  >
                    <MessageSquare size={16} />
                  </button>
                  <button className="rounded-md p-1 text-stone-400 hover:bg-red-50 hover:text-red-600" onClick={() => changeQty(l.productId, -l.qty)} aria-label="Hapus">
                    <Trash2 size={16} />
                  </button>
                </div>
                {(noteFor === l.productId || l.note) && (
                  <input
                    className="input mt-2 py-1 text-xs"
                    placeholder="Catatan: tidak pedas, tanpa seledri..."
                    value={l.note}
                    onChange={(e) => setCart((c) => c.map((x) => (x.productId === l.productId ? { ...x, note: e.target.value } : x)))}
                  />
                )}
              </li>
            ))}
          </ul>
        </div>

        <div className="space-y-2 border-t border-stone-200 p-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-stone-600">Diskon</span>
            <select className="input ml-auto w-20 py-1" value={discType} onChange={(e) => setDiscType(e.target.value as "NOMINAL" | "PERCENT")}>
              <option value="NOMINAL">Rp</option>
              <option value="PERCENT">%</option>
            </select>
            <input
              className="input w-28 py-1 text-right"
              inputMode="numeric"
              value={discValue || ""}
              placeholder="0"
              onChange={(e) => setDiscValue(Number(e.target.value.replace(/\D/g, "")) || 0)}
            />
          </div>
          <Row label="Subtotal" value={totals.subtotal} />
          {totals.discount > 0 && <Row label="Diskon" value={-totals.discount} />}
          {servicePercent > 0 && <Row label={`Service ${servicePercent}%`} value={totals.service} />}
          {taxPercent > 0 && <Row label={`Pajak ${taxPercent}%`} value={totals.tax} />}
          <div className="flex justify-between border-t border-dashed border-stone-300 pt-2 text-lg font-bold">
            <span>Total</span>
            <span className="text-brand-700">{rupiah(totals.total)}</span>
          </div>
          {error && !showPay && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">{error}</p>}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button className="btn-secondary py-3" disabled={!cart.length || pending} onClick={() => submit(null)}>
              {editing ? "Simpan Perubahan" : "Open Bill"}
            </button>
            <button className="btn-primary py-3" disabled={!cart.length || pending} onClick={() => { setError(null); setShowPay(true); }}>
              Bayar
            </button>
          </div>
          {(cart.length > 0 || editing) && (
            <button className="btn-ghost w-full text-xs" onClick={reset}>
              {editing ? "Batal ubah" : "Kosongkan keranjang"}
            </button>
          )}
        </div>
      </aside>

      {showPay && (
        <PaymentModal
          total={totals.total}
          busy={pending}
          error={error}
          onClose={() => setShowPay(false)}
          onPay={(method, paidAmount) => submit({ method, paidAmount })}
        />
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between text-stone-600">
      <span>{label}</span>
      <span>{value < 0 ? "- " + rupiah(-value) : rupiah(value)}</span>
    </div>
  );
}
