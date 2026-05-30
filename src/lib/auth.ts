import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GitHubProvider from "next-auth/providers/github";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),

  session: { strategy: "jwt" },

  pages: {
    signIn:  "/auth/login",
    signOut: "/auth/logout",
    error:   "/auth/error",
    newUser: "/dashboard",
  },

  providers: [
    // ── Email + Password ────────────────────────────────────────────────
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email:    { label: "Email",    type: "email"    },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const user = await prisma.user.findUnique({
          where: { email: String(credentials.email) },
        });

        if (!user || !user.passwordHash) return null;

        const valid = await bcrypt.compare(
          String(credentials.password),
          user.passwordHash,
        );

        if (!valid) return null;

        return {
          id:    user.id,
          email: user.email,
          name:  user.name,
          role:  user.role,
        };
      },
    }),

    // ── Google OAuth ────────────────────────────────────────────────────
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [
          GoogleProvider({
            clientId:     process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          }),
        ]
      : []),

    // ── GitHub OAuth ─────────────────────────────────────────────────────
    ...(process.env.GITHUB_ID && process.env.GITHUB_SECRET
      ? [
          GitHubProvider({
            clientId:     process.env.GITHUB_ID,
            clientSecret: process.env.GITHUB_SECRET,
          }),
        ]
      : []),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id   = user.id;
        token.role = (user as { role?: string }).role ?? "user";
      }
      return token;
    },

    async session({ session, token }) {
      if (token) {
        session.user.id   = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },

  events: {
    async createUser({ user }) {
      // Auto-assign admin role to first user
      const count = await prisma.user.count();
      if (count === 1) {
        await prisma.user.update({
          where: { id: user.id! },
          data:  { role: "admin" },
        });
      }
    },
  },
});
