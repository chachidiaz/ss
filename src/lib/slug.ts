/** URL-safe slug from an email subject, prefixed with the send date. */
export function slugify(text: string): string {
  return text
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    // Drop emoji and other symbols that emails love but URLs do not.
    .replace(/[^\p{Letter}\p{Number}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()
    .slice(0, 72)
    .replace(/-+$/g, '');
}

export function issueSlug(subject: string, sentAt: Date): string {
  const date = sentAt.toISOString().slice(0, 10);
  const body = slugify(subject);
  return body ? `${date}-${body}` : date;
}
