import { query } from '@/lib/db';

// 입사일 기반 연차 자동 계산 및 지급
// 매일 자동 실행 - 입사일 기준으로 월차/연차 지급
export async function GET(req) {
  try {
    // Cron 인증 (보안을 위해 secret key 확인)
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'your-secret-key';

    if (authHeader !== `Bearer ${cronSecret}`) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const currentDate = new Date();
    const currentDay = currentDate.getDate(); // 오늘 일자
    const currentMonth = currentDate.toISOString().slice(0, 7); // YYYY-MM

    // 통계 변수 초기화
    const stats = {
      processed: 0,
      granted: 0,
      monthlyGrantsCount: 0,
      annualRecalcCount: 0,
      skippedNoJoinDate: 0,
      skippedNotAnniversary: 0,
      errors: []
    };

    // 오늘이 입사 기념일인 사용자 조회 (입사일의 day가 오늘과 같은 사람)
    const usersResult = await query(
      `SELECT id, TO_CHAR(join_date, 'YYYY-MM-DD') as join_date
       FROM users
       WHERE EXTRACT(DAY FROM join_date) = $1`,
      [currentDay]
    );
    const users = usersResult.rows;

    // 각 사용자별 처리
    for (const user of users) {
      try {
        stats.processed++;

        // join_date 체크
        if (!user.join_date) {
          stats.skippedNoJoinDate++;
          continue;
        }

        const joinDate = new Date(user.join_date);
        const yearsOfService = calculateYearsOfService(user.join_date, currentDate);

        // 1년 미만: 월차 지급 (입사일 기준 매월)
        // 1년 이상: 연차 재계산 (입사일 기준 매년)
        if (yearsOfService < 1) {
          // 입사 당월은 제외 (입사일과 같은 달이면 스킵)
          if (joinDate.getFullYear() === currentDate.getFullYear() &&
              joinDate.getMonth() === currentDate.getMonth()) {
            stats.skippedNotAnniversary++;
            continue;
          }
          // 월차 지급 로직
          const wasGranted = await grantMonthlyLeave(user.id, currentMonth, stats);
          if (wasGranted) {
            stats.granted++;
          }
        } else {
          // 연차 재계산 로직 (기념일에만)
          const wasGranted = await recalculateAnnualLeave(
            user.id,
            joinDate,
            currentDate,
            yearsOfService,
            stats
          );
          if (wasGranted) {
            stats.granted++;
          }
        }
      } catch (error) {
        console.error(`Failed to process user ${user.id}:`, error);
        stats.errors.push({
          userId: user.id,
          error: error.message
        });
      }
    }

    // 성공 응답
    return Response.json({
      success: true,
      processed: stats.processed,
      granted: stats.granted,
      errors: stats.errors,
      details: {
        monthlyGrantsCount: stats.monthlyGrantsCount,
        annualRecalcCount: stats.annualRecalcCount,
        skippedNoJoinDate: stats.skippedNoJoinDate,
        skippedNotAnniversary: stats.skippedNotAnniversary
      }
    });
  } catch (error) {
    console.error('Annual leave grant error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// 근속 기간 계산 (년 단위)
function calculateYearsOfService(joinDate, currentDate) {
  const join = new Date(joinDate);
  const current = new Date(currentDate);

  const yearsDiff = current.getFullYear() - join.getFullYear();
  const monthsDiff = current.getMonth() - join.getMonth();
  const daysDiff = current.getDate() - join.getDate();

  // 기념일 월이면서 연도 차이가 있으면 해당 년차 적용
  // (매월 1일 실행이므로 기념일 월에는 기념일로 간주)
  if (monthsDiff === 0 && yearsDiff >= 1) {
    return yearsDiff;
  }

  // 기념일이 아직 안 지났으면 연차 -1
  if (monthsDiff < 0 || (monthsDiff === 0 && daysDiff < 0)) {
    return yearsDiff - 1;
  }

  return yearsDiff;
}

// 연차 개수 계산 (1년 이상자)
function calculateAnnualLeaves(yearsOfService) {
  // 1년차: 15일, 2년차: 15일, 3년차: 16일, 4년차: 16일, 5년차: 17일
  return 15 + Math.floor((yearsOfService - 1) / 2);
}

// 1년 미만자 월차 지급 (입사일 기준 매월)
async function grantMonthlyLeave(userId, currentMonth, stats) {
  // 중복 체크
  const checkResult = await query(
    `SELECT id FROM monthly_leave_grants
     WHERE user_id = $1 AND grant_month = $2`,
    [userId, currentMonth]
  );

  if (checkResult.rows.length > 0) {
    console.log(`User ${userId} already granted monthly leave for ${currentMonth}`);
    return false;
  }

  // leave_balance 업데이트 (없으면 생성)
  await query(
    `INSERT INTO leave_balance (user_id, total_leaves, used_leaves)
     VALUES ($1, 1, 0)
     ON CONFLICT (user_id)
     DO UPDATE SET
       total_leaves = leave_balance.total_leaves + 1,
       updated_at = CURRENT_TIMESTAMP`,
    [userId]
  );

  // 지급 이력 저장 (grant_type 포함)
  await query(
    `INSERT INTO monthly_leave_grants (user_id, grant_month, amount, grant_type)
     VALUES ($1, $2, 1, 'MONTHLY')`,
    [userId, currentMonth]
  );

  stats.monthlyGrantsCount++;
  console.log(`Granted 1 monthly leave to user ${userId} for ${currentMonth}`);
  return true;
}

// 1년 이상자 연차 재계산
async function recalculateAnnualLeave(userId, joinDate, currentDate, yearsOfService, stats) {
  // 기념일 월 체크
  if (joinDate.getMonth() !== currentDate.getMonth()) {
    stats.skippedNotAnniversary++;
    return false;
  }

  const currentMonth = currentDate.toISOString().slice(0, 7); // YYYY-MM

  // 중복 체크 (같은 달에 이미 연차 재계산했는지)
  const checkResult = await query(
    `SELECT id FROM monthly_leave_grants
     WHERE user_id = $1 AND grant_month = $2 AND grant_type = 'ANNUAL'`,
    [userId, currentMonth]
  );

  if (checkResult.rows.length > 0) {
    console.log(`User ${userId} already recalculated annual leave for ${currentMonth}`);
    stats.skippedNotAnniversary++;
    return false;
  }

  // 연차 계산
  const annualLeaves = calculateAnnualLeaves(yearsOfService);

  // leave_balance 업데이트 (없으면 생성)
  await query(
    `INSERT INTO leave_balance (user_id, total_leaves, used_leaves)
     VALUES ($1, $2, 0)
     ON CONFLICT (user_id)
     DO UPDATE SET
       total_leaves = $2,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, annualLeaves]
  );

  // 연차 재계산 이력 저장
  await query(
    `INSERT INTO monthly_leave_grants (user_id, grant_month, amount, grant_type, years_of_service)
     VALUES ($1, $2, $3, 'ANNUAL', $4)`,
    [userId, currentMonth, annualLeaves, yearsOfService]
  );

  stats.annualRecalcCount++;
  console.log(`Recalculated annual leave for user ${userId}: ${annualLeaves} days (${yearsOfService} years)`);

  return true;
}
