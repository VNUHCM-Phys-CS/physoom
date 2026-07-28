"use client";
import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Button, Input, Chip, Switch,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure, Pagination, Tooltip,
} from "@heroui/react";
import {
  PlusIcon, UploadIcon, DownloadIcon,
  SearchIcon, PencilIcon, Trash2Icon, CheckIcon, XIcon,
} from "lucide-react";
import DragDropzone from "@/ui/CSVReader/DragDropzone";

// ── helpers ──────────────────────────────────────────────────────────────────

function downloadCSV(rows) {
  const headers = ["email", "name", "teacher_id", "isAdmin"];
  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      headers.map((h) => JSON.stringify(r[h] ?? "")).join(",")
    ),
  ];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "users.csv";
  a.click();
  URL.revokeObjectURL(url);
}

const EMPTY_FORM = { email: "", name: "", teacher_id: "", isAdmin: false };

const IMPORT_COLUMNS = [
  { name: "email",      uid: "email",      sortable: true },
  { name: "name",       uid: "name",       sortable: true },
  { name: "teacher_id", uid: "teacher_id", sortable: true },
  { name: "isAdmin",    uid: "isAdmin",    sortable: false },
];

// ── UserFormModal ─────────────────────────────────────────────────────────────

function UserFormModal({ isOpen, onClose, initial, onSave }) {
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!initial;

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.email.trim()) { setError("Email is required"); return; }
    setSaving(true);
    setError("");
    try {
      await onSave(form);
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  // reset when opening
  useMemo(() => { setForm(initial ?? EMPTY_FORM); setError(""); }, [initial, isOpen]);

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <ModalContent>
        <ModalHeader>{isEdit ? "Edit User" : "Add User"}</ModalHeader>
        <ModalBody className="flex flex-col gap-3">
          <Input
            label="Email"
            placeholder="user@example.com"
            value={form.email}
            onValueChange={set("email")}
            isDisabled={isEdit}
            isRequired
            isInvalid={!!error && !form.email.trim()}
          />
          <Input label="Name" placeholder="Full name" value={form.name} onValueChange={set("name")} />
          <Input label="Teacher ID (MSCB)" placeholder="e.g. 12345" value={form.teacher_id} onValueChange={set("teacher_id")} />
          <div className="flex items-center justify-between px-1">
            <span className="text-sm">Admin privileges</span>
            <Switch isSelected={form.isAdmin} onValueChange={set("isAdmin")} color="danger" size="sm" />
          </div>
          {error && <p className="text-danger text-xs">{error}</p>}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>Cancel</Button>
          <Button color="primary" onPress={handleSave} isLoading={saving}>
            {isEdit ? "Save changes" : "Add user"}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ── ImportModal ───────────────────────────────────────────────────────────────

function ImportModal({ isOpen, onClose, onSuccess }) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  const handleImport = async (rows) => {
    setImporting(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/user/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows),
      });
      const data = await res.json();
      if (res.ok) {
        setResult({ ok: true, ...data });
        onSuccess();
      } else {
        setResult({ ok: false, error: data.error });
      }
    } catch (e) {
      setResult({ ok: false, error: e.message });
    } finally {
      setImporting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="3xl">
      <ModalContent>
        <ModalHeader>Import Users from CSV / Excel</ModalHeader>
        <ModalBody className="flex flex-col gap-3">
          <p className="text-xs text-default-400">
            Required column: <code className="bg-default-100 px-1 rounded">email</code>.
            Optional: <code className="bg-default-100 px-1 rounded">name</code>,{" "}
            <code className="bg-default-100 px-1 rounded">teacher_id</code>,{" "}
            <code className="bg-default-100 px-1 rounded">isAdmin</code> (true/false).
            Existing users are updated by email.
          </p>
          <DragDropzone
            collums={IMPORT_COLUMNS}
            INITIAL_VISIBLE_COLUMNS={["email", "name", "teacher_id", "isAdmin"]}
            onImport={handleImport}
          />
          {importing && <p className="text-sm text-center text-default-400">Importing…</p>}
          {result?.ok && (
            <p className="text-sm text-success text-center">
              Done — {result.inserted} added, {result.updated} updated.
            </p>
          )}
          {result && !result.ok && (
            <p className="text-sm text-danger text-center">Error: {result.error}</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>Close</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ── DeleteConfirm ─────────────────────────────────────────────────────────────

function DeleteConfirmModal({ isOpen, onClose, user, onConfirm }) {
  const [loading, setLoading] = useState(false);
  const handle = async () => {
    setLoading(true);
    await onConfirm(user);
    setLoading(false);
    onClose();
  };
  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <ModalContent>
        <ModalHeader>Delete user?</ModalHeader>
        <ModalBody>
          <p className="text-sm">Remove <strong>{user?.email}</strong>? This cannot be undone.</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>Cancel</Button>
          <Button color="danger" onPress={handle} isLoading={loading}>Delete</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ── UserManagementPage ────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

export default function UserManagementPage() {
  const { data: users, mutate, isLoading } = useSWR("/api/admin/user", fetcher);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { isOpen: isFormOpen, onOpen: openForm, onClose: closeForm } = useDisclosure();
  const { isOpen: isImportOpen, onOpen: openImport, onClose: closeImport } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: openDelete, onClose: closeDelete } = useDisclosure();

  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  // ── filtering + pagination ────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users ?? [];
    return (users ?? []).filter(
      (u) =>
        u.email?.toLowerCase().includes(q) ||
        u.name?.toLowerCase().includes(q) ||
        u.teacher_id?.toLowerCase().includes(q)
    );
  }, [users, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filtered, page]
  );

  const resetPage = useCallback(() => setPage(1), []);

  // ── CRUD handlers ─────────────────────────────────────────────────────────

  const handleAdd = () => { setEditUser(null); openForm(); };
  const handleEdit = (u) => { setEditUser(u); openForm(); };
  const handleDeleteClick = (u) => { setDeleteTarget(u); openDelete(); };

  const handleSave = async (form) => {
    const method = editUser ? "PUT" : "POST";
    const body = editUser ? { id: editUser._id, ...form } : form;
    const res = await fetch("/api/admin/user", {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Failed to save");
    mutate();
  };

  const handleDelete = async (u) => {
    await fetch("/api/admin/user", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: u._id }),
    });
    mutate();
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="text-xl font-bold">Users</h2>
          <p className="text-sm text-default-400">{users?.length ?? "…"} total accounts</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="flat" startContent={<DownloadIcon size={14} />} onPress={() => downloadCSV(users ?? [])}>
            Export
          </Button>
          <Button size="sm" variant="flat" startContent={<UploadIcon size={14} />} onPress={openImport}>
            Import
          </Button>
          <Button size="sm" color="primary" startContent={<PlusIcon size={14} />} onPress={handleAdd}>
            Add User
          </Button>
        </div>
      </div>

      {/* Search */}
      <Input
        size="sm"
        placeholder="Search by name, email or MSCB…"
        value={search}
        onValueChange={(v) => { setSearch(v); resetPage(); }}
        startContent={<SearchIcon size={15} className="text-default-400" />}
        isClearable
        onClear={() => { setSearch(""); resetPage(); }}
        className="max-w-sm"
      />

      {/* Table */}
      <Table
        aria-label="Users table"
        removeWrapper
        bottomContent={
          totalPages > 1 && (
            <div className="flex justify-center pt-2">
              <Pagination total={totalPages} page={page} onChange={setPage} size="sm" color="secondary" />
            </div>
          )
        }
      >
        <TableHeader>
          <TableColumn>NAME</TableColumn>
          <TableColumn>EMAIL</TableColumn>
          <TableColumn>MSCB</TableColumn>
          <TableColumn>ADMIN</TableColumn>
          <TableColumn>ACTIONS</TableColumn>
        </TableHeader>
        <TableBody items={pageRows} isLoading={isLoading} emptyContent="No users found.">
          {(u) => (
            <TableRow key={u._id}>
              <TableCell>
                <span className="font-medium text-sm">{u.name || <span className="text-default-300 italic">—</span>}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-default-600">{u.email}</span>
              </TableCell>
              <TableCell>
                {u.teacher_id
                  ? <Chip size="sm" variant="flat" color="default" className="font-mono">{u.teacher_id}</Chip>
                  : <span className="text-default-300 text-sm">—</span>}
              </TableCell>
              <TableCell>
                {u.isAdmin
                  ? <Chip size="sm" color="danger" variant="flat" startContent={<CheckIcon size={11} />}>Admin</Chip>
                  : <Chip size="sm" color="default" variant="flat" startContent={<XIcon size={11} />}>User</Chip>}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Tooltip content="Edit">
                    <Button isIconOnly size="sm" variant="light" onPress={() => handleEdit(u)}>
                      <PencilIcon size={14} />
                    </Button>
                  </Tooltip>
                  <Tooltip content="Delete" color="danger">
                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDeleteClick(u)}>
                      <Trash2Icon size={14} />
                    </Button>
                  </Tooltip>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Modals */}
      <UserFormModal
        isOpen={isFormOpen}
        onClose={closeForm}
        initial={editUser ? { email: editUser.email, name: editUser.name ?? "", teacher_id: editUser.teacher_id ?? "", isAdmin: editUser.isAdmin } : null}
        onSave={handleSave}
      />
      <ImportModal
        isOpen={isImportOpen}
        onClose={closeImport}
        onSuccess={() => { mutate(); closeImport(); }}
      />
      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={closeDelete}
        user={deleteTarget}
        onConfirm={handleDelete}
      />
    </div>
  );
}
