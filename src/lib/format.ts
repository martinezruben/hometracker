/** Fechas "solo día" guardadas como medianoche UTC. */
export const formatDate = (d: Date) =>
  d.toLocaleDateString("es", { timeZone: "UTC", day: "numeric", month: "short", year: "numeric" });
export const toDateInput = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : "");
export const todayInput = () => {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, "0")}-${String(n.getDate()).padStart(2, "0")}`;
};
export const formatMoney = (n: number) =>
  n.toLocaleString("es", { style: "currency", currency: process.env.NEXT_PUBLIC_CURRENCY ?? "USD" });
