'use client'
import CalendarByUser from "../CalendarByUser";
import useSWR from "swr";
import {
    Autocomplete,
    AutocompleteSection,
    AutocompleteItem
  } from "@nextui-org/autocomplete";
import { useEffect, useMemo, useState } from "react";
import { fetcheroptions } from "@/lib/ulti";
import { Select, SelectItem } from "@nextui-org/react";

export default function() {
    const [searchKey,setSearchKey] = useState('teacher');
    const _searchKey = useMemo(()=>new Set([searchKey]),[searchKey]);
    const [filter,setFilter] = useState();
    const { data: userList} = useSWR(
        [
            "/api/user",
          {
            method: "GET"
          },
        ],
        fetcheroptions,
        { tags: ["user"], revalidate: 60 }
      );
    const { data: classList} = useSWR(
        [
            "/api/class",
          {
            method: "GET"
          },
        ],
        fetcheroptions,
        { tags: ["class"], revalidate: 60 }
      );
    const { data: userEvents, mutate: mutateBooking} = useSWR(
    [
        filter?"/api/booking":null,
        {
        method: "POST",
        body: JSON.stringify({
            filter: { teacher_email: filter },
        }),
        },
    ],
    fetcheroptions,
    { tags: ["booking"], revalidate: 60 }
    );
    return <>
    <div className="flex">
        <Select
            label="Search by"
            selectedKeys={_searchKey}
            onSelectionChange={(v)=>{
                setFilter(undefined);
                setSearchKey(v.values().next().value)}}
            className="max-w-[200px]"    
        >
            <SelectItem value="teacher" key="teacher">Teacher</SelectItem>
            <SelectItem value="room" key="room">Room</SelectItem>
            <SelectItem value="class" key="class">Class</SelectItem>
        </Select>
        {(searchKey==='teacher')&&<Autocomplete 
                label="Lecturer"
                variant="bordered"
                placeholder="Search by email"
                className="max-w-xs" 
                selectedKey={filter}
                onSelectionChange={setFilter}
        >
            {(userList??[]).map((u) => (
                <AutocompleteItem key={u} value={u}>
                    {u}
                </AutocompleteItem>
            ))}
        </Autocomplete>}
        {(searchKey==='class')&&<Autocomplete 
                label="Lecturer"
                variant="bordered"
                placeholder="Search by Class id"
                className="max-w-xs" 
                selectedKey={filter}
                onSelectionChange={setFilter}
        >
            {(classList??[]).map((u) => (
                <AutocompleteItem key={u} value={u}>
                    {u}
                </AutocompleteItem>
            ))}
        </Autocomplete>}
        </div>
        <CalendarByUser _events={userEvents}/>
    </>
}