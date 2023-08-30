// Author: Jonathan Scott
// Date: 8/29/2023
//
// Description: Converting Hexadecimal ETH balance to USD.
// I use it mainly for deployer balance checks, monitoring, and historical records
// Basically anytime you are doing a lookup for a specific wallet address the timestamp,weiBalance,etherBalance,usdBalance output are all stored, and you will be able to see the historical record in json format
//
// Dependencies: app.infura.io API Key for sending requests
//
// How to run this
// node eth_deployer_history.js

const fetch = require('node-fetch');
const readline = require('readline');
const fs = require('fs');

const historicalDataFile = 'historical_data.json';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

let address;
const infuraApiKey = 'YOUR_API_KEY'; // Replace with your Infura API key

async function getEthBalance() {
  const response = await fetch(`https://mainnet.infura.io/v3/${infuraApiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_getBalance',
      params: [address, 'latest'],
      id: 1,
    }),
  });

  const responseData = await response.json();
  if (responseData.error) {
    throw new Error(responseData.error.message);
  }

  return responseData.result;
}

// Checking coingecko to get the latest real-time price of Wei
// Just like a penny is the smallest unit for the dollar
// Wei is the smallest unit of Ether (ETH)
// 1 Ether (ETH) is equivalent to 1 quintillion (10^18) Wei - This is a constant
// The price of 1 Wei in USD depends on the price of ETH so this is why we need to do a live lookup

async function getEthToUsdPrice() {
  const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd`);
  const responseData = await response.json();
  return responseData.ethereum.usd;
}

async function convertWeiToUsd(weiBalance, etherToUsdPrice) {
  const weiBalanceNumber = parseInt(weiBalance, 16);
  const etherBalance = weiBalanceNumber / 1e18; // Convert to Ether
  const usdBalance = etherBalance * etherToUsdPrice;
  return usdBalance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','); // just beautifying the output
}

async function main() {
  rl.question('Enter an Ethereum address: ', async (inputAddress) => {
    if (!/^0x[a-fA-F0-9]{40}$/.test(inputAddress)) {
      console.error('Invalid Ethereum address.');
      rl.close();
      return;
    }

    address = inputAddress;

    try {
      const weiBalance = await getEthBalance();
      const etherToUsdPrice = await getEthToUsdPrice();
      const usdBalance = await convertWeiToUsd(weiBalance, etherToUsdPrice);
      const etherBalance = (parseInt(weiBalance, 16) / 1e18).toFixed(8);

      const historicalData = loadHistoricalData();
      const timestamp = new Date().toISOString();
      const entry = {
        timestamp,
        weiBalance,
        etherBalance,
        usdBalance,
      };

      if (!historicalData[address]) {
        historicalData[address] = [];
      }
      historicalData[address].push(entry);

      saveHistoricalData(historicalData);

      console.log(`Ethereum Balance: ${weiBalance} Hexadecimal Wei`);
      console.log(`Ethereum Balance in ETH: ${etherBalance} ETH`);
      console.log(`Ethereum Balance in USD: $${usdBalance}`);

      console.log('\nHistorical Data for Address:');
      console.log(historicalData);

    } catch (error) {
      console.error('An error occurred:', error);
    }

    rl.close();
  });
}

function loadHistoricalData() {
  try {
    const data = fs.readFileSync(historicalDataFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

function saveHistoricalData(data) {
  fs.writeFileSync(historicalDataFile, JSON.stringify(data, null, 2), 'utf8');
}

main();
