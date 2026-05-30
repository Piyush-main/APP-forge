"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const [form, setForm]       = useState({ name: "", email: "", password: "" });
  const [error, setError]     = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);

    const res = await fetch("/api/auth/register", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(form),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Registration failed");
      setLoading(false);
      return;
    }

    // Auto sign-in
    const signInRes = await signIn("credentials", {
      email:    form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);
    if (signInRes?.error) { setError("Account created — please sign in"); return; }
    router.push("/dashboard");
  };

  return (
    <div className="min-h-screen bg-forge-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <a href="/" className="font-display font-extrabold text-2xl text-gradient">AppForge</a>
          <p className="text-gray-400 text-sm mt-2">Create your account</p>
        </div>

        <div className="forge-panel p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-lg p-3 mb-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* OAuth */}
          <div className="space-y-2 mb-6">
            <button
              onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
              className="w-full forge-btn-ghost justify-center py-2.5"
            >
              <span>🔵</span> Continue with Google
            </button>
            <button
              onClick={() => signIn("github", { callbackUrl: "/dashboard" })}
              className="w-full forge-btn-ghost justify-center py-2.5"
            >
              <span>⚫</span> Continue with GitHub
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-forge-border" />
            <span className="text-xs text-gray-500">or email</span>
            <div className="flex-1 h-px bg-forge-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Name</label>
              <input
                required minLength={2} value={form.name} onChange={set("name")}
                className="forge-input w-full" placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input
                type="email" required value={form.email} onChange={set("email")}
                className="forge-input w-full" placeholder="you@example.com"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Password</label>
              <input
                type="password" required minLength={8} value={form.password} onChange={set("password")}
                className="forge-input w-full" placeholder="Min. 8 characters"
              />
            </div>
            <button
              type="submit" disabled={loading}
              className="w-full forge-btn-primary justify-center py-2.5 disabled:opacity-50"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          Already have an account?{" "}
          <Link href="/auth/login" className="text-forge-accent2 hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
