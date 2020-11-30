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