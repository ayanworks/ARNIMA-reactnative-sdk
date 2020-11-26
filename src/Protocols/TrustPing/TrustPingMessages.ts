/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

// import uuid from 'uuidv4';
import { v4 as uuidv4 } from 'uuid';
import { MessageType } from '../../Utils/MessageType';

export function createTrustPingMessage(response_requested: boolean = true, comment: string = '') {
  return {
    '@id': uuidv4(),
    '@type': MessageType.TrustPingMessage,
    ...(comment && { comment }),
    response_requested,
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
