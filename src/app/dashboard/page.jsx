'use client';

import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import LeaveCalendar from '@/components/LeaveCalendar';
import LeaveRequestModal from '@/components/LeaveRequestModal';
import LeaveList from '@/components/LeaveList';

export default function DashboardPage() {
  const { data: session, status, update } = useSession();
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [status, router]);

  useEffect(() => {
    if (status === 'authenticated') {
      fetchLeaves();
    }
  }, [status]);

  const fetchLeaves = async () => {
    try {
      const res = await fetch('/api/leaves');
      const data = await res.json();
      setLeaves(data.leaves || []);
    } catch (error) {
      console.error('Failed to fetch leaves:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDateSelect = (date) => {
    setSelectedDate(date);
    setShowModal(true);
  };

  const handleLeaveCreated = () => {
    fetchLeaves();
    update(); // 세션 업데이트 (연차 잔액 갱신)
  };

  const handleLeaveCancel = async (leaveId) => {
    if (!confirm('연차를 취소하시겠습니까?')) return;

    try {
      const res = await fetch(`/api/leaves/${leaveId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('연차가 취소되었습니다.');
        fetchLeaves();
        update();
      } else {
        const data = await res.json();
        alert(data.error || '취소에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to cancel leave:', error);
      alert('취소 중 오류가 발생했습니다.');
    }
  };

  if (status === 'loading' || loading) {
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
                🏠 근태관리
              </h1>
              {session.user.isAdmin && (
                <button
                  onClick={() => router.push('/admin')}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"
                >
                  👨‍💼 관리자
                </button>
              )}
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">
                  나의 연차: <span className="font-bold text-blue-600 text-lg">{session.user.remainingLeaves}개</span> 남음
                </p>
                <p className="text-xs text-gray-500">
                  (전체: {session.user.totalLeaves}개 / 사용: {session.user.usedLeaves}개)
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
                    onClick={() => signOut({ callbackUrl: '/login' })}
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
                <h2 className="text-xl font-bold text-gray-900">📅 연차 달력</h2>
                <button
                  onClick={() => setShowModal(true)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
                >
                  + 연차 신청
                </button>
              </div>
              <LeaveCalendar
                leaves={leaves}
                onSelectDate={handleDateSelect}
              />
            </div>
          </div>

          {/* 연차 내역 */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">
                📋 나의 연차 내역
              </h2>
              <LeaveList
                leaves={leaves}
                onCancel={handleLeaveCancel}
              />
            </div>
          </div>
        </div>
      </main>

      {/* 연차 신청 모달 */}
      {showModal && (
        <LeaveRequestModal
          selectedDate={selectedDate}
          onClose={() => {
            setShowModal(false);
            setSelectedDate(null);
          }}
          onSuccess={handleLeaveCreated}
        />
      )}
    </div>
  );
}
