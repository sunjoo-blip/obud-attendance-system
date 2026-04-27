import { query } from "@/lib/db";

// 입사일 기반 연차 자동 계산 및 지급
// 매일 자동 실행 - 입사일 기준으로 월차/연차 지급
export async function GET(req) {
  try {
    const currentDate = new Date();
    const currentDay = currentDate.getDate();
    const currentMonth = currentDate.toISOString().slice(0, 7); // YYYY-MM

    const stats = {
      processed: 0,
      granted: 0,
      monthlyGrantsCount: 0,
      annualRecalcCount: 0,
      settlementsCount: 0,
      skippedNoJoinDate: 0,
      skippedNotAnniversary: 0,
      errors: [],
    };

    const usersResult = await query(
      `SELECT id, TO_CHAR(join_date, 'YYYY-MM-DD') as join_date
       FROM users
       WHERE EXTRACT(DAY FROM join_date) = $1`,
      [currentDay],
    );
    const users = usersResult.rows;

    for (const user of users) {
      try {
        stats.processed++;

        if (!user.join_date) {
          stats.skippedNoJoinDate++;
          continue;
        }

        const joinDate = new Date(user.join_date);
        const yearsOfService = calculateYearsOfService(
          user.join_date,
          currentDate,
        );

        if (yearsOfService < 1) {
          // 입사 당월 제외
          if (
            joinDate.getFullYear() === currentDate.getFullYear() &&
            joinDate.getMonth() === currentDate.getMonth()
          ) {
            stats.skippedNotAnniversary++;
            continue;
          }
          const wasGranted = await grantMonthlyLeave(
            user.id,
            currentMonth,
            stats,
          );
          if (wasGranted) {
            stats.granted++;
          }
        } else {
          // 연차 기념일: 미사용 연차 정산 후 새 연차 지급
          const wasGranted = await settleAndGrantAnnualLeave(
            user.id,
            joinDate,
            currentDate,
            yearsOfService,
            stats,
          );
          if (wasGranted) {
            stats.granted++;
          }
        }
      } catch (error) {
        console.error(`Failed to process user ${user.id}:`, error);
        stats.errors.push({ userId: user.id, error: error.message });
      }
    }

    return Response.json({
      success: true,
      processed: stats.processed,
      granted: stats.granted,
      errors: stats.errors,
      details: {
        monthlyGrantsCount: stats.monthlyGrantsCount,
        annualRecalcCount: stats.annualRecalcCount,
        settlementsCount: stats.settlementsCount,
        skippedNoJoinDate: stats.skippedNoJoinDate,
        skippedNotAnniversary: stats.skippedNotAnniversary,
      },
    });
  } catch (error) {
    console.error("Annual leave grant error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 근속 기간 계산 (년 단위)
function calculateYearsOfService(joinDate, currentDate) {
  const join = new Date(joinDate);
  const current = new Date(currentDate);

  const yearsDiff = current.getFullYear() - join.getFullYear();
  const monthsDiff = current.getMonth() - join.getMonth();
  const daysDiff = current.getDate() - join.getDate();

  if (monthsDiff === 0 && yearsDiff >= 1) {
    return yearsDiff;
  }

  if (monthsDiff < 0 || (monthsDiff === 0 && daysDiff < 0)) {
    return yearsDiff - 1;
  }

  return yearsDiff;
}

// 연차 개수 계산 (1년 이상자)
// 1년차: 15일, 2년차: 15일, 3년차: 16일 (2년마다 1일 추가)
function calculateAnnualLeaves(yearsOfService) {
  return 15 + Math.floor((yearsOfService - 1) / 2);
}

// 1년 미만자 월차 지급
async function grantMonthlyLeave(userId, currentMonth, stats) {
  const checkResult = await query(
    `SELECT id FROM monthly_leave_grants
     WHERE user_id = $1 AND grant_month = $2`,
    [userId, currentMonth],
  );

  if (checkResult.rows.length > 0) {
    return false;
  }

  await query(
    `INSERT INTO leave_balance (user_id, total_leaves, used_leaves)
     VALUES ($1, 1, 0)
     ON CONFLICT (user_id)
     DO UPDATE SET
       total_leaves = leave_balance.total_leaves + 1,
       updated_at = CURRENT_TIMESTAMP`,
    [userId],
  );

  await query(
    `INSERT INTO monthly_leave_grants (user_id, grant_month, amount, grant_type)
     VALUES ($1, $2, 1, 'MONTHLY')`,
    [userId, currentMonth],
  );

  stats.monthlyGrantsCount++;
  return true;
}

// 연차 기념일 처리:
// 1) 이전 기간 미사용 연차 정산 기록
// 2) leave_balance를 새 연차 개수로 리셋
async function settleAndGrantAnnualLeave(
  userId,
  joinDate,
  currentDate,
  yearsOfService,
  stats,
) {
  if (joinDate.getMonth() !== currentDate.getMonth()) {
    stats.skippedNotAnniversary++;
    return false;
  }

  const currentMonth = currentDate.toISOString().slice(0, 7);
  const settlementDate = currentDate.toISOString().slice(0, 10);

  // 중복 처리 방지
  const checkResult = await query(
    `SELECT id FROM monthly_leave_grants
     WHERE user_id = $1 AND grant_month = $2 AND grant_type = 'ANNUAL'`,
    [userId, currentMonth],
  );

  if (checkResult.rows.length > 0) {
    stats.skippedNotAnniversary++;
    return false;
  }

  // 현재 잔여 연차 조회 (정산 대상)
  const balanceResult = await query(
    `SELECT COALESCE(total_leaves, 0) as total_leaves,
            COALESCE(used_leaves, 0) as used_leaves
     FROM leave_balance WHERE user_id = $1`,
    [userId],
  );

  const prevBalance = balanceResult.rows[0] || {
    total_leaves: 0,
    used_leaves: 0,
  };
  const prevTotal = parseFloat(prevBalance.total_leaves);
  const prevUsed = parseFloat(prevBalance.used_leaves);
  const unusedLeaves = Math.max(0, prevTotal - prevUsed);

  // 미사용 연차 정산 이력 저장 (일당은 별도 입력 전까지 null)
  if (unusedLeaves > 0) {
    await query(
      `INSERT INTO leave_settlements
         (user_id, settlement_date, years_of_service, total_leaves, used_leaves, unused_leaves)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT DO NOTHING`,
      [
        userId,
        settlementDate,
        yearsOfService - 1,
        prevTotal,
        prevUsed,
        unusedLeaves,
      ],
    );
    stats.settlementsCount++;
  }

  // 새 연차 개수로 leave_balance 리셋
  const newAnnualLeaves = calculateAnnualLeaves(yearsOfService);

  await query(
    `INSERT INTO leave_balance (user_id, total_leaves, used_leaves)
     VALUES ($1, $2, 0)
     ON CONFLICT (user_id)
     DO UPDATE SET
       total_leaves = $2,
       used_leaves = 0,
       updated_at = CURRENT_TIMESTAMP`,
    [userId, newAnnualLeaves],
  );

  // 연차 지급 이력 저장
  await query(
    `INSERT INTO monthly_leave_grants (user_id, grant_month, amount, grant_type, years_of_service)
     VALUES ($1, $2, $3, 'ANNUAL', $4)`,
    [userId, currentMonth, newAnnualLeaves, yearsOfService],
  );

  stats.annualRecalcCount++;
  console.log(
    `User ${userId}: settled ${unusedLeaves} unused leaves, granted ${newAnnualLeaves} new annual leaves (year ${yearsOfService})`,
  );

  return true;
}
