/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/
import { OutboundAgentMessage } from '../../NetworkServices';
import { Connection } from '../Connection/ConnectionInterface';
import { createOutboundMessage } from '../../Utils/Helpers';
import { DatabaseServices } from '../../Storage';
import { packMessage } from '../../Utils/Helpers';
import { InboundMessage, Message } from '../../Utils/Types';
import { createTrustPingMessage, createTrustPingResponseMessage } from './TrustPingMessages';
import { WalletConfig, WalletCredentials } from '../Wallet/WalletInterface';
import { TrustPingState } from './TrustPingState';
import { ConnectionState } from '../Connection/ConnectionState';

class TrustPingService {    

    async saveTrustPingResponse(inboundMessage: InboundMessage): Promise<Connection> {
        try {

            const { recipient_verkey } = inboundMessage;
            const connectionDB: any = DatabaseServices.getConnection(recipient_verkey);
            let connection: Connection = JSON.parse(connectionDB.connection);

            let message: Message = JSON.parse(inboundMessage.message);
            const trustPingId = message['~thread'].thid;

            let trustPing = {
                trustPingId: trustPingId,
                status: TrustPingState.ACTIVE,
                updatedAt: new Date().toString(),
            }

            DatabaseServices.storeTrustPing(trustPing);

            return connection;
        } catch (error) {
            throw (error);
        }
    }

    async processPing(configJson: WalletConfig, credentialsJson: WalletCredentials, inboundMessage: InboundMessage): Promise<Connection> {

        const { recipient_verkey, message } = inboundMessage;
        const connectionDB: any = DatabaseServices.getConnection(recipient_verkey);
        let connection: Connection = JSON.parse(connectionDB.connection);

        let pasredMessage: Message = JSON.parse(message);

        if (connection.state != ConnectionState.COMPLETE) {
            connection.state = ConnectionState.COMPLETE;
            connection.updatedAt = new Date().toString();
        }

        let storeDataintoDB = {
            connectionId: connectionDB.connectionId,
            connection: JSON.stringify(connection)
        }

        if (pasredMessage['response_requested']) {
            const reply = createTrustPingResponseMessage(pasredMessage['@id']);
            let outboundMessage = createOutboundMessage(connection, reply);
            const outboundPackMessage = await packMessage(configJson, credentialsJson, outboundMessage);
            let outboundMessageResponse: any = await OutboundAgentMessage(outboundMessage.endpoint, 'POST', JSON.stringify(outboundPackMessage));
            DatabaseServices.storeConnection(storeDataintoDB);
        }
        return connection;
    }

}
export default new TrustPingService();