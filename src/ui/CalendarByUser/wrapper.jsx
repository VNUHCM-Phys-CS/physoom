import React, { createContext } from 'react';

// Create a context
export const UserCalendarContext = createContext();

import useSWR from "swr";
import { fetcheroptions } from "@/lib/ulti";

export default function UserCalendarProvider({children, email}) {
    const { data: _events, mutate:mutateUserEvent, isLoading:isLoadingEvent } = useSWR(
        [
          email?"/api/calendar-events/fetch":null,
          {
            method: "POST",
            body: JSON.stringify({
              // Show a person's own calendar: classes they teach PLUS meetings /
              // events they host or are invited to (attendees). Without the host/
              // attendees match, a meeting booked for a group wouldn't appear on
              // the members' calendars.
              filter: { $or: [{ teacher_email: email }, { host: email }, { attendees: email }] },
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