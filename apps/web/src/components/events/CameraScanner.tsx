"use client";

import { useEffect, useRef, useState } from "react";
import { LoaderCircle, X } from "lucide-react";
import styles from "./CameraScanner.module.css";

type BarcodeDetection = { rawValue: string };
type BarcodeDetectorInstance = { detect: (source: CanvasImageSource) => Promise<BarcodeDetection[]> };
declare global {
  interface Window {
    BarcodeDetector?: new (options: { formats: string[] }) => BarcodeDetectorInstance;
  }
}

// Skip auxiliary phone lenses: ultrawide, macro, telephoto, depth sensors.
const EXCLUDED_LENS = /ultra\s?wide|wide|macro|tele|telephoto|depth|tof/i;
const MAIN_LENS = /back|rear|main|environment/i;

export default function CameraScanner({ open, onClose, onDetect, result }: {
  open: boolean;
  onClose: () => void;
  onDetect: (code: string) => void;
  result: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const detectRef = useRef(onDetect);
  const [status, setStatus] = useState<"starting" | "scanning" | "unsupported" | "error">("starting");
  const [error, setError] = useState("");

  // Dialog keyboard semantics: Escape closes, focus starts on the dialog.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  useEffect(() => {
    detectRef.current = onDetect;
  }, [onDetect]);

  useEffect(() => {
    if (!open) return;
    let stream: MediaStream | null = null;
    let frame = 0;
    let cancelled = false;
    let lastCode = "";
    let lastTime = 0;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setStatus("unsupported");
        return;
      }
      setStatus("starting");
      setError("");
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" } },
          audio: false,
        });
        // The dialog may have closed while the permission prompt was open —
        // never leave a live camera stream running unattached.
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          stream = null;
          return;
        }

        // Switch to the primary rear lens if the default pick is a wide/macro one.
        const devices = await navigator.mediaDevices.enumerateDevices();
        const cameras = devices.filter((device) => device.kind === "videoinput" && !EXCLUDED_LENS.test(device.label));
        const main = cameras.find((device) => MAIN_LENS.test(device.label)) ?? cameras[0];
        const active = stream.getVideoTracks()[0];
        if (main && active && active.getSettings().deviceId !== main.deviceId && EXCLUDED_LENS.test(active.label)) {
          stream.getTracks().forEach((track) => track.stop());
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: main.deviceId } },
            audio: false,
          });
        }
        if (cancelled) {
          stream?.getTracks().forEach((track) => track.stop());
          stream = null;
          return;
        }

        const track = stream.getVideoTracks()[0];
        track?.applyConstraints({ advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet] }).catch(() => {});

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        if (!window.BarcodeDetector) {
          setStatus("unsupported");
          return;
        }
        setStatus("scanning");
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
        const scan = async () => {
          if (cancelled) return;
          try {
            if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
              const codes = await detector.detect(video);
              const value = codes[0]?.rawValue?.trim();
              const now = Date.now();
              if (value && (value !== lastCode || now - lastTime > 2500)) {
                lastCode = value;
                lastTime = now;
                detectRef.current(value);
              }
            }
          } catch {}
          frame = requestAnimationFrame(scan);
        };
        frame = requestAnimationFrame(scan);
      } catch (cause) {
        if (cancelled) return;
        setStatus("error");
        setError(
          cause instanceof DOMException && cause.name === "NotAllowedError"
            ? "Camera access was denied. Allow camera permission to scan tickets."
            : cause instanceof DOMException && cause.name === "NotFoundError"
              ? "No camera was found on this device. Enter the ticket code manually."
              : "The camera couldn't start. Enter the ticket code manually."
        );
      }
    }

    start();
    const video = videoRef.current;
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
      if (video) video.srcObject = null;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div ref={dialogRef} tabIndex={-1} className={styles.overlay} role="dialog" aria-modal="true" aria-label="Scan ticket QR code">
      <div className={styles.topBar}>
        <h2>Scan ticket QR</h2>
        <button type="button" className={styles.close} onClick={onClose} aria-label="Close scanner">
          <X size={20} strokeWidth={1.5} />
        </button>
      </div>

      <div className={styles.stage}>
        <video ref={videoRef} className={styles.video} playsInline muted autoPlay />
        <div className={styles.viewfinder} aria-hidden="true" />
        {status === "starting" && (
          <div className={styles.center}><LoaderCircle size={26} className={styles.spinner} /><p>Starting camera...</p></div>
        )}
        {status === "unsupported" && (
          <div className={styles.center}><p>QR scanning isn&apos;t supported in this browser. Enter the ticket code manually.</p></div>
        )}
        {status === "error" && (
          <div className={styles.center}><p role="alert">{error}</p></div>
        )}
      </div>

      <p className={styles.hint} role="status" aria-live="polite">
        {result || "Point the camera at the ticket QR code."}
      </p>
    </div>
  );
}
