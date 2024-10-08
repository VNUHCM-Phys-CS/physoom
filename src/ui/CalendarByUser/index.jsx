import { useMemo } from "react";
import Calendar from "../Calendar";
import LoadingWrapper from "../LoadingWrapper";
import { defaultGridByTime } from "@/lib/ulti";

export default function CalendarByUser({_events=[],isLoading,selectedID,customSubtitle}){
    const events = useMemo(()=>{
        return (_events ?? []).map((e) => defaultGridByTime.booking2calendar(e))
    },[_events])
    return <LoadingWrapper isLoading={isLoading}>
        <Calendar events={events}
            gridData={defaultGridByTime.data}
            customSubtitle={customSubtitle}
            selectedID={selectedID}
        />
    </LoadingWrapper>
}