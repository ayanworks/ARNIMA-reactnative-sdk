/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import {
  Authentication,
  DidDoc,
  PublicKey,
  PublicKeyType,
  Service,
} from '../../utils/DidDoc';
import {InboundMessage, Message} from '../../utils/Types';
import {
  RecordType,
  encodeInvitationToUrl,
  getServiceEndpoint,
  sendOutboundMessage,
  sign,
  verify,
} from '../../utils/Helpers';
import {
  createConnectionRequestMessage,
  createConnectionResponseMessage,
  createInvitationMessage,
} from './ConnectionMessages';

import {Connection} from './ConnectionInterface';
import {ConnectionState} from './ConnectionState';
import DatabaseServices from '../../storage';
import {NativeModules} from 'react-native';
import {NetworkServices} from '../../network';
import {TrustPing} from '../trustPing/TrustPingInterface';
import {TrustPingState} from '../trustPing/TrustPingState';
import WalletStorageService from '../../wallet/WalletStorageService';
import {createTrustPingMessage} from '../trustPing/TrustPingMessages';
import {EventInterface} from 'react-native-arnima-sdk/src/agent/EventInterface';
import {EventRegister} from 'react-native-event-listeners';

const {ArnimaSdk} = NativeModules;
class ConnectionService {
  /**
   * @description Create invitation with details
   *
   * @private
   * @param {Connection} connection
   * @param {string} logo
   * @return {*}
   * @memberof ConnectionService
   */
  private createInvitationDetails(connection: Connection, logo: string) {
    const {didDoc} = connection;
    return {
      label: DatabaseServices.getLabel(),
      recipientKeys: didDoc.service[0].recipientKeys,
      serviceEndpoint: didDoc.service[0].serviceEndpoint,
      routingKeys: didDoc.service[0].routingKeys,
      alias: {
        logo,
        organizationId: '',
      },
    };
  }

  /**
   * @description Create a new connection record containing a connection invitation message
   *
   * @param {Object} didJson
   * @param {string} logo
   * @return {*}  {Promise<string>}
   * @memberof ConnectionService
   */
  async createInvitation(didJson: Object, logo: string): Promise<string> {
    const connection: Connection = await this.createConnection(didJson);

    const connectionTags: Object = {
      connectionId: connection.verkey,
    };
    await WalletStorageService.addWalletRecord(
      RecordType.Connection,
      connection.verkey,
      JSON.stringify(connection),
      JSON.stringify(connectionTags),
    );

    const invitationDetails = this.createInvitationDetails(connection, logo);
    const invitation = await createInvitationMessage(invitationDetails);
    connection.state = ConnectionState.INVITED;
    connection.invitation = invitation;
    const invitationEncode: string = encodeInvitationToUrl(invitation);
    return invitationEncode;
  }

  /**
   * @description Process a received invitation message.
   *
   * @param {Object} didJson
   * @param {Message} invitation
   * @param {string} logo
   * @return {*}  {Promise<Connection>}
   * @memberof ConnectionService
   */
  async acceptInvitation(
    didJson: Object,
    invitation: Message,
    logo: string,
  ): Promise<Connection> {
    try {
      const connection: Connection = await this.createConnection(
        didJson,
        invitation.label,
        invitation.hasOwnProperty('alias') ? invitation.alias.logoUrl : '',
        invitation.hasOwnProperty('alias')
          ? invitation.alias.organizationId
          : '',
      );
      const connectionRequest = createConnectionRequestMessage(
        connection,
        DatabaseServices.getLabel(),
        logo,
      );
      connection.state = ConnectionState.REQUESTED;

      await sendOutboundMessage(connection, connectionRequest, invitation);

      const connectionTags: Object = {
        connectionId: connection.verkey,
      };

      await WalletStorageService.addWalletRecord(
        RecordType.Connection,
        connection.verkey,
        JSON.stringify(connection),
        JSON.stringify(connectionTags),
      );
      return connection;
    } catch (error) {
      console.log(
        'Connection - Create invitation error = ',
        JSON.stringify(error),
      );
      throw error;
    }
  }

  /**
   * @description Process a received connection request message. This will not accept the connection request
   *
   * @param {InboundMessage} inboundMessage
   * @return {*}
   * @memberof ConnectionService
   */
  async processRequest(inboundMessage: InboundMessage) {
    const {message, recipient_verkey} = inboundMessage;
    const query = {
      connectionId: recipient_verkey,
    };

    const connection: Connection = await WalletStorageService.getWalletRecordFromQuery(
      RecordType.Connection,
      JSON.stringify(query),
    );

    if (!connection) {
      throw new Error(`Connection for verkey ${recipient_verkey} not found!`);
    }
    const typeMessage: Message = JSON.parse(message);
    if (!typeMessage['connection~sig']) {
      throw new Error('Invalid message');
    }
    try {
      const receivedMessage: Message = await verify(typeMessage, 'connection');
      connection.theirDid = receivedMessage.connection.DID;
      connection.theirDidDoc = receivedMessage.connection.DIDDoc;
      if (!connection.theirDidDoc.service[0].recipientKeys[0]) {
        throw new Error(
          `Connection with verkey ${connection.verkey} has no recipient keys.`,
        );
      }
      const trustPingMessage = createTrustPingMessage();
      connection.state = ConnectionState.COMPLETE;
      connection.updatedAt = new Date().toISOString();

      const trustPing: TrustPing = {
        connectionId: connection.verkey,
        trustPingId: trustPingMessage['@id'],
        trustPingMessage: JSON.stringify(trustPingMessage),
        status: TrustPingState.SENT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const trustPingTags = {
        connectionId: recipient_verkey,
        trustPingId: trustPingMessage['@id'],
        status: TrustPingState.SENT,
      };

      await sendOutboundMessage(connection, trustPingMessage);

      await WalletStorageService.updateWalletRecord(
        RecordType.Connection,
        connection.verkey,
        JSON.stringify(connection),
        '{}',
      );

      await WalletStorageService.addWalletRecord(
        RecordType.TrustPing,
        recipient_verkey,
        JSON.stringify(trustPing),
        JSON.stringify(trustPingTags),
      );
      const event: EventInterface = {
        message: `You are now connected with ${connection.theirLabel}`,
        type: 'Connection',
        messageData: JSON.stringify({connection}),
      };
      EventRegister.emit('SDKEvent', event);
      return true;
    } catch (error) {
      console.log(
        'Connection - Accept response error = ',
        JSON.stringify(error),
      );
      throw error;
    }
  }

  /**
   * @description Create a connection response message for the connection with the specified connection id.
   *
   * @param {InboundMessage} inboundMessage
   * @return {*}
   * @memberof ConnectionService
   */
  async createResponse(inboundMessage: InboundMessage) {
    try {
      const {message, recipient_verkey} = inboundMessage;
      const query = {
        connectionId: recipient_verkey,
      };
      const connection: Connection = await WalletStorageService.getWalletRecordFromQuery(
        RecordType.Connection,
        JSON.stringify(query),
      );

      if (!connection) {
        throw new Error(`Connection for verkey ${recipient_verkey} not found!`);
      }
      const typeMessage: Message = JSON.parse(message);
      if (!typeMessage.connection) {
        throw new Error('Invalid message');
      }
      const requestConnection = typeMessage.connection;
      connection.theirDid = requestConnection.DID;
      connection.theirDidDoc = requestConnection.DIDDoc;
      connection.theirLabel = typeMessage.label;
      connection.theirLogo = typeMessage.logo;
      connection.state = ConnectionState.RESPONDED;
      connection.updatedAt = new Date().toISOString();

      if (!connection.theirDidDoc.service[0].recipientKeys[0]) {
        throw new Error(
          `Connection with verkey ${connection.verkey} has no recipient keys.`,
        );
      }

      const connectionResponse = createConnectionResponseMessage(
        connection,
        typeMessage['@id'],
      );
      const signedConnectionResponse = await sign(
        connection.verkey,
        connectionResponse,
        'connection',
      );

      await sendOutboundMessage(connection, signedConnectionResponse);

      await WalletStorageService.updateWalletRecord(
        RecordType.Connection,
        connection.verkey,
        JSON.stringify(connection),
        '{}',
      );
      return true;
    } catch (error) {
      console.log(
        'Connection - Accept request error = ',
        JSON.stringify(error),
      );
      throw error;
    }
  }

  /**
   * @description Create connection and DidDoc. Also register the verkey on mediator agent
   *
   * @param {Object} didJson
   * @param {string} [label]
   * @param {string} [logo]
   * @param {string} [organizationId]
   * @return {*}  {Promise<Connection>}
   * @memberof ConnectionService
   */
  async createConnection(
    didJson: Object,
    label?: string,
    logo?: string,
    organizationId?: string,
  ): Promise<Connection> {
    try {
      const wallet: any = await DatabaseServices.getWallet();

      const [
        pairwiseDid,
        verkey,
      ]: string[] = await ArnimaSdk.createAndStoreMyDid(
        wallet.walletConfig,
        wallet.walletCredentials,
        JSON.stringify(didJson),
        false,
      );

      const apiBody = {
        publicVerkey: DatabaseServices.getVerKey(),
        verkey: verkey,
      };
      await NetworkServices(
        getServiceEndpoint() + 'verkey',
        'POST',
        JSON.stringify(apiBody),
      );
      const publicKey = new PublicKey(
        `${pairwiseDid}#1`,
        PublicKeyType.ED25519_SIG_2018,
        pairwiseDid,
        verkey,
      );
      const service = new Service(
        `${pairwiseDid};indy`,
        DatabaseServices.getServiceEndpoint(),
        [verkey],
        [DatabaseServices.getRoutingKeys()],
        0,
        'IndyAgent',
      );
      const auth = new Authentication(publicKey);
      const did_doc = new DidDoc(pairwiseDid, [auth], [publicKey], [service]);

      const connection: Connection = {
        did: pairwiseDid,
        didDoc: did_doc,
        verkey: verkey,
        theirLabel: label,
        theirLogo: logo,
        alias: {
          logo,
          organizationId,
        },
        state: ConnectionState.INIT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      return connection;
    } catch (error) {
      console.log(
        'Connection - Create connection error = ',
        JSON.stringify(error),
      );
      throw error;
    }
  }
}

export default new ConnectionService();
