import { ethers } from "ethers";
import fs from "fs";
import path from "path";
import solc from "solc";
import dotenv from "dotenv";
import axios from "axios"; // <-- pakai axios
dotenv.config();

const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

async function compileContract() {
  const contractPath = path.resolve("./contract/GM.sol");
  const source = fs.readFileSync(contractPath, "utf8");
  const input = {
    language: "Solidity",
    sources: { "GM.sol": { content: source } },
    settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const contractFile = output.contracts["GM.sol"]["GM"];
  return { abi: contractFile.abi, bytecode: contractFile.evm.bytecode.object };
}

async function getEthPriceUSD() {
  try {
    const url =
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd";
    const { data } = await axios.get(url, { timeout: 8000 });
    return data.ethereum.usd; // contoh: 2300.15
  } catch (err) {
    console.error("❌ Gagal ambil harga ETH:", err.message);
    return null;
  }
}

async function deployGM() {
  const { abi, bytecode } = await compileContract();
  const factory = new ethers.ContractFactory(abi, bytecode, wallet);

  // -------- SIMULASI --------
  const deployTx = factory.getDeployTransaction();
  const gasEstimate = await provider.estimateGas(deployTx);
  const feeData = await provider.getFeeData();
  const gasPrice = feeData.gasPrice ?? feeData.maxFeePerGas;
  const estimatedCost = gasEstimate * gasPrice; // wei -> BigInt

  const estimatedCostEth = ethers.formatEther(estimatedCost.toString());
  console.log("📊 Estimasi Gas:", gasEstimate.toString());
  console.log("💰 Gas Price (wei):", gasPrice.toString());
  console.log(`💵 Estimasi Biaya: ${estimatedCostEth} ETH`);

  // 💲 estimasi USD
  const ethUsd = await getEthPriceUSD();
  if (ethUsd) {
    const costUsd = parseFloat(estimatedCostEth) * ethUsd;
    console.log(`💲 Estimasi Biaya dalam USD: $${costUsd.toFixed(6)}`);
  }

  // Batas fee
  const maxFee = ethers.parseEther(process.env.MAX_FEE_ETH);
  if (estimatedCost > maxFee) {
    console.log(
      `⛔️ Biaya lebih besar dari batas (${process.env.MAX_FEE_ETH} ETH). Deploy dibatalkan.`
    );
    return;
  }

  // -------- DEPLOY --------
  console.log("🚀 Deploying GM contract...");
  const contract = await factory.deploy({ gasPrice });

  const tx = contract.deploymentTransaction();
  console.log("📡 TX Hash:", tx ? tx.hash : "Tidak tersedia");

  await contract.waitForDeployment();
  console.log("✅ Deployed at:", await contract.getAddress());
}

deployGM().catch(console.error);
