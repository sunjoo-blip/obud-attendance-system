'use client';

import { format, isBefore, startOfDay } from 'date-fns';
import { ko } from 'date-fns/locale';

const leaveTypeLabels = {
  FULL: '연차',
  AM_HALF: '오전 반차',
  PM_HALF: '오후 반차',
  QUARTER_DAY: '반반차',
};

const leaveTypeBadges = {
  FULL: 'bg-red-100 text-red-800',
  AM_HALF: 'bg-yellow-100 text-yellow-800',
  PM_HALF: 'bg-green-100 text-green-800',
  QUARTER_DAY: 'bg-cyan-100 text-cyan-800',
};

export default function LeaveList({ leaves, onCancel }) {
  const sortedLeaves = [...leaves].sort((a, b) => {
    return new Date(b.start_date) - new Date(a.start_date);
  });

  const canCancelLeave = (startDate) => {
    const today = startOfDay(new Date());
    // YYYY-MM-DD 형식을 로컬 타임존으로 파싱
    const [year, month, day] = startDate.split('-');
    const leave = startOfDay(new Date(year, month - 1, day));
    return leave >= today;
  };

  if (sortedLeaves.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p>신청한 연차가 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 max-h-[600px] overflow-y-auto">
      {sortedLeaves.map((leave) => {
        // YYYY-MM-DD 형식을 로컬 타임존으로 파싱
        const [startYear, startMonth, startDay] = leave.start_date.split('-');
        const startDate = new Date(startYear, startMonth - 1, startDay);

        const [endYear, endMonth, endDay] = leave.end_date.split('-');
        const endDate = new Date(endYear, endMonth - 1, endDay);

        const isPast = isBefore(startOfDay(endDate), startOfDay(new Date()));
        const canCancel = canCancelLeave(leave.start_date) && leave.status === 'APPROVED';

        // 날짜 범위 표시
        const dateDisplay = startDate.getTime() === endDate.getTime()
          ? format(startDate, 'M월 d일 (E)', { locale: ko })
          : `${format(startDate, 'M월 d일', { locale: ko })} ~ ${format(endDate, 'M월 d일 (E)', { locale: ko })}`;

        return (
          <div
            key={leave.id}
            className={`p-4 border rounded-lg ${
              leave.status === 'CANCELLED'
                ? 'bg-gray-50 border-gray-300'
                : 'bg-white border-gray-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-gray-900">
                    {dateDisplay}
                  </span>
                  <span
                    className={`px-2 py-1 text-xs font-medium rounded ${
                      leaveTypeBadges[leave.leave_type]
                    }`}
                  >
                    {leaveTypeLabels[leave.leave_type]}
                  </span>
                  {leave.leave_type === 'QUARTER_DAY' && leave.start_time && leave.end_time && (
                    <span className="text-xs text-gray-500">
                      {leave.start_time.substring(0, 5)} - {leave.end_time.substring(0, 5)}
                    </span>
                  )}
                </div>

                {leave.status === 'CANCELLED' && (
                  <p className="text-xs text-gray-500">취소됨</p>
                )}
                {isPast && leave.status === 'APPROVED' && (
                  <p className="text-xs text-gray-500">사용완료</p>
                )}
              </div>

              {canCancel && (
                <button
                  onClick={() => onCancel(leave.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  취소
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
