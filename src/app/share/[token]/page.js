"use client";
import React, { useState, useMemo } from "react";
import useSWR from "swr";
import CalendarByUser from "@/ui/CalendarByUser";
import Calendar from "@/ui/Calendar";
import { Button, Tabs, Tab, Card, CardBody } from "@heroui/react";
import { useRouter } from "next/navigation";
import { booking2calendar, defaultGridNVC, defaultGridLT } from "@/lib/ulti";
import { LayoutGridIcon, CalendarIcon } from "lucide-react";

export default function SharedSchedulePage({ params }) {
    const token = params.token;
    const router = useRouter();
    const [viewType, setViewType] = useState("standard");

    const fetcherWithAuth = async (url) => {
        const res = await fetch(url);
        if (res.status === 401) {
            const error = new Error('Not authorized');
            error.status = 401;
            throw error;
        }
        if (!res.ok) {
            const error = new Error('An error occurred');
            error.status = res.status;
            throw error;
        }
        return res.json();
    };

    const { data: events, error, isLoading } = useSWR(`/api/calendar-events/share/${token}`, fetcherWithAuth);

    // Determine grid based on room locations
    const gridData = useMemo(() => {
        if (!events || events.length === 0) return defaultGridNVC;
        const hasLT = events.some(e => e.room?.location === 'LT');
        const hasNVC = events.some(e => e.room?.location === 'NVC');
        // If mostly LT, use LT grid
        if (hasLT && !hasNVC) return defaultGridLT;
        return defaultGridNVC;
    }, [events]);

    // Map events for the custom Grid (Tiết)
    const gridEvents = useMemo(() => {
        if (!events) return [];
        // Map CalendarEvent documents to the shape booking2calendar expects
        const mockBookings = events.map(e => ({
            _id: e._id,
            weekday: e.weekday,
            time_slot: {
                ...e.time_slot,
                weekday: e.weekday // booking2calendar expects it here
            },
            course: e.course || { title: e.title },
            room: e.room,
            type: e.type,
            title: e.title,
            teacher_email: e.teacher_email
        })).filter(b => b.weekday !== undefined && b.time_slot?.start_time !== undefined);

        return mockBookings.map(b => booking2calendar(b, gridData.data));
    }, [events, gridData]);

    const customColorEvent = (event) => {
        const type = event.raw?.type || 'class';
        const loc = event.raw?.room?.location?.toLowerCase() || 'nvc';
        return `type-${type} loc-${loc}`;
    };

    if (error && error.status === 401) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <h1 className="text-2xl font-bold">Login Required</h1>
                <p>This room schedule requires you to be logged into your account.</p>
                <Button color="primary" onPress={() => router.push('/api/auth/signin')}>Login to View</Button>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <h1 className="text-2xl font-bold text-red-500">Error Loading Schedule</h1>
                <p>This link may be invalid, deleted, or expired.</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">Live Room Schedule</h1>
                <Tabs 
                    aria-label="View Toggle" 
                    color="primary" 
                    variant="bordered"
                    selectedKey={viewType}
                    onSelectionChange={setViewType}
                    classNames={{
                        tabList: "bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border-primary/20",
                        cursor: "bg-primary shadow-lg shadow-primary/40 text-white",
                        tabContent: "group-data-[selected=true]:text-white"
                    }}
                >
                    <Tab 
                       key="standard" 
                       title={
                        <div className="flex items-center space-x-2">
                           <CalendarIcon size={18}/>
                           <span>Standard View</span>
                        </div>
                       }
                    />
                    <Tab 
                       key="slot" 
                       title={
                        <div className="flex items-center space-x-2">
                           <LayoutGridIcon size={18}/>
                           <span>Tiết Grid (Slot)</span>
                        </div>
                       }
                    />
                </Tabs>
            </div>
            
            <div className="flex-1 w-full bg-white/60 dark:bg-zinc-900/60 rounded-3xl p-4 shadow-2xl backdrop-blur-xl border border-white/20 overflow-hidden relative min-h-[600px]">
                {viewType === "standard" ? (
                    <CalendarByUser 
                        _events={events} 
                        isLoading={isLoading} 
                        readOnly={true} 
                    />
                ) : (
                    <div className="h-full overflow-auto">
                        <Calendar 
                           gridData={gridData.data}
                           events={gridEvents}
                           readOnly={true}
                           customColorEvent={customColorEvent}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
