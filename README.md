# Liquid-Staking-Bribes
ERC-20 token bribes for LSD Network Owners and Node Runners of Blockswap's Stakehouse liquid-staking derivatives platform.

# How does it work
Node Runners may deposit ERC-20 tokens into the Bribe Vault to incentivize stakers to fund the Node Runner's validators via Fren Delegation.

LSD Network owners may deposit ERC-20 tokens into the Bribe Vault to incentivize Node Runners to join their network.

The Bribe Vault contracts use various Stakehouse contracts to determine which wallets may claim, how much, etc.

# Prerequisites

- **Browserify**
```
npm install -g browserify
```

- **Recover npm packages from packages.json**
```
npm install
```

or

```
yarn install
```

# Setup and installation
The bribe marketplace dApp is written in Javascript and runs on a Node.js server.

- 1: **Compile Javascript with browserify and esmify**
```
browserify index.js -p esmify > bundle.js
```

# Deployment
The bribe vaults may be deployed via Remix IDE.

## Mainnet


| Contract    | Address     |
| ----------- | ----------- |
| NodeRunnerBribeVault        | 0x49af554ca2726828be938d2ea3229b1c47f471bf  |
| LSDNetworkownerBribeVault   | 0xd3dfee51c18d09cd2efd1481295df85758280144  |

## Goerli

*Goerli testnet contract deployments are subject to change:*

| Contract    | Address     |
| ----------- | ----------- |
| NodeRunnerBribeVault        | 0xd7BB3Ee6Cbec711c7D11864eF0A89A041ed65D69  |
| LSDNetworkownerBribeVault   | 0x863302E8964029DF39c037C49308E5beEaC1F7c7  |
