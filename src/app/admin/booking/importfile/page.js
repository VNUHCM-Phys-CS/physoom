"use client";
import React, { useState } from "react";
import CSVReader from "@/ui/CSVReader";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { CheckboxIcon, Progress } from "@heroui/react";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { CheckCircle, CircleX } from "lucide-react";
import { locationList } from "@/models/ulti";
import {
  convertExcelDateToJSDate,
  defaultGridLT,
  defaultGridNVC,
  getSnapFromDuration,
  roundIndex,
  roundToIncrement,
} from "@/lib/ulti";
import _, { groupBy, maxBy, reduce } from "lodash";

const BOOKiNG_FIELDS = [
  { name: "Mã mh", uid: "Mã mh", sortable: true, isRequired: true },
  { name: "Tên môn học", uid: "Tên môn học", sortable: true },
  { name: "Lớp", uid: "Lớp", sortable: true, isRequired: true },
  { name: "mã lớp 2", uid: "mã lớp 2", sortable: true },
  { name: "Số sv", uid: "Số sv", sortable: true },
  { name: "sosvMax", uid: "sosvMax", sortable: true },
  { name: "tcphong", uid: "tcphong", sortable: true },
  { name: "Tên phòng", uid: "Tên phòng", sortable: true },
  { name: "Thứ", uid: "Thứ", sortable: true },
  { name: "Tiết bắt đầu", uid: "Tiết bắt đầu", sortable: true },
  { name: "Số tiết", uid: "Số tiết", sortable: true },
  { name: "Giảng viên", uid: "Giảng viên", sortable: true, isRequired: true },
  { name: "Trợ giảng", uid: "Trợ giảng", sortable: true },
  { name: "Tuần bd", uid: "Tuần bd", sortable: true },
  { name: "Ngày đầu tuần", uid: "Ngày đầu tuần", sortable: true },
];
const INITIAL_VISIBLE_COLUMNS = BOOKiNG_FIELDS.map((d) => d.uid);

const Page = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [progressCourse, setProgressCourse] = useState({ value: 0 });
  const [progressRoom, setProgressRoom] = useState({ value: 0 });
  const [progressBooking, setProgressBooking] = useState({ value: 0 });

  const onSubmit = async (data) => {
    setIsOpen(true);
    setProgressCourse({ value: 0 });
    setProgressRoom({ value: 0 });
    setProgressBooking({ value: 0 });
    // handle booking
    try {
      data = data.filter(d=>Object.entries(d).find(d=>d[1]!==null && d[1].trim()!==""))
      const roomGroup = groupBy(data, (item) => {
        let title = (item["Tên phòng"] ?? "").trim();
        let comps = title.split(":");
        if (comps.length > 1) {
          comps[0] = comps[0].toLowerCase();
          comps[1] = comps[1].toUpperCase();
          title = comps.map((d) => d.trim()).join(":");
        } else if (title !== "") {
          title = "cs1:" + title.toUpperCase();
        } else {
          item.cleanRoomTitle = undefined;
          return undefined;
        }
        item.cleanRoomTitle = title;
        return title;
      });
      const rooms = reduce(
        roomGroup,
        function (result, value, key) {
          if (key !== "undefined") {
            let comps = key.split(":");
            let loc = locationList.alternative[comps[0]];
            let location = loc
              ? loc.toUpperCase()
              : locationList.default.toUpperCase();
            let limit = maxBy(value, function (item) {
              let l = +item["sosvMax"];
              let p = +item["Số sv"];
              item.limit = isNaN(l) ? (isNaN(p) ? undefined : p) : l;
              return item.limit;
            })?.limit;
            result.push({ title: key, limit, location });
          }
          return result;
        },
        []
      );

      const roomResponse = await fetch("/api/room/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          email: session?.user?.email,
        },
        body: JSON.stringify(rooms),
      });
      if (roomResponse.ok) {
        setProgressRoom({ value: 100 }); // Mark Room as complete
      } else {
        console.error("Failed to create Room");
        setProgressRoom({ value: 100, isError: true }); // Simulate completion but indicate an issue in logs
      }
      // handle course
      data.forEach((item) => {
        item["mã lớp 2"] = item["mã lớp 2"]
          ? `${item["mã lớp 2"]}`.trim()
          : null;
        item._teacher_emails = [];
        if (item["Giảng viên"])
          item["Giảng viên"]
            .split(",")
            .forEach((d) => item._teacher_emails.push(d.trim()));
        if (item["Trợ giảng"])
          item["Trợ giảng"]
            .split(",")
            .forEach((d) => item._teacher_emails.push(d.trim()));
        item._teacher_emails = item._teacher_emails.filter(
          (d) => d && d !== ""
        );
      });
      const names = [...new Set(data.flatMap((item) => item._teacher_emails))];
      // find teacher email by name
      const emailResponse = await fetch("/api/user/getEmailByName", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          email: session?.user?.email,
        },
        body: JSON.stringify({ names }),
      });
      let name2email = {};

      if (emailResponse.ok) {
        const emails = await emailResponse.json();
        (emails?.users ?? []).forEach((e) => {
          name2email[e.name] = e.email;
        });
      } else {
        console.error("Failed to get Email");
        setProgressCourse({ value: 100, isError: true }); // Simulate completion but indicate an issue in logs
      }

      const courses = _.uniqBy(
        data,
        (item) =>
          `${item["Mã mh"].trim()}_${item["mã lớp 2"]}_${item["Lớp"].trim()}`
      ).map((d) => ({
        course_id: d["Mã mh"]?.trim(),
        course_id_extend: d["mã lớp 2"],
        class_id: d["Lớp"]?.split(",")?.map((d) => d.trim()),
        title: d["Tên môn học"]?.trim(),
        teacher_email: d._teacher_emails
          ?.map((e) => name2email[e])
          ?.filter((d) => d),
        population: d["Số sv"] ?? 0,
        start_date: convertExcelDateToJSDate(d["Ngày đầu tuần"]),
        credit: d["Số tiết"] ?? 1,
        duration: 15,
        location: d.cleanRoomTitle
          ? rooms.find((r) => r.title === d.cleanRoomTitle)?.location
          : locationList.default,
      }));
      const courseResponse = await fetch("/api/course/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          email: session?.user?.email,
        },
        body: JSON.stringify(courses),
      });

      if (courseResponse.ok) {
        setProgressCourse({ value: 100 }); // Mark Course as complete
      } else {
        console.error("Failed to create Course");
        setProgressCourse({ value: 100, isError: true }); // Simulate completion but indicate an issue in logs
      }
      //
      for (const [index, _booking] of data.entries()) {
        debugger
        if (
          _booking.cleanRoomTitle &&
          +_booking["Tiết bắt đầu"] &&
          +_booking["Thứ"]
        ) {
          try {
            const location = _booking.cleanRoomTitle
              ? rooms.find((r) => r.title === _booking.cleanRoomTitle)?.location
              : locationList.default;
            const room = await fetch("/api/room", {
              method: "POST",
              body: JSON.stringify({
                filter: {
                  title: _booking.cleanRoomTitle,
                  location,
                },
              }),
            }).then((d) => d.json());
            const course = await fetch("/api/course", {
              method: "POST",
              body: JSON.stringify({
                filter: {
                  course_id: _booking["Mã mh"].trim(),
                  course_id_extend: _booking["mã lớp 2"],
                  class_id: _booking["Lớp"].split(",").map((d) => d.trim()),
                },
              }),
            }).then((d) => d.json());
            if (room?.[0]?._id && course?.[0]?._id) {
              const grid = location === "NVC" ? defaultGridNVC : defaultGridLT;
              const weekday = +_booking["Thứ"];
              const duration = (+ course[0].credit);
              const presision = getSnapFromDuration(duration,1);
              const start_time = roundIndex(+ _booking["Tiết bắt đầu"], presision,grid.data);
              const end_time = Math.min(
                grid.data.length - 1,
                start_time + course[0].credit
              );
              if (start_time > -1 && end_time > -1) {
                let booking = {
                  teacher_email: _booking._teacher_emails
                  ?.map((e) => name2email[e])
                  ?.filter((d) => d),
                  room: room[0],
                  course: course[0],
                  time_slot: {},
                };
                const time_slot = {
                  weekday,
                  start_time,
                  end_time,
                };
                booking = grid.calendar2booking(time_slot, booking,presision);
                await fetch("/api/booking/create", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    email: session?.user?.email,
                  },
                  body: JSON.stringify([booking]),
                });
              }
            }
          } catch (e) {
            console.log(`Fail to add row#`, index + 1);
          }

          setProgressBooking({ value: ((index + 1) / data.length) * 100 });
        }
      }
      // All tasks completed
      console.log("All requests completed successfully");
    } catch (error) {
      console.error("Error occurred during the requests:", error);
      // Optionally reset progress or show error state
      setProgressRoom({ value: 100, isError: true });
      setProgressCourse({ value: 100, isError: true });
      setProgressBooking({ value: 100, isError: true });
    } finally {
      setIsOpen(false); // Close modal after completion
      router.back();
    }
  };
  return (
    <div>
      <CSVReader
        path={"/api/booking/create"}
        onSubmit={onSubmit}
        email={session?.user?.email}
        collums={BOOKiNG_FIELDS}
        INITIAL_VISIBLE_COLUMNS={INITIAL_VISIBLE_COLUMNS}
      />
      <Modal isOpen={isOpen} hideCloseButton>
        <ModalContent>
          <ModalHeader className="flex flex-col gap-1">
            UPLOADING...
          </ModalHeader>
          <ModalBody>
            <div className="flex flex-col gap-6 w-full max-w-md">
              <div className="flex items-center gap-2">
                Room
                {progressRoom.value < 100 && (
                  <Progress
                    color="primary"
                    aria-label="Loading Room..."
                    className="max-w-md"
                    value={progressRoom.value}
                  />
                )}
                {progressRoom.value === 100 && (
                  <div>
                    {progressRoom.isError ? (
                      <CircleX className="text-red-800" />
                    ) : (
                      <CheckCircle className="text-success-600" />
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                Course
                {progressCourse.value < 100 && (
                  <Progress
                    color="primary"
                    aria-label="Loading Course..."
                    className="max-w-md"
                    value={progressCourse.value}
                  />
                )}
                {progressCourse.value === 100 && (
                  <div>
                    {progressCourse.isError ? (
                      <CircleX className="text-red-800" />
                    ) : (
                      <CheckCircle className="text-success-600" />
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                Booking
                {progressBooking.value < 100 && (
                  <Progress
                    color="primary"
                    aria-label="Loading Booking..."
                    className="max-w-md"
                    value={progressBooking.value}
                  />
                )}
                {progressBooking.value === 100 && (
                  <div>
                    {progressBooking.isError ? (
                      <CircleX className="text-red-800" />
                    ) : (
                      <CheckCircle className="text-success-600" />
                    )}
                  </div>
                )}
              </div>
            </div>
          </ModalBody>
        </ModalContent>
      </Modal>
    </div>
  );
};

export default Page;
