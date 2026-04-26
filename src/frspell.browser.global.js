/**
 * FR-SPELL browser global entry
 */

import { FrSpell } from './module/Predictor.browser.js';

if (typeof window !== 'undefined') {
  window.FrSpell = FrSpell;
}
