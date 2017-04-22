"use strict";

const truffleContract = require("truffle-contract");
const Promise = require("bluebird");
const Ipfs = require('ipfs-api');
const DAG = require('ipld-dag-pb');
const Web3 = require("web3");
const identityJson = require("../../build/contracts/Identity.json");

const ipfs = Ipfs('/ip4/127.0.0.1/tcp/5001');

const Identity = truffleContract(identityJson);

Promise.promisifyAll(DAG.DAGLink, { suffix: "Promise" });
Promise.promisifyAll(DAG.DAGNode, { suffix: "Promise" });

const $ = require("jquery");
const cityHall = require("./city_hall.js");

require("file-loader?name=../index.html!../index.html");
require("file-loader?name=../city_hall.html!../city_hall.html");
require("file-loader?name=../me.html!../me.html");

window.addEventListener('load', function() {
    if (typeof web3 === "undefined") {
        var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
    }

    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
    Identity.setProvider(web3.currentProvider);

    return web3.eth.getAccountsPromise()
        .then(accounts => {
            if (accounts.length > 0) {
                $(".root_hash .save_top_hash").prop("disabled", false);
            }
            $("#status").html("Loaded");
        });
});

$(".dob_reg .dob_sign").click(() => {
    const address = $(".city_hall input[name='address']").val();
    const dob = $(".city_hall input[name='dob']").val();
    const nonce = $(".city_hall input[name='nonce']").val();
    const value = JSON.stringify({
        address: address,
        dob: dob,
        nonce: nonce
    });
    $("#status").html("To save: " + value);
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
        .then(dagNode => {
            console.log(dagNode.toJSON());
            $("#status").html("Saved in IPFS");
        })
        .catch(e => {
            console.error(e);
            $("#status").html(e.message);
        });
});

$(".root_hash .save_top_hash").click(() => {
    const hash = $(".root_hash input[name='hash']").val();
    console.log(hash);
    return Identity.deployed()
        .then(instance => {
            return web3.eth.getAccountsPromise()
                .then(accounts => {
                    console.log(accounts);
                    return instance.updateHash(hash, { from: accounts[ 0 ] });
                });
        })
        .then(txObject => {
            console.log(txObject);
            $("#status").html(hash + " saved in block " + txObject.receipt.blockNumber);
        })
        .catch(e => {
            console.error(e);
            $("#status").html(e.message);
        });
});

const dagLinks = [];

$(".make_dag_link .create").click(() => {
    const name = $(".make_dag_link input[name='name']").val();
    const hash = $(".make_dag_link input[name='hash']").val();
    return DAG.DAGLink.createPromise(name, 1, hash)
        .then(dagLink => {
            dagLinks.push(dagLink);
            $("<li>").html(name + " - " + hash)
                .appendTo(".make_dag_link .dag_links");
            $("#status").html("Created");
        })
        .catch(e => {
            console.error(e);
            $("#status").html(e.message);
        });
});

$(".make_dag_node .create").click(() => {
    const data = $(".make_dag_node input[name='data']").val();
    return DAG.DAGNode.createPromise(data, dagLinks)
        .then(dagNode => {
            $(".make_dag_node .dag_node").html(dagNode.toJSON().multihash);
            $("#status").html("Created");
        })
        .catch(e => {
            console.error(e);
            $("#status").html(e.message);
        });
});