/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { MessageType } from "../../utils/MessageType";
import uuid from 'uuid/v4';

export async function createMediationRequestMessage() {
  return {
    '@type': MessageType.MediationRequest,
    '@id': uuid(),
    sent_time: new Date().toISOString(),
    '~l10n': {
      locale: 'en',
    }
  };
}

export async function createBatchPickupMessage(batchSize: number = 10) {
  return {
    '@type': MessageType.BatchPickup,
    '@id': uuid(),
    batch_size: batchSize,
  };
}

export async function createKeylistUpdateMessage(verkey: string) {
  return {
    '@type': MessageType.KeyListUpdate,
    '@id': uuid(),
    updates: [{
      "recipient_key": verkey,
      action: "add"
    }]
  };
}