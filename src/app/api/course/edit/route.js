"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import Course from "@/models/course";
import { auth } from "@/lib/auth";

export const POST = async (request, res) => {
  const token = await auth();
  const user = token?.user;
  try {
    await connectToDb();
    let data = await request.json();
    if (user && user.isAdmin) {
      const bulkOps = data.map((d) => {
        const { _id, ...u } = d;
        return {
          updateOne: {
            filter: { _id },
            update: { $set: u },
          },
        };
      });
      await Course.bulkWrite(bulkOps)
        .then((result) => {
          console.log(`${result.modifiedCount} documents were updated.`);
        })
        .catch((error) => {
          console.error("Error updating documents:", error);
        });
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
