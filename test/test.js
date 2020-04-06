import {describe, before, it} from 'mocha';
import chai from 'chai';

import {addition} from "../src/util";

let assert = chai.assert;
describe('hooks', function () {
    before(function () {
        console.log("before");
    });
});

describe('Util', function () {
    describe('addition', function () {
        it('Should return the sum of two numbers', function () {
            assert(addition(3, 5) === 8);
        })
    });
});