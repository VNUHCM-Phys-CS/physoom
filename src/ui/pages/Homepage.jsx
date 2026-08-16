"use client";
import { useEffect } from "react";
import { Button, Chip } from "@heroui/react";
import { signIn, useSession } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
  { icon: UsersIcon, titleKey: "home.feat.manager.title", descKey: "home.feat.manager.desc", href: "/admin", auth: true, adminOnly: true },
];

// Deterministic particle field (no Math.random → no hydration mismatch). Each
// dot bobs gently and pulses opacity on its own cadence.
const PARTICLES = Array.from({ length: 26 }, (_, i) => ({
  left: (i * 37 + 5) % 100,
  top: (i * 53 + 9) % 100,
  size: 3 + (i % 5) * 2.5,        // 3–13px
  duration: 9 + (i % 7) * 1.8,    // 9–20.8s
  delay: (i % 9) * 0.8,
  drift: (i % 2 ? 1 : -1) * (8 + (i % 5) * 7), // px sideways
}));

// ── Animated aurora background: a slowly colour-shifting gradient, soft drifting
// brand orbs, and a floating particle field over a faint physics texture.
function Aurora() {
  const blob = "absolute rounded-full blur-3xl will-change-transform";
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      <style>{`
        @keyframes physoomGradient {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes physoomFloat {
          0%, 100% { transform: translate(0, 0); opacity: .25; }
          50% { transform: translate(var(--drift), -26px); opacity: .7; }
        }
        .physoom-gradient {
          background-image: linear-gradient(120deg,
            hsla(270, 85%, 90%, .55),
            hsla(210, 85%, 92%, .45),
            hsla(300, 80%, 92%, .45),
            hsla(258, 85%, 90%, .55));
          background-size: 300% 300%;
          animation: physoomGradient 20s ease infinite;
        }
        :root[data-theme="dark"] .physoom-gradient,
        .dark .physoom-gradient {
          background-image: linear-gradient(120deg,
            hsla(270, 70%, 22%, .40),
            hsla(220, 70%, 20%, .35),
            hsla(300, 60%, 22%, .35),
            hsla(258, 70%, 22%, .40));
        }
        .physoom-particle {
          position: absolute;
          border-radius: 9999px;
          background: hsl(270 90% 60%);
          animation: physoomFloat var(--dur) ease-in-out var(--delay) infinite;
          will-change: transform, opacity;
        }
        @media (prefers-reduced-motion: reduce) {
          .physoom-gradient, .physoom-particle { animation: none; }
        }
      `}</style>

      {/* Base + animated colour-shifting gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-secondary-50/60 via-background to-background dark:from-secondary-900/20 dark:via-background dark:to-background" />
      <div className="physoom-gradient absolute inset-0" />

      {/* Faint physics texture */}
      <img
        src="/images/about/hero.jpg"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover opacity-[0.05] dark:opacity-[0.09]"
      />

      {/* Drifting brand orbs */}
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

      {/* Floating particle field */}
      {PARTICLES.map((p, i) => (
        <span
          key={i}
          className="physoom-particle"
          style={{
            left: `${p.left}%`,
            top: `${p.top}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            "--dur": `${p.duration}s`,
            "--delay": `${p.delay}s`,
            "--drift": `${p.drift}px`,
          }}
        />
      ))}
    </div>
  );
}

// Decorative spinning atom (physics motif), used on the hero image frame.
function AtomBadge({ className }) {
  return (
    <div className={className}>
      <motion.svg
        width="56" height="56" viewBox="0 0 56 56"
        animate={{ rotate: 360 }}
        transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
      >
        <g fill="none" stroke="currentColor" strokeWidth="2" className="text-secondary">
          <ellipse cx="28" cy="28" rx="24" ry="9" />
          <ellipse cx="28" cy="28" rx="24" ry="9" transform="rotate(60 28 28)" />
          <ellipse cx="28" cy="28" rx="24" ry="9" transform="rotate(120 28 28)" />
        </g>
        <circle cx="28" cy="28" r="4" className="fill-secondary" />
      </motion.svg>
    </div>
  );
}

function FeatureCard({ icon: Icon, titleKey, descKey, href, locked, adminOnly }) {
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
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-semibold text-sm text-default-900">{title}</span>
          {adminOnly && <Chip size="sm" variant="flat" color="secondary">{t("home.adminOnly")}</Chip>}
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

// A floating app-screenshot in a browser frame, with a purple glow + spinning
// atom badge. Shows the full image (no crop/tint) since it's a product shot.
function HeroVisual({ src, alt }) {
  return (
    <motion.div
      variants={fadeUp}
      className="relative w-full max-w-xl mx-auto"
      animate={{ y: [0, -10, 0] }}
      transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
    >
      <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-secondary/30 to-primary/20 blur-2xl" />
      <div className="relative rounded-2xl overflow-hidden border border-default-200 shadow-2xl shadow-secondary/20 bg-content1">
        {/* browser chrome */}
        <div className="flex items-center gap-1.5 px-3 py-2 border-b border-default-100 bg-default-50">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <img src={src} alt={alt} className="block w-full h-auto" />
      </div>
      <AtomBadge className="absolute -top-5 -right-5 bg-content1 rounded-2xl p-1.5 shadow-lg border border-default-100" />
    </motion.div>
  );
}

export default function Home() {
  const { data: session } = useSession();
  const { t } = useI18n();
  const router = useRouter();
  const user = session?.user;

  // Lecturers (logged-in, non-admin) land on their personal calendar.
  useEffect(() => {
    if (user && !user.isAdmin) router.replace("/booking");
  }, [user, router]);

  // Avoid flashing the marketing home before the redirect kicks in.
  if (user && !user.isAdmin) return null;

  // Hide role-specific cards from people who can't use them (the room/admin
  // management is admin-only — showing it to everyone was confusing).
  const visibleFeatures = FEATURES.filter((f) => !f.adminOnly || user?.isAdmin);

  return (
    <main className="relative min-h-[70vh] flex flex-col overflow-hidden">
      <Aurora />

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-16 md:pt-24 pb-12">
        <motion.div
          className="grid md:grid-cols-2 gap-10 md:gap-8 items-center"
          variants={stagger}
          initial="hidden"
          animate="show"
        >
          {/* Left: copy */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left gap-6">
            {user ? (
              <>
                <motion.div variants={fadeUp} className="flex flex-col items-center md:items-start gap-1">
                  <p className="text-default-400 text-sm font-medium">{t("home.welcomeBack")}</p>
                  <h1 className="text-3xl md:text-5xl font-bold text-default-900">{user.name}</h1>
                </motion.div>
                <motion.p variants={fadeUp} className="text-default-500 max-w-md text-sm md:text-base leading-relaxed">
                  {t("home.userTagline")}
                </motion.p>
                <motion.div variants={fadeUp} className="flex gap-3 flex-wrap justify-center md:justify-start">
                  <Button as={Link} href="/admin" color="secondary" variant="shadow" size="md" endContent={<ArrowRightIcon size={16} />}>
                    {t("nav.adminDashboard")}
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
                  <Chip color="secondary" variant="flat" size="sm" startContent={<SparklesIcon size={14} className="mr-0.5" />}>
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
                <motion.div variants={fadeUp} className="flex flex-wrap gap-3 justify-center md:justify-start">
                  <Button color="secondary" variant="shadow" size="lg" onPress={() => signIn("google")} startContent={<SparklesIcon size={18} />}>
                    {t("home.signInGoogle")}
                  </Button>
                  <Button as={Link} href="/view/room" color="default" variant="bordered" size="lg">
                    {t("home.viewRoomSchedule")}
                  </Button>
                </motion.div>
              </>
            )}
          </div>

          {/* Right: floating hero image */}
          <div className="order-first md:order-last">
            <HeroVisual src="/images/demo1.png" alt={t("home.heroImageAlt")} />
          </div>
        </motion.div>
      </section>

      {/* Feature cards */}
      <section className="max-w-5xl mx-auto w-full px-4 pb-16">
        <p className="text-xs font-semibold uppercase tracking-widest text-default-400 mb-5 text-center">
          {t("home.whatYouCanDo")}
        </p>
        <motion.div
          className={`grid grid-cols-1 sm:grid-cols-2 gap-3 ${visibleFeatures.length >= 4 ? "md:grid-cols-4" : "md:grid-cols-3"}`}
          variants={stagger}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          {visibleFeatures.map((f) => (
            <FeatureCard key={f.titleKey} {...f} locked={f.auth && !user} />
          ))}
        </motion.div>
      </section>

      {/* Showcase: real-time room view */}
      <section className="max-w-5xl mx-auto w-full px-4 pb-24">
        <motion.div
          className="grid md:grid-cols-2 gap-8 items-center rounded-3xl border border-default-200 bg-content1/60 backdrop-blur-sm p-6 md:p-8 overflow-hidden"
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <motion.div
            className="relative rounded-2xl overflow-hidden shadow-xl shadow-secondary/10 border border-default-200 bg-content1 -rotate-1"
            whileHover={{ rotate: 0, scale: 1.02 }}
            transition={{ type: "spring", stiffness: 200, damping: 18 }}
          >
            <div className="flex items-center gap-1.5 px-3 py-2 border-b border-default-100 bg-default-50">
              <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
              <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
            </div>
            <img src="/images/demo2.png" alt="" className="block w-full h-auto" />
          </motion.div>
          <div className="flex flex-col gap-4 text-center md:text-left">
            <div className="inline-flex items-center gap-2 justify-center md:justify-start">
              <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-secondary to-secondary-600 text-white flex items-center justify-center shadow-lg shadow-secondary/25">
                <DoorOpenIcon size={18} />
              </span>
              <h2 className="text-xl md:text-2xl font-bold text-default-900">{t("home.showcase.title")}</h2>
            </div>
            <p className="text-default-500 text-sm md:text-base leading-relaxed">{t("home.showcase.desc")}</p>
            <div className="flex justify-center md:justify-start">
              <Button as={Link} href="/view/room" color="secondary" variant="flat" endContent={<ArrowRightIcon size={16} />}>
                {t("home.showcase.cta")}
              </Button>
            </div>
          </div>
        </motion.div>
      </section>
    </main>
  );
}
