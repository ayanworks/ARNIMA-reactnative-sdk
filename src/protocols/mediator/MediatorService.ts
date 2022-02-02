/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/
import { MediatorResponse } from "react-native-arnima-sdk/src/protocols/mediator/MediatorInterface";
import { NetworkServices } from "react-native-arnima-sdk/src/network";
import { RecordType, sendOutboundMessage } from 'react-native-arnima-sdk/src/utils/Helpers'
import { WalletRecord } from 'react-native-arnima-sdk/src/wallet/WalletInterface';
import DatabaseServices from "react-native-arnima-sdk/src/storage";
import WalletStorageService from 'react-native-arnima-sdk/src/wallet/WalletStorageService';
import { createBatchPickupMessage, createKeylistUpdateMessage, createMediationRequestMessage } from "react-native-arnima-sdk/src/protocols/mediator/MediationMessages";
import { Connection } from "react-native-arnima-sdk/src/protocols/connection/ConnectionInterface";
import { NativeModules } from "react-native";
import { createTrustPingMessage } from "react-native-arnima-sdk/src/protocols/trustPing/TrustPingMessages";
import InboundService from '../../transports'
const { ArnimaSdk } = NativeModules;

class MediatorService {

  private transportSessions: Map<string, WebSocket> = new Map<string, WebSocket>()
  private webSocket: typeof WebSocket

  constructor() {
    this.webSocket = WebSocket;
  }

  async sendWebSocketMessage(endpoint: string, outboundPackMessage: string) {
    try {

      const socket = await this.resolveSocket(endpoint)

      socket.send(Buffer.from(JSON.stringify(outboundPackMessage)))

    } catch (error) {
      console.log('MediatorService - sendWebSocketMessage error = ', error);
      throw error;
    }
  }

  private async resolveSocket(endpoint: string) {
    // If we already have a socket connection use it
    let socket = this.transportSessions.get(endpoint)

    if (!socket) {
      if (!endpoint) {
        throw new Error(`Missing endpoint. I don't know how and where to send the message.`)
      }
      socket = await this.createSocketConnection(endpoint)
      this.transportSessions.set(endpoint, socket)
      this.listenOnWebSocketMessages(socket)
    }

    if (socket.readyState !== this.webSocket.OPEN) {
      throw new Error('Socket is not open.')
    }

    return socket
  }

  private handleMessageEvent = async (event: any) => {
    console.log('WebSocket message event received.', { url: event.target.url, data: event.data })
    const wireMessage = JSON.parse(Buffer.from(event.data).toString('utf-8'))
    if (wireMessage) {
      console.log(`Response received`, wireMessage)
      try {
        if (wireMessage.hasOwnProperty('tag')) {
          await InboundService.addMessages(wireMessage)
        }
      } catch (error) {
        console.log('Unable to parse response message', error)
      }
    }
  }

  private listenOnWebSocketMessages(socket: WebSocket) {
    socket.addEventListener('message', this.handleMessageEvent)
  }

  private createSocketConnection(endpoint: string): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      console.log(`Connecting to WebSocket ${endpoint}`)
      const socket = new this.webSocket(endpoint)

      socket.onopen = () => {
        console.log(`Successfully connected to WebSocket ${endpoint}`)
        resolve(socket)
      }

      socket.onerror = (error) => {
        console.log(`Error while connecting to WebSocket ${endpoint}`, {
          error,
        })
        reject(error)
      }

      socket.onclose = async (event) => {
        console.log(`WebSocket closing of endpoint ${endpoint}`, { event })
        socket.removeEventListener('message', this.handleMessageEvent)
        this.transportSessions.delete(endpoint)
      }
    })
  }

  async sendImplicitMessages(mediatorConnection: Connection) {
    try {
      const myWallet: any = DatabaseServices.getWallet();

      const trustPingMessage = await createTrustPingMessage(false);

      await sendOutboundMessage(
        JSON.parse(myWallet.walletConfig),
        JSON.parse(myWallet.walletConfig),
        mediatorConnection,
        trustPingMessage
      );
    } catch (err) {
      console.log('sendImplicitMessage Error: ', err);
      throw err;
    }
  }

  async mediationRequest(connection: Connection) {
    const myWallet: any = DatabaseServices.getWallet();
    const message = await createMediationRequestMessage();

    const connectionTags: Object = {
      connectionId: connection.verkey,
    }
    await WalletStorageService.addWalletRecord(
      myWallet.walletConfig,
      myWallet.walletConfig,
      RecordType.MediatorAgent,
      connection.verkey,
      JSON.stringify(connection),
      JSON.stringify(connectionTags)
    );
    await sendOutboundMessage(
      JSON.parse(myWallet.walletConfig),
      JSON.parse(myWallet.walletConfig),
      connection,
      message
    );
    return true
  }

  async saveRoutingKeys(message) {
    const myWallet: any = DatabaseServices.getWallet();

    DatabaseServices.storeWallet({
      walletConfig: myWallet.walletConfig,
      walletCredentials: myWallet.credentialsJson,
      label: myWallet.label,
      serviceEndpoint: message.endpoint,
      routingKey: message.routing_keys[0],
      publicDid: myWallet.publicDid,
      verKey: myWallet.verKey,
      masterSecretId: myWallet.masterSecretId,
    });
    return true
  }

  async pickupMessages(mediatorConnection: Connection) {
    const myWallet: any = DatabaseServices.getWallet();
    const batchPickupMessage = await createBatchPickupMessage();
    await sendOutboundMessage(
      JSON.parse(myWallet.walletConfig),
      JSON.parse(myWallet.walletCredentials),
      mediatorConnection,
      batchPickupMessage,
    );
    return true
  }

  async getRouting() {
    try {
      const myWallet: any = DatabaseServices.getWallet();
      const endpoint = myWallet.serviceEndpoint !== "" ? myWallet.serviceEndpoint : ''

      const routingKeys: string[] = myWallet.routingKey !== '' ? [myWallet.routingKey] : []
      const [pairwiseDid, verkey]: string[] = await ArnimaSdk.createAndStoreMyDid(
        myWallet.walletConfig,
        myWallet.walletCredentials,
        JSON.stringify({}),
        false
      );
      await this.keylistUpdate(verkey);
      return { endpoint, routingKeys, pairwiseDid, verkey };
    } catch (error) {
      console.log('MediatorService - getRouting error = ', error);
      throw error;
    }
  }

  async keylistUpdate(verkey: string) {
    try {
      const myWallet: any = DatabaseServices.getWallet();
      const keylistUpdateMessage = await createKeylistUpdateMessage(verkey);
      const [mediatorConnection] = await WalletStorageService.getWalletRecordsFromQuery(
        JSON.parse(myWallet.walletConfig),
        JSON.parse(myWallet.walletCredentials),
        RecordType.MediatorAgent,
        JSON.stringify({})
      );
      if (mediatorConnection) {
        await sendOutboundMessage(
          JSON.parse(myWallet.walletConfig),
          JSON.parse(myWallet.walletCredentials),
          JSON.parse(mediatorConnection.value),
          keylistUpdateMessage,
        )
      }
    } catch (error) {
      console.log('MediatorService - keylistUpdate error = ', error);
      throw error;
    }
  }

  /**
   * Connect the mediator agent and store the mediator record 
   *
   * @param {string} url
   * @param {string} apiType
   * @param {string} apiBody
   * @return {*}  {Promise<boolean>}
   * @memberof MediatorService
   */
  async ConnectWithMediator(url: string, apiType: string, apiBody: string): Promise<boolean> {
    try {

      const { data: { routingKeys, serviceEndpoint } }: MediatorResponse = await NetworkServices(url, apiType, apiBody);
      // TODO : Need to find a way for realm db typing
      const myWallet: any = DatabaseServices.getWallet();

      DatabaseServices.storeWallet({
        walletConfig: myWallet.walletConfig,
        walletCredentials: myWallet.credentialsJson,
        label: myWallet.label,
        serviceEndpoint: serviceEndpoint,
        routingKey: routingKeys[0],
        publicDid: myWallet.publicDid,
        verKey: myWallet.verKey,
        masterSecretId: myWallet.masterSecretId,
      });

      const walletRecord: WalletRecord = {
        walletConfig: myWallet.walletConfig,
        walletCredentials: myWallet.credentialsJson,
        label: myWallet.label,
        serviceEndpoint: serviceEndpoint,
        routingKey: routingKeys[0],
        publicDid: myWallet.publicDid,
        verKey: myWallet.verKey,
        masterSecretId: myWallet.masterSecretId,
      }

      await WalletStorageService.updateWalletRecord(
        myWallet.walletConfig,
        myWallet.walletConfig,
        RecordType.MediatorAgent,
        '1',
        JSON.stringify(walletRecord),
        '{}'
      );

      return Promise.resolve(true);
    }
    catch (error) {
      console.log('MediatorService - Connect with mediator error = ', error);
      throw error;
    }
  }

  /**
   * Update public did and verkey on mediator 
   *
   * @param {string} url
   * @param {string} apiType
   * @param {string} apiBody
   * @return {*}  {Promise<boolean>}
   * @memberof MediatorService
   */
  async updateMediator(url: string, apiType: string, apiBody: string): Promise<boolean> {
    try {
      await NetworkServices(url, apiType, apiBody);
      return Promise.resolve(true);
    }
    catch (error) {
      console.log('MediatorService - Update mediator error = ', error);
      return Promise.reject(error);
    }
  }

}

export default new MediatorService();
