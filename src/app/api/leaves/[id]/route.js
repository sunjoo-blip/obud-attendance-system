import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { deleteGoogleCalendarEvent } from '@/lib/googleCalendar';

// DELETE: 연차 취소
export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = params;

    // 연차 정보 조회
    const leaveResult = await query(
      `SELECT * FROM leave_requests WHERE id = $1 AND user_id = $2`,
      [id, session.user.id]
    );

    if (leaveResult.rows.length === 0) {
      return Response.json({ error: 'Leave not found' }, { status: 404 });
    }

    const leave = leaveResult.rows[0];

    if (leave.status === 'CANCELLED') {
      return Response.json({ error: '이미 취소된 연차입니다.' }, { status: 400 });
    }

    // 당일까지만 취소 가능 확인 (시작일 기준)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = new Date(leave.start_date);
    startDate.setHours(0, 0, 0, 0);

    if (startDate < today) {
      return Response.json({ error: '지난 연차는 취소할 수 없습니다.' }, { status: 400 });
    }

    // 연차 사용량 계산
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    const daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    const leaveAmount = leave.leave_type === 'FULL' ? daysDiff : 0.5;

    // 연차 취소
    await query(
      `UPDATE leave_requests
       SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );
    await query(
      `UPDATE leave_balance 
       SET used_leaves = used_leaves - $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [leaveAmount, session.user.id]
    );

    // Google Calendar 이벤트 삭제
    if (leave.google_calendar_event_id) {
      try {
        await deleteGoogleCalendarEvent(leave.google_calendar_event_id);
      } catch (calendarError) {
        console.error('Google Calendar delete error:', calendarError);
      }
    }

    // TODO: Slack 상태 원복

    return Response.json({ success: true });
  } catch (error) {
    console.error('Cancel leave error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
