pragma solidity ^0.8.0;

contract Staking {
    address public owner;

    struct Position {
        uint positionId;
        address walletAddress;
        uint createdDate;
        uint unlockDate;
        uint percentInterest;
        uint weiStaked;
        uint weiInterest;
        bool open;
    }

    struct Borrower { 
      uint positionId;
      address walletAddress;
      uint createdDate;
      uint endDate;
      uint percentInterest;
      uint weiBorrowed;
      uint weiInterest;
      bool paid;
    }

    Position position;
    Borrower borrower;

    uint public currentPositionId;
    mapping(uint => Position) public positions;
    mapping (address  => uint[]) public positionIdsByAddress;
    mapping(uint => uint) public tiers;
    mapping(uint => Borrower) public borrowers;
    mapping(address => uint) public borrowerIdByAddress;
    uint[] public lockPeriods;
    uint public borrowPositionId;

    constructor() payable {
        owner = msg.sender;
        currentPositionId = 0;

        tiers[30] = 700;
        tiers[90] = 1000;
        tiers[180] = 1200;

        lockPeriods.push(30);
        lockPeriods.push(90);
        lockPeriods.push(180);
    }

    function stakeEther(uint numDays) external payable {
        require(tiers[numDays] > 0, "Mapping not found");

        positions[currentPositionId] = Position(
            currentPositionId,
            msg.sender,
            block.timestamp,
            block.timestamp + (numDays * 1 days),
            tiers[numDays],
            msg.value,
            calculateInterest(tiers[numDays], msg.value),
            true
        );

        positionIdsByAddress[msg.sender].push(currentPositionId);
        currentPositionId += 1;
    }

    function calculateInterest(uint basisPoints, uint weiAmount) private pure returns(uint){
        return basisPoints * weiAmount / 10000;
    }

    function modifyLockPeriods(uint numDays, uint basisPoints) external {
        require(owner == msg.sender, "Only owner may modify staking period");

        tiers[numDays] = basisPoints;
        lockPeriods.push(numDays);
    }

    function getLockPeriods() external view returns(uint[] memory) {
        return lockPeriods;
    }

    function getInterestRate(uint numDays) external view returns(uint) {
        return tiers[numDays];
    }

    function getPositionById(uint positionId) external view returns(Position memory) {
        return positions[positionId];
    }

    function getPositionIdForAddress(address walletAddress) external view returns(uint[] memory) {
        //sreturn positionIdsByAddress[walletAddress];
    }

    function changeUnlockDate(uint positionId, uint newUnlockDate) external {
        require(owner == msg.sender, "Only owner may modify staking period");

        positions[positionId].unlockDate = newUnlockDate;

    }

    function closePosition(uint positionId) external {
        require(positions[positionId].walletAddress == msg.sender, "only position creator may modify positon");
        require(positions[positionId].open == true, "Position is closed");

        positions[positionId].open = false;


        if(block.timestamp > positions[positionId].unlockDate) {
            uint amount = positions[positionId].weiStaked + positions[positionId].weiInterest;
            payable(msg.sender).call{value: amount}("");
        }else {
            payable(msg.sender).call{value: positions[positionId].weiStaked}("");
        }
    }

    function BorrowFunds(uint amount, address sendTo, uint numDays) external payable {
        require(owner == msg.sender, "Only owner can send funds");
        borrowers[borrowPositionId] = Borrower (
            borrowPositionId,
            sendTo,
            block.timestamp,
            block.timestamp + (numDays * 1 days),
            4000,
            amount,
            (8 * amount) / 100,
            false
        );

        payable(sendTo).call{value: amount}("");
        borrowerIdByAddress[sendTo] = borrowPositionId;
        borrowPositionId += 1;
    }

    function payBorrowedFund(address borrower) public payable {
      require(borrowerIdByAddress[borrower] >= 0, "Key does not exist");
      uint borrowerId = borrowerIdByAddress[borrower];
      uint amount = borrowers[borrowerId].weiInterest + borrowers[borrowerId].weiBorrowed;
      require(msg.value >= amount, "amount is not complete");
      require(borrowers[borrowerId].paid == false, "debts has been paid");

      borrowers[borrowerId].paid = true;
      payable(address(this)).call{value: amount}("");
    }
}