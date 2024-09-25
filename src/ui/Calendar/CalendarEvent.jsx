import "./Calendar.scss";
import { Tooltip } from "@nextui-org/react";
import { WarningIcon } from "@/ui/icons/WarningIcon";

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
  customSubtitle
}) {
  const { isOverlap, title, subtitle } = data;
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
      onClick={()=>onClickEvent?onClickEvent(data):null}
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
          {isOverlap && (
            <WarningIcon className={"absolute left-0 bottom-0 m-2"} />
          )}
        </div>
      </Tooltip>
    </div>
  );
}
