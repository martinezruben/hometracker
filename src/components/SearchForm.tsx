export function SearchForm({ q, placeholder }: { q?: string; placeholder: string }) {
  return (
    <form action="" method="get" role="search">
      <input
        name="q"
        type="search"
        defaultValue={q}
        placeholder={placeholder}
        className="w-full min-h-12 rounded-xl border border-border bg-card px-4 text-base outline-none focus:border-primary"
      />
    </form>
  );
}
