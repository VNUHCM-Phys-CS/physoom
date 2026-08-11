"use server";
import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import ViewShare from "@/models/viewShare";
import "@/models/room"; // register Room schema for ViewShare.populate("rooms")
import { auth } from "@/lib/auth";
import { v4 as uuidv4 } from "uuid";

// Characters chosen to avoid visual ambiguity (no 0/O, 1/I/L)
const CODE_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function generateUniqueShortCode() {
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = "";
    for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
    const exists = await ViewShare.exists({ shortCode: code });
    if (!exists) return code;
  }
  throw new Error("Could not generate unique short code");
}

export const GET = async (request) => {
  const session = await auth();
  if (!session?.user?.isAdmin) return NextResponse.json({ success: false }, { status: 401 });
  
  try {
    await connectToDb();
    const shares = await ViewShare.find().populate("rooms").sort({ createdAt: -1 });
    return NextResponse.json(shares);
  } catch (err) {
    console.log(err);
    return NextResponse.json([], { status: 400 });
  }
};

export const POST = async (request) => {
  const session = await auth();
  if (!session?.user?.isAdmin) return NextResponse.json({ success: false }, { status: 401 });

  try {
    await connectToDb();
    const data = await request.json();
    
    const shortCode = await generateUniqueShortCode();
    const newShare = new ViewShare({
       title: data.title,
       rooms: data.rooms || [],
       classes: data.classes || [],
       token: uuidv4(),
       shortCode,
       settings: {
           requireLogin: data.settings?.requireLogin ?? false,
           displayTeacherInfo: data.settings?.displayTeacherInfo ?? true,
           displayClassInfo: data.settings?.displayClassInfo ?? true,
           displayEventDetail: data.settings?.displayEventDetail ?? true
       }
    });
    
    await newShare.save();
    return NextResponse.json({ success: true, share: newShare }, { status: 201 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};

export const DELETE = async (request) => {
  const session = await auth();
  if (!session?.user?.isAdmin) return NextResponse.json({ success: false }, { status: 401 });

  try {
    await connectToDb();
    const { id } = await request.json();
    await ViewShare.findByIdAndDelete(id);
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};
export const PUT = async (request) => {
  const session = await auth();
  if (!session?.user?.isAdmin) return NextResponse.json({ success: false }, { status: 401 });

  try {
    await connectToDb();
    const data = await request.json();
    const { id, ...updateData } = data;
    
    const updatedShare = await ViewShare.findByIdAndUpdate(
      id,
      {
        title: updateData.title,
        rooms: updateData.rooms || [],
        classes: updateData.classes || [],
        settings: {
          requireLogin: updateData.settings?.requireLogin,
          displayTeacherInfo: updateData.settings?.displayTeacherInfo,
          displayClassInfo: updateData.settings?.displayClassInfo,
          displayEventDetail: updateData.settings?.displayEventDetail
        }
      },
      { new: true }
    );
    
    if (!updatedShare) return NextResponse.json({ success: false, message: "Not found" }, { status: 404 });
    
    return NextResponse.json({ success: true, share: updatedShare }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ success: false }, { status: 400 });
  }
};
