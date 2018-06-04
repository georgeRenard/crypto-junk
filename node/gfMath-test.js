const expect = require('chai').expect;
const GFMathGenerator = require('./gfMath');
const FIELD_ORDER = 8;

const GFMath = GFMathGenerator(FIELD_ORDER);



describe("gf_math_module_should_perform_correct_arithmetic", () => {

    it("gf_add_field_polynomials_should_work_correctly", () => {

        let bitPattern1 = 0b01010101;
        let bitPattern2 = 0b11001000;

        let expected = bitPattern1 ^ bitPattern2;

        let result = GFMath.PolynomialAdd(bitPattern1, bitPattern2);

        const ON_FAILURE = `Multiplying ${bitPattern1} by ${bitPattern2}. Expected: ${expected}, Got: ${result}`;

        expect(result).to.equal(expected);

    });

    it("gf_find_multiplicative_inverse_of_polynomial_should_work_correcly", () => {

        let bitPattern1 = 0b10000000;
        let bitPattern2 = 0b10010101;

        let inversePattern1 = 0b10000011;
        let inversePattern2 = 0b10001010;

        let actualInverse1 = GFMath.PolynomialInverse(bitPattern1);
        let actualInverse2 = GFMath.PolynomialInverse(bitPattern2);

        const ON_FAILURE_1 = `The Multiplicative Inverse was Expected: ${inversePattern1}, but Got: ${actualInverse1}`;
        const ON_FAILURE_2 = `The Multiplicative Inverse was Expected: ${inversePattern2}, but Got: ${actualInverse2}`;

        expect(actualInverse1).to.equal(inversePattern1, ON_FAILURE_1);
        expect(actualInverse2).to.equal(inversePattern2, ON_FAILURE_2);

    });

    it("gf_find_multiplicative_inverse_secondary_test_should_work_correctly", () => {

        let expected = 0xca;

        let result = GFMath.PolynomialInverse(0x53);

        const ON_FAILURE = `The Multiplicative Inverse was Expected: ${expect}, but Got: ${result}`

        expect(result).to.equal(expected, ON_FAILURE);
    })

    it("gf_multiply_polynomials_should_work_correctly", () => {

        let expected = 27;
        let result = GFMath.PolynomialMultiply(7, 5);

        let expected2 = 0x01;
        let result2 = GFMath.PolynomialMultiply(0x53, 0xca);

        const FEEDBACK = `GF(2^8) multiplication is not working. Expected: 49, but Got: ${result}`;
        const FEEDBACK_2 = `GF(2^8) multiplication is not working. Expected: 1, but Got: ${result2}`;

        expect(result).to.equal(expected, FEEDBACK);
        expect(result2).to.equal(expected2, FEEDBACK_2);

    });

    it("gf_find_multiplicative_inverses_should_multiply_to_one", () => {

        let byte = 0xaa;

        let byteMI = GFMath.PolynomialInverse(byte);

        let result = GFMath.PolynomialMultiply(byte, byteMI);

        const FEEDBACK = `Multiplying ${byte} and ${byteMI} should result in 0x01. Got: ${result}`;

        expect(result).to.equal(0x01, FEEDBACK);


    });

});

