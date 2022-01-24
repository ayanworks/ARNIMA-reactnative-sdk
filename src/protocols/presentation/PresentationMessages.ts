/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { encodeBase64 } from '../../utils/Helpers';
import { MessageType } from '../../utils/MessageType';
import { v4 as uuidv4 } from 'uuid';

export async function presentationProposalMessage(presentationProposal: object, comment: string,) {

  return {
    '@type': MessageType.ProposePresentation,
    '@id': uuidv4(),
    comment: comment,
    'presentation_proposal': presentationProposal,
  };
}

export async function creatPresentationMessage(data: string, comment: string, threadId: string) {
  return {
    '@type': MessageType.Presentation,
    '@id': uuidv4(),
    '~thread': {
      thid: threadId,
    },
    comment: comment,
    'presentations~attach': [{
      '@id': 'libindy-presentation-0',
      'mime-type': 'application/json',
      data: {
        base64: await encodeBase64(JSON.parse(data))
      }
    },]
  };
}

export async function requestPresentationMessage(data: string, comment: string) {
  return {
    '@type': MessageType.RequestPresentation,
    '@id': uuidv4(),
    comment: comment,
    'request_presentations~attach': [
      {
        "@id": "libindy-request-presentation-0",
        "mime-type": "application/json",
        data: {
          base64: await encodeBase64(JSON.parse(data))
        }
      },
    ]
  };
}

export async function presentationAckMessage(threadId: string) {
  return {
    "@type": MessageType.PresentationAck,
    "@id": uuidv4(),
    "status": "OK",
    "~thread": {
      thid: threadId,
    },
  };
}
