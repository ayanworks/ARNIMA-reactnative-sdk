# ARNIMA SDK (Aries React-NatIve Mobile Agent)
ARNIMA is an open-source React Native SDK for building Aries Mobile Agents. ARNIMA attempts to meet the needs / asks of many members from the Aries community, mainly React Native developers, who are looking forward to build cross-platform Aries Mobile Agents using React Native stack.

This React-Native SDK is compatible to be used with both Android and iOS platforms. Please refer Installation section on how to set up the sdk and start running. This SDK is compliant and interoperable with the standards defined in the [Aries RFCs](https://github.com/hyperledger/aries-rfcs).

# What's in the name
Arnima (Hindi: अर्निमा, meaning "First ray of Sun") is a girl name in India whose zodiac sign is Aries 😉

## Apps built using this SDK
| App Name | Android | Ios |
| ------ | ------ | ----- |
| ADEYA | [Link](https://play.google.com/store/apps/details?id=com.credebl&hl=en_IN&gl=US) | [Link](https://apps.apple.com/us/app/adeya-ssi-wallet/id1561779080) |
| DIT Wallet<br />(The Digital Identity Trust Foundation) | [Link](https://play.google.com/store/apps/details?id=com.dit&hl=en_IN&gl=US) | [Link](https://apps.apple.com/in/app/dit-wallet/id1593180308) |

## Features

### Finished

- ✅ [Issue Credential Protocol](https://github.com/hyperledger/aries-rfcs/blob/master/features/0036-issue-credential/README.md)
- ✅ [Present Proof Protocol](https://github.com/hyperledger/aries-rfcs/blob/master/features/0037-present-proof/README.md)
- ✅ [Connection Protocol](https://github.com/hyperledger/aries-rfcs/blob/master/features/0160-connection-protocol/README.md)
- ✅ [Trust Ping Protocol](https://github.com/hyperledger/aries-rfcs/tree/master/features/0048-trust-ping)
- ✅ [Basic Message Protocol](https://github.com/hyperledger/aries-rfcs/blob/master/features/0095-basic-message/README.md)

#### TODO

- ⌨️ [Mediator coordination protocol](https://github.com/hyperledger/aries-rfcs/blob/master/features/0211-route-coordination/README.md)
- ⌨️ Connection-less Issuance and Verification
- ⌨️ Support with other Mediator Agent

**Notes:**
Currently, SDK supports our custom build mediator agent and we are planning to open-source the mediator agent soon.

## Dependencies

- The **node 10.18.1** (To check, nvm ls) is required to install mobile agent specific dependencies like realm

1. Install nvm

```bash
curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.34.0/install.sh | bash
```

2. Restart the terminal
3. Confirm it's been installed with the following command:

```bash
nvm --version
```

4. Install node 10 using nvm

```bash
nvm install 10.18.1
```

5. Make sure you're using the right version of node

```bash
nvm use 10.18.1
```

## Installation

1. Clone this repository `git clone *****`
2. `cd` into the repo `cd mobile-sdk`
3. Create the `ARNIMA mobile agent package` by using the following command npm pack
4. This will create a `*.tgz`file inside current directory.
5. Copy the `*.tgz`file and paste it inside the root of your mobile wallet project.
6. Inside your project of mobile app wallet's package.json, add this to the dependencies block:

```bash
"react-native-arnima-sdk": "./<MOBILE_AGENT_PACKAGE>.tgz"
```

7. After this, run `npm install`, and the sdk will automatically unpack and install inside `node_modules`.
8. Install the following SDK dependencies in your wallet application:

- **Realm**

```bash
npm install realm
```

- **buffer**

```bash
npm install buffer
```

- **Socket Client**

```bash
npm install socket.io-client
```

- **Base64Url**

```bash
npm install base64url
```

- **EventListener**

```bash
npm i react-native-event-listeners
```

## Android: Link Mobile Agent SDK

1. Execute react-native link
2. Edit the android/ level build.gradle file and add a repositories section:

```
repositories {
  maven { url 'https://repo.sovrin.org/repository/maven-public' }
}
```

## iOS: Link Mobile Agent SDK

1. Include below lines on top of your project's Podfile.

```
source 'https://github.com/CocoaPods/Specs.git'
source 'https://github.com/hyperledger/indy-sdk.git'
```

2. Change platform :ios, '9.0' to platform :ios, '13.0'
3. Add following line to include sdk pod to your project.

```
pod 'ArnimaSdk', :path => '../node_modules/react-native-arnima-sdk'
```

4. Do `pod install`.
5. You need to download and replace the file `Indy.framework` from Pods folder inside your Mobile app project from the following link (base on your xcode & swift version) Download from - <https://drive.google.com/drive/folders/1_WJ3mEHqk5GHH9p5SI4bRKRXPwy5w_0e?usp=sharing>, Replace at - <Your_Project>/ios/Pods/libindy/

## React Native Compatibility

If there are any compatibility issue please add here.

## Permissions

- **Internet Permission:** To use internet in a device at time of access Restful API.

```
<uses-permission android:name="android.permission.INTERNET" />
```

- **Read/Write permissions:** To access device storage for creating wallet.

```
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"/>
```

## Using the SDK

1. Import the library

```ts
import ArnimaSDK from 'react-native-arnima-sdk'
```

2. Use the following methods

## Methods

### createWallet(config, credential, label) -> Array

---

This method is called after the user has set up their wallet name & passcode for the first time.

`config`: JSON - Wallet configuration that takes in the wallet name as an id (e.g. Proof)

```
{
  id: <WALLET_NAME>
}
```

`credential`: JSON - Wallet credentials json that takes in the passcode the user has setup during onboarding

```
{
    key: <PASSCODE>
}
```

`label` : String - Your label to show to the counter party during connection

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const wallet = await ArnimaSDK.createWallet(
  { id: 'John' },
  { key: '354016' },
  'John'
)
```

**Returns:**

`Success`: Array[<public_did>, <verkey>, <masterSecretId>]
`Sample Output`: `["K7P6Xoe31NBYn7md8qBm4F", "AsVcY4GUvJyeP2k78vJK2mTuPHT1sSdZjQBXbCUyXEbz", "John"]`

`Error`: Below is a list of anticipated errors

1. **Storage permissions error**. _Sample_: `{"code":"114","message":"org.hyperledger.indy.sdk.IOException: An IO error occurred."}]`
2. **Wallet already error**. _Sample_:
   `{"code":"203","message":"Wallet already exists."}]`.

### ConnectWithMediator(url, apiType, apiBody, poolConfig) -> Boolean

---

This method connects to an instantiated service of a mediator agent that is in charge of holding messages if the application is offline and to push messages to this `sdk` the moment mobile app is active.

`url`: String - endpoint url of the instantiated mediator agent

```
"http://10.10.10.10:8001/discover/"
```

`apiType`: String - Describes the way by which we are accessing the endpoint (in this case, we are using `POST`)

```
"POST"
```

`apiBody`: String - Stringified JSON that contains the wallet information needed to attach to the mediator agent

```
JSON.stringify({
    myDid: "<WALLET_PUBLIC_DID>",
    verkey: "<WALLET_VERIFIED_KEY>",
    label: "<WALLET_LABEL>",
    firebaseToken: "<FIREBASE_TOKEN> OR '' "
})
```

`poolConfig`: String - A genesis transaction string received in response of `/register-device` endpoint.

```
{"reqSignature": {}, "txn": {"data": {"data": {"alias": "Node1", "blskey": "4N8aUNHSgjQVgkpm8nhNEfDf6txHznoYREg9kirmJrkivgL4oSEimFF6nsQ6M41QvhM2Z33nves5vfSn9n1UwNFJBYtWVnHYMATn76vLuL3zU88KyeAYcHfsih3He6UHcXDxcaecHVz6jhCYz1P2UZn2bDVruL5wXpehgBfBaLKm3Ba", "blskey_pop": "RahHYiCvoNCtPTrVtP7nMC5eTYrsUA8WjXbdhNc8debh1agE9bGiJxWBXYNFbnJXoXhWFMvyqhqhRoq737YQemH5ik9oL7R4NTTCz2LEZhkgLJzB3QRQqJyBNyv7acbdHrAT8nQ9UkLbaVL9NBpnWXBTw4LEMePaSHEw66RzPNdAX1", "client_ip": "34.71.218.3", "client_port": 9702, "node_ip": "34.71.218.3", "node_port": 9701, "services": ["VALIDATOR"]}, "dest": "Gw6pDLhcBcoQesN72qfotTgFa7cbuqZpkX3Xo6pLhPhv"}, "metadata": {"from": "Th7MpTaRZVRYnPiabds81Y"}, "type": "0"}, "txnMetadata": {"seqNo": 1, "txnId": "fea82e10e894419fe2bea7d96296a6d46f50f93f9eeda954ec461b2ed2950b62"}, "ver": "1"}
{"reqSignature": {}, "txn": {"data": {"data": {"alias": "Node2", "blskey": "37rAPpXVoxzKhz7d9gkUe52XuXryuLXoM6P6LbWDB7LSbG62Lsb33sfG7zqS8TK1MXwuCHj1FKNzVpsnafmqLG1vXN88rt38mNFs9TENzm4QHdBzsvCuoBnPH7rpYYDo9DZNJePaDvRvqJKByCabubJz3XXKbEeshzpz4Ma5QYpJqjk", "blskey_pop": "Qr658mWZ2YC8JXGXwMDQTzuZCWF7NK9EwxphGmcBvCh6ybUuLxbG65nsX4JvD4SPNtkJ2w9ug1yLTj6fgmuDg41TgECXjLCij3RMsV8CwewBVgVN67wsA45DFWvqvLtu4rjNnE9JbdFTc1Z4WCPA3Xan44K1HoHAq9EVeaRYs8zoF5", "client_ip": "34.71.218.3", "client_port": 9704, "node_ip": "34.71.218.3", "node_port": 9703, "services": ["VALIDATOR"]}, "dest": "8ECVSk179mjsjKRLWiQtssMLgp6EPhWXtaYyStWPSGAb"}, "metadata": {"from": "EbP4aYNeTHL6q385GuVpRV"}, "type": "0"}, "txnMetadata": {"seqNo": 2, "txnId": "1ac8aece2a18ced660fef8694b61aac3af08ba875ce3026a160acbc3a3af35fc"}, "ver": "1"}
{"reqSignature": {}, "txn": {"data": {"data": {"alias": "Node3", "blskey": "3WFpdbg7C5cnLYZwFZevJqhubkFALBfCBBok15GdrKMUhUjGsk3jV6QKj6MZgEubF7oqCafxNdkm7eswgA4sdKTRc82tLGzZBd6vNqU8dupzup6uYUf32KTHTPQbuUM8Yk4QFXjEf2Usu2TJcNkdgpyeUSX42u5LqdDDpNSWUK5deC5", "blskey_pop": "QwDeb2CkNSx6r8QC8vGQK3GRv7Yndn84TGNijX8YXHPiagXajyfTjoR87rXUu4G4QLk2cF8NNyqWiYMus1623dELWwx57rLCFqGh7N4ZRbGDRP4fnVcaKg1BcUxQ866Ven4gw8y4N56S5HzxXNBZtLYmhGHvDtk6PFkFwCvxYrNYjh", "client_ip": "34.71.218.3", "client_port": 9706, "node_ip": "34.71.218.3", "node_port": 9705, "services": ["VALIDATOR"]}, "dest": "DKVxG2fXXTU8yT5N7hGEbXB3dfdAnYv1JczDUHpmDxya"}, "metadata": {"from": "4cU41vWW82ArfxJxHkzXPG"}, "type": "0"}, "txnMetadata": {"seqNo": 3, "txnId": "7e9f355dffa78ed24668f0e0e369fd8c224076571c51e2ea8be5f26479edebe4"}, "ver": "1"}
{"reqSignature": {}, "txn": {"data": {"data": {"alias": "Node4", "blskey": "2zN3bHM1m4rLz54MJHYSwvqzPchYp8jkHswveCLAEJVcX6Mm1wHQD1SkPYMzUDTZvWvhuE6VNAkK3KxVeEmsanSmvjVkReDeBEMxeDaayjcZjFGPydyey1qxBHmTvAnBKoPydvuTAqx5f7YNNRAdeLmUi99gERUU7TD8KfAa6MpQ9bw", "blskey_pop": "RPLagxaR5xdimFzwmzYnz4ZhWtYQEj8iR5ZU53T2gitPCyCHQneUn2Huc4oeLd2B2HzkGnjAff4hWTJT6C7qHYB1Mv2wU5iHHGFWkhnTX9WsEAbunJCV2qcaXScKj4tTfvdDKfLiVuU2av6hbsMztirRze7LvYBkRHV3tGwyCptsrP", "client_ip": "34.71.218.3", "client_port": 9708, "node_ip": "34.71.218.3", "node_port": 9707, "services": ["VALIDATOR"]}, "dest": "4PS3EDQ3dW1tci1Bp6543CfuuebjFrg36kLAUcskGfaA"}, "metadata": {"from": "TWwCRQRZ2ZHMJFn9TzLp7W"}, "type": "0"}, "txnMetadata": {"seqNo": 4, "txnId": "aa5e817d7cc626170eca175822029339a444eb0ee8f0bd20d3b0b76e566fb008"}, "ver": "1"}
```

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const wallet = await ArnimaSDK.ConnectWithMediator(
  'http://localhost:8080/discover',
  'POST',
  JSON.stringify({
    myDid: ArnimaSDK.getWallet().publicDid,
    verkey: ArnimaSDK.getWallet().verKey,
    label: ArnimaSDK.getWallet().label,
    firebaseToken: '',
  }),
  poolConfig
)
```

**Returns:**

`Success`: true

### createInvitation(didJson) -> String

---

Returns a url for connection

`didJson`: Json - Identity information as json

```
{
    "did": string, (optional;
            if not provided and cid param is false then the first 16 bit of the verkey will be used as a new DID;
            if not provided and cid is true then the full verkey will be used as a new DID;
            if provided, then keys will be replaced - key rotation use case)
    "seed": string, (optional) Seed that allows deterministic did creation (if not set random one will be created).
                               Can be UTF-8, base64 or hex string.
    "crypto_type": string, (optional; if not set then ed25519 curve is used;
              currently only 'ed25519' value is supported for this field)
    "cid": bool, (optional; if not set then false is used;)
    "method_name": string, (optional) method name to create fully qualified did (Example:  `did:method_name:NcYxiDXkpYi6ov5FcYDi1e`).
}
```

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const response = await ArnimaSDK.createInvitation({})
```

**Returns:**

`Success`: string

```
"http://10.10.10.10:8001?c_i=eyJAdHlwZSI6ICJkaWQ6csdsd2OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiMmMzYjY5NjMtODc3YS00NDEwLWIwNTctZjVkZWU2NDNjZDc5IiwgImxhYmVsIjogInF3ZXJ0eSIsICJzZXJ2aWNlRW5kcG9pbnQiOiAiaHRvfgfDovLzEwLjEwLjEwLjIwds5MDAyIiwgInJlY2lwaWVudEtleXMiOiBbIjljYXVFbzhpMkdFa0pBYnZTRFBvQ0I0dnU3N05lTDZiUWRORm1RSmF6THJEIl19"
```

### acceptInvitation(didJson, invitationUrl) -> Boolean

---

`didJson`: Json - Identity information as json if you don't have pass empty object - {}.

```
{
    "did": string, (optional;
            if not provided and cid param is false then the first 16 bit of the verkey will be used as a new DID;
            if not provided and cid is true then the full verkey will be used as a new DID;
            if provided, then keys will be replaced - key rotation use case)
    "seed": string, (optional) Seed that allows deterministic did creation (if not set random one will be created).
                               Can be UTF-8, base64 or hex string.
    "crypto_type": string, (optional; if not set then ed25519 curve is used;
              currently only 'ed25519' value is supported for this field)
    "cid": bool, (optional; if not set then false is used;)
    "method_name": string, (optional) method name to create fully qualified did (Example:  `did:method_name:NcYxiDXkpYi6ov5FcYDi1e`).
}
```

`invitationUrl`: String - Encoded url invitation.

```
"http://10.10.10.10:8001?c_i=eyJAdHlwZSI6ICJkaWQ6csdsd2OkJ6Q2JzTlloTXJqSGlxWkRUVUFTSGc7c3BlYy9jb25uZWN0aW9ucy8xLjAvaW52aXRhdGlvbiIsICJAaWQiOiAiMmMzYjY5NjMtODc3YS00NDEwLWIwNTctZjVkZWU2NDNjZDc5IiwgImxhYmVsIjogInF3ZXJ0eSIsICJzZXJ2aWNlRW5kcG9pbnQiOiAiaHRvfgfDovLzEwLjEwLjEwLjIwds5MDAyIiwgInJlY2lwaWVudEtleXMiOiBbIjljYXVFbzhpMkdFa0pBYnZTRFBvQ0I0dnU3N05lTDZiUWRORm1RSmF6THJEIl19"
```

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const wallet = await ArnimaSDK.acceptInvitation({}, InvitationUrl)
```

**Returns:**

`Success`: true

### getAllConnections() -> Array

---

Function returns an array of `Objects`.

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const wallet = await ArnimaSDK.getAllConnections()
```

**Returns:**

`Success`: Array[
{
`connectionId`: `string`,
`connection`: `string`,
}, ...
]

`Sample Output`:

```
[{
connection: "{"did":"ADGeeTatN2KSqRaSXDb3jv","didDoc":{"@context":"https://w3id.org/did/v1","id":"ADGeeTatN2KSqRaSXDb3jv","publicKey":[{"id":"ADGeeTatN2KSqRaSXDb3jv#1","type":"Ed25519VerificationKey2018","controller":"ADGeeTatN2KSqRaSXDb3jv","publicKeyBase58":"62CKgBmargJ8mpCw5HWvcn2u3KAmvWNQ1ToyUzY5EkiV"}],"authentication":[{"type":"Ed25519SignatureAuthentication2018","publicKey":"ADGeeTatN2KSqRaSXDb3jv#1"}],"service":[{"id":"ADGeeTatN2KSqRaSXDb3jv;indy","type":"IndyAgent","priority":0,"serviceEndpoint":"http://35.188.200.216:4001/endpoint","recipientKeys":["62CKgBmargJ8mpCw5HWvcn2u3KAmvWNQ1ToyUzY5EkiV"],"routingKeys":["ApWggHJ9wSVCjLbjvjgRthjEC8jS1sUKJbBXxjVpPRxS"]}]},"verkey":"62CKgBmargJ8mpCw5HWvcn2u3KAmvWNQ1ToyUzY5EkiV","theirLabel":"ABC FIRM","state":"COMPLETE","theirDid":"6rLDWC9VPNz4f2TNePno9t","theirDidDoc":{"@context":"https://w3id.org/did/v1","id":"did:sov:6rLDWC9VPNz4f2TNePno9t","publicKey":[{"id":"did:sov:6rLDWC9VPNz4f2TNePno9t#1","type":"Ed25519VerificationKey2018","controller":"did:sov:6rLDWC9VPNz4f2TNePno9t","publicKeyBase58":"4Bww2NMiuWy2NBHyJUZXxU16SXydchHJfBwWohuzqTWd"}],"authentication":[{"type":"Ed25519SignatureAuthentication2018","publicKey":"did:sov:6rLDWC9VPNz4f2TNePno9t#1"}],"service":[{"id":"did:sov:6rLDWC9VPNz4f2TNePno9t;indy","type":"IndyAgent","priority":0,"recipientKeys":["4Bww2NMiuWy2NBHyJUZXxU16SXydchHJfBwWohuzqTWd"],"serviceEndpoint":"http://34.71.218.3:8004"}]}}"
connectionId: "62CKgBmargJ8mpCw5HWvcn2u3KAmvWNQ1ToyUzY5EkiV"
}, ...]
```

### deleteConnection(connectionId) -> Boolean

---

Deletes a connection from database.

`connectionId`: Unique connection Id

```
230c830d-4bb2-4564-8671-586b45ab8935
```

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const wallet = await ArnimaSDK.deleteConnection(id)
```

**Returns:**

`Success`: true

`Error`: false

### getWallet() -> JSON

---

Get wallet information

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const sdkDB = await ArnimaSDK.getWallet()
```

**Returns:**

`Success`:

```
{
    walletConfig: 'string',
    walletCredentials: 'string',
    label: 'string',
    did: 'string',
    verKey: 'string',
    serviceEndpoint: 'string',
    routingKey: 'string',
    masterSecret: 'string',
}
```

### openWallet() -> boolean

---

To open wallet

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const sdkDB = await ArnimaSDK.openWallet()
```

**Returns:**

`Success`: true

`Error`: false

### importWallet(config, credentials, filePath, key) -> JSON

---

To import a wallet.

`config`: WalletConfig
`credentials`: WalletCredentials
`filePath`: string
`key`: string

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const response = await Arnima.importWallet(
  walletName,
  walletPassword,
  walletFilePath,
  hashedPassphrase
)
```

**Returns:**

`Success`:

```
 {
  mediatorRecord: {
   walletConfig: '{"id":string}',
   label: string,
   serviceEndpoint: string,
   routingKey: string,
   publicDid: string,
   verKey: string,
   masterSecretId: string
  }
 }
```

### sendCredentialProposal(connectionId,credentialProposal, schemaId, credDefId, issuerDid, comment) -> Boolean

---

To send credential proposal.

`connectionId`: object
`credentialProposal`: string
`schemaId`: string
`credDefId`: string
`issuerDid`: string
`comment`: string

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const response = await ArnimaSDK.sendCredentialProposal(
  connectionId,
  credentialProposal,
  schemaId,
  credDefId,
  issuerDid,
  comment
)
```

**Returns:**

`Success`: true

`Error`: false

### acceptCredentialOffer(messageId, inboundMessage) -> Boolean

---

To credential offer.

`messageId`: string
`inboundMessage`: InboundMessage

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const response = await ArnimaSDK.acceptCredentialOffer(
  messageId,
  inboundMessage
)
```

**Returns:**

`Success`: true

### getAllActionMessagesByMessageId(messageId) -> JSON

---

To get all action messages by using `messageId`.

`messageId`: string

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const response = await Arnima.getAllActionMessagesByMessageId(messageId)
```

**Returns:**

`Success`:

```
 {
 message: {
  '@type': string,
  '@id': string,
  '~thread': {},
  comment: string,
  credential_preview: {
   '@type': string,
   attributes: [{
    name: string,
    value: string
   }]
  },
  'offers~attach': [{
   '@id': string,
   'mime-type': string,
   data: {
    base64: string
   }
  }]
 },
 recipient_verkey: string,
 sender_verkey: string
}
```

### getAllCredential(filter) -> Array

---

To get all credential.

`filter`: Object

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const response = await Arnima.getAllCredential(filter)
```

**Returns:**

`Success`:

```
 [{
  referent: string,
  attrs: {
   name: string
  },
  schema_id: string,
  cred_def_id: string,
  rev_reg_id: string,
  cred_rev_id: string
 }]
```

### sendBasicMessage(message, connectionId) -> Boolean

---

Send a basic message.

`message`: string
`connectionId`: string

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const sdkDB = await ArnimaSDK.sendBasicMessage(message, connectionId)
```

**Returns:**

`Success`: true

`Error`: false

### createPool(poolName, poolConfig, defaultPool) -> String

---

To create Pool.

`poolName`: string
`poolConfig`: string
`defaultPool`: boolean

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const response = await ArnimaSDK.createPool(poolName, poolConfig, defaultPool)
```

**Returns:**

`Success`: string

### getAllPool() -> Array

---

To get all pools.

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const response = await Arnima.getAllPool()
```

**Returns:**

`Success`:

```
[{
  type: string,
  id: string,
  value: '{
  "poolName": string,
  "poolConfig": "{"
  reqSignature ": {},
  "txn": {
   "data": {
    "data": {
     "alias": string,
     "blskey": string,
     "blskey_pop": string,
     "client_ip": string,
     "client_port": 9702,
     "node_ip": string,
     "node_port": 9701,
     "services": [string]
    },
    "dest": string
   },
   "metadata": {
    "from": string
   },
   "type": string
  },
  "txnMetadata": {
   "seqNo": 1,
   "txnId": string
  },
  "ver": string
 }
 "}',
 tags: {
  poolName: string,
  isSelected: string
 }
}]
```

### selectDefaultPool(poolName) -> Boolean

---

Send a basic message.

`poolName`: string

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const sdkDB = await ArnimaSDK.selectDefaultPool(poolName)
```

**Returns:**

`Success`: true

### IssueCredentialByConnectionId(connectionId) -> Array

---

To get issue credential by using connection Id.

`connectionId`: string

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const response = await Arnima.getIssueCredentialByConnectionId(connectionId)
```

**Returns:**

`Success`:

```
 [{
   type: string,
   id: string,
   value: '{
   "connectionId": string,
   "theirLabel": string,
   "schemaId": string,
   "credentialDefinitionId": string,
   "state": string,
   "createdAt": string,
   "updatedAt": string
  }',
  tags: {
   issueCredentialId: string,
   connectionId: string
  }
 }]
```

### exportWallet(filePath, key) -> Boolean

---

To export a wallet.

`filePath`: string
`key`: string

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const response = await ArnimaSDK.exportWallet(filePath, key)
```

**Returns:**

`Success`: true

`Error`: false

### sendProof(messageId,inboundMessage, revealAttributes) -> Boolean

---

To send a proof.

`messageId`: string
`inboundMessage`: InboundMessage
`revealAttributes`: boolean

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const response = await ArnimaSDK.sendProof(
  messageId,
  inboundMessage,
  revealAttributes
)
```

**Returns:**

`Success`: true

`Error`: false

### verifyProof(messageId, inboundMessage) -> Boolean

---

To send a proof.

`messageId`: string
`inboundMessage`: InboundMessage

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const response = await ArnimaSDK.verifyProof(messageId, inboundMessage)
```

**Returns:**

`Success`: true

`Error`: false

### getPresentationByConnectionId(connectionId) -> Array

---

To get connection presented by using connection Id.

`connectionId`: string

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const response = await Arnima.getPresentationByConnectionId(connectionId)
```

**Returns:**

`Success`:

```
[{
  type: string,
  id: string,
  value: '{
  "connectionId": string,
  "theirLabel": string,
  "threadId": string,
  "presentationRequest": {
   "name": string,
   "requested_predicates": {},
   "requested_attributes": {
    "additionalProp1": {
     "name": string,
     "non_revoked": {
      "to": long
     },
     "restrictions": [{
      "cred_def_id": string
     }]
    }
   },
   "version": string,
   "nonce": string
  },
  "state": string,
  "updatedAt": string,
  "createdAt": string
 }',
 tags: {
  connectionId: string,
  messageId: string,
  presentationId: string
 }
}]
```

### getConnectionRecord(query) -> Array

---

To get connection record.

`query`: Object

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const response = await Arnima.getConnectionRecord(query)
```

**Returns:**

`Success`:

```
[{
  type: string,
  id: string,
  value: '{
  "didDoc": {
   "@context": string,
   "id": string,
   "publicKey": [{
    "id": string,
    "type": string,
    "controller": string,
    "publicKeyBase58": string
   }],
   "authentication": [{
    "type": string,
    "publicKey": string
   }],
   "service": [{
    "id": string,
    "type": string,
    "priority": int,
    "serviceEndpoint": string,
    "recipientKeys": [string],
    "routingKeys": [string]
   }]
  },
  "verkey": string,
  "alias": {},
  "state": string,
  "createdAt": string,
  "updatedAt": string
 }',
 tags: {
  connectionId: string
 }
}]
```

### getPresentationRecord(query) -> Array
---

To get connection record.

`query`: Object

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const response = await Arnima.getPresentationRecord(query)
```

**Returns:**

`Success`:

```
[{
  "type": string,
  "id": string,
  "value": '{
  "connectionId": string,
  "theirLabel": string,
  "threadId": string ",
  "presentationRequest": {
   "name": string,
   "requested_predicates": {},
   "requested_attributes": {
    "additionalProp1": {
     "name": string,
     "non_revoked": {
      "to": long
     },
     "restrictions": [{
      "cred_def_id": string
     }]
    }
   },
   "version": string,
   "nonce": string
  },
  "presentation": {
   "proof": {
    "proofs": [{
     "primary_proof": {
      "eq_proof": {
       "revealed_attrs": {
        "name": string
       },
       "a_prime": string,
       "v": string,
       "m": {
        "master_secret": string
       },
       "m2": string
      },
      "ge_proofs": []
     },
     "non_revoc_proof": string
    }],
    "aggregated_proof": {
     "c_hash": string,
     "c_list": [
      [int, int, int....]
     ]
    }
   },
   "requested_proof": {
    "revealed_attrs": {
     "additionalProp1": {
      sub_proof_index ":int,
      "raw": string,
      "encoded": string

     }
    }
   }
  }
 }
}]
```

### sendPresentProofRequest(connectionId, proofRequest, comment) -> Boolean

---

To send a present proof.

`connectionId`: string
`proofRequest`: object
`comment`: string

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const response = await ArnimaSDK.sendPresentProofRequest(
  connectionId,
  proofRequest,
  comment
)
```

**Returns:**

`Success`: true

`Error`: false

### sendProposePresentation(connectionId, presentationProposal) -> Boolean

---

To send a present proof.

`connectionId`: string
`presentationProposal`: object

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

const response = await ArnimaSDK.sendProposePresentation(
  connectionId,
  presentationProposal
)
```

**Returns:**

`Success`: true

`Error`: false

## Socket Methods

We are using socket for communication between app and mediator agent.

### socketInit() -> void

---

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

indy.socketInit()
```

### socketEmit() -> void

---

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

indy.socketEmit()
```

### socketListener() -> void

---

**Example:**

```ts
import ArnimaSDK from 'react-native-arnima-sdk'

indy.socketListener()
```

### Receive an event on your mobile app

You can receive event in mobile application when connection is established. Receive the credentials and proof request.

```ts
import { EventRegister } from 'react-native-event-listeners';

componentDidMount() {
        this.listener = EventRegister.addEventListener('SDKEvent', (data) => {
            // write your code here...
        });
    }

    componentWillUnmount() {
        EventRegister.removeEventListener(this.listener);
    }
```
