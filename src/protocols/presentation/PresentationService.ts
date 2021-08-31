/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { Connection } from '../connection/ConnectionInterface';
import { creatPresentationMessage, presentationAckMessage, presentationProposalMessage, requestPresentationMessage } from './PresentationMessages';
import { InboundMessage, Message } from '../../utils/Types';
import { NativeModules } from 'react-native';
import { Pool } from '../../pool/PoolInterface';
import { Presentation } from './PresentationInterface';
import { PresentationState } from './PresentationState';
import { RecordType, decodeBase64, sendOutboundMessage } from '../../utils/Helpers';
import DatabaseServices from '../../storage';
import WalletStorageService from '../../wallet/WalletStorageService';

const { ArnimaSdk } = NativeModules;
class PresentationService {
  /**
   * @description Process a received presentation message, This will only store record.
   *
   * @param {string} messageId
   * @param {InboundMessage} inboundMessage
   * @return {*}  {Promise<Connection>}
   * @memberof PresentationService
   */
  async requestReceived(messageId: string, inboundMessage: InboundMessage): Promise<Connection> {
    try {
      const { recipient_verkey } = inboundMessage;
      const query = {
        connectionId: recipient_verkey
      }
      const connection: Connection = await WalletStorageService.getWalletRecordFromQuery(RecordType.Connection, JSON.stringify(query));
      const message: Message = (inboundMessage.message);
      const presentationQuery = {
        presentationId: message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id']
      }
      const presentation: Presentation = await WalletStorageService.getWalletRecordFromQuery(RecordType.Presentation, JSON.stringify(presentationQuery));
      const presentationsAttach = message['presentations~attach'];
      const presentationJson = await decodeBase64(presentationsAttach[0].data.base64);
      const presentProofRecord: Presentation = {
        connectionId: connection.verkey,
        theirLabel: connection.theirLabel,
        threadId: message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
        state: PresentationState.STATE_PRESENTATION_RECEIVED,
        presentation: presentation.presentationRequest,
        presentationRequest: JSON.stringify(presentationJson),
        updatedAt: new Date().toISOString()
      }

      const presentationTags: Object = {
        presentationId: message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
        connectionId: connection.verkey,
        messageId: messageId
      }

      if (message.hasOwnProperty('~thread') && Object.keys(message['~thread']).length > 0) {
        await WalletStorageService.updateWalletRecord(
          RecordType.Presentation,
          message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
          JSON.stringify(presentProofRecord),
          JSON.stringify(presentationTags)
        );
      } else {
        presentProofRecord.createdAt = new Date().toISOString();
        await WalletStorageService.addWalletRecord(
          RecordType.Presentation,
          message['@id'],
          JSON.stringify(presentProofRecord),
          JSON.stringify(presentationTags)
        );
      }
      return connection;
    } catch (error) {
      console.log('Presentation - Receive proof request error = ', error);
      throw error;
    }
  }

  /**
   * @description Create a propose presentation message not bound to an existing presentation exchange.
   *
   * @param {string} connectionId
   * @param {object} proposePresentation
   * @param {string} comment
   * @return {*}  {Promise<Boolean>}
   * @memberof PresentationService
   */
  async createProposal(connectionId: string, proposePresentation: object, comment: string): Promise<Boolean> {
    try {
      const query = {
        connectionId: connectionId
      }

      const connection: Connection = await WalletStorageService.getWalletRecordFromQuery(RecordType.Connection, JSON.stringify(query));

      const presentationProposal = await presentationProposalMessage(proposePresentation, comment);
      const presentProofRecord: Presentation = await {
        connectionId: connection.verkey,
        theirLabel: connection.theirLabel,
        state: PresentationState.STATE_PROPOSAL_SENT,
        presentationRequest: JSON.stringify(presentationProposal),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      const presentProofTags: Object = {
        presentationId: presentationProposal['@id'],
        connectionId: connection.verkey,
      }

      if (presentProofRecord) {

        await sendOutboundMessage(connection, presentationProposal)

        await WalletStorageService.addWalletRecord(
          RecordType.Presentation,
          presentationProposal['@id'],
          JSON.stringify(presentationProposal),
          JSON.stringify(presentProofTags)
        );
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.log('Presentation - Propose presentation error = ', error);
      throw (error);
    }
  }


  /**
   * @description Process a received request presentation message.It will only create a new, or update the existing proof record
   *
   * @param {string} messageId
   * @param {InboundMessage} inboundMessage
   * @return {*}  {Promise<Connection>}
   * @memberof PresentationService
   */
  async processRequest(messageId: string, inboundMessage: InboundMessage): Promise<Connection> {
    try {

      const { recipient_verkey } = inboundMessage;
      const query = { connectionId: recipient_verkey }
      const connection: Connection = await WalletStorageService.getWalletRecordFromQuery(RecordType.Connection, JSON.stringify(query));
      const message: Message = inboundMessage.message;
      if (message.hasOwnProperty('comment') && message.comment.includes(':::auto:::')) {
        const response = await this.createPresentation(inboundMessage, true);
        if (response) { await WalletStorageService.deleteWalletRecord(RecordType.SSIMessage, messageId) }
        return connection;
      } else {

        const presentationRequest = message['request_presentations~attach'];
        const proofRequest = await decodeBase64(presentationRequest[0].data.base64);
        const presentProofRecord: Presentation = await {
          connectionId: connection.verkey,
          theirLabel: connection.theirLabel,
          threadId: message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
          presentationRequest: proofRequest,
          state: PresentationState.STATE_REQUEST_RECEIVED,
          updatedAt: new Date().toISOString()
        }
        const presentProofTags: Object = {
          presentationId: message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
          connectionId: connection.verkey,
          messageId: messageId
        }

        if (message.hasOwnProperty('~thread') && Object.keys(message['~thread']).length > 0) {
          await WalletStorageService.updateWalletRecord(
            RecordType.Presentation,
            message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
            JSON.stringify(presentProofRecord),
            JSON.stringify(presentProofTags)
          );
        } else {
          presentProofRecord.createdAt = new Date().toISOString();
          await WalletStorageService.addWalletRecord(
            RecordType.Presentation,
            message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
            JSON.stringify(presentProofRecord),
            JSON.stringify(presentProofTags)
          );
        }
      }

      return connection;
    } catch (error) {
      console.log('Presentation - Receive present proof request error = ', error);
      throw (error);
    }
  }

  /**
   * @description Create a presentation message as response to a received presentation request.
   *
   * @param {InboundMessage} inboundMessage
   * @param {boolean} [revealAttributes=true]
   * @return {*}  {Promise<Boolean>}
   * @memberof PresentationService
   */
  async createPresentation(inboundMessage: InboundMessage, revealAttributes: boolean = true, presentationObj?: object): Promise<Boolean> {

    try {
      // TODO : Need to find a way for realm db typing
      const sdkDB: any = DatabaseServices.getWallet();
      const { recipient_verkey } = inboundMessage;
      const query = {
        connectionId: recipient_verkey
      }
      const connection: Connection = await WalletStorageService.getWalletRecordFromQuery(RecordType.Connection, JSON.stringify(query));
      const message: Message = inboundMessage.message;
      const presentationRequest = message['request_presentations~attach'];
      const proofRequest = await decodeBase64(presentationRequest[0].data.base64);
      const queryPool = {
        isSelected: JSON.stringify(true)
      }
      const { poolName, poolConfig }: Pool = await WalletStorageService.getWalletRecordFromQuery(RecordType.Pool, JSON.stringify(queryPool));
      const [requestedCredentials, revocStates] = await this.getRequestedCredentialsForProofRequest(proofRequest, presentationObj, poolName, poolConfig, sdkDB.publicDid, revealAttributes)
      const credentialObjects: Array<Object> = []
      const credIds = []

      Object.values(requestedCredentials.requested_attributes).forEach((attr) => {
        credIds.push(attr.cred_id)
      })
      if (requestedCredentials.requested_predicates) {
        Object.values(requestedCredentials.requested_predicates).forEach((pred) => {
          credIds.push(pred.cred_id)
        })
      }

      for (const credentialId of new Set(credIds)) {
        const credentialInfo = await ArnimaSdk.proverGetCredential(credentialId)
        credentialObjects.push(JSON.parse(credentialInfo))
      }

      const [schemas, credDefs] = await Promise.all([
        this.generateSchemaJson(credentialObjects, poolName, poolConfig, sdkDB.publicDid),
        this.generateCredDefJson(credentialObjects, poolName, poolConfig, sdkDB.publicDid)]
      );


      const presentation = await ArnimaSdk.proverCreateProof(
        JSON.stringify(proofRequest),
        JSON.stringify(requestedCredentials),
        sdkDB.masterSecretId,
        JSON.stringify(schemas),
        JSON.stringify(credDefs),
        JSON.stringify(revocStates),
      );
      const presentProofRecord: Presentation = await {
        connectionId: connection.verkey,
        theirLabel: connection.theirLabel,
        threadId: message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
        presentationRequest: proofRequest,
        presentation: JSON.parse(presentation),
        state: PresentationState.STATE_PRESENTATION_SENT,
        updatedAt: new Date().toISOString(),
      }
      const creatPresentationMessageObject = await creatPresentationMessage(
        presentation,
        "",
        message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
      );

      await sendOutboundMessage(connection, creatPresentationMessageObject)

      await WalletStorageService.updateWalletRecord(
        RecordType.Presentation,
        message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
        JSON.stringify(presentProofRecord),
        '{}'
      );
      return true;
    }
    catch (error) {
      console.log('Presentation - createPresentation request error = ', error);
      throw error;
    }
  }

  public async generateSchemaJson(credentialObjects: any[], poolName: string, poolConfig: string, publicDid: string): Promise<any> {
    try {
      let schemas = { };
      const schemaIds = credentialObjects.map((c) => c.schema_id)
      for (const schemaId of schemaIds) {
        const schema = await ArnimaSdk.getSchemasJson(poolName, poolConfig, publicDid, schemaId)
        schemas[schemaId] = JSON.parse(schema)
      }
      return schemas;
    } catch (error) {
      throw error;
    }
  }

  public async generateCredDefJson(credentialObjects: any[], poolName: string, poolConfig: string, publicDid: string): Promise<any> {
    try {
      let credDefs = { };
      const credDefIds = credentialObjects.map((c) => c.cred_def_id)
      for (const credDefId of credDefIds) {
        const credDef = await ArnimaSdk.getCredDef(publicDid, credDefId, poolName, poolConfig)
        credDefs[credDefId] = JSON.parse(credDef)
      }
      return credDefs;
    } catch (error) {
      throw error;
    }
  }

  public async getRequestedCredentialsForProofRequest(
    proofRequest: any,
    presentationProposal?: any,
    poolName: string,
    poolConfig: string,
    publicDid: string,
    revealAttributes?: boolean,
  ): Promise<any> {
    try {
      const revocStates: Object = { }
      const requestedCredentials = {
        self_attested_attributes: { },
        requested_attributes: { },
        requested_predicates: { },
      }
      let revRegIdMatcher: string = '';
      let revRegIdJsonMatcher: Object = { };
      for (const [referent, requestedAttribute] of Object.entries(proofRequest.requested_attributes)) {
        let credentialMatch: Credential | null = null
        const credentials = await this.getCredentialsForProofRequest(proofRequest, referent)
        if (credentials.length === 0) {
          const errorObject = {
            message: 'Could not automatically construct requested credentials for proof request '
          }
          throw JSON.stringify(errorObject)
        } else if (presentationProposal === undefined) {
          credentialMatch = credentials[0]
        } else {
          const names = requestedAttribute.names ?? [requestedAttribute.name]

          for (const credential of credentials) {
            const { attrs, cred_def_id } = credential.cred_info
            const isMatch = names.every((name) =>
              presentationProposal.attributes.find(
                (a) =>
                  a.name === name &&
                  a.credentialDefinitionId === cred_def_id &&
                  (!a.value || a.value === attrs[name])
              )
            )


            if (isMatch) {
              credentialMatch = credential
              break
            }
          }
        }

        if (!credentialMatch) {
          const errorObject = {
            message: 'Could not automatically construct requested credentials for proof request '
          }
          throw JSON.stringify(errorObject)
        }

        if (requestedAttribute.restrictions) {
          let timestampObj: {
            timestamp?: number
          } = { };

          if (credentialMatch.cred_info.rev_reg_id !== null) {
            if (credentialMatch.cred_info.rev_reg_id !== revRegIdMatcher) {
              const revocStateObject = await ArnimaSdk.createRevocationStateObject(
                poolName,
                poolConfig,
                publicDid,
                credentialMatch.cred_info.rev_reg_id,
                credentialMatch.cred_info.cred_rev_id,
              )
              const timestamp = Object.keys(JSON.parse(revocStateObject));
              timestampObj.timestamp = parseInt(timestamp[0])
              revocStates[credentialMatch.cred_info.rev_reg_id] = JSON.parse(revocStateObject)
              // This is done to reduce the time for proof creation
              revRegIdMatcher = credentialMatch.cred_info.rev_reg_id
              revRegIdJsonMatcher = JSON.parse(revocStateObject)
            } else {
              const timestamp = Object.keys(revRegIdJsonMatcher);
              timestampObj.timestamp = parseInt(timestamp[0])
              revocStates[credentialMatch.cred_info.rev_reg_id] = revRegIdJsonMatcher
            }
          }

          requestedCredentials.requested_attributes[referent] = {
            cred_id: credentialMatch.cred_info.referent,
            revealed: revealAttributes,
            ...timestampObj
          }
        }
        else {
          const value = credentialMatch.cred_info.attrs[requestedAttribute.name]
          requestedCredentials.self_attested_attributes[referent] = value
        }
      }

      for (const [referent, requestedPredicate] of Object.entries(proofRequest.requested_predicates)) {
        const credentials = await this.getCredentialsForProofRequest(proofRequest, referent)
        let credMatch: Credential | null = null
        if (credentials.length === 0) {
          const errorObject = {
            message: 'Could not automatically construct requested credentials for proof request '
          }
          throw JSON.stringify(errorObject)
        } else if (presentationProposal === undefined) {
          credMatch = credentials[0];
        } else {
          const names = requestedPredicate.names ?? [requestedPredicate.name]

          for (const credential of credentials) {
            const { attrs, cred_def_id } = credential.cred_info
            const isMatch = names.every((name) =>
              presentationProposal.predicates.find(
                (a) =>
                  a.name === name &&
                  a.credentialDefinitionId === cred_def_id &&
                  (!a.value || a.value === attrs[name])
              )
            )

            if (isMatch) {
              credMatch = credential
              break
            }
          }
        }

        if (!credMatch) {
          const errorObject = {
            message: 'Could not automatically construct requested credentials for proof request '
          }
          throw JSON.stringify(errorObject)
        }

        if (requestedPredicate.restrictions) {
          let timestampObj: {
            timestamp?: number
          } = { };

          if (credMatch.cred_info.rev_reg_id !== null) {
            if (credMatch.cred_info.rev_reg_id !== revRegIdMatcher) {
              const revocStateObject = await ArnimaSdk.createRevocationStateObject(
                poolName,
                poolConfig,
                publicDid,
                credMatch.cred_info.rev_reg_id,
                credMatch.cred_info.cred_rev_id,
              )
              const timestamp = Object.keys(JSON.parse(revocStateObject));
              timestampObj.timestamp = parseInt(timestamp[0])
              revocStates[credMatch.cred_info.rev_reg_id] = JSON.parse(revocStateObject)
              // This is done to reduce the time for proof creation
              revRegIdMatcher = credMatch.cred_info.rev_reg_id
              revRegIdJsonMatcher = JSON.parse(revocStateObject)
            } else {
              const timestamp = Object.keys(revRegIdJsonMatcher);
              timestampObj.timestamp = parseInt(timestamp[0])
              revocStates[credMatch.cred_info.rev_reg_id] = revRegIdJsonMatcher
            }
          }
          requestedCredentials.requested_predicates[referent] = {
            cred_id: credMatch.cred_info.referent,
            ...timestampObj
          }
        } else {
          const value = credMatch.cred_info.attrs[requestedPredicate.name]

          requestedCredentials.self_attested_attributes[referent] = value
        }
      }
      return [requestedCredentials, revocStates]
    } catch (err) {
      throw err
    }
  }

  private async getCredentialsForProofRequest(
    proofRequest,
    attributeReferent,
    start = 0,
    limit = 256
  ): Promise<any[]> {
    const searchHandle = await ArnimaSdk.proverSearchCredentialsForProofReq(
      JSON.stringify(proofRequest),
    )

    try {
      if (start > 0) {
        await this.fetchCredentialsForReferent(searchHandle, attributeReferent, start)
      }

      const credentials = await this.fetchCredentialsForReferent(searchHandle, attributeReferent, limit)

      return credentials
    } finally {
      await ArnimaSdk.proverCloseCredentialsSearchForProofReq(searchHandle)
    }
  }

  private async fetchCredentialsForReferent(searchHandle: number, referent: string, limit?: number) {
    let credentials: any[] = []

    const chunk = limit ? Math.min(256, limit) : 256

    while (!limit || credentials.length < limit) {
      const credentialsJson = await ArnimaSdk.proverFetchCredentialsForProofReq(searchHandle, referent, chunk)
      credentials = credentials.concat(JSON.parse(credentialsJson))
      if (credentialsJson.length < chunk) {
        return credentials
      }
    }
    return credentials
  }

  /**
   * @description Create a request presentation message not bound to an existing presentation exchange.
   *
   * @param {string} connectionId
   * @param {object} proofRequest
   * @param {string} comment
   * @return {*}  {Promise<Boolean>}
   * @memberof PresentationService
   */
  async createRequest(connectionId: string, proofRequest: object, comment: string): Promise<Boolean> {
    try {
      const query = { connectionId: connectionId }
      const connection: Connection = await WalletStorageService.getWalletRecordFromQuery(RecordType.Connection, JSON.stringify(query));
      const requestPresentation = await requestPresentationMessage(
        JSON.stringify(proofRequest),
        comment,
      );
      const presentProofRecord: Presentation = await {
        connectionId: connection.verkey,
        theirLabel: connection.theirLabel,
        threadId: requestPresentation['@id'],
        presentationRequest: JSON.stringify(proofRequest),
        state: PresentationState.STATE_REQUEST_SENT,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }

      await sendOutboundMessage(connection, requestPresentation)

      const presentationProofTags: Object = {
        presentationId: requestPresentation['@id'],
        connectionId: connection.verkey,
      }
      await WalletStorageService.addWalletRecord(
        RecordType.Presentation,
        requestPresentation['@id'],
        JSON.stringify(presentProofRecord),
        JSON.stringify(presentationProofTags)
      );

      return true;
    }
    catch (error) {
      console.log('Presentation - Send present proof request error = ', error);
      throw (error);
    }
  }

  /**
   * @description Verify an indy proof object. Will also ack to sender.
   *
   * @param {string} messageId
   * @param {InboundMessage} inboundMessage
   * @return {*}  {Promise<Boolean>}
   * @memberof PresentationService
   */
  async verifyProof(messageId: string, inboundMessage: InboundMessage): Promise<Boolean> {
    try {
      // TODO : Need to find a way for realm db typing
      const sdkDB: any = DatabaseServices.getWallet();
      const message: Message = JSON.parse(inboundMessage.message);
      const presentationQuery = { messageId: messageId }
      const presentationRecord = await WalletStorageService.getWalletRecordFromQuery(RecordType.Presentation, JSON.stringify(presentationQuery));
      const presentProofRecord = presentationRecord.presentation;
      const presentationRequest = presentationRecord.presentationRequest;

      const { recipient_verkey } = inboundMessage;

      const query = { connectionId: recipient_verkey }
      const connection: Connection = await WalletStorageService.getWalletRecordFromQuery(RecordType.Connection, JSON.stringify(query));
      const queryPool = {
        isSelected: JSON.stringify(true)
      }

      const { poolName, poolConfig }: Pool = await WalletStorageService.getWalletRecordFromQuery(RecordType.Pool, JSON.stringify(queryPool));

      const schemas: Object = { }
      const credDefs: Object = { }
      const revRegDefs: Object = { }
      const revRegsObj: Object = { }
      const identifiers = JSON.parse(presentationRequest).identifiers

      for (const identifier of new Set(identifiers)) {
        const schema = await ArnimaSdk.getSchemasJson(poolName, poolConfig, sdkDB.publicDid, identifier.schema_id)
        schemas[identifier.schema_id] = JSON.parse(schema)
      }

      for (const identifier of new Set(identifiers)) {
        const credDef = await ArnimaSdk.getCredDef(sdkDB.publicDid, identifier.cred_def_id, poolName, poolConfig)
        credDefs[identifier.cred_def_id] = JSON.parse(credDef)
      }

      for (const identifier of new Set(identifiers)) {
        if (identifier.rev_reg_id !== null) {
          const revRegDefJson = await ArnimaSdk.getRevocRegDefJson(poolName, poolConfig, sdkDB.publicDid, identifier.rev_reg_id)
          revRegDefs[identifier.rev_reg_id] = JSON.parse(revRegDefJson)
          const timestamp = identifier.timestamp === null ? Date.now() : identifier.timestamp
          const revRegJson = await ArnimaSdk.getRevocRegsJson(poolName, poolConfig, sdkDB.publicDid, identifier.rev_reg_id, timestamp.toString())
          const timestampObj = {
            [timestamp]: JSON.parse(revRegJson)
          }
          revRegsObj[identifier.rev_reg_id] = timestampObj
        }
      }

      const response = await ArnimaSdk.verifierVerifyProof(
        presentProofRecord,
        presentationRequest,
        JSON.stringify(schemas),
        JSON.stringify(credDefs),
        JSON.stringify(revRegDefs),
        JSON.stringify(revRegsObj),
      );

      presentationRecord.state = PresentationState.STATE_VERIFIED
      presentationRecord.updatedAt = new Date().toISOString();
      presentationRecord.verified = response;

      const presentationAcknowledgeMessage = await presentationAckMessage(
        message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id']
      );

      await sendOutboundMessage(connection, presentationAcknowledgeMessage)

      await WalletStorageService.updateWalletRecord(
        RecordType.Presentation,
        message.hasOwnProperty('~thread') ? Object.keys(message['~thread']).length > 0 === false ? message['@id'] : message['~thread'].thid : message['@id'],
        JSON.stringify(presentationRecord),
        '{}'
      );

      return response;
    } catch (error) {
      console.log('Presentation - Verify proof request error = ', error);
      throw error;
    }
  }
}

export default new PresentationService();