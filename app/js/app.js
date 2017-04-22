"use strict";

const Promise = require("bluebird");
const Ipfs = require('ipfs-api');
const DAG = require('ipld-dag-pb');
const Web3 = require("web3");

const ipfs = Ipfs('/ip4/127.0.0.1/tcp/5001');
if (typeof web3 === "undefined") {
    var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}
Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Promise.promisifyAll(DAG.DAGLink, { suffix: "Promise" });
Promise.promisifyAll(DAG.DAGNode, { suffix: "Promise" });

const $ = require("jquery");
const cityHall = require("./city_hall.js");

require("file-loader?name=../city_hall.html!../city_hall.html");

console.log(DAG);
$("#status").html("Loaded");

$(".city_hall_sign").click(() => {
    const address = $(".city_hall input[name='address']").val();
    const dob = $(".city_hall input[name='dob']").val();
    const nonce = $(".city_hall input[name='nonce']").val();
    const value = JSON.stringify({
        address: address,
        dob: dob,
        nonce: nonce
    });
    console.log(value);
    let valueNode, sigNode, dobNode;
    return DAG.DAGNode.createPromise(value)
        .then(dagNode => {
            valueNode = dagNode;
            return ipfs.object.put(dagNode);
        })
        .then(dagNode => web3.eth.getAccountsPromise())
        .then(accounts => web3.eth.signPromise(
            accounts[ 0 ], web3.sha3(value)))
        .then(signature => DAG.DAGNode.createPromise(signature))
        .then(dagNode => {
            sigNode = dagNode;
            return ipfs.object.put(dagNode);
        })
        .then(dagNode => Promise.all([
            DAG.DAGLink.createPromise("value", 1, valueNode.multihash),
            DAG.DAGLink.createPromise("sig", 1, sigNode.multihash)
        ]))
        .then(links => DAG.DAGNode.createPromise("dob", links))
        .then(dagNode => {
            dobNode = dagNode;
            return ipfs.object.put(dagNode);
        })
        .then(dagNode => console.log(dagNode.toJSON()));
});