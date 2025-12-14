import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { query } from '@/lib/db';
import { addGoogleCalendarEvent } from '@/lib/googleCalendar';
import { LEAVE_TYPE_CONFIG, calculateLeaveAmount } from '@/lib/leaveCalculator';

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

    const { startDate, endDate, leaveType, startTime, endTime } = await req.json();

    if (!startDate || !endDate || !leaveType) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!Object.keys(LEAVE_TYPE_CONFIG).includes(leaveType)) {
      return Response.json({ error: 'Invalid leave type' }, { status: 400 });
    }

    // 날짜 검증
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return Response.json({ error: '시작일은 종료일보다 이전이어야 합니다.' }, { status: 400 });
    }

    // 날짜 범위 계산
    const daysDiff = Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1;

    // 반반차 검증
    if (leaveType === 'QUARTER_DAY') {
      if (!startTime || !endTime) {
        return Response.json({ error: '반반차는 시간을 선택해야 합니다.' }, { status: 400 });
      }
      if (daysDiff > 1) {
        return Response.json({ error: '반반차는 하루만 선택 가능합니다.' }, { status: 400 });
      }
    }

    // 반차 검증
    if ((leaveType === 'AM_HALF' || leaveType === 'PM_HALF') && daysDiff > 1) {
      return Response.json({ error: '반차는 하루만 선택 가능합니다.' }, { status: 400 });
    }

    // 연차 사용량 계산
    const leaveAmount = calculateLeaveAmount(leaveType, start, end);

    // 연차 잔액 확인
    const balanceResult = await query(
      `SELECT total_leaves, used_leaves FROM leave_balance WHERE user_id = $1`,
      [session.user.id]
    );

    if (balanceResult.rows.length === 0) {
      return Response.json({ error: 'Leave balance not found' }, { status: 404 });
    }

    // 연차 당겨쓰기 가능하므로 잔액 체크 제거

    // 중복 신청 확인 (날짜 범위가 겹치는지 확인)
    const duplicateCheck = await query(
      `SELECT id, leave_type, start_time, end_time
       FROM leave_requests
       WHERE user_id = $1
       AND status = 'APPROVED'
       AND (
         (start_date <= $2 AND end_date >= $2) OR
         (start_date <= $3 AND end_date >= $3) OR
         (start_date >= $2 AND end_date <= $3)
       )`,
      [session.user.id, startDate, endDate]
    );

    // 같은 날짜에 이미 신청 있는 경우
    if (duplicateCheck.rows.length > 0) {
      for (const existing of duplicateCheck.rows) {
        // FULL 타입이 있으면 무조건 겹침
        if (existing.leave_type === 'FULL' || leaveType === 'FULL') {
          return Response.json({ error: '이미 신청한 날짜와 겹칩니다.' }, { status: 400 });
        }

        // 반차 + 반차 겹침 체크
        if (existing.leave_type === 'AM_HALF' && leaveType === 'AM_HALF') {
          return Response.json({ error: '이미 오전 반차를 신청했습니다.' }, { status: 400 });
        }
        if (existing.leave_type === 'PM_HALF' && leaveType === 'PM_HALF') {
          return Response.json({ error: '이미 오후 반차를 신청했습니다.' }, { status: 400 });
        }

        // 반반차 중복 방지 (하루에 하나만)
        if (existing.leave_type === 'QUARTER_DAY' && leaveType === 'QUARTER_DAY') {
          return Response.json({ error: '하루에 반반차는 하나만 신청 가능합니다.' }, { status: 400 });
        }
      }
    }

    // 연차 신청 생성
    const leaveResult = await query(
      `INSERT INTO leave_requests (user_id, start_date, end_date, leave_type, start_time, end_time, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'APPROVED')
       RETURNING *`,
      [session.user.id, startDate, endDate, leaveType, startTime || null, endTime || null]
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
        startTime,
        endTime,
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
