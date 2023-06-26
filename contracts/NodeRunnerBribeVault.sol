
import "https://raw.githubusercontent.com/OpenZeppelin/openzeppelin-contracts/master/contracts/token/ERC20/ERC20.sol";

contract BribeVault{
    struct TokenDeposit{
        uint256 id;
        address token;
        uint256 tokenAmount;
        uint256 tokenToEthRatio;
        uint256 expiration; // actually the date where drip rewards are maxed. +28 days is expiration
    }

    event BribeAdded(uint256 indexed bribeId, address indexed sender, uint256 epoch);
    event BribeRemoved(uint256 indexed bribeId, address indexed sender, uint256 epoch);
    event BribeToppedUp(uint256 indexed bribeId, address indexed sender, uint256 epoch);
    event BribeClaimed(uint256 indexed bribeId, address indexed sender, uint256 epoch);

    event FeeRecipientUpdated(address indexed sender, address newFeeRecipient, address oldFeeRecipient, uint256 epoch);
    event FeePerClaimUpdated(address indexed sender, uint256 newFeePerClaim, uint256 oldFeePerClaim, uint256 epoch);
    event VaultCreated(address indexed sender, uint256 epoch);

    mapping(bytes => TokenDeposit) public deposits; // Maps Validator BLS Key to (id,token,amount,ratio,expiration). Only 1 active bribe per validator
    bytes[] public blsDepositKeys;
    uint256 public blsDepositKeyIndex = 0;
    uint256 public depositIndex = 0;
    mapping(address => uint256[]) public claimedDeposits; // Maps recipient address to array of deposit.id
    // TO-DO: Remove claimedDeposits and deposits when a TokenDeposit is no longer active (TokenAmount == 0)
    //         to prevent the maps from growing very large.

    //address public stakehouseUniverse = 0xC38ee0eCc213293757dC5a30Cf253D3f40726E4c; // TO-DO: Replace with mainnet. This is Goerli Stakehouse Universe 
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

    function depositBribe(address bribeToken, uint256 bribeAmount, bytes calldata validatorBLSKey) public {
        uint256 sizeOfBribeTokenContract;
        assembly {
            sizeOfBribeTokenContract := extcodesize(bribeToken)
        }
        require(validatorBLSKey.length == 48, "Invalid BLS key");
        require(msg.sender == getNodeRunnerAddress(validatorBLSKey), "only node runner may deposit bribes");
        require(sizeOfBribeTokenContract > 0, "bribe token is invalid");
        //require(tokenToETHRatio>0, "Bribe token/ETH ratio must be non-zero");
        require(bribeAmount>0, "Bribe amount must be non-zero");
        bool existingBribe = false;
        bool existingKey = false;

        TokenDeposit storage deposit = deposits[validatorBLSKey];

        for(uint256 x;x<blsDepositKeys.length;x++){
            if(keccak256(blsDepositKeys[x])==keccak256(validatorBLSKey)){
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
            deposit.tokenToEthRatio = deposit.tokenAmount / 28;

            deposits[validatorBLSKey] = deposit;
            emit BribeToppedUp(deposit.id, msg.sender, block.timestamp);
        }else{ // new Validator bribe
            ERC20(bribeToken).transferFrom(msg.sender, address(this), bribeAmount);
            uint256 expirationSeconds = block.timestamp + bribeLength;
            deposits[validatorBLSKey] = TokenDeposit(depositIndex, bribeToken, bribeAmount, bribeAmount/28, expirationSeconds);
            if(!existingKey){
                blsDepositKeys.push(validatorBLSKey);
                blsDepositKeyIndex = blsDepositKeyIndex + 1;
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
        TokenDeposit storage deposit = deposits[validatorBLSKey];
        require(deposit.expiration < block.timestamp, "bribe not expired");
        require(deposit.tokenAmount > 0, "bribe is empty");
        uint256 amount = deposit.tokenAmount;
        deposit.tokenAmount = 0;
        deposits[validatorBLSKey] = deposit;
        emit BribeRemoved(deposit.id, msg.sender, block.timestamp);
        delete deposits[validatorBLSKey];
        address validatorOwner = getNodeRunnerAddress(validatorBLSKey);
        ERC20(deposit.token).transfer(validatorOwner, amount);
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

    function claimable(bytes calldata validatorBLSKey) public view returns(uint256) {
        TokenDeposit storage deposit = deposits[validatorBLSKey];
        uint256 ethAmount = ethDepositsByBLSKeyAndAddress(validatorBLSKey, msg.sender);

        return (deposit.tokenToEthRatio * ethAmount)/(10**18);
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

    function hasClaimed(bytes calldata validatorBLSKey, address recipient) public view returns (bool){
        uint256[] storage claims = claimedDeposits[recipient];
        TokenDeposit storage deposit = deposits[validatorBLSKey];

        for(uint256 x = 0; x < claims.length; x++){
            if(claims[x] == deposit.id){
                return true;
            }
        }

        return false;
    }

    function claim(bytes calldata validatorBLSKey) public {
        uint256 currentTimestamp = block.timestamp;
        // TO-DO: Refactor following lines (already in hasClaimed() which needs to remain public view for dApp
        uint256[] storage depositsClaimed = claimedDeposits[msg.sender];
        TokenDeposit storage deposit = deposits[validatorBLSKey];        // tested and working
        for (uint256 i = 0; i < depositsClaimed.length; i++) {
            require(depositsClaimed[i] != deposit.id, "already claimed");
        }
        
        uint256 amount = claimable(validatorBLSKey); // 1st element is claimable now. 2nd element is total claimable

        uint256 feeAmount = 0;
        if(feePerClaimDivisor > 0){
            feeAmount = amount / feePerClaimDivisor;
        }
        require(amount>0,"nothing to claim");
        require(deposit.tokenAmount >= amount, "insufficient bribe balance"); // tested and working
        require(deposit.expiration > currentTimestamp, "bribe expired"); // ExpirationDate + 28 days
        deposit.tokenAmount = deposit.tokenAmount - amount;                // tested and working
        deposits[validatorBLSKey] = deposit;                           // tested and working
        claimedDeposits[msg.sender].push(deposit.id);
        ERC20(deposit.token).transfer(msg.sender, amount - feeAmount); // tested and working
        emit BribeClaimed(deposit.id, msg.sender, block.timestamp);
        if(feeAmount > 0){
            ERC20(deposit.token).transfer(feeRecipient, feeAmount);
        }
        if(deposit.tokenAmount == 0){
            emit BribeRemoved(deposit.id, msg.sender, block.timestamp);
            delete deposits[validatorBLSKey];
        }
    }
}