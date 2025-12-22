import { PrismaAdapter } from "@auth/prisma-adapter";
import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcrypt";

export const authConfig: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials): Promise<User | null> => {
        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user) return null;
        const ok = await bcrypt.compare(credentials.password, user.passwordHash);
        if (!ok) return null;
        return { id: user.id, email: user.email, name: user.name ?? undefined };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User }) {
      if (user) token.sub = user.id;
      const roles = token.sub
        ? await prisma.userRole.findMany({ where: { userId: token.sub }, include: { role: true } })
        : [];
      (token as JWT & { roles?: string[] }).roles = roles.map((r) => r.role.name);
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT & { roles?: string[] } }) {
      (session as Session & { roles?: string[] }).roles = token.roles ?? [];
      if (token.sub) (session.user as User & { id: string }).id = token.sub as string;
      return session;
    },
  },
};
