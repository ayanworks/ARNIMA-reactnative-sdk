/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { NativeModules } from "react-native";
import { ConnectionState } from './ConnectionState';
import { DatabaseServices } from '../../Storage/index';
import { encodeInvitationToUrl, packMessage, getServiceEndpoint, verify, sign } from '../../Utils/Helpers';
import {
  createInvitationMessage,
  createConnectionRequestMessage,
  createConnectionResponseMessage
} from './ConnectionMessages';
import { DidDoc, Service, PublicKey, PublicKeyType, Authentication } from '../../Utils/DidDoc';
import { WalletConfig, WalletCredentials } from '../Wallet/WalletInterface';
import { createOutboundMessage } from '../../Utils/Helpers';
import { Message, InboundMessage } from '../../Utils/Types';
import { NetworkServices, OutboundAgentMessage } from "../../NetworkServices";
import { createTrustPingMessage } from '../TrustPing/TrustPingMessages';
import { TrustPingState } from '../TrustPing/TrustPingState';
import {Connection} from './ConnectionInterface';
class ConnectionService {

  indySdk: any;

  constructor() {
    this.indySdk = NativeModules.ArnimaSdk;
  }

  async createInvitation(configJson: WalletConfig,
    credentialsJson: WalletCredentials,
    didJson: Object): Promise<Connection> {
    let connection: Connection = await this.createConnection(configJson, credentialsJson, didJson);
    let storeDataintoDB = {
      connectionId: connection.verkey,
      connection: JSON.stringify(connection),
    }

    DatabaseServices.storeConnection(storeDataintoDB);

    const invitationDetails = this.createInvitationDetails(connection);
    const invitation = await createInvitationMessage(invitationDetails);
    connection.state = ConnectionState.INVITED;
    connection.invitation = invitation;
    let invitationEncode: any = encodeInvitationToUrl(invitation);
    return invitationEncode;
  }

  async acceptInvitation(configJson: WalletConfig,    
      credentialsJson: WalletCredentials,
      didJson: Object,
      invitation: Message): Promise<String> {
      try {
      let connection: Connection = await this.createConnection(configJson, credentialsJson, didJson, invitation.label);
      const connectionRequest = createConnectionRequestMessage(connection, DatabaseServices.getLable());
      connection.state = ConnectionState.REQUESTED;
      let outboundMessage = createOutboundMessage(connection, connectionRequest, invitation);
      const outboundPackMessage = await packMessage(configJson, credentialsJson, outboundMessage);
      await OutboundAgentMessage(invitation.serviceEndpoint, 'POST', JSON.stringify(outboundPackMessage));
      let storeDataintoDB = {
        connectionId: connection.verkey,
        connection: JSON.stringify(connection),
      }
      DatabaseServices.storeConnection(storeDataintoDB);
      return connection.did;
    } catch(error) {
      throw error;
    }
  }

  async acceptResponse(configJson: WalletConfig, credentialsJson: WalletCredentials, inboundMessage: InboundMessage) {
    let { message, recipient_verkey, sender_verkey } = inboundMessage;
    const connectionDB: any = DatabaseServices.getConnection(recipient_verkey);
    let connection: Connection = JSON.parse(connectionDB.connection);
    if (!connection) {
      throw new Error(`Connection for verkey ${recipient_verkey} not found!`);
    }
    let typeMessage: Message = JSON.parse(message);
    if (!typeMessage['connection~sig']) {
      throw new Error('Invalid message');
    }
    try {
      const receivedMessage: any = await verify(configJson, credentialsJson, typeMessage, 'connection');
      connection.theirDid = receivedMessage.connection.DID;
      connection.theirDidDoc = receivedMessage.connection.DIDDoc;
      if (!connection.theirDidDoc.service[0].recipientKeys[0]) {
        throw new Error(`Connection with verkey ${connection.verkey} has no recipient keys.`);
      }
      const trustPingMessage = createTrustPingMessage();
      connection.state = ConnectionState.COMPLETE;
      connection.updatedAt = new Date().toString();
      let storeDataintoDB = {
        connectionId: connectionDB.connectionId,
        connection: JSON.stringify(connection),
      }

      let trustPing = {
        connectionId: connectionDB.connectionId,
        trustPingId: trustPingMessage['@id'],
        trustPingMessage: JSON.stringify(trustPingMessage),
        status: TrustPingState.SENT,
        createdAt: new Date().toString(),
        updatedAt: new Date().toString(),
      }


      let outboundMessage = createOutboundMessage(connection, trustPingMessage);
      const outboundPackMessage = await packMessage(configJson, credentialsJson, outboundMessage);
      let outboundMessageResponse: any = await OutboundAgentMessage(outboundMessage.endpoint, 'POST', JSON.stringify(outboundPackMessage));
      DatabaseServices.storeConnection(storeDataintoDB);
      DatabaseServices.storeTrustPing(trustPing);
      return true;
    }
    catch (error) {
      throw error;
    }
  }

  async acceptRequest(configJson: WalletConfig, credentialsJson: WalletCredentials, inboundMessage: InboundMessage) {
    try {

      let { message, recipient_verkey, sender_verkey } = inboundMessage;
      const connectionDB: any = DatabaseServices.getConnection(recipient_verkey);
      let connection: Connection = JSON.parse(connectionDB.connection);
      if (!connection) {
        throw new Error(`Connection for verkey ${recipient_verkey} not found!`);
      }
      let typeMessage: Message = JSON.parse(message);
      if (!typeMessage.connection) {
        throw new Error('Invalid message');
      }
      const requestConnection = typeMessage.connection;
      connection.theirDid = requestConnection.DID;
      connection.theirDidDoc = requestConnection.DIDDoc;
      connection.theirLabel = typeMessage.label;
      connection.state = ConnectionState.RESPONDED;
      connection.updatedAt = new Date().toString();

      if (!connection.theirDidDoc.service[0].recipientKeys[0]) {
        throw new Error(`Connection with verkey ${connection.verkey} has no recipient keys.`);
      }

      let storeDataintoDB = {
        connectionId: connectionDB.connectionId,
        connection: JSON.stringify(connection)
      }

      const connectionResponse = createConnectionResponseMessage(connection, typeMessage['@id']);
      const signedConnectionResponse = await sign(configJson, credentialsJson, connection.verkey, connectionResponse, 'connection');

      let outboundMessage = createOutboundMessage(connection, signedConnectionResponse);
      const outboundPackMessage = await packMessage(configJson, credentialsJson, outboundMessage);
      await OutboundAgentMessage(outboundMessage.endpoint, 'POST', JSON.stringify(outboundPackMessage));
      DatabaseServices.storeConnection(storeDataintoDB);

      return true;
    } catch (error) {
      throw error;
    }
  }

  async createConnection(configJson: WalletConfig,
    credentialsJson: WalletCredentials,
    didJson: Object,
    label?: string,
    ): Promise<Connection> {
    try {
      let createPairwiseDidResponse: any = await this.indySdk.createAndStoreMyDids(JSON.stringify(configJson), JSON.stringify(credentialsJson), JSON.stringify(didJson), false);

      let apibody = {
        publicVerkey: DatabaseServices.getVerKey(),
        verkey: createPairwiseDidResponse[1]
      };
      await NetworkServices(getServiceEndpoint() + 'verkey', 'POST', JSON.stringify(apibody));
      const publicKey = new PublicKey(`${createPairwiseDidResponse[0]}#1`, PublicKeyType.ED25519_SIG_2018, createPairwiseDidResponse[0], createPairwiseDidResponse[1]);
      const service = new Service(`${createPairwiseDidResponse[0]};indy`, DatabaseServices.getServiceEndpoint(), [createPairwiseDidResponse[1]], [DatabaseServices.getRoutingKeys()], 0, 'IndyAgent');
      const auth = new Authentication(publicKey);
      const did_doc = new DidDoc(createPairwiseDidResponse[0], [auth], [publicKey], [service]);

      const connection: any = await {
        did: createPairwiseDidResponse[0],
        didDoc: did_doc,
        verkey: createPairwiseDidResponse[1],
        theirLabel: label,
        state: ConnectionState.INIT,
        created_at: new Date().toString(),
        updatedAt: new Date().toString(),
      };

      return connection;
    }
    catch (error) {
      throw error;
    }
  }

  private createInvitationDetails(connection: Connection) {
    const { didDoc } = connection;
    return {
      label: DatabaseServices.getLable(),
      recipientKeys: didDoc.service[0].recipientKeys,
      serviceEndpoint: didDoc.service[0].serviceEndpoint,
      routingKeys: didDoc.service[0].routingKeys,
    };
  }
}

export default new ConnectionService();