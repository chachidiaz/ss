'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Renders a sent newsletter exactly as subscribers saw it.
 *
 * Email HTML is a full document with its own <html>, <head> and table layout,
 * so it goes in an iframe rather than into the page. The sandbox deliberately
 * withholds `allow-same-origin`: the frame runs in an opaque origin and cannot
 * touch this page, its storage or its cookies. `allow-scripts` is granted only
 * so the injected height reporter can run — every script that came with the
 * email was stripped at ingest.
 */
export function EmailFrame({ html, title }: { html: string; title: string }) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(420);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== frameRef.current?.contentWindow) return;

      const data = event.data as { type?: string; height?: number } | null;
      if (data?.type !== 'archive:height' || typeof data.height !== 'number') return;

      // Guard against a frame that reports a runaway height.
      setHeight(Math.min(Math.max(Math.ceil(data.height), 200), 40000));
    }

    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  return (
    <div className="email-shell">
      <iframe
        ref={frameRef}
        className="email-frame"
        title={title}
        srcDoc={html}
        height={height}
        style={{ height }}
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
        scrolling="no"
      />
    </div>
  );
}
