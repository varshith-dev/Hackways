"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { ImagePlus, Link2, LoaderCircle, X } from "lucide-react";
import { readImageFile } from "@/lib/imageUpload";
import form from "@/components/forms/CreationForm.module.css";
import styles from "./event-create.module.css";

export default function EventArtworkInput({ kind, value, onChange, onBusy }: {
  kind: "landscape" | "square"; value: string; onChange: (value: string) => void; onBusy: (busy: boolean) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const version = useRef(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [failedUrl, setFailedUrl] = useState("");
  const [useLink, setUseLink] = useState(false);
  const label = kind === "landscape" ? "Landscape banner" : "Square poster";
  useEffect(() => () => { version.current += 1; }, []);

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const request = ++version.current;
    setBusy(true); onBusy(true); setError("");
    try {
      const result = await readImageFile(file);
      if (request === version.current) { onChange(result); setUseLink(false); setFailedUrl(""); }
    } catch (cause) {
      if (request === version.current) setError(cause instanceof Error ? cause.message : "Image upload failed. Try again.");
    } finally {
      if (request === version.current) { setBusy(false); onBusy(false); }
    }
  }

  return (
    <div className={styles.artworkInput}>
      <div className={styles.artworkLabel}><span>{label}</span><span>{kind === "landscape" ? "16:9" : "1:1"}</span></div>
      <button type="button" className={styles.upload} data-ratio={kind} onClick={() => input.current?.click()} disabled={busy} aria-label={`${value ? "Change" : "Upload"} ${label.toLowerCase()}`}>
        {busy ? <LoaderCircle size={22} className={form.spinner} /> : value && failedUrl !== value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt={`${label} preview`} onError={() => setFailedUrl(value)} />
        ) : <><ImagePlus size={24} strokeWidth={1.4} /><span>{value ? "Image unavailable" : "Add image"}</span></>}
      </button>
      <input className="sr-only" type="file" accept="image/png,image/jpeg,image/webp" tabIndex={-1} aria-label={`${label} file`} ref={input} onChange={upload} />
      <div className={styles.imageActions}>
        <button type="button" onClick={() => setUseLink(!useLink)} aria-expanded={useLink}><Link2 size={13} />Image link</button>
        {value && <button type="button" onClick={() => { onChange(""); setFailedUrl(""); setError(""); }}><X size={13} />Remove</button>}
      </div>
      {useLink && <div className={form.field}><label htmlFor={`${kind}-url`} className="sr-only">{label} URL</label><input id={`${kind}-url`} type="url" value={value.startsWith("data:") ? "" : value} onChange={(event) => { onChange(event.target.value); setFailedUrl(""); }} placeholder="https://..." /></div>}
      {error && <p className={styles.inlineError} role="alert">{error}</p>}
      {value && failedUrl === value && <p className={styles.inlineError} role="alert">This image couldn&apos;t load. Check the link or upload a file.</p>}
    </div>
  );
}
