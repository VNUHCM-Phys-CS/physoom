"use client";
import useSWR, { useSWRConfig } from "swr";
import {
  fetcheroptions,
  fetcher,
  defaultLoc,
  getClass,
  customSubtitle,
  termYear,
  termAcademicYear,
} from "@/lib/ulti";
import CourseList from "../CourseList";
import { useConfirm } from "../ConfirmDialog";
import { useI18n } from "@/i18n/I18nProvider";
import ExportIcsButton from "../ExportIcsButton";
import { toast } from "react-toastify";
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
  Switch,
  Select,
  SelectItem,
  Input,
} from "@heroui/react";
import CalendarByUser from "../CalendarByUser";
import CompactSchedule from "../CompactSchedule";
import EditScheduleModal from "../EditScheduleModal";
import GuideTour from "../GuideTour";
import { UserCalendarContext } from "../CalendarByUser/wrapper";
import { MenuIcon, ChevronDown, ChevronUp, AlertTriangleIcon, SearchIcon } from "lucide-react";
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
  const { t } = useI18n();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("all");
  const [futureOnly, setFutureOnly] = useState(false);

  const norm = (s) => String(s || "").toLowerCase();
  const filtered = useMemo(() => {
    const now = Date.now();
    const qq = norm(q).trim();
    return (events ?? [])
      .filter((ev) => {
        if (status !== "all" && (ev.status || "pending") !== status) return false;
        if (futureOnly && ev.end && new Date(ev.end).getTime() < now) return false;
        if (qq && !norm(`${ev.title} ${ev.room?.title || ""}`).includes(qq)) return false;
        return true;
      })
      .sort((a, b) => new Date(a.start) - new Date(b.start));
  }, [events, q, status, futureOnly]);

  return (
    <div className="flex flex-col gap-2 p-2">
      {/* Search + filters */}
      <Input
        size="sm"
        placeholder={t("myev.searchPh") || "Tìm sự kiện / phòng"}
        value={q}
        onValueChange={setQ}
        isClearable
        onClear={() => setQ("")}
        startContent={<SearchIcon size={14} className="text-default-400" />}
      />
      <div className="flex items-center gap-2 flex-wrap">
        <Select
          size="sm"
          aria-label="Trạng thái"
          className="max-w-[140px]"
          selectedKeys={[status]}
          onChange={(e) => setStatus(e.target.value || "all")}
        >
          <SelectItem key="all">{t("myev.all") || "Tất cả"}</SelectItem>
          <SelectItem key="approved">{t("myev.approved") || "Đã duyệt"}</SelectItem>
          <SelectItem key="pending">{t("myev.pending") || "Chờ duyệt"}</SelectItem>
          <SelectItem key="rejected">{t("myev.rejected") || "Từ chối"}</SelectItem>
        </Select>
        <Switch size="sm" isSelected={futureOnly} onValueChange={setFutureOnly}>
          <span className="text-xs">{t("myev.futureOnly") || "Sắp tới"}</span>
        </Switch>
      </div>

      {!filtered.length ? (
        <p className="text-xs text-default-400 italic px-1 py-2">
          {events?.length ? t("myev.noMatch") : t("myev.noEvents")}
        </p>
      ) : filtered.map((ev) => {
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
              <Chip size="sm" color={statusColor(ev.status)} variant="flat">{t(`myev.${ev.status}`) || ev.status}</Chip>
              {isOwner && <Chip size="sm" color="primary" variant="flat">{t("myev.owner")}</Chip>}
              {isHost && <Chip size="sm" color="secondary" variant="flat">{t("myev.host")}</Chip>}
              {isAttendee && <Chip size="sm" color="default" variant="flat">{t("myev.attendee")}</Chip>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ─── EventInfoModal ────────────────────────────────────────────────────────────

function EventInfoModal({ isOpen, onOpenChange, event, email, isAdmin, managedRooms, rooms, onSuccess }) {
  const { t } = useI18n();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onOpenChange: onEditOpenChange } = useDisclosure();
  const { data: users } = useSWR("/api/user/list", fetcher);

  // Resolve an email to "Name (email)" when the user exists in the database.
  const nameByEmail = useMemo(() => {
    const map = {};
    (users ?? []).forEach((u) => { if (u.email) map[u.email.toLowerCase()] = u.name; });
    return map;
  }, [users]);
  const label = useCallback(
    (addr) => {
      const name = nameByEmail[addr?.toLowerCase?.()];
      return name ? `${name} (${addr})` : addr;
    },
    [nameByEmail]
  );
  const labelList = useCallback((arr) => (arr ?? []).map(label).join(", "), [label]);

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
                  <p><span className="text-default-500">{t("event.room")}:</span> {event.room?.title || "-"}</p>
                  <p>
                    <span className="text-default-500">{t("event.time")}:</span>{" "}
                    {moment(event.start).format("DD/MM/YYYY HH:mm")} – {moment(event.end).format("HH:mm")}
                  </p>
                  {(event.teacher_email ?? []).length > 0 && (
                    <p><span className="text-default-500">{t("re.createdByLabel")}:</span> {labelList(event.teacher_email)}</p>
                  )}
                  {(event.host ?? []).length > 0 && (
                    <p><span className="text-default-500">{t("event.host")}:</span> {labelList(event.host)}</p>
                  )}
                  {(event.attendees ?? []).length > 0 && (
                    <p><span className="text-default-500">{t("event.attendees")}:</span> {labelList(event.attendees)}</p>
                  )}
                  {(event.tags ?? []).length > 0 && (
                    <p><span className="text-default-500">{t("event.note")}:</span> {event.tags.join(", ")}</p>
                  )}
                </div>

                {canEdit ? (
                  <div className="mt-3 flex items-start gap-2 bg-warning-50 text-warning-700 rounded-lg px-3 py-2 text-xs">
                    <AlertTriangleIcon size={14} className="shrink-0 mt-0.5" />
                    <span>{t("re.editWarn")}</span>
                  </div>
                ) : (
                  <div className="mt-3 flex flex-col gap-1 bg-default-50 border border-default-200 rounded-lg px-3 py-2 text-sm">
                    <span className="font-medium text-default-700">{t("re.noEditPerm")}</span>
                    {contacts.length > 0 && (
                      <span className="text-default-400 text-xs">{t("re.contactHost")} {labelList(contacts)}</span>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>{t("common.close")}</Button>
                {canEdit && (
                  <Button
                    color="warning"
                    variant="flat"
                    startContent={<AlertTriangleIcon size={14} />}
                    onPress={() => { onClose(); onEditOpen(); }}
                  >
                    {t("common.edit")}
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
  const { t } = useI18n();
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

  const handleSlot = useCallback(({ start, end }) => {
    // Warn immediately if the dragged slot overlaps a class or an already-approved
    // event (those would be rejected with a 409 on submit anyway).
    const clash = calEvents.find(
      (e) => (e.eventType === "class" || e.resource?.status === "approved") && start < e.end && e.start < end
    );
    if (clash) {
      const when = `${moment(clash.start).format("HH:mm")}–${moment(clash.end).format("HH:mm")}`;
      const kind = clash.eventType === "class" ? t("rb.slotHasClass") : t("rb.slotHasEvent");
      toast.warning(`${kind}: "${clash.title}" (${when})`);
      return;
    }
    setSlotStart(start); setSlotEnd(end); onBookOpen();
  }, [calEvents, onBookOpen, t]);
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
            messages={{
              today: t("cal.today"), previous: t("cal.back"), next: t("cal.next"),
              month: t("cal.month"), week: t("cal.week"), day: t("cal.day"), agenda: t("cal.agenda"),
              date: t("cal.date"), time: t("cal.time"), event: t("cal.event"),
              noEventsInRange: t("cal.noEventsRange"),
            }}
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
        onSuccess={() => mutateRoomEvents()}
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
  const { t, lang } = useI18n();
  const { confirm, confirmDialog } = useConfirm();

  // Main tab + room — kept in sync with URL
  const [mainTab, setMainTab] = useState(() => searchParams.get("tab") || "personal");
  const [eventRoomId, setEventRoomId] = useState(() => searchParams.get("room") || null);
  const initialCourseId = useRef(searchParams.get("course") || null);

  // Sidebar tab + event selection (shared with EventBookingTab)
  const [sidebarTab, setSidebarTab] = useState("courses");
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [infoEvent, setInfoEvent] = useState(null);
  const [editSchedEvent, setEditSchedEvent] = useState(null);
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

  // ── Term filter (left panel) ──────────────────────────────────────────────
  const { data: terms } = useSWR("/api/calendar-events?type=term", fetcher, { revalidateOnFocus: false });
  const [selectedTermId, setSelectedTermId] = useState(null);
  // Academic-year filter: many terms are the SAME semester/year but split per
  // cohort (CHÍNH QUY / 26DKD / 24VLH…), which clutters the term dropdown. Pick a
  // year first to collapse the list to that year's terms.
  const [selectedYear, setSelectedYear] = useState("");
  // Distinct academic years present, newest first (from title, else start date).
  const years = useMemo(() => {
    const s = new Set();
    (terms ?? []).forEach((tm) => { const y = termAcademicYear(tm); if (y) s.add(y); });
    return [...s].sort((a, b) => b.localeCompare(a));
  }, [terms]);
  // Default = the term most of the lecturer's courses belong to.
  useEffect(() => {
    if (selectedTermId || !course?.length) return;
    const counts = {};
    course.forEach((c) => { if (c.term) counts[String(c.term)] = (counts[String(c.term)] || 0) + 1; });
    const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (top) setSelectedTermId(top);
  }, [course, selectedTermId]);
  const selectedTermObj = useMemo(() => (terms ?? []).find((t) => String(t._id) === selectedTermId), [terms, selectedTermId]);
  // Default the year filter from the selected term (or the newest year).
  useEffect(() => {
    if (selectedYear) return;
    const y = selectedTermObj ? termAcademicYear(selectedTermObj) : years[0];
    if (y) setSelectedYear(y);
  }, [selectedTermObj, years, selectedYear]);
  // Terms shown in the "Học kỳ" dropdown = only those in the chosen year.
  const termsInYear = useMemo(
    () => (selectedYear ? (terms ?? []).filter((tm) => termAcademicYear(tm) === selectedYear) : (terms ?? [])),
    [terms, selectedYear]
  );
  const onChangeYear = useCallback((y) => {
    setSelectedYear(y);
    // If the selected term isn't in the new year, jump to that year's first term.
    const inYear = (terms ?? []).filter((tm) => termAcademicYear(tm) === y);
    if (!inYear.some((tm) => String(tm._id) === selectedTermId)) {
      setSelectedTermId(inYear[0] ? String(inYear[0]._id) : null);
    }
  }, [terms, selectedTermId]);
  const filteredCourses = useMemo(
    () => (selectedTermId ? (course ?? []).filter((c) => String(c.term) === selectedTermId) : (course ?? [])),
    [course, selectedTermId]
  );
  const selectedTermStart = selectedTermObj?.start ? new Date(selectedTermObj.start).getTime() : undefined;

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

  const { mutate: globalMutate } = useSWRConfig();
  // Refresh every room-event query (the sidebar list AND the per-room calendar
  // feed inside EventBookingTab) so an edit shows up on the calendar right away.
  const refreshRoomEvents = useCallback(() => {
    globalMutate(
      (key) => typeof key === "string" && key.startsWith("/api/room-event")
    );
  }, [globalMutate]);

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

  // Always include the currently-booked room so an already-scheduled course
  // still shows its room even if it no longer matches the location/capacity filter.
  const roomsForCal = useMemo(() => {
    const list = rooms ?? [];
    const booked = currentbooking?.[0]?.room;
    if (booked?._id && !list.some((r) => String(r._id) === String(booked._id))) {
      return [booked, ...list];
    }
    return list;
  }, [rooms, currentbooking]);

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

  // Move a course from "planned" back to "pending": delete its booking
  // (CalendarEvents) but keep the Course document itself.
  const handleUnschedule = useCallback(
    async ({ _id }) => {
      const ok = await confirm({
        title: t("course.moveToPending"),
        message: t("course.confirmUnschedule"),
        confirmLabel: t("course.moveToPending"),
        confirmColor: "warning",
      });
      if (!ok) return;
      try {
        const res = await fetch("/api/booking/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mode: "course", id: _id }),
        });
        if (res.ok) {
          mutateUserEvent?.();
          mutateCourse();
          globalMutate((key) => {
            const k = Array.isArray(key) ? key[0] : key;
            return typeof k === "string" && k.startsWith("/api/booking");
          });
          setBooking((b) => (String(b?.course?._id) === String(_id) ? undefined : b));
          toast.success(t("course.moveToPending"));
        } else {
          toast.error("Failed to move course to pending.");
        }
      } catch {
        toast.error("Failed to move course to pending.");
      }
    },
    [confirm, t, mutateUserEvent, mutateCourse, globalMutate]
  );

  const classFilterId = getClass(booking?.course?.class_id);
  const hasClassId = Array.isArray(classFilterId)
    ? classFilterId.filter(Boolean).length > 0
    : !!classFilterId;
  const { data: classEvents, mutate: mutateClassEvent } = useSWR(
    [
      booking && hasClassId ? "/api/calendar-events/fetch" : null,
      {
        method: "POST",
        body: JSON.stringify({
          filter: { "course.class_id": classFilterId },
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

  // --- Lecturer/Class schedule view options (auto-jump + compact) ---
  const [autoJump, setAutoJump] = useState(false);
  const [compactMode, setCompactMode] = useState(false);
  useEffect(() => {
    try {
      setAutoJump(localStorage.getItem("physoom.autoJump") === "1");
      setCompactMode(localStorage.getItem("physoom.compactMode") === "1");
    } catch { /* ignore */ }
  }, []);
  const toggleAutoJump = useCallback((v) => {
    setAutoJump(v);
    try { localStorage.setItem("physoom.autoJump", v ? "1" : "0"); } catch { /* ignore */ }
  }, []);
  const toggleCompact = useCallback((v) => {
    setCompactMode(v);
    try { localStorage.setItem("physoom.compactMode", v ? "1" : "0"); } catch { /* ignore */ }
  }, []);

  // Earliest occurrence of the selected course within an events list.
  const jumpDateFor = useCallback((events, courseId) => {
    if (!courseId) return undefined;
    const times = (events ?? [])
      .filter((e) => e.start && String(e.course?._id ?? e.course) === String(courseId))
      .map((e) => new Date(e.start).valueOf());
    return times.length ? Math.min(...times) : undefined;
  }, []);
  const courseStartTs = booking?.course?.start_date
    ? new Date(booking.course.start_date).getTime()
    : undefined;
  // No course selected → jump to the selected term's start so the calendar
  // opens on that term's weeks (not today). With a course selected, honour the
  // auto-jump toggle (jump to the course's first session).
  const lecturerJump = useMemo(
    () => (booking?.course
      ? (autoJump ? (jumpDateFor(userEvents, booking?.course?._id) ?? courseStartTs) : undefined)
      : selectedTermStart),
    [autoJump, userEvents, booking?.course?._id, courseStartTs, jumpDateFor, selectedTermStart]
  );
  const classJump = useMemo(
    () => (booking?.course
      ? (autoJump ? (jumpDateFor(classEvents, booking?.course?._id) ?? courseStartTs) : undefined)
      : selectedTermStart),
    [autoJump, classEvents, booking?.course?._id, courseStartTs, jumpDateFor, selectedTermStart]
  );

  // Default compact range = span of the tab's events.
  const rangeOf = useCallback((events) => {
    const times = (events ?? []).filter((e) => e.start).map((e) => new Date(e.start).valueOf());
    if (!times.length) return { from: undefined, to: undefined };
    return { from: new Date(Math.min(...times)), to: new Date(Math.max(...times)) };
  }, []);
  const lecturerRange = useMemo(() => rangeOf(userEvents), [userEvents, rangeOf]);
  const classRange = useMemo(() => rangeOf(classEvents), [classEvents, rangeOf]);

  // Detailed, step-by-step page tour: switches the sidebar/main tab as it goes
  // so each step actually shows the area it describes (not a hollow overview).
  const bookingTourSteps = useMemo(() => {
    const L = (vi, en) => (lang === "en" ? en : vi);
    return [
      {
        popover: {
          title: L("Thời khóa biểu của bạn 📅", "Your timetable 📅"),
          description: L(
            "Nơi xem lịch cá nhân, lịch lớp và đăng ký mượn phòng cho sự kiện. Đi qua vài bước ngắn nhé.",
            "View your personal & class schedule and request rooms for events. A short guided tour."
          ),
        },
      },
      {
        element: '[data-tour="tour-term"]',
        popover: {
          side: "right",
          align: "start",
          title: L("Chọn học kỳ", "Pick a term"),
          description: L(
            "Chọn học kỳ để lịch mở đúng các tuần của kỳ. Đổi học kỳ thì danh sách môn và lịch bên phải đổi theo.",
            "Choose a term so the calendar opens on that term's weeks. Changing it updates the course list and the calendar."
          ),
        },
      },
      {
        element: '[data-tour="tour-sidebar-list"]',
        onHighlightStarted: () => setSidebarTab("courses"),
        popover: {
          side: "right",
          align: "center",
          title: L("Chọn môn để xem lịch", "Pick a course"),
          description: L(
            "Bấm một môn trong danh sách để xem lịch của môn đó ở khung bên phải. Gõ vào ô tìm kiếm để lọc nhanh.",
            "Click a course to see its schedule on the right. Use the search box to filter quickly."
          ),
        },
      },
      {
        element: '[data-tour="tour-sidebar-list"]',
        onHighlightStarted: () => setSidebarTab("events"),
        popover: {
          side: "right",
          align: "center",
          title: L('"My Events"', '"My Events"'),
          description: L(
            "Tab My Events: xem các buổi mượn phòng của bạn — trạng thái (chờ duyệt/đã duyệt), lọc, tìm kiếm và chỉ hiện sự kiện sắp tới.",
            "The My Events tab: your room requests — status (pending/approved), filter, search, and show-only-upcoming."
          ),
        },
      },
      {
        element: '[data-tour="booking-tabs"]',
        onHighlightStarted: () => setMainTab("personal"),
        popover: {
          side: "bottom",
          align: "start",
          title: L("Các khung xem", "The views"),
          description: L(
            "4 tab: Lịch cá nhân, Lịch phòng học, Lịch lớp và Đặt phòng sự kiện. Đang mở Lịch cá nhân — lịch dạy của riêng bạn.",
            "4 tabs: Personal, Classroom, Class, and Event booking. Personal (your own teaching schedule) is open now."
          ),
        },
      },
      {
        element: '[data-tour="booking-tabs"]',
        onHighlightStarted: () => setMainTab("personal"),
        popover: {
          side: "bottom",
          align: "start",
          title: L("Mẹo ở Lịch cá nhân", "Tip: Personal schedule"),
          description: L(
            'Bật "Tự nhảy tới ngày bắt đầu" để nhảy tới buổi đầu của môn đang chọn; "Chế độ gọn" để xem dạng danh sách; nút Xuất .ics để đưa lịch vào Google/Outlook.',
            'Toggle auto-jump to jump to the selected course\'s first session; compact mode for a list view; Export .ics to add your schedule to Google/Outlook.'
          ),
        },
      },
      {
        element: '[data-tour="booking-tabs"]',
        onHighlightStarted: () => setMainTab("event_booking"),
        popover: {
          side: "bottom",
          align: "start",
          title: L("Đặt phòng cho sự kiện", "Request a room"),
          description: L(
            "Vào tab Đặt phòng sự kiện: chọn phòng, ngày giờ, nhập nội dung rồi gửi yêu cầu. Admin duyệt xong bạn sẽ nhận thông báo ở chuông trên thanh trên.",
            "Open Event booking: pick a room, date/time, add details, then submit. You'll be notified at the top-bar bell once an admin approves."
          ),
        },
      },
      {
        element: '[data-tour="help"]',
        popover: {
          side: "bottom",
          align: "end",
          title: L("Cần thêm?", "Need more?"),
          description: L(
            "Bấm biểu tượng ? để mở trang hướng dẫn đầy đủ, có ảnh minh hoạ từng chức năng.",
            "Click the ? icon for the full, illustrated guide."
          ),
        },
      },
      {
        popover: {
          title: L("Xong! 🎉", "All set! 🎉"),
          description: L(
            'Mở lại bất cứ lúc nào bằng nút "Hướng dẫn trang này".',
            'Reopen anytime via the "Guide for this page" button.'
          ),
        },
      },
    ];
  }, [lang]);

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
  const TermFilter = () => (
    (terms ?? []).length > 0 && (
      <div data-tour="tour-term" className="p-2 border-b border-default-100 shrink-0 flex flex-col gap-2">
        {years.length > 1 && (
          <Select
            size="sm"
            label={t("booking.academicYear")}
            selectedKeys={selectedYear ? [selectedYear] : []}
            onChange={(e) => e.target.value && onChangeYear(e.target.value)}
          >
            {years.map((y) => (
              <SelectItem key={y} value={y}>{y}</SelectItem>
            ))}
          </Select>
        )}
        <Select
          size="sm"
          label={t("cm.term") || "Học kỳ"}
          selectedKeys={selectedTermId ? [selectedTermId] : []}
          onChange={(e) => setSelectedTermId(e.target.value || null)}
        >
          {termsInYear.map((tm) => (
            <SelectItem key={String(tm._id)} value={String(tm._id)}>
              {termYear(tm.title) ? tm.title.replace(termYear(tm.title), "").replace(/[\/\-–\s]+$/, "").trim() : tm.title}
            </SelectItem>
          ))}
        </Select>
      </div>
    )
  );

  const DesktopSidebar = () => (
    <div className="flex flex-col h-full">
      <TermFilter />
      <div className="flex border-b border-default-200 shrink-0">
        {[
          { key: "courses", label: `${t("booking.tabCourses")}${filteredCourses?.length ? ` (${filteredCourses.length})` : ""}` },
          { key: "events", label: `${t("booking.tabMyEvents")}${myEvents?.length ? ` (${myEvents.length})` : ""}` },
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
      <div data-tour="tour-sidebar-list" className="flex-1 min-h-0 overflow-y-auto">
        {sidebarTab === "courses" ? (
          <CourseList course={filteredCourses} userEvents={userEvents} onSelectionChange={onSelectCourse} onUnschedule={handleUnschedule} />
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
        <TermFilter />
        <div className={`flex flex-col min-h-0 ${coursesOpen ? "flex-1" : ""}`}>
          <button
            onClick={() => setCoursesOpen((v) => !v)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wide text-default-500 hover:text-default-800 border-b border-default-100 transition-colors shrink-0"
          >
            <span>{t("booking.tabCourses")}{filteredCourses?.length ? ` (${filteredCourses.length})` : ""}</span>
            {coursesOpen ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {coursesOpen && (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <CourseList course={filteredCourses} userEvents={userEvents} onSelectionChange={onSelectCourse} onUnschedule={handleUnschedule} />
            </div>
          )}
        </div>
        <div className={`flex flex-col min-h-0 border-t border-default-100 ${eventsOpen ? (coursesOpen ? "max-h-[45%]" : "flex-1") : ""}`}>
          <button
            onClick={() => setEventsOpen((v) => !v)}
            className="flex items-center justify-between w-full px-3 py-2 text-xs font-semibold uppercase tracking-wide text-default-500 hover:text-default-800 transition-colors shrink-0"
          >
            <span>{t("booking.tabMyEvents")}{myEvents?.length ? ` (${myEvents.length})` : ""}</span>
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
      <>
      {/* Page toolbar: a guide button specific to this Timetable page */}
      <div className="flex items-center justify-end px-2 pt-1">
        <GuideTour
          steps={bookingTourSteps}
          buttonVariant="flat"
          size="sm"
          label={t("guide.pageTour")}
        />
      </div>
      <div className="flex flex-col sm:flex-row py-2 px-2 mx-auto gap-2">
        {confirmDialog}
        {/* Mobile drawer trigger button - only visible on small screens */}
        <div className="sm:hidden mb-2">
          <Button
            onPress={onOpen}
            variant="bordered"
            startContent={<MenuIcon />}
            className="w-full"
          >
            {t("booking.selectCourse")}
          </Button>
        </div>

        {/* Desktop sidebar - tabs layout, fixed height */}
        <Card data-tour="booking-sidebar" className="hidden sm:flex sm:flex-col sm:w-1/4 !p-0 overflow-hidden" style={{ height: "640px" }}>
          <DesktopSidebar />
        </Card>

        {/* Mobile Drawer - collapsible layout */}
        <Drawer isOpen={isOpen} onClose={onClose} placement="left" className="sm:hidden">
          <DrawerContent>
            <DrawerHeader>
              <h3>{t("booking.coursesEvents")}</h3>
            </DrawerHeader>
            <DrawerBody className="!p-0 overflow-hidden">
              <MobileSidebarContent />
            </DrawerBody>
          </DrawerContent>
        </Drawer>
        <Card className="w-full sm:w-3/4">
          <div data-tour="booking-tabs">
          <Tabs radius={"full"} color="secondary" selectedKey={mainTab} onSelectionChange={setMainTab}>
            <Tab key="personal" title={t("booking.personalSchedule")}>
              <div className="flex justify-between items-center gap-4 mb-2 flex-wrap">
                <div className="flex flex-wrap items-center gap-4">
                  <Switch size="sm" isSelected={autoJump} onValueChange={toggleAutoJump}>{t("booking.autoJump")}</Switch>
                  <Switch size="sm" isSelected={compactMode} onValueChange={toggleCompact}>{t("booking.compactMode")}</Switch>
                </div>
                <ExportIcsButton email={email} />
              </div>
              {compactMode ? (
                <CompactSchedule
                  events={userEvents}
                  defaultFrom={lecturerRange.from}
                  defaultTo={lecturerRange.to}
                />
              ) : (
                <CalendarByUser
                  _events={userEvents}
                  customSubtitle={customSubtitle}
                  selectedID={booking?.course?._id}
                  jumpTo={lecturerJump}
                  onEventUpdate={mutateUserEvent}
                  onEditDates={setEditSchedEvent}
                />
              )}
            </Tab>
            <Tab key="general" title={t("booking.classroomSchedule")}>
              {!booking ? (
                <div className="prose">
                  <h4>{t("booking.pleaseChoose")}</h4>
                </div>
              ) : !(booking.course?.teacher_email?.length) ? (
                // Hard block: a course with no lecturer must not be schedulable.
                <div className="flex items-start gap-3 bg-warning-50 border border-warning-200 rounded-xl p-4 text-warning-800">
                  <AlertTriangleIcon className="shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-semibold">{t("booking.noTeacherTitle")}</p>
                    <p className="text-sm mt-1">{t("booking.noTeacherDesc")}</p>
                  </div>
                </div>
              ) : !isLoadingBook ? (
                <CalendarByRoom
                  initRoom={
                    currentbooking && currentbooking[0]
                      ? currentbooking[0]?.room?._id
                      : undefined
                  }
                  rooms={roomsForCal}
                  extraEvents={extraEvents}
                  booking={booking}
                  onBooking={() => {
                    mutateCourse();
                    mutateUserEvent();
                  }}
                  isLock={booking?.course?.isLock}
                />
              ) : null}
            </Tab>
            <Tab key="class_sche" title={t("booking.classSchedule")}>
              <div className="flex flex-wrap items-center gap-4 mb-2">
                <Switch size="sm" isSelected={autoJump} onValueChange={toggleAutoJump}>{t("booking.autoJump")}</Switch>
                <Switch size="sm" isSelected={compactMode} onValueChange={toggleCompact}>{t("booking.compactMode")}</Switch>
              </div>
              {compactMode ? (
                <CompactSchedule
                  events={classEvents}
                  defaultFrom={classRange.from}
                  defaultTo={classRange.to}
                />
              ) : (
                <CalendarByUser
                  _events={classEvents}
                  selectedID={booking?.course?._id}
                  jumpTo={classJump}
                  onEventUpdate={mutateClassEvent}
                  onEditDates={setEditSchedEvent}
                />
              )}
            </Tab>
            <Tab key="event_booking" title={t("booking.eventBooking")}>
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
          </div>
        </Card>

        <EventInfoModal
          isOpen={isInfoOpen}
          onOpenChange={onInfoOpenChange}
          event={infoEvent}
          email={email}
          isAdmin={isAdmin}
          managedRooms={managedRooms}
          rooms={allRooms}
          onSuccess={refreshRoomEvents}
        />

        <EditScheduleModal
          isOpen={!!editSchedEvent}
          onClose={() => setEditSchedEvent(null)}
          event={editSchedEvent}
          onSuccess={() => {
            mutateUserEvent?.();
            mutateClassEvent();
            mutateCourse();
          }}
        />
      </div>
      </>
    );
  else return <div>{t("common.loginFirst")}</div>;
}
