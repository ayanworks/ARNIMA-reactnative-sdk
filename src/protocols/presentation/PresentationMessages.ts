/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { encodeBase64 } from '../../utils/Helpers';
import { MessageType } from '../../utils/MessageType';
import uuid from 'uuid/v4';

export async function presentationProposalMessage(presentationProposal: object, comment: string,) {

  return {
    '@type': MessageType.ProposePresentation,
    '@id': uuid(),
    comment: comment,
    'presentation_proposal': presentationProposal,
  };
}

export async function creatPresentationMessage(data: string, comment: string, threadId: string) {
  return {
    '@type': MessageType.Presentation,
    '@id': uuid(),
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
    '@id': uuid(),
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
    "@id": uuid(),
    "status": "OK",
    "~thread": {
      thid: threadId,
    },
  };
}
