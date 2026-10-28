import { redirect } from "next/navigation";

/** Los pendientes viven en la pestaña "Pendientes" de Listas. */
export default function TasksPage() {
  redirect("/lists");
}
