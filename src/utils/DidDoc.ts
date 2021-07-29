/*
  Copyright AyanWorks Technology Solutions Pvt. Ltd. All Rights Reserved.
  SPDX-License-Identifier: Apache-2.0
*/

export enum PublicKeyType {
  RSA_SIG_2018 = 'RsaVerificationKey2018|RsaSignatureAuthentication2018|publicKeyPem',
  ED25519_SIG_2018 = 'Ed25519VerificationKey2018|Ed25519SignatureAuthentication2018|publicKeyBase58',
  EDDSA_SA_SIG_SECP256K1 = 'Secp256k1VerificationKey2018|Secp256k1SignatureAuthenticationKey2018|publicKeyHex',
}

export class Authentication {
  publicKey: PublicKey;
  embed: boolean;

  constructor(publicKey: PublicKey, embed: boolean = false) {
    this.publicKey = publicKey;
    this.embed = embed;
  }

  toJSON() {
    const [ver_type, auth_type, specifier] = this.publicKey.type.split('|');
    return this.embed
      ? this.publicKey.toJSON()
      : {
          type: auth_type,
          publicKey: this.publicKey.id,
        };
  }
}

export class DidDoc {
  '@context': string;
  id: string;
  publicKey: PublicKey[];
  service: Service[];
  authentication: Authentication[];

  constructor(id: string, authentication: Authentication[], publicKey: PublicKey[], service: Service[]) {
    this['@context'] = 'https://w3id.org/did/v1';
    this.id = id;
    this.publicKey = publicKey;
    this.service = service;
    this.authentication = authentication;
  }

  toJSON() {
    const publicKey = this.publicKey.map(pk => pk.toJSON());
    const authentication = this.authentication.map(auth => auth.toJSON());
    const service = this.service.map(s => s.toJSON());
    return {
      '@context': this['@context'],
      id: this.id,
      publicKey,
      authentication,
      service,
    };
  }

  serialize() {
    return JSON.stringify(this.toJSON());
  }

  static deserialize(doc: string): DidDoc {
    const json = JSON.parse(doc);
    const publicKey = (json.publicKey as [{ [key: string]: any }]).map(pk => {
      return PublicKey.fromJSON(pk);
    });

    const { authentication } = json;
    const auths: Authentication[] = [];
    for (const auth of authentication) {
      if ('publicKey' in auth) {
        // reference type
        let found = false;
        for (let i = 0; i < publicKey.length; i++) {
          if (auth.publicKey === publicKey[i].id) {
            auths.push(new Authentication(publicKey[i]));
            found = true;
            break;
          }
        }
        if (!found) {
          throw new Error(`Invalid public key referenced ${auth.publicKey}`);
        }
      } else {
        // embedded
        const pk = PublicKey.fromJSON(auth);
        auths.push(new Authentication(pk, true));
      }
    }
    const service = (json.service as [{ [key: string]: any }]).map(s => Service.fromJSON(s));
    const didDoc = new DidDoc(json.id, auths, publicKey, service);
    return didDoc;
  }
}

export class PublicKey {
  id: string;
  type: PublicKeyType;
  controller: string;
  value: string;

  constructor(id: string, type: PublicKeyType, controller: string, value: string) {
    this.id = id;
    this.type = type;
    this.controller = controller;
    this.value = value;
  }

  serialize(): string {
    return JSON.stringify(this.toJSON());
  }

  toJSON() {
    // @ts-ignore
    const [ver_type, auth_type, specifier] = this.type.split('|');
    return {
      id: this.id,
      type: ver_type,
      controller: this.controller,
      [specifier]: this.value,
    };
  }

  static deserialize(pk: string): PublicKey {
    const json = JSON.parse(pk);
    return PublicKey.fromJSON(json);
  }

  static fromJSON(pk: { [key: string]: string }): PublicKey {
    const _type: PublicKeyType = Object.keys(PublicKeyType)
      // @ts-ignore
      .map(t => [PublicKeyType[t].split('|')[0], t])
      .filter(verkeyType => verkeyType[0] == pk.type)[0][1];
    const specifier = _type.split('|')[2];
    // @ts-ignore
    return new PublicKey(pk.id, PublicKeyType[_type], pk.controller, pk[`${specifier}`]);
  }
}

export class Service {
  id: string;
  serviceEndpoint: string;
  recipientKeys: string[];
  routingKeys: string[];
  type: string;
  priority: number = 0;

  constructor(
    id: string,
    serviceEndpoint: string,
    recipientKeys: Verkey[] = [],
    routingKeys: Verkey[] = [],
    priority: number = 0,
    type: string
  ) {
    this.id = id;
    this.serviceEndpoint = serviceEndpoint;
    this.recipientKeys = recipientKeys;
    this.routingKeys = routingKeys;
    this.priority = priority;
    this.type = type;
  }

  static deserialize(serviceDoc: string): Service {
    return Service.fromJSON(JSON.parse(serviceDoc));
  }

  static fromJSON(serviceDoc: { [key: string]: any }) {
    const { id, serviceEndpoint, type, priority, recipientKeys, routingKeys } = serviceDoc;
    return new Service(id, serviceEndpoint, recipientKeys, routingKeys, priority || 0, type);
  }

  toJSON(): {} {
    const res: { [key: string]: any } = {
      id: this.id,
      type: this.type,
      priority: this.priority,
      serviceEndpoint: this.serviceEndpoint,
    };

    if (this.recipientKeys) {
      res['recipientKeys'] = this.recipientKeys;
    }
    if (this.routingKeys) {
      res['routingKeys'] = this.routingKeys;
    }
    return res;
  }
}
