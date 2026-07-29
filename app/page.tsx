"use client";

import { useMemo, useState } from "react";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"] as const;

type CalendarDay = {
  date: Date;
  key: string;
  isCurrentMonth: boolean;
  isToday: boolean;
};

function isSameDate(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function toDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function buildCalendarDays(visibleMonth: Date, today: Date): CalendarDay[] {
  const year = visibleMonth.getFullYear();
  const month = visibleMonth.getMonth();
  const firstDayOffset = new Date(year, month, 1).getDay();

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(year, month, index - firstDayOffset + 1);

    return {
      date,
      key: toDateKey(date),
      isCurrentMonth: date.getMonth() === month,
      isToday: isSameDate(date, today),
    };
  });
}

export default function Home() {
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });
  const today = useMemo(() => new Date(), []);
  const calendarDays = useMemo(
    () => buildCalendarDays(visibleMonth, today),
    [visibleMonth, today],
  );

  const monthLabel = `${visibleMonth.getFullYear()}年 ${visibleMonth.getMonth() + 1}月`;

  const moveMonth = (offset: number) => {
    setVisibleMonth(
      (current) =>
        new Date(current.getFullYear(), current.getMonth() + offset, 1),
    );
  };

  const returnToToday = () => {
    const now = new Date();
    setVisibleMonth(new Date(now.getFullYear(), now.getMonth(), 1));
  };

  return (
    <main className="app-background">
      <section className="calendar-app" aria-label="シフト管理 月間カレンダー">
        <header className="app-header">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div>
            <p className="eyebrow">SHIFT MANAGER</p>
            <p className="app-name">シフト管理</p>
          </div>
        </header>

        <div className="calendar-card">
          <div className="calendar-toolbar">
            <div>
              <p className="section-label">月間カレンダー</p>
              <h1 id="calendar-month-heading">{monthLabel}</h1>
            </div>

            <div className="calendar-actions" aria-label="カレンダーの月移動">
              <button
                className="icon-button"
                type="button"
                aria-label="前月を表示"
                onClick={() => moveMonth(-1)}
              >
                <span aria-hidden="true">‹</span>
              </button>
              <button className="today-button" type="button" onClick={returnToToday}>
                今日
              </button>
              <button
                className="icon-button"
                type="button"
                aria-label="翌月を表示"
                onClick={() => moveMonth(1)}
              >
                <span aria-hidden="true">›</span>
              </button>
            </div>
          </div>

          <div className="weekday-row" role="row" aria-label="曜日">
            {WEEKDAYS.map((weekday, index) => (
              <div
                className={`weekday ${index === 0 ? "sunday" : ""} ${index === 6 ? "saturday" : ""}`}
                role="columnheader"
                key={weekday}
              >
                {weekday}
              </div>
            ))}
          </div>

          <div
            className="calendar-grid"
            role="grid"
            aria-labelledby="calendar-month-heading"
          >
            {calendarDays.map((day) => {
              const dayOfWeek = day.date.getDay();
              const classNames = [
                "calendar-day",
                !day.isCurrentMonth ? "outside-month" : "",
                day.isToday ? "today" : "",
                dayOfWeek === 0 ? "sunday" : "",
                dayOfWeek === 6 ? "saturday" : "",
              ]
                .filter(Boolean)
                .join(" ");

              return (
                <div
                  className={classNames}
                  data-calendar-day="true"
                  role="gridcell"
                  aria-current={day.isToday ? "date" : undefined}
                  aria-label={`${day.date.getFullYear()}年${day.date.getMonth() + 1}月${day.date.getDate()}日${day.isToday ? "、今日" : ""}`}
                  key={day.key}
                >
                  <time dateTime={day.key}>{day.date.getDate()}</time>
                  {day.isToday && <span className="today-label">今日</span>}
                </div>
              );
            })}
          </div>
        </div>

        <footer className="app-footer">
          <span className="status-dot" aria-hidden="true" />
          <span>端末の日時を基準に表示しています</span>
        </footer>
      </section>
    </main>
  );
}
