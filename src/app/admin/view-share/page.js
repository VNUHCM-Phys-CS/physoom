"use client";
import React, { useState, useMemo } from "react";
import useSWR from "swr";
import { fetcher, fetcheroptions } from "@/lib/ulti";
import { 
  Button, 
  Input, 
  Autocomplete, 
  AutocompleteItem, 
  Chip,
  Table, 
  TableHeader, 
  TableBody, 
  TableColumn, 
  TableRow, 
  TableCell,
  useDisclosure,
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Checkbox,
  Link
} from "@heroui/react";
import { QRCodeSVG } from "qrcode.react";
import { PlusIcon, QrCodeIcon, CopyIcon, Trash2Icon, PencilIcon, SearchIcon, HashIcon } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

export default function ViewShareAdminPage() {
  const { t } = useI18n();
  const { data: shares, mutate, isLoading } = useSWR("/api/view-share", fetcher);
  
  // Fetch Rooms to allow selection
  const { data: rooms } = useSWR(["/api/room", { method: "POST", body: JSON.stringify({}) }], fetcheroptions);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isQRModalOpen, onOpen: onQRModalOpen, onClose: onQRModalClose } = useDisclosure();
  
  const [activeShare, setActiveShare] = useState(null);
  
  const [formData, setFormData] = useState({
    id: null,
    title: "",
    rooms: new Set(),
    settings: {
      requireLogin: false,
      displayTeacherInfo: true,
      displayClassInfo: true,
      displayEventDetail: true  
    }
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search + sort
  const [search, setSearch] = useState("");
  const [sortDescriptor, setSortDescriptor] = useState({ column: "title", direction: "ascending" });

  const displayed = useMemo(() => {
    const q = search.trim().toLowerCase();
    const has = (v) => String(v ?? "").toLowerCase().includes(q);
    let rows = (shares ?? []).filter(
      (s) =>
        !q ||
        has(s.title) ||
        has(s.shortCode) ||
        (s.rooms ?? []).some((r) => has(r.title))
    );
    const { column, direction } = sortDescriptor;
    const val = (s) => {
      if (column === "requireLogin") return s.settings?.requireLogin ? "1" : "0";
      return String(s[column] ?? "").toLowerCase();
    };
    rows = [...rows].sort((a, b) => {
      const av = val(a), bv = val(b);
      const cmp = av < bv ? -1 : av > bv ? 1 : 0;
      return direction === "descending" ? -cmp : cmp;
    });
    return rows;
  }, [shares, search, sortDescriptor]);

  const handleOpenCreate = () => {
    setFormData({ 
      id: null, 
      title: "", 
      rooms: new Set(), 
      settings: { requireLogin: false, displayTeacherInfo: true, displayClassInfo: true, displayEventDetail: true } 
    });
    onOpen();
  };

  const handleOpenEdit = (share) => {
    setFormData({
      id: share._id,
      title: share.title,
      rooms: new Set(share.rooms?.map(r => r._id) || []),
      settings: { ...share.settings }
    });
    onOpen();
  };

  const handleAddRoom = (key) => {
    if (!key) return;
    setFormData(prev => {
      const next = new Set(prev.rooms);
      next.add(key);
      return { ...prev, rooms: next };
    });
  };

  const handleRemoveRoom = (id) => {
    setFormData(prev => {
      const next = new Set(prev.rooms);
      next.delete(id);
      return { ...prev, rooms: next };
    });
  };

  const onSubmit = async () => {
    if (formData.rooms.size === 0) {
      alert(t("share.selectAtLeastOne"));
      return;
    }
    setIsSubmitting(true);
    const method = formData.id ? "PUT" : "POST";
    try {
      const res = await fetch("/api/view-share", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id: formData.id,
            title: formData.title,
            rooms: Array.from(formData.rooms),
            settings: formData.settings
        })
      });
      if (res.ok) {
        mutate();
        onClose();
        handleOpenCreate(); // reset
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async (id) => {
    if (!confirm(t("share.confirmDelete"))) return;
    try {
      await fetch("/api/view-share", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      mutate();
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to find room title by ID
  const getRoomTitle = (id) => rooms?.find(r => r._id === id)?.title || id;

  const currentDomain = typeof window !== 'undefined' ? window.location.origin : '';

  const handleCopyLink = (token) => {
     navigator.clipboard.writeText(`${currentDomain}/share/${token}`);
     alert(t("share.linkCopied"));
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center w-full">
        <h1 className="text-2xl font-bold">{t("share.title")}</h1>
        <Button color="primary" onPress={handleOpenCreate} endContent={<PlusIcon />}>
          {t("share.create")}
        </Button>
      </div>

      <Input
        isClearable
        size="sm"
        className="max-w-xs"
        placeholder={t("share.searchPh")}
        startContent={<SearchIcon size={15} className="text-default-400" />}
        value={search}
        onValueChange={setSearch}
        onClear={() => setSearch("")}
      />

      <Table
        aria-label="Shared Links Table"
        sortDescriptor={sortDescriptor}
        onSortChange={setSortDescriptor}
      >
        <TableHeader>
          <TableColumn key="title" allowsSorting>{t("share.colTitle")}</TableColumn>
          <TableColumn key="rooms">{t("share.colRooms")}</TableColumn>
          <TableColumn key="shortCode" allowsSorting>{t("share.colCode")}</TableColumn>
          <TableColumn key="requireLogin" allowsSorting>{t("share.colLogin")}</TableColumn>
          <TableColumn key="link">{t("share.colLink")}</TableColumn>
          <TableColumn key="actions">{t("user.colActions")}</TableColumn>
        </TableHeader>
        <TableBody
          items={displayed}
          isLoading={isLoading}
          emptyContent={t("share.none")}
        >
          {(item) => (
            <TableRow key={item._id}>
              <TableCell className="font-semibold">{item.title}</TableCell>
              <TableCell>{item.rooms?.map(r => r.title).join(", ")}</TableCell>
              <TableCell>
                {item.shortCode ? (
                  <div className="flex items-center gap-1">
                    <Chip
                      size="sm" variant="flat" color="secondary"
                      startContent={<HashIcon size={11} />}
                      className="font-mono font-bold tracking-widest cursor-pointer"
                      onClick={() => navigator.clipboard.writeText(item.shortCode)}
                    >
                      {item.shortCode}
                    </Chip>
                  </div>
                ) : <span className="text-default-400 text-xs">—</span>}
              </TableCell>
              <TableCell>{item.settings?.requireLogin ? t("common.yes") : t("common.no")}</TableCell>
              <TableCell>
                 <div className="flex items-center gap-2">
                    <Button isIconOnly size="sm" variant="light" onPress={() => handleCopyLink(item.token)}>
                      <CopyIcon size={16}/>
                    </Button>
                    <Button 
                       isIconOnly size="sm" variant="flat" color="primary"
                       onPress={() => {
                          setActiveShare(item);
                          onQRModalOpen();
                       }}
                    >
                      <QrCodeIcon size={16}/>
                    </Button>
                    <Link href={`/share/${item.token}`} target="_blank" className="text-sm border-b">
                      {t("common.open")}
                    </Link>
                 </div>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-1">
                  <Button isIconOnly size="sm" color="default" variant="light" onPress={() => handleOpenEdit(item)}>
                    <PencilIcon size={16}/>
                  </Button>
                  <Button isIconOnly size="sm" color="danger" variant="light" onPress={() => onDelete(item._id)}>
                    <Trash2Icon size={16}/>
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalContent>
          <ModalHeader>{formData.id ? t("share.editTitle") : t("share.createTitle")}</ModalHeader>
          <ModalBody className="flex flex-col gap-4">
            <Input
              label={t("share.fTitle")}
              placeholder={t("share.fTitlePh")}
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              isRequired
              variant="bordered"
            />
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">{t("share.roomsLabel")}</label>
              <Autocomplete
                defaultItems={rooms || []}
                placeholder={t("share.roomsPh")}
                variant="bordered"
                onSelectionChange={handleAddRoom}
                startContent={<SearchIcon size={18} className="text-default-400" />}
                clearOnBlur={true}
              >
                {(item) => (
                  <AutocompleteItem key={item._id} textValue={item.title}>
                    <div className="flex justify-between items-center">
                      <span>{item.title}</span>
                      <span className="text-tiny text-default-400">{t("share.usersUnit", { n: item.limit })}</span>
                    </div>
                  </AutocompleteItem>
                )}
              </Autocomplete>

              <div className="flex flex-wrap gap-2 mt-2 p-2 border-2 border-dashed border-default-200 rounded-xl min-h-[50px] items-center">
                {formData.rooms.size === 0 && (
                  <p className="text-xs text-default-400 w-full text-center">{t("share.noRooms")}</p>
                )}
                {Array.from(formData.rooms).map((id) => (
                  <Chip
                    key={id}
                    onClose={() => handleRemoveRoom(id)}
                    variant="flat"
                    color="primary"
                    className="capitalize"
                  >
                    {getRoomTitle(id)}
                  </Chip>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-2 mt-2 p-4 border rounded-xl bg-default-50/50">
                <span className="text-sm font-semibold mb-1">{t("share.settings")}</span>
                <Checkbox
                  isSelected={formData.settings.requireLogin}
                  onValueChange={(val) => setFormData(f => ({...f, settings: {...f.settings, requireLogin: val}}))}
                >
                  {t("share.requireLogin")}
                </Checkbox>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  <Checkbox 
                    isSelected={formData.settings.displayTeacherInfo}
                    onValueChange={(val) => setFormData(f => ({...f, settings: {...f.settings, displayTeacherInfo: val}}))}
                  >
                    {t("share.showTeacher")}
                  </Checkbox>
                  <Checkbox 
                    isSelected={formData.settings.displayClassInfo}
                    onValueChange={(val) => setFormData(f => ({...f, settings: {...f.settings, displayClassInfo: val}}))}
                  >
                    {t("share.showClass")}
                  </Checkbox>
                  <Checkbox 
                    isSelected={formData.settings.displayEventDetail}
                    onValueChange={(val) => setFormData(f => ({...f, settings: {...f.settings, displayEventDetail: val}}))}
                  >
                    {t("share.showCourse")}
                  </Checkbox>
                </div>
            </div>
          </ModalBody>
          <ModalFooter>
             <Button variant="light" onPress={onClose}>{t("common.cancel")}</Button>
             <Button color="primary" onPress={onSubmit} isLoading={isSubmitting} className="font-semibold">
               {formData.id ? t("share.update") : t("share.create")}
             </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isQRModalOpen} onClose={onQRModalClose}>
        <ModalContent>
          <ModalHeader>{t("share.qrTitle")}</ModalHeader>
          <ModalBody className="flex flex-col items-center justify-center py-8">
            {activeShare && (
              <>
                 <QRCodeSVG 
                    value={`${currentDomain}/share/${activeShare.token}`} 
                    size={256} 
                    level="H"
                    includeMargin={true}
                 />
                 <p className="mt-4 text-center font-medium">{activeShare.title}</p>
                 {activeShare.shortCode && (
                   <div className="flex flex-col items-center gap-1 mt-1">
                     <p className="text-xs text-default-400">{t("share.quickCode")}</p>
                     <p className="text-2xl font-mono font-bold tracking-[0.3em] text-secondary">
                       {activeShare.shortCode}
                     </p>
                     <p className="text-xs text-default-400">{t("share.enterAt")} <strong>/view/room</strong></p>
                   </div>
                 )}
                 <p className="text-xs text-center text-gray-500 max-w-[250px] break-all mt-2">
                    {`${currentDomain}/share/${activeShare.token}`}
                 </p>
              </>
            )}
          </ModalBody>
          <ModalFooter>
             <Button color="primary" onPress={onQRModalClose}>{t("common.done")}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </div>
  );
}
