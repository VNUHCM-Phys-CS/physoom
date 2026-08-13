// Admin class-scope helpers.
//
// A user is one of:
//   • super admin  → isSuperAdmin === true            → manages everything
//   • scoped admin → isAdmin && adminScope.length > 0 → only classes matching a
//                    scope pattern (substring, case-insensitive, "-" == "_")
//   • plain admin  → isAdmin && adminScope empty       → treated as super for
//                    back-compat ONLY until backfilled; prefer isSuperAdmin.

const norm = (s) => String(s || "").toLowerCase().replace(/-/g, "_").trim();

export function isSuperAdmin(user) {
  // Strictly the flag. Existing admins must be backfilled to isSuperAdmin:true
  // (a one-time DB update) so they keep full access.
  return !!user?.isSuperAdmin;
}

/** Does a single class code fall under the scope patterns? */
export function classInScope(scope, classId) {
  const c = norm(classId);
  return (scope || []).some((p) => p && c.includes(norm(p)));
}

/** Can this user manage a course given its class_id list? */
export function canManageClasses(user, classIds) {
  if (isSuperAdmin(user)) return true;
  if (!user?.isAdmin) return false;
  const list = Array.isArray(classIds) ? classIds : classIds ? [classIds] : [];
  return list.some((c) => classInScope(user.adminScope, c));
}

/** Mongo filter that restricts courses to a scoped admin's classes.
 *  Returns {} for super admins (no restriction). */
export function courseScopeFilter(user) {
  if (isSuperAdmin(user)) return {};
  const scope = user?.adminScope || [];
  if (!scope.length) return { _id: null }; // scoped admin with no patterns → nothing
  // class_id is an array of strings; match if any element contains any pattern.
  // Case/'-'-insensitivity can't be expressed cheaply in a plain regex over the
  // raw values, so match both "-" and "_" variants of each pattern.
  const rx = scope.flatMap((p) => {
    const base = String(p).trim();
    if (!base) return [];
    const esc = base.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return [new RegExp(esc.replace(/[-_]/g, "[-_]"), "i")];
  });
  return rx.length ? { class_id: { $in: rx } } : { _id: null };
}

/** Split class codes into {inScope, outScope} for a user (super → all inScope). */
export function splitClassesByScope(user, classIds) {
  const list = [...new Set((Array.isArray(classIds) ? classIds : [classIds]).filter(Boolean))];
  if (isSuperAdmin(user)) return { inScope: list, outScope: [] };
  const inScope = [], outScope = [];
  list.forEach((c) => (classInScope(user?.adminScope, c) ? inScope : outScope).push(c));
  return { inScope, outScope };
}
