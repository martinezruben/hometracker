"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { es } from "@/lib/i18n/es";
import { extractTarget, targetPath } from "@/lib/qr-scan";

export function QrScanner() {
  const router = useRouter();
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let stop: (() => void) | undefined;
    let cancelled = false;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(es.scan.unsupported);
        return;
      }
      // @zxing se carga bajo demanda: Safari no tiene BarcodeDetector.
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      try {
        const controls = await new BrowserQRCodeReader().decodeFromConstraints(
          { video: { facingMode: { ideal: "environment" } } },
          video.current!,
          (result) => {
            if (!result) return;
            const target = extractTarget(result.getText());
            if (target) {
              controls.stop();
              router.push(targetPath(target));
            } else {
              setError(es.scan.notBox);
            }
          },
        );
        if (cancelled) controls.stop();
        else stop = () => controls.stop();
      } catch {
        if (!cancelled) setError(es.scan.denied);
      }
    })();
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [router]);

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl bg-black">
        <video ref={video} playsInline muted className="aspect-square w-full object-cover" />
      </div>
      <p className="text-sm text-muted">{es.scan.hint}</p>
      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      <p className="text-xs text-muted">{es.scan.tip}</p>
    </div>
  );
}
