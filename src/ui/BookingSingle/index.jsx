"use client";
import useSWR from "swr";
import { fetcheroptions, defaultGridNVC, defaultGridLT } from "@/lib/ulti";
import CourseList from "../CourseList";
import Card from "../Card";
import Calendar from "../Calendar";
import { Select, SelectItem } from "@nextui-org/react";
import _ from "lodash";
import { useCallback, useEffect, useMemo, useState } from "react";
const defaultLoc = "NVC";
export default function BookingSingle({ email }) {
  const { data: course } = useSWR(
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
            location: booking?.location ?? defaultLoc,
            limit: { $gte: booking?.course.population },
          },
        }),
      },
    ],
    fetcheroptions,
    { tags: ["room"], revalidate: 60 }
  );

  const [selectedRoom, setSelectedRoom] = useState();
  const onSelectRoom = (e) => {
    setSelectedRoom(e.target.value);
  };
  const { data: eventsByRoom, mutate } = useSWR(
    [
      email && selectedRoom ? "/api/booking" : null,
      {
        method: "POST",
        body: JSON.stringify({
          filter: { teacher_email: email, room: selectedRoom?._id },
        }),
      },
    ],
    fetcheroptions,
    { tags: ["booking"], revalidate: 60 }
  );
  const [gridObject, setGridObject] = useState(defaultGridNVC);
  const events = useMemo(
    () => (eventsByRoom ?? []).map((e) => gridObject.booking2calendar(e)),
    [eventsByRoom, gridObject]
  );
  const [reviewData, setReviewData] = useState();
  const [gridData, setGridData] = useState();
  const onSelectCourse = useCallback(
    (course) => {
      // create new booking
      const newBooking = {
        teacher_email: email,
        room: undefined,
        course,
        time_slot: {},
      };
      const reviewData = {
        title: newBooking.course.title,
        subtitle: newBooking.teacher_email,
        duration: newBooking.course.credit,
        time_slot: {},
      };
      // create grid
      const location = course.location ?? defaultLoc;
      const gridObject = location === "NVC" ? defaultGridNVC : defaultGridLT;
      // const gridData = initEventGrid(gridObject);
      // getBoudary(gridData, reviewData.duration);
      setGridObject(gridObject);
      setReviewData(reviewData);
      setBooking(newBooking);
      // setGridData(gridData);
    },
    [email, selectedRoom, rooms]
  );

  useEffect(() => {
    const gridData = initEventGrid(gridObject, events);
    if (reviewData) getBoudary(gridData, reviewData.duration);
    setGridData(gridData);
  }, [events, gridObject, reviewData]);

  const onClickCell = useCallback(
    async (onHoverEventData) => {
      if (onHoverEventData) {
        // add room
        const _room = (rooms ?? []).find((d) => d._id === selectedRoom);
        if (_room) {
          booking.room = _room;
          const request = gridObject.calendar2booking(
            onHoverEventData.time_slot,
            booking,
            reviewData
          );
          try {
            console.log(JSON.stringify([request]));
            const res = await fetch("/api/booking/create", {
              method: "POST",
              body: JSON.stringify([request]),
            });
            if (res.status !== 201) {
              console.log("Something wrong");
            } else {
              // success
              mutate();
            }
          } catch (error) {
            console.log(error);
            console.log("Something wrong");
          }
        }
      }
    },
    [email, gridObject, booking]
  );
  if (email)
    return (
      <div className="flex py-2 px-2 mx-auto gap-2">
        <Card className="w-1/4">
          <CourseList course={course} onSelectionChange={onSelectCourse} />
        </Card>
        <Card className="w-3/4">
          <Select
            label="Room"
            placeholder="Select an Room"
            selectedKeys={[selectedRoom]}
            onChange={onSelectRoom}
          >
            {(rooms ?? []).map((room) => (
              <SelectItem key={room._id}>{room.title}</SelectItem>
            ))}
          </Select>
          <Calendar
            events={events}
            gridData={gridData}
            reviewData={reviewData}
            onClickCell={onClickCell}
          />
        </Card>
      </div>
    );
  else return <div>Please login first</div>;
}

function initEventGrid(gridObject, events = []) {
  const gridData = _.cloneDeep(gridObject.data);
  gridData.byDay = [];
  events.forEach((e) => {
    if (
      e.time_slot &&
      e.time_slot.weekday &&
      e.time_slot.start_time !== undefined &&
      e.time_slot.end_time !== undefined
    )
      for (let i = e.time_slot.start_time; i < e.time_slot.end_time; i++) {
        if (!gridData[i].disabled) {
          gridData[i].disabled = {};
        }
        gridData[i].disabled[e.time_slot.weekday] = 3;
      }
  });
  [2, 3, 4, 5, 6, 7, 8].forEach((w, i) => {
    gridData.byDay[i] = gridData.map((d) => {
      return d.disabled ? d.disabled[w] : undefined;
    });
    gridData.byDay[i].weekday = w;
  });
  return gridData;
}

function getBoudary(gridData, duration) {
  gridData.byDay.forEach((d) => {
    const n = d.length;
    d.forEach((e, i) => {
      const endi = i + duration;
      let valid = !d[i];
      if (endi <= n) {
        for (let j = i; j < endi && valid; j++) {
          valid = !d[j];
        }
      } else valid = false;
      if (!valid) {
        if (!d[i]) {
          d[i] = 2;
          if (!gridData[i].disabled) gridData[i].disabled = {};
          gridData[i].disabled[d.weekday] = d[i];
        }
      } else {
        d[i] = undefined;
        if (gridData[i].disabled) {
          delete gridData[i].disabled[d.weekday];
        }
      }
    });
  });
  // delete all disable of empty
  gridData.forEach((d) => {
    if (d.disabled && !Object.keys(d.disabled).length) delete d.disabled;
  });
  return gridData;
}
