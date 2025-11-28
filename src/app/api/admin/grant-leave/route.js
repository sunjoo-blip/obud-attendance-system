import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { userId, amount } = await req.json();

    if (!userId || !amount || amount <= 0) {
      return Response.json({ error: 'Invalid parameters' }, { status: 400 });
    }

    // 연차 지급
    await query(
      `UPDATE leave_balance 
       SET total_leaves = total_leaves + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [amount, userId]
    );

    return Response.json({ success: true });
  } catch (error) {
    console.error('Grant leave error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
