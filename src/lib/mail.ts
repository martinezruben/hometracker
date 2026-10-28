import "server-only";
import nodemailer from "nodemailer";

export async function sendOtpMail(to: string, code: string) {
  const url = process.env.SMTP_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") throw new Error("Falta SMTP_URL");
    console.info(`[mail:dev] Código de acceso para ${to}: ${code}`);
    return;
  }
  await nodemailer.createTransport(url).sendMail({
    from: process.env.MAIL_FROM ?? "HomeTracker <no-reply@localhost>",
    to,
    subject: `Tu código de acceso: ${code}`,
    text: `Tu código de acceso a HomeTracker es ${code}. Vence en 10 minutos.`,
  });
}
