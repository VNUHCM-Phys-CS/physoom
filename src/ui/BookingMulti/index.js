"use client";
import useSWR from "swr";
import { fetcheroptions, defaultLoc } from "@/lib/ulti";
import CourseList from "../CourseList";
import Card from "../Card";
import _ from "lodash";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import CalendarByRoom from "../CalendarByRoom";
import { Input, ScrollShadow, Tab, Tabs } from "@nextui-org/react";
import CalendarByUser from "../CalendarByUser";
import SearchCalender from "../SearchCalender";

export default function BookingMulti() {
   const [searhCourse, setSearhCourse] = useState('');
  const { data: course,mutate:mutateCourse } = useSWR(
    [
      "/api/course",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    ],
    fetcheroptions,
    { tags: ["course"], revalidate: 60 }
  );
  const courseSearchKey = useMemo(()=>{
        return (course??[]).map(d=>[`${d.teacher_email.join(' ')} ${d.location??defaultLoc} ${d.title}`.toLowerCase(),d]);
    },[course]);
  const currentCourse = useMemo(()=>((searhCourse&&(searhCourse.trim()!==''))?courseSearchKey.filter(c=>_.includes(c[0], searhCourse.toLowerCase())).map(d=>d[1]):courseSearchKey.map(d=>d[1])),[searhCourse,courseSearchKey]);
  const [booking, setBooking] = useState();
  const { data: rooms } = useSWR(
    [
      booking ? "/api/room" : null,
      {
        method: "POST",
        body: JSON.stringify({
          filter: {
            location: booking?.course?.location ?? defaultLoc,
            limit: { $gte: booking?.course?.population },
          },
        }),
      },
    ],
    fetcheroptions,
    { tags: ["room"], revalidate: 60 }
  );

  const { data: currentbooking,isLoading:isLoadingBook } = useSWR(
    [
      booking ? "/api/booking" : null,
      {
        method: "POST",
        body: JSON.stringify({
          filter: {
            course: booking?.course?._id,
          },
        }),
      },
    ],
    fetcheroptions,
    { tags: ["booking"], revalidate: 60 }
  );

  const onSelectCourse = useCallback(
    (course) => {
      // create new booking
      if (course){
        const newBooking = {
          teacher_email: course?.teacher_email,
          room: undefined,
          course,
          time_slot: {},
        };
        setBooking(newBooking);
      } else {
        setBooking(undefined);
      }
    },
    []
  );
  const { data: _events, mutate: mutateUserEvent} = useSWR(
    [
        "/api/booking",
      {
        method: "POST",
        body: JSON.stringify({}),
      },
    ],
    fetcheroptions,
    { tags: ["booking"], revalidate: 60 }
  );
  const { data: userEvents, mutate: mutateBooking, isLoading: isLoadingEvent} = useSWR(
    [
        booking?.teacher_email?"/api/booking":null,
      {
        method: "POST",
        body: JSON.stringify({
          filter: { teacher_email: {$in:booking?.teacher_email} },
        }),
      },
    ],
    fetcheroptions,
    { tags: ["booking"], revalidate: 60 }
  );

    return (
      <div className="flex py-2 px-2 mx-auto gap-2">
        <Card className="w-1/4  max-h-dvh flex flex-col">
          <Input label="Search" isClearable radius="lg" placeholder="Type to search..."
            value={searhCourse} onValueChange={setSearhCourse}/>
          <CourseList course={currentCourse} userEvents={_events} onSelectionChange={onSelectCourse} />
        </Card>
        <Card className="w-3/4 max-h-dvh">
            <ScrollShadow className="h-full">
          <Tabs radius={'full'} color="secondary">
            <Tab key="general" title="Classroom schedule">
              {(booking&&(!isLoadingBook)&&(!isLoadingEvent))?<CalendarByRoom 
              initRoom={(currentbooking&&currentbooking[0])?currentbooking[0]?.room?._id:undefined} 
              rooms={rooms} 
              extraEvents={userEvents}
              booking={booking} 
              onBooking={()=>{mutateCourse();mutateUserEvent();mutateBooking();}}
              />:<div className="prose">
                <h4>Please choose course</h4>
              </div>}
            </Tab>
            <Tab key="personal" title="Lecturer schedule">
                <div className="prose">
                    <h3>Lecturer: {booking?.teacher_email ?? 'No info'}</h3>
                </div>
                <CalendarByUser _events={userEvents}/>
            </Tab>
            <Tab key="searchEvent" title="Search Schedule">
                <SearchCalender/>
            </Tab>
          </Tabs>
          </ScrollShadow>
        </Card>
      </div>
    );
}