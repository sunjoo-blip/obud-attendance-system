import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const result = await query(
      `SELECT
        u.id, u.email, u.name, u.profile_image, u.is_admin,
        TO_CHAR(u.join_date, 'YYYY-MM-DD') as join_date,
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

export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, joinDate } = body;

    if (!userId) {
      return Response.json({ error: 'User ID is required' }, { status: 400 });
    }

    // 입사일 업데이트
    await query(
      'UPDATE users SET join_date = $1 WHERE id = $2',
      [joinDate || null, userId]
    );

    // 입사일이 설정된 경우 자동으로 연차 계산
    if (joinDate) {
      const totalLeaves = calculateInitialLeaves(joinDate);

      // leave_balance 업데이트 (없으면 생성)
      await query(
        `INSERT INTO leave_balance (user_id, total_leaves, used_leaves)
         VALUES ($1, $2, 0)
         ON CONFLICT (user_id)
         DO UPDATE SET
           total_leaves = $2,
           updated_at = CURRENT_TIMESTAMP`,
        [userId, totalLeaves]
      );
    }

    return Response.json({ message: 'Join date updated successfully' });
  } catch (error) {
    console.error('Update join date error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 입사일 기준으로 초기 연차 계산 (누적)
function calculateInitialLeaves(joinDate) {
  const join = new Date(joinDate);
  const current = new Date();

  const yearsDiff = current.getFullYear() - join.getFullYear();
  const monthsDiff = current.getMonth() - join.getMonth();
  const daysDiff = current.getDate() - join.getDate();

  // 근속 년수 계산
  let yearsOfService = yearsDiff;
  if (monthsDiff < 0 || (monthsDiff === 0 && daysDiff < 0)) {
    yearsOfService = yearsDiff - 1;
  }

  // 1년 미만
  if (yearsOfService < 1) {
    // 근속 개월 수 계산
    let monthsWorked = monthsDiff;
    if (daysDiff < 0) {
      monthsWorked--;
    }
    if (monthsWorked < 0) {
      monthsWorked += 12;
    }

    // 입사 월 포함해서 개월 수 계산 (최대 11개)
    return Math.min(monthsWorked + 1, 11);
  }

  // 1년 이상: 매년 지급된 연차를 모두 누적
  // 1년차: 15일, 2년차: 15일, 3년차: 16일, 4년차: 16일, 5년차: 17일...
  let totalLeaves = 0;
  for (let year = 1; year <= yearsOfService; year++) {
    totalLeaves += 15 + Math.floor((year - 1) / 2);
  }

  return totalLeaves;
}
