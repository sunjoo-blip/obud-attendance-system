"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Image from "next/image";
import LeaveCalendar from "@/components/LeaveCalendar";
import LeaveRequestModal from "@/components/LeaveRequestModal";
import LeaveList from "@/components/LeaveList";

export default function DashboardPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchLeaves();
    }
  }, [status]);

  const fetchLeaves = async () => {
    try {
      const res = await fetch("/api/leaves");
      const data = await res.json();
      setLeaves(data.leaves || []);
    } catch (error) {
      console.error("Failed to fetch leaves:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date) => {
    // 로컬 타임존 기준으로 날짜 정규화 (시간 제거)
    const normalizedDate = new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate()
    );
    setSelectedDate(normalizedDate);
    setShowModal(true);
  };

  const handleLeaveCreated = () => {
    fetchLeaves();
    update(); // 세션 업데이트 (연차 잔액 갱신)
  };

  const handleLeaveCancel = async (leaveId) => {
    if (!confirm("연차를 취소하시겠습니까?")) return;

    try {
      const res = await fetch(`/api/leaves/${leaveId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        alert("연차가 취소되었습니다.");
        fetchLeaves();
        update();
      } else {
        const data = await res.json();
        alert(data.error || "취소에 실패했습니다.");
      }
    } catch (error) {
      console.error("Failed to cancel leave:", error);
      alert("취소 중 오류가 발생했습니다.");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">로딩 중...</div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">
                🏠 Obud 근태관리
              </h1>
              {session.user.isAdmin && (
                <button
                  onClick={() => router.push("/admin")}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  Admin
                </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  나의 연차:{" "}
                  <span className="font-bold text-blue-600 text-lg">
                    {session.user.remainingLeaves}개
                  </span>{" "}
                  남음
                </p>
                <p className="text-xs text-gray-500">
                  (전체: {session.user.totalLeaves}개 / 사용:{" "}
                  {session.user.usedLeaves}개)
                </p>
              </div>
              <div className="flex items-center gap-3">
                {session.user.image && (
                  <Image
                    src={session.user.image}
                    alt={session.user.name}
                    width={40}
                    height={40}
                    className="rounded-full"
                  />
                )}
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">
                    {session.user.name}
                  </p>
                  <button
                    onClick={() => signOut({ callbackUrl: "/login" })}
                    className="text-xs text-gray-600 hover:text-gray-900"
                  >
                    로그아웃
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* 메인 컨텐츠 */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 달력 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">
                  📅 연차 달력
                </h2>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  + 연차 신청
                </button>
              </div>
              <LeaveCalendar leaves={leaves} onSelectDate={handleDateSelect} />

              {/* 연차 설명서 버튼 */}
              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowGuide(true)}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  오붓 연차 사용 설명서
                </button>
              </div>
            </div>
          </div>

          {/* 연차 내역 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                📋 나의 연차 내역
              </h2>
              <LeaveList leaves={leaves} onCancel={handleLeaveCancel} />
            </div>
          </div>
        </div>
      </main>

      {/* 연차 신청 모달 */}
      {showModal && (
        <LeaveRequestModal
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
          onClose={() => {
            setShowModal(false);
            setSelectedDate(null);
          }}
          onSuccess={handleLeaveCreated}
        />
      )}

      {/* 연차 설명서 모달 */}
      {showGuide && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6 relative">
            <button
              onClick={() => setShowGuide(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              X
            </button>
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              오붓 연차 시스템
            </h3>
            <ul className="space-y-3 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>
                  <strong>연차는 당겨 사용하는 것이 가능합니다.</strong>
                  <br />
                  <span className="text-gray-500">
                    (현재 연차 2개더라도 3개 사용 가능)
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>
                  <strong>입사 1년 미만:</strong> 입사일마다 연차 하나씩 생성
                  <br />
                  <span className="text-gray-500">
                    (ex. 3/15 입사자는 매달 15일 연차 1개 발생!)
                  </span>
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>
                  <strong>입사 1년 이상:</strong> 일괄 15개 연차 지급
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-500 mt-0.5">•</span>
                <span>
                  이후 <strong>2년마다 연차 1개 추가</strong>
                </span>
              </li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
