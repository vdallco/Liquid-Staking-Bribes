
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/master/contracts/token/ERC20/ERC20.sol";

contract NodeRunnerBribeVault{
    struct TokenDeposit{
        uint256 id;
        address token;
        uint256 tokenAmount;
        uint256 tokenToValidatorRatio;
        uint256 expiration;
    }

    event BribeAdded(uint256 indexed bribeId, address indexed sender, uint256 epoch);
    event BribeRemoved(uint256 indexed bribeId, address indexed sender, uint256 epoch);
    event BribeToppedUp(uint256 indexed bribeId, address indexed sender, uint256 epoch);
    event BribeClaimed(uint256 indexed bribeId, address indexed sender, uint256 epoch);

    event FeeRecipientUpdated(address indexed sender, address newFeeRecipient, address oldFeeRecipient, uint256 epoch);
    event FeePerClaimUpdated(address indexed sender, uint256 newFeePerClaim, uint256 oldFeePerClaim, uint256 epoch);
    event VaultCreated(address indexed sender, uint256 epoch);

    mapping(string => TokenDeposit) public deposits; // Maps LSD network ticker to (id,token,amount,ratio,expiration). Only 1 active bribe per validator
    string[] public lsdNetworkNames;
    uint256 public lsdNetworkIndex = 0;
    uint256 public depositIndex = 0;
    mapping(bytes => uint256[]) public claimedDeposits; // Maps Validator BLS to array of deposit.id

    //address public stakehouseUniverse = 0xC38ee0eCc213293757dC5a30Cf253D3f40726E4c; // TO-DO: Replace with mainnet. This is Goerli Stakehouse Universe 
    /// Hey you should check out and use https://www.npmjs.com/package/@blockswaplab/stakehouse-solidity-api and then you can call things like getStakeHouseUniverse() wherever you need and based on the network it will give you the correct contracts
    /// Also, feel free to check out https://github.com/stakehouse-dev/lsd-contracts/blob/main/contracts/liquid-staking/GiantMevAndFeesPool.sol - tokens can be transferred and it handles claiming rewards. 
    /// You can also wrap LP tokens from LSD networks as another option and use ERC20 snapshotting to snapshot balances: https://github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/utils/structs/Checkpoints.sol

    address public stakehouseUniverse;
    uint256 public bribeLength = 31536000; // 365 days

    address public feeRecipient;
    uint256 public feePerClaimDivisor = 0;
    uint256 public feePerClaimDivisorMin = 5; // divisor of 5 means highest possible fee is 20%
    address public owner;

    constructor(address _stakehouseUniverse, address _feeRecipient, uint256 _feePerClaimDivisor) public {
        stakehouseUniverse = _stakehouseUniverse;
        require(_feePerClaimDivisor > feePerClaimDivisorMin, "fee is too high");
        feeRecipient = _feeRecipient;
        feePerClaimDivisor = _feePerClaimDivisor;
        owner = msg.sender;
        emit VaultCreated(msg.sender, block.timestamp);
        emit FeeRecipientUpdated(msg.sender, _feeRecipient, address(0), block.timestamp);
        emit FeePerClaimUpdated(msg.sender, _feePerClaimDivisor, 0, block.timestamp);
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "onlyOnwer");
        _;
    }

    function setFeeRecipient(address newFeeRecipient) public onlyOwner {
        require(newFeeRecipient != feeRecipient, "same recipient");
        emit FeeRecipientUpdated(msg.sender, newFeeRecipient, feeRecipient, block.timestamp);
        feeRecipient = newFeeRecipient;
    }

    function setFeePerClaim(uint256 newFeePerClaim) public onlyOwner {
        require(newFeePerClaim >= feePerClaimDivisor, "new fee must be lower than existing fee");
        require(newFeePerClaim >= feePerClaimDivisorMin, "new fee is too high");
        emit FeePerClaimUpdated(msg.sender, newFeePerClaim, feePerClaimDivisor, block.timestamp);
        feePerClaimDivisor = newFeePerClaim;
    }

    function depositBribe(address bribeToken, uint256 bribeAmount, uint256 tokenToValidatorRatio, string calldata lsdNetwork) public {
        uint256 sizeOfBribeTokenContract;
        assembly {
            sizeOfBribeTokenContract := extcodesize(bribeToken)
        }
        //require(msg.sender == getNodeRunnerAddress(validatorBLSKey), "only node runner may deposit bribes");
        require(sizeOfBribeTokenContract > 0, "bribe token is invalid");
        require(tokenToValidatorRatio>0, "token to validator ratio must be non-zero");
        require(bribeAmount>0, "Bribe amount must be non-zero");
        bool existingBribe = false;
        bool existingKey = false;

        TokenDeposit storage deposit = deposits[lsdNetwork];

        for(uint256 x;x<lsdNetworkNames.length;x++){
            if(keccak256(bytes(lsdNetworkNames[x]))==keccak256(bytes(lsdNetwork))){
                existingKey = true;
                if(deposit.tokenAmount > 0){
                    existingBribe = true;
                }
            }
        }

        if(existingBribe) // existing validator bribe. Add tokens to bribe total,
        {
            require(deposit.token == bribeToken, "invalid token for bribe"); 
            ERC20(deposit.token).transferFrom(msg.sender, address(this), bribeAmount);
            deposit.tokenAmount = deposit.tokenAmount + bribeAmount;
            deposit.tokenToValidatorRatio = tokenToValidatorRatio; // TO-DO: Only apply if new ratio is greater than existing

            deposits[lsdNetwork] = deposit;
            emit BribeToppedUp(deposit.id, msg.sender, block.timestamp);
        }else{ // new Validator bribe
            ERC20(bribeToken).transferFrom(msg.sender, address(this), bribeAmount);
            uint256 expirationSeconds = block.timestamp + bribeLength;
            deposits[lsdNetwork] = TokenDeposit(depositIndex, bribeToken, bribeAmount, tokenToValidatorRatio, expirationSeconds);
            if(!existingKey){
                lsdNetworkNames.push(lsdNetwork);
                lsdNetworkIndex = lsdNetworkIndex + 1;
            }
            emit BribeAdded(depositIndex, msg.sender, block.timestamp);
            depositIndex = depositIndex + 1;
        }
    }

    function getNodeRunnerAddress(bytes calldata validatorBLSKey) public view returns (address){
        // Call stakeHouseKnotInfo(bls) on StakehouseUniverse contract
        (, bytes memory data) = stakehouseUniverse.staticcall(abi.encodeWithSignature("stakeHouseKnotInfo(bytes)", validatorBLSKey));
        // Take the 3rd item of the above result (applicant or smart wallet). It's owner() is the LiquidStakingManager
        (, , address applicant, , , ) = abi.decode(data, (address, address, address, uint256, uint256, bool));
        (, bytes memory liquidStakingManagerBytes) = applicant.staticcall(abi.encodeWithSignature("owner()"));
        address liquidStakingManager = abi.decode(liquidStakingManagerBytes, (address));
        // Call nodeRunnerOfSmartWallet(smartWallet) on the LiquidStakingManager to get the node runner depositor address
        (, bytes memory nodeRunnerBytes) = liquidStakingManager.staticcall(abi.encodeWithSignature("nodeRunnerOfSmartWallet(address)",applicant));
        return abi.decode(nodeRunnerBytes, (address));
    }

    function withdrawRemainingBribe(bytes calldata validatorBLSKey) public {
        // TokenDeposit storage deposit = deposits[validatorBLSKey];
        // require(deposit.expiration < block.timestamp, "bribe not expired");
        // require(deposit.tokenAmount > 0, "bribe is empty");
        // uint256 amount = deposit.tokenAmount;
        // deposit.tokenAmount = 0;
        // deposits[validatorBLSKey] = deposit;
        // emit BribeRemoved(deposit.id, msg.sender, block.timestamp);
        // delete deposits[validatorBLSKey];
        // address validatorOwner = getNodeRunnerAddress(validatorBLSKey);
        // ERC20(deposit.token).transfer(validatorOwner, amount);
    }

    function getSavETHandMEVFeesPoolsByBLS(bytes calldata validatorBLSKey) public view returns (address, address){
        // Call stakeHouseKnotInfo(bls) on StakehouseUniverse contract
        (, bytes memory data) = stakehouseUniverse.staticcall(abi.encodeWithSignature("stakeHouseKnotInfo(bytes)", validatorBLSKey));
        // Take the 3rd item of the above result (applicant or smart wallet). It's owner() is the LiquidStakingManager
        (, , address applicant, , , ) = abi.decode(data, (address, address, address, uint256, uint256, bool));
        (, bytes memory liquidStakingManagerBytes) = applicant.staticcall(abi.encodeWithSignature("owner()"));
        address liquidStakingManager = abi.decode(liquidStakingManagerBytes, (address));
        // Call stakingFundsVault() and savETHVault() on the LiquidStakingManager to get the SavETH and MEVFees Pools
        (, bytes memory savETHPoolBytes) = liquidStakingManager.staticcall(abi.encodeWithSignature("savETHVault()"));
        address savETHPool = abi.decode(savETHPoolBytes, (address));
        (, bytes memory mevFeesPoolBytes) = liquidStakingManager.staticcall(abi.encodeWithSignature("stakingFundsVault()"));
        address mevFeesPool = abi.decode(mevFeesPoolBytes, (address));
        return (savETHPool, mevFeesPool);
    }

    function getLPTokensByBLS(bytes calldata validatorBLSKey) public view returns (address, address){
        (address savETHPool, address mevFeesPool) = getSavETHandMEVFeesPoolsByBLS(validatorBLSKey);
        (, bytes memory savETHLPBytes) = savETHPool.staticcall(abi.encodeWithSignature("lpTokenForKnot(bytes)", validatorBLSKey));
        address savETHLP = abi.decode(savETHLPBytes, (address));
        (, bytes memory mevFeesLPBytes) = mevFeesPool.staticcall(abi.encodeWithSignature("lpTokenForKnot(bytes)", validatorBLSKey));
        address mevFeesLP = abi.decode(mevFeesLPBytes, (address));
        return (savETHLP, mevFeesLP);
    }

    function ethDepositsByBLSKeyAndAddress(bytes calldata validatorBLSKey, address depositor) public view returns (uint256){
        (address savETHLP, address mevFeesLP) = getLPTokensByBLS(validatorBLSKey);
        // Call balanceOf() on the LP tokens to determine how much ETH the caller deposited
        (, bytes memory savETHDepositsBytes) = savETHLP.staticcall(abi.encodeWithSignature("balanceOf(address)", depositor));
        uint256 savETHDeposits = abi.decode(savETHDepositsBytes, (uint256));
        (, bytes memory mevFeesDepositsBytes) = mevFeesLP.staticcall(abi.encodeWithSignature("balanceOf(address)", depositor));
        uint256 mevFeesDeposits = abi.decode(mevFeesDepositsBytes, (uint256));

        return savETHDeposits + mevFeesDeposits;
    }

    function getValidatorNetwork(bytes calldata validatorBLSKey) public view returns (string memory){
        // Call stakeHouseKnotInfo(bls) on StakehouseUniverse contract
        (, bytes memory data) = stakehouseUniverse.staticcall(abi.encodeWithSignature("stakeHouseKnotInfo(bytes)", validatorBLSKey));
        // Take the 3rd item of the above result (applicant or smart wallet). It's owner() is the LiquidStakingManager
        (, , address applicant, , , ) = abi.decode(data, (address, address, address, uint256, uint256, bool));
        (, bytes memory liquidStakingManagerBytes) = applicant.staticcall(abi.encodeWithSignature("owner()"));
        address liquidStakingManager = abi.decode(liquidStakingManagerBytes, (address));
        (, bytes memory stakehouseTickerBytes) = liquidStakingManager.staticcall(abi.encodeWithSignature("stakehouseTicker()"));
        return abi.decode(stakehouseTickerBytes, (string));
    }

    function claimable(bytes calldata validatorBLSKey) public view returns(uint256) {
        
        //uint256 ethAmount = ethDepositsByBLSKeyAndAddress(validatorBLSKey, msg.sender);

        string memory validatorNetwork = getValidatorNetwork(validatorBLSKey);
        TokenDeposit storage deposit = deposits[validatorNetwork];
        address nodeRunner = getNodeRunnerAddress(validatorBLSKey);
        require(msg.sender == nodeRunner, "only node runner may claim");

        return deposit.tokenToValidatorRatio;
        // if (block.timestamp >= deposit.expiration) {
        //     return ((deposit.tokenToEthRatio * ethAmount)/(10**18),(deposit.tokenToEthRatio * ethAmount)/(10**18));
        // } else {
        //     uint256 bribeStart = deposit.expiration - bribeLength; // tested and working
        //     uint256 secondsSinceBribeStarted = (block.timestamp - bribeStart);
        //     uint256 rewardsPerSecond = ethAmount / bribeLength;
        //     uint256 scaledEthAmount = rewardsPerSecond * secondsSinceBribeStarted;
        //     return ((deposit.tokenToEthRatio * scaledEthAmount)/(10**18), (deposit.tokenToEthRatio * ethAmount)/(10**18));
        // }
    }

    function hasClaimed(string calldata lsdNetwork, bytes calldata validatorBLS) public view returns (bool){
        uint256[] storage claims = claimedDeposits[validatorBLS];
        TokenDeposit storage deposit = deposits[lsdNetwork];

        for(uint256 x = 0; x < claims.length; x++){
            if(claims[x] == deposit.id){
                return true;
            }
        }

        return false;
    }

    function claim(bytes calldata validatorBLSKey) public {
        uint256 currentTimestamp = block.timestamp;
        string memory validatorNetwork = getValidatorNetwork(validatorBLSKey);
        // TO-DO: Refactor following lines (already in hasClaimed() which needs to remain public view for dApp
        uint256[] storage depositsClaimed = claimedDeposits[validatorBLSKey];
        TokenDeposit storage deposit = deposits[validatorNetwork];        // tested and working
        for (uint256 i = 0; i < depositsClaimed.length; i++) {
            require(depositsClaimed[i] != deposit.id, "already claimed");
        }
        
        uint256 amount = claimable(validatorBLSKey);

        uint256 feeAmount = 0;
        if(feePerClaimDivisor > 0){
            feeAmount = amount / feePerClaimDivisor;
        }
        require(amount>0,"nothing to claim");
        require(deposit.tokenAmount >= amount, "insufficient bribe balance"); // tested and working
        require(deposit.expiration > currentTimestamp, "bribe expired"); // ExpirationDate + 28 days
        deposit.tokenAmount = deposit.tokenAmount - amount;                // tested and working
        deposits[validatorNetwork] = deposit;                           // tested and working
        claimedDeposits[validatorBLSKey].push(deposit.id);
        ERC20(deposit.token).transfer(msg.sender, amount - feeAmount); // tested and working
        emit BribeClaimed(deposit.id, msg.sender, block.timestamp);
        if(feeAmount > 0){
            ERC20(deposit.token).transfer(feeRecipient, feeAmount);
        }
        if(deposit.tokenAmount == 0){
            emit BribeRemoved(deposit.id, msg.sender, block.timestamp);
            delete deposits[validatorNetwork];
        }
    }
}
