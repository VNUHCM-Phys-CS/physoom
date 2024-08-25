"use client";

import {useEffect,useState} from "react";
import {Chip, Listbox, ListboxItem} from "@nextui-org/react";
import "./CourseList.css";

export default function CourseList({course,onSelectionChange}) {
      const [selectedKeys, setSelectedKeys] = useState(new Set([]));

      useEffect(
        () =>{ 
            const select = Array.from(selectedKeys);
            if (select[0]&&onSelectionChange){
                console.log(select[0])
                onSelectionChange(course[+select[0]])
            }
        },
        [selectedKeys,course,onSelectionChange]
      );
    return (<div className="flex flex-col gap-2">
         <Listbox 
          className="list-stack"
          aria-label="course booking selection"
          variant="flat"
          disallowEmptySelection
          selectionMode="single"
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
        >
            {course&&course.map(({title,location,credit},i)=>
            <ListboxItem key={i} description={<div className="flex gap-1"><Chip size="sm" color="primary">{location}</Chip><Chip size="sm" variant="shadow">{credit} credits</Chip></div>}>{title}</ListboxItem >)}
        </Listbox>
    </div>);
}