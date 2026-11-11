import { useEffect, useState } from 'react';

const pad = (n: number) => String(n).padStart(2, '0');

/** Local time as `YYYY-MM-DD HH:mm:ss`. */
export function formatTimestamp(d: Date): string {
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

export function Clock() {
  const [text, setText] = useState(() => formatTimestamp(new Date()));
  useEffect(() => {
    const id = setInterval(() => setText(formatTimestamp(new Date())), 1000);
    return () => clearInterval(id);
  }, []);
  return <span className="clock-text font-mono text-text">{text}</span>;
}
