export function EmptyState({ title, text }: { title: string; text: string }) {
  return (
    <section>
      <h1 className="text-2xl font-bold">{title}</h1>
      <p className="mt-4 card p-4 text-muted">{text}</p>
    </section>
  );
}
