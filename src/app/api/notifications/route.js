import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import Notification from "@/models/notification";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// GET /api/notifications — current user's recent notifications + unread count.
export const GET = async () => {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ items: [], unread: 0 }, { status: 401 });

  try {
    await connectToDb();
    const [items, unread] = await Promise.all([
      Notification.find({ recipient: email }).sort({ createdAt: -1 }).limit(30).lean(),
      Notification.countDocuments({ recipient: email, read: false }),
    ]);
    return NextResponse.json({ items, unread });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ items: [], unread: 0 }, { status: 500 });
  }
};

// POST /api/notifications — mark as read. Body: { id } or {} (all).
export const POST = async (request) => {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ success: false }, { status: 401 });

  try {
    await connectToDb();
    const { id } = await request.json().catch(() => ({}));
    const filter = { recipient: email, read: false };
    if (id) filter._id = id;
    await Notification.updateMany(filter, { read: true });
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
};
