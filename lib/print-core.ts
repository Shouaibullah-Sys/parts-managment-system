// lib/print-core.ts
// Shared "Minimal Corporate" A4 print design system for all popup reports.
// White page, navy #0F2A44 rules, Vazirmatn font, pt sizing, print-safe palette.
// Every report lib (sales/returns/customer/dashboard) imports this so the
// printed output is visually consistent.

export const PRINT_NAVY = "#0F2A44";

// Vazirmatn ships as a single static Regular TTF in public/fonts. Declaring the
// 400–700 range makes font-weight:700 pick up this file (browser synthesizes
// bold). font-display:block so the popup never prints a fallback font.
export const PRINT_CORE_CSS = `
@font-face {
  font-family: 'Vazirmatn';
  src: url('/fonts/Vazirmatn-Regular.ttf') format('truetype');
  font-weight: 400 700;
  font-style: normal;
  font-display: block;
}
@page { size: A4; margin: 14mm 11mm 16mm 11mm; }
* { margin: 0; padding: 0; box-sizing: border-box; }
html, body {
  font-family: 'Vazirmatn', 'Segoe UI', Tahoma, sans-serif;
  font-size: 9.5pt;
  line-height: 1.55;
  color: #1E293B;
  background: #fff;
  direction: rtl;
  padding-bottom: 8mm;
}
.num { font-variant-numeric: tabular-nums; letter-spacing: 0; }
.mono { font-family: ui-monospace, 'Cascadia Mono', Consolas, monospace; direction: ltr; unicode-bidi: embed; }

/* ---- Header letterhead (white + navy underline, print-safe) ---- */
.hdr {
  display: flex; justify-content: space-between; align-items: flex-start;
  padding-bottom: 10px; margin-bottom: 10px;
  border-bottom: 3px solid ${PRINT_NAVY};
  break-inside: avoid;
}
.hdr .brand h1 { font-size: 16pt; font-weight: 700; color: ${PRINT_NAVY}; line-height: 1.2; }
.hdr .brand .sub { font-size: 8.5pt; color: #5B6670; margin-top: 2px; }
.hdr .brand .ctx { font-size: 9pt; color: #1E293B; margin-top: 6px; font-weight: 700; }
.hdr .meta { text-align: left; font-size: 8pt; color: #5B6670; line-height: 1.7; }
.hdr .meta .rpt-title { font-size: 13pt; font-weight: 700; color: ${PRINT_NAVY}; }

/* ---- Filter chips ---- */
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 10px; break-inside: avoid; }
.chip {
  font-size: 7.5pt; padding: 3px 9px; border-radius: 999px;
  background: #EEF2F7; color: #334155; border: 1px solid #D7DEE8;
}
.chip b { font-weight: 700; color: ${PRINT_NAVY}; }

/* ---- Section title (navy side rule) ---- */
.sec-title {
  font-size: 11pt; font-weight: 700; color: ${PRINT_NAVY};
  border-right: 3px solid ${PRINT_NAVY}; padding-right: 8px;
  margin: 12px 0 8px; break-after: avoid;
}

/* ---- Metric cards (outline + colored top rule) ---- */
.metrics { display: grid; gap: 8px; margin-bottom: 12px; }
.metric {
  border: 1px solid #E3E8EF; border-top: 3px solid var(--accent, ${PRINT_NAVY});
  background: #fff; border-radius: 5px; padding: 8px 10px; break-inside: avoid;
}
.metric .label { font-size: 7.5pt; color: #5B6670; margin-bottom: 3px; }
.metric .value { font-size: 14pt; font-weight: 700; color: var(--accent, ${PRINT_NAVY}); font-variant-numeric: tabular-nums; }
.metric .hint { font-size: 7pt; color: #8A96A3; margin-top: 2px; }
.metric.is-navy  { --accent: ${PRINT_NAVY}; }
.metric.is-blue  { --accent: #1D4ED8; }
.metric.is-green { --accent: #2A7A5A; }
.metric.is-amber { --accent: #B45309; }
.metric.is-red   { --accent: #C0392B; }

/* ---- Card container ---- */
.card { border: 1px solid #E3E8EF; border-radius: 5px; padding: 10px; background: #fff; }
.card-title { font-size: 9pt; font-weight: 700; color: #334155; margin-bottom: 6px; }

/* ---- Data table ---- */
table.rpt { width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8.5pt; }
table.rpt thead { display: table-header-group; }
table.rpt tfoot { display: table-footer-group; }
table.rpt tr { break-inside: avoid; }
table.rpt th {
  background: ${PRINT_NAVY}; color: #fff; font-weight: 700;
  padding: 6px 4px; text-align: center; font-size: 8pt;
  border: 1px solid ${PRINT_NAVY};
}
table.rpt td {
  padding: 5px 4px; border: 1px solid #E3E8EF; text-align: center;
  white-space: nowrap; overflow-wrap: break-word;
}
table.rpt tbody tr:nth-child(even) td { background: #F4F6F8; }
table.rpt tbody tr:nth-child(odd) td { background: #fff; }
table.rpt .wrap { white-space: normal; }
table.rpt .txt-r { text-align: right; }
table.rpt tfoot td {
  background: #EEF2F7 !important; font-weight: 700; color: ${PRINT_NAVY};
  border-top: 2px solid ${PRINT_NAVY};
}

/* ---- Badges (print-safe: bg + border + text, readable in B/W) ---- */
.badge {
  display: inline-block; font-size: 7pt; font-weight: 700;
  padding: 1px 7px; border-radius: 999px; line-height: 1.4; white-space: nowrap;
}
.badge-green  { background: #DCF5E7; color: #14653F; border: 1px solid #7ECFA5; }
.badge-amber  { background: #FDF0D5; color: #8A5A06; border: 1px solid #E8C078; }
.badge-red    { background: #FBE4E1; color: #8F2B21; border: 1px solid #E4A29A; }
.badge-neutral{ background: #EEF1F5; color: #3C4655; border: 1px solid #C9D1DC; }

/* ---- Money color helpers ---- */
.amt-green { color: #2A7A5A; }
.amt-amber { color: #B45309; }
.amt-red   { color: #C0392B; }

/* ---- Signature + footer ---- */
.sign { display: flex; justify-content: space-between; gap: 24px; margin-top: 18px; break-inside: avoid; font-size: 8.5pt; color: #5B6670; }
.sign .line { width: 45mm; border-top: 1px dotted #94A3B8; margin-top: 28px; text-align: center; padding-top: 4px; }
.ftr {
  position: fixed; bottom: 0; left: 0; right: 0;
  font-size: 7pt; color: #64748B;
  border-top: 1px solid #E3E8EF; padding-top: 3px;
  display: flex; justify-content: space-between; gap: 8px;
}
.note { font-size: 7.5pt; color: #8A96A3; margin-top: 6px; }
.empty { text-align: center; padding: 18px; color: #8A96A3; }

@media print {
  * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
  .no-print { display: none !important; }
  .hdr, .chips, .metrics, .sign, .sec-title { break-inside: avoid; }
}
`;

export function money(n: number | string): string {
  const v = typeof n === "string" ? parseFloat(n) || 0 : n;
  return v.toLocaleString("fa-IR");
}

// "yyyy-MM-dd" -> local Date (avoids UTC off-by-one of new Date(string))
export function parseLocal(d: string): Date {
  const [y, m, day] = d.split("-").map(Number);
  return new Date(y, (m || 1) - 1, day || 1);
}

export function hijri(d: string | Date): string {
  const date = typeof d === "string" ? parseLocal(d) : d;
  return date.toLocaleDateString("fa-IR");
}

export function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Standard white letterhead. `ctx` = extra context line (customer / date range).
export function headerHTML(opts: { rptTitle: string; ctx?: string; now?: Date }): string {
  const now = opts.now ?? new Date();
  return `<div class="hdr">
    <div class="brand">
      <h1>Diplomasi Ltd</h1>
      <div class="sub">بل پرزه جات وسایط | کابل - افغانستان</div>
      ${opts.ctx ? `<div class="ctx">${opts.ctx}</div>` : ""}
    </div>
    <div class="meta">
      <div class="rpt-title">${esc(opts.rptTitle)}</div>
      <div>تاریخ چاپ: ${hijri(now)} — ${now.toLocaleTimeString("fa-IR")}</div>
    </div>
  </div>`;
}

export function footerHTML(now: Date = new Date()): string {
  return `<div class="ftr">
    <span>Diplomasi Ltd — بل پرزه جات وسایط | کابل، افغانستان</span>
    <span>تاریخ چاپ: ${hijri(now)} — ${now.toLocaleTimeString("fa-IR")}</span>
    <span>تولیدشده توسط سیستم مدیریت قطعات</span>
  </div>`;
}

export function signHTML(right = "امضای مسئول", left = "امضای مشتری"): string {
  return `<div class="sign">
    <div class="line">${esc(right)}</div>
    <div class="line">${esc(left)}</div>
  </div>`;
}

// Write the full HTML doc into an already-open popup, wait for Vazirmatn to
// load (so the PDF never prints a fallback font), then trigger print.
export function printDoc(win: Window, html: string, delay = 400): void {
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  const doPrint = () => setTimeout(() => win.print(), delay);
  const fonts = (win.document as any).fonts;
  if (fonts?.ready) {
    fonts.ready.then(doPrint).catch(doPrint);
  } else {
    doPrint();
  }
}

// Open a popup synchronously (must be called in a click handler) and print.
export function openPopupAndPrint(html: string, w = 1000, h = 800): boolean {
  const win = window.open("", "_blank", `width=${w},height=${h}`);
  if (!win) {
    alert("لطفاً پاپ‌آپ بلاکر را غیرفعال کنید");
    return false;
  }
  printDoc(win, html);
  return true;
}
