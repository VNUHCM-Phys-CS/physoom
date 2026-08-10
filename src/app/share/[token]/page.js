"use client";
import React, { useState, useMemo, useEffect } from "react";
import useSWR from "swr";
import CalendarByUser from "@/ui/CalendarByUser";
import Calendar from "@/ui/Calendar";
import { Button, Tabs, Tab, Card, CardBody, Select, SelectItem } from "@heroui/react";
import { useRouter } from "next/navigation";
import { booking2calendar, defaultGridNVC, defaultGridLT } from "@/lib/ulti";
import { LayoutGridIcon, CalendarIcon, DoorOpenIcon, ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import moment from "moment";

export default function SharedSchedulePage({ params }) {
    const token = params.token;
    const router = useRouter();
    const { t } = useI18n();
    const [viewType, setViewType] = useState("standard");
    const [roomFilter, setRoomFilter] = useState("all");
    const [isMobile, setIsMobile] = useState(false);
    // Tiết Grid week picker: the grid collapses by weekday, so restrict it to a
    // single week's occurrences (schedules vary week-to-week: holidays, etc.).
    const [weekAnchor, setWeekAnchor] = useState(null);

    useEffect(() => {
        const check = () => setIsMobile(window.innerWidth < 640);
        check();
        window.addEventListener("resize", check);
        return () => window.removeEventListener("resize", check);
    }, []);

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

    // Unique rooms present in the shared schedule, for the room filter.
    const rooms = useMemo(() => {
        const map = new Map();
        (events ?? []).forEach((e) => {
            const r = e.room;
            if (r?._id) map.set(String(r._id), r);
        });
        return Array.from(map.values());
    }, [events]);

    // Events filtered by the selected room ("all" shows everything).
    const filteredEvents = useMemo(() => {
        if (roomFilter === "all") return events ?? [];
        return (events ?? []).filter((e) => String(e.room?._id) === roomFilter);
    }, [events, roomFilter]);

    // Default the Tiết-Grid week to the earliest event once data arrives.
    useEffect(() => {
        if (!weekAnchor && (events?.length)) {
            const min = events.reduce(
                (m, e) => (e.start && (!m || new Date(e.start) < m) ? new Date(e.start) : m),
                null
            );
            setWeekAnchor(min || new Date());
        }
    }, [events, weekAnchor]);

    const weekStart = useMemo(
        () => moment(weekAnchor || undefined).startOf("isoWeek"),
        [weekAnchor]
    );
    const weekEnd = useMemo(() => weekStart.clone().add(7, "days"), [weekStart]);

    // For the grid, restrict to the chosen week (once an anchor is set).
    const weekEvents = useMemo(() => {
        if (!weekAnchor) return filteredEvents;
        const s = weekStart.valueOf();
        const en = weekEnd.valueOf();
        return filteredEvents.filter((e) => {
            const ts = e.start ? new Date(e.start).valueOf() : null;
            return ts == null || (ts >= s && ts < en);
        });
    }, [filteredEvents, weekAnchor, weekStart, weekEnd]);

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
        if (!weekEvents) return [];
        // Map CalendarEvent documents to the shape booking2calendar expects.
        const mockBookings = weekEvents.map(e => {
            let weekday = e.weekday;
            let start_time = e.time_slot?.start_time;
            let end_time = e.time_slot?.end_time;
            // Custom room events store only start/end (no tiết) — derive weekday
            // + minutes-from-midnight so events show on the Tiết Grid too.
            if ((weekday === undefined || start_time === undefined) && e.start) {
                const s = new Date(e.start);
                const en = e.end ? new Date(e.end) : s;
                const jsDay = s.getDay();
                weekday = jsDay === 0 ? 8 : jsDay + 1; // 2=Mon … 7=Sat, 8=Sun
                start_time = s.getHours() * 60 + s.getMinutes();
                end_time = en.getHours() * 60 + en.getMinutes();
            }
            return {
                _id: e._id,
                weekday,
                time_slot: { start_time, end_time, weekday },
                course: e.course || { title: e.title },
                room: e.room,
                type: e.type,
                title: e.title,
                teacher_email: e.teacher_email
            };
        }).filter(b => b.weekday !== undefined && b.time_slot?.start_time !== undefined);

        return mockBookings.map(b => booking2calendar(b, gridData.data));
    }, [weekEvents, gridData]);

    const customColorEvent = (event) => {
        const type = event.raw?.type || 'class';
        const loc = event.raw?.room?.location?.toLowerCase() || 'nvc';
        return `type-${type} loc-${loc}`;
    };

    if (error && error.status === 401) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <h1 className="text-2xl font-bold">{t("share.loginRequired")}</h1>
                <p>{t("share.loginRequiredDesc")}</p>
                <Button color="primary" onPress={() => router.push('/api/auth/signin')}>{t("share.loginToView")}</Button>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center h-screen gap-4">
                <h1 className="text-2xl font-bold text-red-500">{t("share.errorTitle")}</h1>
                <p>{t("share.errorDesc")}</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto min-h-screen flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">{t("share.liveTitle")}</h1>
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
                           <span>{t("share.standardView")}</span>
                        </div>
                       }
                    />
                    <Tab 
                       key="slot" 
                       title={
                        <div className="flex items-center space-x-2">
                           <LayoutGridIcon size={18}/>
                           <span>{t("share.slotView")}</span>
                        </div>
                       }
                    />
                </Tabs>
            </div>

            {/* Room filter — only when the share covers more than one room */}
            {rooms.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                    <DoorOpenIcon size={16} className="text-default-400" />
                    <Select
                        aria-label="Filter by room"
                        size="sm"
                        selectedKeys={[roomFilter]}
                        onSelectionChange={(keys) => setRoomFilter(Array.from(keys)[0] || "all")}
                        className="max-w-[220px]"
                    >
                        <SelectItem key="all">{t("share.allRooms", { n: rooms.length })}</SelectItem>
                        {rooms.map((r) => (
                            <SelectItem key={String(r._id)}>{r.title}</SelectItem>
                        ))}
                    </Select>
                </div>
            )}

            {/* Week picker — Tiết Grid only (Standard View has its own nav) */}
            {viewType === "slot" && (
                <div className="flex items-center justify-center gap-2 flex-wrap">
                    <Button size="sm" variant="flat" startContent={<ChevronLeftIcon size={16} />}
                        onPress={() => setWeekAnchor(weekStart.clone().subtract(7, "days").toDate())}>
                        {t("share.weekPrev")}
                    </Button>
                    <span className="text-sm font-semibold min-w-[170px] text-center">
                        {t("share.week")}: {weekStart.format("DD/MM")} – {weekEnd.clone().subtract(1, "day").format("DD/MM/YYYY")}
                    </span>
                    <Button size="sm" variant="flat" endContent={<ChevronRightIcon size={16} />}
                        onPress={() => setWeekAnchor(weekStart.clone().add(7, "days").toDate())}>
                        {t("share.weekNext")}
                    </Button>
                    <Button size="sm" variant="light" onPress={() => setWeekAnchor(new Date())}>
                        {t("share.thisWeek")}
                    </Button>
                </div>
            )}

            <div className="flex-1 w-full bg-white/60 dark:bg-zinc-900/60 rounded-3xl p-2 sm:p-4 shadow-2xl backdrop-blur-xl border border-white/20 overflow-hidden relative min-h-[520px]">
                {viewType === "standard" ? (
                    <CalendarByUser
                        _events={filteredEvents}
                        isLoading={isLoading}
                        readOnly={true}
                        defaultView={isMobile ? "day" : "week"}
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
