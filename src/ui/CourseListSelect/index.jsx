"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Button,
  ButtonGroup,
  Checkbox,
  Chip,
  Listbox,
  ListboxItem,
  ListboxSection,
} from "@heroui/react";
import { ScrollShadow } from "@heroui/react";
import "./CourseList.scss";
import { LockFill } from "../icons/LockFill";
import StageButton from "../StageButton";
import { Unlock } from "next/font/google";
import { UnlockFill } from "../icons/UnlockFill";

export default function CourseListSelect({
  course,
  onSelectionChange,
  userEvents,
  onUpdate,
}) {
  const [selectedKeys, setSelectedKeys] = useState(new Set([]));
  const courseGroup = useMemo(() => {
    let done = {};
    (userEvents ?? []).forEach((d) => (done[d?.course?.title] = true));
    let l = [
      { title: "Pending class", data: [], emptyText: "No action needed" },
      { title: "Planned class", data: [] },
    ];
    (course ?? []).forEach((c) => {
      if (done[c.title]) l[1].data.push(c);
      else l[0].data.push(c);
    });
    if (l[1].data.length === 0) l = [l[0]];
    return l;
  }, [userEvents, course]);
  useEffect(() => {
    const select = Array.from(selectedKeys);
    if (select[0] && onSelectionChange) {
      const c = course.find((d) => d._id === select[0]);
      onSelectionChange(c);
    }
  }, [selectedKeys, course, onSelectionChange]);

  const [selectedRelated, setSelectedRelated] = useState(new Set());
  const [checkAllBtn, setCheckAllBtn] = useState({ isIn: false, isSe: false });

  useState(() => {
    setSelectedRelated(new Set());
    setCheckAllBtn({ isIn: false, isSe: false });
  }, [course]);

  const handleRelatedSelection = (key, v) => {
    setSelectedRelated((prev) => {
      const newSelected = new Set(prev);
      if (newSelected.has(key)) {
        if (!v) newSelected.delete(key); // Deselect if already selected
        else return prev;
      } else {
        if (v) newSelected.add(key); // Select if not selected
        else return prev;
      }
      if (newSelected.size === course.length)
        setCheckAllBtn({ isIn: false, isSe: true });
      else if (newSelected.size === 0)
        setCheckAllBtn({ isIn: false, isSe: false });
      else
        setCheckAllBtn((prev) => {
          if (!prev.isIn) return { isIn: true, isSe: false };
          prev.isSe = false;
          return prev;
        });

      return newSelected;
    });
  };

  const onClickCheckAllBtn = () => {
    if (checkAllBtn.isSe) {
      // de select
      setSelectedRelated(new Set());
      setCheckAllBtn({ isIn: false, isSe: false });
    } else {
      const all = new Set();
      courseGroup.forEach((cg) => cg.data.forEach(({ _id }) => all.add(_id)));
      setSelectedRelated(all);
      setCheckAllBtn({ isIn: false, isSe: true });
    }
  };
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
          onClick={onClickCheckAllBtn}
        ></Checkbox>
        <h4 className="font-bold">Booking info</h4>
        <div>
          <Button
            size="md"
            variant={"light"}
            color={selectedRelated.size ? "danger" : null}
            className={`lock-btn px-0 min-w-10 ${
              selectedRelated.size ? "" : "opacity-50 cursor-not-allowed"
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
            className={`lock-btn px-0 min-w-10 ${
              selectedRelated.size ? "" : "opacity-50 cursor-not-allowed"
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
            <ListboxSection key={cg.title} title={cg.title} showDivider>
              {cg.data.map(
                ({ title, location, teacher_email, credit, _id, isLock }) => (
                  <ListboxItem
                    key={_id}
                    textValue={_id}
                    onPress={(d) => setSelectedKeys(new Set().add(_id))}
                    classNames={{
                      base: selectedKeys.has(_id) ? ["selectedlist"] : null,
                    }}
                    description={
                      <div className="ml-6">
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
                    {title}
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
