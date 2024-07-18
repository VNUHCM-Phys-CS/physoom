"use server";
import List from "@/models/list";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { revalidateTag } from "next/cache";

export const GET = async (request) => {
  try {
    const userid = headers().get("userid");
    connectToDb();
    const lists = await List.find({ user: userid });
    return NextResponse.json(lists);
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

export const POST = async (request) => {
  try {
    connectToDb();
    let data = await request.json();
    const userid = headers().get("userid");
    data.user = userid;
    const list = List.create(data);
    revalidateTag("list");
    return NextResponse.json(
      { success: true, data: list },
      {
        status: 201,
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

