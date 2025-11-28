import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { deleteGoogleCalendarEvent } from '@/lib/googleCalendar';

export async function DELETE(req, { params }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = params;

    // 연차 정보 조회
    const leaveResult = await query(
      `SELECT * FROM leave_requests WHERE id = $1`,
      [id]
    );

    if (leaveResult.rows.length === 0) {
      return Response.json({ error: 'Leave not found' }, { status: 404 });
    }

    const leave = leaveResult.rows[0];

    // 연차 삭제 (상태 변경)
    await query(
      `UPDATE leave_requests 
       SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    // 연차 잔액 복구
    const leaveAmount = leave.leave_type === 'FULL' ? 1 : 0.5;
    await query(
      `UPDATE leave_balance 
       SET used_leaves = used_leaves - $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [leaveAmount, leave.user_id]
    );

    // Google Calendar 이벤트 삭제
    if (leave.google_calendar_event_id) {
      try {
        await deleteGoogleCalendarEvent(leave.google_calendar_event_id);
      } catch (calendarError) {
        console.error('Google Calendar delete error:', calendarError);
      }
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Admin delete leave error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
