/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { MessageType } from '../../utils/MessageType';
import uuid from 'uuid/v4';

export function createBasicMessage(content: string) {
  return {
    '@id': uuid(),
    '@type': MessageType.BasicMessage,
    '~l10n': { locale: 'en' },
    sent_time: new Date().toISOString(),
    content,
  };
}