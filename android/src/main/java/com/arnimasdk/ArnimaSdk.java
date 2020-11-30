/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

package com.arnimasdk;

import android.os.AsyncTask;
import android.os.Environment;
import android.system.ErrnoException;
import android.system.Os;
import android.util.Log;

import com.facebook.common.file.FileUtils;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableNativeArray;
import com.google.gson.Gson;
import com.google.gson.JsonObject;

import org.hyperledger.indy.sdk.IndyException;
import org.hyperledger.indy.sdk.anoncreds.Anoncreds;
import org.hyperledger.indy.sdk.anoncreds.AnoncredsResults;
import org.hyperledger.indy.sdk.anoncreds.CredentialsSearchForProofReq;
import org.hyperledger.indy.sdk.blob_storage.BlobStorageReader;
import org.hyperledger.indy.sdk.crypto.Crypto;
import org.hyperledger.indy.sdk.did.Did;
import org.hyperledger.indy.sdk.did.DidResults;
import org.hyperledger.indy.sdk.ledger.Ledger;
import org.hyperledger.indy.sdk.ledger.LedgerResults;
import org.hyperledger.indy.sdk.non_secrets.WalletRecord;
import org.hyperledger.indy.sdk.non_secrets.WalletSearch;
import org.hyperledger.indy.sdk.pool.Pool;
import org.hyperledger.indy.sdk.pool.PoolJSONParameters;
import org.hyperledger.indy.sdk.wallet.Wallet;
import org.json.JSONArray;
import org.json.JSONObject;

import java.io.BufferedInputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.FileWriter;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.URL;
import java.net.URLConnection;
import java.util.ArrayList;
import java.util.Iterator;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;

public class ArnimaSdk extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;
    private static final String DEFAULT_POOL_NAME = "pool";
    public static final int PROTOCOL_VERSION = 2;
    private String ErrorCode = "ERROR";

    public ArnimaSdk(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        try {
            Os.setenv("EXTERNAL_STORAGE", reactContext.getExternalFilesDir(null).getAbsolutePath(), true);
            System.loadLibrary("indy");
        } catch (ErrnoException e) {
            e.printStackTrace();
        }
    }

    @Override
    public String getName() {
    return "ArnimaSdk";
  }

    @ReactMethod
    public void createPoolLedgerConfig(String poolConfigString, Promise promise) {
        new CreatePoolLedgerConfig().execute(poolConfigString, promise);
    }

    private class CreatePoolLedgerConfig extends AsyncTask {
        Promise promise = null;

        @Override
        protected Object doInBackground(Object[] objects) {

            try {
                promise = (Promise) objects[1];
                Pool.setProtocolVersion(PROTOCOL_VERSION).get();

                File file = new File(Environment.getExternalStorageDirectory() + "/" + File.separator + "temp.txn");

                file.createNewFile();

                FileWriter fw = new FileWriter(file);
                fw.write(objects[0].toString());
                fw.close();

                PoolJSONParameters.CreatePoolLedgerConfigJSONParameter createPoolLedgerConfigJSONParameter = new PoolJSONParameters.CreatePoolLedgerConfigJSONParameter(
                        file.getAbsolutePath());

                Pool.createPoolLedgerConfig(DEFAULT_POOL_NAME, createPoolLedgerConfigJSONParameter.toJson()).get();

                promise.resolve(null);
            } catch (Exception e) {
                IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
                promise.reject(rejectResponse.getCode(), rejectResponse.getMessage(), e);
            }
            return promise;
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
        }
    }

    @ReactMethod
    public void createWallet(String configJson, String credentialsJson, Promise promise) {
        new CreateWallet().execute(configJson, credentialsJson, promise);
    }

    private class CreateWallet extends AsyncTask {
        Promise promise = null;

        @Override
        protected Object doInBackground(Object[] objects) {

            try {
                promise = (Promise) objects[2];
                Wallet.createWallet(objects[0].toString(), objects[1].toString()).get();
                promise.resolve(null);
            } catch (Exception e) {
                IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
                promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
            }
            return promise;
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
        }
    }

    @ReactMethod
    public Wallet openWallet(String configJson, String credentialsJson, Promise promise) {
        Wallet wallet = null;
        try {
            wallet = Wallet.openWallet(configJson, credentialsJson).get();

        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        } finally {
            return wallet;
        }
    }

    public Pool openPoolLedger(String poolConfig, Promise promise) {
        Pool pool = null;
        try {
            pool = Pool.openPoolLedger(DEFAULT_POOL_NAME, poolConfig).get();
            return pool;
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
            return null;
        }
    }

    public void closeWallet(Wallet wallet) {
        try {
            wallet.closeWallet().get();
        } catch (IndyException e) {
            e.printStackTrace();
        } catch (InterruptedException e) {
            e.printStackTrace();
        } catch (ExecutionException e) {
            e.printStackTrace();
        }
    }

    public void closePoolLedger(Pool pool) {
        try {
            pool.closePoolLedger().get();
        } catch (InterruptedException e) {
            e.printStackTrace();
        } catch (ExecutionException e) {
            e.printStackTrace();
        } catch (IndyException e) {
            e.printStackTrace();
        }
    }

    @ReactMethod
    public void createAndStoreMyDids(String configJson, String credentialsJson, String didJson,
            Boolean createMasterSecret, Promise promise) {
        new CreateAndStoreMyDids().execute(configJson, credentialsJson, didJson, createMasterSecret, promise);
    }

    private class CreateAndStoreMyDids extends AsyncTask {
        Promise promise = null;

        @Override
        protected Object doInBackground(Object[] objects) {

            Wallet wallet = null;
            promise = (Promise) objects[4];
            try {
                wallet = openWallet(objects[0].toString(), objects[1].toString(), promise);
                if (wallet != null) {
                    DidResults.CreateAndStoreMyDidResult createMyDidResult = Did
                            .createAndStoreMyDid(wallet, objects[2].toString()).get();
                    String myDid = createMyDidResult.getDid();
                    String myVerkey = createMyDidResult.getVerkey();
                    WritableArray response = new WritableNativeArray();
                    JSONObject config = new JSONObject(objects[0].toString());
                    response.pushString(myDid);
                    response.pushString(myVerkey);
                    if ((Boolean) objects[3]) {
                        String outputMasterSecretId = Anoncreds
                                .proverCreateMasterSecret(wallet, config.get("id").toString()).get();
                        response.pushString(outputMasterSecretId);
                    }
                    promise.resolve(response);
                }
            } catch (Exception e) {
                IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
                promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
            } finally {
                if (wallet != null) {
                    closeWallet(wallet);
                }
                return promise;
            }
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
        }
    }

    // ********* non_secrets ********* //

    @ReactMethod
    public void addWalletRecord(String configJson, String credentialsJson, String type, String id, String value, String tags,
                                Promise promise) {
        new AddWalletRecord().execute(configJson, credentialsJson, type, id, value, tags,promise);
    }

    private class AddWalletRecord extends AsyncTask {
        Promise promise = null;

        @Override
        protected Object doInBackground(Object[] objects) {

            promise = (Promise) objects[6];
            Wallet wallet = null;
            try {
                wallet = openWallet(objects[0].toString(), objects[1].toString(), promise);
                if (wallet != null) {
                    WalletRecord.add(wallet, objects[2].toString(), objects[3].toString(), objects[4].toString(),objects[5].toString()).get();
                    promise.resolve("true");
                }
            } catch (Exception e) {
                IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
                promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
            } finally {
                if (wallet != null) {
                    closeWallet(wallet);
                }
                return promise;
            }
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
        }
    }

    @ReactMethod
    public void updateWalletRecord(String configJson, String credentialsJson, String type, String id, String value, String tags,
                                Promise promise) {
        new updateWalletRecord().execute(configJson, credentialsJson, type, id, value, tags,promise);
    }

    private class updateWalletRecord extends AsyncTask {
        Promise promise = null;

        @Override
        protected Object doInBackground(Object[] objects) {

            promise = (Promise) objects[6];
            Wallet wallet = null;
            try {
                wallet = openWallet(objects[0].toString(), objects[1].toString(), promise);
                if (wallet != null) {
                    WalletRecord.updateValue(wallet, objects[2].toString(), objects[3].toString(), objects[4].toString())
                            .get();

                    if(!objects[5].toString().equalsIgnoreCase("{}")) {
                        WalletRecord.updateTags(wallet,objects[2].toString(), objects[3].toString(),objects[5].toString());
                    }
                    promise.resolve("true");
                }
            } catch (Exception e) {
                IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
                promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
            } finally {
                if (wallet != null) {
                    closeWallet(wallet);
                }
                return promise;
            }
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
        }
    }

    @ReactMethod
    public void deleteWalletRecord(String configJson, String credentialsJson, String type, String id,
                                   Promise promise) {
        new deleteWalletRecord().execute(configJson, credentialsJson, type, id,promise);
    }

    private class deleteWalletRecord extends AsyncTask {
        Promise promise = null;

        @Override
        protected Object doInBackground(Object[] objects) {

            promise = (Promise) objects[4];
            Wallet wallet = null;
            try {
                wallet = openWallet(objects[0].toString(), objects[1].toString(), promise);
                if (wallet != null) {
                    WalletRecord.delete(wallet, objects[2].toString(), objects[3].toString())
                            .get();
                    promise.resolve("true");
                }
            } catch (Exception e) {
                IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
                promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
            } finally {
                if (wallet != null) {
                    closeWallet(wallet);
                }
                return promise;
            }
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
        }
    }

    @ReactMethod
    public void getWalletRecordFromQuery(String configJson, String credentialsJson, String type, String query,
                                   Promise promise) {
        new getWalletRecordFromQuery().execute(configJson, credentialsJson, type, query,promise);
    }

    private class getWalletRecordFromQuery extends AsyncTask {
        Promise promise = null;

        @Override
        protected Object doInBackground(Object[] objects) {

            promise = (Promise) objects[4];
            Wallet wallet = null;
            try {
                wallet = openWallet(objects[0].toString(), objects[1].toString(), promise);
                if (wallet != null) {
                    WalletSearch search  = WalletSearch.open(wallet, objects[2].toString(), objects[3].toString(), "{\"retrieveTags\":true,\"retrieveType \":true, \"retrieveType\": true }")
                            .get();
                    String recordsJson = WalletSearch.searchFetchNextRecords(wallet, search, 100).get();

                    promise.resolve(recordsJson);
                }
            } catch (Exception e) {
                IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
                promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
            } finally {
                if (wallet != null) {
                    closeWallet(wallet);
                }
                return promise;
            }
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
        }
    }


    @ReactMethod
    public void packMessage(String configJson, String credentialsJson, ReadableArray message,
            ReadableArray receiverKeys, String senderVk, Promise promise) {
        new PackMessage().execute(configJson, credentialsJson, message, receiverKeys, senderVk, promise);
    }

    private class PackMessage extends AsyncTask {
        Promise promise = null;

        @Override
        protected Object doInBackground(Object[] objects) {

            promise = (Promise) objects[5];
            Wallet wallet = null;
            try {
                wallet = openWallet(objects[0].toString(), objects[1].toString(), promise);
                if (wallet != null) {
                    byte[] buffer = readableArrayToBuffer((ReadableArray) objects[2]);

                    ReadableArray receiverKeys = (ReadableArray) objects[3];
                    String[] keys = new String[receiverKeys.size()];
                    for (int i = 0; i < receiverKeys.size(); i++) {
                        keys[i] = receiverKeys.getString(i);
                    }
                    Gson gson = new Gson();
                    String receiverKeysJson = gson.toJson(keys);

                    byte[] jwe = Crypto.packMessage(wallet, receiverKeysJson, objects[4].toString(), buffer).get();
                    WritableArray result = new WritableNativeArray();
                    for (byte b : jwe) {
                        result.pushInt(b);
                    }
                    promise.resolve(result);
                }

            } catch (Exception e) {
                IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
                promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
            } finally {
                if (wallet != null) {
                    closeWallet(wallet);
                }
                return promise;
            }
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
        }
    }

    @ReactMethod
    public void unpackMessage(String configJson, String credentialsJson, ReadableArray jwe, Promise promise) {
        new UnpackMessage().execute(configJson, credentialsJson, jwe, promise);
    }

    private class UnpackMessage extends AsyncTask {
        Promise promise = null;

        @Override
        protected Object doInBackground(Object[] objects) {

            promise = (Promise) objects[3];
            Wallet wallet = null;
            try {
                wallet = openWallet(objects[0].toString(), objects[1].toString(), promise);
                if (wallet != null) {
                    ReadableArray jwe = (ReadableArray) objects[2];
                    byte[] buffer = readableArrayToBuffer(jwe);
                    byte[] res = Crypto.unpackMessage(wallet, buffer).get();

                    WritableArray result = new WritableNativeArray();
                    for (byte b : res) {
                        result.pushInt(b);
                    }
                    promise.resolve(result);
                }
            } catch (Exception e) {
                IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
                promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
            } finally {
                if (wallet != null) {
                    closeWallet(wallet);
                }
                return promise;
            }
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
        }
    }

    @ReactMethod
    public void cryptoSign(String configJson, String credentialsJson, String signerVk, ReadableArray messageRaw,
            Promise promise) {
        new cryptoSign().execute(configJson, credentialsJson, signerVk, messageRaw, promise);
    }

    private class cryptoSign extends AsyncTask {
        Promise promise = null;

        @Override
        protected Object doInBackground(Object[] objects) {

            promise = (Promise) objects[4];

            Wallet wallet = null;
            try {
                wallet = openWallet(objects[0].toString(), objects[1].toString(), promise);
                if (wallet != null) {
                    ReadableArray messageRaw = (ReadableArray) objects[3];
                    byte[] messageBuf = readableArrayToBuffer(messageRaw);
                    byte[] signature = Crypto.cryptoSign(wallet, objects[2].toString(), messageBuf).get();
                    WritableArray result = new WritableNativeArray();
                    for (byte b : signature) {
                        result.pushInt(b);
                    }
                    promise.resolve(result);
                }
            } catch (Exception e) {
                IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
                promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
            } finally {
                if (wallet != null) {
                    closeWallet(wallet);
                }
                return promise;
            }
        }
    }

    @ReactMethod
    public void cryptoVerify(String configJson, String credentialsJson, String signerVk, ReadableArray messageRaw,
            ReadableArray signatureRaw, Promise promise) {
        new CryptoVerify().execute(configJson, credentialsJson, signerVk, messageRaw, signatureRaw, promise);
    }

    private class CryptoVerify extends AsyncTask {
        Promise promise = null;

        @Override
        protected Object doInBackground(Object[] objects) {

            promise = (Promise) objects[5];

            Wallet wallet = null;
            try {
                wallet = openWallet(objects[0].toString(), objects[1].toString(), promise);
                if (wallet != null) {
                    ReadableArray messageRaw = (ReadableArray) objects[3];
                    ReadableArray signatureRaw = (ReadableArray) objects[4];
                    byte[] messageBuf = readableArrayToBuffer(messageRaw);
                    byte[] sigBuf = readableArrayToBuffer(signatureRaw);
                    boolean valid = Crypto.cryptoVerify(objects[2].toString(), messageBuf, sigBuf).get();
                    promise.resolve(valid);
                }
            } catch (Exception e) {
                IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
                promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
            } finally {
                if (wallet != null) {
                    closeWallet(wallet);
                }
                return promise;
            }
        }

        @Override
        protected void onPreExecute() {
            super.onPreExecute();
        }
    }

    private byte[] readableArrayToBuffer(ReadableArray arr) {
        byte[] buffer = new byte[arr.size()];
        for (int i = 0; i < arr.size(); i++) {
            buffer[i] = (byte) arr.getInt(i);
        }
        return buffer;
    }


    class IndySdkRejectResponse {
        private String code;
        private String message;

        private IndySdkRejectResponse(Throwable e) {
            String code = "0";

            if (e instanceof ExecutionException) {
                Throwable cause = e.getCause();
                if (cause instanceof IndyException) {
                    IndyException indyException = (IndyException) cause;
                    code = String.valueOf(indyException.getSdkErrorCode());
                }
            }

            String message = e.getMessage();

            this.code = code;
            this.message = message;
        }

        public String getCode() {
            return code;
        }

        public String getMessage() {
            return message;
        }

        public String toJson() {
            Gson gson = new Gson();
            return gson.toJson(this);
        }
    }
}
