/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/
// import { uuid } from 'uuidv4';
import { Connection } from './ConnectionInterface';
import { InvitationDetails } from './InvitationInterface';
import { MessageType } from '../../utils/MessageType';
import { v4 as uuidv4 } from 'uuid';

type Did = string;
type Verkey = string;


export async function createInvitationMessage({
  label,
  serviceEndpoint,
  recipientKeys,
  routingKeys,
}: InvitationDetails) {
  return {
    '@type': MessageType.ConnectionInvitation,
    '@id': uuidv4(),
    label,
    recipientKeys,
    serviceEndpoint,
    routingKeys,
  };
}

export function createConnectionRequestMessage(connection: Connection, label: string, logo: string) {
  return {
    '@type': MessageType.ConnectionRequest,
    '@id': uuidv4(),
    label: label,
    logo: logo,
    connection: {
      DID: connection.did,
      DIDDoc: connection.didDoc,
    },
  };
}

export function createConnectionResponseMessage(connection: Connection, thid: string) {
  return {
    '@type': MessageType.ConnectionResponse,
    '@id': uuidv4(),
    '~thread': {
      thid,
    },
    connection: {
      DID: connection.did,
      DIDDoc: connection.didDoc,
    },
  };
}

export function createAckMessage(threadId: string) {
  return {
    '@type': MessageType.Ack,
    '@id': uuidv4(),
    status: 'OK',
    '~thread': {
      thid: threadId,
    },
  };
}

export function createForwardMessage(to: Verkey, msg: any) {
  const forwardMessage = {
    '@type': MessageType.ForwardMessage,
    to,
    msg,
  };
  return forwardMessage;
}
