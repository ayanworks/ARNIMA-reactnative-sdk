import { NativeModules, DeviceEventEmitter } from 'react-native';

console.log(NativeModules)
export default (wKey, wName) => {
  return new Promise((resolve, reject) => {
    DeviceEventEmitter.addListener('WALLET_DID_CREATED_SUCCESS', (response) => {
      console.log(response);
      resolve(response);
    });
    DeviceEventEmitter.addListener('WALLET_DID_CREATED_ERROR', (error) => {
      console.log(error);
      resolve(error);
    });

    NativeModules.Arnima.CreateWalletAndDid(wKey, wName)
      .then((msg) => {
        console.log(msg);
        DeviceEventEmitter.removeAllListeners('WALLET_DID_CREATED_SUCCESS');
        DeviceEventEmitter.removeAllListeners('WALLET_DID_CREATED_ERROR');
        resolve(msg);
      })
      .catch((error) => {
        console.log(error);
        DeviceEventEmitter.removeAllListeners('WALLET_DID_CREATED_SUCCESS');
        DeviceEventEmitter.removeAllListeners('WALLET_DID_CREATED_ERROR');
        reject(error);
      });
  });
}