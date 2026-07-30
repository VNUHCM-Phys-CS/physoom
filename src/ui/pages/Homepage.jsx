"use client";
import { Button, Chip } from "@heroui/react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarIcon, DoorOpenIcon, ClockIcon, UsersIcon } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const FEATURES = [
  { icon: CalendarIcon, titleKey: "home.feat.course.title", descKey: "home.feat.course.desc", href: "/booking", auth: true },
  { icon: DoorOpenIcon, titleKey: "home.feat.roomSchedule.title", descKey: "home.feat.roomSchedule.desc", href: "/view/room", auth: false },
  { icon: ClockIcon, titleKey: "home.feat.event.title", descKey: "home.feat.event.desc", href: "/booking", auth: true },
  { icon: UsersIcon, titleKey: "home.feat.manager.title", descKey: "home.feat.manager.desc", href: "/room-manager", auth: true, managerOnly: true },
];

function FeatureCard({ icon: Icon, titleKey, descKey, href, locked }) {
  const { t } = useI18n();
  const title = t(titleKey);
  const desc = t(descKey);
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
          {locked && <Chip size="sm" variant="flat" color="default">{t("home.loginRequired")}</Chip>}
        </div>
        <p className="text-xs text-default-500 leading-relaxed">{desc}</p>
      </div>
    </div>
  );

  // Keep a stable motion.div wrapper regardless of `locked` so it never
  // remounts when the session resolves (which would strand it at opacity 0).
  return (
    <motion.div
      variants={fadeUp}
      whileHover={locked ? undefined : { y: -4 }}
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
              <p className="text-default-400 text-sm font-medium">{t("home.welcomeBack")}</p>
              <h1 className="text-3xl md:text-4xl font-bold text-default-900">{user.name}</h1>
            </motion.div>
            <motion.p variants={fadeUp} className="text-default-500 max-w-md text-sm leading-relaxed">
              {t("home.userTagline")}
            </motion.p>
            <motion.div variants={fadeUp} className="flex gap-3 flex-wrap justify-center">
              <Button as={Link} href="/booking" color="secondary" variant="solid" size="md">
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
              animate={{ y: [0, -8, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Chip color="secondary" variant="flat" size="sm">{t("home.badge")}</Chip>
            </motion.div>
            <motion.h1 variants={fadeUp} className="text-3xl md:text-5xl font-bold text-default-900 max-w-xl leading-tight">
              {t("home.title")}
            </motion.h1>
            <motion.p variants={fadeUp} className="text-default-500 max-w-md text-sm md:text-base leading-relaxed">
              {t("home.subtitle")}
            </motion.p>
            <motion.div variants={fadeUp}>
              <Button color="secondary" variant="solid" size="lg" onPress={() => signIn("google")}>
                {t("home.signInGoogle")}
              </Button>
            </motion.div>
          </>
        )}
      </motion.section>

      {/* Feature cards */}
      <section className="max-w-4xl mx-auto w-full px-4 pb-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-default-400 mb-4 text-center">{t("home.whatYouCanDo")}</p>
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {FEATURES.map((f) => (
            <FeatureCard
              key={f.titleKey}
              {...f}
              locked={f.auth && !user}
            />
          ))}
        </motion.div>
      </section>
    </main>
  );
}
