/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/
package com.arnimasdk;

import android.os.AsyncTask;
import android.os.Environment;
import android.system.ErrnoException;
import android.system.Os;

import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.ReadableArray;
import com.facebook.react.bridge.WritableArray;
import com.facebook.react.bridge.WritableNativeArray;
import com.google.gson.Gson;

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
import java.net.HttpURLConnection;
import java.net.URL;
import java.net.URLConnection;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutionException;

public class ArnimaSdk extends ReactContextBaseJavaModule {

    private final ReactApplicationContext reactContext;
    public static final int PROTOCOL_VERSION = 2;
    private final Map<Integer, Wallet> walletMap;
    private Map<Integer, CredentialsSearchForProofReq> credentialSearchMap;
    private int credentialSearchIterator = 0;

    public ArnimaSdk(ReactApplicationContext reactContext) {
        super(reactContext);
        this.reactContext = reactContext;
        this.walletMap = new ConcurrentHashMap<>();
        this.credentialSearchMap = new ConcurrentHashMap<>();
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
    public void createPoolLedgerConfig(String poolName, String poolConfig, Promise promise) {
        try {
            Pool.setProtocolVersion(PROTOCOL_VERSION).get();

            File file = new File(Environment.getExternalStorageDirectory() + "/" + File.separator + "tempPool.txn");

            file.createNewFile();

            FileWriter fw = new FileWriter(file);
            fw.write(poolConfig);
            fw.close();

            PoolJSONParameters.CreatePoolLedgerConfigJSONParameter createPoolLedgerConfigJSONParameter = new PoolJSONParameters.CreatePoolLedgerConfigJSONParameter(
                    file.getAbsolutePath());

            Pool.createPoolLedgerConfig(poolName, createPoolLedgerConfigJSONParameter.toJson()).get();

            promise.resolve(null);
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.getMessage(), e);
        }
    }

    @ReactMethod
    public void createWallet(String walletConfig, String walletCredentials, Promise promise) {
        new CreateWallet().execute(walletConfig, walletCredentials, promise);
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
    public void openInitWallet(String walletConfig, String walletCredentials, Promise promise) {
        Wallet wallet = null;
        try {
            if (walletMap.size() == 0) {
                wallet = Wallet.openWallet(walletConfig, walletCredentials).get();
                walletMap.put(1, wallet);
            } else {
                wallet = walletMap.get(1);
            }
            promise.resolve(true);
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public Wallet openWallet(String walletConfig, String walletCredentials, Promise promise) {
        Wallet wallet = null;
        try {
            if (walletMap.size() == 0) {
                wallet = Wallet.openWallet(walletConfig, walletCredentials).get();
                walletMap.put(1, wallet);
            } else {
                wallet = walletMap.get(1);
            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        } finally {
            return wallet;
        }
    }

    public Pool openPoolLedger(String poolName, String poolConfig, Promise promise) {
        Pool pool = null;
        try {
            pool = Pool.openPoolLedger(poolName, "{}").get();
            return pool;
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
            return null;
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
    public void createAndStoreMyDid(String walletConfig, String walletCredentials, String didJson,
                                     Boolean createMasterSecret, Promise promise) {
        Wallet wallet = null;
        try {
            wallet = openWallet(walletConfig, walletCredentials, promise);
            if (wallet != null) {
                DidResults.CreateAndStoreMyDidResult createMyDidResult = Did
                        .createAndStoreMyDid(wallet, didJson).get();
                String myDid = createMyDidResult.getDid();
                String myVerkey = createMyDidResult.getVerkey();
                WritableArray response = new WritableNativeArray();
                JSONObject config = new JSONObject(walletConfig);
                response.pushString(myDid);
                response.pushString(myVerkey);
                if ((Boolean) createMasterSecret) {
                    String outputMasterSecretId = Anoncreds
                            .proverCreateMasterSecret(wallet, config.get("id").toString()).get();
                    response.pushString(outputMasterSecretId);
                }
                promise.resolve(response);
            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void addWalletRecord(String walletConfig, String walletCredentials, String recordType, String id, String value, String tags,
                                Promise promise) {
        Wallet wallet = null;
        try {
            wallet = openWallet(walletConfig, walletCredentials, promise);
            if (wallet != null) {
                WalletRecord.add(wallet, recordType, id, value, tags).get();
                promise.resolve("true");
            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void updateWalletRecord(String walletConfig, String walletCredentials, String recordType, String id, String value, String tags,
                                   Promise promise) {
        Wallet wallet = null;
        try {
            wallet = openWallet(walletConfig, walletCredentials, promise);
            if (wallet != null) {
                WalletRecord.updateValue(wallet, recordType, id, value)
                        .get();

                if (!tags.equalsIgnoreCase("{}")) {
                    WalletRecord.updateTags(wallet, recordType, id,tags);
                }
                promise.resolve("true");
            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void deleteWalletRecord(String walletConfig, String walletCredentials, String recordType, String id,
                                   Promise promise) {
        Wallet wallet = null;
        try {
            wallet = openWallet(walletConfig, walletCredentials, promise);
            if (wallet != null) {
                WalletRecord.delete(wallet, recordType, id)
                        .get();
                promise.resolve("true");
            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void getWalletRecordFromQuery(String walletConfig, String walletCredentials, String recordType, String query,
                                         Promise promise) {
        Wallet wallet = null;
        try {
            wallet = openWallet(walletConfig, walletCredentials, promise);
            if (wallet != null) {
                WalletSearch search = WalletSearch.open(wallet, recordType, query, "{\"retrieveTags\":true,\"retrieveType \":true, \"retrieveType\": true }")
                        .get();
                String recordsJson = WalletSearch.searchFetchNextRecords(wallet, search, 100).get();

                promise.resolve(recordsJson);
            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void packMessage(String walletConfig, String walletCredentials, ReadableArray message,
                            ReadableArray receiverKeyArray, String senderVk, Promise promise) {
        Wallet wallet = null;
        try {
            wallet = openWallet(walletConfig, walletCredentials, promise);
            if (wallet != null) {
                byte[] buffer = readableArrayToBuffer((ReadableArray) message);

                ReadableArray receiverKeys = (ReadableArray) receiverKeyArray;
                String[] keys = new String[receiverKeys.size()];
                for (int i = 0; i < receiverKeys.size(); i++) {
                    keys[i] = receiverKeys.getString(i);
                }
                Gson gson = new Gson();
                String receiverKeysJson = gson.toJson(keys);

                byte[] jwe = Crypto.packMessage(wallet, receiverKeysJson, senderVk, buffer).get();
                WritableArray result = new WritableNativeArray();
                for (byte b : jwe) {
                    result.pushInt(b);
                }
                promise.resolve(result);
            }

        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void unpackMessage(String walletConfig, String walletCredentials, ReadableArray jwe, Promise promise) {
        Wallet wallet = null;
        try {
            wallet = openWallet(walletConfig, walletCredentials, promise);
            if (wallet != null) {
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
        }
    }

    @ReactMethod
    public void cryptoSign(String walletConfig, String walletCredentials, String signerVk, ReadableArray messageRaw,
                           Promise promise) {
        Wallet wallet = null;
        try {
            wallet = openWallet(walletConfig, walletCredentials, promise);
            if (wallet != null) {
                byte[] messageBuf = readableArrayToBuffer(messageRaw);
                byte[] signature = Crypto.cryptoSign(wallet, signerVk, messageBuf).get();
                WritableArray result = new WritableNativeArray();
                for (byte b : signature) {
                    result.pushInt(b);
                }
                promise.resolve(result);
            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void cryptoVerify(String walletConfig, String walletCredentials, String signerVk, ReadableArray messageRaw,
                             ReadableArray signatureRaw, Promise promise) {
        Wallet wallet = null;
        try {
            wallet = openWallet(walletConfig, walletCredentials, promise);
            if (wallet != null) {
                byte[] messageBuf = readableArrayToBuffer(messageRaw);
                byte[] sigBuf = readableArrayToBuffer(signatureRaw);
                boolean valid = Crypto.cryptoVerify(signerVk, messageBuf, sigBuf).get();
                promise.resolve(valid);
            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void proverCreateCredentialReq(String walletConfig, String walletCredentials, String proverDid,
                                          String credentialOfferJson, String credentialDefJson, String masterSecret, Promise promise) {
        Wallet wallet = null;
        try {
            wallet = openWallet(walletConfig, walletCredentials, promise);
            if (wallet != null) {
                AnoncredsResults.ProverCreateCredentialRequestResult credentialRequestResult = Anoncreds
                        .proverCreateCredentialReq(wallet, proverDid, credentialOfferJson,
                                credentialDefJson, masterSecret)
                        .get();
                WritableArray response = new WritableNativeArray();
                response.pushString(credentialRequestResult.getCredentialRequestJson());
                response.pushString(credentialRequestResult.getCredentialRequestMetadataJson());
                promise.resolve(response);
            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void proverStoreCredential(String walletConfig, String walletCredentials, String credId,
                                      String credReqMetadataJson, String credJson, String credDefJson, String revRegDefJson, Promise promise) {
        Wallet wallet = null;
        try {
            wallet = openWallet(walletConfig, walletCredentials, promise);
            if (wallet != null) {
                String  newCredId = Anoncreds.proverStoreCredential(wallet, credId, credReqMetadataJson,
                            credJson, credDefJson, revRegDefJson).get();
                promise.resolve(newCredId);
            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void getRevocRegDefJson(String poolName, String poolConfig, String submitterDid, String revRegDefId, Promise promise) {
        Pool pool = null;
        try {
            pool = openPoolLedger(poolName, poolConfig, promise);
            String revocRegDefJsonRequest = Ledger.buildGetRevocRegDefRequest(submitterDid, revRegDefId).get();
            String revocRegDefJsonResponse = Ledger.submitRequest(pool, revocRegDefJsonRequest).get();
            LedgerResults.ParseResponseResult responseResult = Ledger.parseGetRevocRegDefResponse(revocRegDefJsonResponse).get();
            promise.resolve(responseResult.getObjectJson());
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        } finally {
            if (pool != null) {
                closePoolLedger(pool);
            }
        }
    }

    @ReactMethod
    public void getRevocRegsJson(String poolName, String poolConfig, String submitterDid, String revRegDefId, String timestamp, Promise promise) {
        Pool pool = null;
        try {
            pool = openPoolLedger(poolName, poolConfig, promise);
            String revocRegsJsonRequest = Ledger.buildGetRevocRegRequest(submitterDid, revRegDefId, Long.parseLong(timestamp)).get();
            String revocRegsJsonResponse = Ledger.submitRequest(pool, revocRegsJsonRequest).get();
            LedgerResults.ParseRegistryResponseResult responseResult = Ledger.parseGetRevocRegResponse(revocRegsJsonResponse).get();
            promise.resolve(responseResult.getObjectJson());
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        } finally {
            if (pool != null) {
                closePoolLedger(pool);
            }
        }
    }

    @ReactMethod
    public void verifierVerifyProof(String proofRequest, String proof,
                                    String schemas, String credentialDefs, String revRegDefs, String revRegsObj, Promise promise) {
        try {
            Boolean verification = Anoncreds.verifierVerifyProof(proofRequest, proof, schemas, credentialDefs, revRegDefs, revRegsObj).get();
            promise.resolve(verification);
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void proverGetCredentials(String walletConfig, String walletCredentials, String filter, Promise promise) {
        Wallet wallet = null;
        try {
            wallet = openWallet(walletConfig, walletCredentials, promise);
            if (wallet != null) {
                String credentials = Anoncreds.proverGetCredentials(wallet, filter).get();
                promise.resolve(credentials);
            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void proverGetCredential(String walletConfig, String walletCredentials, String credId, Promise promise) {
        Wallet wallet = null;
        try {
            wallet = openWallet(walletConfig, walletCredentials, promise);
            if (wallet != null) {
                String credential = Anoncreds.proverGetCredential(wallet, credId).get();
                promise.resolve(credential);
            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void getCredDef(String submitterDid, String id, String poolName, String poolConfig, Promise promise) {
        Pool pool = null;
        try {
            String credDefRequest = Ledger.buildGetCredDefRequest(submitterDid, id).get();
            pool = openPoolLedger(poolName, poolConfig, promise);
            if (pool != null) {
                String credDefResponse = Ledger.submitRequest(pool,  credDefRequest).get();

                LedgerResults.ParseResponseResult responseResult = Ledger.parseGetCredDefResponse(credDefResponse).get();
                promise.resolve(responseResult.getObjectJson());
            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        } finally {
            if (pool != null) {
                closePoolLedger(pool);
            }
        }
    }

    @ReactMethod
    public void getRevocRegDef(String submitterDid, String id, String poolName, String poolConfig, Promise promise) {
        Pool pool = null;
        try {
            String revocRegDefRequest = Ledger.buildGetRevocRegDefRequest(submitterDid, id).get();

            pool = openPoolLedger(poolName, poolConfig, promise);
            if (pool != null) {
                String revocRegDefResponse = Ledger.submitRequest(pool, revocRegDefRequest).get();
                LedgerResults.ParseResponseResult responseResult = Ledger.parseGetRevocRegDefResponse(revocRegDefResponse).get();
                promise.resolve(responseResult.getObjectJson());

            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        } finally {
            if (pool != null) {
                closePoolLedger(pool);
            }
        }
    }

    private JSONObject getCredDefJson(Pool pool, String submitterDid, String credDefId) throws Exception {
        JSONObject parseCredObj = new JSONObject();
        try {
            String credDefJsonRequest = Ledger.buildGetCredDefRequest(submitterDid, credDefId).get();
            String credDefJsonResponse = Ledger.submitRequest(pool, credDefJsonRequest).get();
            LedgerResults.ParseResponseResult responseResult = Ledger.parseGetCredDefResponse(credDefJsonResponse).get();

            parseCredObj = new JSONObject(responseResult.getObjectJson());

        } catch (Exception e) {
            throw new Exception(e.toString());
        }
        return parseCredObj;
    }

    @ReactMethod
    public void getSchemasJson(String poolName, String poolConfig, String submitterDid, String schemaId, Promise promise) {
        Pool pool = null;
        try {
            pool = openPoolLedger(poolName, poolConfig, promise);
            String schemaJsonRequest = Ledger.buildGetSchemaRequest(submitterDid, schemaId).get();
            String schemaJsonResponse = Ledger.submitRequest(pool, schemaJsonRequest).get();
            LedgerResults.ParseResponseResult responseResult = Ledger.parseGetSchemaResponse(schemaJsonResponse).get();

            promise.resolve(responseResult.getObjectJson());
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        } finally {
            if (pool != null) {
                closePoolLedger(pool);
            }
        }
    }

    @ReactMethod
    public void proverCreateProof(String walletConfig, String walletCredentials, String proofRequest,
                                  String requestedCredentials, String masterSecret, String schemas, String credentialDefs, String revocObject, Promise promise) {
        Wallet wallet = null;
        try {
            wallet = openWallet(walletConfig, walletCredentials, promise);
            if (wallet != null) {
                String cred_proof = Anoncreds.proverCreateProof(wallet, proofRequest,
                        String.valueOf(requestedCredentials), masterSecret, String.valueOf(schemas),
                        String.valueOf(credentialDefs), String.valueOf(revocObject)).get();
                promise.resolve(cred_proof);
            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void proverSearchCredentialsForProofReq(String proofRequest, Promise promise) {
        try {
            int searchHandle = credentialSearchIterator++;
            Wallet wallet = walletMap.get(1);
            CredentialsSearchForProofReq search = CredentialsSearchForProofReq.open(wallet, proofRequest, "{}").get();
            credentialSearchMap.put(searchHandle, search);
            promise.resolve(searchHandle);
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void proverFetchCredentialsForProofReq(int searchHandle, String itemReferent, int count, Promise promise) {
        try {
            CredentialsSearchForProofReq search = credentialSearchMap.get(searchHandle);
            String recordsJson = search.fetchNextCredentials(itemReferent, count).get();
            promise.resolve(recordsJson);
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void proverCloseCredentialsSearchForProofReq(int searchHandle, Promise promise) {
        try {
            CredentialsSearchForProofReq search = credentialSearchMap.get(searchHandle);
            search.close();
            credentialSearchMap.remove(searchHandle);
            promise.resolve(null);
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void getSchema(String submitterDid, String schemaId, String poolName, String poolConfig, Promise promise) {
        Pool pool = null;
        try {
            String schemaJsonRequest = Ledger.buildGetSchemaRequest(submitterDid, schemaId).get();
            pool = openPoolLedger(poolName, poolConfig, promise);
            if (pool != null) {
                String schemaJsonResponse = Ledger.submitRequest(pool, schemaJsonRequest).get();
                LedgerResults.ParseResponseResult responseResult = Ledger.parseGetSchemaResponse(schemaJsonResponse).get();
                promise.resolve(responseResult.getObjectJson());
            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        } finally {
            if (pool != null) {
                closePoolLedger(pool);
            }
        }
    }

    private JSONObject getSchemaJson(Pool pool, String submitterDid, String schemaId) throws Exception {
        JSONObject parseSchemaObj = new JSONObject();
        try {
            String schemaJsonRequest = Ledger.buildGetSchemaRequest(submitterDid, schemaId).get();
            String schemaJsonResponse = Ledger.submitRequest(pool, schemaJsonRequest).get();
            LedgerResults.ParseResponseResult responseResult = Ledger.parseGetSchemaResponse(schemaJsonResponse).get();

            parseSchemaObj = new JSONObject(responseResult.getObjectJson());

        } catch (Exception e) {
            throw new Exception(e.toString());
        }
        return parseSchemaObj;
    }

    @ReactMethod
    public void createRevocationStateObject(String poolName, String poolConfig, String submitterDid, String revRegId,
                                            String credRevId,
            String fromTime,String toTime,Promise promise)
            throws Exception {
        Pool pool = null;
        JSONObject revocState = new JSONObject();

        try {
            pool = openPoolLedger(poolName, poolConfig, promise);
            if (pool != null) {
                long from=Long.parseLong(fromTime);
                long to=Long.parseLong(toTime);

                String revocRegDeltaRequest = Ledger
                    .buildGetRevocRegDeltaRequest(submitterDid, revRegId, from, to).get();
                String revocRegDeltaResponse = Ledger.submitRequest(pool, revocRegDeltaRequest).get();
                LedgerResults.ParseRegistryResponseResult revRegDeltaJson = Ledger.parseGetRevocRegDeltaResponse(revocRegDeltaResponse)
                        .get();

                String revocRegDefRequest = Ledger.buildGetRevocRegDefRequest(submitterDid, revRegId).get();
                String revocRegDefReponse = Ledger.submitRequest(pool, revocRegDefRequest).get();
                LedgerResults.ParseResponseResult revocRegDefJson = Ledger
                        .parseGetRevocRegDefResponse(revocRegDefReponse).get();

                String rootDir = getCurrentActivity().getExternalFilesDir(null).toString();

                String filePath = rootDir + "/revoc/";

                JSONObject revRegDefObject = new JSONObject(revocRegDefJson.getObjectJson());
                String fileURL = revRegDefObject.getJSONObject("value").getString("tailsLocation");
                String fileName = revRegDefObject.getJSONObject("value").getString("tailsHash");

                int count;
                File revocFilePath = new File(filePath);
                if (!revocFilePath.exists()) {
                    revocFilePath.mkdir();
                }

                File revocFile = new File(filePath + "/" + fileName);
                if (!revocFile.exists()) {
                    revocFile.createNewFile();
                    URL url = new URL(fileURL);

                    URLConnection connection = url.openConnection();
                    connection.connect();
                    InputStream input = new BufferedInputStream(url.openStream(), 8192);
                    OutputStream output = new FileOutputStream(revocFile);
                    byte[] data = new byte[1024];
                    long total = 0;
                    while ((count = input.read(data)) != -1) {
                        total += count;
                        output.write(data, 0, count);
                    }
                    output.flush();
                    output.close();
                    input.close();
                }

                String tailsWriterConfig = new JSONObject().put("base_dir", filePath).put("uri_pattern", "").toString();
                BlobStorageReader blobStorageReaderCfg = BlobStorageReader.openReader("default", tailsWriterConfig).get();

                JSONObject revStateJson = new JSONObject(Anoncreds.createRevocationState(
                        blobStorageReaderCfg.getBlobStorageReaderHandle(), revocRegDefJson.getObjectJson(),
                        revRegDeltaJson.getObjectJson(), revRegDeltaJson.getTimestamp(), credRevId).get());

                revocState.put(String.valueOf(revRegDeltaJson.getTimestamp()), revStateJson);

                promise.resolve(revocState.toString());
            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        } finally {
            if (pool != null) {
                closePoolLedger(pool);
            }
        }
    }

    @ReactMethod
    public void exportWallet(String walletConfig, String walletCredentials, String config, Promise promise) {
        Wallet wallet = null;
        try {
            wallet = openWallet(walletConfig, walletCredentials, promise);
            if (wallet != null) {
                Wallet.exportWallet(wallet, config).get();
                promise.resolve("true");
            }
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    @ReactMethod
    public void importWallet(String walletConfig, String walletCredentials, String config, String types, Promise promise) {
        Wallet wallet = null;
        JSONArray finalObj = new JSONArray();
        try {
            Wallet.importWallet(walletConfig, walletCredentials, config).get();
            wallet = openWallet(walletConfig, walletCredentials, promise);
            if (wallet != null) {
                JSONArray typesArray = new JSONArray(types);
                for (int i = 0; i < typesArray.length(); i++) {
                    JSONObject j = typesArray.getJSONObject(i);

                    WalletSearch search = WalletSearch.open(wallet, j.getString("type"), "{}", "{\"retrieveTags\":true,\"retrieveType \":true, \"retrieveType\": true, \"retrieveTotalCount\": true }")
                            .get();
                    String recordsJson = WalletSearch.searchFetchNextRecords(wallet, search, 100).get();
                    JSONObject convert = new JSONObject(recordsJson);
                    if (convert.getInt("totalCount") > 0) {
                        JSONArray records = convert.getJSONArray("records");
                        for (int z = 0; z < records.length(); z++) {
                            finalObj.put(records.get(z));
                            WalletRecord.delete(wallet, j.getString("type"), records.getJSONObject(z).getString("id"));
                        }
                    }
                }
            }
            promise.resolve(finalObj.toString());
        } catch (Exception e) {
            IndySdkRejectResponse rejectResponse = new IndySdkRejectResponse(e);
            promise.reject(rejectResponse.getCode(), rejectResponse.toJson(), e);
        }
    }

    private byte[] readableArrayToBuffer(ReadableArray arr) {
        byte[] buffer = new byte[arr.size()];
        for (int i = 0; i < arr.size(); i++) {
            buffer[i] = (byte) arr.getInt(i);
        }
        return buffer;
    }


    @ReactMethod
    public void getRequestRedirectionUrl(String url, Promise promise) {
        new GetRequestRedirectionUrl().execute(url, promise);
    }

    private class GetRequestRedirectionUrl extends AsyncTask {
        Promise promise = null;

        @Override
        protected Object doInBackground(Object[] objects) {
            try {
                promise = (Promise) objects[1];
                URL urlObj = new URL(objects[0].toString());

                HttpURLConnection connection = (HttpURLConnection) urlObj.openConnection();
                connection.setRequestMethod("GET");
                connection.setInstanceFollowRedirects(false);

                int responseCode = connection.getResponseCode();

                if (responseCode == 302) {
                    String location = connection.getHeaderField("location");
                    promise.resolve(location);
                }
                promise.reject("Unable to fetch URL", "Unable to fetch URL");
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

    class IndySdkRejectResponse {
        private final String code;
        private final String message;

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