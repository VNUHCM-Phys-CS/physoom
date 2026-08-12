// Canonical bộ môn / đơn vị of Khoa Vật lý - Vật lý Kỹ thuật.
// `code` matches the abbreviations used in the faculty staff spreadsheet;
// `name` is the full name shown in the summary sheet. Import maps code → name.
export const DEPARTMENTS = [
  { code: "VLLT", name: "Vật lý lý thuyết" },
  { code: "VLHN", name: "Vật lý Hạt nhân" },
  { code: "VLCR", name: "Vật lý Chất rắn" },
  { code: "VLTH", name: "Vật lý Tin học" },
  { code: "VLĐT", name: "Vật lý Điện tử" },
  { code: "VLĐC", name: "Vật lý Địa cầu" },
  { code: "VLUD", name: "Vật lý Ứng dụng" },
  { code: "HD-KT-TV", name: "Hải Dương - Khí tượng Thủy văn" },
  { code: "VPK", name: "Văn phòng khoa" },
  { code: "KTHN", name: "Phòng TN Kỹ thuật Hạt nhân" },
  { code: "TTST", name: "Trung tâm Sáng tạo" },
];

// Map any spreadsheet department token (code OR full name, case/space-insensitive)
// to its canonical full name. Unknown tokens are returned trimmed as-is so custom
// units aren't lost.
const _norm = (s) => String(s ?? "").trim().toLowerCase().replace(/\s+/g, " ");
const _lookup = new Map();
DEPARTMENTS.forEach((d) => {
  _lookup.set(_norm(d.code), d.name);
  _lookup.set(_norm(d.name), d.name);
});
// A few known aliases seen in the sheets.
[
  ["HDKTTV", "Hải Dương - Khí tượng Thủy văn"],
  ["Hải Dương KT - TV", "Hải Dương - Khí tượng Thủy văn"],
  ["Vật lý Ứng Dụng", "Vật lý Ứng dụng"],
  ["Phòng TN KTHN", "Phòng TN Kỹ thuật Hạt nhân"],
  ["TT Sáng tạo", "Trung tâm Sáng tạo"],
].forEach(([k, v]) => _lookup.set(_norm(k), v));

export function normalizeDepartment(token) {
  const t = String(token ?? "").trim();
  if (!t) return "";
  return _lookup.get(_norm(t)) || t;
}
