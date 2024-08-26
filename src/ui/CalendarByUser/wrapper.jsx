import React, { createContext } from 'react';

// Create a context
export const UserCalendarContext = createContext();

import useSWR from "swr";
import { fetcheroptions } from "@/lib/ulti";

export default function UserCalendarProvider({children, email}) {
    const { data: _events, mutate:mutateUserEvent, isLoading:isLoadingEvent } = useSWR(
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

    return <UserCalendarContext.Provider value={{ userEvents:_events, mutateUserEvent }}>
      {children}
    </UserCalendarContext.Provider>;
}