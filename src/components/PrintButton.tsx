"use client";

import { es } from "@/lib/i18n/es";
import { buttonCls } from "@/components/ui";

export function PrintButton() {
  return (
    <button className={`${buttonCls} print:hidden`} onClick={() => window.print()}>
      {es.boxes.print}
    </button>
  );
}
