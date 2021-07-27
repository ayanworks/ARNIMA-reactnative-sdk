/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { TrustPingState } from "./TrustPingState";

export interface TrustPing {
  connectionId: string;
  trustPingId: string,
  trustPingMessage: string,
  status: TrustPingState,
  createdAt: string,
  updatedAt: string,
}
