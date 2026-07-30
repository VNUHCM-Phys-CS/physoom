"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";
import LoadingWrapper from "../LoadingWrapper";
import { Calendar, momentLocalizer } from "react-big-calendar";
import withDragAndDrop from "react-big-calendar/lib/addons/dragAndDrop";
import moment from "moment";
import { Trash2Icon } from "lucide-react";
import "react-big-calendar/lib/css/react-big-calendar.css";
import "react-big-calendar/lib/addons/dragAndDrop/styles.css";
import "./custom-calendar.css";
import {
    Modal,
    ModalContent,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Button,
    Chip,
} from "@heroui/react";

const localizer = momentLocalizer(moment);
const DnDCalendar = withDragAndDrop(Calendar);

function DragConfirmModal({ isOpen, event, newStart, newEnd, onConfirm, onCancel, loading }) {
    return (
        <Modal isOpen={isOpen} onClose={onCancel} isDismissable={!loading}>
            <ModalContent>
                <ModalHeader>Confirm Time Change</ModalHeader>
                <ModalBody>
                    <div className="flex flex-col gap-3">
                        <div className="flex flex-col gap-1">
                            <p className="text-sm font-semibold">{event?.title}</p>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-default-500">Current:</span>
                                <Chip size="sm" variant="flat" color="default">
                                    {event?.start ? moment(event.start).format("DD/MM/YYYY HH:mm") : "—"}
                                </Chip>
                                <span className="text-default-400">→</span>
                                <Chip size="sm" variant="flat" color="primary">
                                    {newStart ? moment(newStart).format("DD/MM/YYYY HH:mm") : "—"}
                                </Chip>
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span className="text-default-500">End:</span>
                                <Chip size="sm" variant="flat" color="default">
                                    {event?.end ? moment(event.end).format("DD/MM/YYYY HH:mm") : "—"}
                                </Chip>
                                <span className="text-default-400">→</span>
                                <Chip size="sm" variant="flat" color="primary">
                                    {newEnd ? moment(newEnd).format("DD/MM/YYYY HH:mm") : "—"}
                                </Chip>
                            </div>
                        </div>
                        <p className="text-sm text-warning-600 bg-warning-50 rounded-lg p-2">
                            Changing the time will require re-approval if you are not an admin or room manager.
                        </p>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <Button variant="flat" onPress={onCancel} isDisabled={loading}>
                        Cancel
                    </Button>
                    <Button color="primary" onPress={onConfirm} isLoading={loading}>
                        Confirm
                    </Button>
                </ModalFooter>
            </ModalContent>
        </Modal>
    );
}

export default function CalendarByUser({_events=[],isLoading,selectedID, onClickEvent, onDoubleClick, onEventUpdate, readOnly = false, onDelete}) {
    const { data: session } = useSession();
    const [date, setDate] = useState(new Date());
    const [view, setView] = useState("week");
    const [pendingDrop, setPendingDrop] = useState(null);
    const [dropLoading, setDropLoading] = useState(false);
    // Optimistic time overrides (id -> {start, end}) so a dragged event stays at
    // its new position even when the parent view doesn't refetch its data.
    const [timeOverrides, setTimeOverrides] = useState({});

    const onNavigate = useCallback((newDate) => setDate(newDate), []);
    const onView = useCallback((newView) => setView(newView), []);

    // Drop overrides whenever fresh data arrives from the parent (it already
    // reflects the saved change, so the local override is no longer needed).
    useEffect(() => { setTimeOverrides({}); }, [_events]);

    // Holidays / breaks — shown as all-day background context on the calendar.
    const { data: holidays } = useSWR("/api/calendar-events?type=holiday", fetcher);

    // _events are coming from CalendarEvent API. All occurrences are now returned.
    const events = useMemo(()=>{
        const base = (_events ?? []).map((e) => {
            if (e.start && e.end) {
                const ov = timeOverrides[e._id];
                const roomTitle = e.room?.title || (typeof e.room === "string" ? "" : "");
                const baseTitle = e.title || (e.course ? (typeof e.course === 'object' ? e.course.title : "Class") : "Event");
                return {
                    id: e._id,
                    title: roomTitle ? `${baseTitle} · ${roomTitle}` : baseTitle,
                    start: new Date(ov?.start ?? e.start),
                    end: new Date(ov?.end ?? e.end),
                    resource: e
                };
            }
            return null;
        }).filter(Boolean);

        const hol = (holidays ?? []).map((h) => ({
            id: `hol-${h._id}`,
            title: `🎌 ${h.title}`,
            // All-day range: react-big-calendar treats the end as exclusive, so
            // add a day to include the final holiday date.
            start: moment(h.start).startOf("day").toDate(),
            end: moment(h.end).add(1, "day").startOf("day").toDate(),
            allDay: true,
            resource: { ...h, isHoliday: true },
        }));

        return [...hol, ...base];
    }, [_events, timeOverrides, holidays]);

    const eventStyleGetter = useCallback((event) => {
        const type = event.resource?.type || 'class';
        const location = event.resource?.room?.location || event.resource?.location || 'NVC';

        let backgroundColor = '#3b82f6'; // Default Blue (Class NVC)

        if (type === 'class') {
            if (location === 'LT') backgroundColor = '#a855f7'; // Purple (Class LT)
        } else if (type === 'holiday') {
            backgroundColor = '#f59e0b'; // Amber
        } else if (type === 'exam') {
            backgroundColor = '#ef4444'; // Red
        } else if (type === 'personal') {
            backgroundColor = '#ec4899'; // Pink
        } else {
            backgroundColor = '#10b981'; // Emerald (Other/Custom)
        }

        if (selectedID && (event.resource?.course?._id?.toString() === selectedID.toString() || event.id?.toString() === selectedID.toString())) {
            backgroundColor = '#059669'; // Darker Emerald for selected
        }

        return {
            style: {
                backgroundColor,
                borderRadius: '6px',
                opacity: 0.85,
                color: 'white',
                border: 'none',
                display: 'block',
                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
            }
        };
    }, [selectedID]);

    const canDragResize = useCallback((event) => {
        if (readOnly) return false;
        if (event.resource?.isHoliday || event.resource?.type === 'holiday') return false;
        if (event.resource?.type === 'class') return false;
        if (session?.user?.isAdmin) return true;
        const email = session?.user?.email;
        if (!email) return false;
        return (
            (event.resource?.teacher_email ?? []).includes(email) ||
            (event.resource?.host ?? []).includes(email)
        );
    }, [readOnly, session]);

    const onEventDrop = useCallback(
        ({ event, start, end }) => {
            if (event.resource?.isHoliday || event.resource?.type === 'holiday') return;
            if (event.resource?.type === 'class') return;
            setPendingDrop({ event, start, end });
        },
        []
    );

    const handleConfirmDrop = useCallback(async () => {
        if (!pendingDrop) return;
        setDropLoading(true);
        try {
            const res = await fetch(`/api/room-event/${pendingDrop.event.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // Date objects serialize to full ISO (UTC) — timezone-safe.
                    start: pendingDrop.start,
                    end: pendingDrop.end,
                }),
            });
            if (res.ok) {
                // Keep the event at its new time locally even if the parent
                // doesn't refetch, so it no longer snaps back to the old slot.
                setTimeOverrides((prev) => ({
                    ...prev,
                    [pendingDrop.event.id]: { start: pendingDrop.start, end: pendingDrop.end },
                }));
                if (onEventUpdate) onEventUpdate();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setDropLoading(false);
            setPendingDrop(null);
        }
    }, [pendingDrop, onEventUpdate]);

    const handleCancelDrop = useCallback(() => {
        setPendingDrop(null);
    }, []);

    return (
        <LoadingWrapper isLoading={isLoading}>
            <div className="h-[600px] w-full bg-white dark:bg-zinc-900 p-4 rounded-xl">
                <DnDCalendar
                    localizer={localizer}
                    events={events}
                    date={date}
                    view={view}
                    onNavigate={onNavigate}
                    onView={onView}
                    startAccessor="start"
                    endAccessor="end"
                    style={{ height: "100%" }}
                    eventPropGetter={eventStyleGetter}
                    components={{
                        event: (props) => (
                          <div className="relative group h-full w-full overflow-visible">
                            <div className="rbc-event-content">
                              {props.title}
                            </div>
                            {!readOnly && onDelete && !props.event.resource?.isHoliday && (
                              <button
                                className="delete-btn absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 p-0.5 bg-white text-danger rounded-full hover:bg-danger hover:text-white transition-opacity z-50 shadow-sm flex items-center justify-center border border-danger/20"
                                style={{ width: '18px', height: '18px' }}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDelete(props.event.resource);
                                }}
                                title="Delete this schedule"
                              >
                                <Trash2Icon size={10} />
                              </button>
                            )}
                          </div>
                        )
                    }}
                    onSelectEvent={(e, ...rest) => { if (e?.resource?.isHoliday) return; onClickEvent?.(e, ...rest); }}
                    onDoubleClickEvent={(e, ...rest) => { if (e?.resource?.isHoliday) return; onDoubleClick?.(e, ...rest); }}
                    onEventDrop={!readOnly ? onEventDrop : undefined}
                    onEventResize={!readOnly ? onEventDrop : undefined}
                    resizable={!readOnly}
                    draggableAccessor={canDragResize}
                    resizableAccessor={canDragResize}
                    views={['month', 'week', 'day', 'agenda']}
                    min={new Date(0, 0, 0, 7, 0, 0)} // Start at 7 AM
                    max={new Date(0, 0, 0, 20, 0, 0)} // End at 8 PM
                />
            </div>
            <DragConfirmModal
                isOpen={!!pendingDrop}
                event={pendingDrop?.event?.resource}
                newStart={pendingDrop?.start}
                newEnd={pendingDrop?.end}
                onConfirm={handleConfirmDrop}
                onCancel={handleCancelDrop}
                loading={dropLoading}
            />
        </LoadingWrapper>
    );
}
