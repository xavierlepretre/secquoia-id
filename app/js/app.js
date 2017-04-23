"use strict";

const truffleContract = require("truffle-contract");
const ethUtil = require("ethereumjs-util");
const Promise = require("bluebird");
const Ipfs = require('ipfs-api');
const DAG = require('ipld-dag-pb');
const Web3 = require("web3");
const identityJson = require("../../build/contracts/Identity.json");

const ipfs = Ipfs('/ip4/127.0.0.1/tcp/5001');

const Identity = truffleContract(identityJson);

Promise.promisifyAll(DAG.DAGLink, { suffix: "Promise" });
Promise.promisifyAll(DAG.DAGNode, { suffix: "Promise" });

Promise.promisifyAll(web3.eth, { suffix: "Promise" });
Identity.setProvider(web3.currentProvider);

const $ = require("jquery");
const cityHall = require("./city_hall.js");

require("file-loader?name=../index.html!../index.html");
require("file-loader?name=../city_hall.html!../city_hall.html");
require("file-loader?name=../me.html!../me.html");
require("file-loader?name=../night_club.html!../night_club.html");

$(document).ready(function() {
    if (typeof web3 === "undefined") {
        web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
    }

    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
    Identity.setProvider(web3.currentProvider);

    return web3.eth.getAccountsPromise()
        .then(accounts => {
            $("#status").html("Loaded");
            if (accounts.length > 0) {
                $(".root_hash .save_top_hash").prop("disabled", false);
            } else {
                $(".root_hash .current_hash").html("NA");
                return;
            }
            Identity.deployed(); // Do not remove, weird it needs this trigger
            return Identity.deployed()
                .then(instance => instance.hashes(accounts[ 0 ]))
                .then(values => $(".root_hash .current_hash").html(values[ 0 ] + ", " + values[ 1 ]));
        })
        .catch(e => {
            console.error(e);
            $("#status").html(e.message);
        });
});

// City Hall

$(".dob_reg .dob_sign").click(() => {
    Promise.promisifyAll(web3.eth, { suffix: "Promise" });
    Identity.setProvider(web3.currentProvider);

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
            $("#status").html("Saved in IPFS: " + dagNode.toJSON().multihash);
        })
        .catch(e => {
            console.error(e);
            $("#status").html(e.message);
        });
});

// Me

$(".root_hash .save_top_hash").click(() => {
    // Promise.promisifyAll(web3.eth, { suffix: "Promise" });
    // Identity.setProvider(web3.currentProvider);

    const hash = $(".root_hash input[name='hash']").val();
    return Identity.deployed()
        .then(instance => web3.eth.getAccountsPromise()
            .then(accounts => instance.updateHash(hash, { from: accounts[ 0 ] })
            // .then(txObject => instance.hashes(accounts[ 0 ]))
            // .then(values => $(".root_hash .current_hash").html(values[ 0 ] + ", " + values[ 1 ]))
            ))
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
            return ipfs.object.put(dagNode);
        })
        .then(dagNode => {
            $("#status").html("Stored");
        })
        .catch(e => {
            console.error(e);
            $("#status").html(e.message);
        });
});

// Nightclub

$(".dob_verification .dob_check").click(() => {
    const hash = $(".dob_verification input[name='dob_node_hash']").val();
    return ipfs.object.get(hash)
        .then(dagNode => {
            const valueLink = dagNode.links.find(link => link.toJSON().name === "value");
            const sigLink = dagNode.links.find(link => link.toJSON().name === "sig");
            if (dagNode.toJSON().data != "dob" ||
                typeof valueLink === "undefined" ||
                typeof sigLink === "undefined") {
                throw new Error("This is not a DoB node");
            }
            return Promise.all([
                ipfs.object.get(valueLink.toJSON().multihash),
                ipfs.object.get(sigLink.toJSON().multihash)
            ]);
        })
        .then(dagNodes => {
            const valueDob = String.fromCharCode.apply(null, dagNodes[ 0 ].data);
            const sigDob = String.fromCharCode.apply(null, dagNodes[ 1 ].data);
            $(".dob_verification .value_dob").html(valueDob);
            $(".dob_verification .sig").html(sigDob);
            const value = JSON.parse(valueDob);
            const address = value.address;
            $(".dob_verification .address").html(address);
            const dob = Date.parse(value.dob);
            $(".dob_verification .dob").html(new Date(dob).toString());
            const eighteen = 18 * 365 * 86400 * 1000;
            $(".dob_verification .validity_age").html(dob + eighteen <= new Date().getTime());
            const hash = web3.sha3(valueDob).slice(2, 66);
            const r = sigDob.slice(2, 66);
            const s = sigDob.slice(66, 130);
            let v = sigDob.slice(130, 132);
            const vBuf = new Buffer(v, 'hex');
            v = ethUtil.bufferToInt(vBuf);
            if (v == 0) v += 27;
            const hashBuf = new Buffer(hash, 'hex');
            const rBuf = new Buffer(r, 'hex');
            const sBuf = new Buffer(s, 'hex');
            const recovered = ethUtil.bufferToHex(
                ethUtil.pubToAddress(
                    ethUtil.ecrecover(
                        hashBuf,
                        v,
                        rBuf,
                        sBuf)));
            $(".dob_verification .recovered").html(recovered);
            return Identity.deployed()
                .then(instance => instance.hashes(address));
        })
        .then(values => {
            $(".dob_verification .stolen").html(values[ 1 ] ? "true" : "false");
        })
        .catch(e => {
            console.error(e);
            $("#status").html(e.message);
        });
});