import Image from "next/image";
import { Button } from "@/components/ui/Button";

export default function HomePage() {
  return (
    <section className="mx-auto flex min-h-screen max-w-3xl flex-col items-center justify-center px-6 text-center">
      <Image
        src="/logo-terp.svg"
        alt="T-ERP"
        width={96}
        height={96}
        priority
        className="mb-6"
      />

      <h1 className="text-3xl font-bold tracking-tight text-ink sm:text-4xl">
        T-ERP — projet initialisé.
      </h1>
      <p className="mt-3 text-base text-ink-3">
        Prochaine étape : J1 portail public.
      </p>

      <div className="mt-8">
        <Button variant="primary" size="lg">
          Charte violette OK
        </Button>
      </div>
    </section>
  );
}
