const provider = new ethers.providers.Web3Provider(window.ethereum, "any");


const connectWallet = document.querySelector('#connectWallet');
const walletAddr = document.querySelector('#walletAddress');
const accountDisplay = document.querySelector('#accountDisplay');

const network = document.querySelector("select");

const { Wizard } = require('@blockswaplab/lsd-wizard');

BribeVault_NodeRunners_Goerli = '0xd7BB3Ee6Cbec711c7D11864eF0A89A041ed65D69';
BribeVault_NodeRunners_Mainnet = '0x49af554ca2726828be938d2ea3229b1c47f471bf';

BribeVault_LSDNetworks_Goerli = '0x863302E8964029DF39c037C49308E5beEaC1F7c7'
BribeVault_LSDNetworks_Mainnet = '0xd3dfee51c18d09cd2efd1481295df85758280144'

GOERLI_INFURA = 'https://intensive-silent-violet.ethereum-goerli.discover.quiknode.pro/f7e4fa1b9ea3a3898dc4b6b0ba4a2eeb14e98e14/';
MAINNET_INFURA = ''

GOERLI_GRAPHQL = 'https://api.thegraph.com/subgraphs/name/bsn-eng/liquid-staking-derivative'
MAINNET_GRAPHQL = 'https://api.studio.thegraph.com/query/41256/lsd-mainnet/v0.0.2'

var GRAPHQL_PROTECTED_DEPOSITORS_BY_BLS = `
 query ProtectedStakers {
  protectedDeposits(
    where: {validator_: {id: "%BLS%"}}
  ) {
    id
    totalDeposit
    depositor
  }
}
`;

var GRAPHQL_MEV_DEPOSITORS_BY_BLS = `
 query MEVFeesStakers {
  feesAndMevDeposits(
    where: {validator_: {id: "%BLS%"}}
  ) {
    id
    totalDeposit
    depositor
  }
}
`;

var GRAPHQL_NODERUNNERS_BY_NETWORK = `
  query GetSmartWallet {
    smartWallets(where: {liquidStakingNetwork_: {ticker: "%NETWORK%"}}) {
      nodeRunner {
        id
        validators {
          id
        }
      }
    }
  }
`;

var GRAPHQL_LPTOKENS_BY_BLS = `
	query GetLPTokens { 
		lptokens(where: {blsPublicKey: "%BLS%"}) {
			id
			tokenType
		}
	}
`;

var GRAPHQL_LSM_BY_TICKER = `
	query GetLiquidStakingManagerByLSDNTicker {
	  liquidStakingNetworks(where: {ticker: "%NETWORK%"}) {
		ticker
		liquidStakingManager
	  }
	}
`;

var GRAPHQL_BLS_KEYS_BY_LSDN_AND_NODERUNNER = `
	query GetBLSKeysByLSDNTickerAndNodeRunnerAddress {
	  smartWallets(
		where: {liquidStakingNetwork_: {ticker: "%NETWORK%"}, nodeRunner_: {id: "%NODERUNNER%"}}
	  ) {
		nodeRunner {
		  validators {
			id
		  }
		}
	  }
	}
`;

var GRAPHQL_LSDN_OWNER_BY_TICKER = `
query GetLSDNOwnerByTicker {
  liquidStakingNetworks(where: {ticker: "%NETWORK%"}) {
    dao
	lsdIndex
  }
}
`;

const LSDN_BRIBE_ABI = `
[ { "inputs": [ { "internalType": "address", "name": "_owner", "type": "address" }, { "internalType": "address", "name": "_stakehouseUniverse", "type": "address" }, { "internalType": "address", "name": "_feeRecipient", "type": "address" }, { "internalType": "uint256", "name": "_feePerClaimDivisor", "type": "uint256" }, { "internalType": "address[]", "name": "rewardTokensAllowed", "type": "address[]" } ], "stateMutability": "nonpayable", "type": "constructor" }, { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "uint256", "name": "bribeId", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "sender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "epoch", "type": "uint256" } ], "name": "BribeAdded", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "uint256", "name": "bribeId", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "sender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "epoch", "type": "uint256" } ], "name": "BribeClaimed", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "uint256", "name": "bribeId", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "sender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "epoch", "type": "uint256" } ], "name": "BribeRemoved", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "uint256", "name": "bribeId", "type": "uint256" }, { "indexed": true, "internalType": "address", "name": "sender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "epoch", "type": "uint256" } ], "name": "BribeToppedUp", "type": "event" }, { "inputs": [ { "internalType": "bytes", "name": "validatorBLSKey", "type": "bytes" } ], "name": "claim", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "bribeToken", "type": "address" }, { "internalType": "uint256", "name": "bribeAmount", "type": "uint256" }, { "internalType": "uint256", "name": "tokenToValidatorRatio", "type": "uint256" }, { "internalType": "string", "name": "lsdNetwork", "type": "string" }, { "internalType": "address", "name": "liquidStakingManager", "type": "address" }, { "internalType": "uint16", "name": "maxClaims", "type": "uint16" } ], "name": "depositBribe", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "sender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "newFeePerClaim", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "oldFeePerClaim", "type": "uint256" }, { "indexed": false, "internalType": "uint256", "name": "epoch", "type": "uint256" } ], "name": "FeePerClaimUpdated", "type": "event" }, { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "sender", "type": "address" }, { "indexed": false, "internalType": "address", "name": "newFeeRecipient", "type": "address" }, { "indexed": false, "internalType": "address", "name": "oldFeeRecipient", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "epoch", "type": "uint256" } ], "name": "FeeRecipientUpdated", "type": "event" }, { "inputs": [ { "internalType": "bytes", "name": "validatorBLSKey", "type": "bytes" } ], "name": "initClaim", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "token", "type": "address" }, { "internalType": "bool", "name": "allowed", "type": "bool" } ], "name": "setAllowToken", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "uint256", "name": "newFeePerClaim", "type": "uint256" } ], "name": "setFeePerClaim", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "newFeeRecipient", "type": "address" } ], "name": "setFeeRecipient", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "anonymous": false, "inputs": [ { "indexed": true, "internalType": "address", "name": "sender", "type": "address" }, { "indexed": false, "internalType": "uint256", "name": "epoch", "type": "uint256" } ], "name": "VaultCreated", "type": "event" }, { "inputs": [ { "internalType": "address", "name": "liquidStakingManager", "type": "address" } ], "name": "withdrawRemainingBribe", "outputs": [], "stateMutability": "nonpayable", "type": "function" }, { "inputs": [], "name": "bribeLength", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "bytes", "name": "validatorBLSKey", "type": "bytes" } ], "name": "claimable", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "depositIndex", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "string", "name": "", "type": "string" } ], "name": "deposits", "outputs": [ { "internalType": "uint256", "name": "id", "type": "uint256" }, { "internalType": "address", "name": "token", "type": "address" }, { "internalType": "uint256", "name": "tokenAmount", "type": "uint256" }, { "internalType": "uint256", "name": "tokenToValidatorRatio", "type": "uint256" }, { "internalType": "bool", "name": "activeClaims", "type": "bool" }, { "internalType": "uint16", "name": "activeClaimsCount", "type": "uint16" }, { "internalType": "uint16", "name": "maxClaims", "type": "uint16" }, { "internalType": "uint16", "name": "totalClaims", "type": "uint16" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "bytes", "name": "validatorBLSKey", "type": "bytes" }, { "internalType": "address", "name": "depositor", "type": "address" } ], "name": "ethDepositsByBLSKeyAndAddress", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "feePerClaimDivisor", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "feePerClaimDivisorMin", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "feeRecipient", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "bytes", "name": "validatorBLSKey", "type": "bytes" } ], "name": "getLPTokensByBLS", "outputs": [ { "internalType": "address", "name": "", "type": "address" }, { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "bytes", "name": "validatorBLSKey", "type": "bytes" } ], "name": "getNodeRunnerAddress", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "bytes", "name": "validatorBLSKey", "type": "bytes" } ], "name": "getSavETHandMEVFeesPoolsByBLS", "outputs": [ { "internalType": "address", "name": "", "type": "address" }, { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "bytes", "name": "validatorBLSKey", "type": "bytes" } ], "name": "getValidatorNetwork", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "string", "name": "lsdNetwork", "type": "string" }, { "internalType": "bytes", "name": "validatorBLS", "type": "bytes" } ], "name": "hasClaimed", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "lsdNetworkIndex", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "name": "lsdNetworkNames", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "owner", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "address", "name": "", "type": "address" } ], "name": "rewardTokens", "outputs": [ { "internalType": "bool", "name": "", "type": "bool" } ], "stateMutability": "view", "type": "function" }, { "inputs": [], "name": "stakehouseUniverse", "outputs": [ { "internalType": "address", "name": "", "type": "address" } ], "stateMutability": "view", "type": "function" }, { "inputs": [ { "internalType": "bytes", "name": "validatorBLSKey", "type": "bytes" } ], "name": "totalClaimable", "outputs": [ { "internalType": "uint256", "name": "", "type": "uint256" } ], "stateMutability": "view", "type": "function" } ]
`

const verifiedTokens_Goerli = ['0x359599d4032D6540F3bE62E459861f742Ceb851f', // BSN
							   '0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6', // WETH
							   '0x15fB74F4d828C85a1b71Ac1A83f31E1D2B8Beb73'  // USDC
							   ];
							   
const verifiedTokens_Mainnet = ['0x534D1F5E617e0f72A6b06a04Aa599839AF776A5e', // BSN
								'0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2', // WETH
								'0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' // USDC]
							];
// Materialize.css Tabs
tabsElem = document.getElementById("tabs");
var instance = M.Tabs.init(tabsElem, undefined);
/////////////////////////

function getNodeRunnerBribeVaultAddress(networkID){
	if(networkID == 5){
		return BribeVault_NodeRunners_Goerli;
	}else if(networkID == 1){
		return BribeVault_NodeRunners_Mainnet;
	}else{
		return false; // TO-DO: raise error here instead
	}
}

function getLSDNBribeVaultAddress(networkID){
	if(networkID == 5){
		return BribeVault_LSDNetworks_Goerli;
	}else if(networkID == 1){
		return BribeVault_LSDNetworks_Mainnet;
	}else{
		return false; // TO-DO: raise error here instead
	}
}

async function lpSnapshot(blsKey, snapshot){
	await provider.send("eth_requestAccounts", []);
	const signer = provider.getSigner();
	snapshotABI = [{
		"inputs": [
			{
				"internalType": "bytes",
				"name": "validatorBLSKey",
				"type": "bytes"
			},
			{
				"internalType": "address[]",
				"name": "recipients",
				"type": "address[]"
			},
			{
				"internalType": "uint256[]",
				"name": "lpTokenAmounts",
				"type": "uint256[]"
			}
		],
		"name": "setLPSnapshot",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}];
	
	const chainId = await getConnectedNetworkId();
	const BribeVaultAddress = getNodeRunnerBribeVaultAddress(chainId)
	const BribeVaultContract = new ethers.Contract(BribeVaultAddress, snapshotABI, signer);
	
	var recipients = [];
	var lpAmounts = [];
	
	for (let snapshotRow in snapshot){
		recipients.push(snapshotRow);
		lpAmounts.push(snapshot[snapshotRow].toString());
	};
		
	try{
		const encodedData = ethers.utils.arrayify(blsKey);
		const result = await BribeVaultContract.setLPSnapshot(blsKey, recipients, lpAmounts);
		const txReceipt = await result.wait();
		console.log("Transaction successful:", txReceipt);
		M.toast({html: 'Snapshot successful', displayLength:10000, classes: 'rounded green', });
		
		loadingBar = document.getElementById('snapshotLoading');
		submitSnapshotBtn = document.getElementById('submitSnapshotBtn');
		cancelSnapshotBtn = document.getElementById('cancelSnapshotBtn');
		loadingBar.style = 'display:none;'
		submitSnapshotBtn.style = 'display:;';
		cancelSnapshotBtn.style = 'display:;';
		
		snapshotModal = document.getElementById('confirmSnapshot');
		const dialogInstance = M.Modal.init(snapshotModal);
		dialogInstance.close();
		
		return result;
	}catch(e){
		console.log(e);
		
		M.toast({html: 'Failed to set snapshot', displayLength:10000, classes: 'rounded red', });
		loadingBar = document.getElementById('snapshotLoading');
		submitSnapshotBtn = document.getElementById('submitSnapshotBtn');
		cancelSnapshotBtn = document.getElementById('cancelSnapshotBtn');
		loadingBar.style = 'display:none;'
		submitSnapshotBtn.style = 'display:;';
		cancelSnapshotBtn.style = 'display:;';
		return 0;
	}
}

async function getLPTokensByBls(bls){
	chainId = await getConnectedNetworkId();
	graphQLURL = chainId == 1 ? MAINNET_GRAPHQL : GOERLI_GRAPHQL;

	response = await fetch(graphQLURL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify( {query: GRAPHQL_LPTOKENS_BY_BLS.replace('%BLS%', bls)} )
		});
	respJson = await response.json();
	return respJson;
}

async function getLiquidStakingManagerByLSDNTicker(networkTicker){
	chainId = await getConnectedNetworkId();
	graphQLURL = chainId == 1 ? MAINNET_GRAPHQL : GOERLI_GRAPHQL;

	response = await fetch(graphQLURL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify( {query: GRAPHQL_LSM_BY_TICKER.replace('%NETWORK%', networkTicker)} )
		});
	respJson = await response.json();
	return respJson;
}

async function getBLSKeysByLSDNTickerAndNodeRunnerAddress(networkTicker, nodeRunner){
	chainId = await getConnectedNetworkId();
	graphQLURL = chainId == 1 ? MAINNET_GRAPHQL : GOERLI_GRAPHQL;

	response = await fetch(graphQLURL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify( {query: GRAPHQL_BLS_KEYS_BY_LSDN_AND_NODERUNNER.replace('%NETWORK%', networkTicker).replace('%NODERUNNER%', nodeRunner)} )
		});
	respJson = await response.json();
	return respJson;
}

async function getLSDNetworkOwnerByTicker(networkTicker){
	chainId = await getConnectedNetworkId();
	graphQLURL = chainId == 1 ? MAINNET_GRAPHQL : GOERLI_GRAPHQL;

	response = await fetch(graphQLURL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify( {query: GRAPHQL_LSDN_OWNER_BY_TICKER.replace('%NETWORK%', networkTicker)} )
		});
	respJson = await response.json();
	return respJson;
}


async function getNodeRunnersByNetwork(network){
	chainId = await getConnectedNetworkId();
	graphQLURL = chainId == 1 ? MAINNET_GRAPHQL : GOERLI_GRAPHQL;

	response = await fetch(graphQLURL, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify( {query: GRAPHQL_NODERUNNERS_BY_NETWORK.replace('%NETWORK%', network)} )
		});
	respJson = await response.json();
	return respJson;
}

async function setLPSnapshot(bls){
	// ISSUE: Depositors who withdraw their ETH before the validator is staked still appear in the Graph API
	// EXAMPLE: Staker s1 deposits 0.001 ETH to MEV pool for Validator v1 \
	//          s1 withdraws the 0.001 ETH before v1 can become staked \
	//			s1 now appears in the Graph query for v1's MEV depositors \
	// 			dApp now includes the withdrawn 0.001 ETH deposit in the \
	// 			  snapshot, resulting in execution reverted. 

	// SOLUTION: Using ethers.js, verify the balanceOf() each depositor in \
	//				the Graph API response for LP tokens matches snapshot.

	// SOLUTION STEP 1: Get LP Token address for BLS (lsd-wizard or Graph API?)
	//			STEP 2: Create ethers contract based on ERC-20 ABI for LP Tokens
	//			STEP 3: Verify balanceOf() forEach depositor for LP Tokens
	//			STEP 4: Only add to snapshot those depositors who match

	const signer = provider.getSigner();
	var balanceOfABI = [{
        "constant": true,
        "inputs": [
            {
                "name": "_owner",
                "type": "address"
            }
        ],
        "name": "balanceOf",
        "outputs": [
            {
                "name": "balance",
                "type": "uint256"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }];
	lpTokensObj = await getLPTokensByBls(bls);

	console.log("LP Tokens Object");
	console.log(lpTokensObj);

	lpTokens = lpTokensObj.data.lptokens;

	console.log("LP Tokens");
	console.log(lpTokens);

	if(lpTokens.length != 2){
		console.log("Could not find LP tokens for BLS " + bls);
		return;
	}

	var protectedStakingContract = undefined;
	var mevStakingContract = undefined;

	for(var lpTokenIndx = 0; lpTokenIndx < lpTokens.length; lpTokenIndx ++){
		const lpTokenType = lpTokens[lpTokenIndx]['tokenType'];
		if(lpTokenType == "PROTECTED_STAKING_LP"){
			protectedStakingContract = new ethers.Contract(lpTokens[lpTokenIndx]['id'], balanceOfABI, signer);
	
		}else if(lpTokenType == "FEES_AND_MEV_LP"){
			mevStakingContract = new ethers.Contract(lpTokens[lpTokenIndx]['id'], balanceOfABI, signer);
		}else{
			console.log("Unexpected lpTokenType " + lpTokenType);
			return;
		}
	}

	chainId = await getConnectedNetworkId();
	graphQLURL = chainId == 1 ? MAINNET_GRAPHQL : GOERLI_GRAPHQL;
	fetch(graphQLURL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify( {query: GRAPHQL_MEV_DEPOSITORS_BY_BLS.replace('%BLS%', bls)} )
	}).then((response) => response.json())
  .then((data) => {
	snapshot = {}
	
	lpSnapshotTbl = document.getElementById('lpSnapshotTbl');
	lpSnapshotTbl.innerHTML = ''; // clear existing rows/data
	
	data.data.feesAndMevDeposits.forEach(function(mevFeesDeposit){
		(async () => {
			console.log("Verifying balanceOf() MEV LP token for ");
			console.log(mevFeesDeposit);
			mevLPBalance = await mevStakingContract.balanceOf(mevFeesDeposit.depositor);
			if(mevLPBalance == mevFeesDeposit.totalDeposit){
				snapshot[mevFeesDeposit.depositor] = ethers.BigNumber.from(mevFeesDeposit.totalDeposit);
			}else{
				console.log("Filtered out withdrawn (?) MEV deposit");
			}
		})();
	});
	
	fetch(graphQLURL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json'
		},
		body: JSON.stringify( {query: GRAPHQL_PROTECTED_DEPOSITORS_BY_BLS.replace('%BLS%', bls)} )
	}).then((response) => response.json())
	.then((data) => {
		data.data.protectedDeposits.forEach(function(protectedDeposit){
			(async () => {
				console.log("Verifying balanceOf() Protected LP token for ");
				console.log(protectedDeposit);
				protectedLPBalance = await protectedStakingContract.balanceOf(protectedDeposit.depositor);
				if(protectedLPBalance == protectedDeposit.totalDeposit){
					if(protectedDeposit.depositor in snapshot){
						snapshot[protectedDeposit.depositor] = ethers.BigNumber.from(snapshot[protectedDeposit.depositor]).add(ethers.BigNumber.from(protectedDeposit.totalDeposit));
					}else{
						snapshot[protectedDeposit.depositor] = ethers.BigNumber.from(protectedDeposit.totalDeposit);
					}
				}else{
					console.log("Filtered out withdrawn (?) Protected deposit");
				}
			})();
		});
		
		for (let snapshotRow in snapshot){
			var newRow = lpSnapshotTbl.insertRow(0);
			var newCell = newRow.insertCell(0);
			var newCell2 = newRow.insertCell(1);
			newCell.innerHTML = snapshotRow;
			newCell2.innerHTML = ethers.BigNumber.from(snapshot[snapshotRow]).div(ethers.BigNumber.from((10**18).toString()));
		};
		
		snapshotModal = document.getElementById('confirmSnapshot');
		const dialogInstance = M.Modal.init(snapshotModal);
		dialogInstance.open();
		
		submitSnapshotBtn = document.getElementById('submitSnapshotBtn');
		submitSnapshotBtn.addEventListener("click", function(){
			this.style = 'display:none;';
			
			cancelSnapshotBtn = document.getElementById('cancelSnapshotBtn');
			cancelSnapshotBtn.style = 'display:none;';
			
			loadingBar = document.getElementById('snapshotLoading');
			loadingBar.style = 'display:;';
			
			(async () => {
				await lpSnapshot(bls, snapshot);
			})();
		});
	});
	
  });
}

async function getConnectedNetworkId(){
	await provider.send("eth_requestAccounts", []);
	const { chainId } = await provider.getNetwork()
	return chainId;
}

async function getConnectedNetwork() {
	chainId = await getConnectedNetworkId();
	network.value = chainId;
	M.FormSelect.init(network, undefined);
}

async function checkConnected() {
	const signer = provider.getSigner();
	if (signer){
		
		walletAddr.innerHTML = await compactAddress(await signer.getAddress());
		connectWallet.setAttribute('disabled','disabled');
		connectWallet.innerHTML = 'Connected';
		accountDisplay.style.visibility = "visible";
		
		chainId = await getConnectedNetworkId();
		await updateTokenSelectAddresses(chainId);
	}
}

function compactNumber(inputNum, maxDecimals = 18){
	return Intl.NumberFormat('en-US', {
		notation: "compact",
		maximumFractionDigits: maxDecimals
	}).format(inputNum.toString());
}

function lsdnLink(lsdNetworkIndex, lsdNetworkTicker) {
	var networkName = "goerli";
	if (network.value == 1){
		networkName = "mainnet"
	}else if (network.value == 5){
		networkName = "goerli"
	}else{
		return;
	}
	return '<span class="chip"><a href="https://joinstakehouse.com/monitoring/index/' + lsdNetworkIndex.toString() + "?network=" + networkName + '">' + lsdNetworkTicker + "</a></span>";
}

function compactAddress(addr){
	const firstFour = addr.substring(0, 6);
	const lastFour = addr.substring(addr.length - 4);
	var etherscanUrl = ""
	if (network.value == 1){
		etherscanUrl = 'https://etherscan.io/address/'
	}else if (network.value == 5){
		etherscanUrl = 'https://goerli.etherscan.io/address/'
	}else{
		return;
	}
	return '<span class="chip"><a href="' + etherscanUrl + addr + '" target="_blank">' + firstFour + "..." + lastFour + " <span class='material-icons' style='vertical-align: bottom;'>" +
			'expand_more</span></a></span>';
}

function compactBLSKeyLink(inputBLS){
	const firstFour = inputBLS.substring(0, 6);
	const lastFour = inputBLS.substring(inputBLS.length - 4);
	var beaconChainURL = ""
	if (network.value == 1){
		beaconChainURL = 'https://beaconcha.in/validator/'
	}else if (network.value == 5){
		beaconChainURL = 'https://prater.beaconcha.in/validator/'
	}else{
		return;
	}
	return '<span class="chip"><a href="' + beaconChainURL + inputBLS + '">' + firstFour + "..." + lastFour + "</a></span>";
}

async function claimable(blsKey){
	await provider.send("eth_requestAccounts", []);
	const signer = provider.getSigner();
	const contractABI = [{
		"inputs": [
			{
				"internalType": "bytes",
				"name": "validatorBLSKey",
				"type": "bytes"
			}
		],
		"name": "claimable",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}];
	
	const chainId = await getConnectedNetworkId();
	const BribeVaultAddress = getNodeRunnerBribeVaultAddress(chainId);
	const BribeVaultContract = new ethers.Contract(BribeVaultAddress, contractABI, signer);
	
	try{
		const encodedData = ethers.utils.arrayify(blsKey);
		const claimableResult = await BribeVaultContract.claimable(encodedData);
		
		return claimableResult;
	}catch(e){
		console.log(e);
		
		if(e.toString().includes('LP snapshot not taken')){
			return -1;
		}
		return 0;
	}
}

async function claimableLSDN(blsKey, lsdnTicker){
	await provider.send("eth_requestAccounts", []);
	const signer = provider.getSigner();
	const contractABI = [{
		"inputs": [
			{
				"internalType": "bytes",
				"name": "validatorBLSKey",
				"type": "bytes"
			}
		],
		"name": "claimable",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},{
		"inputs": [
			{
				"internalType": "bytes",
				"name": "validatorBLSKey",
				"type": "bytes"
			}
		],
		"name": "getValidatorNetwork",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},{
		"inputs": [],
		"name": "lsdNetworkIndex",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "lsdNetworkNames",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},{
		"inputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"name": "deposits",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenAmount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "tokenToValidatorRatio",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "activeClaims",
				"type": "bool"
			},
			{
				"internalType": "uint16",
				"name": "activeClaimsCount",
				"type": "uint16"
			},
			{
				"internalType": "uint16",
				"name": "maxClaims",
				"type": "uint16"
			},
			{
				"internalType": "uint16",
				"name": "totalClaims",
				"type": "uint16"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}];

	const chainId = await getConnectedNetworkId();
	const BribeVaultAddress = getLSDNBribeVaultAddress(chainId);
	const BribeVaultContract = new ethers.Contract(BribeVaultAddress, LSDN_BRIBE_ABI, signer);
	
	console.log("Checking claimable for LSD network " + blsKey);
	
	var encodedData = ethers.utils.arrayify(blsKey);
	var lsdNetwork;

	try{
		lsdNetwork = await BribeVaultContract.getValidatorNetwork(encodedData);
		var claimableResult = await BribeVaultContract.claimable(encodedData);
		// claimable will revert with "validator hasn't initiated claim" if BLS has not
		// initiated claim for their network bribe
		return ethers.BigNumber.from(claimableResult.toString())
	}catch(e){
		// if execution reverted, then either:
		//  - the BLS hasn't initiated claim
		//  - the BLS isnn't eligible
		// unfortunately the claimedDeposits mapping is internal, so we
		// need to cross-check LSDN ticker here
		if(e.toString().includes("validator hasn't initiated claim") && lsdnTicker == lsdNetwork){
			return ethers.BigNumber.from("-1");
		}else{
			return 0;
		}
	}

	try{
		const blsNetwork = await BribeVaultContract.getValidatorNetwork(blsKey);
		const incentivizedNetworksCount = await BribeVaultContract.lsdNetworkIndex();
		for (var x = 0; x < incentivizedNetworksCount; x++){
			const incentivizedNetworkSymbol = await BribeVaultContract.lsdNetworkNames(x);
			const bribeDeposit = await BribeVaultContract.deposits(incentivizedNetworkSymbol);
			if (blsNetwork == incentivizedNetworkSymbol) {
				console.log("claimable result");
				console.log(bribeDeposit[3]);
				return bribeDeposit[3];
			}
		}
		return 0;
	}catch(e){
		console.log("Error: ");
		console.log(e);
		return 0;
	}
}


async function hasClaimed(blsKey, address){
	await provider.send("eth_requestAccounts", []);
	const signer = provider.getSigner();
	
	const contractABI = [
		{
			"inputs": [
				{
					"internalType": "bytes",
					"name": "validatorBLSKey",
					"type": "bytes"
				},
				{
					"internalType": "address",
					"name": "recipient",
					"type": "address"
				}
			],
			"name": "hasClaimed",
			"outputs": [
				{
					"internalType": "bool",
					"name": "",
					"type": "bool"
				}
			],
			"stateMutability": "view",
			"type": "function"
		}
	];
	
	const chainId = await getConnectedNetworkId();
	const BribeVaultAddress = getNodeRunnerBribeVaultAddress(chainId);
	const BribeVaultContract = new ethers.Contract(BribeVaultAddress, contractABI, signer);
	
	console.log("Checking hasClaimed for addr " + address + " and BLS key " + blsKey);
	
	try{
		const encodedData = ethers.utils.arrayify(blsKey);
		const hasClaimedResult = await BribeVaultContract.hasClaimed(encodedData, address);
	
		console.log("hasClaimed result");
		console.log(hasClaimedResult.toString());
		
		return hasClaimedResult.toString() == "true";
	}catch(e){
		console.log("Error: ");
		console.log(e);
		return false;
	}
}

async function hasClaimedNodeRunner(lsdTicker, validatorBLS){
	await provider.send("eth_requestAccounts", []);
	const signer = provider.getSigner();
	
	const contractABI = [
		{
		"inputs": [
			{
				"internalType": "string",
				"name": "lsdNetwork",
				"type": "string"
			},
			{
				"internalType": "bytes",
				"name": "validatorBLS",
				"type": "bytes"
			}
		],
		"name": "hasClaimed",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "view",
		"type": "function"
		}
	];
	
	const chainId = await getConnectedNetworkId();
	const BribeVaultAddress = getLSDNBribeVaultAddress(chainId);
	const BribeVaultContract = new ethers.Contract(BribeVaultAddress, contractABI, signer);

	console.log("Checking hasClaimed for LSD ticker " + lsdTicker + " and BLS key " + validatorBLS);
	
	try{
		const encodedData = ethers.utils.arrayify(validatorBLS);
		const hasClaimedResult = await BribeVaultContract.hasClaimed(lsdTicker, encodedData);
	
		console.log("hasClaimed result");
		console.log(hasClaimedResult.toString());
		
		return hasClaimedResult.toString() == "true";
	}catch(e){
		console.log("Error: ");
		console.log(e);
		return false;
	}
}

function getEtherscanLink(){
	if (network.value == 1){
		return 'https://etherscan.io/';
	}else if (network.value == 5){
		return 'https://goerli.etherscan.io/';
	}else{
		return;
	}
}

async function getFirstClaimableLSDNValidatorForSigner(lsdnTicker, signer){
	//console.log("getFirstClaimableLSDNValidatorForSigner()");
	signerAddr = await signer.getAddress();
	signerAddrLower = signerAddr.toString().toLowerCase();
	//console.log("getFirstClaimableLSDNValidatorForSigner(): signer addr: " + signerAddrLower);
	var blsKeys = await getBLSKeysByLSDNTickerAndNodeRunnerAddress(lsdnTicker, signerAddrLower);
	console.log("getBLSKeysByLSDNTickerAndNodeRunnerAddress result")
	console.log(blsKeys)
	if(blsKeys.data.smartWallets.length == 0){
		return ""; // there are no claimable validators for this LSDN bribe
	}

	for (var x=0; x<blsKeys.data.smartWallets[0].nodeRunner.validators.length; x++){
		var claimable = await claimableLSDN(blsKeys.data.smartWallets[0].nodeRunner.validators[x].id, lsdnTicker);
		if (claimable != 0){ // Register/Initiate == -1
			return blsKeys.data.smartWallets[0].nodeRunner.validators[x].id;
		}
	}
}

async function addBribeToList(bribeToken, bribeAmountBsn, bribeRatio, validatorBLSorNetworkName, expiration, disabled, bribeType, maxClaimsForLSDNBribe, totalClaimsForLSDNBribe, activeClaimsForLSDNBribe){
	var networkName;
	var validatorBLS;
	if(bribeType=="nodeRunner"){
		validatorBLS = validatorBLSorNetworkName;
	}else{
		networkName = validatorBLSorNetworkName;
	}
	
	await provider.send("eth_requestAccounts", []);
	const signer = provider.getSigner();
	
	const wizard = new Wizard({
		signerOrProvider: signer,
	});
	
	var claimableAmt;
	var firstClaimableBLS;
	if(bribeType=="nodeRunner"){
		claimableAmt = await claimable(validatorBLS);
	}else{
		firstClaimableBLS = await getFirstClaimableLSDNValidatorForSigner(validatorBLSorNetworkName, signer);
		if(firstClaimableBLS == ""){
			claimableAmt = 0;
			disabled = false; // set this to false to prevent Claimed button from showing
		}else{
			console.log("Found first BLS eligible to claim: " + firstClaimableBLS);
			claimableAmt = await claimableLSDN(firstClaimableBLS, validatorBLSorNetworkName);

			var hasClaimedReward = await hasClaimedNodeRunner(validatorBLSorNetworkName, firstClaimableBLS);

			disabled = hasClaimedReward; // update the disabled attribute (Claimed btn)
		}
	}
	
	var lsdNetworkTicker = "???"
	var lsdNetworkStatus = ""
	
	if(bribeType=="nodeRunner"){
		const result = await wizard.helper.getValidatorDetails(validatorBLS);
		if(result!=undefined){
			lsdNetworkTicker = result.lsd;
			lsdNetworkStatus = result.status; // only show Snapshot button iff MINTED_DERIVATIVES 
		}
	}else{
		lsdNetworkTicker = networkName;
	}
	
	bribesList = document.getElementById('bribesList');
	var li = document.createElement("li");
	li.classList.add('collection-item');
	li.classList.add('white-text');
	
	const epochSeconds = Math.round(Date.now() / 1000);
	const bribeExpired = epochSeconds > expiration;
	const expirationDate = moment.unix(expiration);
	const expirationStr = expirationDate.fromNow();
	
	const bribeAmount = new Decimal(bribeAmountBsn.toString());
	const rewardsRatio = new Decimal(bribeRatio.toString());
	
	abi = [{
		"constant": true,
		"inputs": [],
		"name": "decimals",
		"outputs": [
			{
				"name": "",
				"type": "uint8"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	},{
        "constant": true,
        "inputs": [],
        "name": "symbol",
        "outputs": [
            {
                "name": "",
                "type": "string"
            }
        ],
        "payable": false,
        "stateMutability": "view",
        "type": "function"
    }];
	
	const bribeTokenContract = new ethers.Contract(bribeToken, abi, signer);
	const bribeTokenSymbol = await bribeTokenContract.symbol();
	tokenDecimals = await bribeTokenContract.decimals();
	
	const divisor = new Decimal(Math.pow(10,tokenDecimals));
	const bribeAmtScaled = bribeAmount.div(divisor);
	const rewardsRatioScaled = rewardsRatio.div(divisor);

	claimBtnHtml = "";
	if(disabled){
		claimBtnHtml = '<a href="#!" id="claim'+validatorBLSorNetworkName+'" class="secondary-content col s2 btn btn-large disabled" style="border-radius: 15px;">Claimed</a>';
	}else{
		if(claimableAmt>0){
				const claimableAmount = new Decimal(claimableAmt.toString());
				const claimableAmtScaled = claimableAmount.div(divisor);
				claimBtnHtml = '<a href="#!" id="claim'+validatorBLSorNetworkName+
				'" class="secondary-content col s2 btn btn-large" style="background-color:#78A7FF;border-radius: 15px;min-width:150px;margin-top:14px;">'+
				'Claim ' + compactNumber(claimableAmtScaled, 3) + '</a>';
		}else if(claimableAmt<0){ // LP snapshot not taken OR lsdn bribe claim not initiated
			if(bribeType != "nodeRunner"){
				// signer has not initiated claim, display initiate/register btn
				claimBtnHtml = '<a href="#!" id="register'+validatorBLSorNetworkName+
				'-'+firstClaimableBLS+'" class="secondary-content col s2 btn btn-large" style="background-color:#78A7FF;border-radius: 15px;min-width:150px;margin-top:14px;">'+
				'Register</a>';
			}else{
				if(lsdNetworkStatus == "MINTED_DERIVATIVES"){ // validator is staked and derivatives minted, show Snapshot btn
					claimBtnHtml = '<a href="#!" id="lpSnapshot'+validatorBLSorNetworkName+
					'" class="secondary-content col s2 btn btn-large tooltipped" data-position="bottom" data-tooltip="LP balances must be recorded in a snapshot on-chain before rewards may be claimed" style="background-color:#78A7FF;border-radius: 15px;min-width:150px;margin-top:14px;">'+
					'Snapshot</a>';
				}else if (lsdNetworkStatus == "WAITING_FOR_ETH"){ // validator has not yet staked
					claimBtnHtml = '<a href="#!" disabled class="secondary-content col s2 btn btn-large tooltipped" data-position="bottom" data-tooltip="The validator has not yet been staked" style="background-color:#78A7FF;border-radius: 15px;min-width:150px;margin-top:14px;">'+
					'Waiting for ETH</a>'
				}else if (lsdNetworkStatus == "STAKED"){ // validator has not yet minted derivatives
					claimBtnHtml = '<a href="#!" disabled class="secondary-content col s2 btn btn-large tooltipped" data-position="bottom" data-tooltip="The validator has not yet minted derivatives" style="background-color:#78A7FF;border-radius: 15px;min-width:150px;margin-top:14px;">'+
					'Waiting on mint</a>'
				}
			}
		}else{
			// user is not eligible to claim. Perhaps display the LP Snapshot
		}
	}
	
	lsdnOwnerMayWithdraw = false;
	var lsdNetworkIndex = 0;
	signerAddr = await signer.getAddress()

	if (bribeType == "lsdNetwork"){
		var lsdnOwner = await getLSDNetworkOwnerByTicker(validatorBLSorNetworkName);
		lsdnOwnerStr = lsdnOwner.data.liquidStakingNetworks[0].dao;
		lsdNetworkIndex = lsdnOwner.data.liquidStakingNetworks[0].lsdIndex;
		console.log("LSDN data")
		console.log(lsdnOwner.data.liquidStakingNetworks[0])
		console.log("LSDN owner: " + lsdnOwnerStr)
		console.log("LSDN index: " + lsdNetworkIndex.toString())
		lsdnOwnerMayWithdraw = (activeClaimsForLSDNBribe == 0) && (lsdnOwnerStr == signerAddr);
	}

	if((bribeExpired && bribeType == "nodeRunner") || (lsdnOwnerMayWithdraw && bribeType == "lsdNetwork")){ 
		claimBtnHtml = '<a href="#!" id="withdraw'+validatorBLSorNetworkName+'" class="secondary-content col s2 btn btn-large" style="background-color:#78A7FF;border-radius: 15px;">Withdraw</a>';
	}
	
	var loadingBar = '<div class="progress" id="claimLoading" style="display:none;"><div class="indeterminate"></div></div>';
	
	var expirationHtml;

	if (bribeType=="nodeRunner"){
		expirationHtml = '<span class="secondary-content chip col s3" style="display:inline-flex;align-items: center;height: auto;padding: 0.5rem 0.75rem;min-width:190px;max-width:190px;">'+
						 '<i class="material-icons xs" style="margin-right:4px;position: relative;top:5px;">lock_clock</i>expires ' +
						expirationStr + '</span>';
	} else {
		claimsProgress = totalClaimsForLSDNBribe.toString() + "/" + maxClaimsForLSDNBribe.toString()
		expirationHtml = '<span class="secondary-content chip col s3" style="display:inline-flex;align-items: center;height: auto;padding: 0.5rem 0.75rem;min-width:190px;max-width:190px;">'+
						 '<i class="material-icons xs" style="margin-right:4px;position: relative;top:5px;">price_check</i>' +
						claimsProgress + ' claims initiated</span>';
	}
	
	var verifiedIcon = '';
	
	if (network.value == 1){
		if(verifiedTokens_Mainnet.includes(bribeTokenContract.address)){
			verifiedIcon = ' <i class="material-icons green-text text-lighten-3">check_circle</i>';
		}
	}else if (network.value == 5){
		if(verifiedTokens_Goerli.includes(bribeTokenContract.address)){
			verifiedIcon = ' <i class="material-icons green-text text-lighten-3">check_circle</i>';
		}
	}
	
	var bribeTokenLink = '<a href="' + getEtherscanLink() + 'token/' + bribeTokenContract.address + '" target="_">' + bribeTokenSymbol + verifiedIcon + '</a>';
	
	if(bribeType=="nodeRunner"){
		li.innerHTML = '<div class="row" style="display: flex;justify-content:space-between;"><h5 class="title col s5 right-align">' + compactNumber(rewardsRatioScaled, 5) + ' ' + bribeTokenLink + '</h5> <h6 class="col s5" style="padding-top:7px;margin-left:0px;"> per 1 ETH</h5>' + expirationHtml + '</div>' + 
				   '<span class="row" style="display: flex;justify-content:space-between;"><p class="col s9" style="margin-left:16px;">' + compactNumber(bribeAmtScaled, 5) + 
				   ' remaining ' + bribeTokenSymbol + '<br>for depositors of ' + compactBLSKeyLink(validatorBLS) + ' <span class="chip">' + lsdNetworkTicker + '</span></p>' + 
				    claimBtnHtml + '</span>';
	}else{
		li.innerHTML = '<div class="row" style="display: flex;justify-content:space-between;"><h5 class="title col s5 right-align">' + compactNumber(rewardsRatioScaled, 5) + ' ' + bribeTokenLink + '</h5> <h6 class="col s5" style="padding-top:7px;margin-left:0px;"> per validator</h5>' + expirationHtml + '</div>' + 
				   '<span class="row" style="display: flex;justify-content:space-between;"><p class="col s9" style="margin-left:16px;">' + compactNumber(bribeAmtScaled, 5) + 
				   ' remaining ' + bribeTokenSymbol + '<br>for node runners in ' + lsdnLink(lsdNetworkIndex, lsdNetworkTicker) + '</p>' + 
				    claimBtnHtml + '</span>';
	}
	li.style = 'background-color:#424242;';
	bribesList.appendChild(li);
	
	var elems = document.querySelectorAll('.tooltipped');
	var instances = M.Tooltip.init(elems, undefined);
	
	var registerBtn = document.querySelectorAll('[id^="register' +validatorBLSorNetworkName +'"]');
	if (registerBtn.length>0){
		registerBtn[0].addEventListener('click', function() { 
			var blsKey = this.id.split('register' + validatorBLSorNetworkName + "-")[1];
			
			(async () => {
				console.log("Registering/initiating claim for " + validatorBLSorNetworkName + " and BLS Key " + blsKey);
				
				const encodedData = ethers.utils.arrayify(blsKey);
				initClaim = await initiateClaimLSDN(encodedData);
			})();
		});
	}

	var withdrawBtn = document.getElementById('withdraw'+validatorBLSorNetworkName);
	
	if(withdrawBtn != undefined){
		withdrawBtn.addEventListener('click', function() { 
			var blsOrNetwork = this.id.split('withdraw')[1];
			console.log("Withdrawing for " + blsOrNetwork);
			var m = document.getElementById('confirmWithdrawal');
			var withdrawAmt = document.getElementById('withdrawBsnAmount');
			var withdrawBls = document.getElementById('withdrawBLSorNetwork');
			var withdrawAddr = document.getElementById('withdrawAddr');
			
			if(bribeType=="nodeRunner"){
				withdrawBls.innerHTML = compactBLSKeyLink(blsOrNetwork);
			}else{
				withdrawBls.innerHTML = blsOrNetwork;
			}
			const dialogInstance = M.Modal.init(m);
			dialogInstance.open();
		});
	}
	
	snapshotBtn = document.getElementById('lpSnapshot'+validatorBLS);
	
	if(snapshotBtn!=undefined){
		snapshotBtn.addEventListener('click', function() { 
			var bls = this.id.split('lpSnapshot')[1];
			
			(async () => {
				await setLPSnapshot(bls);
			})();
		});
	}
	
	
	claimBtn = document.getElementById('claim'+validatorBLSorNetworkName);
	
	if(claimBtn != undefined){
		claimBtn.addEventListener('click', function() { 
			(async () => {
				var goerli_http = new ethers.providers.JsonRpcProvider(GOERLI_INFURA);
				var blsOrNetwork = this.id.split('claim')[1];
	
				const contractABI = [
					{
						"inputs": [
							{
								"internalType": "bytes",
								"name": "validatorBLSKey",
								"type": "bytes"
							}
						],
						"name": "claim",
						"outputs": [],
						"stateMutability": "nonpayable",
						"type": "function"
					}];

				var bribeType = "";
	
				const chainId = await getConnectedNetworkId();
				var BribeVaultAddress; 
				var blsKey = ""
				if (blsOrNetwork.length > 6){
					bribeType = "validator";
					blsKey = blsOrNetwork;
					BribeVaultAddress = getNodeRunnerBribeVaultAddress(chainId);
				}else{
					bribeType = "lsdn";
					blsKey = await getFirstClaimableLSDNValidatorForSigner(blsOrNetwork, signer);
					BribeVaultAddress = getLSDNBribeVaultAddress(chainId);
				}
				
				const encodedData = ethers.utils.arrayify(blsKey);
				const contract = new ethers.Contract(BribeVaultAddress, contractABI, signer);

				const gasPrice = provider.getGasPrice().then(function(d){
					console.log("Gas gas price: " + d.toString());
					//const gasLimit = contract.estimateGas.claim(encodedData).then(function(g){
					g = 300000;//12500000; // debugging. Successful claim takes ~280k gas
					console.log({gasLimit:g.toString(),gasPrice:d.toString()});
					(async () => {
						const tx = await contract.claim(encodedData, {gasLimit:g.toString(),gasPrice:d.toString()});
						console.log(tx);
						try {
							const txReceipt = await tx.wait();
							M.toast({html: 'Claim succeeded!', displayLength:10000, classes: 'rounded green', });
						} catch (error) {
							console.log("Transaction failed:", error);
							M.toast({html: 'Claim failed', displayLength:10000, classes: 'rounded red', });
						}
					})();
				});
			})();
			
		}, false);
	}
}

async function checkBribes(){
	console.log("eth_requestAccounts...");
	await provider.send("eth_requestAccounts", []);
	console.log("Get Signer...");
	const signer = provider.getSigner();
	
	const contractABI = [
	  {
		"inputs": [
			{
				"internalType": "bytes",
				"name": "",
				"type": "bytes"
			}
		],
		"name": "deposits",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenAmount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "tokenToEthRatio",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "expiration",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	  {
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "blsDepositKeys",
		"outputs": [
			{
				"internalType": "bytes",
				"name": "",
				"type": "bytes"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "blsDepositKeyIndex",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
	];

	const lsdn_abi = [
	{
		"inputs": [],
		"name": "bribeLength",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [],
		"name": "depositIndex",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"name": "deposits",
		"outputs": [
			{
				"internalType": "uint256",
				"name": "id",
				"type": "uint256"
			},
			{
				"internalType": "address",
				"name": "token",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "tokenAmount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "tokenToValidatorRatio",
				"type": "uint256"
			},
			{
				"internalType": "bool",
				"name": "activeClaims",
				"type": "bool"
			},
			{
				"internalType": "uint16",
				"name": "activeClaimsCount",
				"type": "uint16"
			},
			{
				"internalType": "uint16",
				"name": "maxClaims",
				"type": "uint16"
			},
			{
				"internalType": "uint16",
				"name": "totalClaims",
				"type": "uint16"
			}
		],
		"stateMutability": "view",
		"type": "function"
	},
	{
		"inputs": [
			{
				"internalType": "uint256",
				"name": "",
				"type": "uint256"
			}
		],
		"name": "lsdNetworkNames",
		"outputs": [
			{
				"internalType": "string",
				"name": "",
				"type": "string"
			}
		],
		"stateMutability": "view",
		"type": "function"
	}
	];
	console.log("Get chain id...");
	const chainId = await getConnectedNetworkId();
	console.log("Get contracts...");
	const BribeVaultAddress = getNodeRunnerBribeVaultAddress(chainId);
	const BribeVaultContract = new ethers.Contract(BribeVaultAddress, contractABI, signer);
	
	const LSDNBribeVaultAddress = getLSDNBribeVaultAddress(chainId);
	const LSDNBribeVaultContract = new ethers.Contract(LSDNBribeVaultAddress, lsdn_abi, signer);
	
	const blsKeyIndex = await BribeVaultContract.blsDepositKeyIndex();
	const lsdnBribeIndex = await LSDNBribeVaultContract.depositIndex();
	
	var bribes = []
	var highestBribeRatio = 0;
	for(v = 0; v<blsKeyIndex; v++){
		const validator = await BribeVaultContract.blsDepositKeys(v);
		
		try{
			const encodedData = ethers.utils.arrayify(validator);
			const bribe = await BribeVaultContract.deposits(encodedData);
			const signerAddr = await signer.getAddress();
			
			if(bribe[0] == 0 && bribe[1] == 0 && bribe[2] == 0){
				continue;
			}
			
			var hasClaimedReward = await hasClaimed(validator, signerAddr);
			console.log("Has claimed: " + hasClaimedReward.toString());
			//if(hasClaimedReward){
			//	bribes[validator] = {'bribeToken':bribe[1],'bribeAmount':bribe[2], 'bribeRatio':bribe[3], 'expiration': bribe[4], 'claimed': true, 'bls':validator}
			//}else{
			//	bribes[validator] = {'bribeToken':bribe[1],'bribeAmount':bribe[2], 'bribeRatio':bribe[3], 'expiration': bribe[4], 'claimed': false, 'bls':validator}
			//}
			bribes[validator] = {'bribeToken':bribe[1],'bribeAmount':bribe[2], 'bribeRatio':bribe[3], 'expiration': bribe[4], 'claimed': hasClaimedReward, 'blsOrNetwork':validator, 'bribeType': "nodeRunner", "maxClaims":0, "totalClaims":0, "activeClaims":0}
		}catch(e){
			console.log("No bribes for " + validator);
			//console.log(e);
		}
	}

	console.log("Processing LSDN bribes...");
	for(n = 0; n<lsdnBribeIndex; n++){
		console.log("Processing LSDN bribes " + n.toString());
		const lsdNetworkName = await LSDNBribeVaultContract.lsdNetworkNames(n);
		
		console.log("Processing LSDN bribe for network: " + lsdNetworkName);
		try{
			console.log("Getting LSDN bribe deposit for network: " + lsdNetworkName);
			const bribe = await LSDNBribeVaultContract.deposits(lsdNetworkName);
			const signerAddr = await signer.getAddress();
			
			if(bribe[0] == 0 && bribe[1] == 0 && bribe[2] == 0){
				
				console.log("Skipping empty LSDN bribe");
				continue;
			}
			
			// TO-DO: Get validator BLS (multiple) for Node Runner (signer) address? OR
			//		  Or loop through each validator in the network and compare Node Runner to Signer
			// 			USE getNodeRunnersByNetwork()
			
			console.log("Getting all node runners for network: " + lsdNetworkName);
			var nodeRunners = await getNodeRunnersByNetwork(lsdNetworkName);

			console.log("Node runners for network: " + lsdNetworkName);
			console.log(nodeRunners);

			// hasAllClaimed = true by default if the Bribed Network has validators.
			// We'll set hasAllClaimed to false if we detect any that haven't claimed
			var hasAllClaimed = nodeRunners.data.smartWallets.length > 0;
			for(nodeRunnerIdx = 0; nodeRunnerIdx < nodeRunners.data.smartWallets.length; nodeRunnerIdx ++) {
				
				console.log("Iterating node runner for network: " + lsdNetworkName);
				console.log("NodeRunner data: ")
				console.log(nodeRunners.data.smartWallets[nodeRunnerIdx].nodeRunner);
				if (nodeRunners.data.smartWallets[nodeRunnerIdx].nodeRunner.id.toUpperCase() == signerAddr.toUpperCase()) {
					for(nrValidatorIdx = 0; nrValidatorIdx < nodeRunners.data.smartWallets[nodeRunnerIdx].nodeRunner.validators.length; nrValidatorIdx ++){
						console.log("Iterating vaidator for node runner: " + nodeRunners.data.smartWallets[nodeRunnerIdx].nodeRunner.id);
						console.log("Validator data: ")
						console.log(nodeRunners.data.smartWallets[nodeRunnerIdx].nodeRunner.validators[nrValidatorIdx])
						var hasClaimedReward = await hasClaimedNodeRunner(lsdNetworkName, nodeRunners.data.smartWallets[nodeRunnerIdx].nodeRunner.validators[nrValidatorIdx].id);
						if (!hasClaimedReward) {
							hasAllClaimed = false // if even 1 validator the signer runs is claimable, don't show 'Claimed'
						}
					}
				}
			}

			console.log("Has all validators (ran by signer) claimed: " + hasAllClaimed.toString());
			//if(hasClaimedReward){
			//	bribes[validator] = {'bribeToken':bribe[1],'bribeAmount':bribe[2], 'bribeRatio':bribe[3], 'expiration': bribe[4], 'claimed': true, 'bls':validator}
			//}else{
			//	bribes[validator] = {'bribeToken':bribe[1],'bribeAmount':bribe[2], 'bribeRatio':bribe[3], 'expiration': bribe[4], 'claimed': false, 'bls':validator}
			//}
			bribes[lsdNetworkName] = {'bribeToken':bribe[1],'bribeAmount':bribe[2], 'bribeRatio':bribe[3], 'expiration': 0, 'claimed': hasAllClaimed, 'blsOrNetwork':lsdNetworkName, 'bribeType': "lsdNetwork", "maxClaims":bribe[6], "totalClaims":bribe[7], "activeClaims":bribe[5]}
		}catch(e){
			console.log("No bribes for " + lsdNetworkName);
			console.log(e);
		}
	}


	sortedBribes=[];

	bribesList = document.getElementById('bribesList');
	bribesList.innerHTML = "" // clear bribes list 
	
	Object.keys(bribes).forEach((k) => {
		const bribe = bribes[k];
		(async () => {
			await addBribeToList(bribe.bribeToken, bribe.bribeAmount, bribe.bribeRatio, bribe.blsOrNetwork, bribe.expiration, bribe.claimed, bribe.bribeType, bribe.maxClaims, bribe.totalClaims, bribe.activeClaims);
		})();
	});
	
}


async function approveTokenSpend(token, amount, bribeType){
	var approveBtnId;
	var depositBtnId;
	var loadingBarId;
	if (bribeType == "validator"){
		approveBtnId = 'approveBSN';
		depositBtnId = 'depositBSN';
		loadingBarId = 'depositLoading';
	}else{
		approveBtnId = 'approveBSNLsdNetwork';
		depositBtnId = 'depositBSNLsdNetwork';
		loadingBarId = 'depositLoadingLsdNetwork';
	}

	var approveBtn = document.getElementById(approveBtnId);
	approveBtn.style = 'display:none;'
	var loadingBar = document.getElementById(loadingBarId);
	loadingBar.style = 'display:;';
	
	await provider.send("eth_requestAccounts", []);
	const signer = provider.getSigner();
	
	
	abi = [{
		"constant": true,
		"inputs": [],
		"name": "decimals",
		"outputs": [
			{
				"name": "",
				"type": "uint8"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}];
	
	const bribeTokenContract = new ethers.Contract(token, abi, signer);
	tokenDecimals = await bribeTokenContract.decimals();
	
	
	abi = [{
		"inputs": [
			{
				"internalType": "address",
				"name": "spender",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "amount",
				"type": "uint256"
			}
		],
		"name": "approve",
		"outputs": [
			{
				"internalType": "bool",
				"name": "",
				"type": "bool"
			}
		],
		"stateMutability": "nonpayable",
		"type": "function"
	}];
	const BribeTokenContract = new ethers.Contract(token, abi, signer);
	var amountDecimal = new Decimal(amount);
	var multiplier = new Decimal(10**tokenDecimals);
	var result = amountDecimal.times(multiplier);
	var resultFixed = result.toFixed();
	
	try {
	  const chainId = await getConnectedNetworkId();
	  var BribeVaultAddress;
	  if(bribeType == "validator") {
		BribeVaultAddress = getNodeRunnerBribeVaultAddress(chainId);
	  }else{
		BribeVaultAddress = getLSDNBribeVaultAddress(chainId);
	  }
	  const approval = await BribeTokenContract.approve(BribeVaultAddress, resultFixed);
	  console.log(approval);
	  const approvalReceipt = await approval.wait();
	  console.log("Transaction successful:", approvalReceipt);
	  M.toast({html: 'Token Approval succeeded!', displayLength:10000, classes: 'rounded green', });
	  approveBtn = document.getElementById(approveBtnId);
	  approveBtn.style = 'display:none;'
	  depositBtn = document.getElementById(depositBtnId);
	  depositBtn.style = 'display:;background-color:#00ED76;border-radius: 15px;'
	  loadingBar.style = 'display:none;'
	} catch (error) {
	  approveBtn = document.getElementById(approveBtnId);
	  approveBtn.style = 'display:;';
	  console.log("Transaction failed:", error);
	  M.toast({html: 'Token Approval failed', displayLength:10000, classes: 'rounded red', });
	  loadingBar.style = 'display:none;'
	}
}

async function initiateClaimLSDN(blsKeyVal){
	await provider.send("eth_requestAccounts", []);
	const signer = provider.getSigner();
	
	abi = [{
		"inputs": [
			{
				"internalType": "bytes",
				"name": "validatorBLSKey",
				"type": "bytes"
			}
		],
		"name": "initClaim",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}];
	
	const chainId = await getConnectedNetworkId();
	const BribeVaultAddress = getLSDNBribeVaultAddress(chainId);
	const BribeVaultContract = new ethers.Contract(BribeVaultAddress, abi, signer);
	var initClaimTx = await BribeVaultContract.initClaim(blsKeyVal);
	console.log(initClaimTx);
	
	try {
	  const claimReceipt = await initClaimTx.wait();
	  console.log("Transaction successful:", claimReceipt);
	  M.toast({html: 'Registration succeeded!', displayLength:10000, classes: 'rounded green', });
	} catch (error) {
	  console.log("Transaction failed:", error);
	  M.toast({html: 'Registration failed', displayLength:10000, classes: 'rounded red', });
	}
}

async function withdrawRemainingBribe(blsKeyVal){
	await provider.send("eth_requestAccounts", []);
	const signer = provider.getSigner();
	
	abi = [{
		"inputs": [
			{
				"internalType": "bytes",
				"name": "validatorBLSKey",
				"type": "bytes"
			}
		],
		"name": "withdrawRemainingBribe",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}];
	
	const chainId = await getConnectedNetworkId();
	const BribeVaultAddress = getNodeRunnerBribeVaultAddress(chainId);
	const BribeVaultContract = new ethers.Contract(BribeVaultAddress, abi, signer);
	var depositTx = await BribeVaultContract.withdrawRemainingBSN(blsKeyVal);
	console.log(depositTx);
	
	try {
	  const withdrawalReceipt = await depositTx.wait();
	  console.log("Transaction successful:", withdrawalReceipt);
	  M.toast({html: 'Withdrawal succeeded!', displayLength:10000, classes: 'rounded green', });
	} catch (error) {
	  console.log("Transaction failed:", error);
	  M.toast({html: 'Withdrawal failed', displayLength:10000, classes: 'rounded red', });
	}
}

async function withdrawRemainingBribe_lsm(liquidStakingManager){
	await provider.send("eth_requestAccounts", []);
	const signer = provider.getSigner();
	
	abi = [{
		"inputs": [
			{
				"internalType": "address",
				"name": "liquidStakingManager",
				"type": "address"
			}
		],
		"name": "withdrawRemainingBribe",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}];
	
	const chainId = await getConnectedNetworkId();
	const BribeVaultAddress = getLSDNBribeVaultAddress(chainId);
	const BribeVaultContract = new ethers.Contract(BribeVaultAddress, abi, signer);
	var depositTx = await BribeVaultContract.withdrawRemainingBSN(liquidStakingManager);
	console.log(depositTx);
	
	try {
	  const withdrawalReceipt = await depositTx.wait();
	  console.log("Transaction successful:", withdrawalReceipt);
	  M.toast({html: 'Withdrawal succeeded!', displayLength:10000, classes: 'rounded green', });
	} catch (error) {
	  console.log("Transaction failed:", error);
	  M.toast({html: 'Withdrawal failed', displayLength:10000, classes: 'rounded red', });
	}
}

async function depositBribe(bribeToken, bribeAmountVal, blsKeyValOrValidatorRatio, lsdnTicker, bribeType){ // blsKeyValOrValidatorRatio is either key or int
	const chainId = await getConnectedNetworkId();
	var depositBtnId;
	var loadingBarId;
	var abi;
	var BribeVaultAddress;
	if (bribeType == "validator"){
	  depositBtnId = 'depositBSN';
	  loadingBarId = 'depositLoading';
	  BribeVaultAddress = getNodeRunnerBribeVaultAddress(chainId);
	  abi = [{
		"inputs": [
			{
				"internalType": "address",
				"name": "bribeToken",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "bribeAmount",
				"type": "uint256"
			},
			{
				"internalType": "bytes",
				"name": "validatorBLSKey",
				"type": "bytes"
			}
		],
		"name": "depositBribe",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}];
	}else{
	  depositBtnId = 'depositBSNLsdNetwork';
	  loadingBarId = 'depositLoadingLsdNetwork';
	  BribeVaultAddress = getLSDNBribeVaultAddress(chainId);
	  abi = [{
		"inputs": [
			{
				"internalType": "address",
				"name": "bribeToken",
				"type": "address"
			},
			{
				"internalType": "uint256",
				"name": "bribeAmount",
				"type": "uint256"
			},
			{
				"internalType": "uint256",
				"name": "tokenToValidatorRatio",
				"type": "uint256"
			},
			{
				"internalType": "string",
				"name": "lsdNetwork",
				"type": "string"
			},
			{
				"internalType": "address",
				"name": "liquidStakingManager",
				"type": "address"
			}
		],
		"name": "depositBribe",
		"outputs": [],
		"stateMutability": "nonpayable",
		"type": "function"
	}];
	}
	var depositBtn = document.getElementById(depositBtnId);
	var loadingBar = document.getElementById(loadingBarId);
	
	depositBtn.style = 'display:none;'
	loadingBar.style = 'display:;';
	
	await provider.send("eth_requestAccounts", []);
	const signer = provider.getSigner();
	
	const BribeVaultContract = new ethers.Contract(BribeVaultAddress, abi, signer);
	
	const gasPrice = provider.getGasPrice().then(function(d){
		console.log("Gas price: " + d.toString());
		g = 22500000; // debugging. Successful deposit takes 204k gas
		console.log({gasLimit:g.toString(),gasPrice:d.toString()});
		(async () => {
			try {
				var depositTx;
				if (bribeType=="Validator"){
				  depositTx = await BribeVaultContract.depositBribe(bribeToken, ethers.BigNumber.from(bribeAmountVal.toString()), blsKeyValOrValidatorRatio, {gasLimit: d});
				}else{
				  var liquidStakingManager = await getLiquidStakingManagerByLSDNTicker(lsdnTicker);
				  console.log(liquidStakingManager);
				  // TO-DO: Fix other instances of this
			      if(liquidStakingManager == undefined || liquidStakingManager.data.liquidStakingNetworks.length == 0){
					M.toast({html: 'Invalid LSD Network', displayLength:10000, classes: 'rounded red', });
					throw "LiquidStakingManager not found for LSD Network";
				  }
				}
				console.log(depositTx);
				const txReceipt = await depositTx.wait();
				console.log("Transaction successful:", txReceipt);
				M.toast({html: 'Deposit succeeded!', displayLength:10000, classes: 'rounded green', });
				
				depositBtn = document.getElementById(depositBtnId);
				depositBtn.style = 'display:none;'
				loadingBar.style = 'display:none;'
			} catch (error) {
				depositBtn = document.getElementById(depositBtnId);
				depositBtn.style = 'display:;border-radius:15px;'
				console.log("Transaction failed:", error);
				M.toast({html: 'Deposit failed', displayLength:10000, classes: 'rounded red', });
				loadingBar.style = 'display:none;'
			}
		})();
			
		//});
	});
		
	  
}

async function getTokenDecimals(token){
	await provider.send("eth_requestAccounts", []);
	const signer = provider.getSigner();
	abi = [{
		"constant": true,
		"inputs": [],
		"name": "decimals",
		"outputs": [
			{
				"name": "",
				"type": "uint8"
			}
		],
		"payable": false,
		"stateMutability": "view",
		"type": "function"
	}];
	
	const bribeTokenContract = new ethers.Contract(token, abi, signer);
	tokenDecimals = await bribeTokenContract.decimals();
	return tokenDecimals;
}

async function tokenAllowance(token, spender){
	await provider.send("eth_requestAccounts", []);
	const signer = provider.getSigner();
	abi = [{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"}];
	
	//console.log("Checking allowance for token: " + token + " spender: " + spender + " owner: " + signer.getAddress());
	
	const tokenContract = new ethers.Contract(token, abi, signer);
	allowance = await tokenContract.allowance(signer.getAddress(), spender);
	return allowance;
}

document.addEventListener('DOMContentLoaded', function() {
	(async () => {
		var el = document.getElementById('tabs');
		var instance = M.Tabs.init(el);
		
		await getConnectedNetwork();
		await checkConnected();
		await checkBribes();
		
		approveBSNBtn = document.getElementById('approveBSN');
		approveBSNBtn.addEventListener('click',function(d){
			var tokenAmount = document.getElementById('tokenAmountDepositTotal');
			var tokenAmountVal = parseFloat(tokenAmount.value);
			
			if(Number.isFinite(tokenAmountVal)){
				var bribeToken = document.getElementById('bribeTokenSelect');
			
				//if(bribeToken.value=="custom"){
				//	bribeToken = document.getElementById('customBribeToken');
				//}
				
				console.log("Checking token allowance...");
				
				(async () => {
					const chainId = await getConnectedNetworkId();
					const BribeVaultAddress = getNodeRunnerBribeVaultAddress(chainId);
					
					tokenAllowance(bribeToken.value, BribeVaultAddress).then(function(allowance){
					
						if(allowance >= tokenAmountVal){
							console.log("Allowance already exists");
							M.toast({html: 'Token allowance already exists', displayLength:10000, classes: 'rounded blue white-text', });
							approveBtn = document.getElementById('approveBSN');
							approveBtn.style = 'display:none;'
							depositBtn = document.getElementById('depositBSN');
							depositBtn.style = 'display:;background-color:#00ED76;border-radius: 15px;'
							var loadingBar = document.getElementById('depositLoading');
							loadingBar.style = 'display:none;'
						}else{
							console.log("Approving token spend...");
							approveTokenSpend(bribeToken.value,tokenAmountVal, "validator");
						}
					
					});
				})();
			}else{
				 M.toast({html: 'Invalid token amount', displayLength:10000, classes: 'rounded red', });
			}
		});

		approveBSNLSDBtn = document.getElementById('approveBSNLsdNetwork');
		approveBSNLSDBtn.addEventListener('click',function(d){
			var tokenAmount = document.getElementById('tokenAmountDepositTotalLsdNetwork');
			var tokenAmountVal = parseFloat(tokenAmount.value);
			
			if(Number.isFinite(tokenAmountVal)){
				var bribeToken = document.getElementById('bribeTokenSelectLsdNetwork');
			
				//if(bribeToken.value=="custom"){
				//	bribeToken = document.getElementById('customBribeToken');
				//}
				
				console.log("Checking token allowance...");
				
				(async () => {
					const chainId = await getConnectedNetworkId();
					const BribeVaultAddress = getLSDNBribeVaultAddress(chainId);
					
					tokenAllowance(bribeToken.value, BribeVaultAddress).then(function(allowance){
					
						if(allowance >= tokenAmountVal){
							console.log("Allowance already exists");
							M.toast({html: 'Token allowance already exists', displayLength:10000, classes: 'rounded blue white-text', });
							approveBtn = document.getElementById('approveBSNLsdNetwork');
							approveBtn.style = 'display:none;'
							depositBtn = document.getElementById('depositBSNLsdNetwork');
							depositBtn.style = 'display:;background-color:#00ED76;border-radius: 15px;'
							var loadingBar = document.getElementById('depositLoadingLsdNetwork');
							loadingBar.style = 'display:none;'
						}else{
							console.log("Approving token spend...");
							approveTokenSpend(bribeToken.value,tokenAmountVal, "lsdn");
						}
					
					});
				})();
			}else{
				 M.toast({html: 'Invalid token amount', displayLength:10000, classes: 'rounded red', });
			}
		});
		
		tokenPerEth = document.getElementById('tokenAmountDeposit');
		tokenPerEth.addEventListener('input',function(d){
			if(this.value.includes('.') || this.value.includes('-')){
				this.value = this.value.replace('-','');
			}
			if(this.value == undefined){
				this.value = 0;
			}
			totalTokenValue = document.getElementById('tokenAmountDepositTotal');
			totalTokenValue.value = new Decimal(parseFloat(this.value)) * parseFloat(28);
		});
		
		withdrawBSNBtn = document.getElementById('withdrawConfirmBtn');
		withdrawBSNBtn.addEventListener('click',function(d){
			(async () => {
				console.log("Withdrawing remaining BSN...");
				var withdrawalType = document.getElementById('withdrawType');
				if(withdrawalType == "validator"){
					var blsKey = document.getElementById('withdrawBLSorNetwork');
					var blsKeyVal = blsKey.value;
					await withdrawRemainingBribe(blsKeyVal);
				}else{
					var networkTicker = document.getElementById('withdrawBLSorNetwork');
					var lsdnVal = networkTicker.value;
					var liquidStakingManager = await getLiquidStakingManagerByLSDNTicker(lsdnVal);
					
					console.log("LSM for LSDN: " + lsdnVal + ": " + liquidStakingManager.data.liquidStakingNetworks.liquidStakingManager);
					await withdrawRemainingBribe_lsm(liquidStakingManager.data.liquidStakingNetworks.liquidStakingManager);
				}
			})();
		});
		
		depositBSNBtn = document.getElementById('depositBSN');
		depositBSNBtn.addEventListener('click',function(d){
			console.log("Depositing BSN...");
			
			var tokenAmount = document.getElementById('tokenAmountDepositTotal');
			var blsKey = document.getElementById('validatorBLSDeposit');
			var bribeToken = document.getElementById('bribeTokenSelect');
			
			if(bribeToken.value=="custom"){
				bribeToken = document.getElementById('customBribeToken');
			}
			(async () => {
				tokenDecimals = await getTokenDecimals(bribeToken.value);
				console.log("Token decimals: " + tokenDecimals.toString());
			
				var tokenAmountVal = parseFloat(tokenAmount.value);
				var blsKeyVal = blsKey.value;
				var bribeTokenVal = bribeToken.value;
				
				var amountDecimal = new Decimal(tokenAmountVal);
				console.log("Token amount dec: " + amountDecimal.toString());
				
				var multiplier = new Decimal(10**tokenDecimals);
				var resultAmt = amountDecimal.times(multiplier);
				var resultAmtFixed = Math.round(resultAmt.toFixed());
				
				console.log("Token amount res: " + resultAmt.toString());
				console.log("Token amount res fix: " + resultAmtFixed.toString());
				//(async () => {
				depositBribe(bribeTokenVal, resultAmtFixed, blsKeyVal, "", "validator"); // depositBribe(bribeToken, bribeAmountVal, blsKeyValOrValidatorRatio, lsdnTicker, bribeType)
			})();
			
			//});
		});
		
		depositBSNLSDBtn = document.getElementById('depositBSNLsdNetwork');
		depositBSNLSDBtn.addEventListener('click',function(d){
			console.log("Depositing BSN...");
			
			var tokenAmount = document.getElementById('tokenAmountDepositTotalLsdNetwork');
			var lsdnTicker = document.getElementById('lsdNetworkTickerDeposit');
			var bribeToken = document.getElementById('bribeTokenSelectLsdNetwork');
			var tokensPerValidator = document.getElementById('tokenAmountDepositLsdNetwork');
			
			if(bribeToken.value=="custom"){
				bribeToken = document.getElementById('customBribeToken');
			}
			(async () => {
				tokenDecimals = await getTokenDecimals(bribeToken.value);
				console.log("Token decimals: " + tokenDecimals.toString());
			
				var tokenAmountVal = parseFloat(tokenAmount.value);
				var tokensPerValidatorVal = parseFloat(tokensPerValidator.value);
				var lsdnTickerVal = lsdnTicker.value;
				var bribeTokenVal = bribeToken.value;
				
				var amountDecimal = BigInt(tokenAmountVal);
				var amountPerValDecimal = BigInt(tokensPerValidatorVal);
				console.log("Token amount dec: " + amountDecimal.toString());
				
				var multiplier = new Decimal(10**tokenDecimals);
				var resultAmt = amountDecimal * BigInt(multiplier);
				//var resultAmtFixed = Math.round(resultAmt.toFixed());

				var resultAmtPerVal = amountPerValDecimal * BigInt(multiplier);
				//var resultAmtFixedPerVal = Math.round(resultAmtPerVal.toFixed());
				
				console.log("Token amount res: " + resultAmt.toString());
				console.log("Token amount per val: " + resultAmtPerVal.toString());
				//(async () => {
				depositBribe(bribeTokenVal, resultAmt.toString(), resultAmtPerVal.toString(), lsdnTickerVal, "lsdn"); // depositBribe(bribeToken, bribeAmountVal, blsKeyValOrValidatorRatio, lsdnTicker, bribeType)
			})();
			
			//});
		});

	})();
});

async function switchNetwork(chainId) {
      console.log("Switching to " + chainId)
      try{
        chainIdHex = chainId.toString(16);
        console.log("Switching to 0x" + chainIdHex)
        await window.ethereum.request({
        	method: 'wallet_switchEthereumChain',
        	params: [{ chainId: '0x'+chainIdHex }],
      });
	  return true;
   }catch(error){
	   return false;
   }
}

bribeTokensGoerli = {"BSN":"0x359599d4032D6540F3bE62E459861f742Ceb851f",
			         "dETH":"0x506C2B850D519065a4005b04b9ceed946A64CB6F",
			         "sETH":"0x14Ab8194a1cB89D941cc5159873aFDaC3C45094d",
			         "WETH":"0xB4FBF271143F4FBf7B91A5ded31805e42b2208d6",
			         "USDC":"0x15fB74F4d828C85a1b71Ac1A83f31E1D2B8Beb73"
					} 

bribeTokensMainnet = {"BSN":"0x534D1F5E617e0f72A6b06a04Aa599839AF776A5e",
			         "dETH":"0x3d1e5cf16077f349e999d6b21a4f646e83cd90c5",
			         "WETH":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
			         "USDC":"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"
					} 

async function updateTokenSelectAddresses(chainId){
	var tokenSelect = document.getElementById("bribeTokenSelect");

	while (tokenSelect.firstChild) {
		tokenSelect.removeChild(tokenSelect.firstChild);
	}

	tokenList = {}
	if(chainId==1){ // Mainnet
		tokenList = bribeTokensMainnet;
	}else if (chainId==5){ // Goerli
		tokenList = bribeTokensGoerli;
	}else{
		tokenList = {}
	}

	for(token in tokenList){
		var newOption = document.createElement("option");
		newOption.value = tokenList[token];
		newOption.text = token;
		tokenSelect.appendChild(newOption);
	}

	var elems = document.querySelectorAll('select');
	var instances = M.FormSelect.init(elems, undefined);
}

// Change network dropdown
network.addEventListener('change', async(e) => {
  e.preventDefault();
  (async () => {
	currentNetwork = await getConnectedNetworkId();
    // the following 2 lines revert the choice, because the dropdown shouldn't be updated until the user actully switches chains
	selectedNetwork = network.value
	network.value = currentNetwork 
	M.FormSelect.init(network, undefined);
	if (selectedNetwork != currentNetwork)
	{
		success = await switchNetwork(selectedNetwork);
		if (success){
			currentNetwork = selectedNetwork; // only set this once the chain is switched
			network.value = currentNetwork 
			M.FormSelect.init(network, undefined);
			console.log("Checking bribes");
			await checkBribes();
			await updateTokenSelectAddresses(selectedNetwork);
			
		}
	}
	
	})();
  
})

// Connect Wallet button
connectWallet.addEventListener('click', async(e) => {
  e.preventDefault();
	(async () => {
		await provider.send("eth_requestAccounts", []);
		const signer = provider.getSigner();

		walletAddr.innerHTML = await compactAddress(await signer.getAddress());
		connectWallet.setAttribute('disabled','disabled');
		connectWallet.innerHTML = 'Connected';
		accountDisplay.style.visibility = "visible";
		
		await getConnectedNetwork();
	})();
})

