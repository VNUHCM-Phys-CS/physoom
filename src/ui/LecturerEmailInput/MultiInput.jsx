"use client";

import { useMemo, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/ulti";
import { Input, Chip, Button } from "@heroui/react";
import { UserPlusIcon } from "lucide-react";
import { toast } from "react-toastify";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Multi-value lecturer email field: chips + autocomplete against the user
 * database, free-text emails allowed, and a create-user shortcut for addresses
 * that aren't known users.
 *
 * Controlled via `value` (array of emails) / `onChange(emails)`.
 */
export default function LecturerEmailMultiInput({
  value = [],
  onChange,
  label = "Teacher emails",
  placeholder = "Search or type an email…",
  allowCreate = true,
}) {
  const { data: users } = useSWR("/api/user/list", fetcher);
  const { mutate } = useSWRConfig();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const wrapRef = useRef(null);

  const selected = value ?? [];

  const nameByEmail = useMemo(() => {
    const m = {};
    (users ?? []).forEach((u) => { if (u.email) m[u.email.toLowerCase()] = u.name; });
    return m;
  }, [users]);

  const isSelected = (email) =>
    selected.some((e) => e.toLowerCase() === email.toLowerCase());

  const suggestions = useMemo(() => {
    const q = query.toLowerCase().trim();
    return (users ?? [])
      .filter(
        (u) =>
          !isSelected(u.email || "") &&
          (!q ||
            u.email?.toLowerCase().includes(q) ||
            u.name?.toLowerCase().includes(q))
      )
      .slice(0, 6);
  }, [users, query, selected]);

  const trimmed = query.trim();
  const known = (users ?? []).some(
    (u) => u.email?.toLowerCase() === trimmed.toLowerCase()
  );
  const canAddFree = EMAIL_RE.test(trimmed) && !isSelected(trimmed);
  const showCreate = canAddFree && !known;

  const displayLabel = (email) => {
    const n = nameByEmail[email.toLowerCase()];
    return n ? `${n} (${email})` : email;
  };

  const openDropdown = () => {
    const el = wrapRef.current?.querySelector("input");
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

  const add = (email) => {
    if (email && !isSelected(email)) onChange([...selected, email]);
    setQuery("");
    setOpen(false);
  };

  const remove = (email) => onChange(selected.filter((e) => e !== email));

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed, name: trimmed.split("@")[0] }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`User created for ${trimmed}`);
        mutate("/api/user/list");
        add(trimmed);
      } else {
        toast.error(d.error || "Could not create user.");
      }
    } catch {
      toast.error("Could not create user.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-1" ref={wrapRef}>
      <Input
        label={label}
        placeholder={placeholder}
        value={query}
        onValueChange={(v) => { setQuery(v); openDropdown(); }}
        onFocus={openDropdown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && canAddFree) { e.preventDefault(); add(trimmed); }
        }}
      />

      {open && suggestions.length > 0 && (
        <div
          style={dropdownStyle}
          className="bg-content1 border border-default-200 rounded-xl shadow-lg max-h-44 overflow-y-auto"
        >
          {suggestions.map((u) => (
            <button
              type="button"
              key={u.email}
              className="w-full text-left px-3 py-2 text-sm hover:bg-default-100 transition-colors"
              onMouseDown={(e) => { e.preventDefault(); add(u.email); }}
            >
              <span className="font-medium">{u.name || u.email}</span>
              {u.name && <span className="text-default-400 ml-2 text-xs">{u.email}</span>}
            </button>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="flex items-center gap-2 text-xs text-warning-600 flex-wrap">
          <span>&quot;{trimmed}&quot; is not in the user list.</span>
          {allowCreate && (
            <Button
              size="sm"
              variant="flat"
              color="secondary"
              isLoading={creating}
              startContent={<UserPlusIcon size={12} />}
              onPress={handleCreate}
            >
              Create user
            </Button>
          )}
          <button
            type="button"
            className="underline text-default-500"
            onMouseDown={(e) => { e.preventDefault(); add(trimmed); }}
          >
            add as-is
          </button>
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1">
          {selected.map((email) => (
            <Chip key={email} onClose={() => remove(email)} size="sm" variant="flat">
              {displayLabel(email)}
            </Chip>
          ))}
        </div>
      )}
    </div>
  );
}
