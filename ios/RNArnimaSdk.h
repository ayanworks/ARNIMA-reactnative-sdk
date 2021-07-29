
#if __has_include("RCTBridgeModule.h")
#import "RCTBridgeModule.h"
#else
#import <React/RCTBridgeModule.h>
#endif
#import <Indy/Indy.h>

@interface ArnimaSdk : NSObject <RCTBridgeModule>
{
    IndyHandle WalletHandleNumber;
}

@end
  
