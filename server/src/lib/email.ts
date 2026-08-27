import type { AppEnv } from './env';

export type Email = {
  to: string;
  subject: string;
  text: string;
  html?: string;
};

// Resend's shared sender. Needs no verified domain.
const DEFAULT_FROM = 'onboarding@resend.dev';

// Over HTTP because Workers has no outbound SMTP. With no RESEND_API_KEY it
// prints to the console, so password reset works in a fresh clone.
export const sendEmail = async (env: AppEnv, email: Email): Promise<void> => {
  if (!env.RESEND_API_KEY) {
    console.log(
      [
        '',
        '--- Email (no RESEND_API_KEY set, nothing was sent) ---',
        `To:      ${email.to}`,
        `Subject: ${email.subject}`,
        '',
        email.text,
        '------',
        '',
      ].join('\n'),
    );
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: env.EMAIL_FROM || DEFAULT_FROM,
      to: email.to,
      subject: email.subject,
      text: email.text,
      ...(email.html ? { html: email.html } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend rejected the message (${response.status}): ${await response.text()}`);
  }
};
