const ethers = require('ethers');
require("dotenv").config();
const axios = require('axios');
const erc20Abi = require('./ABI/erc20.json');
const pancakeAbi = require('./ABI/pancake.json');
const factoryAbi = require('./ABI/factory.json');
const farmAbi = require('./ABI/farm.json');
const stakingAbi = require('./ABI/staking.json');

const rpcUrl = 'https://proxy.devnet.neonlabs.org/solana';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const config = {
    WNEON: '0xf8ad328e98f85fccbf09e43b16dcbbda7e84beab',
    MORA: '0x972f3fe7cd7f10ae8d27aac17f0938ea4773b149',
    ROUTER: '0x53172f5cf9fb7d7123a2521a26ec8db2707045e2',
    FACTORY: '0xBD9EbFe0E6e909E56f1Fd3346D0118B7Db49Ca15',
    NEON_MORA_FARM: '0x28e1e4d8a75f852b9ca6a13350708b425f74c313',
    STAKING: '0xbc22a1304213b1a11eed3c5d116908575939bc4b',
    slippage: 10
}

async function getFaucet(address) {
    return new Promise(resolve => {
        axios.post('https://neonswap.live/neonswap.live/request_airdrop', {
            amount: 1000,
            wallet: address
        }).then(res => {
            console.log(`${wallet.address}: Received 1000 NEON from the faucet!`);
            resolve(true);
        }).catch(err => {
            resolve(false);
        })
    })

}

function getTokenBalance(tokenContractAddress, address) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(tokenContractAddress, erc20Abi, provider);
        let balance = await contract.balanceOf(address);
        let decimals = await contract.decimals();
        resolve(ethers.utils.formatUnits(balance, decimals))
    })

}

function hasApproved(tokenAddress, myAddress, spender) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
        let isApproved = await contract.allowance(myAddress, spender);
        resolve(isApproved > 0 ? true : false);
    });
}

function approve(wallet, tokenAddress, spender) {
    return new Promise(async (resolve) => {
        console.log(`${wallet.address} is going to approve ${spender} to spend your token`);
        let maxAmount = "999999999000000000000000000";
        const contract = new ethers.Contract(tokenAddress, erc20Abi, provider);
        const signer = contract.connect(wallet);
        signer.approve(spender, maxAmount, {
            gasPrice: await provider.getGasPrice(),
            gasLimit: 5000000,
            value: ethers.utils.parseEther("0")
        }).then(async (result) => {
            await result.wait();
            console.log(`${wallet.address} approved ${spender} to spend your token`);
            resolve(true);
        }).catch(err => {
            console.log("Approve error: " + err.reason);
            resolve(false)
        });
    });
}

function getLp(tokenA, tokenB) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(config.FACTORY, factoryAbi, provider);
        let lp = await contract.getPair(tokenA, tokenB);
        resolve(lp);
    });
}

function getPendingFarmingRewards(pid, address) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(config.NEON_MORA_FARM, farmAbi, provider);
        let rewards = await contract.pendingReward(pid, address);
        resolve(rewards.pendingMora / 1e18);
    });
}

function addLiquidity(wallet, amountIn, token, path) {
    return new Promise(async (resolve) => {
        let isApproved = await hasApproved(config.MORA, wallet.address, config.ROUTER);
        if (!isApproved) {
            await approve(wallet, config.MORA, config.ROUTER);
        }
        const contract = new ethers.Contract(config.ROUTER, pancakeAbi, provider);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        const amounts = await contract.getAmountsOut(ethers.utils.parseEther(amountIn), path);
        const amountTokenDesired = amounts[1];
        const amountETHMin = ethers.utils.parseEther("" + Number(amountIn) * (100 - config.slippage) / 100);
        const tokenAmounts = await contract.getAmountsOut(amountETHMin, path);
        const amountTokenMin = tokenAmounts[1].sub(tokenAmounts[1].mul(config.slippage).div(100));

        console.log(`${wallet.address} is going to add liquidity..`);
        const gasPrice = await provider.getGasPrice();
        const signer = contract.connect(wallet);
        signer.addLiquidityETH(token, amountTokenDesired, amountTokenMin, amountETHMin, wallet.address, deadline, {
            gasPrice: gasPrice,
            gasLimit: 5000000,
            value: ethers.utils.parseEther(amountIn)
        }).then(async (res) => {
            await res.wait();
            console.log(`${wallet.address} added liquidity successfully`);
            resolve(true);
        }).catch(err => {
            resolve(false);
        });

    })
}

function swapEthToToken(wallet, amountIn, path) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(config.ROUTER, pancakeAbi, provider);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        const amounts = await contract.getAmountsOut(ethers.utils.parseEther(amountIn), path);
        const amountOutMin = amounts[1].sub(amounts[1].mul(config.slippage).div(100));
        console.log(`${wallet.address} is going to swap ${amountIn} NEON for ${amountOutMin / 1e18} MORA`);
        const gasPrice = await provider.getGasPrice();
        const signer = contract.connect(wallet);
        signer.swapExactETHForTokens(amountOutMin, path, wallet.address, deadline, {
            gasPrice: gasPrice,
            gasLimit: 5000000,
            value: ethers.utils.parseEther(amountIn)
        }).then(async (res) => {
            await res.wait();
            console.log(`${wallet.address} swap successfully`);
            resolve(true);
        }).catch(err => {
            console.log(err.reason);
            resolve(false);
        });

    })
}


function deposit(wallet, pid, amount) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(config.NEON_MORA_FARM, farmAbi, provider);
        if (amount > 0) {
            console.log(`${wallet.address} is going to start farming...`);
        } else {
            console.log(`${wallet.address} is going to harvest...`)
        }

        const gasPrice = await provider.getGasPrice();
        const signer = contract.connect(wallet);
        signer.deposit(pid, ethers.utils.parseEther("" + amount), {
            gasPrice: gasPrice,
            gasLimit: 5000000,
            value: ethers.utils.parseEther("0")
        }).then(async (res) => {
            await res.wait();
            if (amount > 0) {
                console.log(`${wallet.address} added to pool successfully`);
            } else {
                console.log(`${wallet.address} harvest successfully`);
            }
            resolve(true);
        }).catch(err => {
            console.log(err.reason);
            resolve(false);
        });

    })
}


function stake(wallet, amount) {
    return new Promise(async (resolve) => {
        let isApproved = await hasApproved(config.MORA, wallet.address, config.STAKING);
        if (!isApproved) {
            await approve(wallet, config.MORA, config.STAKING);
        }
        const contract = new ethers.Contract(config.STAKING, stakingAbi, provider);
        console.log(`${wallet.address} is going to stake...`);
        const gasPrice = await provider.getGasPrice();
        const signer = contract.connect(wallet);
        signer.enter(ethers.utils.parseEther("" + amount), {
            gasPrice: gasPrice,
            gasLimit: 5000000,
            value: ethers.utils.parseEther("0")
        }).then(async (res) => {
            await res.wait();
            console.log(`${wallet.address} staked successfully`);
            resolve(true);
        }).catch(err => {
            console.log(err.reason);
            resolve(false);
        });

    })
}

function unstake(wallet, amount) {
    return new Promise(async (resolve) => {
        let isApproved = await hasApproved(config.MORA, wallet.address, config.STAKING);
        if (!isApproved) {
            await approve(wallet, config.MORA, config.STAKING);
        }
        const contract = new ethers.Contract(config.STAKING, stakingAbi, provider);
        console.log(`${wallet.address} is going to unstake...`);
        const gasPrice = await provider.getGasPrice();
        const signer = contract.connect(wallet);
        signer.leave(ethers.utils.parseEther("" + amount), {
            gasPrice: gasPrice,
            gasLimit: 5000000,
            value: ethers.utils.parseEther("0")
        }).then(async (res) => {
            await res.wait();
            console.log(`${wallet.address} unstaked successfully`);
            resolve(true);
        }).catch(err => {
            console.log(err.reason);
            resolve(false);
        });

    })
}
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function start(privateKey) {
    const wallet = new ethers.Wallet(privateKey, provider);
    await getFaucet(wallet.address);
    let balance = await provider.getBalance(wallet.address) / 1e18;
    while(balance<1000){
        await getFaucet(wallet.address);
        await sleep(10000);
        balance = await provider.getBalance(wallet.address) / 1e18;
    }
    if (balance >= 1000) {
        //Swap NEON for MORA
        await swapEthToToken(wallet, ""+balance*0.49, [config.WNEON, config.MORA]);
        // //Add liquidity
        await addLiquidity(wallet, ""+balance*0.49, config.MORA, [config.WNEON, config.MORA]);
    }
    //Find NEON MORA LP contract address
    let NEON_MORA_LP = await getLp(config.WNEON, config.MORA);
    //Farming
    let isApproved = await hasApproved(NEON_MORA_LP, wallet.address, config.NEON_MORA_FARM);
    if (!isApproved) {
        await approve(wallet, NEON_MORA_LP, config.NEON_MORA_FARM);
    }
    let lpBalance = await getTokenBalance(NEON_MORA_LP, wallet.address);
    if (lpBalance > 0) {
        await deposit(wallet, 0, lpBalance);
    }
    //Check pending rewards
    let pendingRewards = await getPendingFarmingRewards(0, wallet.address);
    if (pendingRewards > 1) {
        await deposit(wallet, 0, 0);
    }
    let moraBalance = await getTokenBalance(config.MORA, wallet.address);

    if (moraBalance > 0) {
        //stake MORA
        await stake(wallet, moraBalance);
    }
    let stakedMora = await getTokenBalance(config.STAKING, wallet.address);
    if (stakedMora > 0) {
        //unstake MORA
        await unstake(wallet, stakedMora);
    }
}

let keys = process.env.TEST_PRIVATE_KEY.split(",");
for(let key of keys){
    start(key)
}
