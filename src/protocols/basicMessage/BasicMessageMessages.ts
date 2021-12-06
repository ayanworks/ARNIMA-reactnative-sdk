/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { MessageType } from '../../utils/MessageType';
import { v4 as uuidv4 } from 'uuid';

export function createBasicMessage(content: string) {
  return {
    '@id': uuidv4(),
    '@type': MessageType.BasicMessage,
    '~l10n': { locale: 'en' },
    sent_time: new Date().toISOString(),
    content,
  };
}