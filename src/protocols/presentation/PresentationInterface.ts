/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { PresentationState } from './PresentationState';

export interface PresentationProps {
  connectionId: string;
  theirLabel: string;
  threadId: string;
  presentationRequest: string;
  presentation: string;
  state: PresentationState;
  verified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export class Presentation {
  connectionId: string;
  theirLabel: string | undefined;
  threadId?: string;
  presentationRequest?: string;
  presentation?: string;
  state: PresentationState;
  verified?: boolean;
  createdAt?: string;
  updatedAt?: string;


  constructor(props: PresentationProps) {
    this.connectionId = props.connectionId;
    this.threadId = props.threadId;
    this.theirLabel = props.theirLabel;
    this.presentationRequest = props.presentationRequest;
    this.presentation = props.presentation;
    this.state = props.state;
    this.verified = props.verified;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
  }
}
