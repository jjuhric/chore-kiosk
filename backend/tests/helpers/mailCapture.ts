// Replaces nodemailer.createTransport with the library's own jsonTransport (no network, no real mail).
// It records the settings the app asked for and the message that WOULD have been sent.
export const captured: { configs: any[]; sent: any[]; failNext: boolean } = { configs: [], sent: [], failNext: false };

export function resetCapture(): void {
  captured.configs.length = 0;
  captured.sent.length = 0;
  captured.failNext = false;
}

export function fakeNodemailer() {
  const real = jest.requireActual('nodemailer');
  return {
    createTransport: (config: any) => {
      captured.configs.push(config);
      const t = real.createTransport({ jsonTransport: true });
      return {
        sendMail: async (opts: any) => {
          if (captured.failNext) throw new Error('SMTP down (simulated)');
          const info = await t.sendMail(opts);
          const msg = JSON.parse(info.message);
          delete msg.messageId;
          captured.sent.push({ envelope: info.envelope, message: msg });
          return info;
        },
      };
    },
  };
}

// Normalise anything that legitimately changes between runs.
export function normalize(value: any): any {
  return JSON.parse(JSON.stringify(value));
}
