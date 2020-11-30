/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { NetworkServices } from "../../NetworkServices";
import { DatabaseServices } from "../../Storage";
import Pool from "../Pool";

class ConnectWithMediatorService {

  async ConnectWithMediator(url: string, apiType: string, apiBody: string, poolConfig: string): Promise<any> {
    try {

      let incomingRouterResponse: any = await NetworkServices(url, apiType, apiBody);
      let myWallet: any = DatabaseServices.getWallet();

      DatabaseServices.storeWallet({
        walletConfig: myWallet.walletConfig,
        walletCredentials: myWallet.credentialsJson,
        label: myWallet.label,
        serviceEndpoint: incomingRouterResponse.data.serviceEndpoint,
        routingKey: incomingRouterResponse.data.routingKeys[0],
        did: myWallet.did,
        verKey: myWallet.verKey,
        masterSecret: myWallet.masterSecret,
      });

      let createPoolResponse = await Pool.createPool(poolConfig)
      if (!createPoolResponse !== null) {
        Promise.reject(false);
      }

      if (createPoolResponse === null) return Promise.resolve(true);
      else return Promise.reject(false);
    }
    catch (error) {
      console.log('error = ', error);
      throw error;
    }
  }
}

export default new ConnectWithMediatorService();
