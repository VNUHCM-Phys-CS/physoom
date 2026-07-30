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
import { HashIcon, ArrowRightIcon, DoorOpenIcon, MapPinIcon, UsersIcon, CalendarSearchIcon } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const schema = z.object({
    teacher_id: z.string().min(1, 'ID is required')
});

function QuickCodeEntry() {
    const router = useRouter();
    const { t } = useI18n();
    const [code, setCode] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const trimmed = code.trim().toUpperCase();
        if (trimmed.length !== 6) { setError(t("room.codeLen")); return; }
        setError("");
        setLoading(true);
        try {
            const res = await fetch(`/api/view-share/lookup?code=${trimmed}`);
            if (res.ok) {
                const { token } = await res.json();
                router.push(`/share/${token}`);
            } else {
                setError(t("room.codeNotFound"));
            }
        } catch {
            setError(t("room.codeError"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-3 py-10 px-4">
            <div className="flex items-center gap-2 text-default-500 text-sm font-medium">
                <HashIcon size={15} />
                {t("room.quickAccess")}
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
                    {t("room.go")}
                </Button>
            </form>
            <p className="text-xs text-default-400 text-center max-w-xs">
                {t("room.codeHint")}
            </p>
        </div>
    );
}

export default function ViewRoomPage() {
    const { data: session } = useSession();
    const { t } = useI18n();
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
        <div className="container mx-auto px-4 py-6">
            {/* Page header */}
            <div className="flex flex-col items-center text-center gap-1 mb-6">
                <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary text-white">
                        <DoorOpenIcon size={18} />
                    </span>
                    <h1 className="text-2xl font-bold text-default-900">{t("room.title")}</h1>
                </div>
                <p className="text-sm text-default-500 max-w-md">
                    {t("room.subtitle")}
                </p>
            </div>

            {/* Code entry — visible to everyone */}
            <Card className="mb-4 max-w-2xl mx-auto">
                <QuickCodeEntry />
                {session?.user && (
                    <div className="border-t border-default-100 pt-4 mt-2 text-center text-xs text-default-400">
                        {t("room.orMscb")}
                    </div>
                )}
            </Card>

            {/* Authenticated room view */}
            {session?.user ? (
                isCheck ? (
                    <Card>
                        <div className="flex flex-col md:flex-row gap-4 mb-4">
                            <div className="w-full md:w-72 shrink-0">
                                <Autocomplete
                                    label={t("room.roomLabel")}
                                    variant="bordered"
                                    placeholder={t("room.searchByRoom")}
                                    startContent={<DoorOpenIcon size={16} className="text-default-400" />}
                                    selectedKey={filter}
                                    onSelectionChange={setFilter}
                                >
                                    {(roomList ?? []).map(({ _id, title }) => (
                                        <AutocompleteItem key={_id} value={_id}>{title}</AutocompleteItem>
                                    ))}
                                </Autocomplete>
                            </div>
                            <div className="flex-1">
                                {currentRoom ? (
                                    <div className="flex flex-col gap-2 rounded-xl border border-default-200 bg-default-50/60 p-4 h-full">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-lg font-bold text-default-900">{currentRoom.title}</span>
                                            <Chip size="sm" color="primary" variant="flat" startContent={<MapPinIcon size={12} />}>
                                                {locationList.long[currentRoom.location?.toLowerCase()] ?? currentRoom.location}
                                            </Chip>
                                            {currentRoom.category.map((c) => (
                                                <Chip key={c} size="sm" variant="flat">
                                                    {categoryList.long[c.trim().toLowerCase()] ?? c}
                                                </Chip>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-1.5 text-sm text-default-500">
                                            <UsersIcon size={14} />
                                            {t("room.maxCap")} <span className="font-semibold text-default-700">{currentRoom.limit}</span> {t("room.students")}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-2 text-default-400 text-sm h-full rounded-xl border border-dashed border-default-200 p-4">
                                        <CalendarSearchIcon size={16} />
                                        {t("room.selectHint")}
                                    </div>
                                )}
                            </div>
                        </div>
                        {currentRoom ? (
                            <CalendarByUser
                                isLoading={isLoading}
                                _events={userEvents}
                                isHideInfo={true}
                                customSubtitle={customSubtitle}
                            />
                        ) : (
                            <div className="flex flex-col items-center justify-center gap-2 py-16 text-default-400">
                                <CalendarSearchIcon size={32} />
                                <p className="text-sm">{t("room.pleaseSelect")}</p>
                            </div>
                        )}
                    </Card>
                ) : (
                    <Card className="max-w-2xl mx-auto">
                        <form className="flex justify-center py-10 px-4 items-center flex-col gap-4" onSubmit={handleSubmit(onSubmit)}>
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary-100 text-secondary">
                                <CalendarSearchIcon size={24} />
                            </div>
                            <h4 className="text-lg text-center">{t("room.enterMscb")}</h4>
                            <div className="flex gap-2 w-full max-w-sm">
                                <Input
                                    className="flex-1"
                                    placeholder="MSCB"
                                    {...register('teacher_id')}
                                    isInvalid={!!errors.teacher_id}
                                    errorMessage={errors.teacher_id?.message}
                                />
                                <Button type="submit" color="secondary">{t("room.submit")}</Button>
                            </div>
                        </form>
                    </Card>
                )
            ) : (
                <p className="text-center text-default-400 text-sm py-6">
                    {t("room.loginToView")}
                </p>
            )}
        </div>
    );
}

function customSubtitle() {
    return <>You can&apos;t view this info. Please contact Admin.</>
}
