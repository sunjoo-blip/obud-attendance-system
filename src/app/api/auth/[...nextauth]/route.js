import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { query } from "@/lib/db";
import { findSlackUserByEmail } from "@/lib/slack";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      try {
        // Google 로그인인 경우만 처리
        if (account.provider === "google") {
          // 기존 사용자 확인
          const existingUser = await query(
            `SELECT id, slack_user_id FROM users WHERE email = $1`,
            [user.email]
          );

          if (existingUser.rows.length === 0) {
            // 신규 사용자: 계정 생성
            const slackUserId = await findSlackUserByEmail(user.email);

            // 관리자 여부 확인
            const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim());
            const isAdmin = adminEmails.includes(user.email);

            const newUserResult = await query(
              `INSERT INTO users (email, name, profile_image, is_admin, slack_user_id)
               VALUES ($1, $2, $3, $4, $5)
               RETURNING id`,
              [user.email, user.name, user.image, isAdmin, slackUserId]
            );

            // 연차 잔액 초기화
            await query(
              `INSERT INTO leave_balance (user_id, total_leaves, used_leaves)
               VALUES ($1, 0, 0)`,
              [newUserResult.rows[0].id]
            );

            console.log(`New user created: ${user.email}, slack_user_id: ${slackUserId}`);
          } else {
            // 기존 사용자: slack_user_id가 없으면 업데이트
            if (!existingUser.rows[0].slack_user_id) {
              const slackUserId = await findSlackUserByEmail(user.email);
              if (slackUserId) {
                await query(
                  `UPDATE users SET slack_user_id = $1 WHERE email = $2`,
                  [slackUserId, user.email]
                );
                console.log(`Updated slack_user_id for ${user.email}: ${slackUserId}`);
              }
            }
          }
        }
        return true;
      } catch (error) {
        console.error("SignIn callback error:", error);
        return true; // 로그인은 허용하되 에러 로깅
      }
    },
    async jwt({ token, user }) {
      if (user) {
        // Google 로그인 시 DB에서 사용자 정보 조회
        const result = await query(
          `SELECT id, is_admin FROM users WHERE email = $1`,
          [user.email]
        );

        if (result.rows.length > 0) {
          token.id = result.rows[0].id;
          token.isAdmin = result.rows[0].is_admin;
        }
      }
      return token;
    },
    async session({ session }) {
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
