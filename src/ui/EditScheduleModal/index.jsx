"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
  Input,
  Chip,
} from "@heroui/react";
import moment from "moment";
import { toast } from "react-toastify";
import { useI18n } from "@/i18n/I18nProvider";

const toInput = (d) => (d ? moment(d).format("YYYY-MM-DD") : "");

// Move / extend a scheduled class series. Re-uses booking/create with the same
// series_id: the API deletes the old occurrences and re-generates them across
// the new [start, end] range on the same weekday + periods. Setting a later end
// date "widens" the series (more weeks); shifting start "moves" it.
export default function EditScheduleModal({ isOpen, onClose, event, onSuccess }) {
  const { t } = useI18n();
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && event) {
      setStart(toInput(event.time_slot?.start_date || event.start));
      setEnd(toInput(event.time_slot?.end_date || event.end || ""));
    }
  }, [isOpen, event]);

  // Rough week count preview (inclusive).
  const weeks = useMemo(() => {
    if (!start || !end) return null;
    const d = moment(end).diff(moment(start), "days");
    return d >= 0 ? Math.round(d / 7) + 1 : null;
  }, [start, end]);

  const save = async () => {
    if (!start || !end) {
      toast.warning(t("sched.needDates"));
      return;
    }
    setLoading(true);
    try {
      const booking = {
        teacher_email: event.teacher_email || [],
        room: event.room,
        location: event.location || event.room?.location,
        course: event.course,
        series_id: event.series_id || event._id,
        time_slot: {
          weekday: event.weekday ?? event.time_slot?.weekday,
          start_time: event.time_slot?.start_time,
          end_time: event.time_slot?.end_time,
          start_date: new Date(start),
          end_date: new Date(end),
        },
      };
      const res = await fetch("/api/booking/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify([booking]),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 201 && data.success !== false) {
        toast.success(t("sched.saved"));
        onSuccess?.();
        onClose();
      } else {
        toast.error(data.message || t("common.somethingWrong"));
      }
    } catch (e) {
      console.log(e);
      toast.error(t("common.somethingWrong"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onOpenChange={(o) => !o && onClose()}>
      <ModalContent>
        <ModalHeader className="flex flex-col gap-1">
          <span>{t("sched.editDates")}</span>
          <span className="text-xs font-normal text-default-500">
            {event?.course?.title || event?.title}
          </span>
        </ModalHeader>
        <ModalBody className="gap-3">
          <p className="text-sm text-default-500">{t("sched.desc")}</p>
          <Input type="date" label={t("cm.startDate")} value={start} onChange={(e) => setStart(e.target.value)} />
          <Input type="date" label={t("sched.endDate")} value={end} onChange={(e) => setEnd(e.target.value)} />
          {weeks != null && (
            <Chip size="sm" variant="flat" color="secondary" className="w-fit">
              {t("sched.weeksInfo", { n: weeks })}
            </Chip>
          )}
        </ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>{t("common.cancel")}</Button>
          <Button color="primary" isLoading={loading} onPress={save}>{t("common.save")}</Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
