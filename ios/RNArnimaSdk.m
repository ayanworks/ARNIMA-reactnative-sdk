
#import "RNArnimaSdk.h"
#import <React/RCTBridge.h>
#import <Indy/Indy.h>

@implementation ArnimaSdk

+(void)rejectMethod:(IndyHandle )pool
             wallet:(IndyHandle )wallet
             reject:(RCTPromiseRejectBlock)reject
              error:(NSError *)error {
    [[IndyWallet sharedInstance] closeWalletWithHandle:wallet completion:^(NSError *error) {
        [IndyPool closePoolLedgerWithHandle:pool completion:^(NSError *error) {
            reject(@(-1).stringValue, error.localizedDescription, nil);
        }];
    }];
}

RCT_EXPORT_METHOD(createWallet:
                  (NSString *)config
                  :(NSString *)credentialJson
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    [[IndyWallet sharedInstance] createWalletWithConfig:config credentials:credentialJson completion:^(NSError *error) {
        if(error.code > 1) {
            reject(@(-1).stringValue, error.localizedDescription, nil);
        }
        else {
            resolve(@"Wallet created successfully");
        }
    }];
}

RCT_EXPORT_METHOD(createAndStoreMyDids:
                  (NSString *)configJson
                  :(NSString *)credentialJson
                  :(NSString *)didJson
                  :(BOOL)createMasterSecret
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    [[IndyWallet sharedInstance] openWalletWithConfig:configJson credentials:credentialJson completion:^(NSError *error, IndyHandle walletHandle) {
        if(error.code > 1) {
            reject(@(-1).stringValue, error.localizedDescription, nil);
        }
        else {
            [IndyDid createAndStoreMyDid:configJson walletHandle:walletHandle completion:^(NSError *error, NSString *did, NSString *verkey) {
                if(error.code > 1) {
                    [[IndyWallet sharedInstance] closeWalletWithHandle:walletHandle completion:^(NSError *error) {
                        reject(@(-1).stringValue, error.localizedDescription, nil);
                    }];
                }
                else {
                    if(createMasterSecret == true) {
                        NSData *credentialData = [configJson dataUsingEncoding:NSUTF8StringEncoding];
                        id credentialDataJSON = [NSJSONSerialization JSONObjectWithData:credentialData options:0 error:nil];
                        NSString *masterSecret = [credentialDataJSON objectForKey:@"id"];
                        [IndyAnoncreds proverCreateMasterSecret:masterSecret walletHandle:walletHandle completion:^(NSError *errorMS, NSString *outMasterSecretId) {
                            [[IndyWallet sharedInstance] closeWalletWithHandle:walletHandle completion:^(NSError *error) {
                                NSMutableArray *myArray = [NSMutableArray array];
                                [myArray addObject:did];
                                [myArray addObject:verkey];
                                [myArray addObject:outMasterSecretId];
                                resolve(myArray);
                            }];
                        }];
                    }
                    else {
                        [[IndyWallet sharedInstance] closeWalletWithHandle:walletHandle completion:^(NSError *error) {
                            NSMutableArray *myArray = [NSMutableArray array];
                            [myArray addObject:did];
                            [myArray addObject:verkey];
                            [myArray addObject:@""];
                            resolve(myArray);
                        }];
                    }
                }
            }];
        }
    }];
}

RCT_EXPORT_METHOD(cryptoSign:
                  (NSString *)configJson
                  :(NSString *)credentialJson
                  :(NSString *)signerKey
                  :(NSString *)messageRaw
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) { 
    [[IndyWallet sharedInstance] openWalletWithConfig:configJson credentials:credentialJson completion:^(NSError *errorOW, IndyHandle walletHandle) {
        if(errorOW.code > 1) {
            reject(@(-1).stringValue, errorOW.localizedDescription, nil);
        }
        else {
            NSData *jsonData = [messageRaw dataUsingEncoding:NSUTF8StringEncoding]; 
            [IndyCrypto signMessage:jsonData key:signerKey walletHandle:walletHandle completion:^(NSError *errorSM, NSData *signature) {
                if(errorSM.code > 1) {
                    [[IndyWallet sharedInstance] closeWalletWithHandle:walletHandle completion:^(NSError *error) {
                        reject(@(-1).stringValue, errorSM.localizedDescription, nil);
                    }];
                }
                else {
                    [[IndyWallet sharedInstance] closeWalletWithHandle:walletHandle completion:^(NSError *errorCW) {
                        
                         uint8_t * bytePtr = (uint8_t  * )[signature bytes];
                        NSInteger length = [signature length];
                        
                        NSMutableArray *valueArray = [NSMutableArray new];
                        
                        for (int i = 0 ; i < length; i ++)
                        {
                            NSNumber *someNumber = [NSNumber numberWithInt:bytePtr[i]];
                            [valueArray addObject:someNumber]; 
                        } 
                       resolve(valueArray);
                    }];
                }
            }];
        }
    }];
}

RCT_EXPORT_METHOD(packMessage:
                  (NSString *)configJson
                  :(NSString *)credentialJson
                  :(NSString *)message
                  :(NSArray *)receiverKeys
                  :(NSString *)senderVerkey
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {

    [[IndyWallet sharedInstance] openWalletWithConfig:configJson credentials:credentialJson completion:^(NSError *error, IndyHandle walletHandle) {
        if(error.code > 1) {
            reject(@(-1).stringValue, error.localizedDescription, nil);
            
        }
        else {
            [IndyCrypto createKey:@"{}" walletHandle:walletHandle completion:^(NSError *errorCK1, NSString *verkey1) {
                if(errorCK1.code > 1) {
                }
                else {
                    NSArray *receivers = receiverKeys;
                    
                    NSData *jsonData = [NSJSONSerialization dataWithJSONObject:receivers options:0 error:nil];
                    
                    NSString *receiversJson = [[NSString alloc] initWithData:jsonData encoding:NSUTF8StringEncoding];
                    NSData *messagemain = [message dataUsingEncoding:NSUTF8StringEncoding];
                    
                    [IndyCrypto packMessage:messagemain receivers:receiversJson sender:senderVerkey walletHandle:walletHandle completion:^(NSError *errorPM, NSData *jwe) {
                        if(errorPM.code > 1) {
                            reject(@(-1).stringValue, errorPM.localizedDescription, nil);
                        }
                        else {
                            [[IndyWallet sharedInstance] closeWalletWithHandle:walletHandle completion:^(NSError *errorCloseWallet) {
                                if(errorCloseWallet.code > 1) {
                                    reject(@(-1).stringValue, errorCloseWallet.localizedDescription, nil);
                                }
                                else {
                                    NSString* newStr = [[NSString alloc] initWithData:jwe encoding:NSUTF8StringEncoding];
                                    resolve(newStr);
                                }
                            }];
                        }
                    }];
                }
            }];
        }
    }];
}

RCT_EXPORT_METHOD(unpackMessage:
                  (NSString *)configJson
                  :(NSString *)credentialJson
                  :(NSString *)message
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    [[IndyWallet sharedInstance] openWalletWithConfig:configJson credentials:credentialJson completion:^(NSError *error, IndyHandle walletHandle) {
        if(error.code > 1) {
            reject(@(-1).stringValue, error.localizedDescription, nil);
        }
        else {
            NSData *messagemain = [message dataUsingEncoding:NSUTF8StringEncoding];
            [IndyCrypto unpackMessage:messagemain walletHandle:walletHandle completion:^(NSError *errorUM, NSData *res) {
                if(errorUM.code > 1) {
                    reject(@(-1).stringValue, errorUM.localizedDescription, nil);
                }
                else {
                    [[IndyWallet sharedInstance] closeWalletWithHandle:walletHandle completion:^(NSError *errorCW) {
                        NSString* newStr = [[NSString alloc] initWithData:res encoding:NSUTF8StringEncoding];
                        resolve(newStr);
                    }];
                }
            }];
        }
    }];
}

RCT_EXPORT_METHOD(cryptoVerify:
                  (NSString *)configJson
                  :(NSString *)credentialJson
                  :(NSString *)signVerkey
                  :(NSString *)message
                  :(NSString *)signatureRaw
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    NSData *messageMain = [message dataUsingEncoding:NSUTF8StringEncoding];
    
    [[IndyWallet sharedInstance] openWalletWithConfig:configJson credentials:credentialJson completion:^(NSError *errorOW, IndyHandle walletHandle) {
        if(errorOW.code > 1) {
            reject(@(-1).stringValue, errorOW.localizedDescription, nil);
        }
        else {
            
            
            NSData *revocRegDefJsonData = [signatureRaw dataUsingEncoding:NSUTF8StringEncoding];
            id generatedRevocRegDefJsonData = [NSJSONSerialization JSONObjectWithData:revocRegDefJsonData options:0 error:nil];
                        
            NSInteger c = [generatedRevocRegDefJsonData count];
            uint8_t *bytes = malloc(sizeof(*bytes) * c);
            
            NSInteger i;
            for (i = 0; i < c; i++)
            {
                NSString *str = [generatedRevocRegDefJsonData objectAtIndex:i];
                int byte = [str intValue];
                bytes[i] = byte;
            }
            
            NSData *imageData = [NSData dataWithBytesNoCopy:bytes length:c freeWhenDone:YES];
                        
            [IndyCrypto verifySignature:imageData forMessage:messageMain key:signVerkey completion:^(NSError *errorSM, BOOL valid) {
                if(errorSM.code > 1) {
                    [[IndyWallet sharedInstance] closeWalletWithHandle:walletHandle completion:^(NSError *error) {
                        reject(@(-1).stringValue, errorSM.localizedDescription, nil);
                    }];
                }
                else {
                    [[IndyWallet sharedInstance] closeWalletWithHandle:walletHandle completion:^(NSError *error) {
                        if(valid == true) {
                            resolve(@"true");
                        }
                        else {
                            resolve(@"false");
                        }
                    }];
                }
            }];
        }
    }];
}

RCT_EXPORT_METHOD(createPoolLedgerConfig:
                  (NSString *) poolConfigString
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject) {
    
    
    NSString *genesisTXNs = poolConfigString;
    
    NSString *filePath;
    NSMutableString *path = [NSMutableString stringWithString:NSTemporaryDirectory()];
    
    filePath = [NSString stringWithFormat:@"%@%@.txn", path, @"pool"];
    
    [[NSFileManager defaultManager] createFileAtPath:filePath
                                            contents:[NSData dataWithBytes:[genesisTXNs UTF8String] length:[genesisTXNs length]]
                                          attributes:nil];
    
    NSString *poolConfig = [NSString stringWithFormat:@"{\"genesis_txn\":\"%@\"}", filePath];
    
    NSString *configStr = (poolConfig) ? poolConfig : @"";
    
    [IndyPool setProtocolVersion:@(2) completion:^(NSError *error) {
        if(error.code > 1) {
            reject(@(-1).stringValue, error.localizedDescription, nil);
        }
    }];
    
    [IndyPool createPoolLedgerConfigWithPoolName:@"pool" poolConfig:configStr completion:^(NSError *error) {
        if(error.code > 1) {
            reject(@(-1).stringValue, error.localizedDescription, nil);
        }
        else {
            resolve(NULL);
        }
    }];
}

@end
