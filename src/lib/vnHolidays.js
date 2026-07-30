// Vietnamese national public holidays.
//
// Fixed solar-date holidays are certain every year and generated below.
// Lunar-based holidays (Tết, Giỗ tổ Hùng Vương) fall on solar dates that shift
// each year and are officially announced by the government, so they're kept in
// a per-year table. Update/extend this table as new years are announced.

const FIXED = [
  { title: "Tết Dương lịch", md: "01-01" },
  { title: "Giải phóng miền Nam 30/4", md: "04-30" },
  { title: "Quốc tế Lao động 1/5", md: "05-01" },
  { title: "Quốc khánh 2/9", md: "09-02" },
];

// [start, end] solar dates (inclusive) for lunar-based holidays.
const LUNAR = {
  2025: { tet: ["2025-01-25", "2025-02-02"], hung: ["2025-04-07", "2025-04-07"] },
  2026: { tet: ["2026-02-14", "2026-02-22"], hung: ["2026-04-26", "2026-04-26"] },
  2027: { tet: ["2027-02-04", "2027-02-12"], hung: ["2027-04-16", "2027-04-16"] },
  2028: { tet: ["2028-01-25", "2028-01-31"], hung: ["2028-04-04", "2028-04-04"] },
};

/**
 * Returns the Vietnamese national public holidays for a year as
 * { title, type:'holiday', start:'YYYY-MM-DD', end:'YYYY-MM-DD' }.
 */
export function getVnNationalHolidays(year) {
  const list = FIXED.map((f) => ({
    title: f.title,
    type: "holiday",
    start: `${year}-${f.md}`,
    end: `${year}-${f.md}`,
  }));

  const lu = LUNAR[year];
  if (lu) {
    list.push({ title: "Tết Nguyên đán", type: "holiday", start: lu.tet[0], end: lu.tet[1] });
    list.push({ title: "Giỗ tổ Hùng Vương", type: "holiday", start: lu.hung[0], end: lu.hung[1] });
  }
  return list;
}

// Whether lunar (Tết / Hùng Vương) dates are known for this year.
export const hasLunarDates = (year) => !!LUNAR[year];
