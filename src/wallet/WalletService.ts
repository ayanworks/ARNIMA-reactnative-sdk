/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { DidJson, WalletConfig, WalletCredentials, WalletRecord } from "./WalletInterface";
import { NativeModules } from "react-native";
import { RecordType } from "../utils/Helpers";
import DatabaseServices from '../storage';
import WalletStorageService from "./WalletStorageService";

const { ArnimaSdk } = NativeModules;

class WalletService {

  async createWallet(config: WalletConfig, credentials: WalletCredentials, label: string): Promise<string[]> {
    try {
      await ArnimaSdk.createWallet(
        JSON.stringify(config),
        JSON.stringify(credentials)
      );
      return await this.createWalletDidStore(config, credentials, { }, true, label);
    } catch (error) {
      console.log('WalletService - Create wallet error = ', error);
      throw (error);
    }
  }

  async createWalletDidStore(
    config: WalletConfig,
    credentials: WalletCredentials,
    didJson: DidJson,
    createMasterSecret: boolean,
    label: string
  ): Promise<string[]> {

    const response: string[] = await ArnimaSdk.createAndStoreMyDid(
      JSON.stringify(config),
      JSON.stringify(credentials),
      JSON.stringify(didJson),
      createMasterSecret
    );

    if (response.length > 0) {
      const [did, verkey, masterSecretId] = response

      DatabaseServices.storeWallet({
        walletConfig: JSON.stringify(config),
        walletCredentials: JSON.stringify(credentials),
        label: label,
        serviceEndpoint: "",
        routingKey: "",
        publicDid: did,
        verKey: verkey,
        masterSecretId: masterSecretId,
      });

      const walletRecord: WalletRecord = {
        walletConfig: config,
        walletCredentials: credentials,
        label: label,
        serviceEndpoint: "",
        routingKey: "",
        publicDid: did,
        verKey: verkey,
        masterSecretId: masterSecretId,
      }

      const walletRecordTags: Object = {
        walletName: label,
        publicDid: did,
        verKey: verkey,
      }

      await WalletStorageService.addWalletRecord(
        RecordType.MediatorAgent,
        '1',
        JSON.stringify(walletRecord),
        JSON.stringify(walletRecordTags)
      );
    }
    return response;
  }

  async getWallet(): Promise<any> {
    try {
      // TODO : Need to find a way for realm db typing
      const response: any = await DatabaseServices.getWallet();
      return response
    } catch (error) {
      console.log('WalletService - Get wallet error = ', error);
      throw error;
    }

  }

  async openWallet(): Promise<boolean> {
    try {
      // TODO : Need to find a way for realm db typing
      const sdkDB: any = DatabaseServices.getWallet();
      const response: boolean = await ArnimaSdk.openInitWallet(
        sdkDB.walletConfig,
        sdkDB.walletCredentials
      );
      return response;
    } catch (error) {
      console.log('WalletService - Open wallet error = ', error);
      throw error;
    }
  };

}
export default new WalletService();