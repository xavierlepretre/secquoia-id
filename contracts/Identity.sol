pragma solidity ^0.4.8;

import "./Owned.sol";

contract Identity is Owned {

    struct RootHash {
        string hash;
        bool stolen;
    }

    mapping (address => RootHash) public hashes;

    event LogHashChanged(
        address indexed sender,
        string indexed previous,
        string indexed latest);

    function markStolen(address who) onlyOwner {
        hashes[msg.sender].stolen = true;
    }

    function updateHash(string hash) {
        RootHash rootHash = hashes[msg.sender];
        if (rootHash.stolen) throw;
        LogHashChanged(msg.sender, rootHash.hash, hash);
        rootHash.hash = hash;
    }
}