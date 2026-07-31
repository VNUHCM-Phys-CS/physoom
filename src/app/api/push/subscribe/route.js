import { connectToDb } from "@/lib/mongodb";
import { NextResponse } from "next/server";
import PushSubscription from "@/models/pushSubscription";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

// POST /api/push/subscribe — save (upsert) a browser push subscription for the
// current user. Body: the PushSubscription JSON from the browser.
export const POST = async (request) => {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ success: false }, { status: 401 });

  try {
    const sub = await request.json();
    if (!sub?.endpoint) {
      return NextResponse.json({ success: false, message: "Invalid subscription" }, { status: 400 });
    }
    await connectToDb();
    await PushSubscription.findOneAndUpdate(
      { endpoint: sub.endpoint },
      { recipient: email, endpoint: sub.endpoint, keys: sub.keys },
      { upsert: true, new: true }
    );
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ success: false }, { status: 500 });
  }
};

// DELETE — remove a subscription (unsubscribe). Body: { endpoint }.
export const DELETE = async (request) => {
  const session = await auth();
  if (!session?.user?.email) return NextResponse.json({ success: false }, { status: 401 });
  try {
    const { endpoint } = await request.json().catch(() => ({}));
    if (endpoint) {
      await connectToDb();
      await PushSubscription.deleteOne({ endpoint });
    }
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ success: false }, { status: 500 });
  }
};
