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
import { PlusIcon, FlagIcon } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { getVnNationalHolidays, hasLunarDates } from "@/lib/vnHolidays";
import { toast } from "react-toastify";

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
  const [nationalYear, setNationalYear] = useState(String(new Date().getFullYear()));
  const [loadingNational, setLoadingNational] = useState(false);

  // Add the Vietnamese national public holidays for a year, skipping any that
  // already exist (matched by title + start date).
  const loadNational = async () => {
    const year = parseInt(nationalYear, 10);
    if (!year) return;
    setLoadingNational(true);
    try {
      const existing = new Set(
        (events ?? []).map((e) => `${e.title}|${moment(e.start).format("YYYY-MM-DD")}`)
      );
      const toAdd = getVnNationalHolidays(year).filter(
        (h) => !existing.has(`${h.title}|${h.start}`)
      );
      let added = 0;
      for (const h of toAdd) {
        const res = await fetch("/api/calendar-events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(h),
        });
        if (res.ok) added += 1;
      }
      mutate();
      if (added === 0) {
        toast.info(t("terms.nationalNoneNew", { y: year }));
      } else {
        toast.success(t("terms.nationalAdded", { n: added, y: year }));
        if (!hasLunarDates(year)) toast.warning(t("terms.nationalNoLunar", { y: year }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingNational(false);
    }
  };

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
        <div className="flex items-center gap-2 flex-wrap">
          <Input
            type="number"
            size="sm"
            aria-label={t("terms.year")}
            className="w-24"
            value={nationalYear}
            onValueChange={setNationalYear}
            startContent={<span className="text-default-400 text-xs">{t("terms.year")}</span>}
          />
          <Button
            color="secondary"
            variant="flat"
            onPress={loadNational}
            isLoading={loadingNational}
            startContent={<FlagIcon size={16} />}
          >
            {t("terms.loadNational")}
          </Button>
          <Button color="primary" onPress={onOpen} endContent={<PlusIcon />}>
            {t("terms.createNew")}
          </Button>
        </div>
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
