import { captured, resetCapture, fakeNodemailer } from './helpers/mailCapture';

jest.mock('nodemailer', () => require('./helpers/mailCapture').fakeNodemailer());
jest.mock('../src/services/authService', () => {
  const actual = jest.requireActual('../src/services/authService');
  return { ...actual, generateToken: () => 'fixed.test.token' };
});

import { generateLoginQR } from '../src/controllers/authController';
import { sendSMS } from '../src/services/smsService';
import { getDbConnection } from '../src/db/database';

function fakeRes() {
  const res: any = { statusCode: 0, body: undefined };
  res.status = (c: number) => { res.statusCode = c; return res; };
  res.json = (b: any) => { res.body = b; return res; };
  return res;
}

beforeEach(() => resetCapture());

describe('email: login badge (authController)', () => {
  beforeAll(async () => {
    const db = await getDbConnection();
    await db.exec(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY, name TEXT, role TEXT, current_balance REAL DEFAULT 0, sms_email TEXT)`);
    await db.run(`INSERT INTO users (id, name, role) VALUES (1, 'Sam', 'child')`);
  });

  it('sends the same badge email and answers the same', async () => {
    const res = fakeRes();
    await generateLoginQR({ body: { userId: 1, emailAddress: 'parent@example.test' } } as any, res);
    expect(res.statusCode).toBe(200);
    expect(res.body).toEqual({ message: 'QR Code generated and emailed successfully' });
    expect(captured.configs).toEqual([{ service: 'gmail', auth: { user: 'sender@example.test', pass: 'not-a-real-password' } }]);
    expect(captured.sent).toHaveLength(1);
    const { envelope, message } = captured.sent[0];
    expect(envelope).toEqual({ from: 'sender@example.test', to: ['parent@example.test'] });
    expect(message.subject).toBe('Login Badge for Sam');
    expect(message.html).toContain('<h2>Here is the login badge for Sam</h2>');
    expect(message.html).toContain('<img src="cid:qrcode_badge"');
    expect(message.attachments).toHaveLength(1);
    const a = message.attachments[0];
    expect(a.filename).toBe('Sam-badge.png');
    expect(a.cid).toBe('qrcode_badge');
    expect(a.contentType).toBe('image/png');
    expect(a.encoding).toBe('base64');
    expect(a.content.length).toBeGreaterThan(100);
    expect(Buffer.from(a.content, 'base64').subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    // the attachment bytes themselves (QR image) must not change
    expect(require('crypto').createHash('sha256').update(a.content).digest('hex')).toMatchSnapshot('badge-png-hash');
    expect({ ...message, attachments: undefined, date: undefined }).toMatchSnapshot('badge-message');
  });

  it('unknown user: 404, no email', async () => {
    const res = fakeRes();
    await generateLoginQR({ body: { userId: 999, emailAddress: 'x@example.test' } } as any, res);
    expect(res.statusCode).toBe(404);
    expect(res.body).toEqual({ error: 'User not found' });
    expect(captured.sent).toHaveLength(0);
  });

  it('mail server failure: same error answer', async () => {
    const res = fakeRes();
    jest.spyOn(console, 'error').mockImplementation(() => {});
    captured.failNext = true;
    await generateLoginQR({ body: { userId: 1, emailAddress: 'p@example.test' } } as any, res);
    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({ error: 'Failed to generate QR code' });
    expect(captured.sent).toHaveLength(0);
  });
});

describe('email: text message gateway (smsService)', () => {
  it('sends the same text-gateway email', async () => {
    jest.spyOn(console, 'log').mockImplementation(() => {});
    const ok = await sendSMS('(555) 123-4567', 'Chore due!');
    expect(ok).toBe(true);
    expect(captured.sent).toHaveLength(1);
    expect(captured.sent[0].envelope).toEqual({ from: 'sender@example.test', to: ['5551234567@vtext.com'] });
    expect({ ...captured.sent[0].message, date: undefined }).toMatchSnapshot('sms-message');
  });

  it('rejects bad numbers the same way', async () => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    expect(await sendSMS('123', 'hi')).toBe(false);
    captured.failNext = true;
    expect(await sendSMS('5551234567', 'hi')).toBe(false);
    expect(captured.sent).toHaveLength(0);
  });
});
