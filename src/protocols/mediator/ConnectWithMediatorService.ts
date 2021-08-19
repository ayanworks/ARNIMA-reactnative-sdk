/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { MediatorResponse } from "./MediatorInterface";
import { NetworkServices } from "../../network";
import { decodeInvitationFromUrl, RecordType } from '../../utils/Helpers'
import { WalletConfig, WalletCredentials, WalletRecord } from '../../wallet/WalletInterface';
import DatabaseServices from "../../storage";
import WalletStorageService from '../../wallet/WalletStorageService';
import ConnectionService from "../connection/ConnectionService";

class MediatorService {


  async connectWithGenericMediator(
    configJson: WalletConfig,
    credentialsJson: WalletCredentials,
    invitationUrl: string): Promise<any> {
    try {
      console.log(invitationUrl)
      const invitationJson = decodeInvitationFromUrl(invitationUrl);
      console.log(invitationJson)
      const connectionRecord = await ConnectionService.acceptInvitation(configJson, credentialsJson, {}, invitationJson, '');
      console.log('connectionRecord', connectionRecord)

    } catch (error) {
      console.log('Error ConnectWithNewMediator', error)
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
