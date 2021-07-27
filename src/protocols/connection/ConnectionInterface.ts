/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { ConnectionState } from './ConnectionState';
import { DidDoc } from '../../utils/DidDoc';
import { InvitationDetails } from './InvitationInterface';

type Did = string;
type Verkey = string;

interface Alias {
  logo?: string,
  organizationId?: string,
}

export interface ConnectionProps {
  did: Did;
  didDoc: DidDoc;
  verkey: Verkey;
  createdAt?: string;
  theirDid?: Did;
  theirLabel?: string;
  theirLogo?: string;
  theirDidDoc?: DidDoc;
  invitation?: InvitationDetails;
  state: ConnectionState;
  endpoint?: string;
  updatedAt?: string;
  alias?: Alias
}

export class Connection {
  did: Did;
  didDoc: DidDoc;
  verkey: Verkey;
  createdAt?: string;
  theirLabel?: string;
  theirLogo?: string;
  theirDid?: Did;
  theirDidDoc?: DidDoc;
  invitation?: InvitationDetails;
  endpoint?: string;
  state: ConnectionState;
  updatedAt?: string;
  alias?: Alias

  constructor(props: ConnectionProps) {
    this.did = props.did;
    this.didDoc = props.didDoc;
    this.verkey = props.verkey;
    this.createdAt = props.createdAt;
    this.theirLabel = props.theirLabel;
    this.theirLogo = props.theirLogo;
    this.theirDid = props.theirDid;
    this.theirDidDoc = props.theirDidDoc;
    this.invitation = props.invitation;
    this.state = props.state;
    this.updatedAt = props.updatedAt;
    this.alias = props.alias;
  }
}
