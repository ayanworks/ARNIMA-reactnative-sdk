/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { Connection } from '../connection/ConnectionInterface';
import { createRequestCredentialMessage, credentialPreviewMessage, credentialProposalMessage, storedCredentialAckMessage } from './CredentialMessages';
import { Credential } from './CredentialInterface';
import { CredentialState } from './CredentialState';
import { EventInterface } from '../../agent/EventInterface';
import { EventRegister } from 'react-native-event-listeners';
import { InboundMessage, Message } from '../../utils/Types';
import { NativeModules } from 'react-native';
import { Pool } from '../../pool/PoolInterface';
import { RecordType, decodeBase64, sendOutboundMessage } from '../../utils/Helpers';
import { WalletConfig, WalletCredentials } from '../../wallet/WalletInterface';
import DatabaseServices from '../../storage';
import WalletStorageService from '../../wallet/WalletStorageService';

const { ArnimaSdk } = NativeModules;
class CredentialService {

  /**
   * @description Process a received offer message, This will only store credential record.
   *
   * @param {WalletConfig} configJson
   * @param {WalletCredentials} credentialsJson
   * @param {InboundMessage} inboundMessage
   * @param {string} messageId
   * @return {*}  {Promise<Connection>}
   * @memberof CredentialService
   */
  async requestReceived(configJson: WalletConfig, credentialsJson: WalletCredentials, inboundMessage: InboundMessage, messageId: string): Promise<Connection> {
    try {
      const { recipient_verkey } = inboundMessage;
      const query = {
        connectionId: recipient_verkey
      }

      const connection: Connection = await WalletStorageService.getWalletRecordFromQuery(configJson, credentialsJson, RecordType.Connection, JSON.stringify(query));
      const message: Message = (inboundMessage.message);

      const offersAttach = message['offers~attach'];
      const credOfferJson = await decodeBase64(offersAttach[0].data.base64);

      const issueCredential: Credential = {
        connectionId: connection.verkey,
        theirLabel: connection.theirLabel,
        threadId: message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
        rawCredential: message.credential_preview,
        state: CredentialState.STATE_REQUEST_RECEIVED,
        credentialDefinitionId: credOfferJson.cred_def_id,
        updatedAt: new Date().toISOString()
      }

      const issueCredentialTags: Object = {
        connectionId: connection.verkey,
        issueCredentialId: message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
        messageId: messageId
      }

      if (message.hasOwnProperty('~thread') && Object.keys(message['~thread']).length > 0) {
        await WalletStorageService.updateWalletRecord(
          configJson,
          credentialsJson,
          RecordType.Credential,
          message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
          JSON.stringify(issueCredential),
          JSON.stringify(issueCredentialTags)
        );
      } else {
        issueCredential.createdAt = new Date().toISOString()
        await WalletStorageService.addWalletRecord(
          configJson,
          credentialsJson,
          RecordType.Credential,
          message['@id'],
          JSON.stringify(issueCredential),
          JSON.stringify(issueCredentialTags)
        );
      }

      return connection;
    } catch (error) {
      console.log('Credential = Receive credential erroe = ', error);
      throw error;
    }
  }

  /**
   * @description Create a credential proposal and send to particular connection not bound to an existing credential exchange.  
   *
   * @param {WalletConfig} configJson
   * @param {WalletCredentials} credentialsJson
   * @param {object} connectionId
   * @param {string} proposeCredential
   * @param {string} schemaId
   * @param {string} credDefId
   * @param {string} issuerDid
   * @param {string} comment
   * @return {*}  {Promise<Boolean>}
   * @memberof CredentialService
   */
  async createProposal(configJson: WalletConfig, credentialsJson: WalletCredentials,
    connectionId: object,
    proposeCredential: string,
    schemaId: string,
    credDefId: string,
    issuerDid: string,
    comment: string
  ): Promise<Boolean> {

    try {
      const query = { connectionId: connectionId }

      const connection: Connection = await WalletStorageService.getWalletRecordFromQuery(configJson, credentialsJson, RecordType.Connection, JSON.stringify(query));
      const credentialPreview = await credentialPreviewMessage(proposeCredential);

      const credentialProposal = await credentialProposalMessage(credentialPreview,
        schemaId, credDefId, issuerDid, comment);

      const issueCredential: Credential = {
        connectionId: connection.verkey,
        theirLabel: connection.theirLabel,
        schemaId: schemaId,
        credentialDefinitionId: credDefId,
        state: CredentialState.STATE_REQUEST_SENT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      if (proposeCredential !== '') {
        await sendOutboundMessage(configJson, credentialsJson, connection, credentialProposal)

        const issueCredentialTags: Object = {
          connectionId: connection.verkey,
          issueCredentialId: credentialProposal["@id"],
        }

        await WalletStorageService.addWalletRecord(
          configJson,
          credentialsJson,
          RecordType.Credential,
          credentialProposal["@id"],
          JSON.stringify(issueCredential),
          JSON.stringify(issueCredentialTags)
        );
        return true;
      } else {
        return false;
      }

    }
    catch (error) {
      console.log('Credential = Send Credential Proposal error = ', error);
      throw (error);
    }
  }

  /**
   * @description Create a request credential message as response to a received credential offer.   
   *
   * @param {WalletConfig} configJson
   * @param {WalletCredentials} credentialsJson
   * @param {InboundMessage} inboundMessage
   * @return {*}  {Promise<Boolean>}
   * @memberof CredentialService
   */
  async createRequest(configJson: WalletConfig, credentialsJson: WalletCredentials, inboundMessage: InboundMessage): Promise<Boolean> {

    try {
      const { recipient_verkey } = inboundMessage;
      const query = { connectionId: recipient_verkey }

      const connection: Connection = await WalletStorageService.getWalletRecordFromQuery(configJson, credentialsJson, RecordType.Connection, JSON.stringify(query));

      const message: Message = JSON.parse(inboundMessage.message);
      const offersAttach = message['offers~attach'];
      const credOfferJson = await decodeBase64(offersAttach[0].data.base64);

      const queryPool = {
        isSelected: JSON.stringify(true)
      }

      const poolRecord: Pool = await WalletStorageService.getWalletRecordFromQuery(configJson, credentialsJson, RecordType.Pool, JSON.stringify(queryPool));
      const credDefJson: string = await ArnimaSdk.getCredDef(
        connection.did,
        credOfferJson.cred_def_id,
        poolRecord.poolName,
        poolRecord.poolConfig
      );

      const credentialRequest = await ArnimaSdk.proverCreateCredentialReq(
        JSON.stringify(configJson),
        JSON.stringify(credentialsJson),
        connection.did,
        JSON.stringify(credOfferJson),
        credDefJson,
        DatabaseServices.getMasterSecretId()
      );

      const issueCredential: Credential = {
        connectionId: connection.verkey,
        theirLabel: connection.theirLabel,
        threadId: message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
        credentialDefinitionId: credOfferJson.cred_def_id,
        schemaId: credOfferJson.schema_id,
        credentialOffer: credOfferJson,
        credDefJson: JSON.parse(credDefJson),
        credentialRequest: JSON.parse(credentialRequest[0]),
        credentialRequestMetadata: JSON.parse(credentialRequest[1]),
        rawCredential: message.credential_preview,
        state: CredentialState.STATE_ISSUED,
      }

      const credentialRequestMessage = await createRequestCredentialMessage(
        credentialRequest[0],
        "",
        message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
      );

      await sendOutboundMessage(configJson, credentialsJson, connection, credentialRequestMessage)

      const issueCredentialTags: Object = {
        issueCredentialId: message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
        connectionId: connection.verkey,
      }

      issueCredential.updatedAt = new Date().toISOString()
      await WalletStorageService.updateWalletRecord(
        configJson,
        credentialsJson,
        RecordType.Credential,
        message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
        JSON.stringify(issueCredential),
        JSON.stringify(issueCredentialTags)
      );
      return true;
    }
    catch (error) {
      console.log('Credential = Create credential request error = ', error);
      throw (error);
    }
  }

  /**
   * @description Process a received credential message. This will store the credential and send a credential acknowledgement. 
   *
   * @param {WalletConfig} configJson
   * @param {WalletCredentials} credentialsJson
   * @param {InboundMessage} inboundMessage
   * @return {*}  {Promise<Boolean>}
   * @memberof CredentialService
   */
  async processCredential(configJson: WalletConfig, credentialsJson: WalletCredentials, inboundMessage: InboundMessage): Promise<Boolean> {
    try {
      const { recipient_verkey } = inboundMessage;
      const message: Message = JSON.parse(inboundMessage.message);

      const issueCredentialQuery = {
        issueCredentialId: message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id']
      }
      const issueCredentialRecord: Credential = await WalletStorageService.getWalletRecordFromQuery(configJson, credentialsJson, RecordType.Credential, JSON.stringify(issueCredentialQuery));
      const query = {
        connectionId: recipient_verkey
      }

      const connection: Connection = await WalletStorageService.getWalletRecordFromQuery(configJson, credentialsJson, RecordType.Connection, JSON.stringify(query));

      const credentialsAttach = message['credentials~attach'];
      const credCertificate = await decodeBase64(credentialsAttach[0].data.base64);

      let revocRegDefJson = null;
      const queryPool = {
        isSelected: JSON.stringify(true)
      }

      const poolRecord: Pool = await WalletStorageService.getWalletRecordFromQuery(configJson, credentialsJson, RecordType.Pool, JSON.stringify(queryPool));
      if (credCertificate.rev_reg_id !== null) {
        revocRegDefJson = await ArnimaSdk.getRevocRegDef(
          connection.did,
          credCertificate.rev_reg_id,
          poolRecord.poolName,
          poolRecord.poolConfig
        );
      }
      const storedCredentialId = await ArnimaSdk.proverStoreCredential(
        JSON.stringify(configJson),
        JSON.stringify(credentialsJson),
        null,
        JSON.stringify(issueCredentialRecord.credentialRequestMetadata),
        JSON.stringify(credCertificate),
        JSON.stringify(issueCredentialRecord.credDefJson),
        revocRegDefJson
      );

      if (storedCredentialId.length !== '') {
        issueCredentialRecord.state = CredentialState.STATE_ACKED;
        issueCredentialRecord.revocRegId = credCertificate.rev_reg_id;
        issueCredentialRecord.revocRegDefJson = revocRegDefJson === null ? {} : JSON.parse(revocRegDefJson);
        issueCredentialRecord.updatedAt = new Date().toISOString();
        issueCredentialRecord.credentialId = storedCredentialId;
      } else {
        throw new Error(`Credential not able to store in your wallet - ${storedCredentialId}`);
      }

      const credentialRequestMessage = await storedCredentialAckMessage(
        message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id']
      );

      await sendOutboundMessage(configJson, credentialsJson, connection, credentialRequestMessage)

      const issueCredentialTags: Object = {
        issueCredentialId: message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
        connectionId: connection.verkey,
        credentialsId: storedCredentialId,
      }
      await WalletStorageService.updateWalletRecord(
        configJson,
        credentialsJson,
        RecordType.Credential,
        message['~thread'].thid,
        JSON.stringify(issueCredentialRecord),
        JSON.stringify(issueCredentialTags)
      );

      const event: EventInterface = {
        message: 'You have received a message',
        messageData: JSON.stringify({
          issueCredentialId: message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
          issueCredential: JSON.stringify(issueCredentialRecord)
        })
      }
      await EventRegister.emit('SDKEvent', event);
      return true;
    }
    catch (error) {
      console.log('Credential = Store credential error = ', error);
      throw (error);
    }
  }

}

export default new CredentialService();