import type { Macro } from '../../types/data';

/** Fictional macro file for the dev fixture. DGS10 = 4.2%. */
export const fixtureMacro: Macro = {
  dgs10: { value: 0.042, date: '2025-01-31', source: 'FRED DGS10' },
  sector_medians: {
    Manufacturing: {
      margin_mean: 0.06,
      margin_change_mean: -0.001,
      margin_change_sd: 0.02,
      revenue_growth_median: 0.015,
    },
  },
};
