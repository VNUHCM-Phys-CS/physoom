"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  Chip,
  Input,
  Modal,
  ModalBody,
  ModalContent,
  ModalFooter,
  ModalHeader,
} from "@heroui/react";
import { fetcher } from "@/lib/ulti";
import moment from "moment";

// ─── UserPicker ────────────────────────────────────────────────────────────────
export function UserPicker({ label, users, selectedEmails, onChange, multiple = true }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const inputRef = useRef(null);

  const available = useMemo(
    () =>
      (users ?? []).filter(
        (u) =>
          !selectedEmails.includes(u.email) &&
          (u.name?.toLowerCase().includes(query.toLowerCase()) ||
            u.email.toLowerCase().includes(query.toLowerCase()))
      ),
    [users, selectedEmails, query]
  );

  const openDropdown = () => {
    const el = inputRef.current?.querySelector("input");
    if (el) {
      const rect = el.getBoundingClientRect();
      setDropdownStyle({
        position: "fixed",
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
    setOpen(true);
  };

  const select = (user) => {
    onChange(multiple ? [...selectedEmails, user.email] : [user.email]);
    setQuery("");
    setOpen(false);
  };

  const remove = (email) => onChange(selectedEmails.filter((e) => e !== email));

  const displayLabel = (email) => {
    const u = (users ?? []).find((u) => u.email === email);
    return u?.name ? `${u.name} (${email})` : email;
  };

  return (
    <div className="flex flex-col gap-1">
      <div ref={inputRef}>
        <Input
          label={label}
          placeholder="Search by name or email"
          value={query}
          onValueChange={(v) => { setQuery(v); openDropdown(); }}
          onFocus={openDropdown}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          size="sm"
        />
      </div>
      {open && available.length > 0 && (
        <div
          style={dropdownStyle}
          className="bg-content1 border border-default-200 rounded-xl shadow-lg max-h-44 overflow-y-auto"
        >
          {available.map((u) => (
            <button
              key={u.email}
              className="w-full text-left px-3 py-2 text-sm hover:bg-default-100 transition-colors"
              onMouseDown={(e) => { e.preventDefault(); select(u); }}
            >
              <span className="font-medium">{u.name || u.email}</span>
              {u.name && <span className="text-default-400 ml-2 text-xs">{u.email}</span>}
            </button>
          ))}
        </div>
      )}
      {selectedEmails.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selectedEmails.map((email) => (
            <Chip key={email} onClose={() => remove(email)} size="sm" variant="flat">
              {displayLabel(email)}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── RoomEventModal ────────────────────────────────────────────────────────────
/**
 * Shared create/edit modal for room events.
 *
 * Props:
 *   isOpen / onOpenChange  — HeroUI disclosure
 *   event                  — existing CalendarEvent object (edit mode) or null (create mode)
 *   rooms                  — array of room objects to select from
 *   isPrivileged           — true if admin/manager (auto-approve, no re-approval warning)
 *   createdBy              — email shown in "Created by" field (create mode only)
 *   onSuccess              — called after successful create/edit
 *   initialStart / initialEnd / initialRoomId — pre-fill for create mode (e.g. from slot click)
 */
export function RoomEventModal({
  isOpen,
  onOpenChange,
  event = null,
  rooms,
  isPrivileged = false,
  createdBy = "",
  onSuccess,
  initialStart,
  initialEnd,
  initialRoomId,
}) {
  const isEdit = !!event;
  const { data: users } = useSWR("/api/user/list", fetcher);

  const [form, setForm] = useState({ roomId: "", title: "", start: "", end: "", duration: "", note: "" });
  const [roomInput, setRoomInput] = useState("");
  const [host, setHost] = useState([]);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Track original time/room to know if re-approval will be triggered
  const origRef = useRef({ roomId: "", start: "", end: "" });

  const filteredRooms = useMemo(
    () => (rooms ?? []).filter((r) => r.title?.toLowerCase().includes(roomInput.toLowerCase())),
    [rooms, roomInput]
  );

  const formatDuration = (mins) => {
    const m = parseInt(mins);
    if (!m || m <= 0) return "";
    const h = Math.floor(m / 60);
    const rem = m % 60;
    return [h && `${h}h`, rem && `${rem}m`].filter(Boolean).join(" ");
  };

  const handleStartChange = (v) => {
    setForm((f) => {
      if (f.duration && v) {
        const newEnd = moment(v).add(parseInt(f.duration), "minutes").format("YYYY-MM-DDTHH:mm");
        return { ...f, start: v, end: newEnd };
      }
      if (f.end && v) {
        const mins = moment(f.end).diff(moment(v), "minutes");
        return { ...f, start: v, duration: mins > 0 ? String(mins) : "" };
      }
      return { ...f, start: v };
    });
  };

  const handleEndChange = (v) => {
    setForm((f) => {
      if (f.start && v) {
        const mins = moment(v).diff(moment(f.start), "minutes");
        return { ...f, end: v, duration: mins > 0 ? String(mins) : "" };
      }
      return { ...f, end: v };
    });
  };

  const handleDurationChange = (v) => {
    const mins = parseInt(v);
    setForm((f) => {
      if (f.start && !isNaN(mins) && mins > 0) {
        const newEnd = moment(f.start).add(mins, "minutes").format("YYYY-MM-DDTHH:mm");
        return { ...f, duration: v, end: newEnd };
      }
      return { ...f, duration: v };
    });
  };

  // Reset form when modal opens
  useEffect(() => {
    if (!isOpen) return;
    setError("");
    if (isEdit) {
      const initStart = moment(event.start).format("YYYY-MM-DDTHH:mm");
      const initEnd = moment(event.end).format("YYYY-MM-DDTHH:mm");
      const initDuration = String(moment(event.end).diff(moment(event.start), "minutes"));
      const roomId = String(event.room?._id ?? event.room ?? "");
      const matchedRoom = (rooms ?? []).find((r) => String(r._id) === roomId);
      setForm({ roomId, title: event.title || "", start: initStart, end: initEnd, duration: initDuration, note: (event.tags ?? [])[0] || "" });
      setRoomInput(matchedRoom?.title || "");
      setHost(event.host ?? []);
      setAttendees(event.attendees ?? []);
      origRef.current = { roomId, start: initStart, end: initEnd };
    } else {
      const preRoom = (rooms ?? []).find((r) => String(r._id) === String(initialRoomId));
      const initStart = initialStart ? moment(initialStart).format("YYYY-MM-DDTHH:mm") : "";
      const initEnd = initialEnd ? moment(initialEnd).format("YYYY-MM-DDTHH:mm") : "";
      const initDuration = initStart && initEnd ? String(moment(initEnd).diff(moment(initStart), "minutes")) : "";
      setForm({ roomId: initialRoomId || "", title: "", start: initStart, end: initEnd, duration: initDuration, note: "" });
      setRoomInput(preRoom?.title || "");
      setHost([]);
      setAttendees([]);
    }
  }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  // Whether the current values would trigger re-approval
  const timeOrRoomChanged =
    isEdit &&
    (form.roomId !== origRef.current.roomId ||
      form.start !== origRef.current.start ||
      form.end !== origRef.current.end);

  const handleSubmit = async (onClose) => {
    setError("");
    if (!form.roomId || !form.title || !form.start || !form.end) {
      setError("Please fill all required fields.");
      return;
    }
    setLoading(true);
    try {
      const url = isEdit ? `/api/room-event/${event._id}` : "/api/room-event";
      const method = isEdit ? "PUT" : "POST";
      // Normalize the naive datetime-local strings to full ISO on the client,
      // where the user's timezone is known. Otherwise `new Date(str)` on the
      // server parses them in the SERVER timezone (UTC in production), which
      // shifts every booking by the local offset.
      const startISO = form.start ? new Date(form.start).toISOString() : form.start;
      const endISO = form.end ? new Date(form.end).toISOString() : form.end;
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomId: form.roomId, title: form.title, start: startISO, end: endISO, note: form.note, host, attendees }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setError(`Conflict with "${data.conflict?.title}" (${moment(data.conflict?.start).format("HH:mm")}–${moment(data.conflict?.end).format("HH:mm")})`);
        } else {
          setError(data.message || (isEdit ? "Failed to update booking." : "Failed to create booking."));
        }
      } else {
        onSuccess?.();
        onClose();
      }
    } catch {
      setError("Server error.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={onOpenChange} scrollBehavior="inside">
      <ModalContent>
        {(onClose) => (
          <>
            <ModalHeader>{isEdit ? `Edit — ${event?.title || "Booking"}` : "Add Booking"}</ModalHeader>
            <ModalBody>
              {error && <p className="text-danger text-sm bg-danger-50 rounded-lg px-3 py-2">{error}</p>}

              {/* Re-approval warning (edit mode, non-privileged only) */}
              {isEdit && !isPrivileged && (
                <div className="text-sm bg-warning-50 text-warning-700 rounded-lg px-3 py-2 flex flex-col gap-0.5">
                  <span className="font-medium">Note on re-approval</span>
                  <span>
                    Changing <strong>time or room</strong> will reset this booking to{" "}
                    <strong>pending</strong> and require re-approval.
                    {" "}Updating <strong>title, host, or attendees</strong> only will be applied immediately.
                  </span>
                  {timeOrRoomChanged && (
                    <span className="mt-1 text-warning-800 font-semibold">⚠ Time or room has changed — re-approval will be required.</span>
                  )}
                </div>
              )}

              {/* Room autocomplete */}
              <Autocomplete
                label="Room"
                isRequired
                items={filteredRooms}
                inputValue={roomInput}
                onInputChange={(v) => { setRoomInput(v); if (!v) setForm((f) => ({ ...f, roomId: "" })); }}
                selectedKey={form.roomId || null}
                onSelectionChange={(key) => {
                  setForm((f) => ({ ...f, roomId: key || "" }));
                  const found = (rooms ?? []).find((r) => String(r._id) === key);
                  setRoomInput(found?.title || "");
                }}
              >
                {(r) => (
                  <AutocompleteItem key={String(r._id)} textValue={r.title}>
                    {r.title}{r.isBookable ? "" : " (not public)"}
                  </AutocompleteItem>
                )}
              </Autocomplete>

              <Input label="Title" isRequired value={form.title} onValueChange={(v) => setForm((f) => ({ ...f, title: v }))} />
              <Input label="Start" type="datetime-local" isRequired value={form.start} onValueChange={handleStartChange} />
              <Input
                label="Duration (minutes)"
                type="number"
                min={1}
                value={form.duration}
                onValueChange={handleDurationChange}
                description={formatDuration(form.duration) || undefined}
                placeholder="e.g. 90"
              />
              <Input label="End" type="datetime-local" isRequired value={form.end} onValueChange={handleEndChange} />
              <UserPicker label="Host by (optional)" users={users} selectedEmails={host} onChange={setHost} multiple />
              <UserPicker label="Members attending (optional)" users={users} selectedEmails={attendees} onChange={setAttendees} multiple />
              <Input label="Note" value={form.note} onValueChange={(v) => setForm((f) => ({ ...f, note: v }))} />

              {/* Created by (create mode only) */}
              {!isEdit && createdBy && (
                <Input label="Created by" value={createdBy} isReadOnly classNames={{ input: "text-default-400" }} />
              )}

              {/* Approval note for create mode when not privileged */}
              {!isEdit && !isPrivileged && (
                <p className="text-xs text-warning-600 bg-warning-50 rounded-lg p-2">
                  Your request will be reviewed by a manager or admin before approval.
                </p>
              )}
            </ModalBody>
            <ModalFooter>
              <Button variant="light" onPress={onClose}>Cancel</Button>
              <Button color="primary" isLoading={loading} onPress={() => handleSubmit(onClose)}>
                {isEdit ? "Save" : "Create"}
              </Button>
            </ModalFooter>
          </>
        )}
      </ModalContent>
    </Modal>
  );
}
