export const site = {
  name: 'The Six Figure Insider',
  tagline: 'The newsletter archive',
  description:
    'Every past issue of The Six Figure Insider, free to read. Written by Chachi Diaz.',
  author: 'Chachi Diaz',
  /** Set NEXT_PUBLIC_SITE_URL in Vercel once a custom domain is attached. */
  url: (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://thesixfigureslp.com').replace(/\/$/, ''),
  /** Paste the Flodesk form's share link here (or set it in Vercel). */
  signupUrl: process.env.NEXT_PUBLIC_SIGNUP_URL ?? '',
};
