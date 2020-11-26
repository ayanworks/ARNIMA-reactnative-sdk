/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

type Did = string;
type Verkey = string;

export interface InvitationDetails {
  label: string;
  recipientKeys: Verkey[];
  serviceEndpoint: string;
  routingKeys: Verkey[];
}
