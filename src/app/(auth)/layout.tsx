import { es } from "@/lib/i18n/es";
import { HouseIllustration } from "@/components/home/HouseIllustration";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-5 px-4 py-8">
      <header className="flex flex-col items-center text-center">
        <HouseIllustration className="-mb-2 w-[78%] max-w-[260px]" />
        <p className="text-[34px] font-extrabold leading-none tracking-tight">{es.app.name}</p>
        <p className="mt-2 text-[16px] text-muted">{es.app.description}</p>
      </header>
      <div className="card space-y-5 p-6">{children}</div>
    </main>
  );
}
