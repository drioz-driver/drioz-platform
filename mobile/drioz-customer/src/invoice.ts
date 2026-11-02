import {localMoney} from './local-money';
/** Builds a print-ready GST invoice / fare statement and shares it as a PDF. */
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { money } from "./api";
import { invoiceLogo } from "./invoice-logo";

const esc = (v: unknown) =>
  String(v ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
const date = (n?: number | null) =>
  n ? new Date(n).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : "—";

export function invoiceHtml(inv: any) {
  const money=(n:number)=>localMoney(n,inv.breakdown);
  const title = inv.taxInvoice ? "Tax invoice" : "Fare statement";
  const rows = (inv.lines || [])
    .map(
      (l: any) =>
        `<tr><td>${esc(l.label)}${l.taxable ? "" : ' <span class="muted">(not taxable)</span>'}</td><td class="num">${esc(money(l.amount))}</td></tr>`,
    )
    .join("");
  const tax = inv.taxSplit
    ? `<tr><td>CGST</td><td class="num">${esc(money(inv.taxSplit.cgst))}</td></tr><tr><td>SGST</td><td class="num">${esc(money(inv.taxSplit.sgst))}</td></tr>`
    : inv.tax
      ? `<tr><td>Tax</td><td class="num">${esc(money(inv.tax))}</td></tr>`
      : "";
  const payments = (inv.payments || [])
    .map((p: any) => `<li>${esc(money(p.amount))} · ${esc(String(p.status))} · ${esc(String(p.method).replaceAll("_", " "))} · ref ${esc(p.reference)}</li>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"/><style>
  *{box-sizing:border-box}body{font-family:-apple-system,Roboto,Helvetica,Arial,sans-serif;background:#fff;color:#0C1714;margin:0;padding:36px;font-size:12.5px;color-scheme:light}
  .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #00E699;padding-bottom:18px}
  .brand{display:block;width:150px;height:auto;margin-bottom:8px}
  h1{margin:0;font-size:20px;text-transform:uppercase;letter-spacing:2px;text-align:right}.muted{color:#66756F}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin:22px 0}.box{background:#F4F6F5;border-radius:10px;padding:12px 14px}
  .box b{display:block;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#66756F;margin-bottom:6px}
  table{width:100%;border-collapse:collapse;margin-top:8px}td{padding:10px 4px;border-bottom:1px solid #E2E8E5}.num{text-align:right;font-variant-numeric:tabular-nums}
  .total td{font-size:16px;font-weight:800;border-bottom:none;border-top:2px solid #0C1714}.note{margin-top:22px;font-size:11px;color:#66756F;line-height:1.5}
  </style></head><body>
  <div class="top"><div><img class="brand" src="${invoiceLogo}" alt="DRIOZ"/><div class="muted">${esc(inv.seller?.legalName || "DRIOZ")}</div>
  ${inv.seller?.address ? `<div class="muted">${esc(inv.seller.address)}</div>` : ""}${inv.seller?.gstin ? `<div>GSTIN ${esc(inv.seller.gstin)}</div>` : ""}${inv.seller?.sac ? `<div class="muted">SAC ${esc(inv.seller.sac)}</div>` : ""}</div>
  <div><h1>${title}</h1><div class="muted" style="text-align:right">${inv.invoiceNumber ? `No. ${esc(inv.invoiceNumber)}<br/>` : ""}Issued ${esc(date(inv.issuedAt))}<br/>Trip DR-${esc(String(inv.reference).slice(0, 8).toUpperCase())}</div></div></div>
  <div class="grid"><div class="box"><b>Billed to</b>${esc(inv.buyer?.name)}${inv.buyer?.gstin ? `<br/>GSTIN ${esc(inv.buyer.gstin)}` : ""}${inv.buyer?.address ? `<br/>${esc(inv.buyer.address)}` : ""}${inv.buyer?.email ? `<br/><span class="muted">${esc(inv.buyer.email)}</span>` : ""}</div>
  <div class="box"><b>Journey</b>${esc(inv.pickup)}<br/>→ ${esc(inv.destination)}<br/><span class="muted">Started ${esc(date(inv.startedAt))} · Completed ${esc(date(inv.completedAt))}</span></div></div>
  <table>${rows}${tax}<tr class="total"><td>Total</td><td class="num">${esc(money(inv.total))}</td></tr></table>
  ${payments ? `<p><b>Payments recorded</b></p><ul>${payments}</ul>` : ""}
  <p class="note">${esc(inv.note)}</p></body></html>`;
}

export async function shareInvoicePdf(inv: any) {
  const { uri } = await Print.printToFileAsync({ html: invoiceHtml(inv) });
  if (await Sharing.isAvailableAsync())
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", UTI: "com.adobe.pdf", dialogTitle: inv.invoiceNumber || "DRIOZ invoice" });
  return uri;
}
