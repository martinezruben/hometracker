import { z } from "zod";
import { PASSWORD_MAX, PASSWORD_MIN } from "./password";

export const loginBody = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(PASSWORD_MAX),
});

export const registerBody = z.object({
  email: z.string().email().max(255),
  password: z.string().min(PASSWORD_MIN).max(PASSWORD_MAX),
  name: z.string().trim().max(120).optional(),
});
