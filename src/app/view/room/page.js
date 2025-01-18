'use client'

import { Autocomplete, AutocompleteItem, Button, Chip, Input } from "@heroui/react";
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form";
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from "react";
import CalendarByUser from "@/ui/CalendarByUser";
import { customSubtitle, fetcheroptions } from "@/lib/ulti";
import useSWR from "swr";
import Card from "@/ui/Card";
import { categoryList, locationList } from "@/models/ulti";

// Define the Zod schema for validation
const schema = z.object({
    teacher_id: z
      .string()
      .min(1, 'ID is required')
  });

export default function ViewRoomPage () {
    const {data: session} = useSession();
    const [isCheck,setIsCheck] = useState();
    const [teacher_id,setTeacherID] = useState();
    const [serverError, setServerError] = useState('');
    const [filter, setFilter] = useState();
    const {
        register,
        handleSubmit,
        formState: { errors },
      } = useForm({
        resolver: zodResolver(schema),
      });
    
      const onSubmit = (data) => {
        setServerError('');
        if (session && session.teacher_id && (data.teacher_id === session.teacher_id)){
            setTeacherID(data.teacher_id);
            setIsCheck(true);
        }else{
            setError('id', { type: 'manual', message: result.message || 'ID check failed' });
            setIsCheck(false);
        }
        // You can process the form data here, e.g., sending it to an API
      };
      const { data: roomList,isLoading:roomLoading } = useSWR(
        [
            "/api/room",
            {
            method: "POST",
            body:  JSON.stringify({filter:{ title: {$regex: "cs1"} }})
            },
        ],
        fetcheroptions,
        { tags: ["room"], revalidate: 60 }
        );
    const { data: userEvents,isLoading:eventLoading} = useSWR(
        [
            filter?"/api/booking":null,
            {
                method: "POST",
                body: JSON.stringify({
                    filter: { room: filter },
                }),
            },
        ],
        fetcheroptions,
        { tags: ["booking"], revalidate: 60 }
        );
    const currentRoom = useMemo(()=>{
        return (roomList ?? []).find((d) => d._id === filter)
    },[roomList,filter])
        const isLoading = eventLoading||roomLoading;
    return <div className="container m-auto">
        {session?.user?
        isCheck?<div className="container">
            <Card>
                <div className="flex gap-2 mb-3">
                    <div className="w-1/2">
                        <Autocomplete 
                            label="Room"
                            variant="bordered"
                            placeholder="Search by Room"
                            className="max-w-xs" 
                            selectedKey={filter}
                            onSelectionChange={setFilter}
                        >
                        {(roomList??[]).map(({_id,title}) => (
                            <AutocompleteItem key={_id} value={_id}>
                                {title}
                            </AutocompleteItem>
                        ))}
                        </Autocomplete>
                    </div>
                    <div className="w-1/2 prose">
                        {currentRoom?<>
                        <h4>{currentRoom.title} <Chip color="primary" key={`room-detail-location`}>{locationList.long[currentRoom.location.toLowerCase()]}</Chip> {currentRoom.category.map(c=><Chip key={`room-detail-${c}`}>{categoryList.long[c.trim().toLowerCase()]??c}</Chip>)}</h4>
                        <p>Max student: {currentRoom.limit}</p>
                        </>:<h4>No room selected</h4>}
                    </div>
                </div>
                {currentRoom?<CalendarByUser 
                    isLoading={isLoading}
                    _events={userEvents}
                    customSubtitle={customSubtitle}
                />:<>Please select room to view schedule</>}
            </Card>
        </div>:<form className="flex justify-center p-24 items-center flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
            <h4 className="text-lg">Please input your <strong>id</strong> to view the room schedule: </h4>
            <div className="flex gap-2">
                <Input className="max-w-80" placeholder="MSCB"  {...register('teacher_id')} labelPlacemen="outside"
                status={errors.id ? 'error' : 'default'}
                helperText={errors.id?.message}/>
                <Button type="submit" color="primary" shadow>Submit</Button>
            </div>
        </form>
        : <h4>Please login with your school email first.</h4>
        }
    </div>
}