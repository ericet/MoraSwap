# MoraSwap
MoraSwap是Solana EVM链NEON上的DEX，目前还在测试网测试：https://moraswap.com/

由于是基于Uniswap的Fork，所以功能基本和Uniswap差不多: 交易，提供流动，Farm，质押

这个脚本会自动帮你领水，交易，提供流动，Farm，质押和解除质押，走一遍MoraSwap的所有功能

---
Windows:
* nodejs: https://nodejs.org/en/
* git bash: https://git-scm.com/downloads

OR

Ubuntu:
* sudo apt update
* sudo apt install nodejs


## 设置
* git clone https://github.com/ericet/MoraSwap.git
* cd MoraSwap
* npm install
* 文件改名
  * mv .env.example .env
* 把私钥放在.env 文件里面的KEYS后面。比如：TEST_PRIVATE_KEY=000000000,011111111,0222222222
## 运行程序
* `node MoraSwap.js`

---

如果你觉得脚本帮助到你，可以捐献一点心意。钱包地址：**0x434DCffCF7dABd48B284860C27ebd184C91341F5**, 各链通用. 谢谢！

微信:
![b74e66a47e67b5b469bf896889f436d](https://user-images.githubusercontent.com/9066755/161464878-27fd65c0-ecc6-4e77-ae50-0cd166a07bac.jpg)

---
