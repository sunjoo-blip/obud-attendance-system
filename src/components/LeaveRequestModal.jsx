'use client';

import { useState } from 'react';
import { format, differenceInDays } from 'date-fns';
import { QUARTER_DAY_TIME_OPTIONS, calculateEndTime } from '@/lib/leaveCalculator';
import {
  FAMILY_EVENT_CONFIG,
  FAMILY_EVENT_TYPES,
  FAMILY_EVENT_VERSION,
  getFamilyEventInfo,
  computeFamilyEventEndDate,
  formatMoney,
} from '@/lib/familyEvent';

export default function LeaveRequestModal({ selectedDate, onDateChange, onClose, onSuccess }) {
  const [mode, setMode] = useState('ANNUAL'); // 'ANNUAL' | 'FAMILY_EVENT'
  const [leaveType, setLeaveType] = useState('FULL');
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState(selectedDate || new Date());
  const [endDate, setEndDate] = useState(selectedDate || new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('11:00');

  // 경조사 상태
  const initialFamStart = format(selectedDate || new Date(), 'yyyy-MM-dd');
  const [eventType, setEventType] = useState('MARRIAGE');
  const [eventRelation, setEventRelation] = useState('');
  const [famStartDate, setFamStartDate] = useState(initialFamStart);
  const [famEndDate, setFamEndDate] = useState(initialFamStart);

  const famInfo = getFamilyEventInfo(eventType, eventRelation);

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

  // 경조사: 구분 변경 시 대상 초기화
  const handleEventTypeChange = (e) => {
    setEventType(e.target.value);
    setEventRelation('');
  };

  // 경조사: 대상 변경 시 지급 일수만큼 종료일 자동 계산
  const handleEventRelationChange = (e) => {
    const relation = e.target.value;
    setEventRelation(relation);
    const info = getFamilyEventInfo(eventType, relation);
    if (info) {
      setFamEndDate(computeFamilyEventEndDate(famStartDate, info.days));
    }
  };

  // 경조사: 시작일 변경 시 종료일 자동 재계산
  const handleFamStartDateChange = (e) => {
    const newStart = e.target.value;
    setFamStartDate(newStart);
    if (famInfo) {
      setFamEndDate(computeFamilyEventEndDate(newStart, famInfo.days));
    } else if (newStart > famEndDate) {
      setFamEndDate(newStart);
    }
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

  const handleFamilySubmit = async (e) => {
    e.preventDefault();

    if (!eventRelation) {
      alert('경조사 대상을 선택해주세요.');
      return;
    }
    if (famStartDate > famEndDate) {
      alert('시작일은 종료일보다 이전이어야 합니다.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: 'FAMILY_EVENT',
          eventType,
          eventRelation,
          startDate: famStartDate,
          endDate: famEndDate,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        alert('경조사가 등록되었습니다!');
        onSuccess();
        onClose();
      } else {
        alert(data.error || '경조사 등록에 실패했습니다.');
      }
    } catch (error) {
      console.error('Failed to create family event:', error);
      alert('경조사 등록 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const tabClass = (active) =>
    `flex-1 py-2.5 text-sm font-medium rounded-lg transition-colors ${
      active ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }`;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 my-auto">
        {/* 탭 */}
        <div className="flex gap-2 mb-5">
          <button type="button" className={tabClass(mode === 'ANNUAL')} onClick={() => setMode('ANNUAL')}>
            연차 신청
          </button>
          <button
            type="button"
            className={tabClass(mode === 'FAMILY_EVENT')}
            onClick={() => setMode('FAMILY_EVENT')}
          >
            경조사 등록
          </button>
        </div>

        {mode === 'ANNUAL' ? (
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
        ) : (
          <form onSubmit={handleFamilySubmit}>
            {/* 구분 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">구분</label>
              <select
                value={eventType}
                onChange={handleEventTypeChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {FAMILY_EVENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 대상 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">대상</label>
              <select
                value={eventRelation}
                onChange={handleEventRelationChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              >
                <option value="">선택해주세요</option>
                {FAMILY_EVENT_CONFIG[eventType].relations.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            {/* 경조사 안내 (경조금/화환/비고) */}
            {famInfo && (
              <div className="mb-4 p-3 bg-purple-50 rounded-lg border border-purple-200 text-sm text-gray-700 space-y-1">
                <p>
                  <span className="font-medium">지급 연차:</span>{' '}
                  {famInfo.days > 0 ? `${famInfo.days}일` : '없음'}
                </p>
                <p>
                  <span className="font-medium">경조금:</span> {formatMoney(famInfo.money)}원
                </p>
                <p>
                  <span className="font-medium">화환:</span>{' '}
                  {famInfo.wreath ? '제공' : '-'}
                </p>
                {famInfo.note && (
                  <p className="text-purple-700">※ {famInfo.note}</p>
                )}
                <p className="text-xs text-gray-400 pt-1">
                  경조금/화환은 안내용이며 실제 지급은 별도 처리됩니다. ({FAMILY_EVENT_VERSION} 기준)
                </p>
              </div>
            )}

            {/* 시작일 */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">시작일</label>
              <input
                type="date"
                value={famStartDate}
                onChange={handleFamStartDateChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>

            {/* 종료일 (자동 계산, 수정 가능) */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료일{' '}
                <span className="text-xs text-gray-400">(지급 일수 기준 자동 계산 · 수정 가능)</span>
              </label>
              <input
                type="date"
                value={famEndDate}
                min={famStartDate}
                onChange={(e) => setFamEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
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
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium disabled:bg-gray-400"
                disabled={loading}
              >
                {loading ? '등록 중...' : '등록하기'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
