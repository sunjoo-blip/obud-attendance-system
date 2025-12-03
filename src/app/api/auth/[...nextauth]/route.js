import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { query } from "@/lib/db";

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }

          // 사용자 조회
          const result = await query(
            `SELECT id, email, name, password_hash, profile_image, is_admin
             FROM users
             WHERE email = $1`,
            [credentials.email]
          );

          if (result.rows.length === 0) {
            return null;
          }

          const user = result.rows[0];

          // 비밀번호 검증
          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );

          if (!isPasswordValid) {
            return null;
          }

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            image: user.profile_image,
            isAdmin: user.is_admin
          };
        } catch (error) {
          console.error("Authorization error:", error);
          return null;
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.isAdmin = user.isAdmin;
      }
      return token;
    },
    async session({ session, token }) {
      if (session?.user) {
        // 사용자 정보 조회
        const result = await query(
          `SELECT u.id, u.email, u.name, u.profile_image, u.is_admin,
                  lb.total_leaves, lb.used_leaves,
                  (lb.total_leaves - lb.used_leaves) as remaining_leaves
           FROM users u
           LEFT JOIN leave_balance lb ON u.id = lb.user_id
           WHERE u.email = $1`,
          [session.user.email]
        );

        if (result.rows.length > 0) {
          const user = result.rows[0];
          session.user.id = user.id;
          session.user.isAdmin = user.is_admin;
          session.user.totalLeaves = parseFloat(user.total_leaves) || 0;
          session.user.usedLeaves = parseFloat(user.used_leaves) || 0;
          session.user.remainingLeaves = parseFloat(user.remaining_leaves) || 0;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
