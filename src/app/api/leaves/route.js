import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { addGoogleCalendarEvent } from '@/lib/googleCalendar';

// GET: 내 연차 조회
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await query(
      `SELECT id, user_id,
              TO_CHAR(start_date, 'YYYY-MM-DD') as start_date,
              TO_CHAR(end_date, 'YYYY-MM-DD') as end_date,
              leave_type, status, google_calendar_event_id,
              created_at, cancelled_at
       FROM leave_requests
       WHERE user_id = $1
       ORDER BY start_date DESC`,
      [session.user.id]
    );

    return Response.json({ leaves: result.rows });
  } catch (error) {
    console.error('Get leaves error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST: 연차 신청
export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { startDate, endDate, leaveType } = await req.json();

    if (!startDate || !endDate || !leaveType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['FULL', 'AM_HALF', 'PM_HALF'].includes(leaveType)) {
      return Response.json({ error: 'Invalid leave type' }, { status: 400 });
    }

    // 날짜 검증
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return Response.json({ error: '시작일은 종료일보다 이전이어야 합니다.' }, { status: 400 });
    }

    // 연차 사용량 계산
    const daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;
    let leaveAmount;
    if (leaveType === 'FULL') {
      leaveAmount = daysDiff;
    } else {
      // 반차는 하루만 가능
      if (daysDiff > 1) {
        return Response.json({ error: '반차는 하루만 선택 가능합니다.' }, { status: 400 });
      }
      leaveAmount = 0.5;
    }

    // 연차 잔액 확인
    const balanceResult = await query(
      `SELECT total_leaves, used_leaves FROM leave_balance WHERE user_id = $1`,
      [session.user.id]
    );

    if (balanceResult.rows.length === 0) {
      return Response.json({ error: 'Leave balance not found' }, { status: 404 });
    }

    const balance = balanceResult.rows[0];
    const totalLeaves = parseFloat(balance.total_leaves);
    const usedLeaves = parseFloat(balance.used_leaves);

    if (totalLeaves - usedLeaves < leaveAmount) {
      return Response.json({ error: '연차가 부족합니다.' }, { status: 400 });
    }

    // 중복 신청 확인 (날짜 범위가 겹치는지 확인)
    const duplicateCheck = await query(
      `SELECT id FROM leave_requests
       WHERE user_id = $1
       AND status = 'APPROVED'
       AND (
         (start_date <= $2 AND end_date >= $2) OR
         (start_date <= $3 AND end_date >= $3) OR
         (start_date >= $2 AND end_date <= $3)
       )`,
      [session.user.id, startDate, endDate]
    );

    if (duplicateCheck.rows.length > 0) {
      return Response.json({ error: '이미 신청한 날짜와 겹칩니다.' }, { status: 400 });
    }

    // 연차 신청 생성
    const leaveResult = await query(
      `INSERT INTO leave_requests (user_id, start_date, end_date, leave_type, status)
       VALUES ($1, $2, $3, $4, 'APPROVED')
       RETURNING *`,
      [session.user.id, startDate, endDate, leaveType]
    );

    const leave = leaveResult.rows[0];

    // 연차 잔액 업데이트
    await query(
      `UPDATE leave_balance
       SET used_leaves = used_leaves + $1,
           updated_at = CURRENT_TIMESTAMP
       WHERE user_id = $2`,
      [leaveAmount, session.user.id]
    );

    // Google Calendar에 이벤트 추가
    try {
      // DB에서 사용자 이름 조회
      const userResult = await query(
        `SELECT name FROM users WHERE id = $1`,
        [session.user.id]
      );
      const userName = userResult.rows[0]?.name || session.user.name;

      const eventId = await addGoogleCalendarEvent({
        userName,
        startDate,
        endDate,
        leaveType,
      });

      // 이벤트 ID 저장
      await query(
        `UPDATE leave_requests SET google_calendar_event_id = $1 WHERE id = $2`,
        [eventId, leave.id]
      );
    } catch (calendarError) {
      console.error('Google Calendar error:', calendarError);
      // 캘린더 오류는 무시하고 계속 진행
    }

    // TODO: Slack 알림 추가

    return Response.json({ success: true, leave });
  } catch (error) {
    console.error('Create leave error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
