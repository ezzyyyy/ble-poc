#import <Foundation/Foundation.h>

#import "React/RCTBridgeModule.h"
#import "React/RCTEventEmitter.h"

@interface RCT_EXTERN_MODULE(SwiftComponentManager, RCTEventEmitter)

RCT_EXTERN_METHOD(passValueFromReact:(NSString *)value)
RCT_EXTERN_METHOD(passStopAdvertising)

// this is how we expose the promise to the javascript side.
RCT_EXTERN_METHOD(passDeviceLocalName: (RCTPromiseResolveBlock)resolve rejecter: (RCTPromiseRejectBlock)reject)
@end

