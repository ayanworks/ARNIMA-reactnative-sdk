/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { Connection } from '../protocols/connection/ConnectionInterface';
import { createForwardMessage } from '../protocols/connection/ConnectionMessages';
import { InboundMessage, OutboundMessage } from './Types';
import { InvitationDetails } from '../protocols/connection/InvitationInterface';
import { Message } from './Types';
import { NativeModules, Platform } from "react-native";
import { OutboundAgentMessage } from '../network';
import { WalletConfig, WalletCredentials } from '../wallet/WalletInterface';
import base64url from 'base64url';
import DatabaseServices from '../storage';

const Buffer = require('buffer').Buffer;
global.Buffer = global.Buffer || require('buffer').Buffer

const { ArnimaSdk } = NativeModules;

export enum RecordType {
  Connection = 'Connection',
  TrustPing = 'TrustPing',
  BasicMessage = 'BasicMessage',
  Credential = 'Credential',
  Presentation = 'Presentation',
  MediatorAgent = 'MediatorAgent',
  SSIMessage = 'SSIMessage',
  Pool = 'Pool'
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

export async function verify(configJson: WalletConfig, credentialsJson: WalletCredentials, message: Message, field: string) {
  try {
    const fieldKey = `${field}~sig`
    const { [fieldKey]: data, ...signedMessage } = message;

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

export async function unpackMessage(configJson: WalletConfig, credentialsJson: WalletCredentials, inboundMessage: InboundMessage) {
  try {
    console.log('inboundMessage', inboundMessage)
    const buf = Buffer.from(JSON.stringify(inboundMessage));
    let unpackedBufferMessage;
    if (Platform.OS === 'ios') {
      unpackedBufferMessage = await ArnimaSdk.unpackMessage(JSON.stringify(configJson), JSON.stringify(credentialsJson), JSON.stringify(inboundMessage))
    }
    else {
      unpackedBufferMessage = await ArnimaSdk.unpackMessage(JSON.stringify(configJson), JSON.stringify(credentialsJson), Array.from(buf))
    }
    const unpackedMessage = Buffer.from(unpackedBufferMessage);
    console.log('unpackedMessage', unpackedMessage.toString('utf-8'))
    return JSON.parse(unpackedMessage.toString('utf-8'));
  } catch (error) {
    console.log("unpackMessage = ", error);
    throw error;
  }
}

export async function packMessage(configJson: WalletConfig, credentialsJson: WalletCredentials, outboundMessage: OutboundMessage) {
  try {
    const { routingKeys, recipientKeys, senderVk, payload } = outboundMessage;
    console.log("outboundMessage", outboundMessage)
    const buf = Buffer.from(JSON.stringify(payload));
    let packedBufferMessage;
    if (Platform.OS === 'ios') {
      packedBufferMessage = await ArnimaSdk.packMessage(JSON.stringify(configJson), JSON.stringify(credentialsJson), JSON.stringify(payload), recipientKeys, senderVk)
    }
    else {
      packedBufferMessage = await ArnimaSdk.packMessage(JSON.stringify(configJson), JSON.stringify(credentialsJson), Array.from(buf), recipientKeys, senderVk)
    }
    const packedMessage = Buffer.from(packedBufferMessage);
    const outboundPackedMessage = JSON.parse(packedMessage.toString('utf-8'));

    let message = outboundPackedMessage;
    if (routingKeys && routingKeys.length > 0) {
      for (const routingKey of routingKeys) {
        const [recipientKey] = recipientKeys;
        const forwardMessage = createForwardMessage(recipientKey, message);
        const forwardMessageBuffer = Buffer.from(JSON.stringify(forwardMessage));
        let forwardBufferMessage;
        if (Platform.OS === 'ios') {
          forwardBufferMessage = await ArnimaSdk.packMessage(JSON.stringify(configJson), JSON.stringify(credentialsJson), JSON.stringify(forwardMessage), [routingKey], senderVk)
        }
        else {
          forwardBufferMessage = await ArnimaSdk.packMessage(JSON.stringify(configJson), JSON.stringify(credentialsJson), Array.from(forwardMessageBuffer), [routingKey], senderVk)
        }
        const forwardPackedMessage = Buffer.from(forwardBufferMessage);
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

export function getServiceEndpoint() {
  // TODO : Need to find a way for realm db typing
  const sdkDB: any = DatabaseServices.getWallet();
  return `${sdkDB.serviceEndpoint.split("/")[0] + "/" + sdkDB.serviceEndpoint.split("/")[1] + "/" + sdkDB.serviceEndpoint.split("/")[2]}/`;
}

export function decodeInvitationFromUrl(invitationUrl: string) {
  const [, encodedInvitation] = invitationUrl.split('c_i=');
  return JSON.parse(Buffer.from(encodedInvitation, 'base64').toString());
}

export function encodeInvitationToUrl(invitation: InvitationDetails): string {
  const encodedInvitation = Buffer.from(JSON.stringify(invitation)).toString('base64');
  // TODO : Need to find a way for realm db typing
  const sdkDB: any = DatabaseServices.getWallet();
  return `${sdkDB.serviceEndpoint.split("/")[0] + "/" + sdkDB.serviceEndpoint.split("/")[1] + "/" + sdkDB.serviceEndpoint.split("/")[2]}/ssi?c_i=${encodedInvitation}`;
}

export function decodeBase64(base64Data: string) {
  return JSON.parse(Buffer.from(base64Data, 'base64').toString());
}

export function encodeBase64(data: string) {
  return Buffer.from(JSON.stringify(data)).toString('base64');
}

export function createOutboundMessage(connection: Connection, payload: Object, invitation?: Message) {
  if (connection.didDoc.service[0].serviceEndpoint == 'didcomm:transport/queue') {
    payload['~transport'] = {
      return_route: 'all'
    }
  }
  if (invitation) {
    const { recipientKeys, routingKeys, serviceEndpoint } = invitation;
    return {
      connection,
      endpoint: serviceEndpoint,
      payload,
      recipientKeys: recipientKeys,
      routingKeys: routingKeys || [],
      senderVk: connection.verkey,
    };
  }

  const { theirDidDoc } = connection;

  if (!theirDidDoc) {
    throw new Error(`DidDoc for connection with verkey ${connection.verkey} not found!`);
  }
  const { service } = theirDidDoc
  return {
    connection,
    endpoint: service[0].serviceEndpoint,
    payload,
    recipientKeys: service[0].recipientKeys,
    routingKeys: service[0].routingKeys,
    senderVk: connection.verkey,
  };
}

export async function sendOutboundMessage(configJson: WalletConfig, credentialsJson: WalletCredentials, connection: Connection, message: Object, invitation?: Message) {
  const outboundMessage = await createOutboundMessage(connection, message, invitation);
  const outboundPackMessage = await packMessage(configJson, credentialsJson, outboundMessage);
  await OutboundAgentMessage(outboundMessage.endpoint, 'POST', JSON.stringify(outboundPackMessage));
}

export function replaceDidSovPrefixOnMessage(message) {
  message['@type'] = replaceDidSovPrefix(message['@type'])
}

export function replaceDidSovPrefix(messageType: string) {
  const didSovPrefix = 'did:sov:BzCbsNYhMrjHiqZDTUASHg;spec'
  const didCommPrefix = 'https://didcomm.org'

  if (messageType.startsWith(didCommPrefix)) {
    return messageType.replace(didCommPrefix, didSovPrefix)
  }

  return messageType
}