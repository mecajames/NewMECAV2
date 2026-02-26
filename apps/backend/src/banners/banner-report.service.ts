import { Injectable } from '@nestjs/common';
import { BannerAnalytics, BannerSizeLabels, BannerSize } from '@newmeca/shared';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BannerReportService {
  private logoBase64: string | null = null;

  constructor() {
    this.loadLogo();
  }

  private loadLogo(): void {
    try {
      const possiblePaths = [
        path.join(__dirname, '../../../../frontend/public/meca-logo-transparent.png'),
        path.join(__dirname, '../../../../../apps/frontend/public/meca-logo-transparent.png'),
        path.join(process.cwd(), '../frontend/public/meca-logo-transparent.png'),
        path.join(process.cwd(), 'apps/frontend/public/meca-logo-transparent.png'),
      ];

      for (const logoPath of possiblePaths) {
        if (fs.existsSync(logoPath)) {
          const logoBuffer = fs.readFileSync(logoPath);
          this.logoBase64 = logoBuffer.toString('base64');
          return;
        }
      }
    } catch (error) {
      console.error('Failed to load MECA logo for reports:', error);
    }
  }

  generateReportHtml(
    advertiserName: string,
    analytics: BannerAnalytics[],
    startDate: string,
    endDate: string,
  ): string {
    const totalImpressions = analytics.reduce((sum, a) => sum + a.totalImpressions, 0);
    const totalClicks = analytics.reduce((sum, a) => sum + a.totalClicks, 0);
    const overallCTR = totalImpressions > 0
      ? Math.round((totalClicks / totalImpressions) * 10000) / 100
      : 0;

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    };

    const formatNumber = (num: number) => num.toLocaleString();

    const getSizeLabel = (size: BannerSize | null | undefined) => {
      if (!size) return '-';
      return BannerSizeLabels[size] || size;
    };

    const bannerRows = analytics.map(a => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${this.escapeHtml(a.bannerName)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${getSizeLabel(a.bannerSize as BannerSize | null)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatNumber(a.totalImpressions)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatNumber(a.totalClicks)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${a.clickThroughRate.toFixed(2)}%</td>
      </tr>
    `).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Banner Analytics Report - ${this.escapeHtml(advertiserName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      color: #333;
      padding: 40px;
      background: #fff;
    }
    .container { max-width: 800px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 3px solid #f97316;
    }
    .header-left { display: flex; align-items: center; gap: 16px; }
    .logo { width: 120px; height: auto; }
    .header-title h1 { font-size: 22px; font-weight: 700; color: #1a1a1a; }
    .header-title p { font-size: 12px; color: #666; margin-top: 4px; }
    .header-right { text-align: right; }
    .header-right h2 { font-size: 16px; color: #f97316; font-weight: 600; }
    .header-right p { font-size: 12px; color: #666; margin-top: 4px; }
    .summary-cards {
      display: flex;
      gap: 16px;
      margin-bottom: 30px;
    }
    .card {
      flex: 1;
      background: #f8f9fa;
      border-radius: 8px;
      padding: 20px;
      text-align: center;
      border: 1px solid #e0e0e0;
    }
    .card-label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .card-value { font-size: 28px; font-weight: 700; color: #1a1a1a; }
    .card-value.orange { color: #f97316; }
    .section-title {
      font-size: 16px;
      font-weight: 600;
      color: #1a1a1a;
      margin-bottom: 12px;
      padding-bottom: 8px;
      border-bottom: 1px solid #e0e0e0;
    }
    table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
    thead tr { background: #f8f9fa; }
    th {
      padding: 12px;
      text-align: left;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      color: #666;
      letter-spacing: 0.5px;
      border-bottom: 2px solid #e0e0e0;
    }
    th:nth-child(n+3) { text-align: right; }
    td { padding: 12px; }
    tbody tr:hover { background: #fafafa; }
    .footer {
      text-align: center;
      padding-top: 20px;
      border-top: 1px solid #e0e0e0;
      color: #999;
      font-size: 10px;
    }
    @media print {
      body { padding: 0; }
      .container { max-width: 100%; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-left">
        ${this.logoBase64 ? `<img src="data:image/png;base64,${this.logoBase64}" alt="MECA Logo" class="logo" />` : ''}
        <div class="header-title">
          <h1>MECA</h1>
          <p>Mobile Electronics Competition Association</p>
        </div>
      </div>
      <div class="header-right">
        <h2>Banner Analytics Report</h2>
        <p>${this.escapeHtml(advertiserName)}</p>
        <p>${formatDate(startDate)} &mdash; ${formatDate(endDate)}</p>
      </div>
    </div>

    <div class="summary-cards">
      <div class="card">
        <div class="card-label">Total Impressions</div>
        <div class="card-value">${formatNumber(totalImpressions)}</div>
      </div>
      <div class="card">
        <div class="card-label">Total Clicks</div>
        <div class="card-value">${formatNumber(totalClicks)}</div>
      </div>
      <div class="card">
        <div class="card-label">Click-Through Rate</div>
        <div class="card-value orange">${overallCTR.toFixed(2)}%</div>
      </div>
    </div>

    <h3 class="section-title">Banner Performance</h3>
    <table>
      <thead>
        <tr>
          <th>Banner</th>
          <th>Size</th>
          <th style="text-align:right">Impressions</th>
          <th style="text-align:right">Clicks</th>
          <th style="text-align:right">CTR</th>
        </tr>
      </thead>
      <tbody>
        ${bannerRows || `<tr><td colspan="5" style="padding:20px;text-align:center;color:#999;">No banner data for this period.</td></tr>`}
      </tbody>
    </table>

    <div class="footer">
      <p>Generated on ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
      <p>MECA &mdash; Mobile Electronics Competition Association</p>
    </div>
  </div>
</body>
</html>
    `.trim();
  }

  private escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
