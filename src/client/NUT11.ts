import { PrivKey, bytesToHex, hexToBytes } from '@noble/curves/abstract/utils';
import { sha256 } from '@noble/hashes/sha256';
import { schnorr } from '@noble/curves/secp256k1';
import { randomBytes } from '@noble/hashes/utils';
import { parseSecret } from '../common/NUT11.js';
import { Proof, Secret } from '../common/index.js';
import { BlindedMessage, serializeBlindedMessage } from './index.js';
import { ProjPointType } from '@noble/curves/abstract/weierstrass.js';

export const createP2PKsecret = (pubkey: string): Uint8Array => {
	const newSecret: Secret = [
		'P2PK',
		{
			nonce: bytesToHex(randomBytes(32)),
			data: pubkey
		}
	];
	const parsed = JSON.stringify(newSecret);
	return new TextEncoder().encode(parsed);
};

export const signP2PKsecret = (secret: Uint8Array, privateKey: PrivKey) => {
	const msghash = sha256(new TextDecoder().decode(secret));
	const sig = schnorr.sign(msghash, privateKey);
	return sig;
};

export const signBlindedMessage = (B_: string, privateKey: PrivKey): Uint8Array => {
	const msgHash = sha256(B_);
	const sig = schnorr.sign(msgHash, privateKey);
	return sig;
};

export const getSignedProofs = (proofs: Array<Proof>, privateKey: string): Array<Proof> => {
	return proofs.map((p) => {
		try {
			const parsed: Secret = parseSecret(p.secret);
			if (parsed[0] !== 'P2PK') {
				throw new Error('unknown secret type');
			}
			return getSignedProof(p, hexToBytes(privateKey));
		} catch (error) {
			return p;
		}
	});
};

export const getSignedOutput = (output: BlindedMessage, privateKey: PrivKey): BlindedMessage => {
	const B_ = output.B_.toHex(true);
	const signature = signBlindedMessage(B_, privateKey);
	output.witness = { signatures: [bytesToHex(signature)] };
	return output;
};

export const getSignedOutputs = (
	outputs: Array<BlindedMessage>,
	privateKey: string
): Array<BlindedMessage> => {
	return outputs.map((o) => getSignedOutput(o, privateKey));
};

export const getSignedProof = (proof: Proof, privateKey: PrivKey): Proof => {
	if (!proof.witness) {
		proof.witness = {
			signatures: [bytesToHex(signP2PKsecret(proof.secret, privateKey))]
		};
	}
	return proof;
};
