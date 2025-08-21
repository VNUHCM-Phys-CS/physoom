import useSWR from "swr";
import {
  fetcheroptions,
  defaultGridNVC,
  defaultGridLT,
  defaultLoc,
} from "@/lib/ulti";
import { useEffect, useState, useMemo, useCallback } from "react";
import Calendar from "../Calendar";
import { Chip, Select, SelectItem } from "@heroui/react";
import LoadingWrapper from "../LoadingWrapper";
import { StarIcon } from "../icons/StarIcon";
import _ from "lodash";

export default function CalendarByRoom({
  initRoom,
  extraEvents,
  rooms = [],
  booking,
  onBooking,
  customSubtitle,
  onClickEvent,
  isLock,
}) {
  const [selectedRoom, setSelectedRoom] = useState(initRoom);
  const [currentRoom, setCurrentRoom] = useState();
  const [snapResolution , setSnapResolution ] = useState(0.5);
  const onSelectRoom = useCallback(
    (e) => {
      setSelectedRoom(e.target.value);
      const _room = (rooms ?? []).find((d) => d._id === e.target.value);
      setCurrentRoom(_room);
    },
    [rooms]
  );
  useEffect(() => {
    setSelectedRoom(initRoom);
    const _room = (rooms ?? []).find((d) => d._id === initRoom);
    setCurrentRoom(_room);
  }, [initRoom, rooms, booking]);
  const {
    data: eventsByRoom,
    mutate,
    isLoading: isLoadingEvent,
  } = useSWR(
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
    () => (eventsByRoom ?? []).map((e) => gridObject.booking2calendar(e)),
    [eventsByRoom, gridObject, extraEvents]
  );
  const eventBoundary = useMemo(() => {
    const _ids = {};
    const extraBoundary = [];
    (eventsByRoom ?? []).forEach((e) => (_ids[e._id] = true));
    (extraEvents ?? []).forEach((e) => {
      if (!_ids[e._id]) extraBoundary.push(gridObject.booking2calendar(e));
    });
    return extraBoundary;
  }, [eventsByRoom, gridObject, extraEvents]);
  
  const [gridData, setGridData] = useState();
  const [subGridData, setSubGridData] = useState({});
  const [allSlots, setAllSlots] = useState([]);
  const [reviewData, setReviewData] = useState();
  const roomsOptions = useMemo(() => {
    return (rooms ?? [])
      .map((r) => {
        // check recomend
        const item = { ...r };
        item.chips = [r.limit, ...(r.category ?? [])];
        let recommend = {};
        if (r.limit <= booking.course.population) recommend[r.limit] = true;
        if (booking.course.category && r.category)
          booking.course.category.forEach((c) => {
            if (_.includes(r.category, c)) recommend[c] = true;
          });
        if (Object.keys(recommend).length) item.recommend = recommend;
        return item;
      })
      .sort(
        (a, b) =>
          Object.keys(b.recommend ?? {}).length -
          Object.keys(a.recommend ?? {}).length
      );
  }, [rooms, booking]);
  useEffect(() => {
    if (booking) {
      const reviewData = {
        id: booking.course._id,
        title: booking.course.title,
        subtitle: booking.teacher_email,
        duration: booking.course.credit,
        // fulltitle:getFullTitle(booking),
        time_slot: {},
      };
      // create grid
      const location = booking.course.location ?? defaultLoc;
      const gridObject = location === "NVC" ? defaultGridNVC : defaultGridLT;

      setGridObject(gridObject);
      if (!isLock) setReviewData(reviewData);
    } else {
      setReviewData(undefined);
    }
  }, [booking, isLock]);
  useEffect(() => {
    const eventTotal = [...events, ...eventBoundary];
    const {gridData,subGrid,allSlots} = initEventGrid(
      gridObject,
      snapResolution,
      eventTotal,
      reviewData?.id
    );
    setAllSlots(allSlots);
    if (reviewData) 
    {
      const result = getBoudary(gridData, subGrid,allSlots, reviewData.duration, snapResolution);
      setGridData(result.gridData);
      setSubGridData(result.subGrid);
    }else {
      setGridData(gridData);
      setSubGridData(subGrid);
    }
    setIsLoadingFetch(false);
  }, [events, eventBoundary, gridObject, reviewData,snapResolution]);
  const [isLoadingFetch, setIsLoadingFetch] = useState();
  const onClickCell = useCallback(
    async (onHoverEventData,precision=1) => {
      if (onHoverEventData) {
        // add room
        if (currentRoom) {
          booking.room = currentRoom;
          const request = gridObject.calendar2booking(
            onHoverEventData.time_slot,
            booking,
            precision
            // reviewData
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
  const isLoading = isLoadingFetch || isLoadingEvent;
  return (
    <>
      <div className="flex gap-2">
        <div className="w-1/2">
          <Select
            label="Room"
            placeholder="Select an Room"
            selectedKeys={[selectedRoom]}
            onChange={onSelectRoom}
          >
            {roomsOptions.map((room) => (
              <SelectItem
                key={room._id}
                startContent={
                  room.recommend && (
                    <StarIcon className={"fill-yellow-400 stroke-white"} />
                  )
                }
                endContent={room.chips.map((c) => (
                  <Chip
                    size="sm"
                    key={`${room._ids}_${c}`}
                    variant="bordered"
                    color={
                      room.recommend && room.recommend[c] ? "primary" : null
                    }
                  >
                    {c}
                  </Chip>
                ))}
              >
                {room.title}
              </SelectItem>
            ))}
          </Select>
        </div>
        <div className="w-1/2 prose">
          {currentRoom ? (
            <>
              <h4>
                {currentRoom.title}{" "}
                {currentRoom.category.map((c) => (
                  <Chip key={`room-detail-${c}`}>{c}</Chip>
                ))}
              </h4>
              <p>Max student: {currentRoom.limit}</p>
            </>
          ) : (
            <h4>No room selected</h4>
          )}
        </div>
      </div>
      {!currentRoom && (
        <h3 className="prose prose-heading:h3 pt-5">
          Please choose room to view schedule
        </h3>
      )}
      {selectedRoom && (
        <LoadingWrapper isLoading={isLoading}>
          <Calendar
            customSubtitle={customSubtitle}
            onClickEvent={onClickEvent}
            events={events}
            gridData={gridData}
            subGridData={subGridData}
            reviewData={reviewData}
            onClickCell={onClickCell}
            onChangeSnapPrecision={setSnapResolution}
          />
        </LoadingWrapper>
      )}
    </>
  );
}

function initEventGrid(gridObject, snapResolution, events = [], eventId) {
  // Clone the base grid structure while preserving the default disabled states
  const gridData = _.cloneDeep(gridObject.data).map(slot => {
    // Preserve the original disabled state if it exists
    if (slot.disabled) {
      return {
        ...slot,
        disabled: { ...slot.disabled } // Create a new copy
      };
    }
    return { ...slot };
  });
  
  gridData.byDay = [];
  
  const subGrid = {
    byDay: [],
    slots: {}
  };

  // Generate all possible time slots
  const allSlots = [];
  const totalMainSlots = gridData.length;

  for (let time = 0; time < totalMainSlots; time += snapResolution) {
    const isMainSlot = time % 1 === 0;
    const baseIndex = Math.floor(time);
    
    if (isMainSlot) {
      // Main grid slot - preserve original disabled state
      const originalDisabled = gridData[baseIndex].disabled || {};
      const slotDisabled = { ...originalDisabled };
      
      allSlots.push({
        time,
        type: 'main',
        index: baseIndex,
        data: gridData[baseIndex],
        disabled: slotDisabled
      });
    } else {
      // Subgrid slot - check if base slot is disabled
      const baseSlotDisabled = gridData[baseIndex].disabled || {};
      const slotDisabled = { ...baseSlotDisabled };
      
      const slotData = {
        label: gridData[baseIndex].label,
        sublabel: (time % 1).toFixed(2),
        disabled: slotDisabled
      };
      
      allSlots.push({
        time,
        type: 'sub',
        data: slotData,
        disabled: slotDisabled
      });
      
      subGrid.slots[time] = slotData;
    }
  }
  console.log("========================================")
  // Process events - only mark additional occupied slots
  events.forEach((event) => {
    console.log(event)
    console.log(shouldProcessEvent(event, eventId))
    if (shouldProcessEvent(event, eventId)) {
      const { weekday, start_time, end_time } = event.time_slot;
      
      const startSlot = Math.max(Math.floor(start_time / snapResolution), 0);
      const endSlot = Math.min(Math.ceil(end_time / snapResolution), allSlots.length);
      console.log(`weekday: ${weekday}, start_time: ${start_time}, end_time${end_time} startSlot: ${startSlot} endSlot: ${endSlot}`)
      for (let i = startSlot; i < endSlot; i++) {
        const slot = allSlots[i];
        // Only mark as occupied if not already disabled by default
        if (!slot.disabled[weekday] || slot.disabled[weekday] !== 1) {
          if (weekday==2)
            debugger
          slot.disabled[weekday] = 3; // 3 indicates occupied
          
          if (slot.type === 'main') {
            if (!slot.data.disabled) slot.data.disabled = {};
            slot.data.disabled[weekday] = 3;
          } else {
            if (!subGrid.slots[slot.time]) {
              subGrid.slots[slot.time] = { disabled: {} };
            }
            subGrid.slots[slot.time].disabled[weekday] = 3;
          }
        }
      }
    }
  });
  debugger
  // Initialize byDay arrays
  initializeByDayArrays(gridData, subGrid, allSlots);

  return { gridData, subGrid, allSlots };
}

// Update getBoudary to work with snap resolution
function getBoudary(gridData, subGrid, allSlots, duration, snapResolution) {
  const durationInSlots = Math.ceil(duration / snapResolution);

  gridData.byDay.forEach((daySlots, dayIndex) => {
    const weekday = daySlots.weekday;
    const totalSlots = allSlots.length;

    for (let slotIndex = 0; slotIndex < totalSlots; slotIndex++) {
      // Skip if this is a default disabled slot
      const slot = allSlots[slotIndex];
      if (slot.disabled[weekday]) continue;

      let isValid = true;
      const endSlot = slotIndex + durationInSlots;
      if (endSlot<=totalSlots){
        for (let j = slotIndex; j < endSlot; j++) {
          const checkSlot = allSlots[j];
          // Skip default disabled slots in validation
          if (checkSlot.disabled[weekday]) {
            isValid = false;
            markDisable(gridData, subGrid, allSlots,weekday,slotIndex,j);
            break;
          }
        }
      }else{
        markDisable(gridData, subGrid, allSlots,weekday,slotIndex,totalSlots);
      }
      
      // for (let j = slotIndex; j < endSlot; j++) {
      //   const markSlot = allSlots[j];
      //   // Don't mark default disabled slots as boundaries
      //   if (markSlot.disabled[weekday] === 1) continue;

      //   if (!isValid) {
      //     if (!markSlot.disabled) markSlot.disabled = {};
      //     markSlot.disabled[weekday] = 2;
          
      //     if (markSlot.type === 'main') {
      //       if (!gridData[markSlot.index].disabled) gridData[markSlot.index].disabled = {};
      //       gridData[markSlot.index].disabled[weekday] = 2;
      //     } else {
      //       if (!subGrid.slots[markSlot.time].disabled) subGrid.slots[markSlot.time].disabled = {};
      //       subGrid.slots[markSlot.time].disabled[weekday] = 2;
      //     }
      //   }
      // }
    }
  });
  debugger
  return { gridData, subGrid };
}

// Helper function to get all time slots
function markDisable(gridData, subGrid, allSlots,weekday,start,end) {

  for (let jj = start; jj < end; jj++) {
      const markSlot = allSlots[jj];
      if (!markSlot.disabled) markSlot.disabled = {};
        markSlot.disabled[weekday] = 2;
      if (markSlot.type === 'main') {
        if (!gridData[markSlot.index].disabled) gridData[markSlot.index].disabled = {};
        gridData[markSlot.index].disabled[weekday] = 2;
      } else {
        if (!subGrid.slots[markSlot.time].disabled) subGrid.slots[markSlot.time].disabled = {};
        subGrid.slots[markSlot.time].disabled[weekday] = 2;
      }
  }
}

// Helper to initialize byDay arrays
function initializeByDayArrays(gridData, subGrid, allSlots) {
  [2, 3, 4, 5, 6, 7, 8].forEach((weekday, i) => {
    // Main grid byDay
    gridData.byDay[i] = allSlots
      .filter(slot => slot.type === 'main')
      .map(slot => slot.disabled[weekday] || undefined);
    gridData.byDay[i].weekday = weekday;
    
    // Subgrid byDay
    subGrid.byDay[i] = allSlots
      .filter(slot => slot.type === 'sub')
      .map(slot => slot.disabled[weekday] || undefined);
    subGrid.byDay[i].weekday = weekday;
  });
}

function shouldProcessEvent(event, eventId) {
  return (
    (!eventId || event.id !== eventId) &&
    event.time_slot &&
    event.time_slot.weekday &&
    event.time_slot.start_time !== undefined &&
    event.time_slot.end_time !== undefined
  );
}