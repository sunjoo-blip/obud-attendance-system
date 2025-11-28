import { query } from '@/lib/db';
import { setSlackStatus, clearSlackStatus } from '@/lib/slack';

// 매일 자정 (00:00): 오늘 연차인 사람들 Slack 상태 설정
// 매일 저녁 (18:00): 오늘 연차인 사람들 Slack 상태 원복
export async function GET(req) {
  try {
    // Cron 인증
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action'); // 'set' or 'clear'

    const today = new Date().toISOString().split('T')[0];

    // 오늘 연차인 사람들 조회
    const result = await query(
      `SELECT lr.id, lr.leave_type, u.slack_user_id, u.name
       FROM leave_requests lr
       JOIN users u ON lr.user_id = u.id
       WHERE lr.leave_date = $1 AND lr.status = 'APPROVED'
         AND u.slack_user_id IS NOT NULL`,
      [today]
    );

    const leaves = result.rows;
    let processedCount = 0;

    for (const leave of leaves) {
      try {
        if (action === 'set') {
          // Slack 상태 설정
          const statusText = leave.leave_type === 'FULL' 
            ? '🏖️ 연차'
            : leave.leave_type === 'AM_HALF'
            ? '🌅 오전 반차'
            : '🌆 오후 반차';

          await setSlackStatus(leave.slack_user_id, statusText);
          processedCount++;
        } else if (action === 'clear') {
          // Slack 상태 원복
          await clearSlackStatus(leave.slack_user_id);
          processedCount++;
        }
      } catch (error) {
        console.error(`Failed to update Slack status for ${leave.name}:`, error);
      }
    }

    return Response.json({
      success: true,
      message: `${action === 'set' ? 'Set' : 'Cleared'} Slack status for ${processedCount} users`,
    });
  } catch (error) {
    console.error('Slack status update error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
