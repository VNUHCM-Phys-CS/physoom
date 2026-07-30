"use client";
import useSWR from "swr";
import { fetcheroptions, defaultLoc, getClass, customSubtitle } from "@/lib/ulti";
import Card from "../Card";
import _ from "lodash";
import { useCallback, useMemo, useState } from "react";
import CalendarByRoom from "../CalendarByRoom";
import { Input, ScrollShadow, Tab, Tabs, Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, Chip } from "@heroui/react";
import CalendarByUser from "../CalendarByUser";
import SearchCalender from "../SearchCalender";
import CourseListSelect from "../CourseListSelect";
import CourseModal from "../CourseModal";
import DeleteConfirmationModal from "../DeleteConfirmationModal";
import { useConfirm } from "../ConfirmDialog";
import { useI18n } from "@/i18n/I18nProvider";
import { toast } from "react-toastify";
import { useDisclosure, Button } from "@heroui/react";
import { ExternalLinkIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import moment from "moment";

export default function BookingMulti() {
  const router = useRouter();
  const { t } = useI18n();
  const { confirm, confirmDialog } = useConfirm();
  const [selectedTab, setSelectedTab] = useState("general");
  const [searhCourse, setSearhCourse] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState();
  const [selectedEventForDelete, setSelectedEventForDelete] = useState(null);
  const [infoEvent, setInfoEvent] = useState(null);
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
      `${d.teacher_email.join(" ")} ${d.location ?? defaultLoc} ${d.title
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
  }, []);
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
          label="Search"
          isClearable
          radius="lg"
          placeholder="Type to search..."
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
          <Tabs radius={"full"} color="secondary" selectedKey={selectedTab} onSelectionChange={setSelectedTab} destroyInactiveTabPanel={false}>
            <Tab key="general" title="Classroom schedule">
              {booking && !isLoadingBook && !isLoadingEvent ? (
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
                    mutateBooking();
                    mutateCurrentBooking();
                  }}
                  onClickEvent={onClickEvent}
                  onDoubleClick={onDoubleClick}
                  onDelete={handleDelete}
                />
              ) : (
                <div className="prose">
                  <h4>Please choose course</h4>
                </div>
              )}
            </Tab>
            <Tab key="personal" title="Lecturer schedule">
              <div className="prose">
                <h3>Lecturer: {booking?.teacher_email ?? "No info"}</h3>
              </div>
              <CalendarByUser
                _events={userEvents}
                selectedID={booking?.course?._id}
                onClickEvent={onClickEvent}
                onDoubleClick={onDoubleClick}
                onDragStart={handleDragStart}
                customSubtitle={customSubtitle}
                onDelete={handleDelete}
                onEventUpdate={mutateUserEvent}
              />
              {intructionText()}
            </Tab>
            <Tab key="class_sche" title="Class schedule">
              <div className="prose">
                <h3>Class: {booking?.course?.class_id ?? "No info"}</h3>
              </div>
              <CalendarByUser
                _events={classEvents}
                selectedID={booking?.course?._id}
                onClickEvent={onClickEvent}
                onDoubleClick={onDoubleClick}
                onDragStart={handleDragStart}
                customSubtitle={customSubtitle}
                onDelete={handleDelete}
                onEventUpdate={mutateUserEvent}
              />
              {intructionText()}
            </Tab>
            <Tab key="searchEvent" title="Search Schedule">
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
                    <p><span className="text-default-500">Room:</span> {infoEvent.room.title}</p>
                  )}
                  {infoEvent?.start && (
                    <p>
                      <span className="text-default-500">Time:</span>{" "}
                      {moment(infoEvent.start).format("DD/MM/YYYY HH:mm")} – {moment(infoEvent.end).format("HH:mm")}
                    </p>
                  )}
                  {infoEvent?.course?.title && (
                    <p><span className="text-default-500">Course:</span> {infoEvent.course.title}</p>
                  )}
                  {(infoEvent?.teacher_email ?? []).length > 0 && (
                    <p><span className="text-default-500">Teacher:</span> {infoEvent.teacher_email.join(", ")}</p>
                  )}
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>Close</Button>
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
                    View in Room Booking
                  </Button>
                )}
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
