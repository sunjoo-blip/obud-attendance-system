import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await query(
      `SELECT 
        u.id, u.email, u.name, u.profile_image, u.is_admin,
        COALESCE(lb.total_leaves, 0) as total_leaves,
        COALESCE(lb.used_leaves, 0) as used_leaves,
        COALESCE(lb.total_leaves - lb.used_leaves, 0) as remaining_leaves
       FROM users u
       LEFT JOIN leave_balance lb ON u.id = lb.user_id
       ORDER BY u.name`
    );

    return Response.json({ users: result.rows });
  } catch (error) {
    console.error('Get users error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
