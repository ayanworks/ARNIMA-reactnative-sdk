/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { NativeModules } from 'react-native';
import { Pool, PoolTags } from './PoolInterface';
import {
  Record,
  WalletConfig,
  WalletCredentials,
} from '../wallet/WalletInterface';
import { RecordType } from '../utils/Helpers';
import WalletStorageService from '../wallet/WalletStorageService';

const { ArnimaSdk } = NativeModules;

class PoolService {
  /**
   * Create pool genesis file and set default pool
   *
   * @param {WalletConfig} configJson
   * @param {WalletCredentials} credentialsJson
   * @param {string} poolName
   * @param {string} poolConfig
   * @param {boolean} [defaultPool=false]
   * @return {*}  {Promise<null>}
   * @memberof PoolService
   */
  async createPool(
    configJson: WalletConfig,
    credentialsJson: WalletCredentials,
    poolName: string,
    poolConfig: string,
    defaultPool: boolean = false,
  ): Promise<null> {
    try {
      const response: null = await ArnimaSdk.createPoolLedgerConfig(
        poolName,
        poolConfig,
      );

      if (response === null || response === 'NULL') {
        const poolRecord: Pool = {
          poolName: poolName,
          poolConfig: poolConfig,
        };
        const poolTags: PoolTags = {
          poolName: poolName,
          isSelected: JSON.stringify(defaultPool),
        };
        await WalletStorageService.addWalletRecord(
          configJson,
          credentialsJson,
          RecordType.Pool,
          poolName,
          JSON.stringify(poolRecord),
          JSON.stringify(poolTags),
        );
      }
      return response;
    } catch (error) {
      console.log('Pool - Create pool error = ', error);
      throw error;
    }
  }

  /**
   * Return all the create pool records
   *
   * @param {WalletConfig} configJson
   * @param {WalletCredentials} credentialsJson
   * @return {*}  {Promise<Record[]>}
   * @memberof PoolService
   */
  async getAllPool(
    configJson: WalletConfig,
    credentialsJson: WalletCredentials,
  ): Promise<Record[]> {
    try {
      return await WalletStorageService.getWalletRecordsFromQuery(
        configJson,
        credentialsJson,
        RecordType.Pool,
        '{}',
      );
    } catch (error) {
      console.log('Pool - Get all pools error = ', error);
      throw error;
    }
  }

  /**
   * Update default select pool
   *
   * @param {WalletConfig} configJson
   * @param {WalletCredentials} credentialsJson
   * @param {string} poolName
   * @return {*}  {Promise<boolean>}
   * @memberof PoolService
   */
  async selectDefaultPool(
    configJson: WalletConfig,
    credentialsJson: WalletCredentials,
    poolName: string,
  ): Promise<boolean> {
    try {
      const poolRecords: Array<Record> =
        await WalletStorageService.getWalletRecordsFromQuery(
          configJson,
          credentialsJson,
          RecordType.Pool,
          '{}',
        );
      for await (let record of poolRecords) {
        const pool: Pool = JSON.parse(record.value);
        const poolRecord: Pool = {
          poolName: pool.poolName,
          poolConfig: pool.poolConfig,
        };
        const poolTags: PoolTags = {
          poolName: pool.poolName,
          isSelected: JSON.stringify(false),
        };
        if (pool.poolName === poolName) {
          poolTags.isSelected = JSON.stringify(true);
        }

        await WalletStorageService.updateWalletRecord(
          configJson,
          credentialsJson,
          RecordType.Pool,
          pool.poolName,
          JSON.stringify(poolRecord),
          JSON.stringify(poolTags),
        );
      }
      return true;
    } catch (error) {
      console.log('Pool - Select default pool error = ', error);
      throw error;
    }
  }

  /**
   * Delete all pool records
   *
   * @param {WalletConfig} configJson
   * @param {WalletCredentials} credentialsJson
   * @return {*}  {Promise<boolean>}
   * @memberof PoolService
   */
  async deletePoolRecords(
    configJson: WalletConfig,
    credentialsJson: WalletCredentials,
  ): Promise<boolean> {
    try {
      const poolRecords: Array<Record> =
        await WalletStorageService.getWalletRecordsFromQuery(
          configJson,
          credentialsJson,
          RecordType.Pool,
          '{}',
        );
      for await (let record of poolRecords) {
        const pool: Pool = JSON.parse(record.value);

        await WalletStorageService.deleteWalletRecord(
          configJson,
          credentialsJson,
          RecordType.Pool,
          pool.poolName,
        );
      }
      return true;
    } catch (error) {
      console.log('Pool - delete pool records error = ', error);
      throw error;
    }
  }

  async deleteAllPools(
    configJson: WalletConfig,
    credentialsJson: WalletCredentials,
  ): Promise<boolean> {
    try {
      const poolRecords: Array<Record> =
        await WalletStorageService.getWalletRecordsFromQuery(
          configJson,
          credentialsJson,
          RecordType.Pool,
          '{}',
        );
      for await (let record of poolRecords) {
        const pool: Pool = JSON.parse(record.value);
        await ArnimaSdk.deletePool(pool.poolName);
      }
      return true;
    } catch (error) {
      console.log('Pool - delete all pools error = ', error);
      throw error;
    }
  }
}
export default new PoolService();
