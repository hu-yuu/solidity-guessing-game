// SPDX-License-Identifier: MIT
pragma solidity 0.8.4;

import "@chainlink/contracts/src/v0.8/VRFConsumerBase.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract GuessingGame is VRFConsumerBase, Ownable {
    
    
    struct playerGuess{
        uint256 guess;
        address player;
    }
    
    
    bytes32 private constant keyHash = 	0x6c3699283bda56ad74f6b855546325b68d482e983852a7a82979cc4807b641f4;
    uint256 private constant fee = 0.1 * 10 ** 18;
    
    uint256 public nextSession;
    uint256 public timeBetween;
    
    uint256 public playFee;
    
    uint32 private indexx = 0;
    
    
    mapping(address => uint256) public balances;
    playerGuess[10] public guesses;
    
    constructor(uint256 daysAfter, uint256 _playFee)
    VRFConsumerBase(
        0xdD3782915140c8f3b190B5D67eAc6dc5760C46E9,
        0xa36085F69e2889c224210F603D836748e7dC0088
        )
        {
            nextSession = block.timestamp + (daysAfter * 2 minutes);
            timeBetween = daysAfter;
            playFee = _playFee * 10 ** 16;
        }
        
    function startSession() public returns (bytes32 requestId) {
        require(LINK.balanceOf(address(this)) >= fee, "Not enough LINK");
        require(block.timestamp >= nextSession);
        require(indexx > 0, "no players joined");
        
        return requestRandomness(keyHash, fee);
    }
    
    function setPlayFee(uint256 _playFee) external onlyOwner {
        playFee = _playFee;
    }
    
    function setTimeBetween(uint256 xday) external onlyOwner {
        timeBetween = xday;
    }
    
    function guessNumber(uint256 numb) external payable {
        require(msg.value == playFee * 1 wei, "sadstorybro");
        require(indexx < 10, "10 players limit");
        playerGuess memory playerg  = playerGuess(numb, msg.sender);
        guesses[indexx] = playerg;
        indexx += 1;
    }
    
    
    function calcDistance(uint256 a, uint256 b) internal pure returns(uint256)
    {
        if (a > b) 
        {
            return a - b;
        }
        else {
            return b - a;
        }
    }
    
    function calcWinner(uint256 rand) internal {
        uint32 _indexx = indexx;
        
        playerGuess memory _curWinner = guesses[0];
        uint256 _curDist = calcDistance(_curWinner.guess, rand);
        delete guesses[0];
        for(uint i = 1; i< _indexx; i++)
        {
            if(calcDistance(guesses[i].guess, rand) <_curDist)
            {
                _curWinner = guesses[i];
                _curDist = calcDistance(guesses[i].guess, rand);
            }
            
            delete guesses[i];
        }
        
        balances[owner()] = (playFee * 1 / 100 * (_indexx));
        balances[_curWinner.player] = (playFee * 99 / 100 * (_indexx));
        indexx = 0;
        
    }
    
    function fulfillRandomness(bytes32 requestId, uint256 randomness) internal override {
        uint randomResult = randomness % 1000;
        calcWinner(randomResult);
        
        nextSession += timeBetween * 1 minutes;
        
        
    }
    
     
    function claim() external {
        require(balances[msg.sender] > 0, "no eth to withdraw");
        uint256 _amount = balances[msg.sender];
        balances[msg.sender] = 0;
        payable(msg.sender).transfer(_amount);
    }
    
    function getPlayerCount() external view returns(uint256)
    {
        return indexx;
    }
}