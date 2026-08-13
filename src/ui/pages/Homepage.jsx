"use client";
import { Button, Chip } from "@heroui/react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  CalendarIcon, DoorOpenIcon, ClockIcon, UsersIcon, ArrowRightIcon, SparklesIcon,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } },
};

const FEATURES = [
  { icon: CalendarIcon, titleKey: "home.feat.course.title", descKey: "home.feat.course.desc", href: "/booking", auth: true },
  { icon: DoorOpenIcon, titleKey: "home.feat.roomSchedule.title", descKey: "home.feat.roomSchedule.desc", href: "/view/room", auth: false },
  { icon: ClockIcon, titleKey: "home.feat.event.title", descKey: "home.feat.event.desc", href: "/booking", auth: true },
  { icon: UsersIcon, titleKey: "home.feat.manager.title", descKey: "home.feat.manager.desc", href: "/room-manager", auth: true, managerOnly: true },
];

// ── Animated aurora background: soft drifting brand-purple orbs over a faint
// physics-equation texture. Purely decorative; sits behind everything.
function Aurora() {
  const blob = "absolute rounded-full blur-3xl will-change-transform";
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-b from-secondary-50/70 via-background to-background dark:from-secondary-900/25 dark:via-background dark:to-background" />
      <img
        src="/images/about/hero.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-[0.05] dark:opacity-[0.09]"
      />
      <motion.div
        className={`${blob} -top-24 -left-16 h-72 w-72 bg-secondary/35`}
        animate={{ x: [0, 40, 0], y: [0, 26, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 13, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={`${blob} top-24 -right-20 h-80 w-80 bg-primary/25`}
        animate={{ x: [0, -34, 0], y: [0, 34, 0], scale: [1, 1.12, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={`${blob} bottom-0 left-1/3 h-64 w-64 bg-secondary/25`}
        animate={{ x: [0, 28, 0], y: [0, -22, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

function FeatureCard({ icon: Icon, titleKey, descKey, href, locked }) {
  const { t } = useI18n();
  const title = t(titleKey);
  const desc = t(descKey);
  const inner = (
    <div
      className={`group relative flex flex-col gap-3 p-5 rounded-2xl border h-full overflow-hidden transition-all
      ${locked
        ? "border-default-100 bg-default-50/70 opacity-60 cursor-not-allowed"
        : "border-default-200 bg-content1/70 backdrop-blur-sm hover:border-secondary/60 hover:shadow-xl hover:shadow-secondary/10 cursor-pointer"
      }`}
    >
      {/* hover wash */}
      {!locked && (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-secondary/0 via-secondary/0 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
      <div className="relative w-11 h-11 rounded-xl bg-gradient-to-br from-secondary to-secondary-600 text-white flex items-center justify-center shrink-0 shadow-lg shadow-secondary/25">
        <Icon size={20} />
      </div>
      <div className="relative flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm text-default-900">{title}</span>
          {locked && <Chip size="sm" variant="flat" color="default">{t("home.loginRequired")}</Chip>}
        </div>
        <p className="text-xs text-default-500 leading-relaxed">{desc}</p>
      </div>
      {!locked && (
        <span className="relative mt-auto inline-flex items-center gap-1 text-xs font-medium text-secondary opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
          {t("home.open")} <ArrowRightIcon size={13} />
        </span>
      )}
    </div>
  );

  // Keep a stable motion.div wrapper regardless of `locked` so it never
  // remounts when the session resolves (which would strand it at opacity 0).
  return (
    <motion.div
      variants={fadeUp}
      whileHover={locked ? undefined : { y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="h-full"
    >
      {locked ? inner : <Link href={href} className="block h-full">{inner}</Link>}
    </motion.div>
  );
}

export default function Home() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const user = session?.user;

  return (
    <main className="relative min-h-[70vh] flex flex-col overflow-hidden">
      <Aurora />

      {/* Hero */}
      <motion.section
        className="flex flex-col items-center justify-center text-center gap-6 pt-20 pb-16 px-4"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {user ? (
          <>
            <motion.div variants={fadeUp} className="flex flex-col items-center gap-1">
              <p className="text-default-400 text-sm font-medium">{t("home.welcomeBack")}</p>
              <h1 className="text-3xl md:text-5xl font-bold text-default-900">{user.name}</h1>
            </motion.div>
            <motion.p variants={fadeUp} className="text-default-500 max-w-md text-sm md:text-base leading-relaxed">
              {t("home.userTagline")}
            </motion.p>
            <motion.div variants={fadeUp} className="flex gap-3 flex-wrap justify-center">
              <Button as={Link} href="/booking" color="secondary" variant="shadow" size="md" endContent={<ArrowRightIcon size={16} />}>
                {t("home.goToBooking")}
              </Button>
              <Button as={Link} href="/view/room" color="default" variant="bordered" size="md">
                {t("home.viewRoomSchedule")}
              </Button>
            </motion.div>
          </>
        ) : (
          <>
            <motion.div
              variants={fadeUp}
              animate={{ y: [0, -7, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Chip
                color="secondary"
                variant="flat"
                size="sm"
                startContent={<SparklesIcon size={14} className="mr-0.5" />}
              >
                {t("home.badge")}
              </Chip>
            </motion.div>
            <motion.h1
              variants={fadeUp}
              className="text-4xl md:text-6xl font-bold max-w-2xl leading-tight bg-gradient-to-br from-default-900 via-default-900 to-secondary bg-clip-text text-transparent"
            >
              {t("home.title")}
            </motion.h1>
            <motion.p variants={fadeUp} className="text-default-500 max-w-md text-sm md:text-lg leading-relaxed">
              {t("home.subtitle")}
            </motion.p>
            <motion.div variants={fadeUp} className="flex flex-wrap gap-3 justify-center">
              <Button color="secondary" variant="shadow" size="lg" onPress={() => signIn("google")} startContent={<SparklesIcon size={18} />}>
                {t("home.signInGoogle")}
              </Button>
              <Button as={Link} href="/view/room" color="default" variant="bordered" size="lg">
                {t("home.viewRoomSchedule")}
              </Button>
            </motion.div>
          </>
        )}
      </motion.section>

      {/* Feature cards */}
      <section className="max-w-4xl mx-auto w-full px-4 pb-20">
        <p className="text-xs font-semibold uppercase tracking-widest text-default-400 mb-5 text-center">
          {t("home.whatYouCanDo")}
        </p>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3"
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {FEATURES.map((f) => (
            <FeatureCard key={f.titleKey} {...f} locked={f.auth && !user} />
          ))}
        </motion.div>
      </section>
    </main>
  );
}
