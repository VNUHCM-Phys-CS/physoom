"use client";

import useSWR from "swr";
import { fetcheroptions } from "@/lib/ulti";

export default function CourseList({useremail}) {
    const { data: course, mutate } = useSWR(["/api/course", {
        method: "POST",
        body: JSON.stringify({filter:{teacher_email:useremail}}),
      }], fetcheroptions,{ tags: ["course"], revalidate: 60 });
    return (<div>
        {course&&course.data&&course.data.map(({title})=><div>{title}</div>)}
    </div>);
}