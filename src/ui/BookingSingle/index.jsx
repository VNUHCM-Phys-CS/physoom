"use client";
import useSWR from "swr";
import {
  fetcheroptions,
  defaultLoc,
  getClass,
  customSubtitle,
} from "@/lib/ulti";
import CourseList from "../CourseList";
import Card from "../Card";
import _ from "lodash";
import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import CalendarByRoom from "../CalendarByRoom";
import { Tab, Tabs } from "@heroui/react";
import CalendarByUser from "../CalendarByUser";
import { UserCalendarContext } from "../CalendarByUser/wrapper";
export default function BookingSingle({ email }) {
  const { data: course, mutate: mutateCourse } = useSWR(
    [
      email ? "/api/course" : null,
      {
        method: "POST",
        body: JSON.stringify({ filter: { teacher_email: email } }),
      },
    ],
    fetcheroptions,
    { tags: ["course"], revalidate: 60 }
  );

  const [booking, setBooking] = useState();
  const { data: rooms } = useSWR(
    [
      booking ? "/api/room" : null,
      {
        method: "POST",
        body: JSON.stringify({
          filter: {
            location: booking?.course?.location ?? defaultLoc,
            limit: { $gte: booking?.course.population },
          },
        }),
      },
    ],
    fetcheroptions,
    { tags: ["room"], revalidate: 60 }
  );

  const { data: currentbooking, isLoading: isLoadingBook } = useSWR(
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

  const onSelectCourse = useCallback((course) => {
    // create new booking
    const newBooking = {
      teacher_email: course?.teacher_email,
      room: undefined,
      course,
      time_slot: {},
    };
    setBooking(newBooking);
  }, []);
  const { userEvents, mutateUserEvent } = useContext(UserCalendarContext);
  const { data: classEvents, isLoading: isLoadingclassEvent } = useSWR(
    [
      booking ? "/api/booking" : null,
      {
        method: "POST",
        body: JSON.stringify({
          filter: { "course.class_id": getClass(booking?.course?.class_id) },
        }),
      },
    ],
    fetcheroptions,
    { tags: ["booking"], revalidate: 60 }
  );

  const extraEvents = useMemo(() => {
    return _.values(
      _.merge(_.keyBy(classEvents, "_id"), _.keyBy(userEvents, "_id"))
    );
  }, [classEvents, userEvents]);

  if (email)
    return (
      <div className="flex py-2 px-2 mx-auto gap-2">
        <Card className="w-1/4">
          <CourseList
            course={course}
            userEvents={userEvents}
            onSelectionChange={onSelectCourse}
          />
        </Card>
        <Card className="w-3/4">
          <Tabs radius={"full"} color="secondary">
            <Tab key="general" title="Classroom schedule">
              {booking && !isLoadingBook ? (
                <CalendarByRoom
                  initRoom={
                    currentbooking && currentbooking[0]
                      ? currentbooking[0]?.room?._id
                      : undefined
                  }
                  rooms={rooms}
                  extraEvents={extraEvents}
                  booking={booking}
                  onBooking={() => {
                    mutateCourse();
                    mutateUserEvent();
                  }}
                  isLock={booking?.course?.isLock}
                />
              ) : (
                <div className="prose">
                  <h4>Please choose course</h4>
                </div>
              )}
            </Tab>
            <Tab key="personal" title="Personal schedule">
              <CalendarByUser
                _events={userEvents}
                customSubtitle={customSubtitle}
                selectedID={booking?.course?._id}
              />
            </Tab>
            <Tab key="class_sche" title="Class schedule">
              <CalendarByUser
                _events={classEvents}
                selectedID={booking?.course?._id}
              />
            </Tab>
          </Tabs>
        </Card>
      </div>
    );
  else return <div>Please login first</div>;
}
