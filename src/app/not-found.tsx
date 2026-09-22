import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="wrap">
      <section className="hero">
        <span className="eyebrow">404</span>
        <h1>That issue isn&rsquo;t here</h1>
        <p>It may have moved, or it was never archived.</p>
        <p style={{ marginTop: 24 }}>
          <Link className="btn btn-quiet" href="/">
            Browse the archive
          </Link>
        </p>
      </section>
    </div>
  );
}
