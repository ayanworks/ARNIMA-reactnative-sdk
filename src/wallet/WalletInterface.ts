/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

export interface WalletConfig {
  id: string;
  storage_type?: string[];
  storage_config?: StorageConfig;
}

export interface WalletCredentials {
  key: string;
}

export interface DidJson {
  did?: string;
  seed?: string;
  method_name?: string;
}

interface StorageConfig {
  path?: string
}

export interface WalletRecord {
  walletConfig: WalletConfig;
  walletCredentials: WalletCredentials;
  label: String;
  serviceEndpoint: String;
  routingKey: String;
  publicDid: String;
  verKey: String;
  masterSecretId: String;
}

export interface WalletStorageRecord {
  totalCount: number | null;
  records: Array<Record>
}

export interface Record {
  type: string,
  id: string,
  value: string,
  tags: Object
}