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

// A Mongo regex matching a group key plus any single sub-section suffix (an
// optional "_" then one letter): e.g. group "25VLH_DKD1" matches _DKD1, _DKD1A,
// _DKD1_A, _DKD1B…
export function groupKeyRegex(group) {
  return { $regex: `^${escapeRegex(group)}(_?[A-Za-z])?$`, $options: "i" };
}

// The whole naming-rule group of a class id (its base + sub-sections).
export function classGroupRegex(id) {
  return groupKeyRegex(classGroupBase(id));
}

// True when two class ids belong to the same group (same base).
export function sameClassGroup(a, b) {
  return classGroupBase(a).toLowerCase() === classGroupBase(b).toLowerCase();
}

// The effective group key of a class id, honouring manual overrides first.
// overrides: [{ classId, group }].
export function effectiveGroup(id, overrides = []) {
  const hit = overrides.find((o) => String(o.classId) === String(id));
  return hit ? hit.group : classGroupBase(id);
}

// Build the Mongo query (for Course.find) selecting every class in the group(s)
// of the given class id(s), honouring manual overrides.
//  - isApproximate false → only the exact class id(s).
//  - overrides force-merge (a class assigned into a selected group) and
//    force-split (a class assigned to a different group is excluded even if the
//    naming rule would otherwise pull it in).
// With no overrides and one id this is just { class_id: <base regex> } — i.e.
// identical to the previous behaviour.
export function classGroupQuery({ classIds, isApproximate = true, overrides = [] }) {
  const ids = (Array.isArray(classIds) ? classIds : [classIds]).filter((x) => x != null);
  if (!isApproximate) return { class_id: { $in: ids } };

  // Membership is by effectiveGroup: a class belongs to group G iff its override
  // says G, or (no override) its naming base is G. So we match the selected
  // group keys by rule, minus any overridden classes assigned elsewhere, plus
  // the overridden classes explicitly assigned into a selected group.
  const selected = [...new Set(ids.map((id) => effectiveGroup(id, overrides)))];
  const selectedSet = new Set(selected);
  const addIds = overrides.filter((o) => selectedSet.has(o.group)).map((o) => o.classId);
  const removeIds = overrides.filter((o) => !selectedSet.has(o.group)).map((o) => o.classId);

  const or = selected.map((g) => ({ class_id: groupKeyRegex(g) }));
  if (addIds.length) or.push({ class_id: { $in: addIds } });
  const match = or.length === 1 ? or[0] : { $or: or };

  return removeIds.length ? { $and: [match, { class_id: { $nin: removeIds } }] } : match;
}
