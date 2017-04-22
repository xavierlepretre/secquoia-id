"use strict";

const Web3 = require("web3");

if (typeof web3 === "undefined") {
    var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:8545"));
}

const $ = require("jquery");
const hospital = require("./hospital.js");

require("file-loader?name=../hospital.html!../hospital.html");

console.log("Hello");
$("#status").html("Loaded");