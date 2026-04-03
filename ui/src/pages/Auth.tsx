import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "@/lib/router";
import { authApi } from "../api/auth";
import { queryKeys } from "../lib/queryKeys";
import { Button } from "@/components/ui/button";
import { GraceAnimation } from "@/components/GraceAnimation";

type AuthMode = "sign_in" | "sign_up";

export function AuthPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("sign_in");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  const nextPath = useMemo(() => searchParams.get("next") || "/", [searchParams]);
  const { data: session, isLoading: isSessionLoading } = useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: () => authApi.getSession(),
    retry: false,
  });

  useEffect(() => {
    if (session) {
      navigate(nextPath, { replace: true });
    }
  }, [session, navigate, nextPath]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === "sign_in") {
        await authApi.signInEmail({ email: email.trim(), password });
        return;
      }
      await authApi.signUpEmail({
        name: name.trim(),
        email: email.trim(),
        password,
      });
    },
    onSuccess: async () => {
      setError(null);
      await queryClient.invalidateQueries({ queryKey: queryKeys.auth.session });
      await queryClient.invalidateQueries({ queryKey: queryKeys.companies.all });
      navigate(nextPath, { replace: true });
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : "Authentication failed");
    },
  });

  const canSubmit =
    email.trim().length > 0 &&
    password.trim().length > 0 &&
    (mode === "sign_in" || (name.trim().length > 0 && password.trim().length >= 8));

  if (isSessionLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Loading…</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex bg-background">
      {/* Left half — form */}
      <div className="w-full md:w-1/2 flex flex-col overflow-y-auto">
        <div className="w-full max-w-md mx-auto my-auto px-8 py-12">

          {/* Logo mark */}
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--grace-accent)] text-white text-base font-bold shadow-lg shadow-[var(--grace-accent)]/30">
                G
              </div>
              <div>
                <div className="text-xs font-semibold tracking-[0.25em] text-[var(--grace-accent)] uppercase">
                  G.R.A.C.E.
                </div>
                <div className="text-[10px] tracking-widest text-muted-foreground uppercase">
                  by Kodavara
                </div>
              </div>
            </div>
          </div>

          <h1 className="text-2xl font-semibold tracking-tight">
            {mode === "sign_in" ? "Welcome back" : "Create your account"}
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            {mode === "sign_in"
              ? "Sign in to access Kodavara GRACE."
              : "Create an account to access this instance."}
          </p>

          <form
            className="mt-7 space-y-4"
            method="post"
            action={mode === "sign_up" ? "/api/auth/sign-up/email" : "/api/auth/sign-in/email"}
            onSubmit={(event) => {
              event.preventDefault();
              if (mutation.isPending) return;
              if (!canSubmit) {
                setError("Please fill in all required fields.");
                return;
              }
              mutation.mutate();
            }}
          >
            {mode === "sign_up" && (
              <div>
                <label htmlFor="name" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Full name
                </label>
                <input
                  id="name"
                  name="name"
                  className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[var(--grace-accent)] focus:border-[var(--grace-accent)] placeholder:text-muted-foreground/50 transition-colors"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  autoComplete="name"
                  autoFocus
                  placeholder="Your name"
                />
              </div>
            )}
            <div>
              <label htmlFor="email" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Email
              </label>
              <input
                id="email"
                name="email"
                className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[var(--grace-accent)] focus:border-[var(--grace-accent)] placeholder:text-muted-foreground/50 transition-colors"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                autoFocus={mode === "sign_in"}
                placeholder="you@example.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                Password
              </label>
              <input
                id="password"
                name="password"
                className="w-full rounded-md border border-border bg-transparent px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-[var(--grace-accent)] focus:border-[var(--grace-accent)] placeholder:text-muted-foreground/50 transition-colors"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete={mode === "sign_in" ? "current-password" : "new-password"}
                placeholder={mode === "sign_up" ? "Min. 8 characters" : "••••••••"}
              />
            </div>

            {error && (
              <p className="text-xs text-destructive bg-destructive/10 rounded px-3 py-2">{error}</p>
            )}

            <Button
              type="submit"
              disabled={mutation.isPending}
              aria-disabled={!canSubmit || mutation.isPending}
              className={`w-full mt-1 bg-[var(--grace-accent)] hover:bg-[var(--grace-accent)]/90 text-white ${
                !canSubmit && !mutation.isPending ? "opacity-50" : ""
              }`}
            >
              {mutation.isPending
                ? "Working…"
                : mode === "sign_in"
                  ? "Sign In"
                  : "Create Account"}
            </Button>
          </form>

          <div className="mt-6 text-sm text-muted-foreground">
            {mode === "sign_in" ? "Don't have an account?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-medium text-[var(--grace-accent)] hover:underline underline-offset-2 transition-colors"
              onClick={() => {
                setError(null);
                setMode(mode === "sign_in" ? "sign_up" : "sign_in");
              }}
            >
              {mode === "sign_in" ? "Create one" : "Sign in"}
            </button>
          </div>

          <div className="mt-12 text-[10px] text-muted-foreground/40 tracking-widest uppercase">
            Kodavara GRACE — Agent Orchestration Platform
          </div>
        </div>
      </div>

      {/* Right half — GRACE animation */}
      <div className="hidden md:block w-1/2 overflow-hidden relative bg-black/20">
        <GraceAnimation />
        {/* Overlay label */}
        <div className="absolute bottom-8 left-0 right-0 flex flex-col items-center gap-1 pointer-events-none">
          <div className="text-[10px] font-semibold tracking-[0.4em] text-[var(--grace-accent)]/60 uppercase">
            G.R.A.C.E.
          </div>
          <div className="text-[9px] tracking-[0.25em] text-muted-foreground/30 uppercase">
            Generative Runtime Agent Coordination Engine
          </div>
        </div>
      </div>
    </div>
  );
}
