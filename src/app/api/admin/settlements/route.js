import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { query } from "@/lib/db";

// 미사용 연차 정산 내역 조회
export async function GET(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const params = [];
    let whereClause = "";
    if (userId) {
      params.push(userId);
      whereClause = "WHERE s.user_id = $1";
    }

    const result = await query(
      `SELECT
         s.id,
         s.user_id,
         u.name as user_name,
         u.email as user_email,
         TO_CHAR(s.settlement_date, 'YYYY-MM-DD') as settlement_date,
         s.years_of_service,
         s.total_leaves,
         s.used_leaves,
         s.unused_leaves,
         s.daily_wage,
         s.settlement_amount,
         s.note,
         s.created_at
       FROM leave_settlements s
       JOIN users u ON s.user_id = u.id
       ${whereClause}
       ORDER BY s.settlement_date DESC, u.name`,
      params,
    );

    return Response.json({ settlements: result.rows });
  } catch (error) {
    console.error("Get settlements error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

// 정산 금액 업데이트 (일당 입력 시 자동 계산)
export async function PATCH(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    const { id, daily_wage, note } = await req.json();

    if (!id) {
      return Response.json(
        { error: "Settlement ID is required" },
        { status: 400 },
      );
    }

    // 정산 레코드 조회
    const settlementResult = await query(
      "SELECT unused_leaves FROM leave_settlements WHERE id = $1",
      [id],
    );

    if (settlementResult.rows.length === 0) {
      return Response.json({ error: "Settlement not found" }, { status: 404 });
    }

    const unusedLeaves = parseFloat(settlementResult.rows[0].unused_leaves);
    const settlementAmount = daily_wage ? daily_wage * unusedLeaves : null;

    await query(
      `UPDATE leave_settlements
       SET daily_wage = $1, settlement_amount = $2, note = $3
       WHERE id = $4`,
      [daily_wage || null, settlementAmount, note || null, id],
    );

    return Response.json({
      message: "Settlement updated",
      settlement_amount: settlementAmount,
    });
  } catch (error) {
    console.error("Update settlement error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
