/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/


import { NativeModules } from "react-native";
import { Connection } from '../Connection/ConnectionInterface';
import { DatabaseServices } from '../../Storage';
const { ArnimaSdk }: any = NativeModules;

class WalletService {    

    async createWallet(config: Object, credentials: Object, label: String): Promise<any> {
        try {
            let createWalletResponse: any = await ArnimaSdk.createWallet(
                JSON.stringify(config),
                JSON.stringify(credentials)
              );
              let createDidAndVerKeyResponse: any = await this.createWalletDidStore(config, credentials, {}, true, label);
              return createDidAndVerKeyResponse;
            
        } catch (error) {
            throw (error);
        }
    }

    async createWalletDidStore(config: any,
        credentials: any,
        didJson: Object,
        createMasterSecret: Boolean,
        label: String): Promise<Connection                                                                                                                                                                                                                  > {

            let createAndStoreMyDidResponse: any = await ArnimaSdk.createAndStoreMyDids(
                JSON.stringify(config),
                JSON.stringify(credentials),
                JSON.stringify(didJson),
                createMasterSecret
              );
              if (createAndStoreMyDidResponse.length > 0)
                DatabaseServices.storeWallet({
                  walletConfig: JSON.stringify(config),
                  walletCredentials: JSON.stringify(credentials),
                  label: label,
                  serviceEndpoint: "",
                  routingKey: "",
                  did: createAndStoreMyDidResponse[0],
                  verKey: createAndStoreMyDidResponse[1],
                  masterSecret: createAndStoreMyDidResponse[2],
                });
              return createAndStoreMyDidResponse;

    }

}
export default new WalletService();