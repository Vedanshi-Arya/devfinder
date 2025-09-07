// src/lib/auth.ts
import { db } from "@/db";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { AuthOptions, DefaultSession, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { Adapter } from "next-auth/adapters";
import { users } from "@/db/schema"; // ensure this path matches your project

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

/**
 * NOTE:
 * - We cast DrizzleAdapter to `any` to avoid type mismatches between @auth/drizzle-adapter
 *   and next-auth typings. This is safe at runtime (adapter shape is correct).
 * - Callbacks are defensive: they don't throw, they fallback gracefully, and log when debug is enabled.
 */

export const authConfig: AuthOptions = {
  adapter: DrizzleAdapter(db) as unknown as Adapter,
  session: {
    strategy: "jwt",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
  ],
  callbacks: {
    // jwt is called on sign-in and on subsequent requests
    async jwt({ token, user }: { token: any; user?: any }) {
      try {
        // 1) If `user` exists, this is the first sign-in after OAuth
        if (user) {
          const email = (user as any).email ?? token.email;
          if (email) {
            const dbUser = await db.query.users.findFirst({
              where: (u, { eq }) => eq(u.email, email),
            });
            if (dbUser) {
              return {
                ...token,
                id: dbUser.id,
                name: dbUser.name ?? user.name,
                email: dbUser.email,
                picture: dbUser.image ?? user.image,
              };
            }
          }

          // Adapter may not have created the user yet; return token built from provider user
          return {
            ...token,
            id: (user as any).id ?? token.sub,
            name: user.name,
            email: user.email,
            picture: user.image,
          };
        }

        // 2) Subsequent requests: try to enrich token from DB using token.email
        if (token?.email) {
          const dbUser = await db.query.users.findFirst({
            where: (u, { eq }) => eq(u.email, token.email as string),
          });
          if (dbUser) {
            return {
              ...token,
              id: dbUser.id,
              name: dbUser.name,
              email: dbUser.email,
              picture: dbUser.image,
            };
          }
        }
      } catch (err) {
        if (process.env.NEXTAUTH_DEBUG) {
          console.error("JWT callback error:", err);
        }
      }

      // fallback: return token unchanged
      return token;
    },

    // session is called whenever `getSession()` is used client/server
    async session({ session, token }: { session: any; token: any }) {
      if (token) {
        session.user = {
          id: (token as any).id ?? (token.sub as string) ?? "",
          name: token.name as string | undefined,
          email: token.email as string | undefined,
          image: token.picture as string | undefined,
        };
      }
      return session;
    },
  },
  // more options can be added here (pages, events, etc.)
};

export function getSession() {
  return getServerSession(authConfig);
}
