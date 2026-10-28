/** Ilustración isométrica de una caja de cartón con etiqueta (decorativa). */
export function BoxIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 130" className={className} aria-hidden>
      <ellipse cx="80" cy="112" rx="56" ry="10" fill="#000" opacity=".08" />
      <path d="M80 18 140 48v42l-60 28L20 90V48Z" fill="#c98f46" />
      <path d="M80 18 140 48 80 78 20 48Z" fill="#e6b672" />
      <path d="M80 78 140 48v42l-60 28Z" fill="#c4883f" />
      <path d="M20 48 80 78v40L20 90Z" fill="#d9a35e" />
      <path d="M62 28 98 46 80 55 44 37Z" fill="#f0d0a0" opacity=".9" />
      <path d="M40 66 62 77v22L40 88Z" fill="#fff" />
      <path d="M46 72 56 77v12l-10-5Z" fill="#0f172a" />
    </svg>
  );
}
