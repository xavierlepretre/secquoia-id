pragma solidity ^0.4.8;

import "./Owned.sol";

contract Identity is Owned {

    mapping (address => string) public hashes;

    event LogHashChanged(
        address indexed sender,
        string indexed previous,
        string indexed latest);

    function updateHash(string hash) {
        LogHashChanged(msg.sender, hashes[msg.sender], hash);
        hashes[msg.sender] = hash;
    }
}