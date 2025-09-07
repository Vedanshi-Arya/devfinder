// src/lib/auth.ts
import { db } from "@/db";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { AuthOptions, DefaultSession, getServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import type { Adapter } from "next-auth/adapters";
import { users } from "@/db/schema"; // ensure this path is correct

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

/**
 * NOTE:
 * - Casting `db` to `any` before passing to DrizzleAdapter
 *   fixes the PgDatabase vs MySql2Database type mismatch.
 * - Safe at runtime: the adapter supports MySQL.
 */

export const authConfig: AuthOptions = {
  adapter: DrizzleAdapter(db as any) as Adapter,
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
    // jwt is called on sign-in and subsequent requests
    async jwt({ token, user }: { token: any; user?: any }) {
      try {
        // 1) First sign-in after OAuth
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

          // Adapter may not have created the user yet
          return {
            ...token,
            id: (user as any).id ?? token.sub,
            name: user.name,
            email: user.email,
            picture: user.image,
          };
        }

        // 2) Subsequent requests
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
};

export function getSession() {
  return getServerSession(authConfig);
}
