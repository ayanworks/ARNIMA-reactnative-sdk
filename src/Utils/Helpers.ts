/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { InvitationDetails } from '../Protocols/Connection/InvitationInterface';
import { OutboundMessage, InboundMessage } from './Types';
import { createForwardMessage } from '../Protocols/Connection/ConnectionMessages';
import { DatabaseServices } from '../Storage';
import { WalletConfig, WalletCredentials } from '../Protocols/Wallet/WalletInterface';
import { NativeModules, Platform } from "react-native";
import { Message } from './Types';
import { Connection } from '../Protocols/Connection/ConnectionInterface';
import base64url from 'base64url';
const Buffer = require('buffer').Buffer;


const { ArnimaSdk }: any = NativeModules;

export function decodeInvitationFromUrl(invitationUrl: string) {
  const [, encodedInvitation] = invitationUrl.split('c_i=');
  const invitation = JSON.parse(Buffer.from(encodedInvitation, 'base64').toString());
  return invitation;
}

export function encodeInvitationToUrl(invitation: InvitationDetails): string {
  const encodedInvitation = Buffer.from(JSON.stringify(invitation)).toString('base64');
  let sdkDB: any = DatabaseServices.getWallet();
  const invitationUrl = `${sdkDB.serviceEndpoint.split("/")[0] + "/" + sdkDB.serviceEndpoint.split("/")[1] + "/" + sdkDB.serviceEndpoint.split("/")[2]}/ssi?c_i=${encodedInvitation}`;
  return invitationUrl;
}

export function decodeBase64(base64Data: string) {
  const decodedData = JSON.parse(Buffer.from(base64Data, 'base64').toString());
  return decodedData;
}

export function encodeBase64(data: string) {
  const encodedData = Buffer.from(JSON.stringify(data)).toString('base64');
  return encodedData;
}

export async function packMessage(configJson: WalletConfig, credentialsJson: WalletCredentials, outboundMessage: OutboundMessage) {
  try {
    const { connection, routingKeys, recipientKeys, senderVk, payload, endpoint } = outboundMessage;
    const { verkey } = outboundMessage.connection;
    var buf = Buffer.from(JSON.stringify(payload));
    let packedBufferMessage;
    if (Platform.OS === 'ios') {
      packedBufferMessage = await ArnimaSdk.packMessage(JSON.stringify(configJson), JSON.stringify(credentialsJson), JSON.stringify(payload), recipientKeys, senderVk)
    }
    else {
      packedBufferMessage = await ArnimaSdk.packMessage(JSON.stringify(configJson), JSON.stringify(credentialsJson), Array.from(buf), recipientKeys, senderVk)
    }
    var packedMessage = Buffer.from(packedBufferMessage);
    var outboundPackedMessage = JSON.parse(packedMessage.toString('utf-8'));

    let message = outboundPackedMessage;
    if (routingKeys && routingKeys.length > 0) {
      for (const routingKey of routingKeys) {
        const [recipientKey] = recipientKeys;
        const forwardMessage = createForwardMessage(recipientKey, message);
        var forwardMessageBuffer = Buffer.from(JSON.stringify(forwardMessage));
        var forwardBufferMessage;
        if (Platform.OS === 'ios') {
          forwardBufferMessage = await ArnimaSdk.packMessage(JSON.stringify(configJson), JSON.stringify(credentialsJson), JSON.stringify(forwardMessage), [routingKey], senderVk)
        }
        else {
          forwardBufferMessage = await ArnimaSdk.packMessage(JSON.stringify(configJson), JSON.stringify(credentialsJson), Array.from(forwardMessageBuffer), [routingKey], senderVk)
        }
        var forwardPackedMessage = Buffer.from(forwardBufferMessage);
        message = JSON.parse(forwardPackedMessage.toString('utf-8'));
      }
    }
    return message;
  }
  catch (error) {
    console.log("packMessage = ", error);
    throw error;
  }
}

export async function unpackMessage(configJson: WalletConfig, credentialsJson: WalletCredentials, inboundMessage: any) {
  try {
    var buf = Buffer.from(JSON.stringify(inboundMessage));
    let unpackedBufferMessage;
    if (Platform.OS === 'ios') {
      unpackedBufferMessage = await ArnimaSdk.unpackMessage(JSON.stringify(configJson), JSON.stringify(credentialsJson), JSON.stringify(inboundMessage))
    }
    else {
      unpackedBufferMessage = await ArnimaSdk.unpackMessage(JSON.stringify(configJson), JSON.stringify(credentialsJson), Array.from(buf))
    }
    var unpackedMessage = Buffer.from(unpackedBufferMessage);
    var inboundPackedMessage = JSON.parse(unpackedMessage.toString('utf-8'));
    return inboundPackedMessage;
  } catch (error) {
    console.log("unpackMessage = ", error);
    throw error;
  }
}

function timestamp(): Uint8Array {
  let time = Date.now();
  const bytes = [];
  for (let i = 0; i < 8; i++) {
    const byte = time & 0xff;
    bytes.push(byte);
    time = (time - byte) / 256; // Javascript right shift (>>>) only works on 32 bit integers
  }
  return Uint8Array.from(bytes).reverse();
}


export async function sign(configJson: WalletConfig, credentialsJson: WalletCredentials, signerVerkey: string, message: Message, field: string) {
  try {

    const { [field]: data, ...originalMessage } = message;

    const dataBuffer = Buffer.concat([timestamp(), Buffer.from(JSON.stringify(data), 'utf8')]);
    let signatureBuffer;

    if (Platform.OS === 'ios') {
      signatureBuffer = await ArnimaSdk.cryptoSign(JSON.stringify(configJson),
        JSON.stringify(credentialsJson),
        signerVerkey,
        JSON.stringify(data));
    } else {
      signatureBuffer = await ArnimaSdk.cryptoSign(JSON.stringify(configJson),
        JSON.stringify(credentialsJson),
        signerVerkey,
        Array.from(dataBuffer));
    }

    const signedMessage = {
      '@type': message['@type'],
      '@id': message['@id'],
      ...originalMessage,
      [`${field}~sig`]: {
        '@type': 'did:sov:BzCbsNYhMrjHiqZDTUASHg;spec/signature/1.0/ed25519Sha512_single',
        signature: base64url.encode(signatureBuffer),
        sig_data: base64url.encode(dataBuffer),
        signer: signerVerkey,
      },
    };

    return signedMessage;
  } catch (error) {
    console.log("sign message = ", error);
    throw error;
  }
}

export async function verify(configJson: WalletConfig, credentialsJson: WalletCredentials, message: Message, field: string) {
  try {    
    const { [`${field}~sig`]: data, ...signedMessage } = message;

    const signerVerkey = data.signer;
    const signedData = base64url.toBuffer(data.sig_data);
    const signature = base64url.toBuffer(data.signature);

    let valid;
    if (Platform.OS == 'android') {
      valid = await ArnimaSdk.cryptoVerify(JSON.stringify(configJson),
        JSON.stringify(credentialsJson),
        signerVerkey,
        Array.from(signedData),
        Array.from(signature));
    }
    else {
      valid = await ArnimaSdk.cryptoVerify(JSON.stringify(configJson),
        JSON.stringify(credentialsJson),
        signerVerkey,
        data.sig_data,
        JSON.stringify(Array.from(signature)));
    }

    if (!valid) {
      throw new Error('Signature is not valid!');
    }
    const originalMessage = {
      '@type': message['@type'],
      '@id': message['@id'],
      ...signedMessage,
      [`${field}`]: JSON.parse(signedData.slice(8).toString('utf-8')),
    };

    return originalMessage;
  } catch (error) {
    console.log("verify = ", error);
    throw error;
  }
}


export function getServiceEndpoint() {
  let sdkDB: any = DatabaseServices.getWallet();
  let url = `${sdkDB.serviceEndpoint.split("/")[0] + "/" + sdkDB.serviceEndpoint.split("/")[1] + "/" + sdkDB.serviceEndpoint.split("/")[2]}/`;
  return url;
}

export function createOutboundMessage(connection: Connection, payload: Object, invitation?: any) {
  if (invitation) {
    return {
      connection,
      endpoint: invitation.serviceEndpoint,
      payload,
      recipientKeys: invitation.recipientKeys,
      routingKeys: invitation.routingKeys || [],
      senderVk: connection.verkey,
    };
  }

  const { theirDidDoc } = connection;

  if (!theirDidDoc) {
    throw new Error(`DidDoc for connection with verkey ${connection.verkey} not found!`);
  }

  return {
    connection,
    endpoint: theirDidDoc.service[0].serviceEndpoint,
    payload,
    recipientKeys: theirDidDoc.service[0].recipientKeys,
    routingKeys: theirDidDoc.service[0].routingKeys,
    senderVk: connection.verkey,
  };
}


export async function addWalletRecord(config: WalletConfig, credentials: WalletCredentials, type: String, id: String,
  value: String, tags: String) {

  try {
    let response: Boolean = await ArnimaSdk.addWalletRecord(JSON.stringify(config), JSON.stringify(credentials),
      type, id, value, tags);
    return response
  } catch (error) {
    console.log('addWalletRecord = ', error);
    throw error;
  }
}

export enum RecordType {
  Connection = 'Connection',
  TrustPing = 'TrustPing',
  BasicMessage = 'BasicMessage',
  Credential = 'Credential',
  Presentation = 'Presentation',
  MediatorAgent = 'MediatorAgent',
  SSIMessage = 'SSIMessage',
}
