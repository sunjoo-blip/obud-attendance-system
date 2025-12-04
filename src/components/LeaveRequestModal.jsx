'use client';

import { useState } from 'react';
import { format } from 'date-fns';

export default function LeaveRequestModal({ selectedDate, onDateChange, onClose, onSuccess }) {
  const [leaveType, setLeaveType] = useState('FULL');
  const [loading, setLoading] = useState(false);
  const [internalDate, setInternalDate] = useState(selectedDate || new Date());

  const handleDateChange = (e) => {
    const newDate = new Date(e.target.value);
    setInternalDate(newDate);
    if (onDateChange) {
      onDateChange(newDate);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dateToSubmit = internalDate;
      // 타임존 이슈 방지를 위해 YYYY-MM-DD 형식으로 변환
      const formattedDate = format(dateToSubmit, 'yyyy-MM-dd');

      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          leaveDate: formattedDate,
          leaveType,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('연차가 신청되었습니다!');
        onSuccess();
        onClose();
      } else {
        alert(data.error || '연차 신청에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to create leave:', error);
      alert('연차 신청 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">연차 신청</h2>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              날짜
            </label>
            <input
              type="date"
              value={format(internalDate, 'yyyy-MM-dd')}
              onChange={handleDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              종류
            </label>
            <div className="space-y-2">
              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="leaveType"
                  value="FULL"
                  checked={leaveType === 'FULL'}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">연차 (종일)</div>
                  <div className="text-sm text-gray-500">09:00 - 18:00</div>
                </div>
              </label>

              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="leaveType"
                  value="AM_HALF"
                  checked={leaveType === 'AM_HALF'}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">오전 반차</div>
                  <div className="text-sm text-gray-500">09:00 - 13:30</div>
                </div>
              </label>

              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="leaveType"
                  value="PM_HALF"
                  checked={leaveType === 'PM_HALF'}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">오후 반차</div>
                  <div className="text-sm text-gray-500">13:30 - 18:00</div>
                </div>
              </label>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
              disabled={loading}
            >
              취소
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:bg-gray-400"
              disabled={loading}
            >
              {loading ? '신청 중...' : '신청하기'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
