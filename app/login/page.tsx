import { LoginForm } from "./login-form";

export const metadata = { title: "CastilloOS — Entrar" };

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4 relative overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 35%, rgba(0,229,160,0.07), transparent 70%)",
        }}
      />
      <div className="relative z-10 w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="font-display text-3xl font-extrabold tracking-tight text-white">
            Castillo<span className="text-green">OS</span>
          </div>
          <p className="text-sm text-muted mt-1">Tu flota de agentes personales.</p>
        </div>

        <div className="bg-card border border-border-bright rounded-2xl p-7">
          <LoginForm />
        </div>

        <p className="text-center text-xs text-muted2 mt-6">
          Acceso privado · CastilloOS
        </p>
      </div>
    </div>
  );
}
