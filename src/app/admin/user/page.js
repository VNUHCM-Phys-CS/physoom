"use client";
import { useState, useMemo, useCallback, useEffect } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Button, Input, Chip, Switch, Autocomplete, AutocompleteItem,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  useDisclosure, Pagination, Tooltip, Spinner,
} from "@heroui/react";
import {
  PlusIcon, UploadIcon, DownloadIcon,
  SearchIcon, PencilIcon, Trash2Icon, CheckIcon, XIcon, AtSignIcon, RefreshCwIcon,
} from "lucide-react";
import { toast } from "react-toastify";
import DragDropzone from "@/ui/CSVReader/DragDropzone";
import { useI18n } from "@/i18n/I18nProvider";
import { DEPARTMENTS } from "@/lib/departments";
import { useSession } from "next-auth/react";
import { isSuperAdmin } from "@/lib/scope";
import { downloadTemplate } from "@/lib/downloadTemplate";

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

const EMPTY_FORM = { email: "", name: "", teacher_id: "", department: "", rank: "", degree: "", isAdmin: false, isSuperAdmin: false, adminScope: "" };

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
      // Normalise the scope textarea → array of patterns.
      const payload = {
        ...form,
        isSuperAdmin: !!form.isSuperAdmin,
        adminScope: typeof form.adminScope === "string"
          ? form.adminScope.split(",").map((s) => s.trim()).filter(Boolean)
          : (form.adminScope || []),
      };
      await onSave(payload);
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
          {form.isAdmin && (
            <>
              <div className="flex items-center justify-between px-1">
                <span className="text-sm">Super admin (toàn quyền)</span>
                <Switch isSelected={!!form.isSuperAdmin} onValueChange={set("isSuperAdmin")} color="secondary" size="sm" />
              </div>
              {!form.isSuperAdmin && (
                <Input
                  label="Phạm vi mã lớp (phân cách bằng dấu phẩy)"
                  placeholder="VD: CVD, 25VLH  → quản mọi lớp chứa các mẫu này"
                  value={typeof form.adminScope === "string" ? form.adminScope : (form.adminScope || []).join(", ")}
                  onValueChange={set("adminScope")}
                  description="Admin này chỉ xếp/nhập được các lớp có mã chứa một trong các mẫu trên."
                />
              )}
            </>
          )}
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
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-default-400">{t("user.importDesc")}</p>
            <Button size="sm" variant="flat" startContent={<DownloadIcon size={14} />}
              onPress={() => downloadTemplate(
                "mau-nhap-nguoi-dung.xlsx",
                IMPORT_COLUMNS.map((c) => c.name),
                [["nguyenvana@hcmus.edu.vn", "Nguyễn Văn A", "1234", "Vật lý Tin học", "GV", "TS", "false"]]
              )}>
              {t("import.downloadTemplate")}
            </Button>
          </div>
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

// ── FixEmailModal ─────────────────────────────────────────────────────────────

function FixEmailModal({ isOpen, onClose, user, onDone }) {
  const [newEmail, setNewEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Reset each time it opens for a (possibly) different user.
  const openedFor = user?._id;
  useEffect(() => {
    if (isOpen) { setNewEmail(user?.email || ""); setError(""); setResult(null); }
  }, [isOpen, openedFor]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    const nv = newEmail.trim();
    if (!nv || nv.toLowerCase() === String(user?.email || "").toLowerCase()) {
      setError("Nhập một email mới, khác email hiện tại.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/user/rename-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ oldEmail: user.email, newEmail: nv }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) { setError(d.error || "Đổi email thất bại."); return; }
      setResult(d.changed || {});
      onDone?.();
    } catch {
      setError("Lỗi mạng.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="md">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-0.5">
          <span>Sửa email giảng viên</span>
          {user && <span className="text-xs font-normal text-default-500">{user.name || user.email}</span>}
        </ModalHeader>
        <ModalBody>
          {result ? (
            <div className="text-sm flex flex-col gap-2">
              <p className="text-success-600 font-medium">✓ Đã đổi email sang <b>{newEmail.trim()}</b></p>
              <div className="flex flex-wrap gap-1.5">
                <Chip size="sm" variant="flat">User: {result.user}</Chip>
                <Chip size="sm" variant="flat">Môn: {result.courses}</Chip>
                <Chip size="sm" variant="flat">Lịch (GV): {result.events}</Chip>
                <Chip size="sm" variant="flat">Host: {result.hosts}</Chip>
                <Chip size="sm" variant="flat">Khách mời: {result.attendees}</Chip>
                <Chip size="sm" variant="flat">Alias: {result.aliases}</Chip>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              <Input isReadOnly size="sm" label="Email hiện tại" value={user?.email || ""} />
              <Input
                autoFocus
                size="sm"
                label="Email mới"
                placeholder="bdthanh@hcmus.edu.vn"
                value={newEmail}
                onValueChange={setNewEmail}
                isInvalid={!!error}
                errorMessage={error}
                onKeyDown={(e) => e.key === "Enter" && submit()}
              />
              <p className="text-xs text-default-500">
                Cập nhật đồng loạt ở User, Môn, Lịch (GV/host/khách mời), Alias. Không gộp được vào email đã thuộc user khác.
              </p>
            </div>
          )}
        </ModalBody>
        <ModalFooter>
          {result ? (
            <Button color="primary" onPress={onClose}>Xong</Button>
          ) : (
            <>
              <Button variant="flat" onPress={onClose}>Huỷ</Button>
              <Button color="primary" isLoading={loading} onPress={submit}>Đổi email</Button>
            </>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}

// Xem trước đồng bộ web Khoa: hiện sẽ tạo/cập nhật/bỏ qua ai TRƯỚC khi ghi DB.
function SyncWebkhoaModal({ isOpen, onClose, loading, preview, applying, onConfirm }) {
  const c = preview?.counts;
  const nothing = c && c.create === 0 && c.update === 0;
  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => !o && onClose()} size="2xl" scrollBehavior="inside">
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <span>Đồng bộ từ web Khoa — xem trước</span>
          <span className="text-xs font-normal text-default-400">
            Chỉ đồng bộ email + tên + MSCB. Không đụng quyền/chức vị. Người đã nghỉ được bỏ qua.
          </span>
        </ModalHeader>
        <ModalBody className="gap-3">
          {loading || !preview ? (
            <div className="flex items-center justify-center gap-3 py-10 text-default-500">
              <Spinner size="sm" /> Đang lấy dữ liệu từ web Khoa…
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <Chip color="success" variant="flat">Tạo mới: {c.create}</Chip>
                <Chip color="primary" variant="flat">Cập nhật: {c.update}</Chip>
                <Chip variant="flat">Không đổi: {c.unchanged}</Chip>
                <Chip color="warning" variant="flat">Bỏ qua: {c.skipped}</Chip>
                <Chip variant="flat" className="ml-auto">Tổng: {preview.total}</Chip>
              </div>

              {preview.toCreate?.length ? (
                <div>
                  <div className="mb-1 text-sm font-semibold text-success-600">
                    Sẽ tạo mới ({preview.toCreate.length})
                  </div>
                  <div className="max-h-48 divide-y divide-default-100 overflow-auto rounded-lg border border-default-200">
                    {preview.toCreate.map((u) => (
                      <div key={u.email} className="flex items-center justify-between gap-3 px-3 py-1.5 text-sm">
                        <span className="truncate">
                          {u.name || <span className="text-default-400">(chưa có tên)</span>}
                        </span>
                        <span className="truncate text-default-400">{u.email}</span>
                        {u.teacher_id ? <span className="text-xs text-default-400">MSCB {u.teacher_id}</span> : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {preview.toUpdate?.length ? (
                <div>
                  <div className="mb-1 text-sm font-semibold text-primary-600">
                    Sẽ cập nhật ({preview.toUpdate.length})
                  </div>
                  <div className="max-h-48 divide-y divide-default-100 overflow-auto rounded-lg border border-default-200">
                    {preview.toUpdate.map((u) => (
                      <div key={u.email} className="px-3 py-1.5 text-sm">
                        <div className="truncate text-default-500">{u.email}</div>
                        {u.changes.name ? (
                          <div className="text-xs">
                            tên: <span className="text-default-400 line-through">{u.changes.name.from || "—"}</span>{" "}
                            → <span className="text-primary-600">{u.changes.name.to}</span>
                          </div>
                        ) : null}
                        {u.changes.teacher_id ? (
                          <div className="text-xs">
                            MSCB: <span className="text-default-400 line-through">{u.changes.teacher_id.from || "—"}</span>{" "}
                            → <span className="text-primary-600">{u.changes.teacher_id.to}</span>
                          </div>
                        ) : null}
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}

              {nothing ? (
                <div className="py-2 text-sm text-default-500">Không có thay đổi nào để đồng bộ.</div>
              ) : null}
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="flat" onPress={onClose}>Huỷ</Button>
          <Button
            color="primary"
            isLoading={applying}
            isDisabled={loading || !preview || nothing}
            onPress={onConfirm}
          >
            Xác nhận đồng bộ
          </Button>
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
  const { data: session } = useSession();
  const iAmSuper = isSuperAdmin(session?.user);

  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { isOpen: isFormOpen, onOpen: openForm, onClose: closeForm } = useDisclosure();
  const { isOpen: isImportOpen, onOpen: openImport, onClose: closeImport } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: openDelete, onClose: closeDelete } = useDisclosure();
  const { isOpen: isFixEmailOpen, onOpen: openFixEmail, onClose: closeFixEmail } = useDisclosure();
  const { isOpen: isSyncOpen, onOpen: openSync, onClose: closeSync } = useDisclosure();

  const [editUser, setEditUser] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [emailTarget, setEmailTarget] = useState(null);
  const [syncLoading, setSyncLoading] = useState(false); // đang lấy bản xem trước
  const [syncPreview, setSyncPreview] = useState(null);
  const [applying, setApplying] = useState(false);

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
  const handleFixEmail = (u) => { setEmailTarget(u); openFixEmail(); };
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

  // Bước 1 — XEM TRƯỚC: kéo dữ liệu web Khoa và tính sẽ tạo/cập nhật/bỏ qua ai,
  // KHÔNG ghi DB. Mở modal để admin duyệt.
  const handleSyncPreview = async () => {
    setSyncPreview(null);
    setSyncLoading(true);
    openSync();
    try {
      const res = await fetch("/api/admin/user/sync-webkhoa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: true }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Lỗi xem trước");
      setSyncPreview(data);
    } catch (e) {
      toast.error(`Xem trước lỗi: ${e.message}`);
      closeSync();
    } finally {
      setSyncLoading(false);
    }
  };

  // Bước 2 — ÁP DỤNG: chỉ chạy khi admin bấm xác nhận. Đồng bộ chỉ định danh
  // (email + tên + MSCB), không đụng quyền/chức vị.
  const handleSyncApply = async () => {
    setApplying(true);
    try {
      const res = await fetch("/api/admin/user/sync-webkhoa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Đồng bộ thất bại");
      toast.success(
        `Đã đồng bộ: +${data.created} mới, ${data.updated} cập nhật, bỏ qua ${data.skipped}.`
      );
      mutate();
      closeSync();
    } catch (e) {
      toast.error(`Đồng bộ lỗi: ${e.message}`);
    } finally {
      setApplying(false);
    }
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
          {iAmSuper && (
            <>
              <Button size="sm" variant="flat" startContent={<RefreshCwIcon size={14} />} onPress={handleSyncPreview} isLoading={syncLoading && !isSyncOpen}>
                Đồng bộ web Khoa
              </Button>
              <Button size="sm" variant="flat" startContent={<UploadIcon size={14} />} onPress={openImport}>
                {t("common.import")}
              </Button>
              <Button size="sm" color="primary" startContent={<PlusIcon size={14} />} onPress={handleAdd}>
                {t("user.add")}
              </Button>
            </>
          )}
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
                {!u.isAdmin ? (
                  <Chip size="sm" color="default" variant="flat" startContent={<XIcon size={11} />}>{t("user.roleUser")}</Chip>
                ) : u.isSuperAdmin ? (
                  <Chip size="sm" color="danger" variant="flat" startContent={<CheckIcon size={11} />}>Super admin</Chip>
                ) : (
                  <div className="flex flex-col leading-tight">
                    <Chip size="sm" color="secondary" variant="flat">Admin (theo mã lớp)</Chip>
                    <span className="text-[11px] text-default-400 mt-0.5">
                      {u.adminScope?.length ? u.adminScope.join(", ") : "⚠ chưa có phạm vi"}
                    </span>
                  </div>
                )}
              </TableCell>
              <TableCell>
                {iAmSuper ? (
                  <div className="flex gap-1">
                    <Tooltip content={t("common.edit")}>
                      <Button isIconOnly size="sm" variant="light" onPress={() => handleEdit(u)}>
                        <PencilIcon size={14} />
                      </Button>
                    </Tooltip>
                    <Tooltip content="Sửa email">
                      <Button isIconOnly size="sm" variant="light" onPress={() => handleFixEmail(u)}>
                        <AtSignIcon size={14} />
                      </Button>
                    </Tooltip>
                    <Tooltip content={t("common.delete")} color="danger">
                      <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => handleDeleteClick(u)}>
                        <Trash2Icon size={14} />
                      </Button>
                    </Tooltip>
                  </div>
                ) : (
                  <span className="text-default-300 text-xs">—</span>
                )}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Modals */}
      <UserFormModal
        isOpen={isFormOpen}
        onClose={closeForm}
        initial={editUser ? { email: editUser.email, name: editUser.name ?? "", teacher_id: editUser.teacher_id ?? "", department: editUser.department ?? "", rank: editUser.rank ?? "", degree: editUser.degree ?? "", isAdmin: editUser.isAdmin, isSuperAdmin: editUser.isSuperAdmin ?? false, adminScope: (editUser.adminScope ?? []).join(", ") } : null}
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
      <FixEmailModal
        isOpen={isFixEmailOpen}
        onClose={closeFixEmail}
        user={emailTarget}
        onDone={mutate}
      />
      <SyncWebkhoaModal
        isOpen={isSyncOpen}
        onClose={closeSync}
        loading={syncLoading}
        preview={syncPreview}
        applying={applying}
        onConfirm={handleSyncApply}
      />
    </div>
  );
}
