"use client";
import { useState, useCallback, useEffect, useMemo } from "react";
import useSWR from "swr";
import {
  Tabs,
  Tab,
  Table,
  TableHeader,
  TableColumn,
  TableBody,
  TableRow,
  TableCell,
  Button,
  Input,
  Chip,
  Select,
  SelectItem,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Switch,
} from "@heroui/react";
import { fetcher } from "@/lib/ulti";
import { useConfirm } from "@/ui/ConfirmDialog";
import moment from "moment";
import { Calendar, momentLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";

const localizer = momentLocalizer(moment);

const statusColorMap = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};

// ---- Book Modal ----
function BookModal({ isOpen, onOpenChange, rooms, onSuccess, initialStart, initialEnd, initialRoomId }) {
  const [form, setForm] = useState({ roomId: "", title: "", start: "", end: "", note: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setForm({
        roomId: initialRoomId || "",
        title: "",
        start: initialStart ? moment(initialStart).format("YYYY-MM-DDTHH:mm") : "",
        end: initialEnd ? moment(initialEnd).format("YYYY-MM-DDTHH:mm") : "",
        note: "",
      });
      setError("");
    }
  }, [isOpen, initialStart, initialEnd, initialRoomId]);

  const handleSubmit = async (onClose) => {
    setError("");
    if (!form.roomId || !form.title || !form.start || !form.end) {
      setError("Please fill all required fields.");
      return;
    }
    setLoading(true);
    try {
      // Normalize naive datetime-local strings to ISO on the client so the
      // server doesn't reinterpret them in its own (UTC) timezone.
      const payload = {
        ...form,
        start: form.start ? new Date(form.start).toISOString() : form.start,
        end: form.end ? new Date(form.end).toISOString() : form.end,
      };
      const res = await fetch("/api/room-event", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message || "Failed to create booking.");
      } else {
        setForm({ roomId: "", title: "", start: "", end: "", note: "" });
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError("Server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>Book a Room</ModalHeader>
            <ModalBody>
              {error && <p className="text-danger text-sm">{error}</p>}
              <Select
                label="Room"
                selectedKeys={form.roomId ? [form.roomId] : []}
                onSelectionChange={(keys) => setForm((f) => ({ ...f, roomId: Array.from(keys)[0] || "" }))}
                isRequired
              >
                {(rooms ?? []).map((r) => (
                  <SelectItem key={r._id} value={r._id}>
                    {r.title}{r.isBookable ? "" : " (not public)"}
                  </SelectItem>
                ))}
              </Select>
              <Input
                label="Title"
                value={form.title}
                onValueChange={(v) => setForm((f) => ({ ...f, title: v }))}
                isRequired
              />
              <Input
                label="Start"
                type="datetime-local"
                value={form.start}
                onValueChange={(v) => setForm((f) => ({ ...f, start: v }))}
                isRequired
              />
              <Input
                label="End"
                type="datetime-local"
                value={form.end}
                onValueChange={(v) => setForm((f) => ({ ...f, end: v }))}
                isRequired
              />
              <Input
                label="Note"
                value={form.note}
                onValueChange={(v) => setForm((f) => ({ ...f, note: v }))}
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>Cancel</Button>
              <Button color="primary" isLoading={loading} onPress={() => handleSubmit(onClose)}>
                Book (Auto-Approved)
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

// ---- Pending Events Tab ----
function PendingTab({ events, isLoading, mutate }) {
  const [actionLoading, setActionLoading] = useState({});
  const { confirm, confirmDialog } = useConfirm();

  const pendingEvents = (events ?? []).filter((e) => e.status === "pending");

  const handleAction = useCallback(
    async (id, status) => {
      setActionLoading((prev) => ({ ...prev, [id]: true }));
      try {
        await fetch(`/api/room-event/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });
        mutate();
      } catch (err) {
        console.error(err);
      } finally {
        setActionLoading((prev) => ({ ...prev, [id]: false }));
      }
    },
    [mutate]
  );

  const handleDelete = useCallback(
    async (id) => {
      const ok = await confirm({
        message: "Delete this booking request? This action cannot be undone.",
      });
      if (!ok) return;
      setActionLoading((prev) => ({ ...prev, [id]: true }));
      try {
        await fetch(`/api/room-event/${id}`, { method: "DELETE" });
        mutate();
      } catch (err) {
        console.error(err);
      } finally {
        setActionLoading((prev) => ({ ...prev, [id]: false }));
      }
    },
    [mutate, confirm]
  );

  const columns = [
    { key: "title", label: "Title" },
    { key: "room", label: "Room" },
    { key: "teacher_email", label: "Requested By" },
    { key: "start", label: "Start" },
    { key: "end", label: "End" },
    { key: "actions", label: "Actions" },
  ];

  const renderCell = (event, key) => {
    switch (key) {
      case "room":
        return event.room?.title || event.room || "-";
      case "teacher_email":
        return (event.teacher_email ?? []).join(", ") || "-";
      case "start":
        return moment(event.start).format("DD/MM/YYYY HH:mm");
      case "end":
        return moment(event.end).format("DD/MM/YYYY HH:mm");
      case "actions":
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              color="success"
              isLoading={actionLoading[event._id]}
              onPress={() => handleAction(event._id, "approved")}
            >
              Approve
            </Button>
            <Button
              size="sm"
              color="warning"
              variant="flat"
              isLoading={actionLoading[event._id]}
              onPress={() => handleAction(event._id, "rejected")}
            >
              Reject
            </Button>
            <Button
              size="sm"
              color="danger"
              variant="light"
              isLoading={actionLoading[event._id]}
              onPress={() => handleDelete(event._id)}
            >
              Delete
            </Button>
          </div>
        );
      default:
        return event[key] ?? "-";
    }
  };

  if (isLoading) return <p className="text-default-400">Loading...</p>;

  return (
    <>
      {confirmDialog}
      <Table aria-label="Pending events" isHeaderSticky classNames={{ wrapper: "max-h-[500px]" }}>
        <TableHeader columns={columns}>
          {(col) => <TableColumn key={col.key}>{col.label}</TableColumn>}
        </TableHeader>
        <TableBody items={pendingEvents} emptyContent="No pending requests for your rooms.">
          {(event) => (
            <TableRow key={event._id}>
              {(columnKey) => <TableCell>{renderCell(event, columnKey)}</TableCell>}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </>
  );
}

// ---- My Rooms Tab ----
function MyRoomsTab({ rooms, mutateRooms }) {
  const [savingId, setSavingId] = useState(null);
  const [editState, setEditState] = useState({});

  useEffect(() => {
    if (rooms) {
      const initial = {};
      rooms.forEach((r) => {
        initial[r._id] = {
          title: r.title,
          limit: r.limit,
          note: r.note || "",
          isBookable: !!r.isBookable,
        };
      });
      setEditState(initial);
    }
  }, [rooms]);

  const handleSave = async (roomId) => {
    setSavingId(roomId);
    try {
      const res = await fetch(`/api/room/${roomId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editState[roomId]),
      });
      if (res.ok) {
        mutateRooms();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingId(null);
    }
  };

  const updateField = (roomId, field, value) => {
    setEditState((prev) => ({
      ...prev,
      [roomId]: { ...prev[roomId], [field]: value },
    }));
  };

  if (!rooms || rooms.length === 0) {
    return <p className="text-default-400">No rooms assigned to you.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      {rooms.map((room) => {
        const state = editState[room._id] || {};
        return (
          <div key={room._id} className="border rounded-lg p-4 bg-content1 shadow-sm">
            <h3 className="text-lg font-semibold mb-3">{room.title}</h3>
            <div className="flex flex-col gap-3">
              <Input
                label="Title"
                value={state.title || ""}
                onValueChange={(v) => updateField(room._id, "title", v)}
              />
              <Input
                label="Limit (students)"
                type="number"
                value={String(state.limit ?? "")}
                onValueChange={(v) => updateField(room._id, "limit", Number(v))}
              />
              <Input
                label="Note"
                value={state.note || ""}
                onValueChange={(v) => updateField(room._id, "note", v)}
              />
              <div className="flex items-center justify-between border rounded-lg px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Public booking</p>
                  <p className="text-tiny text-default-400">Allow teachers to see and book this room</p>
                </div>
                <Switch
                  isSelected={!!state.isBookable}
                  onValueChange={(v) => updateField(room._id, "isBookable", v)}
                  size="sm"
                  aria-label="Toggle public booking"
                />
              </div>
              <Button
                color="primary"
                size="sm"
                className="self-start"
                isLoading={savingId === room._id}
                onPress={() => handleSave(room._id)}
              >
                Save
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ---- Calendar Tab ----
function RoomManagerCalendarTab({ customEvents, mutate, managedRooms }) {
  const { confirm, confirmDialog } = useConfirm();
  const roomIds = useMemo(() => (managedRooms ?? []).map((r) => r._id).join(","), [managedRooms]);
  const { data: classEvents } = useSWR(
    roomIds ? `/api/calendar-events?type=class&rooms=${roomIds}` : null,
    fetcher
  );

  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState("week");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [roomFilter, setRoomFilter] = useState(null);
  const [slotStart, setSlotStart] = useState(null);
  const [slotEnd, setSlotEnd] = useState(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isBookOpen, onOpen: onBookOpen, onOpenChange: onBookOpenChange } = useDisclosure();
  const [actionLoading, setActionLoading] = useState({});

  const handleSelectSlot = useCallback(({ start, end }) => {
    setSlotStart(start);
    setSlotEnd(end);
    onBookOpen();
  }, [onBookOpen]);

  const handleAddButton = useCallback(() => {
    setSlotStart(null);
    setSlotEnd(null);
    onBookOpen();
  }, [onBookOpen]);

  const calEvents = useMemo(() => {
    const matchRoom = (e) => {
      if (!roomFilter) return true;
      const title = typeof e.room === "object" ? e.room?.title : "";
      return title === roomFilter;
    };
    const custom = (customEvents ?? []).filter(matchRoom).map((e) => ({
      id: e._id,
      title: `${e.title}${e.room?.title ? " — " + e.room.title : ""}`,
      start: new Date(e.start),
      end: new Date(e.end),
      resource: e,
      eventType: "custom",
    }));
    const classes = (classEvents ?? []).filter(matchRoom).map((e) => ({
      id: e._id,
      title: `${e.title}${e.room?.title ? " — " + e.room.title : ""}`,
      start: new Date(e.start),
      end: new Date(e.end),
      resource: e,
      eventType: "class",
    }));
    return [...custom, ...classes];
  }, [customEvents, classEvents, roomFilter]);

  const eventPropGetter = (event) => {
    if (event.eventType === "class") {
      return { style: { backgroundColor: "#3b82f6", borderRadius: "6px", color: "white", border: "none", opacity: 0.85 } };
    }
    const status = event.resource?.status;
    let backgroundColor = "#10b981";
    if (status === "pending") backgroundColor = "#f59e0b";
    else if (status === "rejected") backgroundColor = "#9ca3af";
    return { style: { backgroundColor, borderRadius: "6px", color: "white", border: "none", opacity: 0.9 } };
  };

  const handleAction = async (id, status) => {
    setActionLoading((p) => ({ ...p, [id]: true }));
    try {
      await fetch(`/api/room-event/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      mutate();
    } finally {
      setActionLoading((p) => ({ ...p, [id]: false }));
    }
  };

  const handleDelete = async (id) => {
    const ok = await confirm({
      message: "Delete this event? This action cannot be undone.",
    });
    if (!ok) return;
    setActionLoading((p) => ({ ...p, [id]: true }));
    try {
      await fetch(`/api/room-event/${id}`, { method: "DELETE" });
      mutate();
    } finally {
      setActionLoading((p) => ({ ...p, [id]: false }));
    }
  };

  const ev = selectedEvent;

  return (
    <>
      {confirmDialog}
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Select
            label="Filter by room"
            selectedKeys={roomFilter ? [roomFilter] : []}
            onSelectionChange={(keys) => setRoomFilter(Array.from(keys)[0] || null)}
            className="max-w-xs"
            size="sm"
          >
            {(managedRooms ?? []).map((r) => (
              <SelectItem key={r.title}>{r.title}</SelectItem>
            ))}
          </Select>
          {roomFilter && (
            <Button size="sm" variant="light" onPress={() => setRoomFilter(null)}>Clear</Button>
          )}
          <div className="flex gap-3 text-sm flex-wrap">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Class</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Approved</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-yellow-500 inline-block" /> Pending</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-gray-400 inline-block" /> Rejected</span>
          </div>
        </div>
        <Button color="primary" size="sm" onPress={handleAddButton}>+ Add Event</Button>
      </div>
      <div className="h-[620px] bg-white dark:bg-zinc-900 p-4 rounded-xl shadow">
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
          onSelectEvent={(e) => { setSelectedEvent(e.resource); setSelectedType(e.eventType); onOpen(); }}
          selectable
          onSelectSlot={handleSelectSlot}
          views={["month", "week", "day", "agenda"]}
        />
      </div>
      {ev && (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  {ev.title}
                  {selectedType === "class"
                    ? <Chip color="primary" size="sm" variant="flat" className="w-fit">Class</Chip>
                    : <Chip color={statusColorMap[ev.status] || "default"} size="sm" variant="flat" className="w-fit">{ev.status}</Chip>
                  }
                </ModalHeader>
                <ModalBody>
                  <div className="flex flex-col gap-1 text-sm">
                    <p><span className="text-default-500">Room:</span> {ev.room?.title || "-"}</p>
                    <p><span className="text-default-500">Start:</span> {moment(ev.start).format("DD/MM/YYYY HH:mm")}</p>
                    <p><span className="text-default-500">End:</span> {moment(ev.end).format("DD/MM/YYYY HH:mm")}</p>
                    <p><span className="text-default-500">Teacher:</span> {(ev.teacher_email ?? []).join(", ") || "-"}</p>
                    {selectedType === "class" && ev.course && (
                      <p><span className="text-default-500">Course:</span> {typeof ev.course === "object" ? ev.course.title : ev.course}</p>
                    )}
                    {selectedType === "custom" && (ev.tags ?? []).length > 0 && (
                      <p><span className="text-default-500">Note:</span> {ev.tags.join(", ")}</p>
                    )}
                  </div>
                  {selectedType === "class" && (
                    <p className="text-tiny text-default-400 mt-2">Course scheduling is managed by admins only.</p>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={onClose}>Close</Button>
                  {selectedType === "custom" && (
                    <>
                      <Button size="sm" color="warning" variant="flat"
                        isDisabled={ev.status === "rejected"} isLoading={actionLoading[ev._id]}
                        onPress={() => { handleAction(ev._id, "rejected"); onClose(); }}>Reject</Button>
                      <Button size="sm" color="success"
                        isDisabled={ev.status === "approved"} isLoading={actionLoading[ev._id]}
                        onPress={() => { handleAction(ev._id, "approved"); onClose(); }}>Approve</Button>
                      <Button size="sm" color="danger" variant="light"
                        isLoading={actionLoading[ev._id]}
                        onPress={() => { handleDelete(ev._id); onClose(); }}>Delete</Button>
                    </>
                  )}
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}
      <BookModal
        isOpen={isBookOpen}
        onOpenChange={onBookOpenChange}
        rooms={managedRooms}
        onSuccess={mutate}
        initialStart={slotStart}
        initialEnd={slotEnd}
        initialRoomId={managedRooms?.find((r) => r.title === roomFilter)?._id || ""}
      />
    </>
  );
}

// ---- Main Page ----
export default function RoomManagerPage() {
  const { data: events, mutate: mutateEvents, isLoading: eventsLoading } = useSWR(
    "/api/room-event?managed=true",
    fetcher
  );
  const { data: managedRooms, mutate: mutateRooms } = useSWR("/api/room/managed", fetcher);

  const { isOpen: isBookOpen, onOpen: onBookOpen, onOpenChange: onBookOpenChange } = useDisclosure();

  const pendingCount = (events ?? []).filter((e) => e.status === "pending").length;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Room Manager Dashboard</h1>
      <Tabs aria-label="Room manager tabs">
        <Tab key="pending" title={`Pending (${pendingCount})`}>
          <div className="mt-4">
            <PendingTab events={events} isLoading={eventsLoading} mutate={mutateEvents} />
          </div>
        </Tab>
        <Tab key="book" title="Book">
          <div className="mt-4">
            <p className="text-default-500 mb-4">
              Create a booking for one of your managed rooms. Bookings are auto-approved.
            </p>
            <Button color="primary" onPress={onBookOpen}>
              New Booking
            </Button>
            <BookModal
              isOpen={isBookOpen}
              onOpenChange={onBookOpenChange}
              rooms={managedRooms}
              onSuccess={mutateEvents}
            />
          </div>
        </Tab>
        <Tab key="calendar" title="Calendar">
          <div className="mt-4">
            <RoomManagerCalendarTab customEvents={events ?? []} mutate={mutateEvents} managedRooms={managedRooms} />
          </div>
        </Tab>
        <Tab key="rooms" title="My Rooms">
          <div className="mt-4">
            <MyRoomsTab rooms={managedRooms} mutateRooms={mutateRooms} />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
