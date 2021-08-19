/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

export enum MessageType {
  ConnectionInvitation = 'https://didcomm.org/connections/1.0/invitation',
  ConnectionRequest = 'https://didcomm.org/connections/1.0/request',
  ConnectionResponse = 'https://didcomm.org/connections/1.0/response',

  TrustPingMessage = 'https://didcomm.org/trust_ping/1.0/ping',
  TrustPingResponseMessage = 'https://didcomm.org/trust_ping/1.0/ping_response',
  
  ProposeCredential = 'https://didcomm.org/issue-credential/1.0/propose-credential',
  OfferCredential = 'https://didcomm.org/issue-credential/1.0/offer-credential',
  RequestCredential = 'https://didcomm.org/issue-credential/1.0/request-credential',
  IssueCredential = 'https://didcomm.org/issue-credential/1.0/issue-credential',
  CredentialAck = 'https://didcomm.org/issue-credential/1.0/ack',
  credentialPreview = 'https://didcomm.org/issue-credential/1.0/credential-preview',

  ProposePresentation = 'https://didcomm.org/present-proof/1.0/propose-presentation',
  RequestPresentation = 'https://didcomm.org/present-proof/1.0/request-presentation',
  Presentation = 'https://didcomm.org/present-proof/1.0/presentation',
  PresentationAck = 'https://didcomm.org/present-proof/1.0/ack',
  presentationPreview = "https://didcomm.org/present-proof/1.0/presentation-preview",
  
  BasicMessage = 'https://didcomm.org/basicmessage/1.0/message',
  
  ForwardMessage = 'https://didcomm.org/routing/1.0/forward',
  
  Ack = 'https://didcomm.org/notification/1.0/ack',

  problemReport = "https://didcomm.org/notification/1.0/problem-report"
}
