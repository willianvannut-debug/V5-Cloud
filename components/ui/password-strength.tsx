//app/components/ui/password-strength.tsx

"use client";
import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";

const CELL = { type: "spring", stiffness: 520, damping: 34, mass: 0.45, } as const;
const CROSSFADE = { type: "spring", stiffness: 260, damping: 34, mass: 0.8, } as const;
const INSTANT = { duration: 0 } as const;
const SYMBOL = /[!-/:-@[-`{-~]/;

export type PasswordRule = { id: string; label: string; test: (value: string) => boolean; };
export type EvaluatedRule = PasswordRule & { met: boolean };
export type PasswordStrengthState = { score: number; max: number; label: string; rules: EvaluatedRule[]; guessable: boolean; announcement: string; };

export const defaultPasswordRules: readonly PasswordRule[] = [
  { id: "length", label: "Pelo menos 12 caracteres", test: (v) => v.length >= 12 },
  { id: "case", label: "Maiúsculas e minúsculas", test: (v) => /[a-z]/.test(v) && /[A-Z]/.test(v), },
  { id: "digit", label: "Pelo menos um número", test: (v) => /\d/.test(v) },
  { id: "symbol", label: "Pelo menos um símbolo", test: (v) => SYMBOL.test(v) },
];

const defaultLabels = ["Vazia", "Fraca", "Razoável", "Boa", "Forte"] as const;

export function usePasswordStrength(value: string, { rules = defaultPasswordRules, labels = defaultLabels }: { rules?: readonly PasswordRule[]; labels?: readonly string[] } = {}): PasswordStrengthState {
  const state = useMemo(() => {
    const evaluated = rules.map((rule) => ({ ...rule, met: rule.test(value) }));
    const passed = evaluated.reduce((n, r) => n + (r.met ? 1 : 0), 0);
    const score = value.length === 0 ? 0 : Math.min(rules.length, Math.max(1, passed));
    const label = labels[Math.min(score, labels.length - 1)] ?? "";
    const announcement = value.length === 0 ? "" : passed === rules.length ? "Todos os requisitos cumpridos." : `Força da senha ${label.toLowerCase()}.`;

    return { score, max: rules.length, label, rules: evaluated, guessable: false, announcement };
  }, [value, rules, labels]);

  return state;
}

const TONES = { none: { bar: "bg-stone-300", text: "text-stone-500" }, danger: { bar: "bg-red-500", text: "text-red-400" }, caution: { bar: "bg-amber-500", text: "text-amber-400" }, safe: { bar: "bg-emerald-500", text: "text-emerald-400" }, } as const;

function toneFor(score: number, max: number) {
  if (score === 0) return TONES.none;
  const ratio = score / max;
  if (ratio <= 0.34) return TONES.danger;
  if (ratio <= 0.67) return TONES.caution;
  return TONES.safe;
}

export function PasswordStrengthMeter({ value, className = "", onStrengthChange }: { value: string; className?: string; onStrengthChange?: (isStrong: boolean) => void; }) {
  const { score, max, label, rules: evaluated } = usePasswordStrength(value);
  const reduced = useReducedMotion();
  const tone = toneFor(score, max);

  useEffect(() => {
    // Comunica ao formulário se a senha é forte o suficiente para prosseguir
    onStrengthChange?.(score === max);
  }, [score, max, onStrengthChange]);

  return (
    <div className={`w-full ${className}`}>
      <div role="meter" aria-label="Força da senha" aria-valuemin={0} aria-valuemax={max} aria-valuenow={score} aria-valuetext={label} className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${max}, minmax(0, 1fr))` }} >
        {Array.from({ length: max }, (_, i) => (
          <div key={i} className="relative h-1.5 overflow-hidden rounded-[2px] bg-white/[0.12]" >
            <motion.span className={`absolute inset-0 origin-left rounded-[2px] transition-colors duration-200 ${tone.bar}`} initial={false} animate={{ scaleX: i < score ? 1 : 0 }} transition={ reduced ? INSTANT : { ...CELL, delay: i < score ? i * 0.03 : 0 } } />
          </div>
        ))}
      </div>
      <div className="mt-2 flex h-5 items-center justify-between gap-3">
        <span className="inline-grid text-[12.5px] font-medium leading-5">
          {defaultLabels.map((text, i) => (
            <motion.span key={text} aria-hidden className={`col-start-1 row-start-1 whitespace-nowrap transition-colors duration-200 ${tone.text}`} initial={false} animate={{ opacity: i === Math.min(score, defaultLabels.length - 1) ? 1 : 0, }} transition={reduced ? INSTANT : CROSSFADE} >
              {text}
            </motion.span>
          ))}
        </span>
      </div>
      <ul className="mt-3 grid gap-1.5">
        {evaluated.map((rule) => (
          <li key={rule.id} className="flex items-center gap-2">
            <span className="relative grid size-[14px] shrink-0 place-items-center rounded-[4px] border text-white border-white/[0.16]">
              <motion.span className="absolute inset-0 rounded-[3px] bg-emerald-500" initial={false} animate={{ opacity: rule.met ? 1 : 0 }} transition={reduced ? INSTANT : CROSSFADE} />
              <motion.svg viewBox="0 0 12 12" fill="none" aria-hidden className="relative size-[9px]" initial={false} animate={{ opacity: rule.met ? 1 : 0, scale: rule.met ? 1 : 0.6, }} transition={reduced ? INSTANT : CELL} >
                <path d="M2 6.2 4.7 8.9 10 3.3" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" />
              </motion.svg>
            </span>
            <span className={`text-[12.5px] leading-5 transition-colors duration-200 ${ rule.met ? "text-stone-200" : "text-stone-400" }`} >
              {rule.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default PasswordStrengthMeter;