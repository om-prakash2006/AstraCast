/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * SIH Problem Statement SIH26072 — Nowcasting Engine Interface
 */

import { NowcastInputFeatures, NowcastResult } from '../../types/nowcast';

export interface NowcastingEngine {
  engineName: string;
  isPrototype: boolean;
  computeNowcast(input: NowcastInputFeatures): Promise<NowcastResult>;
}
