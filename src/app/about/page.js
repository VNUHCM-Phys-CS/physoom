"use client";

import { Chip } from "@heroui/react";
import { motion } from "framer-motion";
import {
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
    <main className="pb-16">
      {/* ── Hero: full-bleed photo background with an overlay ───────────────── */}
      <motion.section
        variants={stagger}
        initial="hidden"
        animate="show"
        className="relative overflow-hidden min-h-[440px] md:min-h-[520px] flex items-center justify-center"
      >
        {/* Photo (real image, not an icon) */}
        <img
          src="/images/about/hero.jpg"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
        />
        {/* Legibility overlay — works in light & dark */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/45 to-black/75" />
        <div className="absolute inset-0 bg-secondary/20 mix-blend-multiply" />

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center text-white flex flex-col items-center gap-5 py-16">
          <motion.div variants={fadeUp}>
            <Chip
              variant="flat"
              size="sm"
              classNames={{ base: "bg-white/15 backdrop-blur-sm border border-white/25", content: "text-white font-medium" }}
            >
              {t("about.badge")}
            </Chip>
          </motion.div>
          <motion.h1
            variants={fadeUp}
            className="text-4xl md:text-6xl font-bold leading-tight drop-shadow-sm"
          >
            {t("about.title")}
          </motion.h1>
          <motion.p
            variants={fadeUp}
            className="max-w-xl text-sm md:text-lg text-white/85 leading-relaxed"
          >
            {t("about.subtitle")}
          </motion.p>
        </div>
      </motion.section>

      <div className="container max-w-screen-lg mx-auto px-4">
        {/* ── What is Physoom: text + real photo side by side ────────────────── */}
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.3 }}
          className="grid md:grid-cols-2 gap-6 md:gap-10 items-center -mt-10 md:-mt-14"
        >
          <motion.div
            variants={fadeUp}
            className="order-2 md:order-1 rounded-2xl border border-default-200 bg-content1/90 backdrop-blur-sm p-6 md:p-8 shadow-lg"
          >
            <div className="flex items-center gap-2 mb-3">
              <SparklesIcon size={18} className="text-secondary" />
              <h2 className="text-lg font-semibold text-default-900">{t("about.whatTitle")}</h2>
            </div>
            <p className="text-default-600 leading-relaxed text-sm md:text-base">{t("about.whatBody")}</p>
          </motion.div>
          <motion.div variants={fadeUp} className="order-1 md:order-2">
            <img
              src="/images/about/classroom.jpg"
              alt=""
              aria-hidden="true"
              loading="lazy"
              className="w-full h-56 md:h-72 object-cover rounded-2xl border border-default-200 shadow-lg"
            />
          </motion.div>
        </motion.section>

        {/* ── Benefits ───────────────────────────────────────────────────────── */}
        <motion.section
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="mt-14"
        >
          <p className="text-xs font-semibold uppercase tracking-widest text-default-400 mb-5 text-center">
            {t("about.whyTitle")}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {BENEFITS.map(({ icon: Icon, titleKey, descKey }) => (
              <motion.div
                key={titleKey}
                variants={fadeUp}
                whileHover={{ y: -4 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="flex gap-4 p-5 rounded-2xl border border-default-200 bg-content1 h-full"
              >
                <div className="w-10 h-10 rounded-xl bg-secondary-100 text-secondary flex items-center justify-center shrink-0">
                  <Icon size={20} />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-sm text-default-900">{t(titleKey)}</span>
                  <p className="text-xs text-default-500 leading-relaxed">{t(descKey)}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Community band: real photo with overlaid credit ────────────────── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.4 }}
          className="mt-14 relative overflow-hidden rounded-3xl border border-default-200 shadow-lg"
        >
          <img
            src="/images/about/planner.jpg"
            alt=""
            aria-hidden="true"
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/30" />
          <div className="relative z-10 p-8 md:p-12 max-w-md text-white">
            <p className="text-xs uppercase tracking-widest text-white/70 font-semibold">
              {t("about.createdBy")}
            </p>
            <p className="text-2xl font-bold mt-1">Ngan V.T. Nguyen</p>
            <p className="text-sm text-white/80 mt-1">{t("about.createdFor")}</p>
          </div>
        </motion.section>
      </div>
    </main>
  );
}
