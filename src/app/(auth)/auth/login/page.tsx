"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(""); setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) setError("Invalid email or password");
    else router.push("/dashboard");
  };

  const handleOAuth = (provider: string) => signIn(provider, { callbackUrl: "/dashboard" });

  return (
    <div className="min-h-screen bg-forge-bg flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <a href="/" className="font-display font-extrabold text-2xl text-gradient">AppForge</a>
          <p className="text-gray-400 text-sm mt-2">Sign in to your account</p>
        </div>

        <div className="forge-panel p-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/25 rounded-lg p-3 mb-4 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* OAuth */}
          <div className="space-y-2 mb-6">
            <button onClick={() => handleOAuth("google")}
              className="w-full forge-btn-ghost justify-center py-2.5">
              <span>🔵</span> Continue with Google
            </button>
            <button onClick={() => handleOAuth("github")}
              className="w-full forge-btn-ghost justify-center py-2.5">
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
              <label className="block text-xs text-gray-400 mb-1">Email</label>
              <input type="email" required value={email} onChange={e => setEmail(e.target.value)}
                className="forge-input w-full" placeholder="you@example.com" />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Password</label>
              <input type="password" required value={password} onChange={e => setPassword(e.target.value)}
                className="forge-input w-full" placeholder="••••••••" />
            </div>
            <button type="submit" disabled={loading}
              className="w-full forge-btn-primary justify-center py-2.5 disabled:opacity-50">
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          No account?{" "}
          <Link href="/auth/register" className="text-forge-accent2 hover:underline">Create one</Link>
        </p>
      </div>
    </div>
  );
}
