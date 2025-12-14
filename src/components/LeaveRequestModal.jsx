'use client';

import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { QUARTER_DAY_TIME_OPTIONS, calculateEndTime } from '@/lib/leaveCalculator';

export default function LeaveRequestModal({ selectedDate, onDateChange, onClose, onSuccess }) {
  const [leaveType, setLeaveType] = useState('FULL');
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(selectedDate || new Date());
  const [endDate, setEndDate] = useState(selectedDate || new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');

  const handleStartDateChange = (e) => {
    const newDate = new Date(e.target.value);
    setStartDate(newDate);
    // 시작일이 종료일보다 늦으면 종료일도 같이 업데이트
    if (newDate > endDate) {
      setEndDate(newDate);
    }
    if (onDateChange) {
      onDateChange(newDate);
    }
  };

  const handleEndDateChange = (e) => {
    const newDate = new Date(e.target.value);
    setEndDate(newDate);
  };

  // 총 사용 연차 계산
  const calculateLeaveDays = () => {
    const days = differenceInDays(endDate, startDate) + 1;
    if (leaveType === 'FULL') {
      return days;
    } else if (leaveType === 'QUARTER_DAY') {
      return 0.25;
    } else {
      // 반차는 시작일만 적용 (하루만)
      return 0.5;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 반차/반반차는 하루만 선택 가능하도록 검증
      if (leaveType !== 'FULL' && differenceInDays(endDate, startDate) > 0) {
        const message = leaveType === 'QUARTER_DAY' ? '반반차는 하루만 선택 가능합니다.' : '반차는 하루만 선택 가능합니다.';
        alert(message);
        setLoading(false);
        return;
      }

      // 타임존 이슈 방지를 위해 YYYY-MM-DD 형식으로 변환
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');

      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: formattedStartDate,
          endDate: formattedEndDate,
          leaveType,
          ...(leaveType === 'QUARTER_DAY' && { startTime, endTime }),
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
              시작일
            </label>
            <input
              type="date"
              value={format(startDate, 'yyyy-MM-dd')}
              onChange={handleStartDateChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              종료일
            </label>
            <input
              type="date"
              value={format(endDate, 'yyyy-MM-dd')}
              onChange={handleEndDateChange}
              min={format(startDate, 'yyyy-MM-dd')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* 총 사용 연차 표시 */}
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-gray-700">
              <span className="font-medium">사용 연차:</span> {calculateLeaveDays()}일
            </p>
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

              <label className="flex items-center p-3 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                <input
                  type="radio"
                  name="leaveType"
                  value="QUARTER_DAY"
                  checked={leaveType === 'QUARTER_DAY'}
                  onChange={(e) => setLeaveType(e.target.value)}
                  className="mr-3"
                />
                <div>
                  <div className="font-medium">반반차</div>
                  <div className="text-sm text-gray-500">2시간 단위</div>
                </div>
              </label>
            </div>
          </div>

          {/* 반반차 선택 시 시간 선택 UI 표시 */}
          {leaveType === 'QUARTER_DAY' && (
            <div className="mb-4 p-4 bg-cyan-50 rounded-lg border border-cyan-200">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작 시간 (30분 단위)
              </label>
              <select
                value={startTime}
                onChange={(e) => {
                  const newStartTime = e.target.value;
                  setStartTime(newStartTime);
                  // 자동으로 +2시간 계산
                  const newEndTime = calculateEndTime(newStartTime);
                  setEndTime(newEndTime);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500"
              >
                {QUARTER_DAY_TIME_OPTIONS.map((time) => (
                  <option key={time} value={time}>
                    {time}
                  </option>
                ))}
              </select>

              <div className="mt-3 p-2 bg-white rounded border border-cyan-100">
                <span className="text-sm text-gray-600">종료 시간: </span>
                <span className="text-sm font-medium text-cyan-700">{endTime}</span>
              </div>
            </div>
          )}

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
