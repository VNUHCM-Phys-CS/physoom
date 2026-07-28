"use client";
import { Button, Chip } from "@heroui/react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarIcon, DoorOpenIcon, ClockIcon, UsersIcon } from "lucide-react";

const MotionLink = motion.create(Link);

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

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
        ? "border-default-100 bg-default-50/70 opacity-60 cursor-not-allowed"
        : "border-default-200 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm hover:border-secondary hover:shadow-lg hover:shadow-secondary/10 cursor-pointer"
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

  if (locked) {
    return (
      <motion.div variants={fadeUp} className="h-full">
        {inner}
      </motion.div>
    );
  }
  return (
    <MotionLink
      href={href}
      className="block h-full"
      variants={fadeUp}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
    >
      {inner}
    </MotionLink>
  );
}

export default function Home() {
  const { data: session } = useSession();
  const user = session?.user;

  return (
    <main className="min-h-[70vh] flex flex-col">
      {/* Hero */}
      <motion.section
        className="flex flex-col items-center justify-center text-center gap-6 py-16 px-4"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {user ? (
          <>
            <motion.div variants={fadeUp} className="flex flex-col items-center gap-1">
              <p className="text-default-400 text-sm font-medium">Welcome back,</p>
              <h1 className="text-3xl md:text-4xl font-bold text-default-900">{user.name}</h1>
            </motion.div>
            <motion.p variants={fadeUp} className="text-default-500 max-w-md text-sm leading-relaxed">
              Manage course room bookings, browse room availability, or reserve a space for your next event.
            </motion.p>
            <motion.div variants={fadeUp} className="flex gap-3 flex-wrap justify-center">
              <Button as={Link} href="/booking" color="secondary" variant="solid" size="md">
                Go to Booking
              </Button>
              <Button as={Link} href="/view/room" color="default" variant="bordered" size="md">
                View Room Schedule
              </Button>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div
              variants={fadeUp}
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Chip color="secondary" variant="flat" size="sm">Physics Department</Chip>
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-3xl md:text-5xl font-bold text-default-900 max-w-xl leading-tight">
              Room Booking &amp; Schedule System
            </motion.h1>
            <motion.p variants={fadeUp} className="text-default-500 max-w-md text-sm md:text-base leading-relaxed">
              Book classrooms for courses, reserve rooms for events, and view real-time room availability — all in one place.
            </motion.p>
            <motion.div variants={fadeUp}>
              <Button color="secondary" variant="solid" size="lg" onPress={() => signIn("google")}>
                Sign in with Google
              </Button>
            </motion.div>
          </>
        )}
      </motion.section>

      {/* Feature cards */}
      <section className="max-w-4xl mx-auto w-full px-4 pb-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-default-400 mb-4 text-center">What you can do</p>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {FEATURES.map((f) => (
            <FeatureCard
              key={f.title}
              {...f}
              locked={f.auth && !user}
            />
          ))}
        </motion.div>
      </section>
    </main>
  );
}
