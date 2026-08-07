"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  ButtonGroup,
  Checkbox,
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
import { useI18n } from "@/i18n/I18nProvider";

// ⚠ badge + tooltip for courses carrying import/health warnings.
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
      {/* z-index + pointer-events + hit padding so the checkbox's tap area on
          the same line doesn't swallow the hover. */}
      <span className="relative z-20 inline-flex items-center shrink-0 cursor-help p-1 -m-1 pointer-events-auto">
        <AlertTriangleIcon size={14} className="text-warning-500" />
      </span>
    </Tooltip>
  );
}

export default function CourseListSelect({
  course,
  onSelectionChange,
  userEvents,
  onUpdate,
  currentId,
  onUnschedule,
}) {
  const { t } = useI18n();
  const [selectedKeys, setSelectedKeys] = useState(new Set([]));
  useEffect(() => {
    if (currentId)
      setSelectedKeys(new Set().add(currentId.toString()));
  }, [currentId]);
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

  const [selectedRelated, setSelectedRelated] = useState(new Set());
  const [checkAllBtn, setCheckAllBtn] = useState({ isIn: false, isSe: false });

  useEffect(() => {
    setSelectedRelated(new Set());
    setCheckAllBtn({ isIn: false, isSe: false });
  }, [course]);

  const handleRelatedSelection = (key, v) => {
    setSelectedRelated((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(key)) {
        if (!v) newSelected.delete(key);
        else return prev;
      } else {
        if (v) newSelected.add(key);
        else return prev;
      }

      setCheckAllBtn(prevBtn => {
        if (newSelected.size === course.length) {
          return { isIn: false, isSe: true };
        } else if (newSelected.size === 0) {
          return { isIn: false, isSe: false };
        } else {
          return { isIn: true, isSe: false };
        }
      });

      return newSelected;
    });
  };

  const onClickCheckAllBtn = useCallback(() => {
    setCheckAllBtn(prevBtn => {
      if (prevBtn.isSe) {
        setSelectedRelated(new Set());
        return { isIn: false, isSe: false };
      } else {
        const all = new Set();
        courseGroup.forEach((cg) => cg.data.forEach(({ _id }) => all.add(_id)));
        setSelectedRelated(all);
        return { isIn: false, isSe: true };
      }
    });
  }, [courseGroup]);
  const handleLockAll = (selectedRelated) => {
    const query = [];
    selectedRelated.forEach((_id) => query.push({ _id, isLock: true }));
    const res = fetch("/api/course/edit", {
      method: "POST",
      body: JSON.stringify(query),
    }).then(() => {
      onUpdate();
    });
  };
  const handleUnlockAll = (selectedRelated) => {
    const query = [];
    selectedRelated.forEach((_id) => query.push({ _id, isLock: false }));
    const res = fetch("/api/course/edit", {
      method: "POST",
      body: JSON.stringify(query),
    }).then(() => {
      onUpdate();
    });
  };
  return (
    <div className="booking-holder">
      <div className="px-4 flex my-5 justify-between items-center">
        <Checkbox
          size="sm"
          isIndeterminate={checkAllBtn.isIn}
          isSelected={checkAllBtn.isSe}
          onChange={onClickCheckAllBtn}
        ></Checkbox>
        <h4 className="font-bold">Booking info</h4>
        <div>
          <Button
            size="md"
            variant={"light"}
            color={selectedRelated.size ? "danger" : null}
            className={`lock-btn px-0 min-w-10 ${selectedRelated.size ? "" : "opacity-50 cursor-not-allowed"
              }`}
            disabled={!selectedRelated.size}
            title="Lock"
            onClick={() => handleLockAll(selectedRelated)}
          >
            <LockFill />
          </Button>
          <Button
            size="md"
            variant="light"
            color={selectedRelated.size ? "danger" : null}
            className={`lock-btn px-0 min-w-10 ${selectedRelated.size ? "" : "opacity-50 cursor-not-allowed"
              }`}
            disabled={!selectedRelated.size}
            title="Unlock"
            onClick={() => handleUnlockAll(selectedRelated)}
          >
            <UnlockFill />
          </Button>
        </div>
      </div>
      <ScrollShadow className="flex flex-col gap-2 h-full w-full relative">
        <Listbox
          className="list-stack"
          aria-label="course booking selection"
          variant="flat"
          disallowEmptySelection
          selectionMode="none"
          selectedKeys={selectedKeys}
          // onSelectionChange={setSelectedKeys}
          disabledKeys={["empty"]}
          hideSelectedIcon
        >
          {courseGroup.map((cg) => (
            <ListboxSection key={cg.key} title={cg.title} showDivider>
              {cg.data.map(
                ({ title, location, teacher_email, credit, _id, isLock, warnings }) => (
                  <ListboxItem
                    key={_id?.toString()}
                    textValue={_id?.toString()}
                    onPress={(d) => setSelectedKeys(new Set().add(_id.toString()))}
                    classNames={{
                      base: [
                        selectedKeys.has(_id?.toString()) ? "selectedlist" : "",
                        warnings?.length ? "bg-warning-50/60" : "",
                      ],
                    }}
                    description={
                      <div className="ml-6">
                        <h6 className="prose-lead:h6">
                          {teacher_email.map((d) => (
                            <div key={d}>{d}</div>
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
                    endContent={
                      <StageButton
                        name="lock"
                        size="sm"
                        variant="light"
                        onClick={
                          isLock
                            ? () => handleUnlockAll([_id])
                            : () => handleLockAll([_id])
                        }
                        checked={isLock ?? false}
                        color="danger"
                        trueIcon={<LockFill />}
                        falseIcon={<UnlockFill />}
                        // falseText={"Unlock"}
                        // trueText={"Locked"}
                        className={"lock-btn"}
                      />
                    }
                  >
                    <Checkbox
                      size="sm"
                      isSelected={selectedRelated.has(_id)}
                      onValueChange={(v) => handleRelatedSelection(_id, v)}
                    />
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
    </div>
  );
}
