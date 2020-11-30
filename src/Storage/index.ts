/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import Realm from 'realm';

const AgentDatabase = new Realm({
    schemaVersion: 1,
    path: 'ARNIMARealm.realm',
    schema: [
        {
            name: 'wallet',
            primaryKey: 'did',
            properties: {
                walletConfig: 'string',
                walletCredentials: 'string',
                label: 'string',                
                did: 'string',
                verKey: 'string',
                serviceEndpoint: 'string',
                routingKey: 'string',                
                masterSecret: 'string',                
            },
        },
        {
            name: 'connections',
            primaryKey: 'connectionId',
            properties: {
                connectionId: 'string',
                connection: 'string'
            },
        },
        {
            name: 'trustPing',
            primaryKey: 'trustPingId',
            properties: {
                connectionId: 'string',
                trustPingId: 'string',
                trustPingMessage: 'string',
                status: 'string'
            },
        },
        {
            name: 'messages',
            primaryKey: 'messageId',
            properties: {
                messageId: 'string',
                message: 'string',
                thId: {type: 'string', default: '0'},
                autoProcessed: 'bool',                
                isProcessed: 'bool'
            },
        },        
    ],
    migration: (oldRealm, newRealm) => {
        // only apply this change if upgrading to schemaVersion 1
    },
});

const DatabaseServices = {
    storeWallet(data) {
        AgentDatabase.write(() => {
            AgentDatabase.create('wallet', data, true);
        });
    },

    storeConnection(data) {
        AgentDatabase.write(() => {
            AgentDatabase.create('connections', data, true);
        });
    },

    storeTrustPing(data) {
        AgentDatabase.write(() => {
            AgentDatabase.create('trustPing', data, true);
        });
    },

    storeMessage(data) {
        AgentDatabase.write(() => {
            AgentDatabase.create('messages', data, true);
        });
    },


    getWallet() {
        const query = AgentDatabase.objects('wallet');
        const wallet = Array.from(query)[0];
        return wallet;
    },

    getServiceEndpoint() {
        const query = AgentDatabase.objects('wallet');
        const wallet: any = Array.from(query)[0];
        const serviceEndpoint = wallet.serviceEndpoint
        return serviceEndpoint;
    },

    getLable() {
        const query = AgentDatabase.objects('wallet');
        const wallet: any = Array.from(query)[0];
        const label = wallet.label
        return label;
    },

    getMasterSecretId() {
        const query = AgentDatabase.objects('wallet');
        const wallet: any = Array.from(query)[0];
        const masterSecret = wallet.masterSecret
        return masterSecret;
    },

    getRoutingKeys() {
        const query = AgentDatabase.objects('wallet');
        const wallet: any = Array.from(query)[0];
        const routingKey = wallet.routingKey
        return routingKey;
    },

    getVerKey() {
        const query = AgentDatabase.objects('wallet');
        const wallet: any = Array.from(query)[0];
        const verKey = wallet.verKey
        return verKey;
    },

    getConnection(connectionId) {
        const query = AgentDatabase.objects('connections').filtered(`connectionId="${(connectionId)}"`);
        const connectionRecord = Array.from(query)[0];
        return connectionRecord;
    },

    getAllConnections() {
        const query = AgentDatabase.objects('connections');
        const connections: any = Array.from(query);
        return connections;
    },

    getAllTrustPing() {
        const query = AgentDatabase.objects('trustPing');
        const connections: any = Array.from(query);
        return connections;
    },

    removeMessage(id) {
        AgentDatabase.write(() => {
            const query = AgentDatabase.objects('messages').filtered(`messageId=${JSON.stringify(id)}`);
            AgentDatabase.delete(query);
        });
    },

    deleteConnection(id) {            
        AgentDatabase.write(() => {
            const query = AgentDatabase.objects('connections').filtered(`connectionId=${JSON.stringify(id)}`);
            AgentDatabase.delete(query);
        });        
        return true;        
    },

    getAllUnprocessedMessages() {
        const query = AgentDatabase.objects('messages').filtered(`isProcessed=${false}`);
        const message: any = Array.from(query);
        return message;
    },

};

export {
    DatabaseServices,
};