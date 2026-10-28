/** Ilustración isométrica de una casa con paneles solares (decorativa). */
export function HouseIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 220 150" className={className} aria-hidden>
      <ellipse cx="112" cy="132" rx="84" ry="14" fill="#c7d2ea" opacity=".55" />
      <path d="M112 62 190 104 112 146 34 104Z" fill="#34c76b" />
      <path d="M34 104 112 146v8L34 112Z" fill="#1f9d55" />
      <path d="M112 146 190 104v8l-78 42Z" fill="#168a49" />
      <path d="M70 92 112 70l42 22v26l-42 22-42-22Z" fill="#fff" />
      <path d="M112 70 154 92v26l-42 22Z" fill="#e8eefb" />
      <path d="M62 88 112 58l50 30-8 6-42-24-42 24Z" fill="#475569" />
      <path d="M112 58l50 30-8 6-42-24Z" fill="#334155" />
      <path d="M88 84 112 70l24 14-24 14Z" fill="#2563eb" />
      <path d="M96 84 112 75l16 9-16 9Z" fill="#60a5fa" opacity=".6" />
      <rect x="100" y="104" width="14" height="24" rx="2" fill="#2563eb" transform="skewY(26) translate(0,-52)" />
      <rect x="125" y="100" width="12" height="12" rx="1.5" fill="#bfdbfe" transform="skewY(-26) translate(0,66)" />
      <circle cx="52" cy="104" r="9" fill="#22a45a" />
      <circle cx="52" cy="100" r="6" fill="#34c76b" />
      <circle cx="176" cy="96" r="8" fill="#22a45a" />
      <circle cx="176" cy="92" r="5.5" fill="#34c76b" />
    </svg>
  );
}
