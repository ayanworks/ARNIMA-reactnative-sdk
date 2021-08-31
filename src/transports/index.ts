/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { Connection } from "../protocols/connection/ConnectionInterface";
import { EventInterface } from "../agent/EventInterface";
import { EventRegister } from 'react-native-event-listeners';
import { MessageType } from "../utils/MessageType";
import { Record } from "../wallet/WalletInterface";
import { RecordType, getServiceEndpoint, unpackMessage } from "../utils/Helpers";
import BasicMessageService from "../protocols/basicMessage/BasicMessageService";
import ConnectionService from "../protocols/connection/ConnectionService";
import CredentialService from "../protocols/credential/CredentialService";
import DatabaseServices from "../storage";
import io from "socket.io-client";
import PresentationService from "../protocols/presentation/PresentationService";
import TrustPingService from "../protocols/trustPing/TrustPingService";
import WalletStorageService from "../wallet/WalletStorageService";

class InboundMessageHandler {

  isProcess: boolean = false;
  socket: any
  wallet: any = DatabaseServices.getWallet();

  initializeSocket = async () => {
    // TODO :Refactor the get wallet condition
    this.wallet = await DatabaseServices.getWallet()
    if (this.socket === undefined || (this.socket !== undefined && this.socket.disconnected)) {
      this.socket = io(getServiceEndpoint(), {
        reconnection: true, reconnectionDelay: 500,
        jsonp: false,
        reconnectionAttempts: Infinity,
        autoConnect: true,
        transports: ['websocket']
      });
      this.socketMessageListener();
      this.socketEmitMessage();
    } else if (this.socket !== undefined) {
      this.socketEmitMessage();
    }
    this.socket.on('disconnect', (reason) => {
      console.log("reason-----", reason);
      if (reason === 'io server disconnect') {
      }
      this.socket.connect();
    });
  };

  socketEmitMessage = () => {
    this.socket.emit("message", DatabaseServices.getVerKey());
  };

  socketMessageListener = async () => {
    this.socket.on("message", async (msg) => {
      let inboxId: string = '';
      if (msg.length > 0) {
        for await (let message of msg) {
          inboxId = inboxId + message.id + ","

          const ssiMessageTags = {
            messageId: message.id + '',
            autoProcessed: JSON.stringify(true),
            isProcessed: JSON.stringify(false),
            message: typeof message.message == 'string' ? message.message : JSON.stringify(message.message)
          }
          const walletRecords = await WalletStorageService.getWalletRecordsFromQuery(RecordType.SSIMessage, JSON.stringify({ 'messageId': message.id + '' }));
          if (walletRecords.length === 0) {
            await WalletStorageService.addWalletRecord(
              RecordType.SSIMessage,
              message.id + '',
              typeof message.message == 'string' ? message.message : JSON.stringify(message.message),
              JSON.stringify(ssiMessageTags)
            );
          }
        }
        await this.sendAcknowledgementWithMessageId(msg.length, inboxId);
      }
      return msg;
    });
  };

  async sendAcknowledgementWithMessageId(msgLength: Number, inboxId: string) {
    if (msgLength > 0) {
      inboxId = inboxId.substring(0, inboxId.length - 1);
      const apiBody = {
        publicKey: DatabaseServices.getVerKey(),
        inboxId: inboxId
      };
      this.socket.emit('receiveAcknowledgement', apiBody);
      EventRegister.emit('inboundMessageStatusListener', `inboundMessageStatusListener`);
    }
  }

  inboundMessageStatusListener = EventRegister.addEventListener('inboundMessageStatusListener', async () => {
    const query: Object = { isProcessed: JSON.stringify(false) }
    const unprocessedMessages: Array<Record> = await WalletStorageService.getWalletRecordsFromQuery(RecordType.SSIMessage, JSON.stringify(query));
    if (this.isProcess === false && unprocessedMessages.length > 0) {
      await this.proceedInboundMessage();
    }
  });

  proceedInboundMessage = async () => {

    try {
      const query: Object = { isProcessed: JSON.stringify(false) }
      let unprocessedMessages: Array<Record> = await WalletStorageService.getWalletRecordsFromQuery(RecordType.SSIMessage, JSON.stringify(query));
      if (unprocessedMessages === null) {
        unprocessedMessages = []
      }
      for (let i = 0; i < unprocessedMessages.length; i++) {
        this.isProcess = true;
        if (unprocessedMessages[i].tags.autoProcessed === 'true') {
          const messageRecord = JSON.parse(unprocessedMessages[i].value);
          const unpackMessageResponse = await unpackMessage(messageRecord.msg);
          const message = JSON.parse(unpackMessageResponse.message);

          const query = {
            connectionId: unpackMessageResponse.recipient_verkey
          }

          const connection = await WalletStorageService.getWalletRecordFromQuery(RecordType.Connection, JSON.stringify(query));
          console.log('connection', typeof connection)
          if (connection.length === 0 || connection.verkey === '') {
            console.log('Connection not found')
            await WalletStorageService.deleteWalletRecord(RecordType.SSIMessage, unprocessedMessages[i].id);
            this.isProcess = false;
            return;
          }

          switch (message['@type']) {
            case MessageType.ConnectionResponse: {
              const isCompleted = await ConnectionService.processRequest(unpackMessageResponse);
              if (isCompleted === true) await WalletStorageService.deleteWalletRecord(RecordType.SSIMessage, unprocessedMessages[i].id);
              break;
            }
            case MessageType.ConnectionRequest: {
              const isCompleted = await ConnectionService.createResponse(unpackMessageResponse);
              if (isCompleted === true) await WalletStorageService.deleteWalletRecord(RecordType.SSIMessage, unprocessedMessages[i].id);
              break;
            }
            case MessageType.TrustPingMessage: {
              const connection: Connection = await TrustPingService.processPing(unpackMessageResponse);
              if (connection !== null) { await WalletStorageService.deleteWalletRecord(RecordType.SSIMessage, unprocessedMessages[i].id) }
              const event: EventInterface = {
                message: `You are now connected with ${connection.theirLabel}`,
                messageData: JSON.stringify({ })
              }
              EventRegister.emit('SDKEvent', event);
              console.log("Connected by scanning the QR code ...");
              break;
            }
            case MessageType.TrustPingResponseMessage: {
              const connection: Connection = await TrustPingService.saveTrustPingResponse(unpackMessageResponse);
              if (connection !== null) { await WalletStorageService.deleteWalletRecord(RecordType.SSIMessage, unprocessedMessages[i].id) }
              break;
            }
            case MessageType.OfferCredential: {
              let { message } = unpackMessageResponse;
              message = JSON.parse(message);
              unpackMessageResponse['message'] = message;
              const ssiMessageTags = {
                messageId: unprocessedMessages[i].id + '',
                autoProcessed: JSON.stringify(false),
                thId: message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
                isProcessed: JSON.stringify(true),
              }
              await WalletStorageService.updateWalletRecord(

                RecordType.SSIMessage,
                unprocessedMessages[i].id + '',
                JSON.stringify(unpackMessageResponse),
                JSON.stringify(ssiMessageTags)
              );
              const connection = await CredentialService.requestReceived(unpackMessageResponse, unprocessedMessages[i].id);
              const event: EventInterface = {
                message: `You have received a credential from ${connection.theirLabel}`,
                theirLabel: connection.theirLabel,
                messageData: JSON.stringify({ })
              }
              EventRegister.emit('SDKEvent', event);
              break;
            }
            case MessageType.IssueCredential: {
              const isCompleted = await CredentialService.processCredential(unpackMessageResponse);
              if (isCompleted) { await WalletStorageService.deleteWalletRecord(RecordType.SSIMessage, unprocessedMessages[i].id) }
              break;
            }
            case MessageType.RequestPresentation: {
              let { message } = unpackMessageResponse;
              message = JSON.parse(message);
              unpackMessageResponse['message'] = message;
              const ssiMessageTags = {
                messageId: unprocessedMessages[i].id + '',
                autoProcessed: JSON.stringify(false),
                thId: message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
                isProcessed: JSON.stringify(true),
              }
              await WalletStorageService.updateWalletRecord(

                RecordType.SSIMessage,
                unprocessedMessages[i].id + '',
                JSON.stringify(unpackMessageResponse),
                JSON.stringify(ssiMessageTags)
              );
              const connection = await PresentationService.processRequest(unprocessedMessages[i].id, unpackMessageResponse);
              const event: EventInterface = {
                message: `You have received a proof request from ${connection.theirLabel}`,
                theirLabel: connection.theirLabel,
                messageData: JSON.stringify({ })
              }
              EventRegister.emit('SDKEvent', event);
              break;
            }
            case MessageType.PresentationAck: {
              await WalletStorageService.deleteWalletRecord(RecordType.SSIMessage, unprocessedMessages[i].id)

              const event: EventInterface = {
                message: 'Your proof is verified successfully',
                messageData: JSON.stringify({ })
              }
              EventRegister.emit('SDKEvent', event);
              break;
            }
            case MessageType.Presentation: {
              let { message } = unpackMessageResponse;
              message = JSON.parse(message);
              unpackMessageResponse['message'] = message;
              const ssiMessageTags = {
                messageId: unprocessedMessages[i].id + '',
                autoProcessed: JSON.stringify(false),
                thId: message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
                isProcessed: JSON.stringify(true),
              }
              await WalletStorageService.updateWalletRecord(

                RecordType.SSIMessage,
                unprocessedMessages[i].id + '',
                JSON.stringify(unpackMessageResponse),
                JSON.stringify(ssiMessageTags)
              );
              const connection = await PresentationService.requestReceived(unprocessedMessages[i].id, unpackMessageResponse);
              const event: EventInterface = {
                message: `You have received a proof request to verify from ${connection.theirLabel}`,
                messageData: JSON.stringify({ })
              }
              EventRegister.emit('SDKEvent', event);
              break;
            }
            case MessageType.problemReport: {
              await WalletStorageService.deleteWalletRecord(RecordType.SSIMessage, unprocessedMessages[i].id)
              break;
            }
            case MessageType.BasicMessage: {
              const connection = await BasicMessageService.save(unpackMessageResponse, unpackMessageResponse.recipient_verkey);
              if (connection) { await WalletStorageService.deleteWalletRecord(RecordType.SSIMessage, unprocessedMessages[i].id) }


              const event: EventInterface = {
                message: `You have received a message from ${connection.theirLabel}`,
                connectionId: connection.verkey,
                messageData: JSON.stringify({ })
              }
              EventRegister.emit('SDKEvent', event);
              break;
            }
            default: {
              break;
            }
          }
        }
      }
      this.isProcess = false;
      EventRegister.emit('inboundMessageStatusListener', `inboundMessageStatusListener`);
      return true;
    }
    catch (error) {
      console.warn('Agent - Proceed inbound message error = ', error)
      this.isProcess = false;
      EventRegister.emit('inboundMessageStatusListener', `inboundMessageStatusListener`);
      throw error;
    }
  }

}

export default new InboundMessageHandler();