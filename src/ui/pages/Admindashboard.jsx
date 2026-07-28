"use client";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";
import dynamic from "next/dynamic";
import SquareHolder from "../SquareHolder";
import { Chip } from "@heroui/react";
import { motion } from "framer-motion";
import { DoorOpenIcon, BookOpenIcon, CalendarCheckIcon, TrendingUpIcon } from "lucide-react";

const PieChart = dynamic(() => import("@/ui/viz/PieChart"), { ssr: false });

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const glassCard =
  "rounded-2xl border border-default-200 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm p-5";

function StatCard({ icon: Icon, label, value, sub }) {
  return (
    <motion.div
      variants={fadeUp}
      whileHover={{ y: -3 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={`${glassCard} flex flex-col gap-2 h-full`}
    >
      <div className="flex items-center gap-2 text-default-500 text-xs font-semibold uppercase tracking-wide">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary-100 text-secondary">
          <Icon size={15} />
        </span>
        {label}
      </div>
      <div className="text-3xl font-bold text-default-900">{value ?? "—"}</div>
      {sub && <div className="text-xs text-default-400">{sub}</div>}
    </motion.div>
  );
}

function ChartCard({ title, count, label, description, children }) {
  return (
    <motion.div variants={fadeUp} className={`${glassCard} flex flex-col gap-2 h-full`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-default-400 font-semibold uppercase tracking-wide">{title}</p>
          <p className="text-3xl font-bold text-default-900 mt-0.5">{count ?? "—"}</p>
          {label && <p className="text-xs text-default-400">{label}</p>}
        </div>
        {description && (
          <Chip size="sm" variant="flat" color="secondary" className="text-xs shrink-0">{description}</Chip>
        )}
      </div>
      <div className="px-6 mt-1">
        <SquareHolder>
          {children}
        </SquareHolder>
      </div>
    </motion.div>
  );
}

export default function Admindashboard() {
  const { data: room } = useSWR("/api/room/viz", fetcher, { revalidateOnFocus: false });
  const { data: course } = useSWR("/api/course/viz", fetcher, { revalidateOnFocus: false });
  const { data: booking } = useSWR("/api/booking/viz", fetcher, { revalidateOnFocus: false });

  const approved = booking?.values?.[0] ?? 0;
  const pending = booking?.values?.[1] ?? 0;
  const unbooked = booking?.values?.[2] ?? 0;
  const totalCourses = booking?.count ?? 0;
  const bookedCourses = approved + pending;
  const approvalRate = (approved + pending) > 0
    ? Math.round((approved / (approved + pending)) * 100)
    : null;
  const bookingRate = totalCourses > 0
    ? Math.round((bookedCourses / totalCourses) * 100)
    : null;

  return (
    <div className="flex flex-col gap-6">
      {/* Stat cards */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <StatCard
          icon={DoorOpenIcon}
          label="Total Rooms"
          value={room?.count}
          sub={room?.labels?.length ? `${room.labels.length} location${room.labels.length > 1 ? "s" : ""}` : undefined}
        />
        <StatCard
          icon={BookOpenIcon}
          label="Total Courses"
          value={course?.count}
          sub={course?.labels?.length ? `${course.labels.length} credit group${course.labels.length > 1 ? "s" : ""}` : undefined}
        />
        <StatCard
          icon={CalendarCheckIcon}
          label="Booked Courses"
          value={bookedCourses || undefined}
          sub={bookingRate != null ? `${bookingRate}% of all courses` : undefined}
        />
        <StatCard
          icon={TrendingUpIcon}
          label="Approval Rate"
          value={approvalRate != null ? `${approvalRate}%` : undefined}
          sub={approved ? `${approved} approved · ${pending} pending` : "No bookings yet"}
        />
      </motion.div>

      {/* Charts */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <ChartCard
          title="Rooms"
          count={room?.count}
          label="total rooms"
          description="By location"
        >
          <PieChart values={room?.values} labels={room?.labels} />
        </ChartCard>

        <ChartCard
          title="Courses"
          count={course?.count}
          label="total courses"
          description="By credit"
        >
          <PieChart values={course?.values} labels={course?.labels} />
        </ChartCard>

        <ChartCard
          title="Booking Status"
          count={totalCourses}
          label="total courses"
          description={bookingRate != null ? `${bookingRate}% booked` : undefined}
        >
          <PieChart
            values={[approved, pending, unbooked]}
            labels={["Approved", "Pending", "Not booked"]}
            isDonut={true}
          />
        </ChartCard>
      </motion.div>
    </div>
  );
}
