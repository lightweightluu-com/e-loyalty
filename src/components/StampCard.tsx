'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { useRef } from 'react';
import { readableOn } from '@/lib/color';

export type StampCardProps = {
  shopName: string;
  logoEmoji: string;
  primaryColor: string;
  backgroundColor: string;
  rewardTitle: string;
  stampsRequired: number;
  currentStamps: number;
};

/** Die Wallet-artige Karte. Neu hinzugekommene Stempel „schlagen ein“; bereits vorhandene erscheinen ohne Animation. */
export function StampCard(p: StampCardProps) {
  const reduce = useReducedMotion();
  const mounted = useRef(p.currentStamps);
  const ink = readableOn(p.primaryColor);
  const slotInk = readableOn(p.backgroundColor);
  const cols = p.stampsRequired <= 10 ? 5 : 6;

  return (
    <div
      className="w-full overflow-hidden rounded-3xl shadow-xl ring-1 ring-black/10"
      style={{ background: p.primaryColor, color: ink }}
    >
      <div className="flex items-center gap-3 px-5 pb-3 pt-5">
        <span className="grid size-12 place-items-center rounded-2xl bg-white/20 text-3xl" aria-hidden>{p.logoEmoji}</span>
        <div className="min-w-0">
          <h2 className="truncate text-lg font-semibold leading-tight">{p.shopName}</h2>
          <p className="truncate text-sm opacity-80">{p.rewardTitle}</p>
        </div>
        <p className="ml-auto text-right text-sm font-medium tabular-nums" aria-label={`${p.currentStamps} von ${p.stampsRequired} Stempeln`}>
          {p.currentStamps}/{p.stampsRequired}
        </p>
      </div>

      <ol
        className="m-3 mt-1 grid gap-2 rounded-2xl p-3"
        style={{ background: p.backgroundColor, color: slotInk, gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: p.stampsRequired }, (_, i) => {
          const filled = i < p.currentStamps;
          const isNew = filled && i >= mounted.current;
          const isLast = i === p.stampsRequired - 1;
          return (
            <li
              key={i}
              className="relative grid aspect-square place-items-center rounded-full border-2 border-dashed text-2xl"
              style={{ borderColor: `${slotInk}40` }}
              aria-label={`Stempel ${i + 1}: ${filled ? 'gesammelt' : 'offen'}`}
            >
              {!filled && <span className="text-xs opacity-40" aria-hidden>{isLast ? '🎁' : i + 1}</span>}
              {filled && (
                <>
                  {isNew && !reduce && (
                    <motion.span
                      className="absolute inset-0 rounded-full"
                      style={{ border: `3px solid ${p.primaryColor}` }}
                      initial={{ scale: 0.8, opacity: 0.9 }}
                      animate={{ scale: 1.9, opacity: 0 }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                    />
                  )}
                  <motion.span
                    className="grid size-full place-items-center rounded-full"
                    style={{ background: p.primaryColor, color: ink }}
                    initial={isNew && !reduce ? { scale: 2.6, rotate: -25, opacity: 0 } : false}
                    animate={{ scale: 1, rotate: 0, opacity: 1 }}
                    transition={{ type: 'spring', stiffness: 420, damping: 16, mass: 0.8 }}
                  >
                    {p.logoEmoji}
                  </motion.span>
                </>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
