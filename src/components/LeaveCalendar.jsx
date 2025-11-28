'use client';

import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { ko } from 'date-fns/locale';
import { useMemo } from 'react';

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
  const events = useMemo(() => {
    return leaves
      .filter((leave) => leave.status === 'APPROVED')
      .map((leave) => {
        const date = new Date(leave.leave_date);
        return {
          id: leave.id,
          title: leaveTypeLabels[leave.leave_type],
          start: date,
          end: date,
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
      <div className="mt-4 flex gap-4 text-sm">
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
