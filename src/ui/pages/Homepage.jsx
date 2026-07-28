"use client";
import { Button, Chip } from "@heroui/react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { CalendarIcon, DoorOpenIcon, ClockIcon, UsersIcon } from "lucide-react";

const FEATURES = [
  {
    icon: CalendarIcon,
    title: "Course Booking",
    desc: "Schedule classrooms for your courses across the full semester with conflict detection.",
    href: "/booking",
    auth: true,
  },
  {
    icon: DoorOpenIcon,
    title: "Room Schedule",
    desc: "Browse real-time room availability and see what's happening across all facilities.",
    href: "/view/room",
    auth: false,
  },
  {
    icon: ClockIcon,
    title: "Event Booking",
    desc: "Reserve rooms for one-off events, seminars, or meetings with instant confirmation.",
    href: "/booking",
    auth: true,
  },
  {
    icon: UsersIcon,
    title: "Room Manager",
    desc: "Manage room access, approve requests, and track usage for your assigned rooms.",
    href: "/room-manager",
    auth: true,
    managerOnly: true,
  },
];

function FeatureCard({ icon: Icon, title, desc, href, locked }) {
  const inner = (
    <div className={`flex flex-col gap-3 p-5 rounded-2xl border transition-all h-full
      ${locked
        ? "border-default-100 bg-default-50 opacity-60 cursor-not-allowed"
        : "border-default-200 bg-white dark:bg-zinc-900 hover:border-secondary hover:shadow-md cursor-pointer"
      }`}
    >
      <div className="w-10 h-10 rounded-xl bg-secondary-100 text-secondary flex items-center justify-center shrink-0">
        <Icon size={20} />
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-default-900">{title}</span>
          {locked && <Chip size="sm" variant="flat" color="default">Login required</Chip>}
        </div>
        <p className="text-xs text-default-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );

  if (locked) return inner;
  return <Link href={href} className="block h-full">{inner}</Link>;
}

export default function Home() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <main className="min-h-[70vh] flex flex-col">
      {/* Hero */}
      <section className="flex flex-col items-center justify-center text-center gap-6 py-16 px-4">
        {user ? (
          <>
            <div className="flex flex-col items-center gap-1">
              <p className="text-default-400 text-sm font-medium">Welcome back,</p>
              <h1 className="text-3xl md:text-4xl font-bold text-default-900">{user.name}</h1>
            </div>
            <p className="text-default-500 max-w-md text-sm leading-relaxed">
              Manage course room bookings, browse room availability, or reserve a space for your next event.
            </p>
            <div className="flex gap-3 flex-wrap justify-center">
              <Button as={Link} href="/booking" color="secondary" variant="solid" size="md">
                Go to Booking
              </Button>
              <Button as={Link} href="/view/room" color="default" variant="bordered" size="md">
                View Room Schedule
              </Button>
            </div>
          </>
        ) : (
          <>
            <Chip color="secondary" variant="flat" size="sm">Physics Department</Chip>
            <h1 className="text-3xl md:text-5xl font-bold text-default-900 max-w-xl leading-tight">
              Room Booking &amp; Schedule System
            </h1>
            <p className="text-default-500 max-w-md text-sm md:text-base leading-relaxed">
              Book classrooms for courses, reserve rooms for events, and view real-time room availability — all in one place.
            </p>
            <Button color="secondary" variant="solid" size="lg" onPress={() => signIn("google")}>
              Sign in with Google
            </Button>
          </>
        )}
      </section>

      {/* Feature cards */}
      <section className="max-w-4xl mx-auto w-full px-4 pb-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-default-400 mb-4 text-center">What you can do</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {FEATURES.map((f) => (
            <FeatureCard
              key={f.title}
              {...f}
              locked={f.auth && !user}
            />
          ))}
        </div>
      </section>
    </main>
  );
}
