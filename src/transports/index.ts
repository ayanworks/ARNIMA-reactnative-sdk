/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { Connection } from "../protocols/connection/ConnectionInterface";
import { EventInterface } from "../agent/EventInterface";
import { EventRegister } from 'react-native-event-listeners';
import { MessageType } from "../utils/MessageType";
import { Record } from "../wallet/WalletInterface";
import { RecordType, getServiceEndpoint, unpackMessage, replaceDidSovPrefixOnMessage } from "../utils/Helpers";
import BasicMessageService from "../protocols/basicMessage/BasicMessageService";
import ConnectionService from "../protocols/connection/ConnectionService";
import CredentialService from "../protocols/credential/CredentialService";
import DatabaseServices from "../storage";
import io from "socket.io-client";
import PresentationService from "../protocols/presentation/PresentationService";
import TrustPingService from "../protocols/trustPing/TrustPingService";
import WalletStorageService from "../wallet/WalletStorageService";
import MediatorService from "../protocols/mediator/MediatorService";

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
          const walletRecords = await WalletStorageService.getWalletRecordsFromQuery(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, JSON.stringify({ 'messageId': message.id + '' }));
          if (walletRecords.length === 0) {
            await WalletStorageService.addWalletRecord(
              JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials),
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
    const unprocessedMessages: Array<Record> = await WalletStorageService.getWalletRecordsFromQuery(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, JSON.stringify(query));
    if (this.isProcess === false && unprocessedMessages.length > 0) {
      await this.proceedInboundMessage();
    }
  });

  addMessages = async (message: Object) => {
    this.wallet = await DatabaseServices.getWallet()

    const ssiMessageTags = {
      messageId: Math.floor(Math.random() * 1000000000).toString(),
      autoProcessed: JSON.stringify(true),
      isProcessed: JSON.stringify(false),
    }
    await WalletStorageService.addWalletRecord(
      JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials),
      RecordType.SSIMessage,
      ssiMessageTags.messageId,
      JSON.stringify(message),
      JSON.stringify(ssiMessageTags)
    );
    EventRegister.emit('inboundMessageStatusListener', `inboundMessageStatusListener`);
  }

  proceedInboundMessage = async () => {

    try {
      const query: Object = { isProcessed: JSON.stringify(false) }
      let unprocessedMessages: Array<Record> = await WalletStorageService.getWalletRecordsFromQuery(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, JSON.stringify(query));
      if (unprocessedMessages === null) {
        unprocessedMessages = []
      }
      for (let i = 0; i < unprocessedMessages.length; i++) {
        this.isProcess = true;
        if (unprocessedMessages[i].tags.autoProcessed === 'true') {
          const messageRecord = JSON.parse(unprocessedMessages[i].value);
          const unpackMessageResponse = await unpackMessage(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), messageRecord);
          const message = JSON.parse(unpackMessageResponse.message);

          replaceDidSovPrefixOnMessage(message);
          console.log('Message Type = ', message['@type']);
          console.log('unpackMessageResponse', JSON.stringify(message, null, 2));
          const query = {
            connectionId: unpackMessageResponse.recipient_verkey
          }

          const connection = await WalletStorageService.getWalletRecordFromQuery(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.Connection, JSON.stringify(query));
          if (connection.length === 0 || connection.verkey === '') {
            console.log('Connection not found')
            await WalletStorageService.deleteWalletRecord(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, unprocessedMessages[i].id);
            this.isProcess = false;
            return;
          }

          switch (message['@type']) {
            case MessageType.ConnectionResponse: {
              const isCompleted = await ConnectionService.processRequest(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), unpackMessageResponse);
              if (isCompleted === true) await WalletStorageService.deleteWalletRecord(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, unprocessedMessages[i].id);
              break;
            }
            case MessageType.ConnectionRequest: {
              const isCompleted = await ConnectionService.createResponse(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), unpackMessageResponse);
              if (isCompleted === true) await WalletStorageService.deleteWalletRecord(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, unprocessedMessages[i].id);
              break;
            }
            case MessageType.TrustPingMessage: {
              const connection: Connection = await TrustPingService.processPing(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), unpackMessageResponse);
              if (connection !== null) { await WalletStorageService.deleteWalletRecord(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, unprocessedMessages[i].id) }
              const event: EventInterface = {
                message: `You are now connected with ${connection.theirLabel}`,
                messageData: JSON.stringify({})
              }
              EventRegister.emit('SDKEvent', event);
              console.log("Connected by scanning the QR code ...");
              break;
            }
            case MessageType.TrustPingResponseMessage: {
              const connection: Connection = await TrustPingService.saveTrustPingResponse(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), unpackMessageResponse);
              if (connection !== null) { await WalletStorageService.deleteWalletRecord(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, unprocessedMessages[i].id) }
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
                JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials),
                RecordType.SSIMessage,
                unprocessedMessages[i].id + '',
                JSON.stringify(unpackMessageResponse),
                JSON.stringify(ssiMessageTags)
              );
              const connection = await CredentialService.requestReceived(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), unpackMessageResponse, unprocessedMessages[i].id);
              const event: EventInterface = {
                message: `You have received a credential from ${connection.theirLabel}`,
                messageData: JSON.stringify({connection})
              }
              EventRegister.emit('SDKEvent', event);
              break;
            }
            case MessageType.IssueCredential: {
              const isCompleted = await CredentialService.processCredential(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), unpackMessageResponse);
              if (isCompleted) { await WalletStorageService.deleteWalletRecord(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, unprocessedMessages[i].id) }
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
                JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials),
                RecordType.SSIMessage,
                unprocessedMessages[i].id + '',
                JSON.stringify(unpackMessageResponse),
                JSON.stringify(ssiMessageTags)
              );
              const connection = await PresentationService.processRequest(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), unprocessedMessages[i].id, unpackMessageResponse);
              const event: EventInterface = {
                message: `You have received a proof request from ${connection.theirLabel}`,
                messageData: JSON.stringify({connection})
              }
              EventRegister.emit('SDKEvent', event);
              break;
            }
            case MessageType.PresentationAck: {
              await WalletStorageService.deleteWalletRecord(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, unprocessedMessages[i].id)

              const event: EventInterface = {
                message: 'Your proof is verified successfully',
                messageData: JSON.stringify({})
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
                JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials),
                RecordType.SSIMessage,
                unprocessedMessages[i].id + '',
                JSON.stringify(unpackMessageResponse),
                JSON.stringify(ssiMessageTags)
              );
              const connection = await PresentationService.requestReceived(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), unprocessedMessages[i].id, unpackMessageResponse);
              const event: EventInterface = {
                message: `You have received a proof request to verify from ${connection.theirLabel}`,
                messageData: JSON.stringify({})
              }
              EventRegister.emit('SDKEvent', event);
              break;
            }
            case MessageType.problemReport: {
              await WalletStorageService.deleteWalletRecord(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, unprocessedMessages[i].id)
              break;
            }
            case MessageType.BasicMessage: {
              const connection = await BasicMessageService.save(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), unpackMessageResponse, unpackMessageResponse.recipient_verkey);
              if (connection) { await WalletStorageService.deleteWalletRecord(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, unprocessedMessages[i].id) }


              const event: EventInterface = {
                message: `You have received a message from ${connection.theirLabel}`,
                connectionId: connection.verkey,
                messageData: JSON.stringify({})
              }
              EventRegister.emit('SDKEvent', event);
              break;
            }

            case MessageType.MediationGrant: {
              const isCompleted = await MediatorService.saveRoutingKeys(message);
              if (isCompleted) { await WalletStorageService.deleteWalletRecord(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, unprocessedMessages[i].id) }
              break;
            }

            case MessageType.Batch: {
              await message['messages~attach'].map(async (message) => {
                await this.addMessages(message.message);
              })
              await WalletStorageService.deleteWalletRecord(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, unprocessedMessages[i].id)
              break;
            }
            case MessageType.KeyListUpdateResponse: {
              await WalletStorageService.deleteWalletRecord(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, unprocessedMessages[i].id)

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