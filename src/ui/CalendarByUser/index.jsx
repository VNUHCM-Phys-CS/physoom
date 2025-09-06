import { useCallback, useMemo } from "react";
import Calendar from "../Calendar";
import LoadingWrapper from "../LoadingWrapper";
import { defaultGridByTime } from "@/lib/ulti";


export default function CalendarByUser({_events=[],isLoading,selectedID,customSubtitle,onClickEvent,onDragStart,isHideInfo=false}){
    const events = useMemo(()=>{
        return (_events ?? []).map((e) => defaultGridByTime.booking2calendar(e))
    },[_events])
    const customColorEvent = useCallback((e)=>{
        const location = e?.data?.room?.location;
        if (location == 'LT' )
            return "!bg-purple-300/50 dark:!bg-purple-700/50"
    },[]);
    return <LoadingWrapper isLoading={isLoading}>
        <Calendar events={events}
            gridData={defaultGridByTime.data}
            customSubtitle={customSubtitle}
            selectedID={selectedID}
            showSnapResolution={false}
            onClickEvent={onClickEvent}
            onDragStart={onDragStart}
            isHideInfo={isHideInfo}
            customColorEvent={customColorEvent}
        />
    </LoadingWrapper>
}