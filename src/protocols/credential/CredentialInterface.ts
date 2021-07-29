/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { CredentialState } from './CredentialState';

export interface CredentialProps {
  connectionId: string;
  threadId: string;
  theirLabel: string;
  credentialDefinitionId: string;
  revocRegId: string;
  schemaId: string;
  credentialOffer: string;
  credDefJson: string;
  revocRegDefJson: string;
  credentialRequest: string;
  credentialRequestMetadata: string;
  credentialId: string;
  rawCredential: string;
  credential: string;
  state: CredentialState;
  createdAt?: string;
  updatedAt?: string;
}


export class Credential {
  connectionId: string;
  threadId?: string;
  theirLabel?: string;
  credentialDefinitionId: string;
  revocRegId?: string;
  schemaId?: string;
  credentialOffer?: string;
  credDefJson?: string;
  revocRegDefJson?: string;
  credentialRequest?: string;
  credentialRequestMetadata?: string;
  credentialId?: string;
  rawCredential?: string;
  credential?: string;
  state: CredentialState;
  createdAt?: string;
  updatedAt?: string;


  constructor(props: CredentialProps) {
    this.connectionId = props.connectionId;
    this.threadId = props.threadId;
    this.theirLabel = props.theirLabel;
    this.credentialDefinitionId = props.credentialDefinitionId;
    this.revocRegId = props.revocRegId;
    this.schemaId = props.schemaId;
    this.credentialOffer = props.credentialOffer;
    this.credDefJson = props.credDefJson;
    this.revocRegDefJson = props.revocRegDefJson;
    this.credentialRequest = props.credentialRequest;
    this.credentialRequestMetadata = props.credentialRequestMetadata;
    this.credentialId = props.credentialId;
    this.rawCredential = props.rawCredential;
    this.credential = props.credential;
    this.state = props.state;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
