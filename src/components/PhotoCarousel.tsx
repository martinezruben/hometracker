"use client";

import { useRef, useState } from "react";

/** Carrusel de fotos con puntos de posición (desliza horizontalmente con ajuste a cada foto). */
export function PhotoCarousel({ photoIds }: { photoIds: string[] }) {
  const ref = useRef<HTMLUListElement>(null);
  const [index, setIndex] = useState(0);
  return (
    <>
      <ul
        ref={ref}
        className="flex h-full snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        onScroll={(e) => setIndex(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
      >
        {photoIds.map((id) => (
          <li key={id} className="h-full w-full shrink-0 snap-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`/api/files/${id}`} alt="" className="h-full w-full object-cover" />
          </li>
        ))}
      </ul>
      {photoIds.length > 1 && (
        <div className="absolute inset-x-0 bottom-10 flex justify-center gap-1.5" aria-hidden>
          {photoIds.map((id, i) => (
            <span key={id} className={`h-1.5 rounded-full bg-white/90 transition-all ${i === index ? "w-5" : "w-1.5 opacity-60"}`} />
          ))}
        </div>
      )}
    </>
  );
}
