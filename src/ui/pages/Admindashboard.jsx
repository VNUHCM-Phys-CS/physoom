"use client";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";
import dynamic from "next/dynamic";
import SquareHolder from "../SquareHolder";
import { Chip } from "@heroui/react";
import { motion } from "framer-motion";
import { useI18n } from "@/i18n/I18nProvider";
import {
  DoorOpenIcon,
  BookOpenIcon,
  CalendarCheckIcon,
  TrendingUpIcon,
  TicketIcon,
  PieChartIcon,
} from "lucide-react";

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

function ChartCard({ title, count, label, description, isEmpty, emptyText = "No data yet", children }) {
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
          {isEmpty ? (
            <div className="flex flex-col items-center justify-center h-full gap-2 text-default-300">
              <PieChartIcon size={28} />
              <span className="text-xs text-default-400">{emptyText}</span>
            </div>
          ) : (
            children
          )}
        </SquareHolder>
      </div>
    </motion.div>
  );
}

const sum = (arr) => (arr ?? []).reduce((a, b) => a + (b || 0), 0);

export default function Admindashboard() {
  const { t } = useI18n();
  const { data: room } = useSWR("/api/room/viz", fetcher, { revalidateOnFocus: false });
  const { data: course } = useSWR("/api/course/viz", fetcher, { revalidateOnFocus: false });
  const { data: booking } = useSWR("/api/booking/viz", fetcher, { revalidateOnFocus: false });
  const { data: event } = useSWR("/api/room-event/viz", fetcher, { revalidateOnFocus: false });

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

  // Event bookings (custom room events)
  const eventTotal = event?.count ?? 0;
  const eventApproved = event?.approved ?? 0;
  const eventPending = event?.pending ?? 0;
  const eventRejected = event?.rejected ?? 0;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-default-900">{t("admin.dashboard")}</h2>
        <p className="text-sm text-default-400">{t("admin.overview")}</p>
      </div>

      {/* Stat cards */}
      <motion.div
        className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <StatCard
          icon={DoorOpenIcon}
          label={t("dash.totalRooms")}
          value={room?.count}
          sub={room?.labels?.length ? `${room.labels.length} ${t("dash.locations")}` : undefined}
        />
        <StatCard
          icon={BookOpenIcon}
          label={t("dash.totalCourses")}
          value={course?.count}
          sub={course?.labels?.length ? `${course.labels.length} credit group${course.labels.length > 1 ? "s" : ""}` : undefined}
        />
        <StatCard
          icon={CalendarCheckIcon}
          label={t("dash.bookedCourses")}
          value={bookedCourses || undefined}
          sub={bookingRate != null ? `${bookingRate}%` : undefined}
        />
        <StatCard
          icon={TicketIcon}
          label={t("dash.eventBookings")}
          value={eventTotal || undefined}
          sub={eventTotal ? `${eventApproved} ${t("dash.approved")} · ${eventPending} ${t("dash.pending")}` : t("dash.noEvents")}
        />
        <StatCard
          icon={TrendingUpIcon}
          label={t("dash.approvalRate")}
          value={approvalRate != null ? `${approvalRate}%` : undefined}
          sub={approved ? `${approved} ${t("dash.approved")} · ${pending} ${t("dash.pending")}` : t("dash.noBookings")}
        />
      </motion.div>

      {/* Charts */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-stretch"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <ChartCard
          title={t("dash.totalRooms")}
          count={room?.count}
          description={t("dash.byLocation")}
          isEmpty={!room || sum(room?.values) === 0}
          emptyText={t("dash.noData")}
        >
          <PieChart values={room?.values} labels={room?.labels} />
        </ChartCard>

        <ChartCard
          title={t("dash.totalCourses")}
          count={course?.count}
          description={t("dash.byCredit")}
          isEmpty={!course || sum(course?.values) === 0}
          emptyText={t("dash.noData")}
        >
          <PieChart values={course?.values} labels={course?.labels} />
        </ChartCard>

        <ChartCard
          title={t("dash.bookingStatus")}
          count={totalCourses}
          description={bookingRate != null ? `${bookingRate}%` : undefined}
          isEmpty={approved + pending + unbooked === 0}
          emptyText={t("dash.noBookings")}
        >
          <PieChart
            values={[approved, pending, unbooked]}
            labels={[t("dash.approved"), t("dash.pending"), t("dash.notBooked")]}
            isDonut={true}
          />
        </ChartCard>

        <ChartCard
          title={t("dash.eventBookings")}
          count={eventTotal}
          description={t("dash.byStatus")}
          isEmpty={eventTotal === 0}
          emptyText={t("dash.noEvents")}
        >
          <PieChart
            values={[eventApproved, eventPending, eventRejected]}
            labels={[t("dash.approved"), t("dash.pending"), t("dash.rejected")]}
            isDonut={true}
          />
        </ChartCard>
      </motion.div>
    </div>
  );
}
