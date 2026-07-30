"use client";

import { Chip } from "@heroui/react";
import { motion } from "framer-motion";
import {
  CalendarDaysIcon,
  ZapIcon,
  ShieldCheckIcon,
  UsersIcon,
  ClockIcon,
  SparklesIcon,
} from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const BENEFITS = [
  { icon: ShieldCheckIcon, titleKey: "about.benefit.conflict.title", descKey: "about.benefit.conflict.desc" },
  { icon: ZapIcon, titleKey: "about.benefit.fast.title", descKey: "about.benefit.fast.desc" },
  { icon: ClockIcon, titleKey: "about.benefit.realtime.title", descKey: "about.benefit.realtime.desc" },
  { icon: UsersIcon, titleKey: "about.benefit.team.title", descKey: "about.benefit.team.desc" },
];

export default function AboutPage() {
  const { t } = useI18n();
  return (
    <main className="container max-w-screen-lg mx-auto px-4 py-12">
      {/* Hero */}
      <motion.section
        className="flex flex-col items-center text-center gap-5 mb-14"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div
          variants={fadeUp}
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary text-white shadow-lg shadow-secondary/30"
        >
          <CalendarDaysIcon size={32} />
        </motion.div>
        <motion.div variants={fadeUp}>
          <Chip color="secondary" variant="flat" size="sm">
            {t("about.badge")}
          </Chip>
        </motion.div>
        <motion.h1
          variants={fadeUp}
          className="text-3xl md:text-5xl font-bold text-default-900 max-w-2xl leading-tight"
        >
          {t("about.title")}
        </motion.h1>
        <motion.p
          variants={fadeUp}
          className="text-default-500 max-w-xl text-sm md:text-base leading-relaxed"
        >
          {t("about.subtitle")}
        </motion.p>
      </motion.section>

      {/* What is Physoom */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.3 }}
        className="rounded-2xl border border-default-200 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm p-6 md:p-8 mb-12"
      >
        <div className="flex items-center gap-2 mb-3">
          <SparklesIcon size={18} className="text-secondary" />
          <h2 className="text-lg font-semibold text-default-900">
            {t("about.whatTitle")}
          </h2>
        </div>
        <p className="text-default-600 leading-relaxed text-sm md:text-base">
          {t("about.whatBody")}
        </p>
      </motion.section>

      {/* Benefits */}
      <motion.section
        variants={stagger}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.2 }}
        className="mb-12"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-default-400 mb-4 text-center">
          {t("about.whyTitle")}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {BENEFITS.map(({ icon: Icon, titleKey, descKey }) => (
            <motion.div
              key={titleKey}
              variants={fadeUp}
              whileHover={{ y: -4 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex gap-4 p-5 rounded-2xl border border-default-200 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm h-full"
            >
              <div className="w-10 h-10 rounded-xl bg-secondary-100 text-secondary flex items-center justify-center shrink-0">
                <Icon size={20} />
              </div>
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-sm text-default-900">
                  {t(titleKey)}
                </span>
                <p className="text-xs text-default-500 leading-relaxed">
                  {t(descKey)}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Credit */}
      <motion.section
        variants={fadeUp}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.4 }}
        className="text-center"
      >
        <div className="inline-flex flex-col items-center gap-1 rounded-2xl border border-default-200 bg-white/70 dark:bg-zinc-900/70 backdrop-blur-sm px-8 py-6">
          <p className="text-xs uppercase tracking-widest text-default-400 font-semibold">
            {t("about.createdBy")}
          </p>
          <p className="text-lg font-bold text-default-900">Ngan V.T. Nguyen</p>
          <p className="text-sm text-default-500">
            {t("about.createdFor")}
          </p>
        </div>
      </motion.section>
    </main>
  );
}
