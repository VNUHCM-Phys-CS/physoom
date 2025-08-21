import moment, { duration } from "moment";

export const fetcher = (...args) =>
  args[0] ? fetch(...args).then((res) => res.json()) : null;
export const fetcheroptions = ([url, options = {}]) =>
  url
    ? fetch(url, { credentials: "include", ...options }).then((res) =>
        res.json()
      )
    : null;

// Helper function to round to nearest increment
export function roundToIncrement(value, increment = 0.5) {
  return Math.round(value / increment) * increment;
}

// Helper function to find the duration of a time slot in minutes
export function getSlotDurationMinutes(timeData) {
  return timeData[1] - timeData[0];
}

// Helper function to convert fractional increment to actual minutes within a slot
export function incrementToMinutes(increment, slotDuration) {
  return increment * slotDuration;
}

// Helper function to snap time to valid boundaries within existing time slots
export function snapTimeToSlotIncrement(timeValue, timeSlot, increment = 0.5) {
  const [slotStart, slotEnd] = timeSlot.timeData;
  const slotDuration = slotEnd - slotStart;
  
  // Calculate position within the slot (0 to 1)
  const relativePosition = (timeValue - slotStart) / slotDuration;
  
  // Round to the nearest increment
  const roundedPosition = roundToIncrement(relativePosition, increment);
  
  // Convert back to actual time, ensuring it stays within slot bounds
  const snappedTime = slotStart + (roundedPosition * slotDuration);
  return Math.min(Math.max(snappedTime, slotStart), slotEnd);
}

// Enhanced getIndex function with precision support that aligns with time slots
export function getIndex(d, arr, precision = 0.5) {
  for (let i = 0; i < arr.length; i++) {
    const slot = arr[i];
    const [slotStart, slotEnd] = slot.timeData;
    
    if (d <= slotEnd) {
      // Calculate the base position within this slot
      const relativePosition = (d - slotStart) / (slotEnd - slotStart);
      const baseIndex = i + relativePosition;
      
      // Round to the specified precision
      return roundToIncrement(baseIndex, precision);
    }
  }
  
  // If time is beyond the last slot, return the last valid index
  return roundToIncrement(arr.length - 1, precision);
}

// Enhanced index2time function with precision support
function index2time(d, arr, isEnd = false, precision = 0.5) {
  // Round the index to the specified precision first
  const roundedIndex = roundToIncrement(d, precision);
  
  if (roundedIndex > arr.length - 1) {
    return arr[arr.length - 1].timeData[1];
  }
  if (roundedIndex < 0) {
    return arr[0].timeData[0];
  }
  
  const baseIndex = Math.floor(roundedIndex);
  const fractionalPart = roundedIndex - baseIndex;
  
  // Handle end time special case
  if (isEnd && fractionalPart === 0 && baseIndex > 0) {
    return arr[baseIndex - 1].timeData[1];
  }
  const currentSlot = arr[baseIndex];
  const [slotStart, slotEnd] = currentSlot.timeData;
  const slotDuration = slotEnd - slotStart;
  
  // Calculate time within the slot based on fractional position
  const timeWithinSlot = fractionalPart * slotDuration;
  const calculatedTime = slotStart + timeWithinSlot;
  
  // Snap to valid increment within this slot
  return snapTimeToSlotIncrement(calculatedTime, currentSlot, precision);
}

// Enhanced booking2calendar with precision support
function booking2calendar(booking, time_arr, precision = 0.5) {
  const c = {
    id: booking.course._id,
    title: booking.course.title,
    subtitle: [...booking.course.class_id,"\n",...booking.teacher_email],
    duration: booking.course.credit,
    data: booking,
  };
  
  const { time_slot } = booking;
  c.time_slot = {
    weekday: time_slot.weekday,
    start_time: time_slot.start_time
      ? getIndex(time_slot.start_time, time_arr, precision)
      : undefined,
    end_time: time_slot.end_time
      ? getIndex(time_slot.end_time, time_arr, precision)
      : undefined,
  };
  
  return c;
}

// Enhanced calendar2booking with precision support
function calendar2booking(ca, booking, time_arr, isEnd = false, precision = 0.5) {
  let { weekday, start_time, end_time } = ca;
  end_time = end_time ?? start_time + duration;
  let start_date = booking.course.start_date;
  
  booking.time_slot = {
    ...booking.time_slot,
    weekday,
    start_time: index2time(start_time, time_arr, false, precision),
    end_time: index2time(end_time, time_arr, isEnd, precision),
    start_date: start_date,
    end_date: start_date
      ? moment(+booking.course.start_date)
          .add(booking.course.duration, "weeks")
          .toDate()
      : undefined,
  };
  
  return booking;
}

// Updated grid configurations with precision support
export const defaultGridNVC = {
  data: [
    { label: "1", timeData: [420, 470] },      // 50-minute slots
    { label: "2", timeData: [470, 520] },      // 50-minute slots
    { label: "3", timeData: [520, 570] },      // 50-minute slots
    { label: "4", timeData: [580, 630] },      // 50-minute slots
    { label: "5", timeData: [630, 680] },      // 50-minute slots
    { label: "6", timeData: [680, 730] },      // 50-minute slots
    {
      label: "Break",
      timeData: [730, 770],                    // 40-minute break
      disabled: { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 },
    },
    { label: "7", timeData: [770, 820] },      // 50-minute slots
    { label: "8", timeData: [820, 870] },      // 50-minute slots
    { label: "9", timeData: [870, 920] },      // 50-minute slots
    { label: "10", timeData: [930, 980] },     // 50-minute slots
    { label: "11", timeData: [980, 1030] },    // 50-minute slots
    { label: "12", timeData: [1030, 1080] },   // 50-minute slots
  ],
  precision: 0.5, // Default precision (allows half-slot positioning)
  booking2calendar: function (booking, precision) {
    return booking2calendar(booking, this.data, precision || this.precision);
  },
  calendar2booking: function (ca, booking, precision) {
    return calendar2booking(ca, booking, this.data, true, precision || this.precision);
  },
  // Helper method to get valid time increments for a specific slot
  getValidTimesForSlot: function(slotIndex, precision) {
    const slot = this.data[slotIndex];
    if (!slot) return [];
    
    const [start, end] = slot.timeData;
    const duration = end - start;
    const validTimes = [];
    
    for (let i = 0; i <= 1; i += (precision || this.precision)) {
      validTimes.push(start + (i * duration));
    }
    
    return validTimes;
  }
};

export const defaultGridLT = {
  data: [
    { label: "1", timeData: [450, 500] },      // 50-minute slots
    { label: "2", timeData: [500, 550] },      // 50-minute slots
    { label: "3", timeData: [550, 600] },      // 50-minute slots
    { label: "4", timeData: [610, 660] },      // 50-minute slots
    { label: "5", timeData: [660, 710] },      // 50-minute slots
    {
      label: "Break",
      timeData: [710, 760],                    // 50-minute break
      disabled: { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 },
    },
    { label: "6", timeData: [760, 810] },      // 50-minute slots
    { label: "7", timeData: [820, 860] },      // 40-minute slots
    { label: "8", timeData: [860, 910] },      // 50-minute slots
    { label: "9", timeData: [920, 970] },      // 50-minute slots
    { label: "10", timeData: [970, 1020] },    // 50-minute slots
  ],
  precision: 0.5, // Default precision
  booking2calendar: function (booking, precision) {
    return booking2calendar(booking, this.data, precision || this.precision);
  },
  calendar2booking: function (ca, booking, precision) {
    return calendar2booking(ca, booking, this.data, true, precision || this.precision);
  },
  getValidTimesForSlot: function(slotIndex, precision) {
    const slot = this.data[slotIndex];
    if (!slot) return [];
    
    const [start, end] = slot.timeData;
    const duration = end - start;
    const validTimes = [];
    
    for (let i = 0; i <= 1; i += (precision || this.precision)) {
      validTimes.push(start + (i * duration));
    }
    
    return validTimes;
  }
};

export const defaultGridByTime = {
  data: [
    { label: "7:00", timeData: [420, 480] },   // 60-minute slots
    { label: "8:00", timeData: [480, 540] },   // 60-minute slots
    { label: "9:00", timeData: [540, 600] },   // 60-minute slots
    { label: "10:00", timeData: [600, 660] },  // 60-minute slots
    { label: "11:00", timeData: [660, 720] },  // 60-minute slots
    { label: "12:00", timeData: [720, 780] },  // 60-minute slots
    { label: "13:00", timeData: [780, 840] },  // 60-minute slots
    { label: "14:00", timeData: [840, 900] },  // 60-minute slots
    { label: "15:00", timeData: [900, 960] },  // 60-minute slots
    { label: "16:00", timeData: [960, 1020] }, // 60-minute slots
    { label: "17:00", timeData: [1020, 1080] }, // 60-minute slots
  ],
  precision: 0.1, // Default precision
  booking2calendar: function (booking, precision) {
    return booking2calendar(booking, this.data, precision || this.precision);
  },
  calendar2booking: function (ca, booking, precision) {
    return calendar2booking(ca, booking, this.data, true, precision || this.precision);
  },
  getValidTimesForSlot: function(slotIndex, precision) {
    const slot = this.data[slotIndex];
    if (!slot) return [];
    
    const [start, end] = slot.timeData;
    const duration = end - start;
    const validTimes = [];
    
    for (let i = 0; i <= 1; i += (precision || this.precision)) {
      validTimes.push(start + (i * duration));
    }
    
    return validTimes;
  }
};

// Utility functions for working with slot-aligned precision
export function minutesToTimeString(minutes) {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

export function timeStringToMinutes(timeString) {
  const [hours, minutes] = timeString.split(':').map(Number);
  return hours * 60 + minutes;
}

// Get all valid time positions for a given precision across all slots
export function getValidTimePositions(grid, precision = 0.5) {
  const positions = new Map();
  
  grid.data.forEach((slot, slotIndex) => {
    const validTimes = grid.getValidTimesForSlot ? 
      grid.getValidTimesForSlot(slotIndex, precision) :
      defaultGridNVC.getValidTimesForSlot.call(grid, slotIndex, precision);
    
    validTimes.forEach((time, subIndex) => {
      const index = slotIndex + (subIndex * precision);
      positions.set(index, {
        time,
        slot: slotIndex,
        subPosition: subIndex * precision,
        timeString: minutesToTimeString(time)
      });
    });
  });
  
  return positions;
}

// Validate if an index position is valid for the given precision
export function isValidIndexPosition(index, precision = 0.5) {
  const remainder = (index % precision);
  return Math.abs(remainder) < 0.001 || Math.abs(remainder - precision) < 0.001;
}

// Get the nearest valid index for a given precision
export function getNearestValidIndex(index, precision = 0.5) {
  return roundToIncrement(index, precision);
}

// Debug function to show how times align with slots
export function debugTimeAlignment(grid, precision = 0.5) {
  console.log(`Time alignment for precision ${precision}:`);
  const positions = getValidTimePositions(grid, precision);
  
  positions.forEach((pos, index) => {
    console.log(`Index ${index}: ${pos.timeString} (Slot ${pos.slot + 1}, Position ${pos.subPosition})`);
  });
  
  return positions;
}

export const defaultLoc = "NVC";

export function getClass(cid) {
  return cid;
}

export function customSubtitle(data) {
  const _data = data?.data;
  if (_data) {
    return (
      <div className="flex flex-col">
        <strong>
          {_data.room?.title} ({_data.course?.population})
        </strong>
        {data.subtitle.map((s) => (
          <p key={s}>{s}</p>
        ))}
      </div>
    );
  } else return data?.subtitle;
}

export const convertExcelDateToJSDate = (excelDate) => {
  const excelEpoch = new Date(1900, 0, 1);
  const jsDate = new Date(
    excelEpoch.getTime() + (excelDate - 2) * 24 * 60 * 60 * 1000
  );
  return jsDate;
};

export function extractBaseClass(classId) {
  return classId.match(/^[A-Za-z0-9]+/)[0];
}

export function getFullTitle(data) {
  return [data.course_id,data.class_id.join("|"),data.course_id_extend].join("__");
}