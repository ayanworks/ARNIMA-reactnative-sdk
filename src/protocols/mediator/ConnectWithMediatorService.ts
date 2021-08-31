/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { MediatorResponse } from "./MediatorInterface";
import { NetworkServices } from "../../network";
import { RecordType } from '../../utils/Helpers'
import { WalletRecord } from '../../wallet/WalletInterface';
import DatabaseServices from "../../storage";
import WalletStorageService from '../../wallet/WalletStorageService';

class MediatorService {

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
