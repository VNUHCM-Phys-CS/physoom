"use client";

import { useCallback, useEffect, useState } from "react";
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
  const [isMobile, setIsMobile] = useState(false);
  const [showWeekend, setShowWeekend] = useState(true);

  // Detect screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setShowWeekend(window.innerWidth >= 640); // Hide weekends on very small screens
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Responsive width calculation
  const widthD = useCallback(() => {
    if (isMobile) {
      return showWeekend ? 100 * (1 / 7) : 100 * (1 / 5);
    }
    return 100 * (1 / 7);
  }, [isMobile, showWeekend]);

  // Get visible weekdays based on screen size
  const getVisibleWeekdays = useCallback(() => {
    const allWeekdays = [2, 3, 4, 5, 6, 7, 8];
    return showWeekend ? allWeekdays : allWeekdays.slice(0, 5); // Mon-Fri only on mobile
  }, [showWeekend]);

  // Responsive cell height
  const responsiveCellHeight = isMobile ? Math.max(30, cellHeight - 10) : cellHeight;
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
          style={{ height: `${responsiveCellHeight}px` }}
          key={`marker-${i}`}
        >
          <div className="text text-xs">{isMobile ? d.label.charAt(0) : d.label}</div>
        </div>
      ))}
    </div>
  );

  const renderDayHeaders = () => {
    const dayNames = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
    const visibleDays = getVisibleWeekdays();
    
    return (
      <>
        <div className="cal-header"></div>
        {visibleDays.map((weekday, index) => (
          <div key={`header-${weekday}`} className="cal-header text">
            {isMobile ? dayNames[index] : dayNames[index]}
          </div>
        ))}
      </>
    );
  };

  const renderDayColumns = () => {
    const allSlots = [];
    const hoursInDay = gridData.length;
    const visibleWeekdays = getVisibleWeekdays();

    // Create all time slots
    for (let time = 0; time < hoursInDay; time += snapPrecision) {
      const isMainSlot = time % 1 === 0;
      const baseHour = Math.floor(time);
      
      if (isMainSlot) {
        allSlots.push({
          time,
          type: 'main',
          data: gridData[baseHour] || { disabled: {} },
          disabled: gridData[baseHour]?.disabled || {}
        });
      } else {
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

    return getVisibleWeekdays().map((weekday) => (
      <div key={`weekday-${weekday}`}>
        {allSlots.map((slot, i) => {
          const isDisabled = slot.disabled?.[weekday];
          const isSolidDisabled = isDisabled === 1;
          
          return (
            <div
              key={`slot-${weekday}-${i}`}
              className={`cal-cell ${isDisabled ? "disabled" : ""} ${isSolidDisabled ? "solid" : ""}`}
              style={{ 
                height: `${snapPrecision * responsiveCellHeight}px`,
                minHeight: `${snapPrecision * responsiveCellHeight}px`
              }}
              onMouseEnter={reviewData ? onMouseEnterCell(weekday, slot.time) : undefined}
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
              top: `${slot.time * responsiveCellHeight}px`,
              height: '1px',
            }}
          />
        );
      }
    });

    return <div className="absolute inset-0 pointer-events-none">{lines}</div>;
  }, [snapPrecision, responsiveCellHeight, getAllSlots]);


  // Mobile toggle for weekends
  const WeekendToggle = () => (
    <button
      onClick={() => setShowWeekend(!showWeekend)}
      className="md:hidden bg-gray-200 px-2 py-1 rounded text-xs mb-2"
    >
      {showWeekend ? 'Hide Weekends' : 'Show Weekends'}
    </button>
  );

  return (
    <div className="w-full">
      {showSnapResolution && (
        <SnapResolutionSelector
          usingAutoMode={autoMode}
          precision={snapPrecision}
          onPrecisionChange={(v) => {
            setSnapPrecision(v);
            onChangeSnapPrecision(v);
          }}
          reviewData={reviewData}
        />
      )}
      
      {/* <WeekendToggle /> */}
      
      <div className="overflow-x-auto">
        <div className="cal-table cal-grid">
          {renderDayHeaders()}
        </div>
        <div className="relative">
          <div className="cal-table cal-grid">
            {renderTimeLabels()}
            {renderDayColumns()}
          </div>
          
          {renderSubGridLines()}
          
          <div className="cal-table cal-event-holder absolute inset-0">
            <div></div>
            <div className="relative">
              {events.map((e, i) => {
                const weekdayIndex = getVisibleWeekdays().indexOf(e.time_slot.weekday);
                if (weekdayIndex === -1) return null; // Skip hidden days
                
                return (
                  <CalendarEvent
                    key={`e-${i}`}
                    customSubtitle={customSubtitle}
                    data={e}
                    height={`${responsiveCellHeight * (e.time_slot.end_time - e.time_slot.start_time)}px`}
                    width={`${widthD()}%`}
                    y={`${e.time_slot.start_time * responsiveCellHeight}px`}
                    x={`${weekdayIndex * widthD()}%`}
                    onClickEvent={onClickEvent}
                    onDragStart={onDragStart}
                    onDoubleClick={onDragStart}
                    onSelected={(reviewData?.id === e.id) || (selectedID === e.id)}
                    style={{ zIndex: 1 }}
                    showTime={showTime && !isMobile}
                    startTime={e.time_slot.start_time}
                    endTime={e.time_slot.end_time}
                    isMobile={isMobile}
                  />
                );
              })}
              
              {onHoverEventData && (
                <CalendarEvent
                  data={onHoverEventData}
                  height={`${responsiveCellHeight * onHoverEventData.duration}px`}
                  width={`${widthD()}%`}
                  customSubtitle={customSubtitle}
                  y={`${onHoverEventData.time_slot.start_time * responsiveCellHeight}px`}
                  x={`${(getVisibleWeekdays().indexOf(onHoverEventData.time_slot.weekday)) * widthD()}%`}
                  isReview={true}
                  showTime={false}
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