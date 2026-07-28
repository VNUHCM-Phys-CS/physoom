"use client";
import useSWR from "swr";
import {
  fetcheroptions,
  fetcher,
  defaultLoc,
  getClass,
  customSubtitle,
} from "@/lib/ulti";
import CourseList from "../CourseList";
import Card from "../Card";
import _ from "lodash";
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import CalendarByRoom from "../CalendarByRoom";
import {
  Tab,
  Tabs,
  Button,
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerBody,
  useDisclosure,
  Autocomplete,
  AutocompleteItem,
  Chip,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/react";
import CalendarByUser from "../CalendarByUser";
import { UserCalendarContext } from "../CalendarByUser/wrapper";
import { MenuIcon, ChevronDown, ChevronUp, AlertTriangleIcon } from "lucide-react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import moment from "moment";
import { Calendar, momentLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { RoomEventModal } from "../RoomEventModal";

const localizer = momentLocalizer(moment);

// ─── EventListSidebar ────────────────────────────────────────────────────────

const statusColor = (status) => {
  if (status === "approved") return "success";
  if (status === "rejected") return "danger";
  return "warning";
};

function EventListSidebar({ events, email, selectedId, onSelect }) {
  if (!events?.length) return (
    <p className="text-xs text-default-400 italic px-3 py-2">No events yet.</p>
  );
  return (
    <div className="flex flex-col gap-1 p-2">
      {events.map((ev) => {
        const isOwner = (ev.teacher_email ?? []).includes(email);
        const isHost = (ev.host ?? []).includes(email);
        const isAttendee = (ev.attendees ?? []).includes(email);
        const isSelected = String(ev._id) === String(selectedId);
        return (
          <button
            key={ev._id}
            onClick={() => onSelect?.(ev)}
            className={`w-full text-left rounded-lg border px-2 py-1.5 flex flex-col gap-0.5 transition-colors
              ${isSelected
                ? "border-secondary bg-secondary-50 ring-1 ring-secondary"
                : "border-default-100 bg-default-50 hover:border-default-300 hover:bg-default-100"
              }`}
          >
            <span className="text-xs font-medium truncate">{ev.title}</span>
            <span className="text-xs text-default-400 truncate">
              {ev.room?.title}{ev.room?.title ? " · " : ""}{moment(ev.start).format("DD/MM HH:mm")}
            </span>
            <div className="flex flex-wrap gap-1 mt-0.5">
              <Chip size="sm" color={statusColor(ev.status)} variant="flat">{ev.status}</Chip>
              {isOwner && <Chip size="sm" color="primary" variant="flat">Owner</Chip>}
              {isHost && <Chip size="sm" color="secondary" variant="flat">Host</Chip>}
              {isAttendee && <Chip size="sm" color="default" variant="flat">Attendee</Chip>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── EventInfoModal ────────────────────────────────────────────────────────────

function EventInfoModal({ isOpen, onOpenChange, event, email, isAdmin, managedRooms, rooms, onSuccess }) {
  const { isOpen: isEditOpen, onOpen: onEditOpen, onOpenChange: onEditOpenChange } = useDisclosure();
  if (!event) return null;

  const isCreator = (event.teacher_email ?? []).includes(email);
  const isHost = (event.host ?? []).includes(email);
  const isManager = (managedRooms ?? []).some((r) => String(r._id) === String(event.room?._id ?? event.room));
  const canEdit = isAdmin || isCreator || isHost || isManager;
  const isPrivileged = isAdmin || isManager;
  const contacts = [...new Set([...(event.teacher_email ?? []), ...(event.host ?? [])])].filter(Boolean);

  return (
    <>
      <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1.5 pb-2">
                <span className="text-base font-semibold">{event.title}</span>
                <Chip color={statusColor(event.status)} size="sm" variant="flat" className="w-fit capitalize">
                  {event.status}
                </Chip>
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-1.5 text-sm">
                  <p><span className="text-default-500">Room:</span> {event.room?.title || "-"}</p>
                  <p>
                    <span className="text-default-500">Time:</span>{" "}
                    {moment(event.start).format("DD/MM/YYYY HH:mm")} – {moment(event.end).format("HH:mm")}
                  </p>
                  {(event.teacher_email ?? []).length > 0 && (
                    <p><span className="text-default-500">Created by:</span> {event.teacher_email.join(", ")}</p>
                  )}
                  {(event.host ?? []).length > 0 && (
                    <p><span className="text-default-500">Host:</span> {event.host.join(", ")}</p>
                  )}
                  {(event.attendees ?? []).length > 0 && (
                    <p><span className="text-default-500">Attendees:</span> {event.attendees.join(", ")}</p>
                  )}
                  {(event.tags ?? []).length > 0 && (
                    <p><span className="text-default-500">Note:</span> {event.tags.join(", ")}</p>
                  )}
                </div>

                {canEdit ? (
                  <div className="mt-3 flex items-start gap-2 bg-warning-50 text-warning-700 rounded-lg px-3 py-2 text-xs">
                    <AlertTriangleIcon size={14} className="shrink-0 mt-0.5" />
                    <span>Changing <strong>time or room</strong> will require re-approval. Title and attendee changes apply immediately.</span>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-col gap-1 bg-default-50 border border-default-200 rounded-lg px-3 py-2 text-sm">
                    <span className="font-medium text-default-700">You don't have permission to edit this event.</span>
                    {contacts.length > 0 && (
                      <span className="text-default-400 text-xs">Contact the creator or host: {contacts.join(", ")}</span>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>Close</Button>
                {canEdit && (
                  <Button
                    color="warning"
                    variant="flat"
                    startContent={<AlertTriangleIcon size={14} />}
                    onPress={() => { onClose(); onEditOpen(); }}
                  >
                    Edit
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <RoomEventModal
        isOpen={isEditOpen}
        onOpenChange={onEditOpenChange}
        event={event}
        rooms={rooms ?? []}
        isPrivileged={isPrivileged}
        onSuccess={onSuccess}
      />
    </>
  );
}

// ─── EventBookingTab ──────────────────────────────────────────────────────────

function EventBookingTab({ allRooms, managedRooms, isAdmin, email, onEventClick, initialRoomId, onRoomChange }) {
  const [roomInput, setRoomInput] = useState("");
  const [roomFilter, setRoomFilter] = useState(initialRoomId || null); // selected room _id
  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState("week");
  const [slotStart, setSlotStart] = useState(null);
  const [slotEnd, setSlotEnd] = useState(null);
  const { isOpen: isBookOpen, onOpen: onBookOpen, onOpenChange: onBookOpenChange } = useDisclosure();

  const accessibleRooms = useMemo(() => {
    if (!allRooms) return [];
    if (isAdmin) return allRooms;
    const bookable = allRooms.filter((r) => r.isBookable);
    return _.uniqBy([...bookable, ...(managedRooms ?? [])], "_id");
  }, [allRooms, managedRooms, isAdmin]);

  const filteredRoomOptions = useMemo(() =>
    accessibleRooms.filter((r) => r.title?.toLowerCase().includes(roomInput.toLowerCase())),
    [accessibleRooms, roomInput]
  );

  const selectedRoom = useMemo(() => accessibleRooms.find((r) => String(r._id) === roomFilter) ?? null, [accessibleRooms, roomFilter]);

  const { data: roomEvents, mutate: mutateRoomEvents } = useSWR(
    roomFilter ? `/api/room-event?room=${roomFilter}` : null, fetcher, { revalidateOnFocus: false }
  );
  const { data: classEvents } = useSWR(
    roomFilter ? `/api/calendar-events?type=class&rooms=${roomFilter}` : null, fetcher, { revalidateOnFocus: false }
  );

  const calEvents = useMemo(() => {
    const custom = (roomEvents ?? []).map((e) => ({ id: e._id, title: e.title, start: new Date(e.start), end: new Date(e.end), resource: e, eventType: "custom" }));
    const classes = (classEvents ?? []).map((e) => ({ id: e._id, title: e.title, start: new Date(e.start), end: new Date(e.end), resource: e, eventType: "class" }));
    return [...custom, ...classes];
  }, [roomEvents, classEvents]);

  const eventPropGetter = (event) => {
    if (event.eventType === "class") return { style: { backgroundColor: "#3b82f6", borderRadius: "6px", color: "white", border: "none", opacity: 0.85 } };
    const s = event.resource?.status;
    const bg = s === "pending" ? "#f59e0b" : s === "rejected" ? "#9ca3af" : "#10b981";
    return { style: { backgroundColor: bg, borderRadius: "6px", color: "white", border: "none", opacity: 0.9 } };
  };

  const handleSlot = useCallback(({ start, end }) => { setSlotStart(start); setSlotEnd(end); onBookOpen(); }, [onBookOpen]);
  const handleAddBtn = useCallback(() => { setSlotStart(null); setSlotEnd(null); onBookOpen(); }, [onBookOpen]);

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Autocomplete
            label="Filter by room" size="sm" className="max-w-xs"
            items={filteredRoomOptions}
            inputValue={roomInput}
            onInputChange={(v) => { setRoomInput(v); if (!v) { setRoomFilter(null); onRoomChange?.(null); } }}
            selectedKey={roomFilter}
            onSelectionChange={(key) => { const id = key || null; setRoomFilter(id); onRoomChange?.(id); const r = accessibleRooms.find((r) => String(r._id) === key); setRoomInput(r?.title || ""); }}
          >
            {(r) => <AutocompleteItem key={String(r._id)} textValue={r.title}>{r.title}</AutocompleteItem>}
          </Autocomplete>

          {selectedRoom && (
            <div className="flex items-center gap-2 text-sm bg-default-100 rounded-xl px-3 py-1.5">
              <span className="font-medium">{selectedRoom.title}</span>
              {selectedRoom.location && <span className="text-default-400 text-xs">{selectedRoom.location}</span>}
              {selectedRoom.limit > 0 && <span className="text-default-500 text-xs">Cap: <strong>{selectedRoom.limit}</strong></span>}
              <Chip size="sm" variant="flat" color={selectedRoom.isBookable ? "success" : "default"}>{selectedRoom.isBookable ? "Public" : "Managed"}</Chip>
            </div>
          )}

          <div className="flex gap-3 text-xs flex-wrap">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" /> Class</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" /> Approved</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500 inline-block" /> Pending</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-400 inline-block" /> Rejected</span>
          </div>
        </div>
        <Button color="primary" size="sm" onPress={handleAddBtn}>+ Add Event</Button>
      </div>

      {/* Calendar */}
      <div className="h-[580px] bg-white dark:bg-zinc-900 p-3 rounded-xl shadow">
        {!roomFilter ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-default-400 text-sm">Select a room to view its schedule</p>
          </div>
        ) : (
          <Calendar
            localizer={localizer}
            events={calEvents}
            date={calDate}
            view={calView}
            onNavigate={setCalDate}
            onView={setCalView}
            startAccessor="start"
            endAccessor="end"
            style={{ height: "100%" }}
            eventPropGetter={eventPropGetter}
            onSelectEvent={(calEv) => onEventClick?.(calEv.resource, calEv.eventType)}
            selectable
            onSelectSlot={handleSlot}
            views={["month", "week", "day", "agenda"]}
            min={new Date(0, 0, 0, 7, 0, 0)}
            max={new Date(0, 0, 0, 22, 0, 0)}
          />
        )}
      </div>

      <RoomEventModal
        isOpen={isBookOpen}
        onOpenChange={onBookOpenChange}
        rooms={accessibleRooms}
        isPrivileged={isAdmin || (managedRooms ?? []).some((r) => String(r._id) === roomFilter)}
        createdBy={email}
        onSuccess={mutateRoomEvents}
        initialStart={slotStart}
        initialEnd={slotEnd}
        initialRoomId={roomFilter || ""}
      />
    </>
  );
}

// ─── BookingSingle ────────────────────────────────────────────────────────────

export default function BookingSingle({ email }) {
  const { isOpen, onOpen, onClose } = useDisclosure();
  const { data: session } = useSession();
  const isAdmin = !!session?.user?.isAdmin;
  const searchParams = useSearchParams();

  // Main tab + room — kept in sync with URL
  const [mainTab, setMainTab] = useState(() => searchParams.get("tab") || "general");
  const [eventRoomId, setEventRoomId] = useState(() => searchParams.get("room") || null);
  const initialCourseId = useRef(searchParams.get("course") || null);

  // Sidebar tab + event selection (shared with EventBookingTab)
  const [sidebarTab, setSidebarTab] = useState("courses");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [infoEvent, setInfoEvent] = useState(null);
  const { isOpen: isInfoOpen, onOpen: onInfoOpen, onOpenChange: onInfoOpenChange } = useDisclosure();

  const { data: course, mutate: mutateCourse } = useSWR(
    [
      email ? "/api/course" : null,
      {
        method: "POST",
        body: JSON.stringify({ filter: { teacher_email: email } }),
      },
    ],
    fetcheroptions,
    { tags: ["course"], revalidate: 60 }
  );

  const [booking, setBooking] = useState();
  const { data: rooms } = useSWR(
    [
      booking ? "/api/room" : null,
      {
        method: "POST",
        body: JSON.stringify({
          filter: {
            location: booking?.course?.location ?? defaultLoc,
            limit: { $gte: booking?.course.population },
          },
        }),
      },
    ],
    fetcheroptions,
    { tags: ["room"], revalidate: 60 }
  );

  // All rooms for event booking
  const { data: allRooms } = useSWR(
    email ? "/api/room" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  // Fetch managed rooms via POST filter
  const { data: managedRooms } = useSWR(
    email
      ? [
          "/api/room",
          {
            method: "POST",
            body: JSON.stringify({ filter: { managers: email } }),
          },
        ]
      : null,
    fetcheroptions,
    { revalidateOnFocus: false }
  );

  // My events (for sidebar)
  const { data: myEvents, mutate: mutateMyEvents } = useSWR(
    email ? "/api/room-event?mine=true" : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { data: currentbooking, isLoading: isLoadingBook } = useSWR(
    [
      booking ? "/api/booking" : null,
      {
        method: "POST",
        body: JSON.stringify({
          filter: {
            course: booking?.course?._id,
          },
        }),
      },
    ],
    fetcheroptions,
    { tags: ["booking"], revalidate: 60 }
  );

  // ── URL sync ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const params = new URLSearchParams();
    if (mainTab && mainTab !== "general") params.set("tab", mainTab);
    if (eventRoomId) params.set("room", eventRoomId);
    if (booking?.course?._id) params.set("course", String(booking.course._id));
    const s = params.toString();
    window.history.replaceState(null, "", s ? `?${s}` : window.location.pathname);
  }, [mainTab, eventRoomId, booking]);

  // Auto-select course from URL on first data load
  useEffect(() => {
    if (initialCourseId.current && course && !booking) {
      const found = course.find((c) => String(c._id) === initialCourseId.current);
      if (found) {
        initialCourseId.current = null;
        setBooking({ teacher_email: found.teacher_email, room: undefined, course: found, time_slot: {} });
      }
    }
  }, [course, booking]);

  const onSelectCourse = useCallback((course) => {
    // create new booking
    const newBooking = {
      teacher_email: course?.teacher_email,
      room: undefined,
      course,
      time_slot: {},
    };
    setBooking(newBooking);
  }, []);
  const { userEvents, mutateUserEvent } = useContext(UserCalendarContext);
  const { data: classEvents, mutate: mutateClassEvent } = useSWR(
    [
      booking ? "/api/calendar-events/fetch" : null,
      {
        method: "POST",
        body: JSON.stringify({
          filter: { "course.class_id": getClass(booking?.course?.class_id) },
          isApproximate: true,
        }),
      },
    ],
    fetcheroptions,
    { tags: ["booking"], revalidate: 60 }
  );

  const extraEvents = useMemo(() => {
    return _.values(
      _.merge(_.keyBy(classEvents, "_id"), _.keyBy(userEvents, "_id"))
    );
  }, [classEvents, userEvents]);

  // ── Sidebar / event-click handlers ────────────────────────────────────────
  const handleSidebarEventClick = useCallback((ev) => {
    setInfoEvent(ev);
    onInfoOpen();
  }, [onInfoOpen]);

  const handleCalendarEventClick = useCallback((resource, eventType) => {
    if (eventType === "class") return; // class events not in My Events
    setSelectedEventId(String(resource._id));
    setSidebarTab("events");
    setInfoEvent(resource);
    onInfoOpen();
  }, [onInfoOpen]);

  // ── Desktop sidebar: tabs (uses lifted sidebarTab state) ──────────────────
  const DesktopSidebar = () => (
    <div className="flex flex-col h-full">
      <div className="flex border-b border-default-200 shrink-0">
        {[
          { key: "courses", label: `Courses${course?.length ? ` (${course.length})` : ""}` },
          { key: "events", label: `My Events${myEvents?.length ? ` (${myEvents.length})` : ""}` },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setSidebarTab(t.key)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-colors
              ${sidebarTab === t.key
                ? "text-secondary border-b-2 border-secondary -mb-px"
                : "text-default-400 hover:text-default-600"
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-y-auto">
        {sidebarTab === "courses" ? (
          <CourseList course={course} userEvents={userEvents} onSelectionChange={onSelectCourse} />
        ) : (
          <EventListSidebar
            events={myEvents}
            email={email}
            selectedId={selectedEventId}
            onSelect={handleSidebarEventClick}
          />
        )}
      </div>
    </div>
  );

  // ── Mobile sidebar: collapsibles ───────────────────────────────────────────
  const MobileSidebarContent = () => {
    const [coursesOpen, setCoursesOpen] = useState(true);
    const [eventsOpen, setEventsOpen] = useState(true);
    return (
      <div className="flex flex-col h-full w-full overflow-hidden">
        <div className={`flex flex-col min-h-0 ${coursesOpen ? "flex-1" : ""}`}>
          <button
            onClick={() => setCoursesOpen((v) => !v)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wide text-default-500 hover:text-default-800 border-b border-default-100 transition-colors shrink-0"
          >
            <span>Courses{course?.length ? ` (${course.length})` : ""}</span>
            {coursesOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {coursesOpen && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <CourseList course={course} userEvents={userEvents} onSelectionChange={onSelectCourse} />
            </div>
          )}
        </div>
        <div className={`flex flex-col min-h-0 border-t border-default-100 ${eventsOpen ? (coursesOpen ? "max-h-[45%]" : "flex-1") : ""}`}>
          <button
            onClick={() => setEventsOpen((v) => !v)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wide text-default-500 hover:text-default-800 transition-colors shrink-0"
          >
            <span>My Events{myEvents?.length ? ` (${myEvents.length})` : ""}</span>
            {eventsOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {eventsOpen && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <EventListSidebar
                events={myEvents}
                email={email}
                selectedId={selectedEventId}
                onSelect={handleSidebarEventClick}
              />
            </div>
          )}
        </div>
      </div>
    );
  };

  if (email)
    return (
      <div className="flex flex-col sm:flex-row py-2 px-2 mx-auto gap-2">
        {/* Mobile drawer trigger button - only visible on small screens */}
        <div className="sm:hidden mb-2">
          <Button
            onPress={onOpen}
            variant="bordered"
            startContent={<MenuIcon />}
            className="w-full"
          >
            Select Course
          </Button>
        </div>

        {/* Desktop sidebar - tabs layout, fixed height */}
        <Card className="hidden sm:flex sm:flex-col sm:w-1/4 !p-0 overflow-hidden" style={{ height: "640px" }}>
          <DesktopSidebar />
        </Card>

        {/* Mobile Drawer - collapsible layout */}
        <Drawer isOpen={isOpen} onClose={onClose} placement="left" className="sm:hidden">
          <DrawerContent>
            <DrawerHeader>
              <h3>Courses & Events</h3>
            </DrawerHeader>
            <DrawerBody className="!p-0 overflow-hidden">
              <MobileSidebarContent />
            </DrawerBody>
          </DrawerContent>
        </Drawer>
        <Card className="w-full sm:w-3/4">
          <Tabs radius={"full"} color="secondary" selectedKey={mainTab} onSelectionChange={setMainTab}>
            <Tab key="general" title="Classroom schedule">
              {booking && !isLoadingBook ? (
                <CalendarByRoom
                  initRoom={
                    currentbooking && currentbooking[0]
                      ? currentbooking[0]?.room?._id
                      : undefined
                  }
                  rooms={rooms}
                  extraEvents={extraEvents}
                  booking={booking}
                  onBooking={() => {
                    mutateCourse();
                    mutateUserEvent();
                  }}
                  isLock={booking?.course?.isLock}
                />
              ) : (
                <div className="prose">
                  <h4>Please choose course</h4>
                </div>
              )}
            </Tab>
            <Tab key="personal" title="Personal schedule">
              <CalendarByUser
                _events={userEvents}
                customSubtitle={customSubtitle}
                selectedID={booking?.course?._id}
                onEventUpdate={mutateUserEvent}
              />
            </Tab>
            <Tab key="class_sche" title="Class schedule">
              <CalendarByUser
                _events={classEvents}
                selectedID={booking?.course?._id}
                onEventUpdate={mutateClassEvent}
              />
            </Tab>
            <Tab key="event_booking" title="Event Booking">
              <EventBookingTab
                allRooms={allRooms}
                managedRooms={managedRooms}
                isAdmin={isAdmin}
                email={email}
                onEventClick={handleCalendarEventClick}
                initialRoomId={eventRoomId}
                onRoomChange={setEventRoomId}
              />
            </Tab>
          </Tabs>
        </Card>

        <EventInfoModal
          isOpen={isInfoOpen}
          onOpenChange={onInfoOpenChange}
          event={infoEvent}
          email={email}
          isAdmin={isAdmin}
          managedRooms={managedRooms}
          rooms={allRooms}
          onSuccess={() => mutateMyEvents()}
        />
      </div>
    );
  else return <div>Please login first</div>;
}
