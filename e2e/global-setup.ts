import { MAIL_FILE, SMTP_PORT } from "../playwright.config";
import { startSmtpSink } from "./smtp-sink";

export default async function globalSetup() {
  return startSmtpSink(SMTP_PORT, MAIL_FILE); // el valor devuelto se ejecuta al terminar
}
