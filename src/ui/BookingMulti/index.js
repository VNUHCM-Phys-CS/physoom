"use client";
import useSWR from "swr";
import { fetcheroptions, defaultLoc, getClass, customSubtitle } from "@/lib/ulti";
import Card from "../Card";
import _ from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
import CalendarByRoom from "../CalendarByRoom";
import { Input, ScrollShadow, Tab, Tabs, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip, Switch } from "@heroui/react";
import CalendarByUser from "../CalendarByUser";
import CompactSchedule from "../CompactSchedule";
import EditScheduleModal from "../EditScheduleModal";
import SearchCalender from "../SearchCalender";
import CourseListSelect from "../CourseListSelect";
import CourseModal from "../CourseModal";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import { useConfirm } from "../ConfirmDialog";
import { useI18n } from "@/i18n/I18nProvider";
import { toast } from "react-toastify";
import { useDisclosure, Button } from "@heroui/react";
import { ExternalLinkIcon, AlertTriangleIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import moment from "moment";
import useStore from "@/store/store";

export default function BookingMulti() {
  const router = useRouter();
  const { t } = useI18n();
  const setCourse_selected = useStore((s) => s.setCourse_selected);
  const { confirm, confirmDialog } = useConfirm();
  const [selectedTab, setSelectedTab] = useState("general");
  // Class-schedule scope: merge the group's sub-sections (…_A/_B/_C) or not.
  // Declared here (above the class-events fetch that reads it) to avoid a TDZ.
  const [mergeGroups, setMergeGroups] = useState(true);
  const [searhCourse, setSearhCourse] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState();
  const [selectedEventForDelete, setSelectedEventForDelete] = useState(null);
  const [infoEvent, setInfoEvent] = useState(null);
  const [editSchedOpen, setEditSchedOpen] = useState(false);
  const {
    isOpen: isDeleteModalOpen,
    onOpen: onDeleteModalOpen,
    onOpenChange: onDeleteModalOpenChange
  } = useDisclosure();
  const {
    isOpen: isInfoOpen,
    onOpen: onInfoOpen,
    onOpenChange: onInfoOpenChange,
  } = useDisclosure();

  const { data: course, mutate: mutateCourse } = useSWR(
    [
      "/api/course",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    ],
    fetcheroptions,
    { tags: ["course"], revalidate: 60 }
  );
  const courseSearchKey = useMemo(() => {
    return (course ?? []).map((d) => [
      `${d.teacher_email.join(" ")} ${d.location ?? defaultLoc} ${d.title} ${(d.class_id ?? []).join(" ")
        }`.toLowerCase(),
      d,
    ]);
  }, [course]);
  const currentCourse = useMemo(
    () =>
      searhCourse && searhCourse.trim() !== ""
        ? courseSearchKey
          .filter((c) => _.includes(c[0], searhCourse.toLowerCase()))
          .map((d) => d[1])
        : courseSearchKey.map((d) => d[1]),
    [searhCourse, courseSearchKey]
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
            limit: { $gte: booking?.course?.population },
          },
        }),
      },
    ],
    fetcheroptions,
    { tags: ["room"], revalidate: 60 }
  );

  const { data: currentbooking, isLoading: isLoadingBook, mutate: mutateCurrentBooking } = useSWR(
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

  // The room list is filtered by the course's location + capacity, so a course
  // already scheduled in a room that no longer matches (e.g. capacity < #SV)
  // would show no room. Always include the currently-booked room so it displays.
  const roomsForCal = useMemo(() => {
    const list = rooms ?? [];
    const booked = currentbooking?.[0]?.room;
    if (booked?._id && !list.some((r) => String(r._id) === String(booked._id))) {
      return [booked, ...list];
    }
    return list;
  }, [rooms, currentbooking]);

  const onSelectCourse = useCallback((course) => {
    // create new booking
    if (course) {
      // Calculate end_date from start_date and duration if possible
      let start_date = course.start_date;
      let end_date = undefined;
      if (start_date && course.duration) {
        end_date = new Date(start_date);
        end_date.setDate(end_date.getDate() + ((course.duration - 1) * 7));
      }

      const newBooking = {
        teacher_email: course?.teacher_email,
        room: undefined,
        course,
        time_slot: {
          start_date,
          end_date,
        },
      };
      setBooking(newBooking);
    } else {
      setBooking(undefined);
    }
    setSelectedCourseId(course?._id);
    setSelectedEventForDelete(null);
    setCourse_selected(course);
  }, [setCourse_selected]);
  const { data: _events, mutate: mutateUserEvent } = useSWR(
    [
      "/api/booking",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    ],
    fetcheroptions,
    { tags: ["booking"], revalidate: 60 }
  );
  const {
    data: userEvents,
    mutate: mutateBooking,
    isLoading: isLoadingEvent,
  } = useSWR(
    [
      booking?.teacher_email ? "/api/calendar-events/fetch" : null,
      {
        method: "POST",
        body: JSON.stringify({
          filter: { teacher_email: { $in: booking?.teacher_email } },
        }),
      },
    ],
    fetcheroptions,
    { tags: ["booking"], revalidate: 60 }
  );
  const { data: classEvents, isLoading: isLoadingclassEvent } = useSWR(
    [
      booking ? "/api/calendar-events/fetch" : null,
      {
        method: "POST",
        body: JSON.stringify({
          filter: { "course.class_id": getClass(booking?.course?.class_id) },
          isApproximate: mergeGroups,
        }),
      },
    ],
    fetcheroptions,
    { tags: ["booking"], revalidate: 60 }
  );

  // Distinct class_ids actually included in the class view (for the chips).
  const mergedClasses = useMemo(() => {
    const s = new Set();
    (classEvents ?? []).forEach((e) => (e.course?.class_id ?? []).forEach((c) => c && s.add(c)));
    return [...s].sort();
  }, [classEvents]);

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
      setMergeGroups(localStorage.getItem("physoom.mergeGroups") !== "0");
    } catch { /* ignore */ }
  }, []);
  const toggleMerge = useCallback((v) => {
    setMergeGroups(v);
    try { localStorage.setItem("physoom.mergeGroups", v ? "1" : "0"); } catch { /* ignore */ }
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
  const lecturerJump = useMemo(
    () => (autoJump ? (jumpDateFor(userEvents, booking?.course?._id) ?? courseStartTs) : undefined),
    [autoJump, userEvents, booking?.course?._id, courseStartTs, jumpDateFor]
  );
  const classJump = useMemo(
    () => (autoJump ? (jumpDateFor(classEvents, booking?.course?._id) ?? courseStartTs) : undefined),
    [autoJump, classEvents, booking?.course?._id, courseStartTs, jumpDateFor]
  );

  // Default compact range = span of the tab's events.
  const rangeOf = useCallback((events) => {
    const times = (events ?? []).filter((e) => e.start).map((e) => new Date(e.start).valueOf());
    if (!times.length) return { from: undefined, to: undefined };
    return { from: new Date(Math.min(...times)), to: new Date(Math.max(...times)) };
  }, []);
  const lecturerRange = useMemo(() => rangeOf(userEvents), [userEvents, rangeOf]);
  const classRange = useMemo(() => rangeOf(classEvents), [classEvents, rangeOf]);


  const onClickEvent = useCallback((e) => {
    const courseObj = e.resource?.course || e.data?.course || e.course;
    const courseId = (courseObj?._id || courseObj)?.toString();
    const series_id = e.resource?.series_id || e.data?.series_id || e.series_id;
    const time_slot = e.resource?.time_slot || e.data?.time_slot || e.time_slot;
    const room = e.resource?.room || e.data?.room || e.room;
    const eventRaw = e.resource || e.data || e;

    // Show info modal for the clicked event
    setInfoEvent(eventRaw);
    onInfoOpen();

    if (courseId) {
      setSelectedCourseId(courseId);
      setSelectedEventForDelete(eventRaw);
      const fullCourse = (course ?? []).find(c => c._id.toString() === courseId);
      if (fullCourse) {
        setBooking({
          teacher_email: fullCourse.teacher_email,
          room,
          course: fullCourse,
          series_id,
          time_slot: {
            ...time_slot,
            start_date: time_slot?.start_date || fullCourse.start_date,
          },
        });
      }
    }
  }, [course, onInfoOpen]);

  const onDoubleClick = useCallback((e) => {
    const eventRaw = e.resource || e.data || e;
    const roomTitle = eventRaw.room?.title;
    const eventId = eventRaw._id;
    if (roomTitle && eventId) {
      router.push(`/admin/room-booking?tab=calendar&room=${encodeURIComponent(roomTitle)}&eventId=${eventId}`);
    } else {
      onClickEvent(e);
      setSelectedTab("general");
    }
  }, [router, onClickEvent]);

  const handleDragStart = useCallback((e) => {
    const courseObj = e.resource?.course || e.data?.course || e.course;
    const courseId = (courseObj?._id || courseObj)?.toString();
    if (courseId) {
      setSelectedTab("general"); // Switch to Room tab when dragging starts
      if (selectedCourseId !== courseId) {
        setSelectedCourseId(courseId);
      }
    }
  }, [selectedCourseId]);
  const handleDeleteConfirm = async (mode, eventData) => {
    try {
      const courseId = eventData.course?._id || eventData.data?.course?._id || eventData.course;
      const res = await fetch("/api/booking/delete", {
        method: "POST",
        body: JSON.stringify({
          mode,
          id: mode === 'course' ? courseId : (eventData._id || eventData.id),
          series_id: eventData.series_id || eventData.data?.series_id,
          start: eventData.start
        }),
      });
      if (res.ok) {
        mutateCourse();
        mutateUserEvent();
        mutateBooking();
        mutateCurrentBooking();
        setSelectedEventForDelete(null);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = useCallback((eventData) => {
    setSelectedEventForDelete(eventData);
    onDeleteModalOpen();
  }, [onDeleteModalOpen]);

  // Move a planned course back to pending: delete its booking (keep the course).
  const handleUnschedule = useCallback(async ({ _id }) => {
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
        mutateCourse();
        mutateUserEvent();
        mutateBooking();
        mutateCurrentBooking();
        toast.success(t("course.moveToPending"));
      } else {
        toast.error("Failed to move course to pending.");
      }
    } catch {
      toast.error("Failed to move course to pending.");
    }
  }, [confirm, t, mutateCourse, mutateUserEvent, mutateBooking, mutateCurrentBooking]);

  const intructionText = useCallback(() => {
    return <p className="text-gray-700 font-medium">
      💡 You can <span className="font-bold">click</span> to select a course,
      or <span className="font-bold">double click</span> to edit the course.
    </p>
  }, []);
  return (
    <div className="flex py-2 px-2 mx-auto gap-2">
      {confirmDialog}
      <Card className="w-1/3 md:w-1/4  max-h-dvh flex flex-col">
        <Input
          label={t("common.search")}
          isClearable
          radius="lg"
          placeholder={t("common.typeToSearch")}
          value={searhCourse}
          onValueChange={setSearhCourse}
        />
        <CourseListSelect
          course={currentCourse}
          userEvents={_events}
          onSelectionChange={onSelectCourse}
          onUpdate={mutateCourse}
          currentId={selectedCourseId}
          onUnschedule={handleUnschedule}
        />
      </Card>
      <Card className="w-2/3 md:w-3/4 max-h-dvh">
        <ScrollShadow className="h-full">
          <Tabs radius={"full"} color="secondary" selectedKey={selectedTab} onSelectionChange={setSelectedTab}>
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
              ) : !isLoadingBook && !isLoadingEvent ? (
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
                    mutateBooking();
                    mutateCurrentBooking();
                  }}
                  onClickEvent={onClickEvent}
                  onDoubleClick={onDoubleClick}
                  onDelete={handleDelete}
                />
              ) : null}
            </Tab>
            <Tab key="personal" title={t("booking.lecturerSchedule")}>
              <div className="prose">
                <h3>{t("event.teacher")}: {booking?.teacher_email ?? t("common.noInfo")}</h3>
              </div>
              <div className="flex flex-wrap items-center gap-4 mb-2">
                <Switch size="sm" isSelected={autoJump} onValueChange={toggleAutoJump}>{t("booking.autoJump")}</Switch>
                <Switch size="sm" isSelected={compactMode} onValueChange={toggleCompact}>{t("booking.compactMode")}</Switch>
              </div>
              {compactMode ? (
                <CompactSchedule
                  events={userEvents}
                  defaultFrom={lecturerRange.from}
                  defaultTo={lecturerRange.to}
                  onSelectEvent={onClickEvent}
                />
              ) : (
                <CalendarByUser
                  _events={userEvents}
                  selectedID={booking?.course?._id}
                  jumpTo={lecturerJump}
                  onClickEvent={onClickEvent}
                  onDoubleClick={onDoubleClick}
                  onDragStart={handleDragStart}
                  customSubtitle={customSubtitle}
                  onDelete={handleDelete}
                  onEventUpdate={mutateUserEvent}
                />
              )}
              {intructionText()}
            </Tab>
            <Tab key="class_sche" title={t("booking.classSchedule")}>
              <div className="prose">
                <h3>{t("common.class")}: {(booking?.course?.class_id ?? []).join?.(", ") || booking?.course?.class_id || t("common.noInfo")}</h3>
              </div>
              <div className="flex flex-wrap items-center gap-4 mb-2">
                <Switch size="sm" isSelected={autoJump} onValueChange={toggleAutoJump}>{t("booking.autoJump")}</Switch>
                <Switch size="sm" isSelected={compactMode} onValueChange={toggleCompact}>{t("booking.compactMode")}</Switch>
                <Switch size="sm" isSelected={mergeGroups} onValueChange={toggleMerge}>{t("booking.mergeGroups")}</Switch>
              </div>
              {mergedClasses.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 mb-2 text-xs text-default-500">
                  <span>{mergeGroups ? t("booking.mergingClasses") : t("booking.exactClass")}:</span>
                  {mergedClasses.map((c) => (
                    <Chip key={c} size="sm" variant="flat"
                      color={c === (Array.isArray(booking?.course?.class_id) ? booking.course.class_id[0] : booking?.course?.class_id) ? "secondary" : "default"}>
                      {c}
                    </Chip>
                  ))}
                </div>
              )}
              {compactMode ? (
                <CompactSchedule
                  events={classEvents}
                  defaultFrom={classRange.from}
                  defaultTo={classRange.to}
                  onSelectEvent={onClickEvent}
                />
              ) : (
                <CalendarByUser
                  _events={classEvents}
                  selectedID={booking?.course?._id}
                  jumpTo={classJump}
                  onClickEvent={onClickEvent}
                  onDoubleClick={onDoubleClick}
                  onDragStart={handleDragStart}
                  customSubtitle={customSubtitle}
                  onDelete={handleDelete}
                  onEventUpdate={mutateUserEvent}
                />
              )}
              {intructionText()}
            </Tab>
            <Tab key="searchEvent" title={t("booking.searchSchedule")}>
              <SearchCalender onClickEvent={onClickEvent} onDoubleClick={onDoubleClick} onDragStart={handleDragStart} />
              {intructionText()}
            </Tab>
          </Tabs>
        </ScrollShadow>
      </Card>
      {isDeleteModalOpen && (
        <DeleteConfirmationModal
          isOpen={isDeleteModalOpen}
          onOpenChange={onDeleteModalOpenChange}
          onConfirm={handleDeleteConfirm}
          eventData={selectedEventForDelete}
        />
      )}

      {/* Event info modal */}
      <Modal isOpen={isInfoOpen} onOpenChange={onInfoOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader className="flex flex-col gap-1.5 pb-2">
                <span className="text-base font-semibold">{infoEvent?.title}</span>
                {infoEvent?.status && (
                  <Chip
                    size="sm" variant="flat"
                    color={infoEvent.status === "approved" ? "success" : infoEvent.status === "rejected" ? "danger" : "warning"}
                    className="w-fit capitalize"
                  >
                    {infoEvent.status}
                  </Chip>
                )}
              </ModalHeader>
              <ModalBody>
                <div className="flex flex-col gap-1.5 text-sm">
                  {infoEvent?.room?.title && (
                    <p><span className="text-default-500">{t("event.room")}:</span> {infoEvent.room.title}</p>
                  )}
                  {infoEvent?.start && (
                    <p>
                      <span className="text-default-500">{t("event.time")}:</span>{" "}
                      {moment(infoEvent.start).format("DD/MM/YYYY HH:mm")} – {moment(infoEvent.end).format("HH:mm")}
                    </p>
                  )}
                  {infoEvent?.course?.title && (
                    <p><span className="text-default-500">{t("rb.course")}:</span> {infoEvent.course.title}</p>
                  )}
                  {(infoEvent?.teacher_email ?? []).length > 0 && (
                    <p><span className="text-default-500">{t("event.teacher")}:</span> {infoEvent.teacher_email.join(", ")}</p>
                  )}
                  {(infoEvent?.course?.note || (infoEvent?.tags ?? []).length > 0) && (
                    <p><span className="text-default-500">{t("event.note")}:</span> {infoEvent?.course?.note || infoEvent.tags.join(", ")}</p>
                  )}
                  {(infoEvent?.course?.warnings ?? []).length > 0 && (
                    <p className="text-warning-600"><span className="text-default-500">⚠</span> {infoEvent.course.warnings.join("; ")}</p>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>{t("common.close")}</Button>
                {infoEvent?.course && infoEvent?.type !== "custom" && infoEvent?.time_slot?.start_time != null && (
                  <Button
                    color="secondary"
                    variant="flat"
                    onPress={() => { onClose(); setEditSchedOpen(true); }}
                  >
                    {t("sched.editDates")}
                  </Button>
                )}
                {infoEvent?.room?.title && infoEvent?._id && (
                  <Button
                    color="primary"
                    variant="flat"
                    endContent={<ExternalLinkIcon size={14} />}
                    onPress={() => {
                      onClose();
                      router.push(`/admin/room-booking?tab=calendar&room=${encodeURIComponent(infoEvent.room.title)}&eventId=${infoEvent._id}`);
                    }}
                  >
                    {t("rb.viewInBooking")}
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      <EditScheduleModal
        isOpen={editSchedOpen}
        onClose={() => setEditSchedOpen(false)}
        event={infoEvent}
        onSuccess={() => {
          mutateCourse();
          mutateUserEvent();
          mutateBooking();
          mutateCurrentBooking();
        }}
      />
    </div>
  );
}
