"use client";
import { useState, useMemo, useCallback } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Button, Input, Chip, Switch, Autocomplete, AutocompleteItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure, Pagination, Tooltip,
} from "@heroui/react";
import {
  PlusIcon, UploadIcon, DownloadIcon,
  SearchIcon, PencilIcon, Trash2Icon, CheckIcon, XIcon,
} from "lucide-react";
import DragDropzone from "@/ui/CSVReader/DragDropzone";
import { useI18n } from "@/i18n/I18nProvider";
import { DEPARTMENTS } from "@/lib/departments";

// ── helpers ──────────────────────────────────────────────────────────────────

function downloadCSV(rows) {
  const headers = ["email", "name", "teacher_id", "department", "rank", "degree", "isAdmin"];
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

const EMPTY_FORM = { email: "", name: "", teacher_id: "", department: "", rank: "", degree: "", isAdmin: false };

const IMPORT_COLUMNS = [
  { name: "email",      uid: "email",      sortable: true },
  { name: "name",       uid: "name",       sortable: true },
  { name: "teacher_id", uid: "teacher_id", sortable: true },
  { name: "department", uid: "department", sortable: true },
  { name: "rank",       uid: "rank",       sortable: false },
  { name: "degree",     uid: "degree",     sortable: false },
  { name: "isAdmin",    uid: "isAdmin",    sortable: false },
];

// ── UserFormModal ─────────────────────────────────────────────────────────────

function UserFormModal({ isOpen, onClose, initial, onSave }) {
  const { t } = useI18n();
  const [form, setForm] = useState(initial ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const isEdit = !!initial;

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.email.trim()) { setError(t("user.emailRequired")); return; }
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
        <ModalHeader>{isEdit ? t("user.editTitle") : t("user.addTitle")}</ModalHeader>
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
          <Input label={t("user.fName")} placeholder={t("user.fName")} value={form.name} onValueChange={set("name")} />
          <Input label={t("user.fMscb")} placeholder="VD: 12345" value={form.teacher_id} onValueChange={set("teacher_id")} />
          <Autocomplete
            label={t("user.fDept")}
            placeholder={t("user.fDeptPh")}
            defaultInputValue={form.department}
            allowsCustomValue
            onInputChange={set("department")}
            onSelectionChange={(k) => { if (k != null) set("department")(String(k)); }}
          >
            {DEPARTMENTS.map((d) => (
              <AutocompleteItem key={d.name} textValue={d.name}>
                {d.name} <span className="text-default-400">· {d.code}</span>
              </AutocompleteItem>
            ))}
          </Autocomplete>
          <div className="flex gap-3">
            <Input label={t("user.fRank")} placeholder="GV / GVC / GVCC" value={form.rank} onValueChange={set("rank")} />
            <Input label={t("user.fDegree")} placeholder="GS / PGS / TS / ThS / CN" value={form.degree} onValueChange={set("degree")} />
          </div>
          <div className="flex items-center justify-between px-1">
            <span className="text-sm">{t("user.fAdmin")}</span>
            <Switch isSelected={form.isAdmin} onValueChange={set("isAdmin")} color="danger" size="sm" />
          </div>
          {error && <p className="text-danger text-xs">{error}</p>}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>{t("common.cancel")}</Button>
          <Button color="primary" onPress={handleSave} isLoading={saving}>
            {isEdit ? t("user.saveChanges") : t("user.add")}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ── ImportModal ───────────────────────────────────────────────────────────────

function ImportModal({ isOpen, onClose, onSuccess }) {
  const { t } = useI18n();
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
        <ModalHeader>{t("user.importTitle")}</ModalHeader>
        <ModalBody className="flex flex-col gap-3">
          <p className="text-xs text-default-400">{t("user.importDesc")}</p>
          <DragDropzone
            collums={IMPORT_COLUMNS}
            INITIAL_VISIBLE_COLUMNS={["email", "name", "teacher_id", "department", "rank", "degree", "isAdmin"]}
            onImport={handleImport}
          />
          {importing && <p className="text-sm text-center text-default-400">{t("user.importing")}</p>}
          {result?.ok && (
            <p className="text-sm text-success text-center">
              {t("user.importDone", { a: result.inserted, u: result.updated })}
            </p>
          )}
          {result && !result.ok && (
            <p className="text-sm text-danger text-center">{t("common.error")}: {result.error}</p>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>{t("common.close")}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ── DeleteConfirm ─────────────────────────────────────────────────────────────

function DeleteConfirmModal({ isOpen, onClose, user, onConfirm }) {
  const { t } = useI18n();
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
        <ModalHeader>{t("user.deleteTitle")}</ModalHeader>
        <ModalBody>
          <p className="text-sm">{t("user.deleteDesc", { email: user?.email })}</p>
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>{t("common.cancel")}</Button>
          <Button color="danger" onPress={handle} isLoading={loading}>{t("common.delete")}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// ── UserManagementPage ────────────────────────────────────────────────────────

const PAGE_SIZE = 15;

export default function UserManagementPage() {
  const { t } = useI18n();
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
    // teacher_id (MSCB) can be a number, so coerce every field to a string
    // before lower-casing.
    const has = (v) => String(v ?? "").toLowerCase().includes(q);
    return (users ?? []).filter(
      (u) => has(u.email) || has(u.name) || has(u.teacher_id) || has(u.department)
    );
  }, [users, search]);

  const [sortDescriptor, setSortDescriptor] = useState({ column: "name", direction: "ascending" });
  const sorted = useMemo(() => {
    const { column, direction } = sortDescriptor;
    const rows = [...filtered].sort((a, b) => {
      const av = String(a[column] ?? "").toLowerCase();
      const bv = String(b[column] ?? "").toLowerCase();
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return direction === "descending" ? -cmp : cmp;
    });
    return rows;
  }, [filtered, sortDescriptor]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const pageRows = useMemo(
    () => sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [sorted, page]
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
          <h2 className="text-xl font-bold">{t("user.title")}</h2>
          <p className="text-sm text-default-400">{t("user.total", { n: users?.length ?? "…" })}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button size="sm" variant="flat" startContent={<DownloadIcon size={14} />} onPress={() => downloadCSV(users ?? [])}>
            {t("common.export")}
          </Button>
          <Button size="sm" variant="flat" startContent={<UploadIcon size={14} />} onPress={openImport}>
            {t("common.import")}
          </Button>
          <Button size="sm" color="primary" startContent={<PlusIcon size={14} />} onPress={handleAdd}>
            {t("user.add")}
          </Button>
        </div>
      </div>

      {/* Search */}
      <Input
        size="sm"
        placeholder={t("user.searchPh")}
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
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
        bottomContent={
          totalPages > 1 && (
            <div className="flex justify-center pt-2">
              <Pagination total={totalPages} page={page} onChange={setPage} size="sm" color="secondary" />
            </div>
          )
        }
      >
        <TableHeader>
          <TableColumn key="name" allowsSorting>{t("user.colName")}</TableColumn>
          <TableColumn key="email" allowsSorting>{t("user.colEmail")}</TableColumn>
          <TableColumn key="teacher_id" allowsSorting>{t("user.colMscb")}</TableColumn>
          <TableColumn key="department" allowsSorting>{t("user.colDept")}</TableColumn>
          <TableColumn key="isAdmin" allowsSorting>{t("user.colAdmin")}</TableColumn>
          <TableColumn>{t("user.colActions")}</TableColumn>
        </TableHeader>
        <TableBody items={pageRows} isLoading={isLoading} emptyContent={t("user.none")}>
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
                {u.department || u.rank || u.degree ? (
                  <div className="flex flex-col leading-tight">
                    <span className="text-sm">{u.department || "—"}</span>
                    {(u.degree || u.rank) && (
                      <span className="text-[11px] text-default-400">{[u.degree, u.rank].filter(Boolean).join(" · ")}</span>
                    )}
                  </div>
                ) : <span className="text-default-300 text-sm">—</span>}
              </TableCell>
              <TableCell>
                {u.isAdmin
                  ? <Chip size="sm" color="danger" variant="flat" startContent={<CheckIcon size={11} />}>{t("user.roleAdmin")}</Chip>
                  : <Chip size="sm" color="default" variant="flat" startContent={<XIcon size={11} />}>{t("user.roleUser")}</Chip>}
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <Tooltip content={t("common.edit")}>
                    <Button isIconOnly size="sm" variant="light" onPress={() => handleEdit(u)}>
                      <PencilIcon size={14} />
                    </Button>
                  </Tooltip>
                  <Tooltip content={t("common.delete")} color="danger">
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
        initial={editUser ? { email: editUser.email, name: editUser.name ?? "", teacher_id: editUser.teacher_id ?? "", department: editUser.department ?? "", rank: editUser.rank ?? "", degree: editUser.degree ?? "", isAdmin: editUser.isAdmin } : null}
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
