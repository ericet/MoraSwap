const ethers = require('ethers');
require("dotenv").config();
const erc20Abi = require('./ABI/erc20.json');
const pancakeAbi = require('./ABI/pancake.json');
const factoryAbi = require('./ABI/factory.json');
const pancakePairAbi = require('./ABI/pancakePair.json');

const rpcUrl = 'https://proxy.devnet.neonlabs.org/solana';
const provider = new ethers.providers.JsonRpcProvider(rpcUrl);
const config = {
    WNEON: '0xf8ad328e98f85fccbf09e43b16dcbbda7e84beab',
    MORA: '0x972f3fe7cd7f10ae8d27aac17f0938ea4773b149',
    ROUTER: '0x53172f5cf9fb7d7123a2521a26ec8db2707045e2',
    FACTORY: '0xBD9EbFe0E6e909E56f1Fd3346D0118B7Db49Ca15',
    slippage: 10
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
            gasLimit: 500000,
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

function swapTokenToBnb(wallet, amountIn, path) {
    return new Promise(async (resolve) => {
        console.log(`${wallet.address} is going to sell tokens`);
        const contract = new ethers.Contract(config.ROUTER, pancakeAbi, provider);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        const amounts = await contract.getAmountsOut(amountIn, path);
        const amountOutMin = amounts[1].sub(amounts[1].mul(config.slippage).div(100));
        const signer = contract.connect(wallet);
        signer.swapExactTokensForETHSupportingFeeOnTransferTokens(amountIn, amountOutMin, path, wallet.address, deadline, {
            gasPrice: await provider.getGasPrice(),
            gasLimit: 500000,
            value: ethers.utils.parseEther("0")
        }).then(async (res) => {
            await res.wait();
            console.log(`${wallet.address} sell tokens successfully`);
            resolve(true);
        }).catch(err => {
            console.log(err.reason);
            resolve(false);
        });

    })
}

function addLiquidity(wallet, amountIn, token,path) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(config.ROUTER, pancakeAbi, provider);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        const amounts = await contract.getAmountsOut(ethers.utils.parseEther(amountIn), path);
        const amountTokenDesired = amounts[1];
        const amountETHMin = ethers.utils.parseEther(""+Number(amountIn)*(100-config.slippage)/100);
        const tokenAmounts = await contract.getAmountsOut(amountETHMin, path);
        const amountTokenMin = tokenAmounts[1].sub(tokenAmounts[1].mul(config.slippage).div(100));
        
        console.log(`${wallet.address} is going to add liquidity..`);
        const gasPrice = await provider.getGasPrice();
        const signer = contract.connect(wallet);
        signer.addLiquidityETH(token, amountTokenDesired, amountTokenMin,amountETHMin,wallet.address, deadline, {
            gasPrice: gasPrice,
            gasLimit: 5000000,
            value: ethers.utils.parseEther(amountIn)
        }).then(async (res) => {
            await res.wait();
            console.log(`${wallet.address} added liquidity successfully`);
            resolve(true);
        }).catch(err => {
            console.log(err);
            resolve(false);
        });

    })
}

function swapBnbToToken(wallet, amountIn, path) {
    return new Promise(async (resolve) => {
        const contract = new ethers.Contract(config.ROUTER, pancakeAbi, provider);
        const deadline = Math.floor(Date.now() / 1000) + 60 * 20;
        const amounts = await contract.getAmountsOut(ethers.utils.parseEther(amountIn), path);
        const amountOutMin = amounts[1].sub(amounts[1].mul(config.slippage).div(100));
        console.log(`${wallet.address} is going to swap ${amountIn} NEON for ${amountOutMin/1e18} MORA`);
        const gasPrice = await provider.getGasPrice();
        const signer = contract.connect(wallet);
        signer.swapExactETHForTokens(amountOutMin, path, wallet.address, deadline, {
            gasPrice: gasPrice,
            gasLimit: 5000000,
            value: ethers.utils.parseEther(amountIn)
        }).then(async (res) => {
            await res.wait();
            console.log(`${wallet.address} buy tokens successfully`);
            resolve(true);
        }).catch(err => {
            console.log(err);
            resolve(false);
        });

    })
}

async function start() {
    const wallet = new ethers.Wallet(process.env.TEST_PRIVATE_KEY, provider);
    let balance = await provider.getBalance(wallet.address)/1e18;  
    // let isApproved = await hasApproved(config.WNEON, wallet.address, config.ROUTER);
    // if (!isApproved) {
    //     await approve(wallet, config.WNEON, config.ROUTER);
    // }
    //Swap NEON for MORA
    // await swapBnbToToken(wallet, "10", [config.WNEON, config.MORA]);

    await addLiquidity(wallet,"10",config.MORA,[config.WNEON, config.MORA]);

    // let lpTokenBalance = await getTokenBalance(config.TUGOU, lp);
    // let myTokenBalance = await getTokenBalance(config.TUGOU, wallet.address);
    // await inflateTokenPrice(wallet, lp, config.TUGOU, ""+(lpTokenBalance-1000)*Math.pow(10,tokenAdecimals));
    // await syncLp(wallet, lp);
    // await swapTokenToBnb(wallet, ""+myTokenBalance*Math.pow(10,tokenAdecimals), [config.TUGOU, config.WBNB])
}

start()