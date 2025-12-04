"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [allLeaves, setAllLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(
    new Date().toISOString().slice(0, 7)
  );

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
                  <th className="text-center py-3 px-4">전체 연차</th>
                  <th className="text-center py-3 px-4">사용 연차</th>
                  <th className="text-center py-3 px-4">남은 연차</th>
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
                      <button
                        onClick={() => handleGrantLeave(user.id)}
                        className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                      >
                        연차 지급
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
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            📋 전체 연차 내역
          </h2>

          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mr-2">
              월 선택:
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg"
            />
          </div>

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
                {allLeaves
                  .filter((leave) => leave.leave_date.startsWith(selectedMonth))
                  .map((leave) => (
                    <tr key={leave.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">{leave.leave_date}</td>
                      <td className="py-3 px-4">{leave.user_name}</td>
                      <td className="text-center py-3 px-4">
                        <span
                          className={`px-2 py-1 text-xs rounded ${
                            leave.leave_type === "FULL"
                              ? "bg-red-100 text-red-800"
                              : leave.leave_type === "AM_HALF"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}
                        >
                          {leave.leave_type === "FULL"
                            ? "연차"
                            : leave.leave_type === "AM_HALF"
                            ? "오전 반차"
                            : "오후 반차"}
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
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
