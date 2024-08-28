'use client'
import CalendarByUser from "../CalendarByUser";
import useSWR from "swr";
import {
    Autocomplete,
    AutocompleteSection,
    AutocompleteItem
  } from "@nextui-org/autocomplete";
import { useState } from "react";
import { fetcheroptions } from "@/lib/ulti";

export default function() {
    const [email,setEmail] = useState();
    const { data: userList, mutate: mutateUserList} = useSWR(
        [
            "/api/user",
          {
            method: "GET"
          },
        ],
        fetcheroptions,
        { tags: ["user"], revalidate: 60 }
      );
    const { data: userEvents, mutate: mutateBooking} = useSWR(
    [
        email?"/api/booking":null,
        {
        method: "POST",
        body: JSON.stringify({
            filter: { teacher_email: email },
        }),
        },
    ],
    fetcheroptions,
    { tags: ["booking"], revalidate: 60 }
    );
    return <>
        <Autocomplete 
                label="Lecturer"
                placeholder="Search by email"
                className="max-w-xs" 
                selectedKey={email}
                onSelectionChange={setEmail}
        >
            {(userList??[]).map((u) => (
                <AutocompleteItem key={u} value={u}>
                    {u}
                </AutocompleteItem>
            ))}
        </Autocomplete>
        <CalendarByUser _events={userEvents}/>
    </>
}