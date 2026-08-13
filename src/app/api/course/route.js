"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Course from "@/models/course";
import { getToken } from "next-auth/jwt";
import { auth } from "@/lib/auth";
import { courseScopeFilter, canManageClasses } from "@/lib/scope";
import CalendarEvent from "@/models/calendarEvent";

export const GET = async (request) => {
  try {
    await connectToDb();
    // Scoped admins only see courses whose class matches their scope.
    const session = await auth();
    const filter = courseScopeFilter(session?.user);
    const course = await Course.find(filter);
    revalidateTag("course");
    return NextResponse.json(course);
  } catch (err) {
    console.log(err);
    return NextResponse.json([], {
      status: 400,
    });
  }
};

export const POST = async (request) => {
  try {
    await connectToDb();
    let { filter } = await request.json();
    const course = await Course.find(filter ?? {});
    revalidateTag("course");
    return NextResponse.json(course);
  } catch (err) {
    console.log(err);
    return NextResponse.json([], {
      status: 400,
    });
  }
};

export const DELETE = async (request) => {
  const token = await auth();
  // check user
  const user = token?.user;
  try {
    await connectToDb();
    if (user && user.isAdmin) {
      let { ids } = await request.json();
      const result = await Course.deleteMany({
        _id: { $in: ids },
      });
      // Delete related CalendarEvents (all occurrences for these courses)
      await CalendarEvent.deleteMany({ course: { $in: ids } });

      revalidateTag("course");
      return NextResponse.json(
        { success: true },
        {
          status: 201,
        }
      );
    } else {
      return NextResponse.json(
        { success: false },
        {
          status: 401,
        }
      );
    }
  } catch (err) {
    console.log(err);
    return NextResponse.json(
      { success: false },
      {
        status: 400,
      }
    );
  }
};
