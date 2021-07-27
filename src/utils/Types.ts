/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { Connection } from '../protocols/connection/ConnectionInterface';

type Did = string;
type Verkey = string;
type $FixMe = any;

export type WireMessage = $FixMe;

export interface Message {
  '@id': string;
  '@type': string;
  [key: string]: any;
}

export interface InboundMessage {
  message: Message;
  sender_verkey: Verkey;
  recipient_verkey: Verkey;
}

export interface OutboundMessage {
  connection: Connection;
  endpoint?: string;
  payload: Object;
  recipientKeys: Verkey[];
  routingKeys: Verkey[];
  senderVk: Verkey | null;
}

export interface OutboundPackage {
  connection: Connection;
  payload: WireMessage;
  endpoint?: string;
}

export interface InboundConnection {
  verkey: Verkey;
  connection: Connection;
}
