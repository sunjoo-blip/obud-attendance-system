"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";

function calcTenure(joinDate) {
  if (!joinDate) return null;
  const join = new Date(joinDate);
  const now = new Date();
  let years = now.getFullYear() - join.getFullYear();
  let months = now.getMonth() - join.getMonth();
  if (now.getDate() < join.getDate()) months--;
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years < 0) return "1개월 미만";
  if (years === 0) return `${months}개월`;
  return months === 0 ? `${years}년` : `${years}년 ${months}개월`;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [leaveView, setLeaveView] = useState("table"); // "table" | "calendar"
  const [filterUser, setFilterUser] = useState(""); // user id or ""
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1); // 1-12
  const [openMenuId, setOpenMenuId] = useState(null);
  const [openMenuPos, setOpenMenuPos] = useState({ top: 0, right: 0 });
  const [settlementModal, setSettlementModal] = useState(null); // { user, settlements }
  const [settlementLoading, setSettlementLoading] = useState(false);
  const menuRef = useRef(null);
  const itemsPerPage = 10;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    } else if (status === "authenticated" && !session?.user?.isAdmin) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  useEffect(() => {
    if (status === "authenticated" && session?.user?.isAdmin) {
      fetchData();
    }
  }, [status, session]);

  const fetchData = async () => {
    try {
      const [usersRes, leavesRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/leaves"),
      ]);

      const usersData = await usersRes.json();
      const leavesData = await leavesRes.json();

      setUsers(usersData.users || []);
      setAllLeaves(leavesData.leaves || []);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateJoinDate = async (userId, currentJoinDate) => {
    const newDate = prompt(
      "입사일을 입력하세요 (YYYY-MM-DD):",
      currentJoinDate || "",
    );
    if (newDate === null) return;

    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, joinDate: newDate || null }),
      });

      if (res.ok) {
        alert("입사일이 업데이트되었습니다.");
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "입사일 업데이트에 실패했습니다.");
      }
    } catch (error) {
      console.error("Update join date error:", error);
      alert("입사일 업데이트 중 오류가 발생했습니다.");
    }
  };

  const handleGrantLeave = async (userId) => {
    const amount = prompt("지급할 연차 개수를 입력하세요:", "1");
    if (!amount) return;

    try {
      const res = await fetch("/api/admin/grant-leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, amount: parseFloat(amount) }),
      });

      if (res.ok) {
        alert("연차가 지급되었습니다.");
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "연차 지급에 실패했습니다.");
      }
    } catch (error) {
      console.error("Grant leave error:", error);
      alert("연차 지급 중 오류가 발생했습니다.");
    }
  };

  const handleShowSettlements = async (user) => {
    setSettlementLoading(true);
    setSettlementModal({ user, settlements: [] });
    try {
      const res = await fetch(`/api/admin/settlements?userId=${user.id}`);
      const data = await res.json();
      setSettlementModal({ user, settlements: data.settlements || [] });
    } catch (error) {
      console.error("Get settlements error:", error);
    } finally {
      setSettlementLoading(false);
    }
  };

  const handleDeleteLeave = async (leaveId) => {
    if (!confirm("이 연차를 삭제하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/admin/leaves/${leaveId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("연차가 삭제되었습니다.");
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "삭제에 실패했습니다.");
      }
    } catch (error) {
      console.error("Delete leave error:", error);
      alert("삭제 중 오류가 발생했습니다.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-gray-600 hover:text-gray-900"
              >
                ← 돌아가기
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                Admin Dashboard
              </h1>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 전체 현황 */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">📊 전체 현황</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">사용자</th>
                  <th className="text-center py-3 px-4">이메일</th>
                  <th className="text-center py-3 px-4">재직기간</th>
                  <th className="text-center py-3 px-4">전체 연차</th>
                  <th className="text-center py-3 px-4">사용 연차</th>
                  <th className="text-center py-3 px-4">남은 연차</th>
                  <th className="text-center py-3 px-4">생일 연차</th>
                  <th className="text-center py-3 px-4">작업</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        {user.profile_image && (
                          <Image
                            src={user.profile_image}
                            alt={user.name}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        )}
                        <span className="font-medium">{user.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-4 text-sm text-gray-600">
                      {user.email}
                    </td>
                    <td className="text-center py-3 px-4">
                      <div className="text-sm">
                        <div className="font-medium text-gray-800">
                          {calcTenure(user.join_date) ?? (
                            <span className="text-gray-400">미설정</span>
                          )}
                        </div>
                        {user.join_date && (
                          <div className="text-xs text-gray-400 mt-0.5">
                            {user.join_date}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="font-bold text-blue-600">
                        {user.total_leaves || 0}개
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="text-gray-600">
                        {user.used_leaves || 0}개
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="font-bold text-green-600">
                        {user.remaining_leaves || 0}개
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <span className="font-bold text-pink-500">
                        {user.birthday_leaves || 0}개
                      </span>
                    </td>
                    <td className="text-center py-3 px-4">
                      <button
                        ref={openMenuId === user.id ? menuRef : null}
                        onClick={(e) => {
                          if (openMenuId === user.id) {
                            setOpenMenuId(null);
                            return;
                          }
                          const rect = e.currentTarget.getBoundingClientRect();
                          setOpenMenuPos({
                            top: rect.bottom + 4,
                            right: window.innerWidth - rect.right,
                          });
                          setOpenMenuId(user.id);
                        }}
                        className="px-3 py-1 border border-gray-300 rounded hover:bg-gray-50 text-sm text-gray-700 flex items-center gap-1 mx-auto"
                      >
                        작업
                        <span className="text-xs">▾</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* 전체 연차 내역 */}
        <div className="bg-white rounded-lg shadow p-6">
          {/* 헤더 행: 제목 + 필터 + 뷰 토글 */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <h2 className="text-xl font-bold text-gray-900 mr-auto">
              📋 전체 연차 내역
            </h2>

            {/* 직원 필터 */}
            <select
              value={filterUser}
              onChange={(e) => {
                setFilterUser(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700"
            >
              <option value="">전체 직원</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>

            {/* 연도 */}
            <select
              value={filterYear}
              onChange={(e) => {
                setFilterYear(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700"
            >
              {Array.from(
                { length: 5 },
                (_, i) => new Date().getFullYear() - i,
              ).map((y) => (
                <option key={y} value={y}>
                  {y}년
                </option>
              ))}
            </select>

            {/* 월 */}
            {leaveView === "calendar" ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (filterMonth === 1) {
                      setFilterYear((y) => y - 1);
                      setFilterMonth(12);
                    } else {
                      setFilterMonth((m) => m - 1);
                    }
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
                >
                  ‹
                </button>
                <span className="px-2 text-sm text-gray-700 min-w-[3rem] text-center">
                  {filterMonth}월
                </span>
                <button
                  onClick={() => {
                    if (filterMonth === 12) {
                      setFilterYear((y) => y + 1);
                      setFilterMonth(1);
                    } else {
                      setFilterMonth((m) => m + 1);
                    }
                    setCurrentPage(1);
                  }}
                  className="px-2 py-1.5 border border-gray-300 rounded text-sm text-gray-700 hover:bg-gray-50"
                >
                  ›
                </button>
              </div>
            ) : (
              <select
                value={filterMonth}
                onChange={(e) => {
                  setFilterMonth(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700"
              >
                <option value={0}>전체</option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    {m}월
                  </option>
                ))}
              </select>
            )}

            {/* 뷰 토글 */}
            <div className="flex border border-gray-300 rounded overflow-hidden text-sm">
              <button
                onClick={() => setLeaveView("table")}
                className={`px-3 py-1.5 ${leaveView === "table" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                표
              </button>
              <button
                onClick={() => {
                  if (filterMonth === 0)
                    setFilterMonth(new Date().getMonth() + 1);
                  setLeaveView("calendar");
                }}
                className={`px-3 py-1.5 border-l border-gray-300 ${leaveView === "calendar" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-50"}`}
              >
                달력
              </button>
            </div>
          </div>

          {(() => {
            // 필터 적용
            const filtered = allLeaves.filter((l) => {
              if (filterUser && String(l.user_id) !== String(filterUser))
                return false;
              const d = new Date(l.start_date);
              if (d.getFullYear() !== filterYear) return false;
              if (filterMonth !== 0 && d.getMonth() + 1 !== filterMonth)
                return false;
              return true;
            });

            const leaveTypeLabel = (leave) => {
              if (leave.leave_type === "FULL") return "연차";
              if (leave.leave_type === "AM_HALF") return "오전 반차";
              if (leave.leave_type === "PM_HALF") return "오후 반차";
              return `반반차 ${leave.start_time?.slice(0, 5)}~${leave.end_time?.slice(0, 5)}`;
            };
            const leaveTypeBadge = (leave) => {
              if (leave.leave_type === "FULL") return "bg-red-100 text-red-800";
              if (leave.leave_type === "AM_HALF")
                return "bg-yellow-100 text-yellow-800";
              if (leave.leave_type === "PM_HALF")
                return "bg-green-100 text-green-800";
              return "bg-purple-100 text-purple-800";
            };

            if (leaveView === "calendar") {
              const calMonth = filterMonth;
              const firstDay = new Date(filterYear, calMonth - 1, 1).getDay(); // 0=일
              const daysInMonth = new Date(filterYear, calMonth, 0).getDate();

              // 날짜별 연차 맵
              const dayMap = {};
              filtered
                .filter((l) => l.status === "APPROVED")
                .forEach((l) => {
                  const start = new Date(l.start_date);
                  const end = new Date(l.end_date);
                  for (
                    let d = new Date(start);
                    d <= end;
                    d.setDate(d.getDate() + 1)
                  ) {
                    if (
                      d.getFullYear() === filterYear &&
                      d.getMonth() + 1 === calMonth
                    ) {
                      const key = d.getDate();
                      if (!dayMap[key]) dayMap[key] = [];
                      dayMap[key].push(l);
                    }
                  }
                });

              const cells = [];
              for (let i = 0; i < firstDay; i++) cells.push(null);
              for (let d = 1; d <= daysInMonth; d++) cells.push(d);
              const weeks = [];
              for (let i = 0; i < cells.length; i += 7)
                weeks.push(cells.slice(i, i + 7));

              return (
                <div>
                  <div className="grid grid-cols-7 mb-1">
                    {["일", "월", "화", "수", "목", "금", "토"].map((d) => (
                      <div
                        key={d}
                        className="text-center text-xs font-medium text-gray-500 py-1"
                      >
                        {d}
                      </div>
                    ))}
                  </div>
                  {weeks.map((week, wi) => (
                    <div key={wi} className="grid grid-cols-7 border-t">
                      {week.map((day, di) => {
                        const leaves = day ? dayMap[day] || [] : [];
                        const isToday =
                          day &&
                          new Date().getFullYear() === filterYear &&
                          new Date().getMonth() + 1 === calMonth &&
                          new Date().getDate() === day;
                        return (
                          <div
                            key={di}
                            className={`min-h-[80px] border-r last:border-r-0 p-1 ${!day ? "bg-gray-50" : ""}`}
                          >
                            {day && (
                              <>
                                <div
                                  className={`text-xs font-medium mb-1 w-5 h-5 flex items-center justify-center rounded-full ${isToday ? "bg-gray-900 text-white" : di === 0 ? "text-red-500" : di === 6 ? "text-blue-500" : "text-gray-700"}`}
                                >
                                  {day}
                                </div>
                                <div className="flex flex-col gap-0.5">
                                  {leaves.map((l) => {
                                    if (l.leave_type === "FULL") {
                                      return (
                                        <div
                                          key={l.id}
                                          className="text-xs px-1.5 py-0.5 rounded bg-red-300 text-white truncate"
                                          title={`${l.user_name} · 연차`}
                                        >
                                          {l.user_name} - 휴가
                                        </div>
                                      );
                                    }
                                    const isQuarter = l.leave_type === "QUARTER_DAY";
                                    const typeLabel =
                                      l.leave_type === "AM_HALF"
                                        ? "오전 반차"
                                        : l.leave_type === "PM_HALF"
                                          ? "오후 반차"
                                          : "반반차";
                                    const timeRange = isQuarter
                                      ? `${l.start_time?.slice(0, 5)}-${l.end_time?.slice(0, 5)}`
                                      : null;
                                    const dotColor =
                                      l.leave_type === "AM_HALF"
                                        ? "text-yellow-500"
                                        : l.leave_type === "PM_HALF"
                                          ? "text-green-500"
                                          : "text-purple-500";
                                    const fullTitle = `${l.user_name} · ${typeLabel}${timeRange ? ` (${timeRange})` : ""}`;
                                    return (
                                      <div
                                        key={l.id}
                                        className="text-xs flex items-center gap-0.5 truncate"
                                        title={fullTitle}
                                      >
                                        <span
                                          className={`${dotColor} flex-shrink-0`}
                                        >
                                          ●
                                        </span>
                                        <span className="text-gray-600 truncate">
                                          {l.user_name} - {typeLabel}
                                          {timeRange && (
                                            <span className="text-gray-400"> {timeRange}</span>
                                          )}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  {filtered.length === 0 && (
                    <p className="text-center text-gray-400 text-sm py-6">
                      해당 기간에 연차 내역이 없습니다.
                    </p>
                  )}
                </div>
              );
            }

            // 표 뷰
            const sorted = [...filtered].sort(
              (a, b) => new Date(b.start_date) - new Date(a.start_date),
            );
            const totalPages = Math.ceil(sorted.length / itemsPerPage);
            const paginated = sorted.slice(
              (currentPage - 1) * itemsPerPage,
              currentPage * itemsPerPage,
            );

            return (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">날짜</th>
                        <th className="text-left py-3 px-4">사용자</th>
                        <th className="text-center py-3 px-4">종류</th>
                        <th className="text-center py-3 px-4">상태</th>
                        <th className="text-center py-3 px-4">작업</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginated.length === 0 ? (
                        <tr>
                          <td
                            colSpan={5}
                            className="text-center py-8 text-gray-400"
                          >
                            해당 조건의 연차 내역이 없습니다.
                          </td>
                        </tr>
                      ) : (
                        paginated.map((leave) => {
                          const dateDisplay =
                            leave.start_date === leave.end_date
                              ? leave.start_date
                              : `${leave.start_date} ~ ${leave.end_date}`;
                          return (
                            <tr
                              key={leave.id}
                              className="border-b hover:bg-gray-50"
                            >
                              <td className="py-3 px-4">{dateDisplay}</td>
                              <td className="py-3 px-4">{leave.user_name}</td>
                              <td className="text-center py-3 px-4">
                                <span
                                  className={`px-2 py-1 text-xs rounded ${leaveTypeBadge(leave)}`}
                                >
                                  {leaveTypeLabel(leave)}
                                </span>
                              </td>
                              <td className="text-center py-3 px-4">
                                {leave.status === "APPROVED" ? (
                                  <span className="text-green-600">승인</span>
                                ) : (
                                  <span className="text-gray-500">취소</span>
                                )}
                              </td>
                              <td className="text-center py-3 px-4">
                                {leave.status === "APPROVED" && (
                                  <button
                                    onClick={() => handleDeleteLeave(leave.id)}
                                    className="px-3 py-1 text-red-600 hover:bg-red-50 rounded text-sm"
                                  >
                                    삭제
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-4">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      이전
                    </button>
                    <span className="text-sm text-gray-600">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setCurrentPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={currentPage === totalPages}
                      className="px-3 py-1 border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                    >
                      다음
                    </button>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </main>

      {/* 작업 드롭다운 (fixed) */}
      {openMenuId &&
        (() => {
          const user = users.find((u) => u.id === openMenuId);
          if (!user) return null;
          const hasSettlement =
            user.join_date &&
            (() => {
              const join = new Date(user.join_date);
              const now = new Date();
              const years =
                now.getFullYear() -
                join.getFullYear() -
                (now.getMonth() < join.getMonth() ||
                (now.getMonth() === join.getMonth() &&
                  now.getDate() < join.getDate())
                  ? 1
                  : 0);
              return years >= 1;
            })();
          return (
            <div
              ref={menuRef}
              style={{ top: openMenuPos.top, right: openMenuPos.right }}
              className="fixed w-40 bg-white border border-gray-200 rounded shadow-lg z-50"
            >
              <button
                onClick={() => {
                  setOpenMenuId(null);
                  handleUpdateJoinDate(user.id, user.join_date);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                입사일 설정
              </button>
              <button
                onClick={() => {
                  setOpenMenuId(null);
                  handleGrantLeave(user.id);
                }}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                연차 지급
              </button>
              {hasSettlement && (
                <button
                  onClick={() => {
                    setOpenMenuId(null);
                    handleShowSettlements(user);
                  }}
                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 border-t border-gray-100"
                >
                  정산 내역
                </button>
              )}
            </div>
          );
        })()}

      {/* 정산 내역 모달 */}
      {settlementModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setSettlementModal(null)}
        >
          <div
            className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h3 className="text-lg font-bold text-gray-900">
                {settlementModal.user.name} 정산 내역
              </h3>
              <button
                onClick={() => setSettlementModal(null)}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ✕
              </button>
            </div>
            <div className="p-6">
              {settlementLoading ? (
                <div className="text-center py-8 text-gray-500">
                  불러오는 중...
                </div>
              ) : settlementModal.settlements.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  정산 내역이 없습니다.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-gray-500">
                      <th className="text-left py-2 px-3">정산일</th>
                      <th className="text-center py-2 px-3">근속연수</th>
                      <th className="text-center py-2 px-3">지급 연차</th>
                      <th className="text-center py-2 px-3">사용 연차</th>
                      <th className="text-center py-2 px-3">미사용</th>
                      <th className="text-center py-2 px-3">정산 금액</th>
                    </tr>
                  </thead>
                  <tbody>
                    {settlementModal.settlements.map((s) => (
                      <tr key={s.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-3 text-gray-700">
                          {s.settlement_date}
                        </td>
                        <td className="text-center py-2 px-3">
                          {s.years_of_service}년차
                        </td>
                        <td className="text-center py-2 px-3 font-medium text-blue-600">
                          {s.total_leaves}개
                        </td>
                        <td className="text-center py-2 px-3 text-gray-600">
                          {s.used_leaves}개
                        </td>
                        <td className="text-center py-2 px-3">
                          <span
                            className={
                              s.unused_leaves > 0
                                ? "font-medium text-orange-600"
                                : "text-gray-400"
                            }
                          >
                            {s.unused_leaves}개
                          </span>
                        </td>
                        <td className="text-center py-2 px-3">
                          {s.settlement_amount != null ? (
                            `${Number(s.settlement_amount).toLocaleString()}원`
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
