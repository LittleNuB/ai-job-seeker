"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Loader2,
  PenLine,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react";

import type { WritingPreferenceProfileSnapshot } from "@/lib/api";


type EditablePreference = Pick<
  WritingPreferenceProfileSnapshot,
  "sentence_length" | "information_density" | "technical_detail" | "result_placement"
>;

interface WritingPreferencePanelProps {
  profile: WritingPreferenceProfileSnapshot;
  busy: boolean;
  onUpdate: (profile: EditablePreference) => Promise<boolean>;
  onSetEnabled: (enabled: boolean) => Promise<boolean>;
  onClear: () => Promise<boolean>;
}

const fieldOptions = {
  sentence_length: [
    ["concise", "短句优先"],
    ["balanced", "长短均衡"],
    ["detailed", "完整展开"],
  ],
  information_density: [
    ["focused", "单点聚焦"],
    ["balanced", "信息均衡"],
    ["dense", "高密度"],
  ],
  technical_detail: [
    ["essential", "只留必要技术"],
    ["balanced", "技术适中"],
    ["explicit", "技术细节明确"],
  ],
  result_placement: [
    ["lead", "结果前置"],
    ["balanced", "自然展开"],
    ["close", "结果收束"],
  ],
} as const;

const fieldLabels = {
  sentence_length: "句长",
  information_density: "信息密度",
  technical_detail: "技术细节",
  result_placement: "结果位置",
} as const;

function optionLabel<K extends keyof EditablePreference>(
  field: K,
  value: EditablePreference[K],
): string {
  return fieldOptions[field].find(([option]) => option === value)?.[1] ?? value;
}

function editablePreference(
  profile: WritingPreferenceProfileSnapshot,
): EditablePreference {
  return {
    sentence_length: profile.sentence_length,
    information_density: profile.information_density,
    technical_detail: profile.technical_detail,
    result_placement: profile.result_placement,
  };
}

export default function WritingPreferencePanel({
  profile,
  busy,
  onUpdate,
  onSetEnabled,
  onClear,
}: WritingPreferencePanelProps) {
  const [editing, setEditing] = useState(false);
  const [confirmingClear, setConfirmingClear] = useState(false);
  const [draft, setDraft] = useState<EditablePreference>(() =>
    editablePreference(profile),
  );

  useEffect(() => {
    setDraft(editablePreference(profile));
  }, [profile]);

  async function saveDraft() {
    if (await onUpdate(draft)) setEditing(false);
  }

  function beginEditing() {
    setDraft(editablePreference(profile));
    setConfirmingClear(false);
    setEditing(true);
  }

  function cancelEditing() {
    setDraft(editablePreference(profile));
    setConfirmingClear(false);
    setEditing(false);
  }

  async function clearProfile() {
    if (await onClear()) {
      setConfirmingClear(false);
      setEditing(false);
    }
  }

  const sourceLabel = profile.source === "learned"
    ? `从 ${profile.learned_from_saved_edits} 次明确保存中校准`
    : profile.source === "manual"
      ? "由你手动设定"
      : "版本化默认风格";

  return (
    <section className="relative overflow-hidden border border-studio-ink/15 bg-[#1b2921] text-white shadow-[4px_4px_0_#d8d0c2]">
      <div className="absolute -right-4 -top-8 font-serif text-[92px] leading-none text-white/[0.035]">W</div>
      <div className="relative p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#c8df9d]">
              <SlidersHorizontal className="h-3.5 w-3.5" /> Writing preference
            </div>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">写作校准</h2>
          </div>
          <button
            type="button"
            role="switch"
            aria-label="启用写作偏好"
            aria-checked={profile.enabled}
            disabled={busy}
            onClick={() => onSetEnabled(!profile.enabled)}
            className={`relative h-6 w-11 shrink-0 rounded-full border transition ${profile.enabled ? "border-[#c8df9d] bg-[#c8df9d]" : "border-white/25 bg-white/10"} disabled:cursor-not-allowed disabled:opacity-50`}
          >
            <span className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-[#18221c] transition-all ${profile.enabled ? "left-[22px]" : "left-0.5"}`} />
          </button>
        </div>

        <div className="mt-4 flex items-center gap-2 border-l-2 border-[#c8df9d] pl-3 text-xs text-[#d6ded8]">
          {profile.enabled ? <Check className="h-3.5 w-3.5 text-[#c8df9d]" /> : <RotateCcw className="h-3.5 w-3.5 text-[#d6b36a]" />}
          <span>{profile.enabled ? sourceLabel : "已停用：生成使用默认风格，保存也不会继续学习"}</span>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden border border-white/10 bg-white/10">
          {(Object.keys(fieldLabels) as (keyof EditablePreference)[]).map((field) => (
            <div key={field} className="bg-[#213229] px-3 py-2.5">
              <dt className="text-[10px] tracking-[0.12em] text-[#92a098]">{fieldLabels[field]}</dt>
              <dd className="mt-1 text-xs font-semibold text-[#edf2ee]">{optionLabel(field, profile[field])}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-4 flex items-start gap-2 text-[11px] leading-5 text-[#aebbb3]">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#c8df9d]" />
          只校准句长、密度、技术细节和结果位置；不会把改写内容当成履历事实，也不会放宽事实边界。
        </p>

        {!editing ? (
          <button
            type="button"
            disabled={busy}
            onClick={beginEditing}
            className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-[#dceaae] underline decoration-[#dceaae]/30 underline-offset-4 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <PenLine className="h-3.5 w-3.5" /> 调整写作偏好
          </button>
        ) : (
          <div className="mt-5 border-t border-white/15 pt-4">
            <div className="space-y-3">
              {(Object.keys(fieldLabels) as (keyof EditablePreference)[]).map((field) => (
                <label key={field} className="grid grid-cols-[72px_1fr] items-center gap-3 text-xs text-[#c7d0ca]">
                  <span>{fieldLabels[field]}</span>
                  <select
                    aria-label={`写作偏好：${fieldLabels[field]}`}
                    value={draft[field]}
                    disabled={busy}
                    onChange={(event) => setDraft((current) => ({
                      ...current,
                      [field]: event.target.value,
                    }))}
                    className="border border-white/15 bg-[#f7f3e8] px-2.5 py-2 text-xs font-semibold text-[#1d2a22] outline-none focus:border-[#c8df9d]"
                  >
                    {fieldOptions[field].map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={saveDraft}
                className="inline-flex items-center gap-1.5 bg-[#dceaae] px-3 py-2 text-xs font-semibold text-[#172219] hover:bg-[#e9f5c7] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                保存偏好
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={cancelEditing}
                className="px-3 py-2 text-xs font-semibold text-[#bac5be] hover:text-white"
              >
                取消
              </button>
            </div>

            {(profile.source !== "default" || profile.learned_from_saved_edits > 0) && (
              <div className="mt-4 border-t border-white/10 pt-3">
                {!confirmingClear ? (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setConfirmingClear(true)}
                    className="text-[11px] font-semibold text-[#d5a78f] underline decoration-[#d5a78f]/30 underline-offset-4 hover:text-[#ffd7c2]"
                  >
                    清空学习记录并恢复默认
                  </button>
                ) : (
                  <div className="space-y-2 text-[11px] leading-5 text-[#e5c9ba]">
                    <p>这会删除用于校准的保存差异；已保存主张和历史生成记录不受影响。</p>
                    <div className="flex gap-3">
                      <button type="button" disabled={busy} onClick={clearProfile} className="font-semibold text-[#ffd7c2] underline underline-offset-4">确认清空偏好</button>
                      <button type="button" disabled={busy} onClick={() => setConfirmingClear(false)} className="text-[#bac5be]">保留</button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
