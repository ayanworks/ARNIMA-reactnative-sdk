/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/


import { decodeInvitationFromUrl, RecordType } from '../utils/Helpers';
import { InboundMessage } from '../utils/Types';
import { MessageType } from '../utils/MessageType';
import { NativeModules } from 'react-native';
import { WalletConfig, WalletCredentials } from '../wallet/WalletInterface';
import BasicMessageService from '../protocols/basicMessage/BasicMessageService';
import ConnectionService from '../protocols/connection/ConnectionService';
import ConnectWithMediatorService from '../protocols/mediator/ConnectWithMediatorService';
import CredentialService from '../protocols/credential/CredentialService';
import DatabaseServices from '../storage';
import InboundMessageService from '../transports';
import PoolService from '../pool';
import PresentationService from '../protocols/presentation/PresentationService';
import WalletService from '../wallet/WalletService';
import WalletStorageService from '../wallet/WalletStorageService';

const { ArnimaSdk } = NativeModules;

class Agent {
  wallet: any = DatabaseServices.getWallet();

  createWallet = async (config: WalletConfig, credentials: WalletCredentials, label: string) => {
    try {
      return await WalletService.createWallet(config, credentials, label);
    } catch (error) {
      console.log("Agent - Create wallet error= ", error);
      throw error;
    }
  }

  connectWithMediator = async (url: string, apiType: string, apiBody: string) => {
    try {
      const response = await ConnectWithMediatorService.ConnectWithMediator(url, apiType, apiBody);
      this.wallet = await DatabaseServices.getWallet();
      return response;
    }
    catch (error) {
      console.log("Agent - Connect with mediator error = ", error);
      throw error;
    }
  }

  updateMediator = async (url: string, apiType: string, apiBody: string) => {
    try {
      return await ConnectWithMediatorService.updateMediator(url, apiType, apiBody);
    }
    catch (error) {
      console.log("Agent - Update mediator error = ", error);
      throw error;
    }
  }

  getWallet = async () => {
    try {
      return await WalletService.getWallet();
    } catch (error) {
      console.log('Agent - Get wallet error = ', error);
      throw error;
    }

  }

  openWallet = async () => {
    try {
      return await WalletService.openWallet();
    } catch (error) {
      console.log("Agent - Open wallet error = ", error);
      throw error;
    }
  };

  getAllPool = async () => {
    try {
      return await PoolService.getAllPool(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials));
    } catch (error) {
      console.log("Agent - Get all pool error = ", error);
      throw error;
    }
  };

  createPool = async (poolName: string, poolConfig: string, defaultPool?: boolean) => {
    try {
      return await PoolService.createPool(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), poolName, poolConfig, defaultPool);
    } catch (error) {
      console.log("Agent - Create pool error = ", error);
      throw error;
    }
  };

  selectDefaultPool = async (poolName: string) => {
    try {
      return await PoolService.selectDefaultPool(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), poolName)
    } catch (error) {
      console.log("Agent - Select default pool error = ", error);
      throw error;
    }
  };

  createInvitation = async (didJson: Object, logo: string) => {
    try {
      return await ConnectionService.createInvitation(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), didJson, logo);
    } catch (error) {
      console.log("Agent - Create invitation error = ", error);
      throw error;
    }
  }

  acceptInvitation = async (didJson: Object, message: any, logo: string,) => {
    try {
      const invitation = decodeInvitationFromUrl(message);
      return await ConnectionService.acceptInvitation(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), didJson, invitation, logo);
    }
    catch (error) {
      console.log("Agent - Accept invitation error = ", error);
      throw error;
    }
  }

  getConnectionRecord = async (query: Object) => {
    try {
      return await WalletStorageService.getWalletRecordsFromQuery(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.Connection, JSON.stringify(query));
    }
    catch (error) {
      console.log("Agent - Get all connections error = ", error);
      throw error;
    }
  }

  getPresentationRecord = async (query: Object) => {
    try {
      return await WalletStorageService.getWalletRecordsFromQuery(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.Presentation, JSON.stringify(query));
    }
    catch (error) {
      console.log("Agent - Get all connections error = ", error);
      throw error;
    }
  }

  basicMessageHistory = async (query: Object) => {
    try {
      return await WalletStorageService.getWalletRecordsFromQuery(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.BasicMessage, JSON.stringify(query));
    }
    catch (error) {
      console.log("Agent - Get all connections error = ", error);
      throw error;
    }
  }

  deleteConnection = async (connectionId: string) => {
    try {
      const records = await WalletStorageService.getWalletRecordsFromQuery(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.Credential, JSON.stringify({ connectionId: connectionId }));
      if (records === null || records.length === 0) {
        await WalletStorageService.deleteWalletRecord(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.Connection, connectionId);
        return true;
      } else {
        return false;
      }
    } catch (error) {
      console.log('Agent - Delete connection error = ', error);
      throw error;
    }
  }

  getAllActionMessages = async () => {
    try {
      const query = { autoProcessed: false }
      return await WalletStorageService.getWalletRecordsFromQuery(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, JSON.stringify(query));
    }
    catch (error) {
      console.log("Agent - Get all action messages error= ", error);
      throw error;
    }
  }

  getIssueCredentialByConnectionId = async (connectionId: string) => {
    try {
      let query = {}
      if (connectionId !== null) {
        query = { connectionId: connectionId }
      }
      return await WalletStorageService.getWalletRecordsFromQuery(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.Credential, JSON.stringify(query));
    } catch (error) {
      console.log('Agent - Get issue credential by connection id error = ', error);
      throw error;
    }
  }

  getPresentationByConnectionId = async (connectionId: string) => {
    try {
      return await WalletStorageService.getWalletRecordsFromQuery(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.Presentation, JSON.stringify({ connectionId: connectionId }));
    } catch (error) {
      console.log('Agent - Get presentation by connection id error = ', error);
      throw error;
    }
  }

  getAllActionMessagesById = async (thId: string) => {
    try {
      return await WalletStorageService.getWalletRecordFromQuery(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, JSON.stringify({ thId: thId }));
    } catch (error) {
      console.log('Agent - Get all action messages by id error = ', error);
      throw error;
    }
  }

  getIssueCredentialByCredentialsId = async (referent: string) => {
    try {
      return await WalletStorageService.getWalletRecordFromQuery(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.Credential, JSON.stringify({ credentialsId: referent }));
    } catch (error) {
      console.log('Agent - Get all issue credential by credentials id error = ', error);
      throw error;
    }
  }

  sendCredentialProposal = async (connectionId: object, credentialProposal: string, schemaId: string, credDefId: string, issuerDid: string, comment: string) => {
    try {
      return await CredentialService.createProposal(
        JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials),
        connectionId,
        credentialProposal,
        schemaId,
        credDefId,
        issuerDid,
        comment
      );
    } catch (error) {
      console.log('Agent - Send credential proposal error = ', error);
      throw error;
    }
  }

  acceptCredentialOffer = async (messageId: string, inboundMessage: InboundMessage) => {
    try {
      let { message }: any = inboundMessage;
      message = JSON.stringify(message);
      inboundMessage['message'] = message;
      const response: Boolean = await CredentialService.createRequest(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), inboundMessage);
      if (response) await WalletStorageService.deleteWalletRecord(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, messageId);
      return response;
    } catch (error) {
      console.log('Agent - Accept credential offer error = ', error);
      throw error;
    }
  }

  storeCredential = async (messageId: string, inboundMessage: InboundMessage) => {
    try {
      let { message }: any = inboundMessage;
      message = JSON.stringify(message);
      inboundMessage['message'] = message;
      const response: Boolean = await CredentialService.processCredential(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), inboundMessage);
      if (response) await WalletStorageService.deleteWalletRecord(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, messageId);
      return response;
    } catch (error) {
      console.log('Agent - Store credential error = ', error);
      throw error;
    }
  }

  getAllCredential = async (filter?: Object) => {
    try {
      const getCredentials = await ArnimaSdk.proverGetCredentials(
        this.wallet.walletConfig,
        this.wallet.walletCredentials,
        JSON.stringify(filter)
      );
      return JSON.parse(getCredentials);
    } catch (error) {
      console.log("Agent - List all credentials error = ", error);
      throw error;
    }
  };

  sendBasicMessage = async (message: string, connectionId: string) => {
    try {
      return await BasicMessageService.send(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), message, connectionId);
    } catch (error) {
      console.log('Agent - Send message error = ', error);
      throw error;
    }
  }

  sendProposePresentation = async (connectionId: string,
    presentationProposal: object,
    comment: string
  ) => {
    try {
      presentationProposal["@type"] = MessageType.presentationPreview;
      return await PresentationService.createProposal(
        JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials),
        connectionId,
        presentationProposal,
        comment
      );
    } catch (error) {
      console.log('Agent - Send propose presentation error = ', error);
      throw error;
    }
  }

  sendProof = async (messageId: string, inboundMessage: InboundMessage, revealAttributes: boolean, presentationObj: object) => {
    try {
      const response: Boolean = await PresentationService.createPresentation(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), inboundMessage, revealAttributes, presentationObj);
      if (response) { await WalletStorageService.deleteWalletRecord(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, messageId) }
      return response;
    } catch (error) {
      console.log('Agent - Send proof error = ', error);
      throw error;
    }
  }

  verifyProof = async (messageId: string, inboundMessage: InboundMessage) => {
    try {
      let { message }: any = inboundMessage;
      message = JSON.stringify(message);
      inboundMessage['message'] = message;
      const response = await PresentationService.verifyProof(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), messageId, inboundMessage);
      await WalletStorageService.deleteWalletRecord(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, messageId)
      return response;
    } catch (error) {
      console.log('Agent - Verify proof error = ', error);
      throw error;
    }
  }

  sendPresentProofRequest = async (connectionId: string, proofRequest: object, comment: string) => {
    try {
      return await PresentationService.createRequest(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), connectionId, proofRequest, comment);
    } catch (error) {
      console.log('Agent - Send present proof request error = ', error);
      throw error;
    }
  }

  getAllActionMessagesByMessageId = async (messageId: string) => {
    try {
      return await WalletStorageService.getWalletRecordFromQuery(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.SSIMessage, JSON.stringify({ messageId: messageId }));
    } catch (error) {
      console.log('Agent - Get all action messages by message id error = ', error);
      throw error;
    }
  }

  getConnection = async (connectionId: string) => {
    try {
      return await WalletStorageService.getWalletRecordFromQuery(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials), RecordType.Connection, JSON.stringify({ connectionId: connectionId }));
    } catch (error) {
      console.log('Agent - Get Connection from connection id error = ', error);
      throw error;
    }
  }

  socketInit = async () => {
    await InboundMessageService.initializeSocket()
  }

  exportWallet = async (filePath: string, key: string) => {
    try {
      const config = {
        path: filePath,
        key: key
      }
      const data = [];

      await PoolService.deletePoolRecords(JSON.parse(this.wallet.walletConfig), JSON.parse(this.wallet.walletCredentials));

      const response = await ArnimaSdk.exportWallet(
        this.wallet.walletConfig,
        this.wallet.walletCredentials,
        JSON.stringify(config),
      );

      return response;
    } catch (error) {
      console.log('Agent - Export wallet error = ', error);
      throw error;
    }
  }

  importWallet = async (config: WalletConfig, credentials: WalletCredentials, filePath: string, key: string) => {
    try {
      const importConfig = {
        path: filePath,
        key: key
      }

      await ArnimaSdk.importWallet(
        JSON.stringify(config),
        JSON.stringify(credentials),
        JSON.stringify(importConfig),
        JSON.stringify([])
      );

      const mediatorRecord = await WalletStorageService.getWalletRecordFromQuery(config, credentials, RecordType.MediatorAgent, '{}');

      DatabaseServices.storeWallet({
        walletConfig: JSON.stringify(config),
        walletCredentials: JSON.stringify(credentials),
        label: mediatorRecord.label,
        serviceEndpoint: mediatorRecord.serviceEndpoint,
        routingKey: mediatorRecord.routingKey,
        publicDid: mediatorRecord.publicDid,
        verKey: mediatorRecord.verKey,
        masterSecretId: mediatorRecord.masterSecretId,
      });

      const record = {
        mediatorRecord,
      }

      this.wallet = await DatabaseServices.getWallet();

      return record;
    } catch (error) {
      console.log('Agent - Import wallet error = ', error);
      throw error;
    }
  }

}

export default new Agent();