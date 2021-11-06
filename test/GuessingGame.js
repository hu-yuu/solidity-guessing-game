const { expect } = require("chai");
const { ethers } = require("hardhat");
const mockLink = require("../artifacts/contracts/mockLink.sol/LinkToken.json");
const { MockProvider } = require('@ethereum-waffle/provider');
const { deployMockContract } = require("@ethereum-waffle/mock-contract");


describe("Guessing game contract", function () {

    let playFee = 2;
    let timeBetween = 1;
    let Contract, contract, owner, addr1, addr2, addr3, mockLinkT;

    beforeEach(async () => {

        [owner, addr1, addr2, addr3] = await ethers.getSigners();
        /* [addr3, rec] = new MockProvider().getWallets(); */
        mockLinkT = await deployMockContract(addr3, mockLink.abi);


        Contract = await ethers.getContractFactory("GuessingGame");

        contract = await Contract.deploy(timeBetween, playFee, mockLinkT.address);


    });

    describe("Deployment", () => {
        it("right owner", async () => {
            expect(await contract.owner()).to.equal(owner.address);
            expect(await contract.owner()).to.not.equal(addr1);
        });
    });

    describe("Owner Changing Game", () => {
        it("Should change playfee", async () => {
            await contract.setPlayFee(ethers.utils.parseEther("2.0"));
            expect(await contract.playFee()).to.be.equal(ethers.utils.parseEther("2.0"));
            expect(await contract.playFee()).not.to.be.equal(ethers.utils.parseEther("0.2"));
        })

        it("Should change time between sessions", async () => {
            await contract.setTimeBetween(3 * 60);
            expect(await contract.timeBetween()).to.be.equal(3 * 60);
            expect(await contract.timeBetween()).not.to.be.equal(1 * 60);
        })

    })


    describe("Guessing", () => {
        it("Should emit when eth not equal to playFee", async () => {
            await expect(
                contract.connect(addr1).guessNumber(15, { value: ethers.utils.parseEther("0.002") })
            ).to.be.revertedWith("not enough ether to play");
        })

        it("Should emit when player count more than 10", async () => {
            for (let i = 0; i < 10; i++) {
                await contract.connect(addr1).guessNumber(15, { value: await contract.playFee() });
            }
            await expect(
                contract.connect(addr1).guessNumber(15, { value: await contract.playFee() })
            ).to.be.revertedWith("10 players limit");
        })
        it("Should add to list when not reverted", async () => {


            await expect(
                contract.connect(addr1).guessNumber(15, { value: await contract.playFee() })
            ).not.to.be.reverted;

            expect(await contract.getPlayerCount()).to.equal(1);
        })
    })

    describe("Starting Session", () => {


        it("Should have enough LINK token", async () => {

            await mockLinkT.mock.balanceOf.returns(ethers.utils.parseUnits("0.001"));
            await contract.guessNumber(1, { value: ethers.utils.parseEther("0.02") });
            await mockLinkT.mock.transferAndCall.returns(true);
            await hre.ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]);

            await expect(
                contract.startSession()).to.be.revertedWith("Not enough LINK");
        })

        it("Should be at least 1 player", async () => {
            await mockLinkT.mock.balanceOf.returns(ethers.utils.parseUnits("1"));
            await mockLinkT.mock.transferAndCall.returns(true);
            await hre.ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]);

            await expect(
                contract.startSession()).to.be.revertedWith("no players joined");
        })
        it("Should start only after timebetween", async () => {
            await mockLinkT.mock.balanceOf.returns(ethers.utils.parseUnits("1"));
            await mockLinkT.mock.transferAndCall.returns(true);
            await contract.guessNumber(1, { value: ethers.utils.parseEther("0.02") })

            await expect(
                contract.startSession()).to.be.revertedWith("session time is not started");
        })
        it("Should start", async () => {
            await mockLinkT.mock.balanceOf.returns(ethers.utils.parseUnits("1"));
            await mockLinkT.mock.transferAndCall.returns(true);
            await hre.ethers.provider.send('evm_increaseTime', [7 * 24 * 60 * 60]);
            await contract.guessNumber(1, { value: ethers.utils.parseEther("0.02") })

            await expect(
                contract.startSession()).not.to.be.reverted;
        })
    })

    describe("Winner", () => {
        it("Should calculate distance right", async () => {

            expect(await contract._calcDistance(10, 5)).to.be.equal(5);
            expect(await contract._calcDistance(5, 25)).to.be.equal(20);
            expect(await contract._calcDistance(109, 109)).to.be.equal(0);

        })

        it("Should find winner", async () => {

            await contract.guessNumber(1, { value: ethers.utils.parseEther("0.02") })
            await contract.connect(addr1).guessNumber(11, { value: ethers.utils.parseEther("0.02") })
            await contract.connect(addr2).guessNumber(123, { value: ethers.utils.parseEther("0.02") })
            
            await contract._calcWinner(15);
            
            expect(
                await contract.balances(addr1.address)
            ).to.be.equal((ethers.utils.parseUnits("0.06").mul(99).div(100)));
        })
        it("Owner should get his fee", async () => {

            await contract.guessNumber(1, { value: ethers.utils.parseEther("0.02") })
            await contract.connect(addr1).guessNumber(11, { value: ethers.utils.parseEther("0.02") })
            await contract.connect(addr2).guessNumber(123, { value: ethers.utils.parseEther("0.02") })
            
            await contract._calcWinner(15);

            expect(
                await contract.balances(owner.address)
            ).to.be.equal((ethers.utils.parseUnits("0.06").mul(1).div(100)));

        })
    })

});