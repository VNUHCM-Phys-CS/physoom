"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import CalendarEvent from "@/models/calendarEvent";
import ViewShare from "@/models/viewShare";
import "@/models/course"; // register schemas for .populate("course"/"room"/"rooms")
import "@/models/room";
import { auth } from "@/lib/auth";

export const GET = async (request, { params }) => {
  try {
    await connectToDb();
    const token = params.token;
    
    if (!token) return NextResponse.json([], { status: 400 });

    const share = await ViewShare.findOne({ token }).populate("rooms");
    if (!share) return NextResponse.json({ message: "Invalid or expired share link" }, { status: 404 });

    // Enforce Login if required
    if (share.settings.requireLogin) {
       const session = await auth();
       if (!session || !session.user) {
          return NextResponse.json({ message: "Login required to view this schedule", authRequired: true }, { status: 401 });
       }
    }

    // Fetch the events for these rooms
    const roomIds = share.rooms.map(r => r._id);
    const events = await CalendarEvent.find({ 
        room: { $in: roomIds },
        status: 'approved',
        isCancelled: false
    })
    .populate('course')
    .populate('room')
    .lean();

    // Mask restricted information
    const maskedEvents = events.map(e => {
        const titleParts = [];
        // "Show Course Names" (displayEventDetail) reveals the name — either the
        // course title (class events) or the event's own title (room bookings).
        const name = e.course?.title || e.title;
        if (share.settings.displayEventDetail && name) {
            titleParts.push(name);
            if (share.settings.displayClassInfo && e.course?.class_id?.length) {
                titleParts.push(`(${e.course.class_id.join(', ')})`);
            }
        } else {
            titleParts.push("Occupied");
        }

        if (share.settings.displayTeacherInfo && e.teacher_email && e.teacher_email.length > 0) {
            titleParts.push(`- ${e.teacher_email.join(', ')}`);
        } else {
            e.teacher_email = undefined; // Strip it
        }

        if (!share.settings.displayEventDetail) {
            e.course = undefined;
        }
        e.title = titleParts.join(' ');

        return e;
    });

    return NextResponse.json(maskedEvents);
  } catch (err) {
    console.log(err);
    return NextResponse.json([], { status: 500 });
  }
};
