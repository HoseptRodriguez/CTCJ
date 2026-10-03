import nodemailer from 'nodemailer';
import { Resend } from 'resend';

/**
 * Where notification emails go. Real emails ONLY in production, through
 * Resend's batch endpoint (up to 100 per call). In development everything
 * goes to Mailhog (SMTP); in tests to memory -- never to real people, even
 * if a Resend key happens to be configured.
 *
 * @param {{ nodeEnv: string, resend: { apiKey: string, from: string },
 *   smtp: { host: string, port: number, user: string, password: string, from: string } }} options
 * @returns {import('../../application/ports/EmailTransport.js').EmailTransport & { sent?: object[] }}
 */
export function createEmailTransport({ nodeEnv, resend, smtp }) {
  if (nodeEnv === 'test') return createMemoryEmailTransport();
  if (nodeEnv === 'production' && resend.apiKey) {
    const client = new Resend(resend.apiKey);
    return {
      async sendBatch(messages) {
        const { data, error } = await client.batch.send(
          messages.map((m) => ({
            from: resend.from,
            to: [m.to],
            subject: m.subject,
            html: m.html,
            text: m.text,
            headers: m.headers,
          })),
        );
        if (error) throw new Error(`Resend: ${error.name}: ${error.message}`);
        return data.data.map((d) => ({ id: d.id }));
      },
    };
  }
  const transporter = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: false,
    auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
  });
  return {
    async sendBatch(messages) {
      const out = [];
      for (const m of messages) {
        const info = await transporter.sendMail({ from: smtp.from, ...m });
        out.push({ id: info.messageId ?? null });
      }
      return out;
    },
  };
}

/** Keeps the messages in memory (tests). `failNext(n)` simulates outages. */
export function createMemoryEmailTransport() {
  const sent = [];
  let failures = 0;
  return {
    sent,
    failNext(n = 1) {
      failures = n;
    },
    async sendBatch(messages) {
      if (failures > 0) {
        failures -= 1;
        throw new Error('Simulated provider outage');
      }
      return messages.map((m) => {
        sent.push(m);
        return { id: `mem-${sent.length}-${Math.random().toString(36).slice(2, 10)}` };
      });
    },
  };
}
