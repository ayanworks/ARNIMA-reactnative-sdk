/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/
import Realm from 'realm';

const agentDB = new Realm({
  schemaVersion: 1,
  path: 'ARNIMARealm.realm',
  schema: [
    {
      name: 'wallet',
      primaryKey: 'publicDid',
      properties: {
        walletConfig: 'string',
        walletCredentials: 'string',
        label: 'string',
        publicDid: 'string',
        serviceEndpoint: 'string',
        routingKey: 'string',
        verKey: 'string',
        masterSecretId: 'string',
      },
    }]
});

const DBServices = {
  storeWallet(data) {
    agentDB.write(() => {
      agentDB.create(
        'wallet',
        data,
        true,
      );
    });
  },

  getWallet() {
    const query = agentDB.objects('wallet');
    const wallet = Array.from(query)[0];
    return wallet;
  },

  getServiceEndpoint() {
    const query = agentDB.objects('wallet');
    const wallet: any = Array.from(query)[0];
    return wallet.serviceEndpoint
  },

  getLabel() {
    const query = agentDB.objects('wallet');
    const wallet: any = Array.from(query)[0];
    return wallet.label
  },

  getMasterSecretId() {
    const query = agentDB.objects('wallet');
    const wallet: any = Array.from(query)[0];
    return wallet.masterSecretId
  },

  getRoutingKeys() {
    const query = agentDB.objects('wallet');
    const wallet: any = Array.from(query)[0];
    return wallet.routingKey
  },

  getVerKey() {
    const query = agentDB.objects('wallet');
    const wallet: any = Array.from(query)[0];
    return wallet.verKey
    
  },
};

export default DBServices;