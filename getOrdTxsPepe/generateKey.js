#!/usr/bin/env node

const dogecore = require('./bitcore-lib-pepe');
const { PrivateKey, Address } = dogecore;

// Generate a new private key
const privateKey = new PrivateKey();

// Get the WIF format of the private key
const wif = privateKey.toWIF();

// Generate the corresponding address
const address = privateKey.toAddress();

console.log('New WIF Private Key:', wif);
console.log('Corresponding Address:', address.toString());