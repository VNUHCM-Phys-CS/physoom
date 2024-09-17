'use client'

import { Input } from "@nextui-org/react";
import { useSession } from "next-auth/react"

export default function ViewRoomPage () {
    const {data: session} = useSession();
    return <div className="container m-auto">
        {session?.user?
        <form className="flex justify-center h-full items-center">
            <h4 className="text-lg">Please input your id to view the room schedule: </h4>
            <Input label="MSCB" className="max-w-80" name="teacher_id" labelPlacemen="outside"/>
            <button/>
        </form>
        : <h4>Please login with your school email first.</h4>
        }
    </div>
}