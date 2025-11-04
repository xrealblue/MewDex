// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import { ERC20 } from "../lib/openzeppelin-contracts/contracts/token/ERC20/ERC20.sol";

contract CatToken is ERC20 {
    address public owner;

    constructor (uint256 initSupply) ERC20("Cat Token", "CAT") {
        owner = msg.sender;
        _mint(msg.sender, initSupply * 10 ** 18);
    }

    // for anyone can mint token
    function mint (address to, uint256 amount) external {
        _mint(to, amount);
    }
}
