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
        lr.id, lr.user_id,
        TO_CHAR(lr.start_date, 'YYYY-MM-DD') as start_date,
        TO_CHAR(lr.end_date, 'YYYY-MM-DD') as end_date,
        lr.leave_type, lr.status,
        lr.created_at, lr.cancelled_at,
        u.name as user_name, u.email as user_email
       FROM leave_requests lr
       JOIN users u ON lr.user_id = u.id
       ORDER BY lr.start_date DESC, u.name`
    );

    return Response.json({ leaves: result.rows });
  } catch (error) {
    console.error('Get all leaves error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
