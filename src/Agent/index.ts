/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { NativeModules } from "react-native";
import io from "socket.io-client";
import { EventRegister } from 'react-native-event-listeners';
import ConnectWithMediatorService from '../Protocols/ConnectWithMediator/ConnectWithMediatorService';
import ConnectionService from '../Protocols/Connection/ConnectionService';
import { decodeInvitationFromUrl, unpackMessage, RecordType } from '../Utils/Helpers';
import { getServiceEndpoint } from '../Utils/Helpers';
import { MessageType } from '../Utils/MessageType';
import TrustPingService from "../Protocols/TrustPing/TrustPingService";
import { Connection } from "../Protocols/Connection/ConnectionInterface";
import WalletService from '../Protocols/Wallet/WalletService';
import { DatabaseServices } from "../Storage";

const { ArnimaSdk }: any = NativeModules;

class Wallet {

  socket: any;
  isProcess: boolean = false;

  createWallet = async (config: Object, credentials: Object, label: String) => {
    try {
      console.log('\n\n\n\n\n ********* 1213 *********\n\n\n\n');
      let response: any = await WalletService.createWallet(config,credentials, label);
      return response;
    } catch (error) {
      console.log("createWallet = ", error);
      throw error;
    }
  } 

  connectWithMediator = async (url: string, apiType: string, apiBody: string, poolConfig: string) => {
    try {
      let response: any = await ConnectWithMediatorService.ConnectWithMediator(url, apiType, apiBody, poolConfig);
      return response;
    }
    catch (error) {
      console.log("agentRegServices = ", error);
      throw error;
    }
  }

  createInvitation = async (didJson: Object) => {
    try {
      let wallet: any = (DatabaseServices.getWallet());
      let response = await ConnectionService.createInvitation(JSON.parse(wallet.walletConfig), JSON.parse(wallet.walletCredentials), didJson);
      return response;
    }
    catch (error) {
      console.log("createInvitation = ", error);
      throw error;
    }
  }

  acceptInvitation = async (didJson: Object, message: any) => {
    try {
      let wallet: any = DatabaseServices.getWallet();
      const invitation = decodeInvitationFromUrl(message);
      let response = await ConnectionService.acceptInvitation(JSON.parse(wallet.walletConfig), JSON.parse(wallet.walletCredentials), didJson, invitation);
      return response;
    }
    catch (error) {
      console.log("acceptInvitation SDK = ", error);
      throw error;
    }
  }

  getAllConnections = async () => {
    try {
      return DatabaseServices.getAllConnections();
    }
    catch (error) {
      console.log("getAllConnections = ", error);
      throw error;
    }
  }

  deleteConnection = async (connectionId: string) => {
    try {
      let response: Boolean = await DatabaseServices.deleteConnection(connectionId);
      return response
    } catch (error) {
      console.log('deleteConnection = ', error);
      throw error;
    }
  }    

  getWallet = async () => {
    try {
      let response: Object = await DatabaseServices.getWallet();
      return response
    } catch (error) {
      console.log('deleteConnection = ', error);
      throw error;
    }
    
  }

  proceedInboundMessage = async () => {
    try {
      const unprocessedMessages = DatabaseServices.getAllUnprocessedMessages();
      const wallet: any = DatabaseServices.getWallet()
      for (let i = 0; i < unprocessedMessages.length; i++) {
        this.isProcess = true;
        if (unprocessedMessages[i].autoProcessed) {
          const messageRecord = JSON.parse(unprocessedMessages[i].message);
          let unpackMessageResponse: any = await unpackMessage(JSON.parse(wallet.walletConfig), JSON.parse(wallet.walletCredentials), messageRecord.msg);
          const message = JSON.parse(unpackMessageResponse.message);

          switch (message['@type']) {
            case MessageType.ConnectionResponse: {
              const isCompleted = await ConnectionService.acceptResponse(JSON.parse(wallet.walletConfig), JSON.parse(wallet.walletCredentials), unpackMessageResponse);
              if (isCompleted === true) await DatabaseServices.removeMessage(unprocessedMessages[i].messageId);                            
              break;
            }
            case MessageType.ConnectionRequest: {
                const isCompleted = await ConnectionService.acceptRequest(JSON.parse(wallet.walletConfig), JSON.parse(wallet.walletCredentials), unpackMessageResponse);
                if (isCompleted === true) await DatabaseServices.removeMessage(unprocessedMessages[i].messageId);              
              break;
            }
            case MessageType.TrustPingMessage: {
                const connection: Connection = await TrustPingService.processPing(JSON.parse(wallet.walletConfig), JSON.parse(wallet.walletCredentials), unpackMessageResponse);
                if (connection !== null) { await DatabaseServices.removeMessage(unprocessedMessages[i].messageId); }
                EventRegister.emit('SDKEvent', `You are now connected with ${connection.theirLabel}`);
                console.log("Connected...");
              break;
            }
            case MessageType.TrustPingResponseMessage: {
                const connection: Connection = await TrustPingService.saveTrustPingResponse(unpackMessageResponse);
                if (connection !== null) { await DatabaseServices.removeMessage(unprocessedMessages[i].messageId); }
                EventRegister.emit('SDKEvent', `You are now connected with ${connection.theirLabel}`);              
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
      console.log('error = ', error);
      this.isProcess = false;
      EventRegister.emit('inboundMessageStatusListener', `inboundMessageStatusListener`);
      throw error;
    }
  }  

  socketInit = () => {      
    if (this.socket === undefined || (this.socket !== undefined && this.socket.disconnected)) {      
      this.socket = io(getServiceEndpoint(), { reconnection: true, autoConnect: true, transports: ['websocket'] });
      this.socketListener();
      this.socketEmit();
    } else if (this.socket !== undefined) {      
      this.socketEmit();
    }
    this.socket.on('disconnect', (reason) => {
      if (reason === 'io server disconnect') {
      }
      this.socket.connect();
    });
  };

  socketEmit = () => {
    this.socket.emit("message", DatabaseServices.getVerKey());
  };

  socketListener = async () => {
    this.socket.on("message", async (msg: any) => {
      let inboxId: string = '';
      if (msg.length > 0) {
        console.log("\n\n\n\n\n Messages received from Mediator = ", msg.length)
        await msg.map((message: any) => {
          inboxId = inboxId + message.id + ","
          let messageObject = {
            messageId: message.id + '',
            message: typeof message.message == 'string' ? message.message : JSON.stringify(message.message),
            autoProcessed: true,
            isProcessed: false,
          }
          DatabaseServices.storeMessage(messageObject);
        });
        await this.emitMessageIdForAcknowledgement(msg.length, inboxId);
      }
      return msg;
    });
  };

  async emitMessageIdForAcknowledgement(msgLength: Number, inboxId: string) {
    if (msgLength > 0) {
      inboxId = inboxId.substring(0, inboxId.length - 1);
      let apiBody = {
        publicKey: DatabaseServices.getVerKey(),
        inboxId: inboxId
      };
      this.socket.emit('receiveAcknowledgement', apiBody);
      EventRegister.emit('proceedInboundMessage', `proceedInboundMessage`);
    }
  }

  inboundMessageListener = EventRegister.addEventListener('proceedInboundMessage', (data) => {
    if (this.isProcess === false) {
      this.proceedInboundMessage();
    }
  });

  inboundMessageStatusListener = EventRegister.addEventListener('inboundMessageStatusListener', (data) => {
    let messages = DatabaseServices.getAllUnprocessedMessages();
    if (this.isProcess === false && messages.length > 0) {
      this.proceedInboundMessage();
    }
  });
  
}

export default new Wallet();