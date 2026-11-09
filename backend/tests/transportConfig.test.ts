// Uses the REAL nodemailer to build the transport (no connection is made, nothing is sent)
// and checks which mail server settings "service: 'gmail'" resolves to.
import nodemailer from 'nodemailer';

it("service: 'gmail' resolves to the same mail server settings", () => {
  const t: any = nodemailer.createTransport({ service: 'gmail', auth: { user: 'a@example.test', pass: 'x' } });
  const o = t.transporter.options;
  expect({ host: o.host, port: o.port, secure: o.secure, authUser: o.auth.user }).toMatchSnapshot();
  t.close?.();
});
