import "./Calendar.scss";
import { Tooltip } from "@heroui/react";
import { WarningIcon } from "@/ui/icons/WarningIcon";
import { useRef } from "react";

export default function CalendarEvent({
  data,
  height,
  width,
  x,
  y,
  isReview,
  onSelected,
  style,
  onClickEvent,
  customSubtitle,
  showTime = false,
  onDragStart,
  onDoubleClick
}) {
  const { isOverlap, title, subtitle } = data;
  const clickTimer = useRef(null);
  const formatTime = (time) => {
    const total_minutes = Math.round(time);
    const hours = Math.floor(total_minutes/ 60);
    const minutes = Math.round(total_minutes%60);
    // const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours;//hours % 12 || 12;
    // return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
    return `${displayHours}:${minutes.toString().padStart(2, '0')}`;
  };
  const handleClick = (e,data) => {
    // Clear any previous timer
    e.stopPropagation();
    clearTimeout(clickTimer.current);
    if (onClickEvent){
      clickTimer.current = setTimeout(() => {
        onClickEvent(data);
      }, 250);
    }
  };

  const handleDoubleClick = (data) => {
    clearTimeout(clickTimer.current);
    if (onDoubleClick){
      onDoubleClick(data);
    }
  };
  return (
    <div
      className={`cal-event-cell ${isOverlap ? "overlap" : ""} ${
        isReview ? "review" : ""
      }${
        onSelected ? "active" : ""
      }`}
      style={{
        height,
        width,
        top: y,
        left: x,
        ...style,
      }}
      draggable="true"
      onClick={(e)=>{handleClick(e,data)}}
      onDragStart={() => {
        if (onDragStart) onDragStart(data);
      }}
      onDoubleClick={() => {
        handleDoubleClick(data);
      }}
    >
      <Tooltip
        showArrow={true}
        size={"sm"}
        className="flex flex-col"
        content={
          <div>
            <div className="text-medium">{title}</div>
            <div>{customSubtitle?customSubtitle(data):subtitle.join(', ')}</div>
          </div>
        }
      >
        <div className="cal-event-cell-content">
          <div className="title">
            <p>{title}</p>
          </div>

          <div className="subtitle">
            <p>{customSubtitle?customSubtitle(data):subtitle.map(s=><p key={s}>{s}</p>)}</p>
          </div>
          {showTime && (
            <div className="time-display text-xs font-semibold mb-1">
              {formatTime(data?.data?.time_slot?.start_time)} - {formatTime(data?.data?.time_slot?.end_time)}
            </div>
          )}
          {isOverlap && (
            <WarningIcon className={"absolute left-0 bottom-0 m-2"} />
          )}
        </div>
      </Tooltip>
    </div>
  );
}
