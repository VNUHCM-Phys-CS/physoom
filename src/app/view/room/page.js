'use client'

import { Autocomplete, AutocompleteItem, Button, Chip, Input } from "@heroui/react";
import { useSession } from "next-auth/react"
import { useForm } from "react-hook-form";
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import CalendarByUser from "@/ui/CalendarByUser";
import { fetcheroptions } from "@/lib/ulti";
import useSWR from "swr";
import Card from "@/ui/Card";
import { categoryList, locationList } from "@/models/ulti";
import { HashIcon, ArrowRightIcon } from "lucide-react";

const schema = z.object({
    teacher_id: z.string().min(1, 'ID is required')
});

function QuickCodeEntry() {
    const router = useRouter();
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = code.trim().toUpperCase();
        if (trimmed.length !== 6) { setError("Code must be 6 characters"); return; }
        setError("");
        setLoading(true);
        try {
            const res = await fetch(`/api/view-share/lookup?code=${trimmed}`);
            if (res.ok) {
                const { token } = await res.json();
                router.push(`/share/${token}`);
            } else {
                setError("Code not found. Please check and try again.");
            }
        } catch {
            setError("Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-3 py-10 px-4">
            <div className="flex items-center gap-2 text-default-500 text-sm font-medium">
                <HashIcon size={15} />
                Quick access with a share code
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2 items-start">
                <div className="flex flex-col gap-1">
                    <Input
                        value={code}
                        onValueChange={(v) => { setCode(v.toUpperCase()); setError(""); }}
                        placeholder="e.g. AB3C7X"
                        maxLength={6}
                        className="w-40 font-mono"
                        classNames={{ input: "tracking-widest font-bold text-center uppercase" }}
                        isInvalid={!!error}
                        errorMessage={error}
                    />
                </div>
                <Button type="submit" color="secondary" isLoading={loading} endContent={!loading && <ArrowRightIcon size={15} />}>
                    Go
                </Button>
            </form>
            <p className="text-xs text-default-400 text-center max-w-xs">
                Get this code from a display screen, QR poster, or your administrator.
            </p>
        </div>
    );
}

export default function ViewRoomPage() {
    const { data: session } = useSession();
    const [isCheck, setIsCheck] = useState();
    const [teacher_id, setTeacherID] = useState();
    const [filter, setFilter] = useState();
    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm({ resolver: zodResolver(schema) });

    const onSubmit = (data) => {
        if (session && session.teacher_id && (data.teacher_id === session.teacher_id)) {
            setTeacherID(data.teacher_id);
            setIsCheck(true);
        } else {
            setIsCheck(false);
        }
    };

    const { data: roomList, isLoading: roomLoading } = useSWR(
        ["/api/room", { method: "POST", body: JSON.stringify({ filter: { title: { $regex: "cs1" } } }) }],
        fetcheroptions,
        { tags: ["room"], revalidate: 60 }
    );

    const { data: userEvents, isLoading: eventLoading } = useSWR(
        [filter ? "/api/booking" : null, { method: "POST", body: JSON.stringify({ filter: { room: filter } }) }],
        fetcheroptions,
        { tags: ["booking"], revalidate: 60 }
    );

    const currentRoom = useMemo(() =>
        (roomList ?? []).find((d) => d._id === filter),
        [roomList, filter]
    );
    const isLoading = eventLoading || roomLoading;

    return (
        <div className="container m-auto">
            {/* Code entry — visible to everyone */}
            <Card className="mb-4">
                <QuickCodeEntry />
                {session?.user && (
                    <div className="border-t border-default-100 pt-4 mt-2 text-center text-xs text-default-400">
                        Or use your MSCB below to view the room schedule
                    </div>
                )}
            </Card>

            {/* Authenticated room view */}
            {session?.user ? (
                isCheck ? (
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
                                    {(roomList ?? []).map(({ _id, title }) => (
                                        <AutocompleteItem key={_id} value={_id}>{title}</AutocompleteItem>
                                    ))}
                                </Autocomplete>
                            </div>
                            <div className="w-1/2 prose">
                                {currentRoom ? <>
                                    <h4>
                                        {currentRoom.title}{" "}
                                        <Chip color="primary">{locationList.long[currentRoom.location?.toLowerCase()]}</Chip>
                                        {currentRoom.category.map(c => (
                                            <Chip key={c}>{categoryList.long[c.trim().toLowerCase()] ?? c}</Chip>
                                        ))}
                                    </h4>
                                    <p>Max student: {currentRoom.limit}</p>
                                </> : <h4>No room selected</h4>}
                            </div>
                        </div>
                        {currentRoom ? (
                            <CalendarByUser
                                isLoading={isLoading}
                                _events={userEvents}
                                isHideInfo={true}
                                customSubtitle={customSubtitle}
                            />
                        ) : <>Please select room to view schedule</>}
                    </Card>
                ) : (
                    <form className="flex justify-center p-12 items-center flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
                        <h4 className="text-lg">Input your <strong>MSCB</strong> to view the room schedule</h4>
                        <div className="flex gap-2">
                            <Input
                                className="max-w-80"
                                placeholder="MSCB"
                                {...register('teacher_id')}
                                isInvalid={!!errors.teacher_id}
                                errorMessage={errors.teacher_id?.message}
                            />
                            <Button type="submit" color="primary">Submit</Button>
                        </div>
                    </form>
                )
            ) : (
                <p className="text-center text-default-400 text-sm py-6">
                    Log in with your school account to view the room schedule with your MSCB.
                </p>
            )}
        </div>
    );
}

function customSubtitle() {
    return <>You can&apos;t view this info. Please contact Admin.</>
}
