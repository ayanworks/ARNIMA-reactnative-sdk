/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { NativeModules } from "react-native";

const { ArnimaSdk }: any = NativeModules;

class Pool {

  createPool = async( poolConfig: string) => {
    let response: any = await ArnimaSdk.createPoolLedgerConfig(
      poolConfig
    );
    return response;
  };


}

export default new Pool();