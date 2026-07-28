"use client";
import React, { useState } from "react";
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

export default function ViewShareAdminPage() {
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
      alert("Please select at least one room.");
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
    if (!confirm("Are you sure you want to revoke and delete this share link?")) return;
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
     alert("Link copied to clipboard!");
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center w-full">
        <h1 className="text-2xl font-bold">QR Room Sharing Management</h1>
        <Button color="primary" onPress={handleOpenCreate} endContent={<PlusIcon />}>
          Create Share Link
        </Button>
      </div>

      <Table aria-label="Shared Links Table">
        <TableHeader>
          <TableColumn>TITLE</TableColumn>
          <TableColumn>ROOMS</TableColumn>
          <TableColumn>CODE</TableColumn>
          <TableColumn>LOGIN REQUIRED</TableColumn>
          <TableColumn>LINK / QR</TableColumn>
          <TableColumn>ACTIONS</TableColumn>
        </TableHeader>
        <TableBody 
          items={shares || []} 
          isLoading={isLoading}
          emptyContent={"No active shares found."}
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
              <TableCell>{item.settings?.requireLogin ? "Yes" : "No"}</TableCell>
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
                      Open
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
          <ModalHeader>{formData.id ? "Edit Share Link" : "Create New Share Link"}</ModalHeader>
          <ModalBody className="flex flex-col gap-4">
            <Input 
              label="Share Title" 
              placeholder="e.g. Lobby Screens" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              isRequired
              variant="bordered"
            />
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Rooms Schedule</label>
              <Autocomplete
                defaultItems={rooms || []}
                placeholder="Search and add rooms..."
                variant="bordered"
                onSelectionChange={handleAddRoom}
                startContent={<SearchIcon size={18} className="text-default-400" />}
                clearOnBlur={true}
              >
                {(item) => (
                  <AutocompleteItem key={item._id} textValue={item.title}>
                    <div className="flex justify-between items-center">
                      <span>{item.title}</span>
                      <span className="text-tiny text-default-400">{item.limit} users</span>
                    </div>
                  </AutocompleteItem>
                )}
              </Autocomplete>

              <div className="flex flex-wrap gap-2 mt-2 p-2 border-2 border-dashed border-default-200 rounded-xl min-h-[50px] items-center">
                {formData.rooms.size === 0 && (
                  <p className="text-xs text-default-400 w-full text-center">No rooms selected</p>
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
                <span className="text-sm font-semibold mb-1">Display & Security Settings</span>
                <Checkbox 
                  isSelected={formData.settings.requireLogin}
                  onValueChange={(val) => setFormData(f => ({...f, settings: {...f.settings, requireLogin: val}}))}
                >
                  Require Login via Physoom (Internal sharing only)
                </Checkbox>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  <Checkbox 
                    isSelected={formData.settings.displayTeacherInfo}
                    onValueChange={(val) => setFormData(f => ({...f, settings: {...f.settings, displayTeacherInfo: val}}))}
                  >
                    Show Teacher
                  </Checkbox>
                  <Checkbox 
                    isSelected={formData.settings.displayClassInfo}
                    onValueChange={(val) => setFormData(f => ({...f, settings: {...f.settings, displayClassInfo: val}}))}
                  >
                    Show Class IDs
                  </Checkbox>
                  <Checkbox 
                    isSelected={formData.settings.displayEventDetail}
                    onValueChange={(val) => setFormData(f => ({...f, settings: {...f.settings, displayEventDetail: val}}))}
                  >
                    Show Course Names
                  </Checkbox>
                </div>
            </div>
          </ModalBody>
          <ModalFooter>
             <Button variant="light" onPress={onClose}>Cancel</Button>
             <Button color="primary" onPress={onSubmit} isLoading={isSubmitting} className="font-semibold">
               {formData.id ? "Update Share Link" : "Create Share Link"}
             </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      <Modal isOpen={isQRModalOpen} onClose={onQRModalClose}>
        <ModalContent>
          <ModalHeader>QR Code</ModalHeader>
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
                     <p className="text-xs text-default-400">Quick access code</p>
                     <p className="text-2xl font-mono font-bold tracking-[0.3em] text-secondary">
                       {activeShare.shortCode}
                     </p>
                     <p className="text-xs text-default-400">Enter at <strong>/view/room</strong></p>
                   </div>
                 )}
                 <p className="text-xs text-center text-gray-500 max-w-[250px] break-all mt-2">
                    {`${currentDomain}/share/${activeShare.token}`}
                 </p>
              </>
            )}
          </ModalBody>
          <ModalFooter>
             <Button color="primary" onPress={onQRModalClose}>Done</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </div>
  );
}
