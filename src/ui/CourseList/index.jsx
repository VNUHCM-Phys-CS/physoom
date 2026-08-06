"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  ButtonGroup,
  Chip,
  Listbox,
  ListboxItem,
  ListboxSection,
  Tooltip,
} from "@heroui/react";
import { ScrollShadow } from "@heroui/react";
import "./CourseList.scss";
import { LockFill } from "../icons/LockFill";
import StageButton from "../StageButton";
import { UnlockFill } from "../icons/UnlockFill";
import { CalendarOffIcon, AlertTriangleIcon } from "lucide-react";

// Small ⚠ badge (with a tooltip listing the reasons) shown on courses that
// carry import/health warnings, so scheduling users can spot problem courses.
function WarnBadge({ warnings }) {
  if (!warnings?.length) return null;
  return (
    <Tooltip
      color="warning"
      content={
        <div className="max-w-[220px] text-xs">
          {warnings.map((w, i) => (
            <div key={i}>• {w}</div>
          ))}
        </div>
      }
    >
      <AlertTriangleIcon size={14} className="text-warning-500 shrink-0" />
    </Tooltip>
  );
}
import { useI18n } from "@/i18n/I18nProvider";

export default function CourseList({ course, onSelectionChange, userEvents, onUnschedule }) {
  const { t } = useI18n();
  const [selectedKeys, setSelectedKeys] = useState(new Set([]));
  const courseGroup = useMemo(() => {
    let done = {};
    (userEvents ?? []).forEach((d) => (done[d?.course?.title] = true));
    let l = [
      { key: "pending", title: t("booking.pendingClass"), data: [], emptyText: t("booking.noAction") },
      { key: "planned", title: t("booking.plannedClass"), data: [] },
    ];
    (course ?? []).forEach((c) => {
      if (done[c.title]) l[1].data.push(c);
      else l[0].data.push(c);
    });
    if (l[1].data.length === 0) l = [l[0]];
    return l;
  }, [userEvents, course, t]);
  useEffect(() => {
    const select = Array.from(selectedKeys);
    if (select[0] && onSelectionChange) {
      const c = course.find((d) => d._id === select[0]);
      onSelectionChange(c);
    }
  }, [selectedKeys, course, onSelectionChange]);
  return (
    <ScrollShadow className="flex flex-col gap-2 h-full w-full relative">
      <Listbox
        className="list-stack"
        aria-label="course booking selection"
        variant="flat"
        disallowEmptySelection
        selectionMode="single"
        selectedKeys={selectedKeys}
        onSelectionChange={setSelectedKeys}
        disabledKeys={["empty"]}
        hideSelectedIcon
      >
        {courseGroup.map((cg) => (
          <ListboxSection key={cg.key} title={cg.title} showDivider>
            {cg.data.map(
              ({ title, location, teacher_email, credit, _id, isLock, warnings }) => (
                <ListboxItem
                  key={_id}
                  classNames={{ base: warnings?.length ? "bg-warning-50/60 rounded-lg" : "" }}
                  description={
                    <div>
                      <div className="flex w-full">
                        <StageButton
                          name="lock"
                          size="sm"
                          variant="light"
                          checked={isLock ?? false}
                          color="danger"
                          trueIcon={<LockFill />}
                          falseIcon={<UnlockFill />}
                          falseText={"Unlock"}
                          trueText={"Locked"}
                        />
                      </div>
                      <h6 className="prose-lead:h6">
                        {teacher_email.map((d) => (
                          <div>{d}</div>
                        ))}
                      </h6>
                      <div className="flex gap-1">
                        <Chip size="sm" color="primary">
                          {location}
                        </Chip>
                        <Chip size="sm" variant="shadow">
                          {credit} credits
                        </Chip>
                      </div>
                      {cg.key === "planned" && onUnschedule && (
                        <Button
                          size="sm"
                          variant="flat"
                          color="warning"
                          className="mt-2"
                          startContent={<CalendarOffIcon size={13} />}
                          onPress={() => onUnschedule({ _id, title })}
                        >
                          {t("course.moveToPending")}
                        </Button>
                      )}
                    </div>
                  }
                  className="stack-item py-3"
                  // startContent={<LockFill className={" w-3 h-3"}/>}
                >
                  <span className="inline-flex items-center gap-1">
                    <WarnBadge warnings={warnings} />
                    {title}
                  </span>
                </ListboxItem>
              )
            )}
            {cg.data.length === 0 && (
              <ListboxItem key="empty">{cg.emptyText}</ListboxItem>
            )}
          </ListboxSection>
        ))}
      </Listbox>
    </ScrollShadow>
  );
}
