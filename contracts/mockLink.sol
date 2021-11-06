// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

interface LinkToken {
    function transferAndCall(
        address to,
        uint256 value,
        bytes calldata data
    ) external returns (bool success);

    function balanceOf(address owner) external view returns (uint256 balance);
}
