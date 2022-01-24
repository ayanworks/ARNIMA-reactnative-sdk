#import <Foundation/Foundation.h>
#import "URLSessionWithRedirection.h"

@implementation URLSessionWithRedirection

- (void)URLSession:(NSURLSession *)session
              task:(NSURLSessionTask *)task
willPerformHTTPRedirection:(NSHTTPURLResponse *)response
        newRequest:(NSURLRequest *)request
 completionHandler:(void (^)(NSURLRequest *))completionHandler{
  completionHandler(nil);
}

@end
