"use client";
import React, { useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";
import { 
  Button, 
  Input, 
  Select, 
  SelectItem, 
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
  Chip
} from "@heroui/react";
import moment from "moment";
import { PlusIcon } from "lucide-react";

export default function TermsAndHolidaysPage() {
  const { data: events, mutate, isLoading } = useSWR("/api/calendar-events?type=term,holiday", fetcher);
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const [formData, setFormData] = useState({
    title: "",
    type: "term",
    start: "",
    end: ""
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/calendar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        mutate();
        onClose();
        setFormData({ title: "", type: "term", start: "", end: "" });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  const onDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this?")) return;
    try {
      await fetch("/api/calendar-events", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id })
      });
      mutate();
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4">
      <div className="flex justify-between items-center w-full">
        <h1 className="text-2xl font-bold">Terms & Holidays</h1>
        <Button color="primary" onPress={onOpen} endContent={<PlusIcon />}>
          Create New
        </Button>
      </div>

      <Table aria-label="Terms and Holidays Table" >
        <TableHeader>
          <TableColumn>TITLE</TableColumn>
          <TableColumn>TYPE</TableColumn>
          <TableColumn>START DATE</TableColumn>
          <TableColumn>END DATE</TableColumn>
          <TableColumn>ACTIONS</TableColumn>
        </TableHeader>
        <TableBody 
          items={events || []} 
          isLoading={isLoading}
          emptyContent={"No terms or holidays found."}
        >
          {(item) => (
            <TableRow key={item._id}>
              <TableCell className="font-semibold">{item.title}</TableCell>
              <TableCell>
                <Chip color={item.type === 'term' ? "primary" : "secondary"} size="sm">
                  {item.type.toUpperCase()}
                </Chip>
              </TableCell>
              <TableCell>{moment(item.start).format('DD MMM YYYY')}</TableCell>
              <TableCell>{moment(item.end).format('DD MMM YYYY')}</TableCell>
              <TableCell>
                <Button size="sm" color="danger" variant="flat" onPress={() => onDelete(item._id)}>
                  Delete
                </Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>Create Term or Holiday</ModalHeader>
          <ModalBody className="flex flex-col gap-4">
            <Input 
              label="Title" 
              placeholder="e.g. Fall 2026 or Spring Break" 
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              isRequired
            />
            <Select 
              label="Type" 
              selectedKeys={[formData.type]}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <SelectItem key="term" value="term">Academic Term</SelectItem>
              <SelectItem key="holiday" value="holiday">Holiday / Break</SelectItem>
            </Select>
            <Input 
              type="date"
              label="Start Date" 
              placeholder=" "
              value={formData.start}
              onChange={(e) => setFormData({...formData, start: e.target.value})}
              isRequired
            />
            <Input 
              type="date"
              label="End Date" 
              placeholder=" "
              value={formData.end}
              onChange={(e) => setFormData({...formData, end: e.target.value})}
              isRequired
            />
          </ModalBody>
          <ModalFooter>
             <Button variant="light" onPress={onClose}>Cancel</Button>
             <Button color="primary" onPress={onSubmit} isLoading={isSubmitting}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </div>
  );
}
