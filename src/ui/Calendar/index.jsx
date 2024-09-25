"use client";

import { useCallback, useState } from "react";
import "./Calendar.scss";
import { Tooltip } from "@nextui-org/react";
import CalendarEvent from "./CalendarEvent";

const defaultGrid = [
  { label: "1" },
  { label: "2" },
  { label: "3" },
  { label: "4" },
  { label: "5" },
  { label: "6" },
  {
    label: "Break",
    disabled: { 2: true, 3: true, 4: true, 5: true, 6: true, 7: true, 8: true },
  },
  { label: "7" },
  { label: "8" },
  { label: "9" },
  { label: "10" },
  { label: "11" },
  { label: "12" },
];
const defaultEvents = [];
const widthD = 100 * (1 / 7);
export default function Calendar({
  gridData = defaultGrid,
  cellHeight = 40,
  events = defaultEvents,
  reviewData,
  selectedID,
  onClickCell,
  onClickEvent,
  customSubtitle
}) {
  const [onHoverEventData, setOnHoverEventData] = useState();
  const onMouseEnterCell = useCallback(
    (weekday, slotIndex) => {
      return () => {
        setOnHoverEventData({
          ...reviewData,
          time_slot: {
            weekday,
            start_time: slotIndex,
            end_time: slotIndex + reviewData.duration,
          },
        });
      };
    },
    [reviewData]
  );
  const onMouseLeaveCell = useCallback(() => {
    setOnHoverEventData(undefined);
  }, []);
  return (
    <div className="overflow-x-auto">
      <div className="cal-table cal-grid">
        <div className="cal-header"></div>
        <div className="cal-header text">Monday</div>
        <div className="cal-header text">Tuesday</div>
        <div className="cal-header text">Wednesday</div>
        <div className="cal-header text">Thursday</div>
        <div className="cal-header text">Friday</div>
        <div className="cal-header text">Saturday</div>
        <div className="cal-header text">Sunday</div>
      </div>
      <div className="relative">
        <div className="cal-table cal-grid">
          <div>
            {gridData.map((d, i) => (
              <div
                className={`cal-cell flex justify-end items-center`}
                style={{ height: `${cellHeight}px` }}
                key={`markder-${i}`}
              >
                <div className="text text-xs">{d.label}</div>
              </div>
            ))}
          </div>
          {[2, 3, 4, 5, 6, 7, 8].map((o) => (
            <div key={`weekday-${o}`}>
              {gridData.map((d, i) => (
                <div
                  className={`cal-cell ${
                    d.disabled && d.disabled[o] ? "disabled" : ""
                  } ${
                    d.disabled && d.disabled[o] && +d.disabled[o] == 1
                      ? "solid"
                      : ""
                  }`}
                  style={{ height: `${cellHeight}px` }}
                  key={`weekday-${o}-${i}`}
                  onMouseEnter={onMouseEnterCell(o, i)}
                ></div>
              ))}
            </div>
          ))}
        </div>
        <div className="cal-table cal-event-holder">
          <div></div>
          <div className="relative">
            {events.map((e, i) => (
              <CalendarEvent
                key={`e-${i}`}
                customSubtitle={customSubtitle}
                data={e}
                height={`${
                  cellHeight * (e.time_slot.end_time - e.time_slot.start_time)
                }px`}
                width={`${widthD}%`}
                y={`${e.time_slot.start_time * cellHeight}px`}
                x={`${(e.time_slot.weekday - 2) * widthD}%`}
                onClickEvent={onClickEvent}
                onSelected={(reviewData?.id===e.id) ||(selectedID===e.id)}
                style={{ zIndex: 1 }}
              />
            ))}
            {onHoverEventData && (
              <CalendarEvent
                data={onHoverEventData}
                height={`${cellHeight * onHoverEventData.duration}px`}
                width={`${widthD}%`}
                customSubtitle={customSubtitle}
                y={`${onHoverEventData.time_slot.start_time * cellHeight}px`}
                x={`${(onHoverEventData.time_slot.weekday - 2) * widthD}%`}
                isReview={true}
              />
            )}

            {/* Grid interaction */}
            <div className="cal-event-interaction">
              {[2, 3, 4, 5, 6, 7, 8].map((o) => (
                <div key={`weekday-interaction-${o}`}>
                  {gridData.map((d, i) => (
                    <div
                      className={`cal-cell ${
                        d.disabled && d.disabled[o] ? "disabled" : ""
                      }`}
                      style={{ height: `${cellHeight}px` }}
                      key={`weekday-i-${o}-${i}`}
                      onMouseEnter={
                        reviewData ? onMouseEnterCell(o, i) : undefined
                      }
                      onMouseLeave={reviewData ? onMouseLeaveCell : undefined}
                      onClick={
                        onClickCell
                          ? () => onClickCell(onHoverEventData)
                          : undefined
                      }
                    ></div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
