"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { useSession } from "next-auth/react";
import { fetcher } from "@/lib/ulti";
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Button, Input, Textarea, Select, SelectItem, Chip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter, useDisclosure,
} from "@heroui/react";
import { KeyRoundIcon, PlusIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { toast } from "react-toastify";

const ENVS = ["production", "preview", "development", "all"];
const STATUSES = ["active", "revoked", "expired"];
const statusColor = { active: "success", revoked: "default", expired: "danger" };

// Rotation health from the policy (rotateEveryDays) + lastRotatedAt.
function rotation(e) {
  if (!e.rotateEveryDays || !e.lastRotatedAt) return null;
  const due = new Date(e.lastRotatedAt).getTime() + e.rotateEveryDays * 86400000;
  const days = Math.round((due - Date.now()) / 86400000);
  if (days < 0) return { label: `Quá hạn ${-days}d`, color: "danger" };
  if (days <= 14) return { label: `Còn ${days}d`, color: "warning" };
  return { label: `${days}d`, color: "success" };
}

const EMPTY = {
  app: "", name: "", provider: "", environment: "production", location: "",
  owner: "", last4: "", status: "active", rotateEveryDays: 0, lastRotatedAt: "", notes: "",
};

export default function ApiKeysPage() {
  const { data: session } = useSession();
  const isSuper = !!session?.user?.isSuperAdmin;
  const { data, mutate, isLoading } = useSWR(isSuper ? "/api/admin/api-keys" : null, fetcher);
  const entries = data?.entries ?? [];

  const [q, setQ] = useState("");
  const [appFilter, setAppFilter] = useState("");
  const { isOpen, onOpen, onOpenChange } = useDisclosure();
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);

  const apps = useMemo(
    () => [...new Set(entries.map((e) => e.app).filter(Boolean))].sort(),
    [entries]
  );

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return entries.filter((e) => {
      if (appFilter && e.app !== appFilter) return false;
      if (qq && !`${e.app} ${e.name} ${e.provider} ${e.owner} ${e.location}`.toLowerCase().includes(qq)) return false;
      return true;
    });
  }, [entries, q, appFilter]);

  const openAdd = () => { setForm(EMPTY); setEditingId(null); onOpen(); };
  const openEdit = (e) => {
    setForm({
      ...EMPTY, ...e,
      lastRotatedAt: e.lastRotatedAt ? new Date(e.lastRotatedAt).toISOString().slice(0, 10) : "",
    });
    setEditingId(e._id);
    onOpen();
  };

  const save = async (onClose) => {
    if (!form.app.trim() || !form.name.trim()) { toast.error("Cần nhập App và Tên key."); return; }
    setSaving(true);
    try {
      const payload = { ...form, lastRotatedAt: form.lastRotatedAt || null };
      const res = await fetch(editingId ? `/api/admin/api-keys/${editingId}` : "/api/admin/api-keys", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || "Lưu thất bại."); return; }
      await mutate();
      onClose();
    } finally { setSaving(false); }
  };

  const remove = async (e) => {
    if (!confirm(`Xoá bản ghi "${e.app} · ${e.name}"? (chỉ xoá khỏi sổ đăng ký, không đụng secret thật)`)) return;
    await fetch(`/api/admin/api-keys/${e._id}`, { method: "DELETE" });
    mutate();
  };

  if (!isSuper) {
    return <div className="p-6 text-default-500">Chỉ <b>super admin</b> mới xem được sổ đăng ký khóa API.</div>;
  }

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex items-center gap-2">
        <KeyRoundIcon className="text-secondary" />
        <h1 className="text-xl font-bold">Sổ đăng ký khóa API</h1>
      </div>
      <p className="text-sm text-default-500 -mt-2">
        Theo dõi khóa API/secret của mọi app để khỏi mất kiểm soát. <b>Không lưu giá trị secret</b> —
        chỉ metadata + 4–6 ký tự cuối để nhận diện. Secret thật vẫn ở env / secret manager của từng app.
      </p>

      <div className="flex flex-wrap items-center gap-2">
        <Input size="sm" className="max-w-xs" placeholder="Tìm app / key / dịch vụ / owner…" value={q} onValueChange={setQ} isClearable />
        <Select size="sm" className="max-w-[180px]" placeholder="Lọc theo app" selectedKeys={appFilter ? [appFilter] : []}
          onChange={(e) => setAppFilter(e.target.value)}>
          <SelectItem key="">Tất cả app</SelectItem>
          {apps.map((a) => <SelectItem key={a}>{a}</SelectItem>)}
        </Select>
        <div className="ml-auto">
          <Button color="secondary" size="sm" startContent={<PlusIcon size={16} />} onPress={openAdd}>Thêm khóa</Button>
        </div>
      </div>

      <Table aria-label="API keys registry" isHeaderSticky classNames={{ wrapper: "max-h-[600px]" }}>
        <TableHeader>
          <TableColumn>APP</TableColumn>
          <TableColumn>KEY</TableColumn>
          <TableColumn>DỊCH VỤ</TableColumn>
          <TableColumn>MÔI TRƯỜNG</TableColumn>
          <TableColumn>NƠI LƯU</TableColumn>
          <TableColumn>OWNER</TableColumn>
          <TableColumn>…4</TableColumn>
          <TableColumn>TRẠNG THÁI</TableColumn>
          <TableColumn>XOAY VÒNG</TableColumn>
          <TableColumn>{""}</TableColumn>
        </TableHeader>
        <TableBody items={filtered} emptyContent={isLoading ? "Đang tải…" : "Chưa có khóa nào — bấm 'Thêm khóa'."}>
          {(e) => {
            const rot = rotation(e);
            return (
              <TableRow key={e._id}>
                <TableCell><Chip size="sm" variant="flat" color="secondary">{e.app}</Chip></TableCell>
                <TableCell className="font-mono text-xs">{e.name}</TableCell>
                <TableCell>{e.provider || "—"}</TableCell>
                <TableCell>{e.environment}</TableCell>
                <TableCell className="text-xs text-default-500">{e.location || "—"}</TableCell>
                <TableCell className="text-xs">{e.owner || "—"}</TableCell>
                <TableCell className="font-mono text-xs">{e.last4 ? `…${e.last4}` : "—"}</TableCell>
                <TableCell><Chip size="sm" variant="flat" color={statusColor[e.status] || "default"}>{e.status}</Chip></TableCell>
                <TableCell>{rot ? <Chip size="sm" variant="flat" color={rot.color}>{rot.label}</Chip> : <span className="text-default-400 text-xs">—</span>}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button isIconOnly size="sm" variant="light" onPress={() => openEdit(e)}><PencilIcon size={15} /></Button>
                    <Button isIconOnly size="sm" variant="light" color="danger" onPress={() => remove(e)}><Trash2Icon size={15} /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          }}
        </TableBody>
      </Table>

      <Modal isOpen={isOpen} onOpenChange={onOpenChange} size="2xl" scrollBehavior="inside">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>{editingId ? "Sửa khóa" : "Thêm khóa"}</ModalHeader>
              <ModalBody>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input isRequired label="App" placeholder="physoom / offisoom / geolisten…" value={form.app} onValueChange={set("app")} />
                  <Input isRequired label="Tên key (env var)" placeholder="NEXT_GOOGLE_SECRET" value={form.name} onValueChange={set("name")} />
                  <Input label="Dịch vụ" placeholder="Google / Vercel / MongoDB / VAPID…" value={form.provider} onValueChange={set("provider")} />
                  <Select label="Môi trường" selectedKeys={[form.environment]} onChange={(e) => set("environment")(e.target.value)}>
                    {ENVS.map((x) => <SelectItem key={x}>{x}</SelectItem>)}
                  </Select>
                  <Input label="Nơi lưu" placeholder="Vercel env — physoom / .env.local" value={form.location} onValueChange={set("location")} />
                  <Input label="Owner (email)" placeholder="ai chịu trách nhiệm" value={form.owner} onValueChange={set("owner")} />
                  <Input label="4–6 ký tự cuối (nhận diện)" description="KHÔNG dán cả secret — chỉ vài ký tự cuối." maxLength={6} value={form.last4} onValueChange={set("last4")} />
                  <Select label="Trạng thái" selectedKeys={[form.status]} onChange={(e) => set("status")(e.target.value)}>
                    {STATUSES.map((x) => <SelectItem key={x}>{x}</SelectItem>)}
                  </Select>
                  <Input type="number" label="Xoay vòng mỗi (ngày)" description="0 = không nhắc" value={String(form.rotateEveryDays ?? 0)} onValueChange={(v) => set("rotateEveryDays")(Number(v) || 0)} />
                  <Input type="date" label="Lần xoay gần nhất" value={form.lastRotatedAt || ""} onValueChange={set("lastRotatedAt")} />
                  <div className="sm:col-span-2">
                    <Textarea label="Ghi chú" value={form.notes} onValueChange={set("notes")} />
                  </div>
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="light" onPress={onClose}>Huỷ</Button>
                <Button color="secondary" isLoading={saving} onPress={() => save(onClose)}>Lưu</Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
