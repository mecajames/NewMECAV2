import { Injectable } from '@nestjs/common';
import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib';
import { Invoice } from '../invoices.entity';
import { Membership } from '../../memberships/memberships.entity';

/**
 * Genuine server-side PDF generation (pdf-lib) for invoices and membership
 * receipts. The existing *-pdf endpoints serve branded HTML (great for viewing
 * in-browser / print-to-PDF); this produces an actual application/pdf file so
 * "Download" saves a real .pdf instead of an .html.
 */
@Injectable()
export class ReceiptPdfService {
  private readonly orange = rgb(0.976, 0.451, 0.086); // #f97316
  private readonly dark = rgb(0.12, 0.16, 0.23);
  private readonly gray = rgb(0.42, 0.45, 0.5);
  private readonly line = rgb(0.85, 0.86, 0.88);

  private money(v: string | number | undefined): string {
    const n = typeof v === 'string' ? parseFloat(v) : v ?? 0;
    return `$${(Number.isFinite(n) ? n : 0).toFixed(2)}`;
  }

  private date(d?: Date | string | null): string {
    if (!d) return '—';
    const dt = d instanceof Date ? d : new Date(d);
    if (isNaN(dt.getTime())) return '—';
    return dt.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  /** Truncate text to fit a max width at a given size (no wrapping). */
  private fit(text: string, font: PDFFont, size: number, maxWidth: number): string {
    if (!text) return '';
    if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
    let t = text;
    while (t.length > 1 && font.widthOfTextAtSize(t + '…', size) > maxWidth) {
      t = t.slice(0, -1);
    }
    return t + '…';
  }

  async generateInvoicePdf(invoice: Invoice): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const company = (invoice.companyInfo as any) || {};
    const bill = (invoice.billingAddress as any) || {};
    const items = invoice.items?.getItems?.() ?? [];

    const margin = 50;
    const width = 612;
    let page = pdf.addPage([width, 792]);
    let y = 792 - margin;

    // Header
    page.drawText(company.name || 'MECA Car Audio', { x: margin, y: y - 6, size: 20, font: bold, color: this.orange });
    page.drawText('INVOICE', { x: width - margin - bold.widthOfTextAtSize('INVOICE', 20), y: y - 6, size: 20, font: bold, color: this.dark });
    y -= 30;
    const metaRight = (label: string, value: string, yy: number) => {
      const v = value || '—';
      page.drawText(label, { x: width - margin - 200, y: yy, size: 9, font, color: this.gray });
      page.drawText(v, { x: width - margin - bold.widthOfTextAtSize(v, 10), y: yy, size: 10, font: bold, color: this.dark });
    };
    // Company contact (left)
    let cy = y;
    const companyLines = [
      company.address?.street,
      [company.address?.city, company.address?.state, company.address?.postalCode].filter(Boolean).join(', '),
      company.email,
      company.phone,
    ].filter(Boolean) as string[];
    for (const l of companyLines) {
      page.drawText(l, { x: margin, y: cy, size: 9, font, color: this.gray });
      cy -= 13;
    }
    // Invoice meta (right)
    metaRight('Invoice #', invoice.invoiceNumber, y);
    metaRight('Date', this.date(invoice.createdAt), y - 15);
    metaRight('Due', this.date(invoice.dueDate), y - 30);
    metaRight('Status', String(invoice.status || '').toUpperCase(), y - 45);

    y = Math.min(cy, y - 60) - 10;

    // Bill To
    page.drawText('BILL TO', { x: margin, y, size: 9, font: bold, color: this.gray });
    y -= 15;
    const billLines = [
      bill.name,
      bill.address1,
      [bill.city, bill.state, bill.postalCode].filter(Boolean).join(', '),
      bill.email || invoice.user?.email,
    ].filter(Boolean) as string[];
    for (const l of billLines) {
      page.drawText(this.fit(l, font, 10, width - 2 * margin), { x: margin, y, size: 10, font, color: this.dark });
      y -= 14;
    }
    y -= 12;

    // Items table header
    const colDescX = margin;
    const colQtyX = width - margin - 200;
    const colPriceX = width - margin - 120;
    const colTotalX = width - margin;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: this.line });
    y -= 14;
    page.drawText('DESCRIPTION', { x: colDescX, y, size: 9, font: bold, color: this.gray });
    page.drawText('QTY', { x: colQtyX, y, size: 9, font: bold, color: this.gray });
    page.drawText('PRICE', { x: colPriceX, y, size: 9, font: bold, color: this.gray });
    const totHdr = 'TOTAL';
    page.drawText(totHdr, { x: colTotalX - bold.widthOfTextAtSize(totHdr, 9), y, size: 9, font: bold, color: this.gray });
    y -= 8;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: this.line });
    y -= 16;

    const ensureSpace = () => {
      if (y < 120) {
        page = pdf.addPage([width, 792]);
        y = 792 - margin;
      }
    };

    for (const it of items) {
      ensureSpace();
      page.drawText(this.fit(it.description || '', font, 10, colQtyX - colDescX - 10), { x: colDescX, y, size: 10, font, color: this.dark });
      page.drawText(String(it.quantity ?? 1), { x: colQtyX, y, size: 10, font, color: this.dark });
      page.drawText(this.money(it.unitPrice), { x: colPriceX, y, size: 10, font, color: this.dark });
      const tot = this.money(it.total);
      page.drawText(tot, { x: colTotalX - font.widthOfTextAtSize(tot, 10), y, size: 10, font, color: this.dark });
      y -= 16;
    }

    y -= 6;
    page.drawLine({ start: { x: colPriceX - 20, y }, end: { x: width - margin, y }, thickness: 1, color: this.line });
    y -= 16;
    const totalRow = (label: string, value: string, strong = false) => {
      const f = strong ? bold : font;
      const c = strong ? this.dark : this.gray;
      page.drawText(label, { x: colPriceX - 20, y, size: strong ? 12 : 10, font: f, color: c });
      const v = value;
      page.drawText(v, { x: colTotalX - f.widthOfTextAtSize(v, strong ? 12 : 10), y, size: strong ? 12 : 10, font: f, color: strong ? this.orange : this.dark });
      y -= strong ? 20 : 15;
    };
    totalRow('Subtotal', this.money(invoice.subtotal));
    if (parseFloat(invoice.discount || '0') > 0) totalRow('Discount', `-${this.money(invoice.discount)}`);
    if (parseFloat(invoice.tax || '0') > 0) totalRow('Tax', this.money(invoice.tax));
    totalRow('Total', this.money(invoice.total), true);
    if (parseFloat((invoice as any).amountPaid || '0') > 0) totalRow('Amount Paid', this.money((invoice as any).amountPaid));

    // Footer
    page.drawText('Thank you for supporting MECA Car Audio.', { x: margin, y: 60, size: 9, font, color: this.gray });
    if (invoice.notes) {
      page.drawText(this.fit(invoice.notes, font, 9, width - 2 * margin), { x: margin, y: 46, size: 9, font, color: this.gray });
    }

    return pdf.save();
  }

  async generateMembershipReceiptPdf(membership: Membership): Promise<Uint8Array> {
    const pdf = await PDFDocument.create();
    const font = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

    const margin = 50;
    const width = 612;
    const page: PDFPage = pdf.addPage([width, 792]);
    let y = 792 - margin;

    const user: any = (membership as any).user;
    const config: any = (membership as any).membershipTypeConfig;
    const memberName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : '';

    // Header
    page.drawText('MECA Car Audio', { x: margin, y: y - 6, size: 20, font: bold, color: this.orange });
    const rl = 'RECEIPT';
    page.drawText(rl, { x: width - margin - bold.widthOfTextAtSize(rl, 20), y: y - 6, size: 20, font: bold, color: this.dark });
    y -= 40;

    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: this.line });
    y -= 24;

    const row = (label: string, value: string) => {
      page.drawText(label, { x: margin, y, size: 10, font, color: this.gray });
      page.drawText(this.fit(value || '—', bold, 11, 300), { x: margin + 160, y, size: 11, font: bold, color: this.dark });
      y -= 22;
    };

    row('Member', memberName || user?.email || '—');
    if (user?.email) row('Email', user.email);
    row('MECA ID', membership.mecaId ? String(membership.mecaId) : 'Pending');
    row('Membership', config?.name || 'Membership');
    row('Status', String((membership as any).paymentStatus || '').toUpperCase());
    row('Start Date', this.date((membership as any).startDate));
    row('End Date', this.date((membership as any).endDate));

    y -= 6;
    page.drawLine({ start: { x: margin, y }, end: { x: width - margin, y }, thickness: 1, color: this.line });
    y -= 26;

    page.drawText('Amount Paid', { x: margin, y, size: 13, font: bold, color: this.dark });
    const amt = this.money((membership as any).amountPaid);
    page.drawText(amt, { x: width - margin - bold.widthOfTextAtSize(amt, 16), y: y - 2, size: 16, font: bold, color: this.orange });

    page.drawText('Thank you for being a MECA member.', { x: margin, y: 60, size: 9, font, color: this.gray });

    return pdf.save();
  }
}
