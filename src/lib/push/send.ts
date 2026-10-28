import "server-only";
import webpush from "web-push";

export type PushSub = { endpoint: string; p256dh: string; auth: string };
export type PushPayload = { title: string; body?: string; url?: string };
export type PushResult = "sent" | "gone" | "retry";
export type PushSender = (sub: PushSub, payload: PushPayload) => Promise<PushResult>;

let configured = false;
function configure() {
  if (configured) return;
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) throw new Error("Faltan las claves VAPID");
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", pub, priv);
  configured = true;
}

export const pushConfigured = () => !!(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);

/** Envía una notificación. "gone" = la suscripción ya no existe (borrarla); "retry" = fallo transitorio. */
export const sendPush: PushSender = async (sub, payload) => {
  configure();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24, urgency: "normal" },
    );
    return "sent";
  } catch (err) {
    const status = (err as { statusCode?: number }).statusCode;
    if (status === 404 || status === 410) return "gone";
    console.error("Error enviando push", status ?? err);
    return "retry";
  }
};
