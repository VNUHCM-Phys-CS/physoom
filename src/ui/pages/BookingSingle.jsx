"use client";
import { useSession } from "next-auth/react";
import CourseList from "../CourseList";
import Card from "../Card";

export default function BookingSingle() {
    const { data: session } = useSession();
    if (session&&session?.user?.email)
        return (<div className="flex py-2 px-2 mx-auto gap-2">
            <Card className="w-1/4">
                <CourseList useremail={session?.user?.email}/>
            </Card>
            <Card className="flex-1">
                <CourseList useremail={session?.user?.email}/>
            </Card>
        </div>);
    else
        return <div>Please login first</div>
}