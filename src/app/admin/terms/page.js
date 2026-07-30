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
import { useI18n } from "@/i18n/I18nProvider";

export default function TermsAndHolidaysPage() {
  const { t } = useI18n();
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
    if (!confirm(t("terms.confirmDelete"))) return;
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
        <h1 className="text-2xl font-bold">{t("terms.title")}</h1>
        <Button color="primary" onPress={onOpen} endContent={<PlusIcon />}>
          {t("terms.createNew")}
        </Button>
      </div>

      <Table aria-label="Terms and Holidays Table" >
        <TableHeader>
          <TableColumn>{t("terms.colTitle")}</TableColumn>
          <TableColumn>{t("terms.colType")}</TableColumn>
          <TableColumn>{t("terms.colStart")}</TableColumn>
          <TableColumn>{t("terms.colEnd")}</TableColumn>
          <TableColumn>{t("terms.colActions")}</TableColumn>
        </TableHeader>
        <TableBody
          items={events || []}
          isLoading={isLoading}
          emptyContent={t("terms.empty")}
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
                  {t("terms.delete")}
                </Button>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalContent>
          <ModalHeader>{t("terms.createModal")}</ModalHeader>
          <ModalBody className="flex flex-col gap-4">
            <Input
              label={t("terms.fieldTitle")}
              placeholder={t("terms.fieldTitlePh")}
              value={formData.title}
              onChange={(e) => setFormData({...formData, title: e.target.value})}
              isRequired
            />
            <Select
              label={t("terms.fieldType")}
              selectedKeys={[formData.type]}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <SelectItem key="term" value="term">{t("terms.typeTerm")}</SelectItem>
              <SelectItem key="holiday" value="holiday">{t("terms.typeHoliday")}</SelectItem>
            </Select>
            <Input
              type="date"
              label={t("terms.startDate")}
              placeholder=" "
              value={formData.start}
              onChange={(e) => setFormData({...formData, start: e.target.value})}
              isRequired
            />
            <Input
              type="date"
              label={t("terms.endDate")}
              placeholder=" "
              value={formData.end}
              onChange={(e) => setFormData({...formData, end: e.target.value})}
              isRequired
            />
          </ModalBody>
          <ModalFooter>
             <Button variant="light" onPress={onClose}>{t("common.cancel")}</Button>
             <Button color="primary" onPress={onSubmit} isLoading={isSubmitting}>{t("common.save")}</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

    </div>
  );
}
