import useSWR from "swr";
import { fetcheroptions, defaultGridNVC, defaultGridLT, defaultLoc } from "@/lib/ulti";
import { useEffect, useState, useMemo, useCallback } from "react";
import Calendar from "../Calendar";
import { Chip, Select, SelectItem } from "@nextui-org/react";
import LoadingWrapper from "../LoadingWrapper";
import { StarIcon } from "../icons/StarIcon";
import _ from "lodash"

export default function CalendarByRoom({initRoom,extraEvents,rooms=[],booking,onBooking}){
    const [selectedRoom, setSelectedRoom] = useState(initRoom);
    const [currentRoom, setCurrentRoom] = useState();
  const onSelectRoom = useCallback((e) => {
    setSelectedRoom(e.target.value);
    const _room = (rooms ?? []).find((d) => d._id === e.target.value);
    setCurrentRoom(_room);
  },[rooms]);
  useEffect(()=>{
    setSelectedRoom(initRoom);
    const _room = (rooms ?? []).find((d) => d._id === initRoom);
    setCurrentRoom(_room);
  },[initRoom,rooms,booking])
  const { data: eventsByRoom, mutate, isLoading:isLoadingEvent } = useSWR(
    [
      selectedRoom ? "/api/booking" : null,
      {
        method: "POST",
        body: JSON.stringify({
          filter: { room: selectedRoom },
        }),
      },
    ],
    fetcheroptions,
    { tags: ["booking"], revalidate: 60 }
  );
  const [gridObject, setGridObject] = useState(defaultGridNVC);
  const events = useMemo(
    () => (eventsByRoom??[]).map((e) => gridObject.booking2calendar(e)),
    [eventsByRoom, gridObject,extraEvents]
  );
  const eventBoundary = useMemo(()=>{
    const _ids = {};
    const extraBoundary = [];
    (eventsByRoom??[]).forEach(e=>_ids[e._id]=true);
    (extraEvents??[]).forEach(e=>{
        if(!_ids[e._id])
            extraBoundary.push(gridObject.booking2calendar(e));
    })
    return extraBoundary;
  },[eventsByRoom, gridObject,extraEvents])
  const [gridData, setGridData] = useState();
  const [reviewData, setReviewData] = useState();
  const roomsOptions = useMemo(()=>{
    return (rooms??[]).map(r=>{
        // check recomend
        const item = {...r};
        item.chips = [r.limit,...(r.category??[])];
        let recommend = {};
        if (r.limit <= booking.course.population)
            recommend[r.limit] = true;
        if(booking.course.category&&r.category)
            booking.course.category.forEach(c=>{
                if(_.includes(r.category,c))
                    recommend[c] = true;
            });
        if (Object.keys(recommend).length)
            item.recommend = recommend;
        return item;
    }).sort((a,b)=>Object.keys(b.recommend??{}).length-Object.keys(a.recommend??{}).length)
  },[rooms,booking]);
  useEffect(
    () => {
        if(booking){
            const reviewData = {
                title: booking.course.title,
                subtitle: booking.teacher_email,
                duration: booking.course.credit,
                time_slot: {},
            };
            // create grid
            const location = booking.course.location ?? defaultLoc;
            const gridObject = location === "NVC" ? defaultGridNVC : defaultGridLT;

            setGridObject(gridObject);
            setReviewData(reviewData);
        } else {
            setReviewData(undefined);
        }
    },
    [booking]
  );
  useEffect(() => {
    const gridData = initEventGrid(gridObject, [...events,...eventBoundary],reviewData?.title);
    if (reviewData) getBoudary(gridData, reviewData.duration);
    setGridData(gridData);
    setIsLoadingFetch(false);
  }, [events,eventBoundary, gridObject, reviewData]);
  const [isLoadingFetch,setIsLoadingFetch] = useState();
  const onClickCell = useCallback(
    async (onHoverEventData) => {
      if (onHoverEventData) {
        // add room
        if (currentRoom) {
          booking.room = currentRoom;
          const request = gridObject.calendar2booking(
            onHoverEventData.time_slot,
            booking,
            reviewData
          );
          try {
            setIsLoadingFetch(true);
            const res = await fetch("/api/booking/create", {
              method: "POST",
              body: JSON.stringify([request]),
            });
            if (res.status !== 201) {
              console.log("Something wrong");
            } else {
              // success
              mutate();
              if (onBooking) onBooking();
            }
          } catch (error) {
            console.log(error);
            console.log("Something wrong");
          }
        }
      }
    },
    [gridObject, booking, currentRoom]
  );
  const isLoading = isLoadingFetch||isLoadingEvent;
    return <>
      <div className="flex gap-2">
        <div className="w-1/2">
          <Select
              label="Room"
              placeholder="Select an Room"
              selectedKeys={[selectedRoom]}
              onChange={onSelectRoom}
            >
              {roomsOptions.map((room) => (
                <SelectItem key={room._id} 
                startContent={room.recommend&&<StarIcon className={"fill-yellow-400 stroke-white"}/>}
                endContent={room.chips.map(c=>
                <Chip size="sm" key={`${room._ids}_${c}`} variant="bordered" color={(room.recommend&&room.recommend[c])?'primary':null}>{c}</Chip>)}>
                  {room.title}
                </SelectItem>
              ))}
          </Select>
        </div>
        <div className="w-1/2 prose">
            {currentRoom?<>
            <h4>{currentRoom.title} {currentRoom.category.map(c=><Chip key={`room-detail-${c}`}>{c}</Chip>)}</h4>
            <p>Max student: {currentRoom.limit}</p>
            </>:<h4>No room selected</h4>}
        </div>
      </div>
          {selectedRoom&&<LoadingWrapper isLoading={isLoading}>
            <Calendar
            events={events}
            gridData={gridData}
            reviewData={reviewData}
            onClickCell={onClickCell}
          />
          </LoadingWrapper>}
    </>
}

function initEventGrid(gridObject, events = [],eventName) {
    const gridData = _.cloneDeep(gridObject.data);
    gridData.byDay = [];
    events.forEach((e) => {
      if (
        (!eventName||(e.title!==eventName)) &&
        e.time_slot &&
        e.time_slot.weekday &&
        e.time_slot.start_time !== undefined &&
        e.time_slot.end_time !== undefined
      ){
        const range = [Math.max(Math.floor(e.time_slot.start_time),0),Math.min(Math.ceil(e.time_slot.end_time),gridData.length)];
        for (let i = range[0]; i < range[1]; i++) {
          if (!gridData[i].disabled) {
            gridData[i].disabled = {};
          }
          gridData[i].disabled[e.time_slot.weekday] = 3;
        }
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
  