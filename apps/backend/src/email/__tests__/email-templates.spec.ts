import { EmailService } from '../email.service';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Renders the renewal email templates with realistic data and asserts
 * the new URLs appear correctly in both the HTML and plain-text bodies.
 *
 * Also writes the rendered HTML to `tmp/email-previews/` so a human can
 * open it in a browser and visually confirm the templates look right.
 * Test passes/fails based on URL presence only; the preview is a side
 * effect for manual inspection.
 */
describe('Renewal email templates', () => {
  let svc: EmailService;
  const previewDir = path.resolve(__dirname, '../../../../../tmp/email-previews');

  beforeAll(() => {
    process.env.EMAIL_PROVIDER = 'console';
    process.env.FRONTEND_URL = 'https://www.mecacaraudio.com';
    svc = new EmailService(undefined as any);
    fs.mkdirSync(previewDir, { recursive: true });
  });

  it('expiring-30d email renders the /membership/checkout/:id link in both HTML and text', () => {
    const checkoutUrl =
      'https://www.mecacaraudio.com/membership/checkout/65f8b5f4-14e8-4e21-b265-256fdc8f7b7e';
    const dto = {
      to: 'james@mecacaraudio.com',
      firstName: 'James',
      mecaId: 202401,
      membershipType: 'Pro Competitor',
      expiryDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      daysRemaining: 30,
      renewalUrl: checkoutUrl,
    };
    const html: string = (svc as any).getMembershipExpiringEmailTemplate(
      'Hello James',
      dto,
      '2026-06-14',
    );
    const text: string = (svc as any).getMembershipExpiringEmailText(
      'Hello James',
      dto,
      '2026-06-14',
    );

    expect(html).toContain(checkoutUrl);
    expect(text).toContain(checkoutUrl);
    expect(html).toContain('Renew Membership Now'); // button label
    fs.writeFileSync(path.join(previewDir, 'expiring-30d.html'), html);
  });

  it('expired email renders the /renew/:token public link in both HTML and text', () => {
    const tokenUrl =
      'https://www.mecacaraudio.com/renew/abc123token456def789xyz000aBcDeFg';
    const dto = {
      to: 'james@mecacaraudio.com',
      firstName: 'James',
      mecaId: 202401,
      membershipType: 'Pro Competitor',
      expiredDate: new Date(),
      renewalUrl: tokenUrl,
    };
    const html: string = (svc as any).getMembershipExpiredEmailTemplate(
      'Hello James',
      dto,
      '2026-05-14',
    );
    const text: string = (svc as any).getMembershipExpiredEmailText(
      'Hello James',
      dto,
      '2026-05-14',
    );

    expect(html).toContain(tokenUrl);
    expect(text).toContain(tokenUrl);
    fs.writeFileSync(path.join(previewDir, 'expired.html'), html);
  });

  it('urgent (≤7 days) expiring email switches header color and uses urgent prefix', () => {
    const dto = {
      to: 'james@mecacaraudio.com',
      firstName: 'James',
      mecaId: 202401,
      membershipType: 'Pro Competitor',
      expiryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      daysRemaining: 7,
      renewalUrl: 'https://www.mecacaraudio.com/membership/checkout/abc',
    };
    const html: string = (svc as any).getMembershipExpiringEmailTemplate(
      'Hello James',
      dto,
      '2026-05-21',
    );
    const text: string = (svc as any).getMembershipExpiringEmailText(
      'Hello James',
      dto,
      '2026-05-21',
    );

    // Urgent path swaps amber border for red (#ef4444) on the warning box
    expect(html).toContain('#ef4444');
    expect(text).toContain('URGENT:');
    fs.writeFileSync(path.join(previewDir, 'expiring-urgent-7d.html'), html);
  });

  it('renders without dto.firstName (Hello fallback)', () => {
    const html: string = (svc as any).getMembershipExpiringEmailTemplate(
      'Hello',
      {
        to: 'someone@example.com',
        mecaId: 700123,
        membershipType: 'Competitor',
        expiryDate: new Date(),
        daysRemaining: 14,
        renewalUrl: 'https://www.mecacaraudio.com/membership/checkout/x',
      },
      '2026-05-28',
    );
    expect(html).toContain('Hello,');
    expect(html).not.toContain('undefined');
  });
});
