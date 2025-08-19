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
const emptyFunc=()=>{};

export default function Calendar({
  gridData = defaultGrid,
  subGridData = { byDay: [], slots: {} },
  cellHeight = 40,
  events = defaultEvents,
  reviewData,
  selectedID,
  onClickCell,
  onClickEvent,
  customSubtitle,
  showSnapResolution = true,
  defaultPrecision = 1,
  autoMode = true,
  showTime = true,
  onChangeSnapPrecision = emptyFunc,
  onDragStart=emptyFunc
}) {
  const [snapPrecision, setSnapPrecision] = useState(defaultPrecision);
  const [onHoverEventData, setOnHoverEventData] = useState();

  // Get all time slots (main and sub) in order
  const getAllSlots = useCallback(() => {
    const slots = [];
    for (let time = 0; time < gridData.length; time += snapPrecision) {
      const isMainSlot = time % 1 === 0;
      if (isMainSlot) {
        slots.push({
          time,
          type: 'main',
          index: time,
          data: gridData[time],
        });
      } else {
        slots.push({
          time,
          type: 'sub',
          data: subGridData.slots[time] || {
            label: gridData[Math.floor(time)].label,
            sublabel: (time % 1).toFixed(2),
            disabled: {}
          },
        });
      }
    }
    return slots;
  }, [gridData, subGridData, snapPrecision]);

  const onMouseEnterCell = useCallback(
    (weekday, slotIndex, mouseEvent) => {
      return () => {
        if (!reviewData) return;

        let adjustedStartTime = slotIndex;
        let adjustedEndTime = slotIndex + reviewData.duration;

        if (snapPrecision < 1 && mouseEvent) {
          const cellRect = mouseEvent.currentTarget.getBoundingClientRect();
          const relativeY = (mouseEvent.clientY - cellRect.top) / cellRect.height;
          
          const snappedRelativeY = roundToIncrement(relativeY, snapPrecision);
          adjustedStartTime = slotIndex + snappedRelativeY;
          adjustedEndTime = adjustedStartTime + reviewData.duration;
          
          if (adjustedEndTime > gridData.length) {
            adjustedEndTime = gridData.length;
            adjustedStartTime = adjustedEndTime - reviewData.duration;
          }
          
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
        
        const snappedRelativeY = roundToIncrement(relativeY, snapPrecision);
        let adjustedStartTime = slotIndex + snappedRelativeY;
        let adjustedEndTime = adjustedStartTime + reviewData.duration;
        
        if (adjustedEndTime > gridData.length) {
          adjustedEndTime = gridData.length;
          adjustedStartTime = adjustedEndTime - reviewData.duration;
        }
        
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

  const renderTimeLabels = () => (
    <div>
      {gridData.map((d, i) => (
        <div
          className="cal-cell flex justify-end items-center"
          style={{ height: `${cellHeight}px` }}
          key={`marker-${i}`}
        >
          <div className="text text-xs">{d.label}</div>
        </div>
      ))}
    </div>
  );

  const renderDayColumns = () => {
    const allSlots = [];
    const hoursInDay = gridData.length;
    
    // Create all time slots based on snap precision
    for (let time = 0; time < hoursInDay; time += snapPrecision) {
      const isMainSlot = time % 1 === 0;
      const baseHour = Math.floor(time);
      
      if (isMainSlot) {
        // Main grid slot
        allSlots.push({
          time,
          type: 'main',
          data: gridData[baseHour] || { disabled: {} },
          disabled: gridData[baseHour]?.disabled || {}
        });
      } else {
        // Subgrid slot
        allSlots.push({
          time,
          type: 'sub',
          data: subGridData.slots[time] || { 
            label: gridData[baseHour]?.label || '',
            sublabel: (time % 1).toFixed(2),
            disabled: {} 
          },
          disabled: subGridData.slots[time]?.disabled || {}
        });
      }
    }

    return [2, 3, 4, 5, 6, 7, 8].map((weekday) => (
      <div key={`weekday-${weekday}`}>
        {allSlots.map((slot, i) => {
          const isDisabled = slot.disabled?.[weekday];
          const isSolidDisabled = isDisabled === 1;
          const isBoundary = isDisabled === 2;
          const isOccupied = isDisabled === 3;
          
          return (
            <div
              key={`slot-${weekday}-${i}`}
              className={`cal-cell ${
                isDisabled ? "disabled" : ""
              } ${
                isSolidDisabled ? "solid" : ""
              }`}
              style={{ 
                height: `${snapPrecision * cellHeight}px`,
                minHeight: `${snapPrecision * cellHeight}px`
              }}
              onMouseEnter={reviewData ? onMouseEnterCell(weekday, slot.time) : undefined}
              // onMouseMove={reviewData ? onMouseMoveCell(weekday, slot.time) : undefined}
              // onMouseLeave={reviewData ? onMouseLeaveCell : undefined}
              onClick={
                onClickCell && onHoverEventData
                  ? () => onClickCell(onHoverEventData, snapPrecision)
                  : undefined
              }
            />
          );
        })}
      </div>
    ));
  };

  const renderSubGridLines = useCallback(() => {
    if (snapPrecision >= 1) return null;

    const lines = [];
    const allSlots = getAllSlots();

    allSlots.forEach((slot) => {
      if (slot.type === 'sub') {
        lines.push(
          <div
            key={`subline-${slot.time}`}
            className="absolute left-0 right-0 border-t border-gray-200 border-dashed opacity-70"
            style={{
              top: `${slot.time * cellHeight}px`,
              height: '1px',
            }}
          />
        );
      }
    });

    return <div className="absolute inset-0 pointer-events-none">{lines}</div>;
  }, [snapPrecision, cellHeight, getAllSlots]);



  
  return (
    <div className="w-full">
      {showSnapResolution && (
        <SnapResolutionSelector
          usingAutoMode={autoMode}
          precision={snapPrecision}
          onPrecisionChange={(v) => {
            setSnapPrecision(v);
            if (onChangeSnapPrecision) onChangeSnapPrecision(v);
          }}
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
            {renderTimeLabels()}
            {renderDayColumns()}
          </div>
          
          {renderSubGridLines()}
          
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
                  onDragStart={onDragStart}
                  onDoubleClick={onDragStart}
                  onSelected={(reviewData?.id === e.id) || (selectedID === e.id)}
                  style={{ zIndex: 1 }}
                  showTime={showTime} // Add this prop
                  startTime={e.time_slot.start_time}
                  endTime={e.time_slot.end_time}
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
                  showTime={false} // Add this prop
                  startTime={onHoverEventData.time_slot.start_time}
                  endTime={onHoverEventData.time_slot.end_time}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}