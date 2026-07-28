"use client";

/**
 * Decorative, fixed, non-interactive background layer.
 * Sits behind all content (-z-10) and never intercepts pointer events,
 * so tables, the calendar grid, and forms remain fully usable.
 * Animation is pure CSS (see globals.scss) and theme-aware.
 */
export default function AnimatedBackground() {
  return (
    <div className="app-bg" aria-hidden="true">
      <div className="app-bg__blob app-bg__blob--1" />
      <div className="app-bg__blob app-bg__blob--2" />
      <div className="app-bg__blob app-bg__blob--3" />
    </div>
  );
}
