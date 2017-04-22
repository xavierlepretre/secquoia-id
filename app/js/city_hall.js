"use strict";

const Promise = require("bluebird");
const Web3 = require("web3");

if (typeof web3 === "undefined") {
    var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}
Promise.promisifyAll(web3.eth, { suffix: "Promise" });

/**
 * Sign the parameter with the first account.
 * @param {!string} thisString 
 * @returns {!Promise.<bytes>}
 */
function sign(thisString) {
    return web3.eth.getAccountsPromise()
        .then(accounts => web3.eth.signPromise(
            accounts[ 0 ], web3.sha3(thisString)));
}

module.exports = {
    sign: sign
};