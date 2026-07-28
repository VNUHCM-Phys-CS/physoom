"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import CalendarEvent from "@/models/calendarEvent";

export const POST = async (request) => {
  const session = await auth();
  try {
    await connectToDb();
    const data = await request.json();
    
    // Ensure user is authorized to edit it
    // If teacher, they should only be able to edit their own events. Admin can edit any.
    const isAdmin = session?.user?.isAdmin;
    
    const event = await CalendarEvent.findById(data.id);
    if (!event) return NextResponse.json({ success: false }, { status: 404 });

    if (!isAdmin && (!event.teacher_email || !event.teacher_email.includes(session?.user?.email))) {
       return NextResponse.json({ success: false, message: "Unauthorized" }, { status: 401 });
    }

    event.start = new Date(data.start);
    event.end = new Date(data.end);
    
    // If dragged via React Big Calendar, it changes only this single occurrence
    await event.save();
    
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};
