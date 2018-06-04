
// AES Decryption Test
// The only purpose of this test is to decipher the given ciphertexts. I need it for an Assignment :)
// Have a nice day ^^ 
// @see https://www.youtube.com/watch?v=nutzDtjnMNg
const AES = require('./aes');

const CBC_OPTIONS = {

    strength: 128,
    mode: AES.modes.CBC,
    padding: AES.padding.PKCS5

}

const CTR_OPTIONS = {

    strength: 128,
    mode: AES.modes.CTR,
    padding: AES.padding.PKCS5

}

// Test 1 (CBC)
let ciphertext1 = Buffer.from("4ca00ff4c898d61e1edbf1800618fb2828a226d160dad07883"
 + "d04e008a7897ee2e4b7465d5290d0c0e6c6822236e1daafb94ffe0c5da05d9476be028ad7c1d81", "hex");

let key1 = Buffer.from("140b41b22a29beb4061bda66b6747e14", "hex");

let plaintext1 = AES.decipher(ciphertext1, key1, CBC_OPTIONS);

console.log("\n");
console.log(`Test 1 CBC -> ${plaintext1}`);
console.log("\n");

// Test 2 (CBC)

let ciphertext2 = Buffer.from("5b68629feb8606f9a6667670b75b38a5b4832d0f26e1ab7da33249de7d4afc48" 
 + "e713ac646ace36e872ad5fb8a512428a6e21364b0c374df45503473c5242a253", "hex");

let key2 = Buffer.from("140b41b22a29beb4061bda66b6747e14", "hex");

let plaintext2 = AES.decipher(ciphertext2, key2, CBC_OPTIONS);

console.log("\n");
console.log(`Test 2 CBC -> ${plaintext2}`);
console.log("\n");

// Test 3 (CTR)

let ciphertext3 = Buffer.from("69dda8455c7dd4254bf353b773304eec0ec7702330098ce7f7520d1c"
+ "bbb20fc388d1b0adb5054dbd7370849dbf0b88d393f252e764f1f5f7ad97ef79d59ce29f5f51eeca32eabedd9afa9329", "hex");

let key3 = Buffer.from("36f18357be4dbd77f050515c73fcf9f2", "hex");

let plaintext3 = AES.decipher(ciphertext3, key3, CTR_OPTIONS);

console.log("\n");
console.log(`Test 1 CTR -> ${plaintext3}`);
console.log("\n");

// Test 4 (CTR)

let ciphertext4 = Buffer.from("770b80259ec33beb2561358a9f2dc617e46218c0a5" 
+ "3cbeca695ae45faa8952aa0e311bde9d4e01726d3184c34451", "hex");

let key4 = Buffer.from("36f18357be4dbd77f050515c73fcf9f2", "hex");

let plaintext4 = AES.decipher(ciphertext4, key4, CTR_OPTIONS);

console.log("\n");
console.log(`Test 2 CTR -> ${plaintext4}`);
console.log("\n");