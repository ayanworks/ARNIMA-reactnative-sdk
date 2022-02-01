/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { Connection } from '../connection/ConnectionInterface'
import { createBasicMessage } from './BasicMessageMessages'
import { InboundMessage } from '../../utils/Types'
import { RecordType, sendOutboundMessage } from '../../utils/Helpers'
import WalletStorageService from '../../wallet/WalletStorageService'

class BasicMessageService {
  /**
   * @description Send basic message to exiting connection
   *
   * @param {string} message
   * @param {string} connectionId
   * @return {*}  {Promise<Boolean>}
   * @memberof BasicMessageService
   */
  async send(message: string, connectionId: string): Promise<Boolean> {
    try {
      const query = {
        connectionId: connectionId,
      }
      const connection: Connection = await WalletStorageService.getWalletRecordFromQuery(
        RecordType.Connection,
        JSON.stringify(query),
      )
      const basicMessage = createBasicMessage(message)
      const chatBody = {
        type: 'sent',
        message,
        time: new Date().toISOString(),
      }

      const basicMessageTags: Object = {
        connectionId: connectionId,
        lastUpdatedAt: new Date().toISOString(),
      }
      const chatThread: Array<
        Object
      > = await WalletStorageService.getWalletRecordFromQuery(
        RecordType.BasicMessage,
        JSON.stringify(query),
      )

      if (
        chatThread === undefined ||
        chatThread === null ||
        chatThread.length == 0
      ) {
        await WalletStorageService.addWalletRecord(
          RecordType.BasicMessage,
          connectionId,
          JSON.stringify([chatBody]),
          JSON.stringify(basicMessageTags),
        )
      } else {
        chatThread.push(chatBody)
        await WalletStorageService.updateWalletRecord(
          RecordType.BasicMessage,
          connectionId,
          JSON.stringify(chatThread),
          JSON.stringify(basicMessageTags),
        )
      }
      setTimeout(async () => {
        await sendOutboundMessage(connection, basicMessage)
      }, 50)
      return true
    } catch (error) {
      console.log('Basic message - Send message error = ', error)
      throw error
    }
  }

  /**
   * @description Process basic message and update the record
   *
   * @param {InboundMessage} inboundMessage
   * @param {string} connectionId
   * @return {*}  {Promise<Boolean>}
   * @memberof BasicMessageService
   */
  async save(
    inboundMessage: InboundMessage,
    connectionId: string,
  ): Promise<Connection> {
    try {
      const { message } = inboundMessage
      const chatBody = {
        type: 'receive',
        message: JSON.parse(message).content,
        time: JSON.parse(message).sent_time,
      }
      const query = {
        connectionId: connectionId,
      }
      const chatThread: Array<
        Object
      > = await WalletStorageService.getWalletRecordFromQuery(
        RecordType.BasicMessage,
        JSON.stringify(query),
      )
      const connection: Connection = await WalletStorageService.getWalletRecordFromQuery(
        RecordType.Connection,
        JSON.stringify(query),
      )
      const basicMessageTags: Object = {
        connectionId: connectionId,
        lastUpdatedAt: new Date().toISOString(),
      }

      if (chatThread.length == 0) {
        await WalletStorageService.addWalletRecord(
          RecordType.BasicMessage,
          connectionId,
          JSON.stringify([chatBody]),
          JSON.stringify(basicMessageTags),
        )
      } else {
        chatThread.push(chatBody)
        await WalletStorageService.updateWalletRecord(
          RecordType.BasicMessage,
          connectionId,
          JSON.stringify(chatThread),
          JSON.stringify(basicMessageTags),
        )
      }

      return connection
    } catch (error) {
      console.log('Basic message - Save message error = ', error)
      throw error
    }
  }
}
export default new BasicMessageService()
