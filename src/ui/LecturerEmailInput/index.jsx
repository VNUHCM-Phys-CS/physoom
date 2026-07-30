"use client";

import { useMemo, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";
import { fetcher } from "@/lib/ulti";
import { Input, Button } from "@heroui/react";
import { UserPlusIcon } from "lucide-react";
import { toast } from "react-toastify";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Email input for lecturers with autocomplete against the user database.
 *
 * - Suggests matching users (name + email) as you type.
 * - Free text is always allowed, so an address that isn't in the DB can still
 *   be used as-is.
 * - When a typed email isn't a known user, offers to create one (admins only)
 *   or lets you keep the plain address.
 *
 * Controlled via `value` / `onChange(email)` so it drops into react-hook-form
 * Controllers directly.
 */
export default function LecturerEmailInput({
  value = "",
  onChange,
  label,
  placeholder = "name@example.com",
  allowCreate = true,
  ...inputProps
}) {
  const { data: users } = useSWR("/api/user/list", fetcher);
  const { mutate } = useSWRConfig();
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const wrapRef = useRef(null);

  const query = (value || "").trim();

  const suggestions = useMemo(() => {
    const q = query.toLowerCase();
    const list = users ?? [];
    const filtered = q
      ? list.filter(
          (u) =>
            u.email?.toLowerCase().includes(q) ||
            u.name?.toLowerCase().includes(q)
        )
      : list;
    // Hide an exact-match-only result (nothing left to suggest)
    return filtered
      .filter((u) => u.email?.toLowerCase() !== q)
      .slice(0, 6);
  }, [users, query]);

  const matched = useMemo(
    () => (users ?? []).find((u) => u.email?.toLowerCase() === query.toLowerCase()),
    [users, query]
  );
  const known = !!matched;
  const showNotInList = query.length > 0 && EMAIL_RE.test(query) && !known;

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

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch("/api/admin/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: query, name: query.split("@")[0] }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toast.success(`User created for ${query}`);
        mutate("/api/user/list");
      } else {
        toast.error(data.error || "Could not create user.");
      }
    } catch {
      toast.error("Could not create user.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="flex flex-col gap-1 flex-1" ref={wrapRef}>
      <Input
        {...inputProps}
        label={label}
        placeholder={placeholder}
        value={value}
        onValueChange={(v) => { onChange(v); openDropdown(); }}
        onFocus={openDropdown}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        description={matched?.name ? `Matched: ${matched.name}` : inputProps.description}
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
              onMouseDown={(e) => { e.preventDefault(); onChange(u.email); setOpen(false); }}
            >
              <span className="font-medium">{u.name || u.email}</span>
              {u.name && <span className="text-default-400 ml-2 text-xs">{u.email}</span>}
            </button>
          ))}
        </div>
      )}

      {showNotInList && (
        <div className="flex items-center gap-2 text-xs text-warning-600 flex-wrap">
          <span>Not in the user list.</span>
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
          <span className="text-default-400">or keep the email as-is.</span>
        </div>
      )}
    </div>
  );
}
