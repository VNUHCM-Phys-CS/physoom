"use client";
import { useState, useEffect, useCallback } from "react";
import { useSession, signIn } from "next-auth/react";
import useSWR from "swr";
import {
  Button,
  Input,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Chip,
} from "@heroui/react";
import { Calendar, momentLocalizer } from "react-big-calendar";
import moment from "moment";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const fetcher = (url) => fetch(url).then((r) => r.json());
const postFetcher = (url, body) =>
  fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());

export default function BookRoomPage({ params }) {
  const { roomSlug } = params;
  const roomTitle = roomSlug.replace(/~/g, ":");
  const { data: session, status: authStatus } = useSession();

  const [room, setRoom] = useState(null);
  const [roomNotAvailable, setRoomNotAvailable] = useState(false);
  const [roomEvents, setRoomEvents] = useState([]);
  const [classEvents, setClassEvents] = useState([]);
  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState("week");

  // Booking form state
  const { isOpen, onOpen, onOpenChange, onClose } = useDisclosure();
  const [formTitle, setFormTitle] = useState("");
  const [formStart, setFormStart] = useState("");
  const [formEnd, setFormEnd] = useState("");
  const [formNote, setFormNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Load room info
  useEffect(() => {
    fetch("/api/room", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filter: { title: roomTitle } }),
    })
      .then((r) => r.json())
      .then((rooms) => {
        if (!rooms || rooms.length === 0) {
          setRoomNotAvailable(true);
          return;
        }
        const found = rooms[0];
        if (!found.isBookable) {
          setRoomNotAvailable(true);
          return;
        }
        setRoom(found);
      })
      .catch(() => setRoomNotAvailable(true));
  }, [roomTitle]);

  // Load room events (non-class)
  const loadRoomEvents = useCallback(() => {
    if (!room?._id) return;
    fetch(`/api/room-event?room=${room._id}`)
      .then((r) => r.json())
      .then((data) => setRoomEvents(Array.isArray(data) ? data : []));
  }, [room?._id]);

  // Load class events for this room
  const loadClassEvents = useCallback(() => {
    if (!room?._id) return;
    fetch("/api/calendar-events/fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ filter: { room: room._id } }),
    })
      .then((r) => r.json())
      .then((data) => setClassEvents(Array.isArray(data) ? data : []));
  }, [room?._id]);

  useEffect(() => {
    loadRoomEvents();
    loadClassEvents();
  }, [loadRoomEvents, loadClassEvents]);

  const allCalendarEvents = [...roomEvents, ...classEvents].map((e) => ({
    id: e._id,
    title: e.title || (e.course ? (typeof e.course === "object" ? e.course.title : "Class") : "Event"),
    start: new Date(e.start),
    end: new Date(e.end),
    resource: e,
  }));

  const eventStyleGetter = useCallback((event) => {
    const type = event.resource?.type || "class";
    let backgroundColor = "#3b82f6";
    if (type === "class") backgroundColor = "#3b82f6";
    else if (type === "holiday") backgroundColor = "#f59e0b";
    else if (type === "exam") backgroundColor = "#ef4444";
    else if (type === "personal") backgroundColor = "#ec4899";
    else if (type === "custom") {
      const s = event.resource?.status;
      if (s === "pending") backgroundColor = "#f59e0b";
      else if (s === "rejected") backgroundColor = "#9ca3af";
      else backgroundColor = "#10b981";
    } else backgroundColor = "#10b981";

    return {
      style: {
        backgroundColor,
        borderRadius: "6px",
        opacity: 0.85,
        color: "white",
        border: "none",
      },
    };
  }, []);

  const handleSlotSelect = useCallback(({ start, end }) => {
    setFormStart(moment(start).format("YYYY-MM-DDTHH:mm"));
    setFormEnd(moment(end).format("YYYY-MM-DDTHH:mm"));
    setFormTitle("");
    setFormNote("");
    setSubmitMsg(null);
    setSubmitError(null);
    onOpen();
  }, [onOpen]);

  const handleBookButton = useCallback(() => {
    setFormStart("");
    setFormEnd("");
    setFormTitle("");
    setFormNote("");
    setSubmitMsg(null);
    setSubmitError(null);
    onOpen();
  }, [onOpen]);

  const handleSubmit = async () => {
    if (!formTitle || !formStart || !formEnd) {
      setSubmitError("Please fill in Title, Start, and End.");
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    setSubmitMsg(null);
    try {
      const res = await fetch("/api/room-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: room._id,
          title: formTitle,
          start: formStart,
          end: formEnd,
          note: formNote,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitMsg(
          session?.user?.isAdmin
            ? "Booking confirmed!"
            : "Booking request submitted. Awaiting admin approval."
        );
        loadRoomEvents();
        setTimeout(() => onClose(), 2000);
      } else if (res.status === 409) {
        setSubmitError(
          `Conflict: "${data.conflict?.title}" is already booked from ${moment(data.conflict?.start).format("HH:mm")} to ${moment(data.conflict?.end).format("HH:mm")}.`
        );
      } else {
        setSubmitError(data.message || "Failed to submit booking.");
      }
    } catch (err) {
      setSubmitError("Network error.");
    } finally {
      setSubmitting(false);
    }
  };

  if (roomNotAvailable) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-danger mb-2">Room not available for booking</h1>
          <p className="text-default-500">This room does not exist or is not open for booking.</p>
        </div>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-default-400">Loading room info...</p>
      </div>
    );
  }

  return (
    <div className="md:container md:mx-auto p-4">
      {/* Room header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold">{room.title}</h1>
          <Chip color="success" variant="flat">Bookable</Chip>
          {room.location && <Chip variant="flat">{room.location}</Chip>}
          {room.limit && <Chip variant="flat">Max {room.limit} students</Chip>}
        </div>
        {room.note && <p className="text-default-500 mt-1">{room.note}</p>}
      </div>

      {/* Book button / auth */}
      <div className="mb-4 flex items-center gap-3">
        {authStatus === "unauthenticated" ? (
          <div className="flex items-center gap-3">
            <p className="text-default-500">You must be signed in to book this room.</p>
            <Button color="primary" onPress={() => signIn()}>Sign in to book</Button>
          </div>
        ) : authStatus === "authenticated" ? (
          <Button color="primary" onPress={handleBookButton}>
            Book this room
          </Button>
        ) : null}
      </div>

      {/* Legend */}
      <div className="flex gap-3 flex-wrap mb-4 text-sm">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-blue-500"></span> Class</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-emerald-500"></span> Approved booking</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-yellow-500"></span> Pending</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full inline-block bg-gray-400"></span> Rejected</span>
      </div>

      {/* Calendar */}
      <div className="h-[600px] w-full bg-white dark:bg-zinc-900 p-4 rounded-xl shadow">
        <Calendar
          localizer={localizer}
          events={allCalendarEvents}
          date={calDate}
          view={calView}
          onNavigate={setCalDate}
          onView={setCalView}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          eventPropGetter={eventStyleGetter}
          selectable={authStatus === "authenticated"}
          onSelectSlot={authStatus === "authenticated" ? handleSlotSelect : undefined}
          views={["month", "week", "day", "agenda"]}
          min={new Date(0, 0, 0, 7, 0, 0)}
          max={new Date(0, 0, 0, 22, 0, 0)}
        />
      </div>

      {/* Booking Modal */}
      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="lg">
        <ModalContent>
          {(onModalClose) => (
            <>
              <ModalHeader>Book {room.title}</ModalHeader>
              <ModalBody>
                {authStatus !== "authenticated" ? (
                  <div className="text-center py-4">
                    <p className="mb-3">You need to sign in to book this room.</p>
                    <Button color="primary" onPress={() => signIn()}>Sign in</Button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Input
                      label="Title"
                      placeholder="Booking purpose / event name"
                      value={formTitle}
                      onValueChange={setFormTitle}
                      isRequired
                    />
                    <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-sm text-default-500 mb-1 block">Start *</label>
                        <input
                          type="datetime-local"
                          className="w-full border border-default-200 rounded-lg px-3 py-2 text-sm"
                          value={formStart}
                          onChange={(e) => setFormStart(e.target.value)}
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-sm text-default-500 mb-1 block">End *</label>
                        <input
                          type="datetime-local"
                          className="w-full border border-default-200 rounded-lg px-3 py-2 text-sm"
                          value={formEnd}
                          onChange={(e) => setFormEnd(e.target.value)}
                        />
                      </div>
                    </div>
                    <Input
                      label="Note (optional)"
                      placeholder="Additional notes"
                      value={formNote}
                      onValueChange={setFormNote}
                    />
                    {!session?.user?.isAdmin && (
                      <p className="text-tiny text-default-400">
                        Your booking will be reviewed by an admin before confirmation.
                      </p>
                    )}
                    {submitError && (
                      <div className="bg-danger-50 text-danger rounded-lg p-3 text-sm">{submitError}</div>
                    )}
                    {submitMsg && (
                      <div className="bg-success-50 text-success rounded-lg p-3 text-sm">{submitMsg}</div>
                    )}
                  </div>
                )}
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onModalClose}>Cancel</Button>
                {authStatus === "authenticated" && !submitMsg && (
                  <Button color="primary" isLoading={submitting} onPress={handleSubmit}>
                    Submit Booking
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
