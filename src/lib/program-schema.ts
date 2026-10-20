import { z } from 'zod';
import { HEX } from './color';

const oneEmoji = z.string().trim().min(1).max(16).refine(
  v => [...new Intl.Segmenter('de', { granularity: 'grapheme' }).segment(v)].length === 1,
  'Genau ein Emoji.',
);

export const programSchema = z.object({
  shopName: z.string().trim().min(1, 'Name fehlt.').max(60),
  logoEmoji: oneEmoji,
  primaryColor: z.string().regex(HEX, 'Farbe als #rrggbb.'),
  backgroundColor: z.string().regex(HEX, 'Farbe als #rrggbb.'),
  stampsRequired: z.number().int().min(2, 'Mindestens 2 Stempel.').max(30, 'Maximal 30 Stempel.'),
  rewardTitle: z.string().trim().min(1, 'Belohnung fehlt.').max(80),
});
export type ProgramInput = z.infer<typeof programSchema>;
