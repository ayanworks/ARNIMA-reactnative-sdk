/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { encodeBase64 } from '../../utils/Helpers';
import { MessageType } from '../../utils/MessageType';
import { v4 as uuidv4 } from 'uuid';

export async function createRequestCredentialMessage(data: string, comment: string, threadId: string) {
  return {
    '@type': MessageType.RequestCredential,
    '@id': uuidv4(),
    '~thread': {
      thid: threadId,
    },
    comment: comment,
    'requests~attach': [{
      '@id': 'libindy-cred-request-0',
      'mime-type': 'application/json',
      data: {
        base64: await encodeBase64(JSON.parse(data))
      }
    },]
  };
}


export async function storedCredentialAckMessage(threadId: string) {
  return {
    '@type': MessageType.CredentialAck,
    '@id': uuidv4(),
    "status": "OK",
    '~thread': {
      thid: threadId,
    }
  };
}


export async function credentialProposalMessage(credentialProposal: object,
  schemaId: string,
  credDefId: string,
  issuerDid: string,
  comment: string
) {

  const schema = schemaId.split(':');
  return {
    '@type': MessageType.ProposeCredential,
    '@id': uuidv4(),
    'comment': comment,
    'credential_proposal': credentialProposal,
    'schema_issuer_did': schema[0],
    'schema_id': schemaId,
    'schema_name': schema[2],
    'schema_version': schema[3],
    'cred_def_id': credDefId,
    'issuer_did': issuerDid,
  };
}

export async function credentialPreviewMessage(attributes: any) {
  return {
    '@type': MessageType.credentialPreview,
    'attributes': attributes
  };
}


