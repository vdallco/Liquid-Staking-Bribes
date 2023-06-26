# Web3.py tests in Goerli testnet to verify business logic and security of Blockswap Stakehouse Bribe marketplace contracts

## Tests:
# 1. Only a validator's node runner is allowed to deposit and top-up bribes
# 2. Only the bribe token may be topped up (can't add different tokens to existing bribe)
# 3. Stakers cannot claim more than once
# 4. Attempt to re-enter contract
# 5. Attempt int overflow
# 6. Verify onlyOnwer modifier works
# 