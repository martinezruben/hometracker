import { timingSafeEqual } from "node:crypto";
import { handleError, json } from "@/lib/http";
import { pushConfigured, sendPush } from "@/lib/push/send";
import { runReminders } from "@/lib/reminders/run";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const got = Buffer.from(request.headers.get("authorization") ?? "");
  const want = Buffer.from(`Bearer ${secret}`);
  return got.length === want.length && timingSafeEqual(got, want);
}

async function handle(request: Request) {
  try {
    if (!authorized(request)) return json({ error: "unauthorized" }, 401);
    if (!pushConfigured()) return json({ error: "push_not_configured" }, 503);
    return json(await runReminders(sendPush));
  } catch (err) {
    return handleError(err);
  }
}

// Vercel Cron llama con GET y `Authorization: Bearer $CRON_SECRET`; otros planificadores pueden usar POST.
export const GET = handle;
export const POST = handle;
