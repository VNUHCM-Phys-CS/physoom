"use client";
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import useSWR from "swr";
import { RoomEventModal, UserPicker } from "@/ui/RoomEventModal";
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
  Autocomplete,
  AutocompleteItem,
  Switch,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
} from "@heroui/react";
import { fetcher } from "@/lib/ulti";
import { useConfirm } from "@/ui/ConfirmDialog";
import moment from "moment";
import { Calendar, momentLocalizer } from "react-big-calendar";
import "react-big-calendar/lib/css/react-big-calendar.css";
import { Link2Icon, CheckIcon } from "lucide-react";

const localizer = momentLocalizer(moment);

const statusColorMap = {
  pending: "warning",
  approved: "success",
  rejected: "danger",
};


// ---- Edit Managers Modal ----
function EditManagersModal({ isOpen, onOpenChange, room, onSuccess }) {
  const { data: users } = useSWR("/api/user/list", fetcher);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setManagers(room?.managers ?? []);
      setError("");
    }
  }, [isOpen, room]);

  const handleSave = async (onClose) => {
    setError("");
    setLoading(true);
    try {
      const res = await fetch(`/api/room/${room._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ managers }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Failed to update managers.");
      } else {
        onSuccess();
        onClose();
      }
    } catch {
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
            <ModalHeader>Edit Managers — {room?.title}</ModalHeader>
            <ModalBody>
              {error && <p className="text-danger text-sm">{error}</p>}
              <UserPicker
                label="Managers"
                users={users}
                selectedEmails={managers}
                onChange={setManagers}
                multiple
              />
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>Cancel</Button>
              <Button color="primary" isLoading={loading} onPress={() => handleSave(onClose)}>
                Save
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}

// ---- Events Table (shared between Pending and All Events tabs) ----
function EventsTable({ events, actionLoading, onAction, onDelete, showRoomFilter, rooms }) {
  const [roomFilter, setRoomFilter] = useState("");
  const [roomInput, setRoomInput] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const filteredRooms = useMemo(
    () => (rooms ?? []).filter((r) => r.title.toLowerCase().includes(roomInput.toLowerCase())),
    [rooms, roomInput]
  );

  const filtered = (events ?? []).filter((e) => {
    if (roomFilter) {
      const title = typeof e.room === "object" ? e.room?.title : "";
      if (title !== roomFilter) return false;
    }
    if (statusFilter && e.status !== statusFilter) return false;
    return true;
  });

  const columns = [
    { key: "title", label: "Title" },
    { key: "room", label: "Room" },
    { key: "teacher_email", label: "Requested By" },
    { key: "start", label: "Start" },
    { key: "end", label: "End" },
    { key: "status", label: "Status" },
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
      case "status":
        return (
          <Chip color={statusColorMap[event.status] || "default"} size="sm" variant="flat">
            {event.status}
          </Chip>
        );
      case "actions":
        return (
          <div className="flex gap-2">
            <Button
              size="sm"
              color="success"
              isLoading={actionLoading[event._id]}
              isDisabled={event.status === "approved"}
              onPress={() => onAction(event._id, "approved")}
            >
              Approve
            </Button>
            <Button
              size="sm"
              color="warning"
              variant="flat"
              isLoading={actionLoading[event._id]}
              isDisabled={event.status === "rejected"}
              onPress={() => onAction(event._id, "rejected")}
            >
              Reject
            </Button>
            <Button
              size="sm"
              color="danger"
              variant="light"
              isLoading={actionLoading[event._id]}
              onPress={() => onDelete(event._id)}
            >
              Delete
            </Button>
          </div>
        );
      default:
        return event[key] ?? "-";
    }
  };

  return (
    <div>
      {showRoomFilter && (
        <div className="flex gap-3 mb-4">
          <Autocomplete
            label="Filter by room"
            items={filteredRooms}
            inputValue={roomInput}
            onInputChange={(v) => { setRoomInput(v); if (!v) setRoomFilter(""); }}
            selectedKey={roomFilter || null}
            onSelectionChange={(key) => {
              setRoomFilter(key || "");
              setRoomInput(key || "");
            }}
            className="max-w-xs"
          >
            {(r) => <AutocompleteItem key={r.title} textValue={r.title}>{r.title}</AutocompleteItem>}
          </Autocomplete>
          <Select
            label="Filter by status"
            selectedKeys={statusFilter ? [statusFilter] : []}
            onSelectionChange={(keys) => setStatusFilter(Array.from(keys)[0] || "")}
            className="max-w-xs"
          >
            {[
              { key: "", label: "All statuses" },
              { key: "pending", label: "Pending" },
              { key: "approved", label: "Approved" },
              { key: "rejected", label: "Rejected" },
            ].map((s) => (
              <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
            ))}
          </Select>
        </div>
      )}
      <Table aria-label="Events table" isHeaderSticky classNames={{ wrapper: "max-h-[500px]" }}>
        <TableHeader columns={columns}>
          {(col) => <TableColumn key={col.key}>{col.label}</TableColumn>}
        </TableHeader>
        <TableBody items={filtered} emptyContent="No events found">
          {(event) => (
            <TableRow key={event._id}>
              {(columnKey) => <TableCell>{renderCell(event, columnKey)}</TableCell>}
            </TableRow>
          )}
        </TableBody>
      </Table>
    </div>
  );
}

// ---- Rooms Tab with Managers ----
function RoomsTab({ rooms, mutateRooms }) {
  const [editingRoom, setEditingRoom] = useState(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [search, setSearch] = useState("");
  const [bookableFilter, setBookableFilter] = useState("all");
  const [copiedRoomId, setCopiedRoomId] = useState(null);

  const handleCopyLink = useCallback((room) => {
    const url = `${window.location.origin}/booking?tab=event_booking&room=${room._id}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopiedRoomId(room._id);
      setTimeout(() => setCopiedRoomId(null), 2000);
    });
  }, []);
  const [locationFilter, setLocationFilter] = useState("");
  const { data: users } = useSWR("/api/user/list", fetcher);

  const openEditManagers = (room) => {
    setEditingRoom(room);
    onOpen();
  };

  const toggleBookable = useCallback(async (room) => {
    const newValue = !room.isBookable;
    mutateRooms(
      (current) => current?.map((r) =>
        r._id?.toString() === room._id?.toString() ? { ...r, isBookable: newValue } : r
      ),
      false
    );
    try {
      const res = await fetch(`/api/room/${room._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isBookable: newValue }),
      });
      if (!res.ok) mutateRooms();
    } catch {
      mutateRooms();
    }
  }, [mutateRooms]);

  const columns = [
    { key: "title", label: "Room" },
    { key: "location", label: "Location" },
    { key: "limit", label: "Limit" },
    { key: "isBookable", label: "Public booking" },
    { key: "managers", label: "Managers" },
    { key: "actions", label: "Actions" },
  ];

  const renderCell = (room, key) => {
    switch (key) {
      case "isBookable":
        return (
          <Switch
            isSelected={!!room.isBookable}
            size="sm"
            onValueChange={() => toggleBookable(room)}
            aria-label="Toggle public booking"
          />
        );
      case "managers":
        if (!(room.managers ?? []).length)
          return <span className="text-default-400 text-sm italic">None</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {room.managers.map((email) => {
              const user = (users ?? []).find((u) => u.email === email);
              const name = user?.name;
              const initials = name
                ? name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
                : email.slice(0, 2).toUpperCase();
              return (
                <div
                  key={email}
                  className="flex items-center gap-1.5 bg-default-100 rounded-full pl-1 pr-2.5 py-0.5"
                  title={email}
                >
                  <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                    {initials}
                  </span>
                  <span className="text-xs font-medium truncate max-w-[120px]">
                    {name || email}
                  </span>
                </div>
              );
            })}
          </div>
        );
      case "actions":
        return (
          <div className="flex gap-2">
            {room.isBookable && (
              <Button
                size="sm"
                variant="flat"
                color={copiedRoomId === room._id ? "success" : "default"}
                startContent={copiedRoomId === room._id ? <CheckIcon size={13} /> : <Link2Icon size={13} />}
                onPress={() => handleCopyLink(room)}
              >
                {copiedRoomId === room._id ? "Copied!" : "Share"}
              </Button>
            )}
            <Button size="sm" variant="flat" onPress={() => openEditManagers(room)}>
              Edit Managers
            </Button>
          </div>
        );
      default:
        return room[key] ?? "-";
    }
  };

  const locations = useMemo(() =>
    [...new Set((rooms ?? []).map((r) => r.location).filter(Boolean))],
    [rooms]
  );

  const filteredRooms = useMemo(() => {
    const q = search.toLowerCase();
    return (rooms ?? []).filter((r) => {
      if (q && !r.title?.toLowerCase().includes(q) && !r.location?.toLowerCase().includes(q) && !(r.managers ?? []).some((m) => m.toLowerCase().includes(q))) return false;
      if (bookableFilter === "public" && !r.isBookable) return false;
      if (bookableFilter === "private" && r.isBookable) return false;
      if (locationFilter && r.location !== locationFilter) return false;
      return true;
    });
  }, [rooms, search, bookableFilter, locationFilter]);

  return (
    <>
      <div className="flex gap-3 mb-4 flex-wrap items-end">
        <Input
          placeholder="Search by name, location or manager..."
          value={search}
          onValueChange={setSearch}
          className="max-w-xs"
          size="sm"
          isClearable
          onClear={() => setSearch("")}
        />
        <Select
          label="Public booking"
          selectedKeys={[bookableFilter]}
          onSelectionChange={(keys) => setBookableFilter(Array.from(keys)[0] || "all")}
          className="max-w-[160px]"
          size="sm"
        >
          <SelectItem key="all">All</SelectItem>
          <SelectItem key="public">Public</SelectItem>
          <SelectItem key="private">Private</SelectItem>
        </Select>
        {locations.length > 0 && (
          <Select
            label="Location"
            selectedKeys={locationFilter ? [locationFilter] : [""]}
            onSelectionChange={(keys) => setLocationFilter(Array.from(keys)[0] === "" ? "" : Array.from(keys)[0] || "")}
            className="max-w-[160px]"
            size="sm"
          >
            <SelectItem key="">All locations</SelectItem>
            {locations.map((loc) => (
              <SelectItem key={loc}>{loc}</SelectItem>
            ))}
          </Select>
        )}
        <span className="text-default-400 text-sm self-center">{filteredRooms.length} room{filteredRooms.length !== 1 ? "s" : ""}</span>
      </div>
      <Table aria-label="Rooms table" isHeaderSticky classNames={{ wrapper: "max-h-[500px]" }}>
        <TableHeader columns={columns}>
          {(col) => <TableColumn key={col.key}>{col.label}</TableColumn>}
        </TableHeader>
        <TableBody items={filteredRooms} emptyContent="No rooms found">
          {(room) => (
            <TableRow key={room._id}>
              {(columnKey) => <TableCell>{renderCell(room, columnKey)}</TableCell>}
            </TableRow>
          )}
        </TableBody>
      </Table>
      {editingRoom && (
        <EditManagersModal
          isOpen={isOpen}
          onOpenChange={onOpenChange}
          room={editingRoom}
          onSuccess={mutateRooms}
        />
      )}
    </>
  );
}

// ---- Calendar Tab ----
function CalendarTab({ customEvents, onAction, onDelete, actionLoading, onGoToCourse, rooms, onEventsChanged, initialRoom = null, initialEventId = null }) {
  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin;

  const [calDate, setCalDate] = useState(new Date());
  const [calView, setCalView] = useState("week");
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedType, setSelectedType] = useState(null); // "class" | "custom"
  const [roomFilter, setRoomFilter] = useState(initialRoom);
  const [roomInput, setRoomInput] = useState(initialRoom || "");
  const pendingEventId = useRef(initialEventId);

  const selectedRoomId = useMemo(() => rooms?.find((r) => r.title === roomFilter)?._id ?? null, [rooms, roomFilter]);
  const { data: classEvents } = useSWR(
    selectedRoomId ? `/api/calendar-events?type=class&rooms=${selectedRoomId}` : null,
    fetcher
  );
  const [slotStart, setSlotStart] = useState(null);
  const [slotEnd, setSlotEnd] = useState(null);
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const { isOpen: isAddOpen, onOpen: onAddOpen, onOpenChange: onAddOpenChange } = useDisclosure();
  const { isOpen: isEditOpen, onOpen: onEditOpen, onOpenChange: onEditOpenChange } = useDisclosure();

  const handleSelectSlot = useCallback(({ start, end }) => {
    setSlotStart(start);
    setSlotEnd(end);
    onAddOpen();
  }, [onAddOpen]);

  const handleAddButton = useCallback(() => {
    setSlotStart(null);
    setSlotEnd(null);
    onAddOpen();
  }, [onAddOpen]);

  const filteredRooms = useMemo(
    () => (rooms ?? []).filter((r) => r.title.toLowerCase().includes(roomInput.toLowerCase())),
    [rooms, roomInput]
  );

  const calEvents = useMemo(() => {
    if (!roomFilter) return [];
    const matchRoom = (e) => {
      const title = typeof e.room === "object" ? e.room?.title : "";
      return title === roomFilter;
    };
    const custom = (customEvents ?? []).filter(matchRoom).map((e) => ({
      id: e._id,
      title: e.title,
      start: new Date(e.start),
      end: new Date(e.end),
      resource: e,
      eventType: "custom",
    }));
    const classes = (classEvents ?? []).map((e) => ({
      id: e._id,
      title: e.title,
      start: new Date(e.start),
      end: new Date(e.end),
      resource: e,
      eventType: "class",
    }));
    return [...custom, ...classes];
  }, [customEvents, classEvents, roomFilter]);

  // Auto-open event detail when navigated from another page
  useEffect(() => {
    if (!pendingEventId.current) return;
    const all = [...(customEvents ?? []), ...(classEvents ?? [])];
    const ev = all.find((e) => String(e._id) === pendingEventId.current);
    if (ev) {
      setSelectedEvent(ev);
      setSelectedType(ev.type === "class" ? "class" : "custom");
      onOpen();
      pendingEventId.current = null;
    }
  }, [customEvents, classEvents, onOpen]);

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

  const handleSelectEvent = (event) => {
    setSelectedEvent(event.resource);
    setSelectedType(event.eventType);
    onOpen();
  };

  const ev = selectedEvent;

  return (
    <>
      <div className="flex items-center justify-between gap-4 mb-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <Autocomplete
            label="Filter by room"
            items={filteredRooms}
            inputValue={roomInput}
            onInputChange={(v) => { setRoomInput(v); if (!v) setRoomFilter(null); }}
            selectedKey={roomFilter}
            onSelectionChange={(key) => {
              setRoomFilter(key || null);
              setRoomInput(key || "");
            }}
            className="max-w-xs"
            size="sm"
          >
            {(r) => <AutocompleteItem key={r.title} textValue={r.title}>{r.title}</AutocompleteItem>}
          </Autocomplete>
          {roomFilter && (() => {
            const room = (rooms ?? []).find((r) => r.title === roomFilter);
            if (!room) return null;
            return (
              <div className="flex items-center gap-3 text-sm bg-default-100 rounded-xl px-3 py-2">
                <div className="flex flex-col">
                  <span className="font-medium">{room.title}</span>
                  {room.location && <span className="text-default-400 text-xs">{room.location}</span>}
                </div>
                {room.limit > 0 && (
                  <span className="text-default-500 text-xs">Capacity: <strong>{room.limit}</strong></span>
                )}
                <Chip size="sm" variant="flat" color={room.isBookable ? "success" : "default"}>
                  {room.isBookable ? "Public" : "Private"}
                </Chip>
                {(room.managers ?? []).length > 0 && (
                  <span className="text-default-400 text-xs hidden sm:block">
                    Managers: {room.managers.join(", ")}
                  </span>
                )}
              </div>
            );
          })()}
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
            onSelectEvent={handleSelectEvent}
            selectable
            onSelectSlot={handleSelectSlot}
            views={["month", "week", "day", "agenda"]}
          />
        )}
      </div>
      {ev && (
        <Modal isOpen={isOpen} onOpenChange={onOpenChange}>
          <ModalContent>
            {(onClose) => (
              <>
                <ModalHeader className="flex flex-col gap-1">
                  {ev.title}
                  {selectedType === "custom" && (
                    <Chip color={statusColorMap[ev.status] || "default"} size="sm" variant="flat" className="w-fit">
                      {ev.status}
                    </Chip>
                  )}
                  {selectedType === "class" && (
                    <Chip color="primary" size="sm" variant="flat" className="w-fit">Class</Chip>
                  )}
                </ModalHeader>
                <ModalBody>
                  <div className="flex flex-col gap-1 text-sm">
                    <p><span className="text-default-500">Room:</span> {ev.room?.title || "-"}</p>
                    <p><span className="text-default-500">Start:</span> {moment(ev.start).format("DD/MM/YYYY HH:mm")}</p>
                    <p><span className="text-default-500">End:</span> {moment(ev.end).format("DD/MM/YYYY HH:mm")}</p>
                    <p><span className="text-default-500">Created by:</span> {(ev.teacher_email ?? []).join(", ") || "-"}</p>
                    {selectedType === "class" && ev.course && (
                      <p><span className="text-default-500">Course:</span> {typeof ev.course === "object" ? ev.course.title : ev.course}</p>
                    )}
                    {selectedType === "custom" && (ev.host ?? []).length > 0 && (
                      <p><span className="text-default-500">Host:</span> {ev.host.join(", ")}</p>
                    )}
                    {selectedType === "custom" && (ev.attendees ?? []).length > 0 && (
                      <p><span className="text-default-500">Attendees:</span> {ev.attendees.join(", ")}</p>
                    )}
                    {selectedType === "custom" && (ev.tags ?? []).length > 0 && (
                      <p><span className="text-default-500">Note:</span> {ev.tags.join(", ")}</p>
                    )}
                  </div>
                  {selectedType === "class" && !isAdmin && (
                    <p className="text-tiny text-default-400 mt-2">Only admins can manage course bookings.</p>
                  )}
                </ModalBody>
                <ModalFooter>
                  <Button variant="flat" onPress={onClose}>Close</Button>
                  {selectedType === "class" && isAdmin && (
                    <Button color="primary" onPress={() => { onClose(); onGoToCourse(ev); }}>
                      Manage Course Booking
                    </Button>
                  )}
                  {selectedType === "custom" && (() => {
                    const userEmail = session?.user?.email;
                    const isCreatorOrHost =
                      (ev.teacher_email ?? []).includes(userEmail) ||
                      (ev.host ?? []).includes(userEmail);
                    const canEdit = isAdmin || isCreatorOrHost;
                    return (
                      <>
                        {canEdit && (
                          <Button size="sm" variant="flat" color="secondary"
                            onPress={() => { onClose(); onEditOpen(); }}>
                            Edit
                          </Button>
                        )}
                        {(isAdmin) && (
                          <>
                            <Button size="sm" color="warning" variant="flat"
                              isDisabled={ev.status === "rejected"} isLoading={actionLoading[ev._id]}
                              onPress={() => { onAction(ev._id, "rejected"); onClose(); }}>Reject</Button>
                            <Button size="sm" color="success"
                              isDisabled={ev.status === "approved"} isLoading={actionLoading[ev._id]}
                              onPress={() => { onAction(ev._id, "approved"); onClose(); }}>Approve</Button>
                            <Button size="sm" color="danger" variant="light"
                              isLoading={actionLoading[ev._id]}
                              onPress={() => { onDelete(ev._id); onClose(); }}>Delete</Button>
                          </>
                        )}
                      </>
                    );
                  })()}
                </ModalFooter>
              </>
            )}
          </ModalContent>
        </Modal>
      )}
      <RoomEventModal
        isOpen={isAddOpen}
        onOpenChange={onAddOpenChange}
        rooms={rooms}
        isPrivileged={isAdmin}
        createdBy={session?.user?.email || ""}
        onSuccess={onEventsChanged}
        initialStart={slotStart}
        initialEnd={slotEnd}
        initialRoomId={String(selectedRoomId || "")}
      />
      {ev && (
        <RoomEventModal
          isOpen={isEditOpen}
          onOpenChange={onEditOpenChange}
          event={ev}
          rooms={rooms}
          isPrivileged={isAdmin}
          onSuccess={onEventsChanged}
        />
      )}
    </>
  );
}

// ---- Main Page ----
export default function RoomBookingPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: events, mutate: mutateEvents, isLoading: eventsLoading } = useSWR(
    "/api/calendar-events?type=custom",
    fetcher
  );
  const { data: rooms, mutate: mutateRooms } = useSWR("/api/room", fetcher);

  const [actionLoading, setActionLoading] = useState({});
  const { confirm, confirmDialog } = useConfirm();
  const [selectedTab, setSelectedTab] = useState(searchParams.get("tab") || "pending");
  const initRoom = searchParams.get("room") || null;
  const initEventId = searchParams.get("eventId") || null;
  const { isOpen: isAddOpen, onOpen: onAddOpen, onOpenChange: onAddOpenChange } = useDisclosure();

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
        mutateEvents();
      } catch (err) {
        console.error(err);
      } finally {
        setActionLoading((prev) => ({ ...prev, [id]: false }));
      }
    },
    [mutateEvents]
  );

  const handleDelete = useCallback(
    async (id) => {
      const ok = await confirm({
        message: "Delete this event? This action cannot be undone.",
      });
      if (!ok) return;
      setActionLoading((prev) => ({ ...prev, [id]: true }));
      try {
        await fetch(`/api/room-event/${id}`, { method: "DELETE" });
        mutateEvents();
      } catch (err) {
        console.error(err);
      } finally {
        setActionLoading((prev) => ({ ...prev, [id]: false }));
      }
    },
    [mutateEvents, confirm]
  );

  const handleGoToCourse = useCallback((ev) => {
    // Navigate to admin booking page; if course has an ID, pass it as query param
    const courseId = typeof ev.course === "object" ? ev.course?._id : ev.course;
    router.push(courseId ? `/admin/booking?course=${courseId}` : "/admin/booking");
  }, [router]);

  // Optimistically merge a created/updated event into the cache so the
  // calendar re-renders immediately, then revalidate in the background.
  const handleEventSaved = useCallback((savedEvent) => {
    if (!savedEvent?._id) {
      mutateEvents();
      return;
    }
    mutateEvents((cur) => {
      const list = cur ?? [];
      const idx = list.findIndex((e) => String(e._id) === String(savedEvent._id));
      if (idx === -1) return [...list, savedEvent];
      const next = [...list];
      next[idx] = { ...next[idx], ...savedEvent };
      return next;
    }, { revalidate: true });
  }, [mutateEvents]);

  return (
    <div>
      {confirmDialog}
      <h1 className="text-2xl font-bold mb-4">Room Booking Management</h1>
      <Tabs aria-label="Room booking tabs" selectedKey={selectedTab} onSelectionChange={setSelectedTab}>
        <Tab key="pending" title={`Pending (${pendingEvents.length})`}>
          <div className="mt-4">
            {eventsLoading ? (
              <p className="text-default-400">Loading...</p>
            ) : (
              <EventsTable
                events={pendingEvents}
                actionLoading={actionLoading}
                onAction={handleAction}
                onDelete={handleDelete}
                showRoomFilter={false}
              />
            )}
          </div>
        </Tab>
        <Tab key="all" title="All Events">
          <div className="mt-4">
            <div className="flex justify-end mb-4">
              <Button color="primary" onPress={onAddOpen}>Add Booking</Button>
            </div>
            {eventsLoading ? (
              <p className="text-default-400">Loading...</p>
            ) : (
              <EventsTable
                events={events ?? []}
                actionLoading={actionLoading}
                onAction={handleAction}
                onDelete={handleDelete}
                showRoomFilter={true}
                rooms={rooms}
              />
            )}
          </div>
          <RoomEventModal
            isOpen={isAddOpen}
            onOpenChange={onAddOpenChange}
            rooms={rooms}
            isPrivileged={true}
            onSuccess={handleEventSaved}
          />
        </Tab>
        <Tab key="calendar" title="Calendar">
          <div className="mt-4">
            <CalendarTab
              customEvents={events ?? []}
              onAction={handleAction}
              onDelete={handleDelete}
              actionLoading={actionLoading}
              onGoToCourse={handleGoToCourse}
              rooms={rooms}
              onEventsChanged={handleEventSaved}
              initialRoom={initRoom}
              initialEventId={initEventId}
            />
          </div>
        </Tab>
        <Tab key="rooms" title="Rooms">
          <div className="mt-4">
            <RoomsTab rooms={rooms} mutateRooms={mutateRooms} />
          </div>
        </Tab>
      </Tabs>
    </div>
  );
}
