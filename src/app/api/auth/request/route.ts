import { z } from "zod";
import { createOtp } from "@/lib/auth/otp";
import { sendOtpMail } from "@/lib/mail";
import { handleError, json } from "@/lib/http";

const body = z.object({ email: z.string().email().max(255) });

export async function POST(request: Request) {
  try {
    const { email } = body.parse(await request.json());
    const otp = await createOtp(email);
    await sendOtpMail(otp.email, otp.code);
    return json({ ok: true });
  } catch (err) {
    return handleError(err);
  }
}
