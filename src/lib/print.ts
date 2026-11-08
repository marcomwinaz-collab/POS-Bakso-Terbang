"use client";

/**
 * Cetak halaman struk lewat iframe tersembunyi (tidak diblokir popup blocker).
 * Halaman struk memanggil window.print() sendiri saat parameter auto=1.
 */
export function printUrl(url: string) {
  const sep = url.includes("?") ? "&" : "?";
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.src = `${url}${sep}auto=1`;
  document.body.appendChild(iframe);
  setTimeout(() => iframe.remove(), 60_000);
}

/** mode: receipt = struk, kitchen = tiket dapur, bill = tagihan sementara, both = struk + tiket dapur */
export function printOrder(orderId: number, mode: "receipt" | "kitchen" | "bill" | "both") {
  printUrl(`/struk/${orderId}?mode=${mode}`);
}

export function previewOrder(orderId: number, mode: "receipt" | "kitchen" | "bill" = "receipt") {
  window.open(`/struk/${orderId}?mode=${mode}`, "_blank", "width=420,height=720");
}
