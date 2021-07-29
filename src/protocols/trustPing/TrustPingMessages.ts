/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { MessageType } from '../../utils/MessageType';
import { v4 as uuidv4 } from 'uuid';

export function createTrustPingMessage(responseRequested: boolean = true, comment: string = '') {
  return {
    '@id': uuidv4(),
    '@type': MessageType.TrustPingMessage,
    ...(comment && { comment }),
    responseRequested,
  };
}

export function createTrustPingResponseMessage(threadId: string, comment: string = '') {
  return {
    '@id': uuidv4(),
    '@type': MessageType.TrustPingResponseMessage,
    '~thread': {
      thid: threadId,
    },
    ...(comment && { comment }),
  };
}
