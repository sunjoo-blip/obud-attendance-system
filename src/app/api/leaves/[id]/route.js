import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { deleteGoogleCalendarEvent } from '@/lib/googleCalendar';
import { sendLeaveCancellationNotification } from '@/lib/slack';

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

    // 연차 취소
    await query(
      `UPDATE leave_requests
       SET status = 'CANCELLED', cancelled_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [id]
    );

    // 원래 사용량 재계산
    const start = new Date(leave.start_date);
    const end = new Date(leave.end_date);
    let leaveAmount;
    if (leave.leave_type === 'FULL') {
      leaveAmount = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    } else if (leave.leave_type === 'QUARTER_DAY') {
      leaveAmount = 0.25;
    } else {
      leaveAmount = 0.5;
    }

    // 생일 연차 먼저 복구, 나머지는 일반 연차 복구
    const birthdayUsed = parseFloat(leave.birthday_used || 0);
    const normalUsed = leaveAmount - birthdayUsed;
    await query(
      `UPDATE leave_balance
       SET birthday_leaves = birthday_leaves + $1,
           used_leaves = used_leaves - $2,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $3`,
      [birthdayUsed, normalUsed, session.user.id]
    );

    // Google Calendar 이벤트 삭제
    if (leave.google_calendar_event_id) {
      try {
        await deleteGoogleCalendarEvent(leave.google_calendar_event_id);
      } catch (calendarError) {
        console.error('Google Calendar delete error:', calendarError);
      }
    }

    // Slack 채널 취소 알림 발송
    try {
      const userResult = await query(`SELECT name FROM users WHERE id = $1`, [
        session.user.id,
      ]);
      const userName = userResult.rows[0]?.name || session.user.name;

      // DATE 컬럼을 YYYY-MM-DD 문자열로 변환 (로컬 타임존 기준)
      const formatDate = (date) => {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      await sendLeaveCancellationNotification({
        userName,
        leaveType: leave.leave_type,
        startDate: formatDate(leave.start_date),
        endDate: formatDate(leave.end_date),
        startTime: leave.start_time?.slice(0, 5),
        endTime: leave.end_time?.slice(0, 5),
      });
    } catch (slackError) {
      console.error('Slack cancellation notification error:', slackError);
      // 알림 오류는 무시하고 계속 진행
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Cancel leave error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
