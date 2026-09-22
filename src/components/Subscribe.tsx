import { site } from '@/lib/site';

/** Sends readers to the Flodesk signup form. Hidden until a form URL is set. */
export function Subscribe({
  heading = 'Get the next one in your inbox',
  body = 'Join the list and read it before it lands in the archive.',
}: {
  heading?: string;
  body?: string;
}) {
  if (!site.signupUrl) return null;

  return (
    <section className="callout">
      <h2>{heading}</h2>
      <p>{body}</p>
      <a className="btn" href={site.signupUrl} target="_blank" rel="noreferrer">
        Subscribe free
      </a>
    </section>
  );
}
