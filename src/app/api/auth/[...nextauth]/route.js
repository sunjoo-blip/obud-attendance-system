import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { query } from '@/lib/db';

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // 사용자 확인 또는 생성
        const result = await query(
          `INSERT INTO users (google_id, email, name, profile_image)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (google_id) 
           DO UPDATE SET 
             email = EXCLUDED.email,
             name = EXCLUDED.name,
             profile_image = EXCLUDED.profile_image
           RETURNING id`,
          [user.id, user.email, user.name, user.image]
        );

        const userId = result.rows[0].id;

        // 연차 잔액 초기화 (존재하지 않는 경우)
        await query(
          `INSERT INTO leave_balance (user_id, total_leaves, used_leaves)
           VALUES ($1, 0, 0)
           ON CONFLICT (user_id) DO NOTHING`,
          [userId]
        );

        return true;
      } catch (error) {
        console.error('Sign in error:', error);
        return false;
      }
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
    signIn: '/login',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
