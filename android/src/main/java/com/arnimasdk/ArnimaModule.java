package com.arnimasdk;

import android.app.ProgressDialog;
import android.os.AsyncTask;
import android.os.Build;
// import androidx.annotation.RequiresApi;
import android.system.ErrnoException;
import android.util.JsonReader;
import android.util.Log;

import androidx.annotation.Nullable;

import com.facebook.react.bridge.Arguments;
import com.facebook.react.bridge.LifecycleEventListener;
import com.facebook.react.bridge.Promise;
import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;
import com.facebook.react.bridge.WritableMap;
import com.facebook.react.modules.core.DeviceEventManagerModule;

import org.hyperledger.indy.sdk.IndyException;
import org.hyperledger.indy.sdk.did.Did;
import org.hyperledger.indy.sdk.did.DidResults;
import org.hyperledger.indy.sdk.pool.Pool;
import org.hyperledger.indy.sdk.wallet.Wallet;
import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;
import java.util.concurrent.ExecutionException;

import javax.annotation.Nonnull;

import static org.hyperledger.indy.sdk.did.Did.storeTheirDid;

public class ArnimaModule extends ReactContextBaseJavaModule implements LifecycleEventListener {

    private final ReactApplicationContext mReactContext;
    private String ErrorCode = "ERROR";
    public ArnimaModule(@Nonnull ReactApplicationContext reactContext) {
        super(reactContext);
        mReactContext = reactContext;
    }

    @Nonnull
    @Override
    public String getName() {
        return "Arnima";
    }

    private void sendEvent(ReactContext reactContext,
                           String eventName,
                           @Nullable WritableMap params) {
        reactContext
                .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter.class)
                .emit(eventName, params);
    }

    @ReactMethod
    public void CreateWalletAndDid(String walletName, String walletKey) {
        WritableMap data = Arguments.createMap();
        try {
            String myWalletConfig = new JSONObject().put("id", walletName).toString();
            String myWalletCredentials= new JSONObject().put("key", walletKey).toString();
            Wallet.createWallet(myWalletConfig, myWalletCredentials).get();
            Wallet myWallet = Wallet.openWallet(myWalletConfig, myWalletCredentials).get();

            DidResults.CreateAndStoreMyDidResult createMyDidResult = Did.createAndStoreMyDid(myWallet, "{}").get();
            String myDid = createMyDidResult.getDid();
            String myVerKey = createMyDidResult.getVerkey();

            myWallet.closeWallet().get();
            Log.d("HI_myDid",myDid );
            Log.d("HI_myVerKey",myVerKey );
            data.putString("did", myDid);
            data.putString("verKey", myVerKey);
            sendEvent(mReactContext, "WALLET_DID_CREATED_SUCCESS", data);
//            promise.resolve(data);
        } catch (ExecutionException e) {
            Log.d("HI_ExecutionException",e.toString());
            e.printStackTrace();
            data.putString("error", e.getMessage());
            sendEvent(mReactContext, "WALLET_DID_CREATED_ERROR", data);
//            promise.reject(ErrorCode, data);
        } catch (InterruptedException e) {
            e.printStackTrace();
            Log.d("HI_InterruptedException",e.toString());
            data.putString("error", e.getMessage());
            sendEvent(mReactContext, "WALLET_DID_CREATED_ERROR", data);
//            promise.reject(ErrorCode, data);
        } catch (IndyException e) {
            e.printStackTrace();
            Log.d("HI_IndyException",e.toString());
            data.putString("error", e.getMessage());
            sendEvent(mReactContext, "WALLET_DID_CREATED_ERROR", data);
//            promise.reject(ErrorCode, data);
        } catch (JSONException e) {
            e.printStackTrace();
            data.putString("error", e.getMessage());
            sendEvent(mReactContext, "WALLET_DID_CREATED_ERROR", data);
//            promise.reject(ErrorCode, data);
        }
    }

    @Override
    public void onHostResume() {

    }

    @Override
    public void onHostPause() {

    }

    @Override
    public void onHostDestroy() {

    }
}
