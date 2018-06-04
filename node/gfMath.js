/**
 * 
 * @author Georgi Angelov
 * 
 * 
 * 
 * @param {number} n - This parameter specifies what is the type of the Galois Field
 * @param {number} modulus - This is the modulus with which the arithmetic is going to be carried out
 */
var GaloisFieldArithmetic = (function (n, modulus) {

    const INVALID_FIELDTYPE = `This module cannot work with Galois Fields of type 2^${n}.` +
        "Please choose another value.";


    const FIELD = n || 8;
    const MODULUS = modulus || 0x11b; // Defaults to 0b100011011 ~ x^8 + x^4 + x^3 + x + 1

    if (typeof (FIELD) !== 'number' || FIELD < 2) {
        throw Error(INVALID_FIELDTYPE);
    }


    /**
     * This function calculates the Multiplicative Inverse in the current GaloisField.
     * It is implemented using the Extended Euclidean Algorithm. The only difference
     * is that the arithmetic is carried out using the rules of the Field. 
     * (e.g The group operator + represents XOR)
     * 
     * @param {number} element - The element you are trying to find Multiplicative Inverse of.
     * 
     * Modulus of the field (Irreducible Polynomial) -> Defaults to x^8 + x^4 + x^3 + x + 1
     */
    var GFCalculatePolynomialMI = function (element) {

        const INVERSE_NOT_FOUND =
            `Element: ${element} has no modular inverse in GF(2^${n}) with ${MODULUS} as modulus.`;


        // The Additive identity is not suposed to have a Modular Inverse (IN ANY DEFINED FIELD)
        if(element == 0){
            return 0x00;
        }

        let xold = 0x01;
        let x = 0x00;

        let y = 0x01;
        let yold = 0x00;

        let mod = MODULUS;

        while (mod) {

            [quotient, remainder] = GFDividePolynomials(element, mod);
            [element, mod] = [mod, remainder];

            [x, xold] = [xold ^ GFMultiplyPolynomials(quotient, x), x];
            [y, yold] = [yold ^ GFMultiplyPolynomials(quotient, y), y];

        }

        if (element != 1)
            throw Error(INVERSE_NOT_FOUND);

        [quotient, remainder] = GFDividePolynomials(xold ^ mod);

        return remainder;
    }

    /**
     * This function multiplies two polynomials a and b using arithmetic specific to the Field.
     * If the the byte overflows -> apply modular reduction by @constant MODULUS
     * 
     * @param {number} a 
     * @param {number} b 
     */
    var GFMultiplyPolynomials = function (a, b) {

        let result = 0x00;
        const mask = 0x80;

        for (let i = 0; i < FIELD; i++) {

            let polynomial = b & (1 << i);

            if (polynomial)
                result ^= a;

            if (a & mask)
                a = (a << 1) ^ MODULUS;
            else            
                a = a << 1;

        }
        return result;
    }

    var GFMultiplyModular = function (a, b) {

        product = GFMultiplyPolynomials(a, b);
        [quotient, remainder] = GFDividePolynomials(product);

        return remainder;
    }

    /**
     * 
     * 
     * 
     * @param {number} element 
     */
    var GFDividePolynomials = function (dividend, divisor) {

        const MODULUS_ERROR = `Invalid Modulus. The modulus should be an irreducible polynomial of order ${n}`;
        const MOD = divisor || MODULUS;

        if (MOD >= 2 ** (n+1)) {
            throw Error(MODULUS_ERROR);
        }

        let remainder = dividend;
        let quotient = 0x00;

        let i = GFGetPolyDegree(dividend);
        let mask = (1 << i);

        let modDegree = GFGetPolyDegree(MOD);

        while(i >= modDegree){

            if(mask & remainder){
                quotient = quotient ^ (1 << (i - modDegree))
                remainder = remainder ^ (MOD << (i - modDegree))
            }

            i--;
            mask = mask >> 1;

        }

        return [quotient, remainder];
    }

    /**
     * Performs addition of two polynomials that belong to the field. Addition in GF(2^n) is
     * the same as XOR-ing two bit-patterns.
     * 
     * @param {number} a 
     * @param {number} b 
     */
    var GFAddPolynomials = function (a, b) {
        return a ^ b;
    }

    /**
     * 
     * GetPolyDegree is a function that takes an element (polynomial) that is in the field
     * and returns its degree. 
     * The degree of the polynomial is index of the Most-Significant byte that is set to 1 (right to left).
     * 
     * @param {number} polynomial
     * @returns {number}
     */
    var GFGetPolyDegree = function (polynomial) {

        let result = 0;

        if (!polynomial)
            return result;

        result = -1
        while (polynomial) {
            polynomial = polynomial >> 1
            result = result + 1
        }

        return result;

    }

    return {
        PolynomialInverse: GFCalculatePolynomialMI,
        PolynomialMultiply: GFMultiplyPolynomials,
        PolynomialDivide: GFDividePolynomials,
        PolynomialAdd: GFAddPolynomials
    }


});

module.exports = GaloisFieldArithmetic;