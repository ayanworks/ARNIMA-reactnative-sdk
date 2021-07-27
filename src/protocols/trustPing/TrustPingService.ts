/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { Connection } from '../connection/ConnectionInterface';
import { ConnectionState } from '../connection/ConnectionState';
import { createTrustPingResponseMessage } from './TrustPingMessages';
import { InboundMessage, Message } from '../../utils/Types';
import { RecordType, sendOutboundMessage } from '../../utils/Helpers';
import { TrustPingState } from './TrustPingState';
import { WalletConfig, WalletCredentials } from '../../wallet/WalletInterface';
import WalletStorageService from '../../wallet/WalletStorageService';

class TrustPingService {

  /**
   * @description Process trust ping response message and update the status
   *
   * @param {WalletConfig} configJson
   * @param {WalletCredentials} credentialsJson
   * @param {InboundMessage} inboundMessage
   * @return {*}  {Promise<Connection>}
   * @memberof TrustPingService
   */
  async saveTrustPingResponse(configJson: WalletConfig, credentialsJson: WalletCredentials, inboundMessage: InboundMessage): Promise<Connection> {
    try {
      const { recipient_verkey } = inboundMessage;
      const query = { connectionId: recipient_verkey }
      const connection: Connection = await WalletStorageService.getWalletRecordFromQuery(configJson, credentialsJson, RecordType.Connection, JSON.stringify(query));
      const message: Message = JSON.parse(inboundMessage.message);
      const trustPingId = message['~thread'].thid;
      const trustPingTags = {
        trustPingId: trustPingId,
        status: TrustPingState.ACTIVE,
        updatedAt: new Date().toISOString(),
      }

      await WalletStorageService.updateWalletRecord(
        configJson,
        credentialsJson,
        RecordType.TrustPing,
        recipient_verkey,
        JSON.stringify(message),
        JSON.stringify(trustPingTags)
      );
      return connection;
    } catch (error) {
      console.log('TrustPing - Save trust ping response error = ', error);
      throw (error);
    }
  }

  /**
   * @description Process trust ping message
   *
   * @param {WalletConfig} configJson
   * @param {WalletCredentials} credentialsJson
   * @param {InboundMessage} inboundMessage
   * @return {*}  {Promise<Connection>}
   * @memberof TrustPingService
   */
  async processPing(configJson: WalletConfig, credentialsJson: WalletCredentials, inboundMessage: InboundMessage): Promise<Connection> {

    try {
      const { recipient_verkey, message } = inboundMessage;
      const query = { connectionId: recipient_verkey }

      const connection: Connection = await WalletStorageService.getWalletRecordFromQuery(configJson, credentialsJson, RecordType.Connection, JSON.stringify(query));

      const parseMessage: Message = JSON.parse(message);
      if (connection.state != ConnectionState.COMPLETE) {
        connection.state = ConnectionState.COMPLETE;
        connection.updatedAt = new Date().toISOString();
      }

      if (parseMessage['responseRequested']) {
        const reply = createTrustPingResponseMessage(parseMessage['@id']);

        await sendOutboundMessage(configJson, credentialsJson, connection, reply)

        await WalletStorageService.updateWalletRecord(
          configJson,
          credentialsJson,
          RecordType.Connection,
          connection.verkey,
          JSON.stringify(connection),
          '{}'
        );
      }
      return connection;
    } catch (error) {
      console.log('TrustPing - Process ping error = ', error);
      throw (error);
    }
  }

}
export default new TrustPingService();