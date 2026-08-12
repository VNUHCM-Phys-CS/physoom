// Class grouping rules.
//
// A class code looks like "25VLH_DKD1". Its practical sub-sections (thực hành /
// nhóm nhỏ) are written either as their own underscore segment ("25VLH_DKD1_A",
// "25VLH_DKD1_B") or glued to the group ("25VLH_DKD1A"). Those sub-sections
// belong to the SAME class and should be shown together.
//
// Crucially, different bases are DIFFERENT classes and must never be merged:
//   25VLH            ≠  25VLH_DKD1  ≠  25VLH_DKD2
// Only a single trailing sub-section letter (A/B/C…) is stripped — never a
// whole segment like "DKD1".

export function escapeRegex(s) {
  return String(s ?? "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// The "group base": the class id with a single trailing sub-section letter
// removed, whether it is separated by an underscore ("_A") or glued after a
// digit ("1A"). Everything else is left untouched.
export function classGroupBase(id) {
  return String(id ?? "")
    .trim()
    .replace(/_[A-Za-z]$/, "")       // "25VLH_DKD1_A" → "25VLH_DKD1"
    .replace(/(\d)[A-Za-z]$/, "$1"); // "25VLH_DKD1A"  → "25VLH_DKD1"
}

// A Mongo regex condition matching the whole group of a class id: its base plus
// any single sub-section suffix (an optional "_" then one letter).
export function classGroupRegex(id) {
  return { $regex: `^${escapeRegex(classGroupBase(id))}(_?[A-Za-z])?$`, $options: "i" };
}

// True when two class ids belong to the same group (same base).
export function sameClassGroup(a, b) {
  return classGroupBase(a).toLowerCase() === classGroupBase(b).toLowerCase();
}
