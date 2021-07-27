/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { encodeBase64 } from '../../utils/Helpers';
import { MessageType } from '../../utils/MessageType';
import uuid from 'uuid/v4';

export async function createRequestCredentialMessage(data: string, comment: string, threadId: string) {
  return {
    '@type': MessageType.RequestCredential,
    '@id': uuid(),
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
    '@id': uuid(),
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
    '@id': uuid(),
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


