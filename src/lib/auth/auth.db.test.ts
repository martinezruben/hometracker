// Pruebas de integración: requieren MySQL (DATABASE_URL). Se omiten si no está definida.
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

const hasDb = !!process.env.DATABASE_URL;

if (!hasDb) {
  describe.skip("auth + hogares (MySQL)", () => it("requiere DATABASE_URL", () => {}));
} else {
  const { db, schema } = await import("@/db");
  const { createOtp, verifyOtp, OTP_MAX_ATTEMPTS, RateLimitError } = await import("./otp");
  const { registerUser, authenticate, changePassword, EmailTakenError, LOGIN_MAX_FAILURES } = await import("./password");
  const { createHousehold, createInvitation, acceptInvitation } = await import("@/lib/households");
  const { getMemberRole, requireRole } = await import("./membership");
  const { ForbiddenError } = await import("./roles");

  describe("auth + hogares (MySQL)", () => {
  const tag = randomUUID().slice(0, 8);
  const email = (n: string) => `${n}-${tag}@test.local`;
  const hogares: string[] = [];

  afterAll(async () => {
    for (const id of hogares) {
      await db.delete(schema.invitations).where(eq(schema.invitations.householdId, id));
      await db.delete(schema.householdMembers).where(eq(schema.householdMembers.householdId, id));
      await db.delete(schema.households).where(eq(schema.households.id, id));
    }
    for (const n of ["ana", "beto", "carla", "dani", "eli", "fede", "gus"]) {
      await db.delete(schema.otpCodes).where(eq(schema.otpCodes.email, email(n)));
      await db.delete(schema.users).where(eq(schema.users.email, email(n)));
    }
  });

  it("OTP correcto crea el usuario y no se puede reutilizar", async () => {
    const { code } = await createOtp(email("ana"));
    const user = await verifyOtp(email("ana"), code);
    expect(user?.email).toBe(email("ana"));
    expect(await verifyOtp(email("ana"), code)).toBeNull();
  });

  it("OTP incorrecto se bloquea tras el máximo de intentos", async () => {
    const { code } = await createOtp(email("beto"));
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < OTP_MAX_ATTEMPTS; i++) expect(await verifyOtp(email("beto"), wrong)).toBeNull();
    expect(await verifyOtp(email("beto"), code)).toBeNull();
  });

  it("OTP vencido es inválido", async () => {
    const { code } = await createOtp(email("carla"), new Date(Date.now() - 11 * 60 * 1000));
    expect(await verifyOtp(email("carla"), code)).toBeNull();
  });

  it("contraseña: registra, autentica, rechaza duplicados y bloquea tras fallos seguidos", async () => {
    const u = await registerUser(email("Fede"), "una-clave-larga");
    expect(u.passwordHash).not.toContain("una-clave-larga");
    await expect(registerUser(email("fede"), "otra-clave-larga")).rejects.toBeInstanceOf(EmailTakenError);
    expect((await authenticate(email("fede").toUpperCase(), "una-clave-larga"))?.id).toBe(u.id);
    expect(await authenticate(email("fede"), "mala")).toBeNull();
    expect(await authenticate(email("nadie"), "una-clave-larga")).toBeNull();
    for (let i = 1; i < LOGIN_MAX_FAILURES; i++) await authenticate(email("fede"), "mala"); // ya hubo 1 fallo
    await expect(authenticate(email("fede"), "una-clave-larga")).rejects.toBeInstanceOf(RateLimitError);
    const later = new Date(Date.now() + 16 * 60 * 1000);
    expect((await authenticate(email("fede"), "una-clave-larga", later))?.id).toBe(u.id);
  });

  it("cambiar contraseña deja la nueva, quita el bloqueo y cierra las otras sesiones", async () => {
    const u = await registerUser(email("gus"), "clave-vieja-1");
    const keep = `keep-${tag}`.padEnd(64, "0");
    const mk = (id: string) => db.insert(schema.sessions).values({ id, userId: u.id, expiresAt: new Date(Date.now() + 3600_000) });
    await mk(keep);
    await mk(`drop-${tag}`.padEnd(64, "0"));
    await changePassword(u.id, "clave-nueva-2", keep);
    expect(await authenticate(email("gus"), "clave-vieja-1")).toBeNull();
    expect((await authenticate(email("gus"), "clave-nueva-2"))?.id).toBe(u.id);
    const left = await db.select().from(schema.sessions).where(eq(schema.sessions.userId, u.id));
    expect(left.map((s) => s.id)).toEqual([keep]);
    await db.delete(schema.sessions).where(eq(schema.sessions.userId, u.id));
  });

  it("limita los códigos por hora", async () => {
    for (let i = 0; i < 5; i++) await createOtp(email("dani"));
    await expect(createOtp(email("dani"))).rejects.toBeInstanceOf(RateLimitError);
  });

  it("aísla hogares: un no miembro es rechazado y la invitación sirve una sola vez", async () => {
    const [a, b] = await Promise.all(
      ["ana", "eli"].map(async (n) => {
        const { code } = await createOtp(email(n));
        return (await verifyOtp(email(n), code))!;
      }),
    );
    const hh = await createHousehold(a.id, "Casa de Ana");
    hogares.push(hh);

    expect(await getMemberRole(a.id, hh)).toBe("admin");
    expect(await getMemberRole(b.id, hh)).toBeNull();
    await expect(requireRole(b.id, hh)).rejects.toBeInstanceOf(ForbiddenError);

    const token = await createInvitation(hh, a.id, "viewer");
    expect(await acceptInvitation(b, token)).toBe(hh);
    expect(await getMemberRole(b.id, hh)).toBe("viewer");
    await expect(requireRole(b.id, hh, "member")).rejects.toBeInstanceOf(ForbiddenError);
    expect(await acceptInvitation(b, token)).toBeNull();
    expect(await acceptInvitation(b, "token-que-no-existe-000000000")).toBeNull();
  });
});
}
