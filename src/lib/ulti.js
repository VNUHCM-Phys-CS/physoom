import moment, { duration } from "moment";

export const fetcher = (...args) =>
  args[0] ? fetch(...args).then((res) => res.json()) : null;
export const fetcheroptions = ([url, options = {}]) =>
  url
    ? fetch(url, { credentials: "include", ...options }).then((res) =>
        res.json()
      )
    : null;

export const defaultGridNVC = {
  data: [
    { label: "1", timeData: [420, 470] },
    { label: "2", timeData: [470, 520] },
    { label: "3", timeData: [520, 570] },
    { label: "4", timeData: [580, 630] },
    { label: "5", timeData: [630, 680] },
    { label: "6", timeData: [680, 730] },
    {
      label: "Break",
      timeData: [730, 770],
      disabled: { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 },
    },
    { label: "7", timeData: [770, 820] },
    { label: "8", timeData: [820, 870] },
    { label: "9", timeData: [870, 920] },
    { label: "10", timeData: [930, 980] },
    { label: "11", timeData: [980, 1030] },
    { label: "12", timeData: [1030, 1080] },
  ],
  booking2calendar: function (booking) {
    return booking2calendar(booking, this.data);
  },
  calendar2booking: function (ca, booking) {
    return calendar2booking(ca, booking, this.data, true);
  },
};

export const defaultGridLT = {
  data: [
    { label: "1", timeData: [450, 500] },
    { label: "2", timeData: [500, 550] },
    { label: "3", timeData: [550, 600] },
    { label: "4", timeData: [610, 660] },
    { label: "5", timeData: [660, 710] },
    {
      label: "Break",
      timeData: [710, 760],
      disabled: { 2: 1, 3: 1, 4: 1, 5: 1, 6: 1, 7: 1, 8: 1 },
    },
    { label: "6", timeData: [760, 810] },
    { label: "7", timeData: [820, 860] },
    { label: "8", timeData: [860, 910] },
    { label: "9", timeData: [920, 970] },
    { label: "10", timeData: [970, 1020] },
  ],
  booking2calendar: function (booking) {
    return booking2calendar(booking, this.data);
  },
  calendar2booking: function (ca, booking) {
    return calendar2booking(ca, booking, this.data, true);
  },
};

export const defaultGridByTime = {
  data: [
    { label: "7:00", timeData: [420, 480] },
    { label: "8:00", timeData: [480, 540] },
    { label: "9:00", timeData: [540, 600] },
    { label: "10:00", timeData: [600, 660] },
    { label: "11:00", timeData: [660, 720] },
    { label: "12:00", timeData: [720, 780] },
    { label: "13:00", timeData: [780, 840] },
    { label: "14:00", timeData: [840, 900] },
    { label: "15:00", timeData: [900, 960] },
    { label: "16:00", timeData: [960, 1020] },
    { label: "17:00", timeData: [1020, 1080] },
  ],
  booking2calendar: function (booking) {
    return booking2calendar(booking, this.data);
  },
  calendar2booking: function (ca, booking) {
    return calendar2booking(ca, booking, this.data, true);
  },
};

function getIndex(d, arr) {
  let index = 0;
  for (let i = 0; i < arr.length; i++) {
    if (d <= arr[i].timeData[1]) {
      return (
        i + (d - arr[i].timeData[0]) / (arr[i].timeData[1] - arr[i].timeData[0])
      );
    }
  }
  index = arr.length - 1;
  return index;
}

function index2time(d, arr, isEnd) {
  if (d > arr.length - 1) return arr[arr.length - 1].timeData[1];
  if (d < 0) return arr[0].timeData[0];
  const base = arr[Math.floor(d)];
  if (isEnd && d === Math.floor(d)) {
    return (arr[d - 1] ?? arr[0]).timeData[1];
  }
  return (
    base.timeData[0] +
    (base.timeData[1] - base.timeData[0]) * (d - Math.floor(d))
  );
}

function booking2calendar(booking, time_arr) {
  const c = {
    title: booking.course.title,
    subtitle: booking.teacher_email,
    duration: booking.course.credit,
    data:booking
  };
  const { time_slot } = booking;
  c.time_slot = {
    weekday: time_slot.weekday,
    start_time: time_slot.start_time
      ? getIndex(time_slot.start_time, time_arr)
      : undefined,
    end_time: time_slot.end_time
      ? getIndex(time_slot.end_time, time_arr)
      : undefined,
  };
  return c;
}
function calendar2booking(ca, booking, time_arr, isEnd) {
  let { weekday, start_time, end_time } = ca;
  end_time = end_time ?? start_time + duration;
  let start_date = booking.course.start_date;
  booking.time_slot = {
    ...booking.time_slot,
    weekday,
    start_time: index2time(start_time, time_arr),
    end_time: index2time(end_time, time_arr, isEnd),
    start_date: start_date,
    end_date: start_date
      ? moment(+booking.course.start_date)
          .add(booking.course.duration, "weeks")
          .toDate()
      : undefined,
  };
  return booking;
}

export const defaultLoc = "NVC";
