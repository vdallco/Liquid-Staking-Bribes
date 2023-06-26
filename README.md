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

*Goerli testnet contract deployments are subject to change:*

| Contract    | Address     |
| ----------- | ----------- |
| NodeRunnerBribeVault        | 0x2d3Ec4Caf621B17105A981FBaED604C1Fe635120  |
| LSDNetworkownerBribeVault   | 0xd4Ee6860a5aFdae5F375E4F8bacD381f75c2ADBA  |

