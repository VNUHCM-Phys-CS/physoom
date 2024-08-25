"use client";
import { useSession } from "next-auth/react";
import useSWR from "swr";
import { fetcheroptions, defaultGridNVC, defaultGridLT } from "@/lib/ulti";
import CourseList from "../CourseList";
import Card from "../Card";
import Calendar from "../Calendar";
import {Select, SelectItem} from "@nextui-org/react";
import _ from 'lodash';
import { useCallback, useMemo, useState } from "react";
const defaultLoc = 'NVC';
export default function BookingSingle() {
    const { data: session } = useSession();
    const { data: course } = useSWR([session?.user?.email?"/api/course":null, {
        method: "POST",
        body: JSON.stringify({filter:{teacher_email:session?.user?.email}}),
      }], fetcheroptions,{ tags: ["course"], revalidate: 60 });

    const [booking, setBooking] = useState();
    const { data: rooms } = useSWR([(booking)?"/api/room":null, {
        method: "POST",
        body: JSON.stringify({filter:{location:booking?.location??defaultLoc,limit:{ $gte: booking?.course.population }}}),
      }], fetcheroptions,{ tags: ["room"], revalidate: 60 });
      console.log(booking,rooms)
    const [selectedRoom, setSelectedRoom] = useState();
    const { data: eventsByRoom } = useSWR([(session?.user?.email && selectedRoom)?"/api/booking":null, {
        method: "POST",
        body: JSON.stringify({filter:{teacher_email:session?.user?.email,room:selectedRoom?._id}}),
      }], fetcheroptions,{ tags: ["booking"], revalidate: 60 });

    const [reviewData, setReviewData] = useState();
    const [gridObject, setGridObject] = useState(defaultGridNVC);
    const [gridData, setGridData] = useState();
    const onSelectCourse = useCallback((course)=>{
        // create new booking
        const newBooking = {"teacher_email":session?.user?.email,
            room: undefined,
            course,
            time_slot:{}
        }
        const reviewData = {title: newBooking.course.title, subtitle:newBooking.teacher_email, duration:newBooking.course.credit, time_slot:{} };
        // create grid
        const location = course.location??defaultLoc;
        const gridObject = location==="NVC"?defaultGridNVC:defaultGridLT;
        const gridData = _.cloneDeep(gridObject.data);
        // boundary
        gridData.byDay = [];
        [2,3,4,5,6,7,8].forEach((w,i)=>{
            gridData.byDay[i] = gridData.map(d=>{
                return d.disabled?d.disabled[w]:undefined;
            });
            gridData.byDay[i].weekday = w;
        });
        getBoudary(gridData,reviewData.duration);
        setGridObject(gridObject);
        setReviewData(reviewData);
        setBooking(newBooking);
        setGridData(gridData);
    },[session?.user?.email]);
    
    if (session&&session?.user?.email)
        return (<div className="flex py-2 px-2 mx-auto gap-2">
            <Card className="w-1/4">
                <CourseList course={course} onSelectionChange={onSelectCourse}/>
            </Card>
            <Card className="w-3/4">
                <Select
                    label="Room"
                    placeholder="Select an Room"
                >
                    {(rooms??[]).map((room) => (
                    <SelectItem key={room._id}>
                        {room.title}
                    </SelectItem>
                    ))}
                </Select>
                <Calendar gridData={gridData} reviewData={reviewData}/>
            </Card>
        </div>);
    else
        return <div>Please login first</div>
}

function getBoudary(gridData,duration) {
    gridData.byDay.forEach(d=>{
        const n = d.length;
        d.forEach((e,i)=>{
            const endi = i+duration;
            let valid = !d[i];
            if (endi<=n){
                for (let j=i;((j<endi)&&valid);j++){
                    valid = !d[j];
                }
            }
            else
                valid=false;
            if (!valid){
                if (!d[i]){
                    d[i] = 2;
                    if (!gridData[i].disabled)
                        gridData[i].disabled = {};
                    gridData[i].disabled[d.weekday] = d[i];
                }
            }else {
                d[i] = undefined;
                if (gridData[i].disabled){
                    delete gridData[i].disabled[d.weekday];
                }
            }
        })
    });
    // delete all disable of empty
    gridData.forEach(d=>{
        if (d.disabled && (!Object.keys(d.disabled).length))
            delete d.disabled;
    })
    return gridData;
}