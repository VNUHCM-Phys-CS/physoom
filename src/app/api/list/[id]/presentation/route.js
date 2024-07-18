"use server";
import List from "@/models/list";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { revalidateTag } from "next/cache";

export const GET = async (request,{ params }) => {
  try {
    const { id } = params;
    connectToDb();
    const list = await List.findOne({ id: id },{presentation:1});
    return NextResponse.json(list);
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

export const PUT = async (request) => {
    try {
      const {
        query: { id },
      } = request;
      connectToDb();
      let data = await request.json();
      const userid = headers().get("userid");
      const list = await List.findOneAndUpdate({ id: id, user: userid }, {presentation:data}, {
        new: true,
      });
      revalidateTag("team");
      return NextResponse.json(
        { success: true, data: list },
        {
          status: 200,
        }
      );
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
  