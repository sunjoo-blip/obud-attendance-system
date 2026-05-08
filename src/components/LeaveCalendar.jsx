"use client";

import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { ko } from "date-fns/locale";
import { useMemo, useState } from "react";

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

const leaveTypeConfig = {
  FULL: { bg: "bg-red-500", dot: "#ef4444", label: "연차" },
  AM_HALF: { bg: "bg-yellow-500", dot: "#eab308", label: "오전 반차" },
  PM_HALF: { bg: "bg-green-500", dot: "#22c55e", label: "오후 반차" },
  QUARTER_DAY: { bg: "bg-cyan-500", dot: "#06b6d4", label: "반반차" },
};

function CustomEvent({ event }) {
  const leave = event.resource;
  const config = leaveTypeConfig[leave.leave_type] || leaveTypeConfig.FULL;
  const label =
    leave.leave_type === "QUARTER_DAY" && leave.start_time && leave.end_time
      ? `반반차 (${leave.start_time.substring(0, 5)}-${leave.end_time.substring(0, 5)})`
      : config.label;

  return (
    <div className="flex items-center gap-1 px-1 truncate">
      <span
        className="flex-shrink-0 w-2 h-2 rounded-full"
        style={{ backgroundColor: config.dot }}
      />
      <span className="truncate text-xs text-gray-800">{label}</span>
    </div>
  );
}

function CustomToolbar({ date, onNavigate }) {
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return (
    <div className="flex items-center justify-center gap-3 mb-4">
      <button
        onClick={() => onNavigate("PREV")}
        className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-lg leading-none"
      >
        ‹
      </button>
      <span className="text-base font-semibold text-gray-800 min-w-[6rem] text-center">
        {year}년 {month}월
      </span>
      <button
        onClick={() => onNavigate("NEXT")}
        className="px-3 py-1.5 border border-gray-300 rounded text-gray-700 hover:bg-gray-50 text-lg leading-none"
      >
        ›
      </button>
    </div>
  );
}

export default function LeaveCalendar({ leaves, onSelectDate }) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const events = useMemo(() => {
    return leaves
      .filter((leave) => leave.status === "APPROVED")
      .map((leave) => {
        // YYYY-MM-DD 형식을 로컬 타임존으로 파싱
        const [startYear, startMonth, startDay] = leave.start_date.split("-");
        const startDate = new Date(startYear, startMonth - 1, startDay);

        const [endYear, endMonth, endDay] = leave.end_date.split("-");
        const endDate = new Date(endYear, endMonth - 1, endDay);

        // react-big-calendar는 end 날짜를 exclusive로 처리하므로 하루 추가
        const calendarEndDate = new Date(endDate);
        calendarEndDate.setDate(calendarEndDate.getDate() + 1);

        const config =
          leaveTypeConfig[leave.leave_type] || leaveTypeConfig.FULL;
        let title = config.label;
        if (
          leave.leave_type === "QUARTER_DAY" &&
          leave.start_time &&
          leave.end_time
        ) {
          title = `반반차 (${leave.start_time.substring(0, 5)}-${leave.end_time.substring(0, 5)})`;
        }

        return {
          id: leave.id,
          title: title,
          start: startDate,
          end: calendarEndDate,
          allDay: true,
          resource: leave,
        };
      });
  }, [leaves]);

  const eventStyleGetter = () => ({
    style: { background: "transparent", border: "none", padding: 0 },
  });

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
        style={{ height: "100%" }}
        eventPropGetter={eventStyleGetter}
        onSelectSlot={handleSelectSlot}
        selectable
        date={currentDate}
        onNavigate={handleNavigate}
        messages={{
          today: "오늘",
          previous: "이전",
          next: "다음",
          month: "월",
          week: "주",
          day: "일",
          agenda: "일정",
          date: "날짜",
          time: "시간",
          event: "일정",
          noEventsInRange: "해당 기간에 일정이 없습니다.",
        }}
        views={["month"]}
        defaultView="month"
        components={{ toolbar: CustomToolbar, event: CustomEvent }}
      />

      {/* 범례 */}
      <div className="mt-8 flex gap-4 text-sm">
        {Object.values(leaveTypeConfig).map((cfg) => (
          <div key={cfg.label} className="flex items-center gap-1.5">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0"
              style={{ backgroundColor: cfg.dot }}
            />
            <span className="text-gray-600">{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
