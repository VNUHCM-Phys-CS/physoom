"use client";

import { useCallback, useState } from "react";
import "./Calendar.scss";
import { Tooltip } from "@heroui/react";
import CalendarEvent from "./CalendarEvent";
import SnapResolutionSelector from "./SnapResolutionSelector";
import { roundToIncrement } from "@/lib/ulti";

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
  customSubtitle,
  showSnapResolution =true,
  defaultPrecision=1,
  autoMode = true,
}) {
  const [snapPrecision, setSnapPrecision] = useState(defaultPrecision);
  const [onHoverEventData, setOnHoverEventData] = useState();
  const onMouseEnterCell = useCallback(
    (weekday, slotIndex, mouseEvent) => {
      return () => {
        if (!reviewData) return;

        let adjustedStartTime = slotIndex;
        let adjustedEndTime = slotIndex + reviewData.duration;

        // If precision is less than 1, calculate sub-slot position based on mouse position
        if (snapPrecision < 1 && mouseEvent) {
          const cellRect = mouseEvent.currentTarget.getBoundingClientRect();
          const relativeY = (mouseEvent.clientY - cellRect.top) / cellRect.height;
          
          // Snap the relative position to the precision increment
          const snappedRelativeY = roundToIncrement(relativeY, snapPrecision);
          adjustedStartTime = slotIndex + snappedRelativeY;
          adjustedEndTime = adjustedStartTime + reviewData.duration;
          
          // Ensure we don't exceed grid bounds
          if (adjustedEndTime > gridData.length) {
            adjustedEndTime = gridData.length;
            adjustedStartTime = adjustedEndTime - reviewData.duration;
          }
          
          // Round to precision
          adjustedStartTime = roundToIncrement(adjustedStartTime, snapPrecision);
          adjustedEndTime = roundToIncrement(adjustedEndTime, snapPrecision);
        }

        setOnHoverEventData({
          ...reviewData,
          time_slot: {
            weekday,
            start_time: adjustedStartTime,
            end_time: adjustedEndTime,
          },
        });
      };
    },
    [reviewData, snapPrecision, gridData.length]
  );
  const onMouseLeaveCell = useCallback(() => {
    setOnHoverEventData(undefined);
  }, []);
  const onMouseMoveCell = useCallback(
    (weekday, slotIndex) => {
      return (mouseEvent) => {
        if (!reviewData || snapPrecision >= 1) return;

        const cellRect = mouseEvent.currentTarget.getBoundingClientRect();
        const relativeY = (mouseEvent.clientY - cellRect.top) / cellRect.height;
        
        // Snap the relative position to the precision increment
        const snappedRelativeY = roundToIncrement(relativeY, snapPrecision);
        let adjustedStartTime = slotIndex + snappedRelativeY;
        let adjustedEndTime = adjustedStartTime + reviewData.duration;
        
        // Ensure we don't exceed grid bounds
        if (adjustedEndTime > gridData.length) {
          adjustedEndTime = gridData.length;
          adjustedStartTime = adjustedEndTime - reviewData.duration;
        }
        
        // Round to precision
        adjustedStartTime = roundToIncrement(adjustedStartTime, snapPrecision);
        adjustedEndTime = roundToIncrement(adjustedEndTime, snapPrecision);

        setOnHoverEventData({
          ...reviewData,
          time_slot: {
            weekday,
            start_time: adjustedStartTime,
            end_time: adjustedEndTime,
          },
        });
      };
    },
    [reviewData, snapPrecision, gridData.length]
  );

  const renderSubGridLines = useCallback(() => {
    if (snapPrecision >= 1) return null;

    const lines = [];
    gridData.forEach((slot, slotIndex) => {
      // Skip if this is a completely disabled slot (like Break with disabled: 1)
      // We'll check if all weekdays are disabled with value 1 (solid disabled)
      const allWeekdaysDisabled = slot.disabled && 
        [2, 3, 4, 5, 6, 7, 8].every(weekday => slot.disabled[weekday] === 1);
      
      if (allWeekdaysDisabled) return;

      // Create sub-lines within each slot
      for (let i = snapPrecision; i < 1; i += snapPrecision) {
        lines.push(
          <div
            key={`subline-${slotIndex}-${i}`}
            className="absolute left-0 right-0 border-t border-gray-200 border-dashed opacity-50"
            style={{
              top: `${(slotIndex + i) * cellHeight}px`,
              height: '1px',
            }}
          />
        );
      }
    });

    return <div className="absolute inset-0 pointer-events-none">{lines}</div>;
  },[snapPrecision]);

  return (
    <div className="w-full">
      {showSnapResolution && (
        <SnapResolutionSelector
          usingAutoMode={autoMode}
          precision={snapPrecision}
          onPrecisionChange={setSnapPrecision}
          reviewData={reviewData}
        />
      )}
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
                  onMouseEnter={reviewData ? onMouseEnterCell(o, i) : undefined}
                    onMouseMove={reviewData ? onMouseMoveCell(o, i) : undefined}
                    onMouseLeave={reviewData ? onMouseLeaveCell : undefined}
                    onClick={
                      onClickCell && onHoverEventData
                        ? () => onClickCell(onHoverEventData,snapPrecision)
                        : undefined
                    }
                ></div>
              ))}
            </div>
          ))}
        </div>
         {/* Sub-grid lines for visual feedback */}
          {renderSubGridLines()}
          
          {/* Events layer */}
        <div className="cal-table cal-event-holder absolute inset-0 pointer-events-none">
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
    </div>
  );
}
