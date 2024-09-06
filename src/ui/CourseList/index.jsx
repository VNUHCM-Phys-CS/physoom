"use client";

import { useEffect, useMemo, useState } from "react";
import { Chip, Listbox, ListboxItem, ListboxSection } from "@nextui-org/react";
import {ScrollShadow} from "@nextui-org/react";
import "./CourseList.scss";
import { LockFill } from "../icons/LockFill";

export default function CourseList({ course, onSelectionChange, userEvents }) {
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
      >
        {courseGroup.map((cg) => (
          <ListboxSection key={cg.title} title={cg.title} showDivider>
            {cg.data.map(({ title, location, teacher_email, credit, _id, isLock }) => (
              <ListboxItem
                key={_id}
                description={
                  <div>
                    <h6 className="prose-lead:h6">{teacher_email.map(d=><div>{d}</div>)}</h6>
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
                className="flex justify-between max-w-full"
                // startContent={<LockFill className={" w-3 h-3"}/>}
              >
                <div className="truncate">{title}</div>
              </ListboxItem>
            ))}
            {cg.data.length === 0 && (
              <ListboxItem key="empty">{cg.emptyText}</ListboxItem>
            )}
          </ListboxSection>
        ))}
      </Listbox>
    </ScrollShadow>
  );
}
