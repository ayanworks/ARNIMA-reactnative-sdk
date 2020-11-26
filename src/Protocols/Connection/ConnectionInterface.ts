/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { ConnectionState } from './ConnectionState';
import { DidDoc } from '../../Utils/DidDoc';
import { InvitationDetails } from './InvitationInterface';

type Did = string;
type Verkey = string;

export interface ConnectionProps {
  did: Did;
  didDoc: DidDoc;
  verkey: Verkey;
  createdAt?: string;
  theirDid?: Did;
  theirLabel?: string;
  theirDidDoc?: DidDoc;
  invitation?: InvitationDetails;
  state: ConnectionState;
  endpoint?: string;
  updatedAt?: string;
}

export class Connection {
  did: Did;
  didDoc: DidDoc;
  verkey: Verkey;
  createdAt?: string;
  theirLabel?: string;
  theirDid?: Did;
  theirDidDoc?: DidDoc;
  invitation?: InvitationDetails;
  endpoint?: string;
  state: ConnectionState;
  updatedAt?: string

  get theirKey() {
    if (!this.theirDidDoc) {
      return null;
    }
    return this.theirDidDoc.service[0].recipientKeys[0];
  }

  constructor(props: ConnectionProps) {
    this.did = props.did;
    this.didDoc = props.didDoc;
    this.verkey = props.verkey;
    this.createdAt = props.createdAt;
    this.theirLabel = props.theirLabel;
    this.theirDid = props.theirDid;
    this.theirDidDoc = props.theirDidDoc;
    this.invitation = props.invitation;
    this.state = props.state;
    this.updatedAt = props.updatedAt;
  }
}
