"use client";
import React, { useMemo, useState } from "react";
import useSWR from "swr";
import { fetcher } from "@/lib/ulti";
import {
  Button, Input, Chip, Spinner, Tooltip,
  Table, TableHeader, TableBody, TableColumn, TableRow, TableCell,
} from "@heroui/react";
import { RotateCcwIcon, SaveIcon, LayersIcon, SearchIcon } from "lucide-react";
import { toast } from "react-toastify";
import { useI18n } from "@/i18n/I18nProvider";

export default function ClassGroupAdminPage() {
  const { t } = useI18n();
  const { data: groups, mutate, isLoading } = useSWR("/api/class-group", fetcher);
  const [drafts, setDrafts] = useState({}); // classId -> typed group
  const [busy, setBusy] = useState(null);
  const [q, setQ] = useState("");

  const setDraft = (classId, v) => setDrafts((d) => ({ ...d, [classId]: v }));

  const save = async (classId, group) => {
    const g = (group ?? "").trim();
    if (!g) return;
    setBusy(classId);
    try {
      const res = await fetch("/api/class-group", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, group: g }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("cg.saved"));
      setDrafts((d) => { const n = { ...d }; delete n[classId]; return n; });
      mutate();
    } catch { toast.error(t("cg.saveFailed")); }
    finally { setBusy(null); }
  };

  const reset = async (classId) => {
    setBusy(classId);
    try {
      const res = await fetch("/api/class-group", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId }),
      });
      if (!res.ok) throw new Error();
      toast.success(t("cg.reset"));
      setDrafts((d) => { const n = { ...d }; delete n[classId]; return n; });
      mutate();
    } catch { toast.error(t("cg.saveFailed")); }
    finally { setBusy(null); }
  };

  // Flat rows for the table, filtered by search.
  const rows = useMemo(() => {
    const out = [];
    (groups ?? []).forEach((g) => {
      g.members.forEach((m) => out.push({ ...m, group: g.group }));
    });
    const needle = q.trim().toLowerCase();
    return needle ? out.filter((r) => r.classId.toLowerCase().includes(needle) || r.group.toLowerCase().includes(needle)) : out;
  }, [groups, q]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2"><LayersIcon size={20} /> {t("cg.title")}</h2>
        <p className="text-sm text-default-400 max-w-3xl">{t("cg.subtitle")}</p>
      </div>

      {/* Group overview cards */}
      {isLoading ? (
        <div className="flex justify-center py-10"><Spinner /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {(groups ?? []).map((g) => (
              <div key={g.group} className="bg-content1 border border-default-200 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-semibold">{g.group}</span>
                  <span className="text-xs text-default-400">{g.courseCount} {t("cg.courses")} · {g.teacherCount} GV</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.members.map((m) => (
                    <Chip key={m.classId} size="sm" variant="flat"
                      color={m.overridden ? "warning" : m.classId === g.group ? "secondary" : "default"}>
                      {m.classId}{m.overridden ? " ✎" : ""}
                    </Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Per-class override table */}
          <div className="bg-content1 border border-default-200 rounded-xl p-3 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h3 className="text-sm font-semibold">{t("cg.overrideTitle")}</h3>
              <Input size="sm" className="max-w-[240px]" value={q} onValueChange={setQ}
                startContent={<SearchIcon size={14} />} placeholder={t("common.typeToSearch")} isClearable />
            </div>
            <Table aria-label="class group overrides" removeWrapper>
              <TableHeader>
                <TableColumn>{t("cg.colClass")}</TableColumn>
                <TableColumn>{t("cg.colGroup")}</TableColumn>
                <TableColumn>{t("cg.courses")}</TableColumn>
                <TableColumn>{t("cg.colAction")}</TableColumn>
              </TableHeader>
              <TableBody emptyContent={t("cg.empty")}>
                {rows.map((r) => {
                  const draft = drafts[r.classId] ?? r.group;
                  const changed = draft.trim() !== r.group;
                  return (
                    <TableRow key={r.classId}>
                      <TableCell className="font-medium">{r.classId}</TableCell>
                      <TableCell>
                        <Chip size="sm" variant="flat" color={r.overridden ? "warning" : "default"}>
                          {r.group}{r.overridden ? ` · ${t("cg.overridden")}` : ""}
                        </Chip>
                        {r.overridden && r.ruleBase !== r.group && (
                          <span className="text-[11px] text-default-400 ml-1.5">({t("cg.rule")}: {r.ruleBase})</span>
                        )}
                      </TableCell>
                      <TableCell className="tabular-nums">{r.courseCount}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <Input size="sm" className="max-w-[200px]" value={draft}
                            onValueChange={(v) => setDraft(r.classId, v)}
                            aria-label={`group for ${r.classId}`} />
                          <Tooltip content={t("cg.save")}>
                            <Button isIconOnly size="sm" color="primary" variant="flat"
                              isDisabled={!changed} isLoading={busy === r.classId}
                              onPress={() => save(r.classId, draft)}><SaveIcon size={15} /></Button>
                          </Tooltip>
                          {r.overridden && (
                            <Tooltip content={t("cg.resetToRule")}>
                              <Button isIconOnly size="sm" variant="light"
                                isLoading={busy === r.classId} onPress={() => reset(r.classId)}>
                                <RotateCcwIcon size={15} />
                              </Button>
                            </Tooltip>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
