
import "./ERC20.sol";

contract NodeRunnerBribeVault{
    // reentrancyGuard //
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private constant _ENTERED = 2;

    uint256 private _status;

    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant call");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
    ///////////////////////

    struct TokenDeposit{
        uint256 id;
        address token;
        uint256 tokenAmount;
        uint256 tokenToValidatorRatio;
        bool activeClaims;
        uint16 activeClaimsCount;
        uint16 maxClaims;
        uint16 totalClaims;
    }

    struct DepositClaim{
        uint256[] claimed;
        mapping(uint256 => uint256) initiatedClaims; // deposit.id => timestamp
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
    mapping(bytes => DepositClaim) internal claimedDeposits; //uint256[]) public claimedDeposits; // Maps Validator BLS to array of deposit.id

    mapping(address => bool) public rewardTokens;
    // ["0x534D1F5E617e0f72A6b06a04Aa599839AF776A5e","0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48","0x3d1e5cf16077f349e999d6b21a4f646e83cd90c5","0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"]
    // ["0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6","0x359599d4032D6540F3bE62E459861f742Ceb851f","0x506C2B850D519065a4005b04b9ceed946A64CB6F","0x14Ab8194a1cB89D941cc5159873aFDaC3C45094d","0x15fB74F4d828C85a1b71Ac1A83f31E1D2B8Beb73"] // Testnet
    //address public stakehouseUniverse = 0xC38ee0eCc213293757dC5a30Cf253D3f40726E4c; // TO-DO: Replace with mainnet. This is Goerli Stakehouse Universe 
    // Mainnet stakehouse universe: 0xC6306C52ea0405D3630249f202751aE3043056bd

    address public stakehouseUniverse;
    uint256 public bribeLength = 31536000; // 365 days

    address public feeRecipient;
    uint256 public feePerClaimDivisor = 0;
    uint256 public feePerClaimDivisorMin = 5; // divisor of 5 means highest possible fee is 20%
    address public owner;

    function setAllowToken(address token, bool allowed) external onlyOwner {
        require(rewardTokens[token] != allowed, "reward token already configured");
        rewardTokens[token] = allowed;
    }

    constructor(address _owner, address _stakehouseUniverse, address _feeRecipient, uint256 _feePerClaimDivisor, address[] memory rewardTokensAllowed) public {
        stakehouseUniverse = _stakehouseUniverse;
        require(_feePerClaimDivisor >= feePerClaimDivisorMin, "fee is too high");
        feeRecipient = _feeRecipient;
        feePerClaimDivisor = _feePerClaimDivisor;
        owner = _owner;
        for(uint256 x = 0; x<rewardTokensAllowed.length;x++){
            rewardTokens[rewardTokensAllowed[x]] = true;
        }
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

    function _depositInit(address liquidStakingManager, string calldata lsdNetwork, address msgSender) internal {
        (, bytes memory dao) = liquidStakingManager.staticcall(abi.encodeWithSignature("dao()"));
        (, bytes memory stakehouseTicker) = liquidStakingManager.staticcall(abi.encodeWithSignature("stakehouseTicker()"));
        address lsdnOwner = abi.decode(dao, (address));
        string memory lsdnTicker = abi.decode(stakehouseTicker, (string));
        require(keccak256(bytes(lsdnTicker)) == keccak256(bytes(lsdNetwork)), "lsd network ticker mismatch");
        require(msgSender == lsdnOwner, "only lsd owner/dao may deposit bribes");
    }

    function depositBribe(address bribeToken, uint256 bribeAmount, uint256 tokenToValidatorRatio, string calldata lsdNetwork, address liquidStakingManager, uint16 maxClaims) public nonReentrant {
        _depositInit(liquidStakingManager, lsdNetwork, msg.sender);
        require(rewardTokens[bribeToken], "reward token not allowed");
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
            require(tokenToValidatorRatio >= deposit.tokenToValidatorRatio, "tokenToValidatorRatio must be >= existing ratio"); 
            require(maxClaims >= deposit.maxClaims, "maxClaims must be >= existing maximum"); 
            ERC20(deposit.token).transferFrom(msg.sender, address(this), bribeAmount);
            deposit.tokenAmount = deposit.tokenAmount + bribeAmount;
            deposit.tokenToValidatorRatio = tokenToValidatorRatio; 
            deposit.maxClaims = maxClaims;

            deposits[lsdNetwork] = deposit;
            emit BribeToppedUp(deposit.id, msg.sender, block.timestamp);
        }else{ // new Validator bribe
            ERC20(bribeToken).transferFrom(msg.sender, address(this), bribeAmount);
            uint256 expirationSeconds = block.timestamp + bribeLength;
            deposits[lsdNetwork] = TokenDeposit(depositIndex, bribeToken, bribeAmount, tokenToValidatorRatio, false, 0, maxClaims, 0);
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

    function withdrawRemainingBribe(address liquidStakingManager) public nonReentrant {
        (, bytes memory stakehouseTicker) = liquidStakingManager.staticcall(abi.encodeWithSignature("stakehouseTicker()"));
        (, bytes memory dao) = liquidStakingManager.staticcall(abi.encodeWithSignature("dao()"));
        string memory lsdnTicker = abi.decode(stakehouseTicker, (string));
        TokenDeposit storage deposit = deposits[lsdnTicker];
        require(deposit.activeClaims == false, "bribe has active claims initiated");
        require(deposit.tokenAmount > 0, "bribe is empty");
        uint256 amount = deposit.tokenAmount;
        deposit.tokenAmount = 0;
        deposits[lsdnTicker] = deposit;
        emit BribeRemoved(deposit.id, msg.sender, block.timestamp);
        address lsdnOwner = abi.decode(dao, (address));
        ERC20(deposit.token).transfer(lsdnOwner, amount);
        delete deposits[lsdnTicker];
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

    function claimable(bytes calldata validatorBLSKey) public view returns (uint256) {
        string memory validatorNetwork = getValidatorNetwork(validatorBLSKey);
        TokenDeposit storage deposit = deposits[validatorNetwork];
        DepositClaim storage claims = claimedDeposits[validatorBLSKey];
        address nodeRunner = getNodeRunnerAddress(validatorBLSKey);
        require(msg.sender == nodeRunner, "only node runner may claim");
        uint256 bribeStart = claims.initiatedClaims[deposit.id];
        require(bribeStart > 0, "validator hasn't initiated claim");

        //return deposit.tokenToValidatorRatio;
        if (block.timestamp > (bribeStart + bribeLength)) { // 365 days from claim initiation
             return deposit.tokenToValidatorRatio;
        } else {
             uint256 secondsSinceBribeStarted = block.timestamp - bribeStart;
             uint256 rewardsPerSecond = deposit.tokenToValidatorRatio / bribeLength;
             uint256 scaledRewardsAmount = rewardsPerSecond * secondsSinceBribeStarted;
             return scaledRewardsAmount;
        }
    }

    function totalClaimable(bytes calldata validatorBLSKey) public view returns (uint256){
        string memory validatorNetwork = getValidatorNetwork(validatorBLSKey);
        TokenDeposit storage deposit = deposits[validatorNetwork];
        DepositClaim storage claims = claimedDeposits[validatorBLSKey];
        address nodeRunner = getNodeRunnerAddress(validatorBLSKey);
        require(msg.sender == nodeRunner, "only node runner may claim");
        uint256 bribeStart = claims.initiatedClaims[deposit.id];
        require(bribeStart > 0, "validator has not initiated claim");
        return deposit.tokenToValidatorRatio;
    }

    function hasClaimed(string calldata lsdNetwork, bytes calldata validatorBLS) public view returns (bool){
        DepositClaim storage claims = claimedDeposits[validatorBLS];
        TokenDeposit storage deposit = deposits[lsdNetwork];

        for(uint256 x = 0; x < claims.claimed.length; x++){
            if(claims.claimed[x] == deposit.id){
                return true;
            }
        }

        return false;
    }

    function initClaim(bytes calldata validatorBLSKey) public nonReentrant {
        uint256 currentTimestamp = block.timestamp;
        string memory validatorNetwork = getValidatorNetwork(validatorBLSKey);
        DepositClaim storage claims = claimedDeposits[validatorBLSKey];
        TokenDeposit storage deposit = deposits[validatorNetwork];
        require(claims.initiatedClaims[deposit.id] == 0, "already initiated claim");
        require(deposit.totalClaims < deposit.maxClaims, "maximum number of claims reached");
        for (uint256 i = 0; i < claims.claimed.length; i++) {
            require(claims.claimed[i] != deposit.id, "already claimed");
        }
        deposit.activeClaims = true;
        deposit.activeClaimsCount = deposit.activeClaimsCount + 1;
        deposit.totalClaims = deposit.totalClaims + 1;
        deposits[validatorNetwork] = deposit;      
        claimedDeposits[validatorBLSKey].initiatedClaims[deposit.id] = currentTimestamp;
    }

    function claim(bytes calldata validatorBLSKey) public nonReentrant {
        uint256 currentTimestamp = block.timestamp;
        string memory validatorNetwork = getValidatorNetwork(validatorBLSKey);
        // TO-DO: Refactor following lines (already in hasClaimed() which needs to remain public view for dApp
        DepositClaim storage claims = claimedDeposits[validatorBLSKey];
        TokenDeposit storage deposit = deposits[validatorNetwork];
        for (uint256 i = 0; i < claims.claimed.length; i++) {
            require(claims.claimed[i] != deposit.id, "already claimed");
        }
        
        uint256 amount = claimable(validatorBLSKey);

        uint256 feeAmount = 0;
        if(feePerClaimDivisor > 0){
            feeAmount = amount / feePerClaimDivisor;
        }
        require(amount>0,"nothing to claim");
        require(deposit.tokenAmount >= amount, "insufficient bribe balance"); // tested and working
        //require(deposit.expiration > currentTimestamp, "bribe expired"); // ExpirationDate + 28 days
        deposit.activeClaimsCount = deposit.activeClaimsCount - 1;
        if(deposit.activeClaimsCount == 0){
            deposit.activeClaims = false;
        }
        deposit.tokenAmount = deposit.tokenAmount - amount;
        deposits[validatorNetwork] = deposit;
        claimedDeposits[validatorBLSKey].claimed.push(deposit.id);
        ERC20(deposit.token).transfer(msg.sender, amount - feeAmount);
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