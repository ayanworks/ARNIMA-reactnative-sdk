/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

import { NativeModules } from 'react-native'
import { Record, WalletStorageRecord } from './WalletInterface'

const { ArnimaSdk } = NativeModules
class WalletStorageService {
  async addWalletRecord(type: string, id: string, value: string, tags: string) {
    try {
      return await ArnimaSdk.addWalletRecord(type, id, value, tags)
    } catch (error) {
      console.log(
        'WalletStorageService - ' + type + ' - Add wallet record = ',
        error,
      )
      throw error
    }
  }

  async updateWalletRecord(
    type: string,
    id: string,
    value: string,
    tags: string,
  ) {
    try {
      return await ArnimaSdk.updateWalletRecord(type, id, value, tags)
    } catch (error) {
      console.log(
        'WalletStorageService - ' + type + ' - Update wallet record = ',
        error,
      )
      throw error
    }
  }

  async deleteWalletRecord(type: string, id: string) {
    try {
      return await ArnimaSdk.deleteWalletRecord(type, id)
    } catch (error) {
      console.log(
        'WalletStorageService - ' + type + ' - Delete wallet record = ',
        error,
      )
      throw error
    }
  }

  async getWalletRecordFromQuery(type: string, query: string) {
    try {
      const queryResponse: string = await ArnimaSdk.getWalletRecordFromQuery(
        type,
        query,
      )

      const walletRecord: WalletStorageRecord = JSON.parse(queryResponse)
      if (walletRecord.records !== null) {
        return JSON.parse(walletRecord.records[0].value)
      } else {
        // For basic message history, I am returning the empty object
        return []
      }
    } catch (error) {
      console.log(
        'WalletStorageService - ' + type + ' - Get wallet record from query = ',
        error,
      )
      throw error
    }
  }

  async getWalletRecordsFromQuery(
    type: string,
    query: string,
  ): Promise<Array<Record>> {
    try {
      const queryResponse: string = await ArnimaSdk.getWalletRecordFromQuery(
        type,
        query,
      )
      const walletRecord: WalletStorageRecord = JSON.parse(queryResponse)
      return walletRecord.records === null ? [] : walletRecord.records
    } catch (error) {
      console.log(
        'WalletStorageService - ' +
          type +
          ' - Get wallet records from query = ',
        error,
      )
      throw error
    }
  }
}
export default new WalletStorageService()
