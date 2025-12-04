'use client';

import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useMemo, useState } from 'react';

const locales = {
  ko: ko,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { locale: ko }),
  getDay,
  locales,
});

const leaveTypeColors = {
  FULL: 'bg-red-500',
  AM_HALF: 'bg-yellow-500',
  PM_HALF: 'bg-green-500',
};

const leaveTypeLabels = {
  FULL: '연차',
  AM_HALF: '오전 반차',
  PM_HALF: '오후 반차',
};

export default function LeaveCalendar({ leaves, onSelectDate }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const events = useMemo(() => {
    return leaves
      .filter((leave) => leave.status === 'APPROVED')
      .map((leave) => {
        // YYYY-MM-DD 형식을 로컬 타임존으로 파싱
        const [startYear, startMonth, startDay] = leave.start_date.split('-');
        const startDate = new Date(startYear, startMonth - 1, startDay);

        const [endYear, endMonth, endDay] = leave.end_date.split('-');
        const endDate = new Date(endYear, endMonth - 1, endDay);

        // react-big-calendar는 end 날짜를 exclusive로 처리하므로 하루 추가
        const calendarEndDate = new Date(endDate);
        calendarEndDate.setDate(calendarEndDate.getDate() + 1);

        return {
          id: leave.id,
          title: leaveTypeLabels[leave.leave_type],
          start: startDate,
          end: calendarEndDate,
          allDay: true,
          resource: leave,
        };
      });
  }, [leaves]);

  const eventStyleGetter = (event) => {
    const leaveType = event.resource.leave_type;
    const colorClass = leaveTypeColors[leaveType];
    
    return {
      className: `${colorClass} text-white`,
    };
  };

  const handleSelectSlot = ({ start }) => {
    onSelectDate(start);
  };

  const handleNavigate = (newDate) => {
    setCurrentDate(newDate);
  };

  return (
    <div className="h-[600px]">
      <Calendar
        localizer={localizer}
        events={events}
        startAccessor="start"
        endAccessor="end"
        style={{ height: '100%' }}
        eventPropGetter={eventStyleGetter}
        onSelectSlot={handleSelectSlot}
        selectable
        date={currentDate}
        onNavigate={handleNavigate}
        messages={{
          today: '오늘',
          previous: '이전',
          next: '다음',
          month: '월',
          week: '주',
          day: '일',
          agenda: '일정',
          date: '날짜',
          time: '시간',
          event: '일정',
          noEventsInRange: '해당 기간에 일정이 없습니다.',
        }}
        views={['month']}
        defaultView="month"
      />
      
      {/* 범례 */}
      <div className="mt-8 flex gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-500 rounded"></div>
          <span>연차</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-500 rounded"></div>
          <span>오전 반차</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-500 rounded"></div>
          <span>오후 반차</span>
        </div>
      </div>
    </div>
  );
}
