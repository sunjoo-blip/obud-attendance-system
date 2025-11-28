import { query } from '@/lib/db';

// 매월 1일 자동 월차 지급
export async function GET(req) {
  try {
    // Cron 인증 (보안을 위해 secret key 확인)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM

    // 모든 사용자에게 월차 지급
    const usersResult = await query(`SELECT id FROM users`);
    const users = usersResult.rows;

    let grantedCount = 0;

    for (const user of users) {
      try {
        // 이미 이번 달에 지급했는지 확인
        const checkResult = await query(
          `SELECT id FROM monthly_leave_grants 
           WHERE user_id = $1 AND grant_month = $2`,
          [user.id, currentMonth]
        );

        if (checkResult.rows.length > 0) {
          console.log(`User ${user.id} already granted for ${currentMonth}`);
          continue;
        }

        // 월차 지급
        await query(
          `UPDATE leave_balance 
           SET total_leaves = total_leaves + 1,
               updated_at = CURRENT_TIMESTAMP
           WHERE user_id = $1`,
          [user.id]
        );

        // 지급 이력 저장
        await query(
          `INSERT INTO monthly_leave_grants (user_id, grant_month, amount)
           VALUES ($1, $2, 1)`,
          [user.id, currentMonth]
        );

        grantedCount++;
      } catch (error) {
        console.error(`Failed to grant leave to user ${user.id}:`, error);
      }
    }

    return Response.json({
      success: true,
      message: `Granted monthly leave to ${grantedCount} users for ${currentMonth}`,
    });
  } catch (error) {
    console.error('Monthly leave grant error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
