/**
 * 
 * @author Georgi Angelov
 * 
 * License: MIT
 * 
 * I think this implementation is not that efficient and by any means it is not secure.
 * Refrain from usnig it in production code, instead use built-in or third party (extensively tested)
 * libraries like OpenSSL.
 * 
 * I think i could have reduced a lot of overhead by just hardcoding everything... Whatever -_-'.
 * 
 */
const FIELD_ORDER = 8;

const GFMathGenerator = require('./gfMath');
const GFMath = GFMathGenerator(FIELD_ORDER);

const StateArray = require('./aes-state-array');
const assert = require('assert');

const BLOCK_SIZE = 0x10 // 16 bytes

const OPERATION_MODES = {

    CBC: 1,
    CTR: 2

}

const ITERATIONS = {

    128: 10,
    192: 12,
    256: 14

}

const STATE_ROUND_SHIFTS = [0, 1, 2, 3]

const PADDING_STRATEGIES = {

    PKCS5: padPKCS5
}

var BYTE_SUBSTITUTION_TABLE = [];
var BYTE_INVERSE_SUBSTITUTION_TABLE = [];


/**
 * 
 * @author Georgi Angelov 
 * 
 * Encrypt a plaintext using the AES blockcipher. 
 * 
 * 
 * @param {ArrayBuffer} key - The key used for encryption. Based on the length disclosed in the options object,
 * the function might throw an excepton if the required key length is not met. 
 * @param {ArrayBuffer} buffer - The plaintext as a Node Buffer. The message will be padded if required by the cipher.
 * @param {object} options - The options for the enciphering algorithm. 
 * 
 * Example of an options vector
 * ===================================
 * 
 * var aes = require("./aes');
 * 
 * options = {
 * 
 *  strength: 128/196/256, # if the given strength is different than those 3 values -> Exception will be thrown
 *  mode: aes.modes.CBC,
 *  padding: aes.padding.PKCS5, # Not required in some modes (e.g CTR)
 * 
 *  ~ Optional ~
 *  provideIV: false, # True by default. If left alone you are not required to specify Initialization Vector
 *  IV: 0x21041d9b067b1236bb9b87131f748107 # 16 Byte Initialization Vector 
 *  ~ Optional ~
 * 
 * }
 * 
 * 
 * ===================================
 * 
 */
var encrypt = (function (key, buffer, options) {

    let strength = options.strength;

    _keyValidityCheck(key, strength);

    let PaddingScheme = options.padding;
    let paddedBuffer = PaddingScheme(buffer);

    let stateArray = new StateArray(paddedBuffer);
    let iterations = ITERATIONS[strength];

    //add first round key

    for (let i = 0; i < iterations - 1; i++) {

        subBytes(block);
        shiftRows(block);
        mixColumns(b)

    }


});

/**
 * 
 * @author Georgi Angelov
 * 
 * This function deciphers messages enciphered with AES-128/192/256 using inverse steps. It operates in different
 * modes and can be customized a bit. 
 * 
 * @param {ArrayBuffer} buffer - The ciphertext you want to decrypt. The IV should be prepended to it
 * @param {ArrayBuffer} key - The key to decrypt with
 * @param {object} options - Deciphering options. @see encrypt to learn how this object should be structured
 */
var decrypt = (function (buffer, key, options) {

    /**
     * 
     * @author Georgi Angelov
     * 
     * This function is used when a ciphertext is encrypted using the CBC mode of operation.
     * 
     * The CBC decryption procedure differes from the other modes of operation.
     * 
     * Steps Involved:
     * 1.Expand Key
     * 2.Iterate over the cipherblocks
     * 3.Decipher each block and XOR it with the previus one (the first is XOR-ed with the IV) to obtain the plaintext
     * equivalent.
     * 
     * For more info on the deciphering step @see decipher()
     * 
     * @param {ArrayBuffer} buffer - The ciphertext as Buffer object
     * @param {ArrayBuffer} key - The encryption key that was used as a Buffer object
     * @param {ArrayBuffer} IV - The initialization vector that was used as a Buffer object
     * @param {number} blocksCount - The count of the cipherblocks
     */
    const cbcDecrypt = function (buffer, key, IV, blocksCount) {

        let oldBlock = new StateArray(IV);
        let iterations = ITERATIONS[key.byteLength * 8];

        let keys = expandKey(key, iterations);

        let plaintextBlocks = [];

        for (let i = 0; i < blocksCount; i++) {

            let offset = i * BLOCK_SIZE;
            let end = offset + BLOCK_SIZE

            let stateArray = new StateArray(buffer.slice(offset, end));
            let oldState = oldBlock;
            oldBlock = stateArray.deepCopy();

            decipher(stateArray, keys, iterations);

            stateArray.xor(oldState);

            plaintextBlocks.push(stateArray.toBuffer().toString('hex'));

        }

        let plaintextBuffer = stripPadding(Buffer.from(plaintextBlocks.join(''), 'hex'));
        return plaintextBuffer.toString('ascii');

    };

    /**
     * 
     * @author Georgi Angelov
     * 
     * This function is used when a ciphertext is encrypted using the CTR mode of operation.
     * The CTR mode of operation uses the BlockCipher Strategy to generate a Pseudo-Random Encryption Key
     * and then XOR each block with its corresponding part from the key, thus turning AES into a "Stream Cipher".
     * 
     * ~ CTR ~
     * 
     * G: I -> K is a PRG that takes an input I: {0, 1}^128 and outputs a k <- K from the key space K, where
     * k: {0, 1}^messageLength 
     * 
     * ~ ~ ~ ~
     * 
     * The CTR decryption procedure differes from the other modes of operation.
     * 
     * Steps Involved:
     * 1.Expand Key
     * 2.Iterate over the cipherblocks
     * 3.Each time encipher the IV with XOR-ed counter (incremented each iteration) and then use the ciphertext
     * it outputs to XOR with the ciphertext block you want to decrypt
     *   
     * @param {ArrayBuffer} buffer - The ciphertext as Buffer object
     * @param {ArrayBuffer} key - The encryption key that was used as a Buffer object
     * @param {ArrayBuffer} IV - The initialization vector that was used as a Buffer object
     * @param {number} blocksCount - The count of the cipherblocks
     */
    const ctrDecrypt = (function (buffer, key, IV, blocksCount) {

        
        let bufferPadLength = BLOCK_SIZE - (buffer.byteLength % BLOCK_SIZE);

        buffer = Buffer.concat([buffer, Buffer.alloc(bufferPadLength)]);

        let iterations = ITERATIONS[key.byteLength * 8];
        let keys = expandKey(key, iterations);

        let iv = IV;
        let ivByte = iv.length - 1;

        let plaintextBlocks = [];

        for (let i = 0; i < blocksCount; i++) {

            // Build State Array from incremented IV

            let ivStateArray = new StateArray(iv);

            encipher(ivStateArray, keys, iterations);

            let offset = i * BLOCK_SIZE;
            let end = offset + BLOCK_SIZE

            let currentBuffer = buffer.slice(offset, end);

            let stateArray = new StateArray(currentBuffer);


            stateArray.xor(ivStateArray);

            // Increment IV
            let byte = iv[ivByte];
            while (byte + 1 > (1 << FIELD_ORDER) - 1)
                ivByte--;
                byte = iv[ivByte];

            iv[ivByte] = byte + 1;

            plaintextBlocks.push(stateArray.toBuffer().toString('hex'));

        }

        let plaintextBuffer = Buffer.from(plaintextBlocks.join(''), 'hex');
        plaintextBuffer = plaintextBuffer.slice(0, plaintextBuffer.byteLength - bufferPadLength);
        return plaintextBuffer.toString('ascii');

    });

    const INCORRECT_BLOCK_COUNT = `The ciphertex you provided is of invalid size. ` +
        `${buffer.byteLength} should be multiple of 16`;

    const INCORRECT_MODE = `The mode of operation should be in ${OPERATION_MODES}. You provided ${options.mode}`;

    let strength = options.strength;

    _keyValidityCheck(key, strength);

    let IV = buffer.slice(0, 16);
    let originalBuffer = buffer.slice(16);
    let blocksCount = originalBuffer.byteLength / 16;
    let mode = options.mode;

    switch (mode) {

        case 1:
            if (buffer.byteLength % BLOCK_SIZE !== 0) {
                throw Error(INCORRECT_BLOCK_COUNT);
            }
            return cbcDecrypt(originalBuffer, key, IV, blocksCount);
        case 2:
            return ctrDecrypt(originalBuffer, key, IV, blocksCount);
        default:
            throw Error(INCORRECT_MODE)

    }

});

/**
 * 
 * This function wraps the logic that is required to encrypt a single block of the plaintext.
 * This function changes the state of the state array, but not of the keys collaction.
 * 
 * Pre-First-Round -> XOR with The Firtst Key from the Schedule
 * 
 * 1.SubBytes - Substitutes each byte with the corresponding one in the SUB_BYTES_TABLE
 * 2.ShiftRows - Shifts Left each row [0,1,2,3] accordingly
 * 3.AddRoundKey - XOR the current round key with the state array
 * 4.MixColumns - Each byte gets substitutet by a one that depends on every byte in its column
 * 
 * Last Round: Repeat each step but leave out MixColumns.
 * 
 * @param {StateArray} stateArray - The current block state
 * @param {Iterable} keys - Iterable collection of keys
 * @param {number} iterations - Number of iterations to perform (based on the key length) 
 */
var encipher = function (stateArray, keys, iterations) {

    let preRoundKey = keys[0];
    let afterRoundKey = keys[keys.length - 1];

    stateArray.xor(preRoundKey);

    for (let iteration = 1; iteration < iterations; iteration++) {

        let roundKey = keys[iteration];

        subBytes(stateArray);
        shiftRows(stateArray);
        mixColumns(stateArray);
        stateArray.xor(roundKey);

    }

    subBytes(stateArray);
    shiftRows(stateArray);

    stateArray.xor(afterRoundKey);


}
/**
 * 
 * This function wraps the logic that is required to revert the encryption algorithm. 
 * *Note* ... This function changes the state of the state array since it is a mutable collection, but it doesn't
 * change the keys.
 * 
 * It basically does every step from the encryption part, but in reverse order.
 * 
 * Pre-First-Round -> Add Last Round Key
 * 
 * 1.InverseShiftRows - Shift Right each row [0,1,2,3] accordingly
 * 2.InverseSubBytes - Substitute each byte with with its equivalent from the INVERSE_SUB_TABLE
 * 3.AddRoundKey - XOR the round key (reverse order) with the state array
 * 4.InverseMixColumns - Ivert the mix columns step
 * 
 * Last Round: repeat each step but leave out the InverseMixColumns
 * 
 * 
 * @param {StateArray} stateArray - The current block state
 * @param {Iterable} keys - Iterable collection of keys
 * @param {number} iterations - Number of iterations to perform (based on the key length) 
 */
var decipher = function (stateArray, keys, iterations) {

    let preRoundKey = keys[keys.length - 1];
    let afterRoundKey = keys[0];

    stateArray.xor(preRoundKey);

    for (let iteration = 0; iteration < iterations - 1; iteration++) {

        let roundKey = keys[keys.length - iteration - 2];

        inverseShiftRows(stateArray);
        inverseSubBytes(stateArray);
        stateArray.xor(roundKey);
        inverseMixColumns(stateArray);
    }

    inverseShiftRows(stateArray);
    inverseSubBytes(stateArray);

    stateArray.xor(afterRoundKey);

}
/**
 * Performs byte substitution for each column in the state array
 * This function directly mutates the state array since it is a mutable collection
 * 
 * @param {StateArray} stateArray - The state array
 * 
 */
var subBytes = function (stateArray) {

    for (let col = 0; col < stateArray.dimens; col++) {
        stateArray.substituteColumn(col, (byte) => {
            return substituteByte(byte, false);
        });
    }

}
/**
 * Performs inverse byte substitution for each column in the state array. It uses a custom delegate instead of
 * the substituteByte one since you must explicitly say that you want to use the INVERSE_BYTE_TABLE
 * This function directly mutates the state array since it is a mutable collection
 *
 * @param {StateArray} stateArray - The state array
 */
var inverseSubBytes = function (stateArray) {

    for (let col = 0; col < stateArray.dimens; col++) {

        let inverseDelegate = (byte) => {
            return substituteByte(byte, true);
        }

        stateArray.substituteColumn(col, inverseDelegate);
    }
}

/**
 * This function shifts every row to the right circularly.
 * @param {StateArray} stateArray - The state array of bytes
 */
var shiftRows = function (stateArray) {
    stateArray.shiftRowsLeft(STATE_ROUND_SHIFTS);
}
/**
 * This function shifts every row to the left circularly.
 * @param {StateArray} stateArray - The state array of bytes
 */
var inverseShiftRows = function (stateArray) {
    stateArray.shiftRowsRight(STATE_ROUND_SHIFTS);
}

/**
 * 
 * 
 * @param {StateArray} stateArray 
 */
var mixColumns = function (stateArray) {

    let dimens = stateArray.dimens

    for (let col = 0; col < dimens; col++) {

        let newColumn = [];

        for (let row = 0; row < dimens; row++) {

            let byte = stateArray.at(row, col);
            let second = stateArray.at((row + 1) % dimens, col);
            let third = stateArray.at((row + 2) % dimens, col);
            let last = stateArray.at((row + 3) % dimens, col);

            // Multiplies the polynomial at row/col with x^2
            byte = GFMath.PolynomialMultiply(0x02, byte);
            // Multiplies the polynomial at row/col+1 with x^2 + 1
            second = GFMath.PolynomialMultiply(0x03, second);

            let mixedByte = byte ^ second ^ third ^ last;

            newColumn.push(mixedByte);
        }

        for (let i = 0; i < dimens; i++) {
            stateArray.set(i, col, newColumn[i]);
        }

    }

}
var inverseMixColumns = function (stateArray) {

    let dimens = stateArray.dimens

    for (let row = 0; row < dimens; row++) {
        let newColumn = [];
        for (let col = 0; col < dimens; col++) {

            let byte = stateArray.at(col, row);
            let second = stateArray.at((col + 1) % dimens, row);
            let third = stateArray.at((col + 2) % dimens, row);
            let last = stateArray.at((col + 3) % dimens, row);

            // Multiplies the polynomial at row/col with x^3 + x^2 + x
            byte = GFMath.PolynomialMultiply(0x0e, byte);
            // Multiplies the polynomial at row/col+1 with x^3 + x + 1
            second = GFMath.PolynomialMultiply(0x0b, second);
            // Multiplies the polynomial at row/col+2 with x^3 + x^2 + 1
            third = GFMath.PolynomialMultiply(0x0d, third);
            // Multiplies the polynomial at row/col+3 with x^3 + 1
            last = GFMath.PolynomialMultiply(0x09, last);

            let mixedByte = byte ^ second ^ third ^ last;
            newColumn.push(mixedByte);
        }

        for (let i = 0; i < dimens; i++) {
            stateArray.set(i, row, newColumn[i]);
        }

    }

}

/**
 * 
 * @author Georgi Angelov
 * 
 * Takes a key of arbitrary size and expands it into multiple round keys using the StateArray as
 * basis of the expansion. Later the round keys will be used for encryption and decryption rounds.
 * 
 * No explicit validity checks will be performed here since you only enter this function if the key
 * is of valid size and type.
 * 
 * IMPORTANT! For now this is only a 128 bit expansion scheduler. Later i might implement the 192/256 versions
 * of the schedule.
 * 
 * @param {ArrayBuffer} key - The key you want to expand
 */
var expandKey = function (key, iterations) {

    // The function that is applied to a byte word from the last round to get the first word
    // of the next round key
    var g = (function (state, rconst) {

        let element = state.shift();
        state.push(element);

        state = state.map(x => substituteByte(x, false));
        return xorblock(state, rconst);

    });

    let keyState = new StateArray(key);
    let keys = [keyState];

    let roundConstantVector = [0x01, 0x00, 0x00, 0x00];

    for (let i = 0; i < iterations; i++) {

        // Perform derivation round
        let previousState = keys[keys.length - 1];
        let prevStateBytes = previousState.getColumn(previousState.dimens - 1);
        let mutatedWord = g(prevStateBytes, roundConstantVector);

        let generator = xorblock(previousState.getColumn(0), mutatedWord);

        let roundBytes = generator
        for (let i = 1; i < previousState.dimens; i++) {
            let next = xorblock(generator, previousState.getColumn(i));
            roundBytes = Buffer.concat([roundBytes, next]);
            generator = next;
        }

        let nextState = new StateArray(roundBytes);
        keys.push(nextState);

        roundConstantVector[0] = GFMath.PolynomialMultiply(0x02, roundConstantVector[0]);

    }

    assert(keys.length === iterations + 1, "Something went wrong with the Key Expansion Scheme");

    return keys;
}
/**
 * 
 * @author Georgi Angelov
 * 
 * Pads the provided bytes buffer using PKCS5. The padding here always rounds the size of the plaintext,
 * so that it can be equally divided by @see BLOCK_SIZE. If no padding is required (e.g plaintext is 32 bytes), 
 * the padding function adds a 16byte dummy block.
 * 
 * @param {ArrayBuffer} buffer 
 * 
 * @returns {ArrayBuffer}
 */
var padPKCS5 = function (buffer) {

    let sizeRemainder = buffer.byteLength % BLOCK_SIZE;

    //Is padding required
    if (sizeRemainder === 0) {

        //Add dummy block -> exact padding not required
        let dummy = Buffer.alloc(BLOCK_SIZE).fill(BLOCK_SIZE);
        let paddedWithDummyBlock = Buffer.concat([buffer, dummy]);
        return paddedWithDummyBlock;
    }

    // Add exact padding

    let paddingBuffer = Buffer.alloc(sizeRemainder).fill(sizeRemainder);
    let paddedPlaintext = Buffer.concat([buffer, paddingBuffer]);
    console.log(buffer);
    return paddedPlaintext
}
var stripPadding = function (buffer) {

    let lastByte = buffer[buffer.byteLength - 1];

    let offset = buffer.byteLength - lastByte;

    let result = buffer.slice(0, offset);

    return result;
}
/**
 * 
 * Xorblock performs bitwise xor on a sequence of bytes. 
 * If you provide blocks of different size an exception will be thrown. 
 * You are not obliged to provide buffers. You can use simple byte array.
 * 
 * @param {ByteString} left 
 * @param {ByteString} right 
 * 
 * @returns {Object} result
 */
const xorblock = function (left, right) {

    if (left.length !== right.length) {
        throw Error(`The provided blocks of data are not equal in size. ${left.length} != ${right.length}`);
    }

    let result = Buffer.alloc(left.length);

    for (let i = 0; i < left.length; i++) {
        result[i] = left[i] ^ right[i];
    }

    return result;
}
/**
 * @author Georgi Angelov
 * 
 * Computes the Substitution Table required for the substitution step
 * 
 * The table is of size 16x16 and is calculated in GF(2^8) ->
 * -> using x^8 + x^4 + x^3 + x + 1 as the irreducible polynomial (otherwise said 100011011)
 * 
 * Step 1. Fill the table with initialization data. -> row 0x10 and col 0x09 -> (row,col) = 0x19
 * Step 2. Replace polynomial (bit pattern) in the table with its multiplicative inverse in GF(2^8)
 * Step 3. Using an affine transofrmation matrix that is constructed of single bit pattern and its shifts.
 * Step 4. Reverse The Steps to create the same matrix for the deciphering procedure.
 * 
 */
var computeSubstitutionTables = function () {

    BYTE_SUBSTITUTION_TABLE = [];
    BYTE_INVERSE_SUBSTITUTION_TABLE = [];

    const TABLE_ROWS = 16;
    const TABLE_COLUMNS = 16;

    // Enciphering bit
    const SPECIAL_BIT = 0x63;
    // Deciphering bit
    const SPECIAL_BIT_INVERSE = 0x05;

    let counter = 0;

    for (let i = 0; i < TABLE_ROWS; i++) {

        let column = [];
        let inverseColumn = [];

        for (let j = 0; j < TABLE_COLUMNS; j++) {
            // Find inverse
            let encrInverse = GFMath.PolynomialInverse(counter);
            encrInverse = encrInverse ^ RShiftCircular(encrInverse, 4) ^ RShiftCircular(encrInverse, 5) ^
                RShiftCircular(encrInverse, 6) ^ RShiftCircular(encrInverse, 7) ^ SPECIAL_BIT;

            let decrInverse = counter;
            decrInverse = RShiftCircular(decrInverse, 2) ^
                RShiftCircular(decrInverse, 5) ^ RShiftCircular(decrInverse, 7) ^ SPECIAL_BIT_INVERSE;

            decrInverse = GFMath.PolynomialInverse(decrInverse);

            column.push(encrInverse);
            inverseColumn.push(decrInverse);
            counter++;
        }
        BYTE_SUBSTITUTION_TABLE.push(column);
        BYTE_INVERSE_SUBSTITUTION_TABLE.push(inverseColumn);
    }

}
/**
 * 
 * @author Georgi Angelov
 * 
 * This function takes a byte and shifts its bits circularly.
 * Example: 
 * 1. RShiftCircular(0b00000001, 1) -> 0b10000000
 * 2. RShiftCircular(0b10000000, 4) -> 0b00000100
 * @param {number} pattern - The byte (or the bit pattern)
 * @param {number} shifts - The number of right shifts you want to perform
 */
var RShiftCircular = function (pattern, shifts, bitsize) {

    const INVALID_ARGUMENTS = `The arguments are expected to be of type 'number'`;
    const BIT_SIZE = bitsize || 8;

    if (typeof (pattern) !== 'number' || typeof (shifts) !== 'number') {
        throw Error(INVALID_ARGUMENTS);
    }

    // The reason we use 8 is that the elements of the GF(2^8) field are bit patterns with 8 bits at most
    let lshifts = (BIT_SIZE - shifts % BIT_SIZE)
    let rshifts = shifts % BIT_SIZE;

    let lsbMask = (1 << rshifts) - 1
    let mask = (pattern & lsbMask) << lshifts;

    let shifted = (pattern >> rshifts) | mask;

    return shifted;

}
/**
 * This function just maps a byte to a substiute byte by calculating the byte's position
 * in the substitution or the inverse substitution table
 * @see BYTE_SUBSTITUTION_TABLE
 * @see BYTE_INVERSE_SUBSTITUTION_TABLE
 * 
 * @param {number} byte - The byte you want to swap out
 * @param {boolean} inverse - Should the inverse table be used
 */
var substituteByte = function (byte, inverse) {

    let tableDimens = 16;
    let row = Math.trunc(byte / tableDimens);
    let column = byte % tableDimens;

    return inverse ? BYTE_INVERSE_SUBSTITUTION_TABLE[row][column] : BYTE_SUBSTITUTION_TABLE[row][column];

}
var _keyValidityCheck = function (key, strength) {

    const KEY_LENGTH_ERROR = `The key you provided is of length ${key.byteLength}. It should be of size (128, 192, 256)`;

    if (!(strength in ITERATIONS)) {
        throw Error(KEY_LENGTH_ERROR);
    }
}

computeSubstitutionTables();

module.exports = {
    encipher: encrypt,
    decipher: decrypt,
    padding: PADDING_STRATEGIES,
    modes: OPERATION_MODES,
    utils: {
        CircularRightShift: RShiftCircular
    }
}