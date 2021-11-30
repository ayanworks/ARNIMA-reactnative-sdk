/*
 Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
 SPDX-License-Identifier: Apache-2.0
 */

#import "RNArnimaSdk.h"
#import <React/RCTBridge.h>
#import <Indy/Indy.h>
#import "URLSessionWithRedirection.h"
@implementation ArnimaSdk

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(openInitWallet: (NSString *)config
                  :(NSString *)walletCredentials
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    [[IndyWallet sharedInstance]openWalletWithConfig:config credentials:walletCredentials completion:^(NSError *error, IndyHandle walletHandle) {
        if(error.code > 1) {
            [self rejectResult:error reject:reject];
            
        }else {
            self->WalletHandleNumber = walletHandle;
            resolve(@YES);
        }
    }];
}

-(void) openWallet: (NSString *)config
                  :(NSString *)walletCredentials
        completion:(void (^)(IndyHandle walletHandle))completion
{
    if (WalletHandleNumber > 0) {
        completion(WalletHandleNumber);
    } else {
        [[IndyWallet sharedInstance]openWalletWithConfig:config credentials:walletCredentials completion:^(NSError *error, IndyHandle walletHandle) {
            if(error.code > 1) {
                if (self->WalletHandleNumber > 0) {
                    completion(self->WalletHandleNumber);
                }
            }else {
                
                self->WalletHandleNumber = walletHandle;
                completion(self->WalletHandleNumber);
            }
        }];
    }
}

RCT_EXPORT_METHOD(getRequestRedirectionUrl:(NSString *)url
                  resolver: (RCTPromiseResolveBlock) resolve
                  rejecter: (RCTPromiseRejectBlock) reject)
{
    NSURLSession *session = [NSURLSession sessionWithConfiguration:[NSURLSessionConfiguration defaultSessionConfiguration]
                                                          delegate:[URLSessionWithRedirection new]
                                                     delegateQueue:[NSOperationQueue mainQueue]];


  NSURL *urlObj = [NSURL URLWithString:url];
  NSURLSessionDataTask *dataTask = [session dataTaskWithURL: urlObj
                completionHandler:^(NSData *data, NSURLResponse *responseObj, NSError *error) {
    if (error != nil) {
        reject(@"Failed to fetch URL", @"Failed to fetch URL", error);
      return;
    }

    NSHTTPURLResponse* response =(NSHTTPURLResponse*)responseObj;

    long statusCode = (long)[response statusCode];

    if (statusCode != 302) {
    reject(@"Failed to fetch URL: unexpected response status", @"Failed to fetch URL: unexpected response status", error);
      return;
    }
    NSDictionary* headers = [(NSHTTPURLResponse*)response allHeaderFields];
    NSString* location = [headers objectForKey:@"location"];
    resolve(location);
  }];
  [dataTask resume];
}

RCT_EXPORT_METHOD(createWallet:
                  (NSString *)config
                  :(NSString *)walletCredentials
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    [[IndyWallet sharedInstance] createWalletWithConfig:config credentials:walletCredentials completion:^(NSError *error) {
        if(error.code > 1) {
            [self rejectResult:error reject:reject];
        }
        else {
            resolve(@"Wallet created successfully");
        }
    }];
}

RCT_EXPORT_METHOD(exportWallet:
                  (NSString *)walletConfig
                  :(NSString *)walletCredentials
                  :(NSString *)config
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    [self openWallet:walletConfig :walletCredentials completion:^(IndyHandle walletHandle) {
        if (walletHandle > 0) {
            [[IndyWallet sharedInstance] exportWalletWithHandle:walletHandle exportConfigJson:config completion:^(NSError *errorWhileExportWallet) {
                if(errorWhileExportWallet.code > 1) {
                    [self rejectResult:errorWhileExportWallet reject:reject];
                }
                else {
                    resolve(@"true");
                }
            }];
        }
    }];
}

RCT_EXPORT_METHOD(importWallet:
                  (NSString *)walletConfig
                  :(NSString *)walletCredentials
                  :(NSString *)config
                  :(NSString *)types
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject){
    NSData *data = [types dataUsingEncoding:NSUTF8StringEncoding];
    id jsonData = [NSJSONSerialization JSONObjectWithData:data options:0 error:nil];
    [[IndyWallet sharedInstance] importWalletWithConfig:walletConfig credentials:walletCredentials importConfigJson:config completion:^(NSError *errorWhileImportWallet) {
        if(errorWhileImportWallet.code > 1) {
            [self rejectResult:errorWhileImportWallet reject:reject];
        }
        else {
            [self openWallet:walletConfig :walletCredentials completion:^(IndyHandle walletHandle) {
                if (walletHandle > 0) {
                    NSMutableArray *newArray = [[NSMutableArray alloc] init];
                    int loopValue = 0;
                    NSUInteger jsonDataLength = [jsonData count];
                    if (jsonDataLength > 0) {
                        for (NSDictionary *data in jsonData) {
                            loopValue = loopValue + 1;
                            [IndyNonSecrets openSearchInWallet:walletHandle type:[data valueForKey:@"type"] queryJson:@"{}" optionsJson:@"{\"retrieveTags\":true,\"retrieveType \":true, \"retrieveType\": true, \"retrieveTotalCount\": true }" completion:^(NSError *errorWhileOpenSearchWallet, IndyHandle searchHandle) {
                                if(errorWhileOpenSearchWallet.code > 1) {
                                    [self rejectResult:errorWhileOpenSearchWallet reject:reject];
                                }
                                else {
                                    [IndyNonSecrets fetchNextRecordsFromSearch:searchHandle walletHandle:walletHandle count:@(100) completion:^(NSError *errorWhileFetchNextRecord, NSString *recordsJson) {
                                        if(errorWhileFetchNextRecord.code > 1) {
                                            [self rejectResult:errorWhileFetchNextRecord reject:reject];
                                        }
                                        else {
                                            
                                            dispatch_semaphore_t convertSemaphore = dispatch_semaphore_create(0);
                                            NSData *recordsJsonData = [recordsJson dataUsingEncoding:NSUTF8StringEncoding];
                                            id records = [NSJSONSerialization JSONObjectWithData:recordsJsonData options:0 error:nil];
                                            dispatch_semaphore_signal(convertSemaphore);
                                            
                                            dispatch_semaphore_wait(convertSemaphore, DISPATCH_TIME_FOREVER);
                                            
                                            if([[records valueForKey:@"totalCount"] intValue] > 0) {
                                                NSArray *newRecords = [records valueForKey:@"records"];
                                                if ([newRecords count] > 0) {
                                                    for (id dataToPush in newRecords) {
                                                        [newArray addObject:dataToPush];
                                                        [IndyNonSecrets deleteRecordInWallet:walletHandle type:[data valueForKey:@"type"] id:[dataToPush valueForKey:@"id"] completion:^(NSError *errorWhileDeleteRecord) {
                                                            if(errorWhileDeleteRecord.code > 1) {
                                                                [self rejectResult:errorWhileDeleteRecord reject:reject];
                                                            } else {
                                                                NSLog(@"in else of delete");
                                                            }
                                                        }];
                                                    }
                                                    
                                                } else {
                                                    resolve(newRecords);
                                                }
                                            }
                                            if (loopValue >= jsonDataLength) {
                                                resolve(newArray);
                                            }
                                        }
                                    }];
                                }
                            }];
                        }
                    } else {
                        resolve(newArray);
                    }
                }
            }];
        }
    }];
}

RCT_EXPORT_METHOD(createAndStoreMyDid:
                  (NSString *)walletConfig
                  :(NSString *)walletCredentials
                  :(NSString *)didJson
                  :(BOOL)createMasterSecret
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    [self openWallet:walletConfig :walletCredentials completion:^(IndyHandle walletHandle) {
        if (walletHandle > 0) {
            [IndyDid createAndStoreMyDid:walletConfig walletHandle:walletHandle completion:^(NSError *errorWhileCreateDid, NSString *did, NSString *verkey) {
                if(errorWhileCreateDid.code > 1) {
                    [self rejectResult:errorWhileCreateDid reject:reject];
                    
                }
                else {
                    if(createMasterSecret == true) {
                        NSData *credentialData = [walletConfig dataUsingEncoding:NSUTF8StringEncoding];
                        id credentialDataJSON = [NSJSONSerialization JSONObjectWithData:credentialData options:0 error:nil];
                        NSString *masterSecret = [credentialDataJSON objectForKey:@"id"];
                        [IndyAnoncreds proverCreateMasterSecret:masterSecret walletHandle:walletHandle completion:^(NSError *errorWhileCreateMasterSecret, NSString *outMasterSecretId) {
                            NSMutableArray *results = [NSMutableArray array];
                            [results addObject:did];
                            [results addObject:verkey];
                            [results addObject:outMasterSecretId];
                            resolve(results);
                        }];
                    }
                    else {
                        NSMutableArray *results = [NSMutableArray array];
                        [results addObject:did];
                        [results addObject:verkey];
                        [results addObject:@""];
                        resolve(results);
                    }
                }
            }];
        }
    }];
}

RCT_EXPORT_METHOD(addWalletRecord:
                  (NSString *)walletConfig
                  :(NSString *)walletCredentials
                  :(NSString *)Type
                  :(NSString *)Id
                  :(NSString *)value
                  :(NSString *)tags
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    [self openWallet:walletConfig :walletCredentials completion:^(IndyHandle walletHandle) {
        if (walletHandle > 0) {
            [IndyNonSecrets addRecordInWallet:walletHandle type:Type id:Id value:value tagsJson:tags completion:^(NSError *errorWhileAddRecord) {
                if(errorWhileAddRecord.code > 1) {
                    [self rejectResult:errorWhileAddRecord reject:reject];
                }
                else {
                    resolve(@"true");
                }
            }];
        }
        
    }];
}

RCT_EXPORT_METHOD(updateWalletRecord:
                  (NSString *)walletConfig
                  :(NSString *)walletCredentials
                  :(NSString *)type
                  :(NSString *)Id
                  :(NSString *)value
                  :(NSString *)tag
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    
    [self openWallet:walletConfig :walletCredentials completion:^(IndyHandle walletHandle) {
        if (walletHandle > 0) {
            [IndyNonSecrets updateRecordValueInWallet:walletHandle type:type id:Id value:value completion:^(NSError *errorWhileUpdateRecordValue) {
                if(errorWhileUpdateRecordValue.code > 1) {
                    [self rejectResult:errorWhileUpdateRecordValue reject:reject];
                }
                else {
                    if(![tag isEqualToString:@"{}"]) {
                        [IndyNonSecrets updateRecordTagsInWallet:walletHandle type:type id:Id tagsJson:tag completion:^(NSError *errorWhileUpdateRecordTag) {
                            if(errorWhileUpdateRecordTag.code > 1) {
                                [self rejectResult:errorWhileUpdateRecordTag reject:reject];
                            }
                            else {
                                resolve(@"true");
                            }
                        }];
                    }
                    else {
                        resolve(@"true");
                    }
                }
            }];
        }
        
    }];
}


RCT_EXPORT_METHOD(deleteWalletRecord:
                  (NSString *)walletConfig
                  :(NSString *)walletCredentials
                  :(NSString *)type
                  :(NSString *)Id
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject){
    [self openWallet:walletConfig :walletCredentials completion:^(IndyHandle walletHandle) {
        if (walletHandle > 0) {
            [IndyNonSecrets deleteRecordInWallet:walletHandle type:type id:Id completion:^(NSError *errorWhileDeleteREcord) {
                if(errorWhileDeleteREcord.code > 1) {
                    [self rejectResult:errorWhileDeleteREcord reject:reject];
                }
                else {
                    resolve(@"true");
                }
            }];
        }
    }];
    
    
}


RCT_EXPORT_METHOD(getWalletRecordFromQuery:
                  (NSString *)walletConfig
                  :(NSString *)walletCredentials
                  :(NSString *)type
                  :(NSString *)query
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    [self openWallet:walletConfig :walletCredentials completion:^(IndyHandle walletHandle) {
        if (walletHandle > 0) {
            [IndyNonSecrets openSearchInWallet:walletHandle type:type queryJson:query optionsJson:@"{\"retrieveTags\":true,\"retrieveType  \":true, \"retrieveType\": true }" completion:^(NSError *errorOS, IndyHandle searchHandle) {
                if(errorOS.code > 1) {
                    [self rejectResult:errorOS reject:reject];
                }
                else {
                    [IndyNonSecrets fetchNextRecordsFromSearch:searchHandle walletHandle:walletHandle count:@(100) completion:^(NSError *errorWhileFetchRecords, NSString *recordsJson) {
                        if(errorWhileFetchRecords.code > 1) {
                            [self rejectResult:errorWhileFetchRecords reject:reject];
                        }
                        else {
                            resolve(recordsJson);
                        }
                    }];
                }
            }];
        }
        
    }];
    
}


RCT_EXPORT_METHOD(cryptoSign:
                  (NSString *)walletConfig
                  :(NSString *)walletCredentials
                  :(NSString *)signerKey
                  :(NSString *)messageRaw
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    [self openWallet:walletConfig :walletCredentials completion:^(IndyHandle walletHandle) {
        if (walletHandle > 0) {
            NSData *jsonData = [messageRaw dataUsingEncoding:NSUTF8StringEncoding];
            [IndyCrypto signMessage:jsonData key:signerKey walletHandle:walletHandle completion:^(NSError *errorWhileSignMessage, NSData *signature) {
                if(errorWhileSignMessage.code > 1) {
                    [self rejectResult:errorWhileSignMessage reject:reject];
                }
                else {
                    
                    uint8_t * signatureBytesArray = (uint8_t  * )[signature bytes];
                    NSInteger length = [signature length];
                    
                    NSMutableArray *resultArray = [NSMutableArray new];
                    
                    for (int i = 0 ; i < length; i ++)
                    {
                        NSNumber *singleByte = [NSNumber numberWithInt:signatureBytesArray[i]];
                        [resultArray addObject:singleByte];
                    }
                    resolve(resultArray);
                }
            }];
        }
        
    }];
    
}

RCT_EXPORT_METHOD(packMessage:
                  (NSString *)walletConfig
                  :(NSString *)walletCredentials
                  :(NSString *)message
                  :(NSArray *)receiverKeys
                  :(NSString *)senderVerkey
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    [self openWallet:walletConfig :walletCredentials completion:^(IndyHandle walletHandle) {
        if (walletHandle > 0) {
            [IndyCrypto createKey:@"{}" walletHandle:walletHandle completion:^(NSError *errorWhileCreateKey, NSString *verkey1) {
                if(errorWhileCreateKey.code > 1) {
                }
                else {
                    NSArray *receivers = receiverKeys;
                    
                    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:receivers options:0 error:nil];
                    
                    NSString *receiversJson = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
                    NSData *messageData = [message dataUsingEncoding:NSUTF8StringEncoding];
                    
                    [IndyCrypto packMessage:messageData receivers:receiversJson sender:senderVerkey walletHandle:walletHandle completion:^(NSError *errorWhilePackMessage, NSData *jwe) {
                        if(errorWhilePackMessage.code > 1) {
                            [self rejectResult:errorWhilePackMessage reject:reject];
                        }
                        else {
                            NSString* result = [[NSString alloc] initWithData:jwe encoding:NSUTF8StringEncoding];
                            resolve(result);
                        }
                    }];
                }
            }];
        }
    }];
    
    
}

RCT_EXPORT_METHOD(unpackMessage:
                  (NSString *)walletConfig
                  :(NSString *)walletCredentials
                  :(NSString *)message
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    [self openWallet:walletConfig :walletCredentials completion:^(IndyHandle walletHandle) {
        if (walletHandle > 0) {
            NSData *messageData = [message dataUsingEncoding:NSUTF8StringEncoding];
            [IndyCrypto unpackMessage:messageData walletHandle:walletHandle completion:^(NSError *errorWhileUnpackMessage, NSData *unPackMessageData) {
                if(errorWhileUnpackMessage.code > 1) {
                    [self rejectResult:errorWhileUnpackMessage reject:reject];
                }
                else {
                    NSString* result = [[NSString alloc] initWithData:unPackMessageData encoding:NSUTF8StringEncoding];
                    resolve(result);
                }
            }];
        }
        
    }];
    
    
}

RCT_EXPORT_METHOD(cryptoVerify:
                  (NSString *)walletConfig
                  :(NSString *)walletCredentials
                  :(NSString *)signVerkey
                  :(NSString *)message
                  :(NSString *)signatureRaw
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    NSData *messageData = [message dataUsingEncoding:NSUTF8StringEncoding];
    [self openWallet:walletConfig :walletCredentials completion:^(IndyHandle walletHandle) {
        if (walletHandle > 0) {
            NSData *revocRegDefJsonData = [signatureRaw dataUsingEncoding:NSUTF8StringEncoding];
            id generatedRevocRegDefJsonData = [NSJSONSerialization JSONObjectWithData:revocRegDefJsonData options:0 error:nil];
            
            
            NSInteger charcter = [generatedRevocRegDefJsonData count];
            uint8_t *bytes = malloc(sizeof(*bytes) * charcter);
            
            NSInteger i;
            for (i = 0; i < charcter; i++)
            {
                NSString *newString = [generatedRevocRegDefJsonData objectAtIndex:i];
                int byte = [newString intValue];
                bytes[i] = byte;
            }
            
            NSData *imageData = [NSData dataWithBytesNoCopy:bytes length:charcter freeWhenDone:YES];
            
            
            [IndyCrypto verifySignature:imageData forMessage:messageData key:signVerkey completion:^(NSError *errorWhileVerifySignature, BOOL valid) {
                if(errorWhileVerifySignature.code > 1) {
                    [self rejectResult:errorWhileVerifySignature reject:reject];
                }
                else {
                    if(valid == true) {
                        resolve(@"true");
                    }
                    else {
                        resolve(@"false");
                    }
                }
            }];
        }
        
    }];
}

RCT_EXPORT_METHOD(createPoolLedgerConfig:
                  (NSString *) poolNameString
                  :(NSString *) poolConfigString
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    NSString *genesisTXNs = poolConfigString;
    
    NSString *filePath;
    NSMutableString *path = [NSMutableString stringWithString:NSTemporaryDirectory()];
    
    filePath = [NSString stringWithFormat:@"%@%@.txn", path, poolNameString];
    
    [[NSFileManager defaultManager] createFileAtPath:filePath
                                            contents:[NSData dataWithBytes:[genesisTXNs UTF8String] length:[genesisTXNs length]]
                                          attributes:nil];
    
    NSString *poolConfig = [NSString stringWithFormat:@"{\"genesis_txn\":\"%@\"}", filePath];
    
    NSString *configStr = (poolConfig) ? poolConfig : @"";
    
    [IndyPool setProtocolVersion:@(2) completion:^(NSError *error) {
        if(error.code > 1) {
            [self rejectResult:error reject:reject];
        }
    }];
    
    [IndyPool createPoolLedgerConfigWithPoolName:poolNameString poolConfig:configStr completion:^(NSError *errorWhileCreatePool) {
        if(errorWhileCreatePool.code > 1) {
            [self rejectResult:errorWhileCreatePool reject:reject];
        }
        else {
            resolve(@"NULL");
        }
    }];
}



RCT_EXPORT_METHOD(proverCreateCredentialReq:
                  (NSString *)walletConfig
                  :(NSString *)credentialsJson
                  :(NSString *)proverDid
                  :(NSString *)credentialOfferJson
                  :(NSString *)credentialDefJson
                  :(NSString *)masterSecretId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    [self openWallet:walletConfig :credentialsJson completion:^(IndyHandle walletHandle) {
        if (walletHandle > 0) {
            [IndyAnoncreds proverCreateCredentialReqForCredentialOffer:credentialOfferJson credentialDefJSON:credentialDefJson proverDID:proverDid masterSecretID:masterSecretId walletHandle:walletHandle completion:^(NSError *errorWhileCreateRequest, NSString *credReqJSON, NSString *credReqMetadataJSON) {
                if(errorWhileCreateRequest.code > 1) {
                    [self rejectResult:errorWhileCreateRequest reject:reject];
                }
                else {
                    NSMutableArray *resultArray = [NSMutableArray array];
                    [resultArray addObject:credReqJSON];
                    [resultArray addObject:credReqMetadataJSON];
                    resolve(resultArray);
                }
            }];
        }
    }];
}

RCT_EXPORT_METHOD(proverStoreCredential:
                  (NSString *)walletConfig
                  :(NSString *)credentialsJson
                  :(NSString *)credId
                  :(NSString *)credReqMetadataJson
                  :(NSString *)credJson
                  :(NSString *)credDefJson
                  :(NSString *)revRegDefJson
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject){
    [self openWallet:walletConfig :credentialsJson completion:^(IndyHandle walletHandle) {
        if (walletHandle > 0) {
            [IndyAnoncreds proverStoreCredential:credJson credID:credId credReqMetadataJSON:credReqMetadataJson credDefJSON:credDefJson revRegDefJSON:revRegDefJson walletHandle:walletHandle completion:^(NSError *errorWhileStoreCredential, NSString *outCredID) {
                if(errorWhileStoreCredential.code > 1) {
                    [self rejectResult:errorWhileStoreCredential reject:reject];
                }
                else {
                    resolve(outCredID);
                }
            }];
        }
    }];
}

RCT_EXPORT_METHOD(proverGetCredentials:
                  (NSString *)walletConfig
                  :(NSString *)credentialsJson
                  :(NSString *)filter
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject){
    [self openWallet:walletConfig :credentialsJson completion:^(IndyHandle walletHandle) {
        if (walletHandle > 0) {
            [IndyAnoncreds proverGetCredentialsForFilter:filter walletHandle:walletHandle completion:^(NSError *errorWhileGetCredential, NSString *credentialsJSON) {
                if(errorWhileGetCredential.code > 1) {
                    [self rejectResult:errorWhileGetCredential reject:reject];
                }
                else {
                    resolve(credentialsJSON);
                }
            }];
        }
    }];
    
}

RCT_EXPORT_METHOD(getRevocRegDef:
                  (NSString *)submitterDid
                  :(NSString *)ID
                  :(NSString *)poolName
                  :(NSString *)poolConfig
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject){
    [IndyPool setProtocolVersion:@(2) completion:^(NSError *error) {
        NSLog(@"Protocol version is set");
    }];
    [IndyPool openPoolLedgerWithName:poolName poolConfig:nil completion:^(NSError *errorWhileOpenPool, IndyHandle poolHandle) {
        if(errorWhileOpenPool.code > 1) {
            [self rejectResult:errorWhileOpenPool reject:reject];
        }
        else {
            [IndyLedger buildGetRevocRegDefRequestWithSubmitterDid:submitterDid id:ID completion:^(NSError *errorWhileRevocRegDefRequest, NSString *requestJSON) {
                if(errorWhileRevocRegDefRequest.code > 1) {

                    [self closePool:poolHandle :errorWhileRevocRegDefRequest :nil :NO resolve:resolve reject:reject];
                }
                else {
                    [IndyLedger submitRequest:requestJSON poolHandle:poolHandle completion:^(NSError *errorWhileSubmitRequest, NSString *requestResultJSON) {
                        if(errorWhileSubmitRequest.code > 1) {

                            [self closePool:poolHandle :errorWhileSubmitRequest :nil :NO resolve:resolve reject:reject];

                        }
                        else {
                            [IndyLedger parseGetRevocRegDefResponse:requestResultJSON completion:^(NSError *errorWhileParseRevRegDefResponse, NSString *revocRegDefId, NSString *revocRegDefJson) {
                                if(errorWhileParseRevRegDefResponse.code > 1) {

                                    [self closePool:poolHandle :errorWhileParseRevRegDefResponse :nil :NO resolve:resolve reject:reject];

                                }
                                else {
                                  [self closePool:poolHandle :nil :revocRegDefJson :YES resolve:resolve reject:reject];
                                }
                            }];
                        }
                    }];
                }
            }];
        }
    }];
}


RCT_EXPORT_METHOD(getRevocRegDefJson
                  :(NSString *)poolName
                  :(NSString *)poolConfig
                  :(NSString *)submitterDid
                  :(NSString *)revRegDefId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    __block IndyHandle poolHandle;
    
    dispatch_semaphore_t openPoolSemaphore = dispatch_semaphore_create(0);
    [IndyPool openPoolLedgerWithName:poolName poolConfig:nil completion:^(NSError *errorInOpenPool, IndyHandle generatedPoolHandle) {
        if(errorInOpenPool.code > 1) {
            [self rejectResult:errorInOpenPool reject:reject];
        }
        else {
            poolHandle = generatedPoolHandle;
            dispatch_semaphore_signal(openPoolSemaphore);
        }
    }];
    dispatch_semaphore_wait(openPoolSemaphore, DISPATCH_TIME_FOREVER);
    
    __block NSString *requestJSONRevDef = [[NSString alloc] init];
    dispatch_semaphore_t buildRevDefSemaphore = dispatch_semaphore_create(0);
    [IndyLedger buildGetRevocRegDefRequestWithSubmitterDid:submitterDid id:revRegDefId completion:^(NSError *errorWhileRevocRegDefRequest, NSString *generatedRequestJSON) {
        if(errorWhileRevocRegDefRequest.code > 1) {

            [self closePool:poolHandle :errorWhileRevocRegDefRequest :nil :NO resolve:resolve reject:reject];

        }
        else {
            requestJSONRevDef = generatedRequestJSON;
            dispatch_semaphore_signal(buildRevDefSemaphore);
        }
    }];
    dispatch_semaphore_wait(buildRevDefSemaphore, DISPATCH_TIME_FOREVER);
    
    __block NSString *requestResultJSONSchema = [[NSString alloc] init];
    
    dispatch_semaphore_t submitReqSchemaSemaphore = dispatch_semaphore_create(0);
    
    [IndyLedger submitRequest:requestJSONRevDef poolHandle:poolHandle completion:^(NSError *errorInSubmitRequest, NSString *generatedRequestResultJSON) {
        if(errorInSubmitRequest.code > 1) {
            [self closePool:poolHandle :errorInSubmitRequest :nil :NO resolve:resolve reject:reject];
        }
        else {
            requestResultJSONSchema = generatedRequestResultJSON;
            dispatch_semaphore_signal(submitReqSchemaSemaphore);
        }
    }];
    dispatch_semaphore_wait(submitReqSchemaSemaphore, DISPATCH_TIME_FOREVER);
    
    dispatch_semaphore_t parseSchemaResponseSemaphore = dispatch_semaphore_create(0);
    __block NSString *returnCall = [[NSString alloc] init];
    
    [IndyLedger parseGetRevocRegDefResponse:requestResultJSONSchema completion:^(NSError *error, NSString *revocRegDefId, NSString *revocRegDefJson) {
        if(error.code > 1) {
            returnCall = @"YES";
            dispatch_semaphore_signal(parseSchemaResponseSemaphore);
            [self closePool:poolHandle :error :nil :NO resolve:resolve reject:reject];
        }
        else {
            [self closePool:poolHandle :nil :revocRegDefJson :YES resolve:resolve reject:reject];
            dispatch_semaphore_signal(parseSchemaResponseSemaphore);
        }
    }];
    dispatch_semaphore_wait(parseSchemaResponseSemaphore, DISPATCH_TIME_FOREVER);
    if ([returnCall  isEqual: @"YES"]) {
            return;
        }
}


RCT_EXPORT_METHOD(getRevocRegsJson
                  :(NSString *)poolName
                  :(NSString *)poolConfig
                  :(NSString *)submitterDid
                  :(NSString *)revRegDefId
                  :(NSString *)timestamp
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    __block IndyHandle poolHandle;
    
    dispatch_semaphore_t openPoolSemaphore = dispatch_semaphore_create(0);
    [IndyPool openPoolLedgerWithName:poolName poolConfig:nil completion:^(NSError *errorInOpenPool, IndyHandle generatedPoolHandle) {
        if(errorInOpenPool.code > 1) {
            [self rejectResult:errorInOpenPool reject:reject];
        }
        else {
            poolHandle = generatedPoolHandle;
            dispatch_semaphore_signal(openPoolSemaphore);
        }
    }];
    dispatch_semaphore_wait(openPoolSemaphore, DISPATCH_TIME_FOREVER);
    
    __block NSString *regrequestJSONRevDef = [[NSString alloc] init];
    dispatch_semaphore_t regrequestJSONRevDefSemaphore = dispatch_semaphore_create(0);
    
    NSNumberFormatter *formatter = [[NSNumberFormatter alloc] init];
    formatter.numberStyle = NSNumberFormatterDecimalStyle;
    NSNumber *timeStampValue = [formatter numberFromString:timestamp];
    
    
    [IndyLedger buildGetRevocRegRequestWithSubmitterDid:submitterDid revocRegDefId:revRegDefId timestamp:timeStampValue completion:^(NSError *errorInBuildGetRevRegReqWithDid, NSString *requestJSON) {
        if(errorInBuildGetRevRegReqWithDid.code > 1) {

            [self closePool:poolHandle :errorInBuildGetRevRegReqWithDid :nil :NO resolve:resolve reject:reject];

        }
        else {
            regrequestJSONRevDef = requestJSON;
            dispatch_semaphore_signal(regrequestJSONRevDefSemaphore);
        }
    }];
    dispatch_semaphore_wait(regrequestJSONRevDefSemaphore, DISPATCH_TIME_FOREVER);
    
    __block NSString *requestResultJSONSchema = [[NSString alloc] init];
    dispatch_semaphore_t submitReqSchemaSemaphore = dispatch_semaphore_create(0);
    [IndyLedger submitRequest:regrequestJSONRevDef poolHandle:poolHandle completion:^(NSError *errorInSubmitRequest, NSString *generatedRequestResultJSON) {
        if(errorInSubmitRequest.code > 1) {
            [self closePool:poolHandle :errorInSubmitRequest :nil :NO resolve:resolve reject:reject];
        }
        else {
            requestResultJSONSchema = generatedRequestResultJSON;
            dispatch_semaphore_signal(submitReqSchemaSemaphore);
        }
    }];
    dispatch_semaphore_wait(submitReqSchemaSemaphore, DISPATCH_TIME_FOREVER);
    
    
    dispatch_semaphore_t parseRevDefSemaphore2 = dispatch_semaphore_create(0);
    
    [IndyLedger parseGetRevocRegResponse:requestResultJSONSchema completion:^(NSError *errorInparseRevRegResponse, NSString *revocRegDefId, NSString *revocRegJson, NSNumber *timestamp) {
        if(errorInparseRevRegResponse.code > 1) {
            [self closePool:poolHandle :errorInparseRevRegResponse :nil :NO resolve:resolve reject:reject];

        }
        else {
            [self closePool:poolHandle :nil :revocRegJson :YES resolve:resolve reject:reject];

            dispatch_semaphore_signal(parseRevDefSemaphore2);
        }
    }];
    
    dispatch_semaphore_wait(parseRevDefSemaphore2, DISPATCH_TIME_FOREVER);
    
}


RCT_EXPORT_METHOD(verifierVerifyProof
                  :(NSString *)proofRequest
                  :(NSString *)proof
                  :(NSString *)schemas
                  :(NSString *)credDefs
                  :(NSString *)revocRegDefs
                  :(NSString *)revocRegObject
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    [IndyAnoncreds verifierVerifyProofRequest:proofRequest proofJSON:proof schemasJSON:schemas credentialDefsJSON:credDefs revocRegDefsJSON:revocRegDefs revocRegsJSON:revocRegObject completion:^(NSError *error, BOOL valid) {
        if (valid){
            resolve(@YES);
        } else {
            resolve(@NO);
        }
        
    }];
}


RCT_EXPORT_METHOD(proverSearchCredentialsForProofReq: (NSString *)proofRequest
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    [IndyAnoncreds proverSearchCredentialsForProofRequest:proofRequest extraQueryJSON:nil walletHandle:self->WalletHandleNumber completion:^(NSError *errorSearchCredentialsForPR, IndyHandle generatedSearchHandle) {
        if(errorSearchCredentialsForPR.code > 1) {
            [self rejectResult:errorSearchCredentialsForPR reject:reject];
        }
        else {
            NSNumber *searchHandler = [NSNumber numberWithInt:generatedSearchHandle];
            resolve(searchHandler);
        }
    }];
}

RCT_EXPORT_METHOD(proverFetchCredentialsForProofReq:(int) searchHandle :(NSString *)itemReferent
                  :(int) count
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    IndyHandle value = searchHandle;
    
    [IndyAnoncreds proverFetchCredentialsForProofReqItemReferent:itemReferent searchHandle:value count:[NSNumber numberWithInt:count] completion:^(NSError *errorfetchCredItemReferent, NSString *generatedCredentialsJson) {
        if([generatedCredentialsJson isEqualToString:@"[]"]) {
            if(errorfetchCredItemReferent.code > 1) {
                [self rejectResult:errorfetchCredItemReferent reject:reject];
                
            } else{
                NSLog(@"In ELSE Condition");
                resolve(generatedCredentialsJson);
            }
        }
        else {
            resolve(generatedCredentialsJson);
        }
    }];
    
}


RCT_EXPORT_METHOD(proverCloseCredentialsSearchForProofReq
                  :(int) searchHandle
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    IndyHandle value = searchHandle ;
    
    [IndyAnoncreds proverCloseCredentialsSearchForProofReqWithHandle:value completion:^(NSError *error) {
        
        if(error.code > 1) {
            [self rejectResult:error reject:reject];
        }
        else {
            resolve(NSNull.null);
        }
    }];
    
}

RCT_EXPORT_METHOD(proverGetCredential
                  :(NSString *) walletConfig
                  :(NSString *) walletCredentials
                  :(NSString *) credId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    [self openWallet:walletConfig :walletCredentials completion:^(IndyHandle walletHandle) {
        if (walletHandle > 0) {
            [IndyAnoncreds proverGetCredentialWithId:credId walletHandle:walletHandle completion:^(NSError *error, NSString *credentialJSON) {
                if(error.code > 1) {
                    [self rejectResult:error reject:reject];
                }
                else {
                    resolve(credentialJSON);
                }
            }];
        }
    }];
    
}

RCT_EXPORT_METHOD(getSchemasJson
                  :(NSString *) poolName
                  :(NSString *) poolConfig
                  :(NSString *) submitterDid
                  :(NSString *) schemaId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    __block IndyHandle poolHandle;
    
    dispatch_semaphore_t openPoolSemaphore = dispatch_semaphore_create(0);
    [IndyPool openPoolLedgerWithName:poolName poolConfig:nil completion:^(NSError *errorOpenPool, IndyHandle generatedPoolHandle) {
        if(errorOpenPool.code > 1) {
            [self rejectResult:errorOpenPool reject:reject];
        }
        else {
            poolHandle = generatedPoolHandle;
            dispatch_semaphore_signal(openPoolSemaphore);
        }
    }];
    dispatch_semaphore_wait(openPoolSemaphore, DISPATCH_TIME_FOREVER);
    
    dispatch_semaphore_t buildGetSchemaReqSemaphore = dispatch_semaphore_create(0);
    
    
    __block NSString *requestJSONSchema = [[NSString alloc] init];
    
    [IndyLedger buildGetSchemaRequestWithSubmitterDid:submitterDid id:schemaId completion:^(NSError *errorInBuildGetSchemaRequest, NSString *generatedRequestJSON) {
        if(errorInBuildGetSchemaRequest.code > 1) {
            [self closePool:poolHandle :errorInBuildGetSchemaRequest :nil :NO resolve:resolve reject:reject];

        }
        else {
            requestJSONSchema = generatedRequestJSON;
            dispatch_semaphore_signal(buildGetSchemaReqSemaphore);
        }
    }];
    
    dispatch_semaphore_wait(buildGetSchemaReqSemaphore, DISPATCH_TIME_FOREVER);
    
    dispatch_semaphore_t submitReqSchemaSemaphore = dispatch_semaphore_create(0);
    
    __block NSString *requestResultJSONSchema = [[NSString alloc] init];
    
    
    [IndyLedger submitRequest:requestJSONSchema poolHandle:poolHandle completion:^(NSError *errorInSubmitRequest, NSString *generatedRequestResultJSON) {
        if(errorInSubmitRequest.code > 1) {
            [self closePool:poolHandle :errorInSubmitRequest :nil :NO resolve:resolve reject:reject];

        }
        else {
            requestResultJSONSchema = generatedRequestResultJSON;
            dispatch_semaphore_signal(submitReqSchemaSemaphore);
        }
    }];
    dispatch_semaphore_wait(submitReqSchemaSemaphore, DISPATCH_TIME_FOREVER);
    
    __block NSString *schemaJSON = [[NSString alloc] init];
    dispatch_semaphore_t parseSchemaResponseSemaphore = dispatch_semaphore_create(0);
    __block NSString *returnCall = [[NSString alloc] init];
    [IndyLedger parseGetSchemaResponse:requestResultJSONSchema completion:^(NSError *errorInParseSchemaResponse, NSString *schemaId, NSString *generatedSchemaJson) {
        if(errorInParseSchemaResponse.code > 1) {
            dispatch_semaphore_signal(parseSchemaResponseSemaphore);
            returnCall = @"YES";
            [self closePool:poolHandle :errorInParseSchemaResponse :nil :NO resolve:resolve reject:reject];
        }
        else {
            schemaJSON = generatedSchemaJson;
            dispatch_semaphore_signal(parseSchemaResponseSemaphore);

            [self closePool:poolHandle :nil :generatedSchemaJson :YES resolve:resolve reject:reject];
        }
    }];
    dispatch_semaphore_wait(parseSchemaResponseSemaphore, DISPATCH_TIME_FOREVER);
    
    if ([returnCall  isEqual: @"YES"]) {
        return;
    }
    
}

RCT_EXPORT_METHOD(getCredDef:
                  (NSString *)submitterDid
                  :(NSString *)credId
                  :(NSString *)poolName
                  :(NSString *)poolConfig
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject){
    [IndyPool setProtocolVersion:@(2) completion:^(NSError *error) {
        
    }];
    
    
    [IndyPool openPoolLedgerWithName:poolName poolConfig:nil completion:^(NSError *errorWhileOpenPool, IndyHandle poolHandle) {
        if(errorWhileOpenPool.code > 1) {
            [self rejectResult:errorWhileOpenPool reject:reject];
        }
        else {
            [IndyLedger buildGetCredDefRequestWithSubmitterDid:submitterDid id:credId completion:^(NSError *errorWhileGetCredDefRequest, NSString *requestJSON) {
                if(errorWhileGetCredDefRequest.code > 1) {
                    [self rejectResult:errorWhileGetCredDefRequest reject:reject];
                }
                else {
                    [IndyLedger submitRequest:requestJSON poolHandle:poolHandle completion:^(NSError *errorWhileSubmitRequest, NSString *requestResultJSON) {
                        if(errorWhileSubmitRequest.code > 1) {
                            [self rejectResult:errorWhileSubmitRequest reject:reject];
                        }
                        else {
                            [IndyLedger parseGetCredDefResponse:requestResultJSON completion:^(NSError *errorWhileParseCredDefResponse, NSString *credDefId, NSString *credDefJson) {
                                if(errorWhileParseCredDefResponse.code > 1) {
    
                                       [self closePool:poolHandle :errorWhileParseCredDefResponse :nil :NO resolve:resolve reject:reject];
                                                                    }
                                else {
                                    [self closePool:poolHandle :nil :credDefJson :YES resolve:resolve reject:reject];

                                }
                            }];
                        }
                    }];
                }
            }];
        }
    }];
}

RCT_EXPORT_METHOD(rejectResult
                  :(NSError *)error
                  reject:(RCTPromiseRejectBlock)reject){
    NSString *errorCode = [@(error.code) stringValue];
    reject(errorCode,error.userInfo[@"message"],error);
}

RCT_EXPORT_METHOD(closePool
                  :(IndyHandle)poolHandle
                  :(NSError *)error
                  :(NSString *) success
                  :(BOOL) isResolve
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject){
    [IndyPool closePoolLedgerWithHandle:poolHandle completion:^(NSError *poolError) {
        if (isResolve) {
            resolve(success);
        } else {
            [self rejectResult:error reject:reject];
        }
    }];
}

RCT_EXPORT_METHOD(createRevocationStateObject
                  :(NSString *) poolName
                  :(NSString *) poolConfig
                  :(NSString *) submitterDid
                  :(NSString *) revRegId
                  :(NSString *) credRevId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    __block IndyHandle poolHandle;
    
    dispatch_semaphore_t openPoolSemaphore = dispatch_semaphore_create(0);
    [IndyPool openPoolLedgerWithName:poolName poolConfig:nil completion:^(NSError *errorOpenPool, IndyHandle generatedPoolHandle) {
        if(errorOpenPool.code > 1) {
            [self rejectResult:errorOpenPool reject:reject];
        }
        else {
            poolHandle = generatedPoolHandle;
            dispatch_semaphore_signal(openPoolSemaphore);
        }
    }];
    dispatch_semaphore_wait(openPoolSemaphore, DISPATCH_TIME_FOREVER);
    
    
    NSTimeInterval timeStampDouble = [[NSDate date] timeIntervalSince1970];
    NSNumber *timeStampNumber = [NSNumber numberWithInt: timeStampDouble];
    
    
    __block NSString *requestJSONRevDelta = [[NSString alloc] init];
    dispatch_semaphore_t buildRevRegSemaphore = dispatch_semaphore_create(0);
    [IndyLedger buildGetRevocRegDeltaRequestWithSubmitterDid:submitterDid revocRegDefId:revRegId from:@(0) to:timeStampNumber completion:^(NSError *errorWhileRevRegDelRequest, NSString *generatedRequestJSON) {
        if(errorWhileRevRegDelRequest.code > 1) {
            [self closePool:poolHandle :errorWhileRevRegDelRequest :nil :NO resolve:resolve reject:reject];

        }
        else {
            requestJSONRevDelta = generatedRequestJSON;
            dispatch_semaphore_signal(buildRevRegSemaphore);
        }
    }];
    dispatch_semaphore_wait(buildRevRegSemaphore, DISPATCH_TIME_FOREVER);
    
    
    __block NSString *requestResultJSONRevDelta = [[NSString alloc] init];
    dispatch_semaphore_t submitReqRevDeltaSemaphore = dispatch_semaphore_create(0);
    [IndyLedger submitRequest:requestJSONRevDelta poolHandle:poolHandle completion:^(NSError *errorSubmitRevRegDeltaRequest, NSString *generatedRequestResultJSON) {
        if(errorSubmitRevRegDeltaRequest.code > 1) {
            [self closePool:poolHandle :errorSubmitRevRegDeltaRequest :nil :NO resolve:resolve reject:reject];

        }
        else {
            requestResultJSONRevDelta = generatedRequestResultJSON;
            dispatch_semaphore_signal(submitReqRevDeltaSemaphore);
        }
    }];
    dispatch_semaphore_wait(submitReqRevDeltaSemaphore, DISPATCH_TIME_FOREVER);
    
    
    __block NSString *revocRegDeltaJSON = [[NSString alloc] init];
    __block NSNumber *timeStamp = [[NSNumber alloc] init];
    
    dispatch_semaphore_t parseRevocRegDeltaSimaphore = dispatch_semaphore_create(0);
    
    __block NSString *returnCall = [[NSString alloc] init];
    
    [IndyLedger parseGetRevocRegDeltaResponse:requestResultJSONRevDelta completion:^(NSError *errorWhileParseRevRegDelResponse, NSString *revocRegDefId, NSString *generatedRevocRegDeltaJson, NSNumber *generatedTimestamp) {
        if(errorWhileParseRevRegDelResponse.code > 1) {
            [IndyPool closePoolLedgerWithHandle:poolHandle completion:^(NSError *error) {
                dispatch_semaphore_signal(parseRevocRegDeltaSimaphore);
                returnCall = @"YES";
                [self rejectResult:errorWhileParseRevRegDelResponse reject:reject];
            }];
        }
        else {
            timeStamp = generatedTimestamp;
            revocRegDeltaJSON = generatedRevocRegDeltaJson;
            dispatch_semaphore_signal(parseRevocRegDeltaSimaphore);
        }
    }];
    dispatch_semaphore_wait(parseRevocRegDeltaSimaphore, DISPATCH_TIME_FOREVER);
    
    
    if ([returnCall  isEqual: @"YES"]) {
        return;
    }
    
    __block NSString *requestJSONRevDef = [[NSString alloc] init];
    dispatch_semaphore_t buildRevDefSemaphore = dispatch_semaphore_create(0);
    [IndyLedger buildGetRevocRegDefRequestWithSubmitterDid:submitterDid id:revRegId completion:^(NSError *errorWhileRevocRegDefRequest, NSString *generatedRequestJSON) {
        if(errorWhileRevocRegDefRequest.code > 1) {
            [self closePool:poolHandle :errorWhileRevocRegDefRequest :nil :NO resolve:resolve reject:reject];

        }
        else {
            requestJSONRevDef = generatedRequestJSON;
            dispatch_semaphore_signal(buildRevDefSemaphore);
        }
    }];
    dispatch_semaphore_wait(buildRevDefSemaphore, DISPATCH_TIME_FOREVER);
    
    if ([returnCall  isEqual: @"YES"]) {
        return;
    }
    
    __block NSString *requestResultJSONRevDef = [[NSString alloc] init];
    dispatch_semaphore_t submitReqDefSemaphore = dispatch_semaphore_create(0);
    [IndyLedger submitRequest:requestJSONRevDef poolHandle:poolHandle completion:^(NSError *errorWhileSubmitRequest, NSString *generatedRequestResultJSON) {
        if(errorWhileSubmitRequest.code > 1) {

            [self closePool:poolHandle :errorWhileSubmitRequest :nil :NO resolve:resolve reject:reject];

        }
        else {
            requestResultJSONRevDef = generatedRequestResultJSON;
            dispatch_semaphore_signal(submitReqDefSemaphore);
        }
    }];
    dispatch_semaphore_wait(submitReqDefSemaphore, DISPATCH_TIME_FOREVER);
    
    
    __block NSString *revocRegDefJSON = [[NSString alloc] init];
    dispatch_semaphore_t parseRevDefSemaphore = dispatch_semaphore_create(0);
    [IndyLedger parseGetRevocRegDefResponse:requestResultJSONRevDef completion:^(NSError *errorInParseRevocRegDefResponse, NSString *revocRegDefId, NSString *generatedRevocRegDefJson) {
        if(errorInParseRevocRegDefResponse.code > 1) {

            [self closePool:poolHandle :errorInParseRevocRegDefResponse :nil :NO resolve:resolve reject:reject];

        }
        else {
            revocRegDefJSON = generatedRevocRegDefJson;
            dispatch_semaphore_signal(parseRevDefSemaphore);
        }
    }];
    dispatch_semaphore_wait(parseRevDefSemaphore, DISPATCH_TIME_FOREVER);
    
    
    NSData *revocRegDefJsonData = [revocRegDefJSON dataUsingEncoding:NSUTF8StringEncoding];
    id generatedRevocRegDefJsonData = [NSJSONSerialization JSONObjectWithData:revocRegDefJsonData options:0 error:nil];
    
    NSString *tailsHash = [generatedRevocRegDefJsonData valueForKeyPath:@"value.tailsHash"];
    
    NSString *tailsFileLocation = [generatedRevocRegDefJsonData valueForKeyPath:@"value.tailsLocation"];
    
    tailsFileLocation = tailsFileLocation.stringByRemovingPercentEncoding;
    
    tailsFileLocation =  [tailsFileLocation stringByAddingPercentEncodingWithAllowedCharacters:NSCharacterSet.URLFragmentAllowedCharacterSet];
    
    NSURL  *url = [NSURL URLWithString:tailsFileLocation];
    NSData *urlData = [NSData dataWithContentsOfURL:url];
    NSArray *paths = NSSearchPathForDirectoriesInDomains(NSDocumentDirectory, NSUserDomainMask, YES);
    NSString *documentsDirectory = [paths objectAtIndex:0];
    NSString *dataPath = [documentsDirectory stringByAppendingPathComponent:@"/revoc"];
    
    if ( urlData )
    {
        if (![[NSFileManager defaultManager] fileExistsAtPath:dataPath])
            [[NSFileManager defaultManager] createDirectoryAtPath:dataPath withIntermediateDirectories:NO attributes:nil error:nil];
        NSString *filePath = [NSString stringWithFormat:@"%@/%@", dataPath, tailsHash];
        [urlData writeToFile:filePath atomically:YES];
    }
    
    NSString *pathOfTailsFile = [NSString stringWithFormat:@"%@/", dataPath];
    pathOfTailsFile = [pathOfTailsFile stringByStandardizingPath];
    NSMutableDictionary *tailsWriterConfig = [[NSMutableDictionary alloc] init];
    [tailsWriterConfig setObject:pathOfTailsFile forKey:@"base_dir"];
    [tailsWriterConfig setObject:@"" forKey:@"uri_pattern"];
    
    NSData *tailsWriterConfigData = [NSJSONSerialization dataWithJSONObject:tailsWriterConfig options:NSJSONWritingPrettyPrinted error:nil];
    NSString *tailsWriterConfigString = [[NSString alloc] initWithData:tailsWriterConfigData encoding:NSUTF8StringEncoding];
    
    __block NSNumber *storageHandle = [[NSNumber alloc] init];
    dispatch_semaphore_t blobReaderSemaphore = dispatch_semaphore_create(0);
    [IndyBlobStorage openReaderWithType:@"default" config:tailsWriterConfigString completion:^(NSError *errorWhileOpenReader, NSNumber *handle) {
        if(errorWhileOpenReader.code > 1) {

            [self closePool:poolHandle :errorWhileOpenReader :nil :NO resolve:resolve reject:reject];

        }
        else {
            storageHandle = handle;
            dispatch_semaphore_signal(blobReaderSemaphore);
        }
    }];
    dispatch_semaphore_wait(blobReaderSemaphore, DISPATCH_TIME_FOREVER);
    
    __block NSString *revStateJSON = [[NSString alloc] init];
    dispatch_semaphore_t revStateSemaphore = dispatch_semaphore_create(0);
    [IndyAnoncreds createRevocationStateForCredRevID:credRevId timestamp:timeStamp revRegDefJSON:revocRegDefJSON revRegDeltaJSON:revocRegDeltaJSON blobStorageReaderHandle:storageHandle completion:^(NSError *errorWhileRevocState, NSString *generatedRevStateJSON) {
        if(errorWhileRevocState.code > 1) {

            [self closePool:poolHandle :errorWhileRevocState :nil :NO resolve:resolve reject:reject];

        }
        else {
            revStateJSON = generatedRevStateJSON;
            dispatch_semaphore_signal(revStateSemaphore);
        }
    }];
    dispatch_semaphore_wait(revStateSemaphore, DISPATCH_TIME_FOREVER);
    
    NSData *revocStateJsonData = [revStateJSON dataUsingEncoding:NSUTF8StringEncoding];
    id revocStateJsonDataObject = [NSJSONSerialization JSONObjectWithData:revocStateJsonData options:0 error:nil];
    
    NSMutableDictionary *newObject = [[NSMutableDictionary alloc] init];
    NSString *timeStampString = [NSString stringWithFormat:@"%@", timeStamp];
    
    [newObject setObject:revocStateJsonDataObject forKey:timeStampString];
    
    NSData *revocObjectData = [NSJSONSerialization dataWithJSONObject:newObject
                                                              options:NSJSONWritingPrettyPrinted
                                                                error:nil];
    NSString *revocObjectDataString = [[NSString alloc] initWithData:revocObjectData encoding:NSUTF8StringEncoding];
    
    [self closePool:poolHandle :nil :revocObjectDataString :YES resolve:resolve reject:reject];

    
}


RCT_EXPORT_METHOD(proverCreateProof:
                  (NSString *)walletConfig
                  :(NSString *)walletCredentials
                  :(NSString *)proofRequest
                  :(NSString *)requestedCredentials
                  :(NSString *)masterSecret
                  :(NSString *)schemas
                  :(NSString *)credentialDefs
                  :(NSString *)revocObject
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject){
    
    [self openWallet:walletConfig :walletCredentials completion:^(IndyHandle walletHandle) {
        if (walletHandle > 0) {
            [IndyAnoncreds proverCreateProofForRequest:proofRequest requestedCredentialsJSON:requestedCredentials masterSecretID:masterSecret schemasJSON:schemas credentialDefsJSON:credentialDefs revocStatesJSON:revocObject walletHandle:walletHandle completion:^(NSError *errorWhileCreateProofRequest, NSString *proofJSON) {
                if(errorWhileCreateProofRequest.code > 1) {
                    [self rejectResult:errorWhileCreateProofRequest reject:reject];
                }
                else {
                    resolve(proofJSON);
                    
                }
            }];
        }
    }];
    
}

@end
