import { Brand } from "@/components/app/Brand";
import { ThemeToggle } from "@/components/app/ThemeToggle";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-dvh max-w-md flex-col px-5 py-6">
      <div className="flex items-center justify-between">
        <Brand />
        <ThemeToggle />
      </div>
      <div className="flex flex-1 flex-col justify-center py-10">{children}</div>
    </div>
  );
}
