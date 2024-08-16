import fs from 'fs';
import axios from 'axios';
import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { SingleBar, Presets } from 'cli-progress';
import readline from 'readline';
import chalk from 'chalk';

// Define an array of colors for rotating through
const colors = [
  chalk.red,
  chalk.green,
  chalk.yellow,
  chalk.blue,
  chalk.magenta,
  chalk.cyan,
  chalk.white,
];

// Function to get a color from the array
function getRandomColor() {
  const randomIndex = Math.floor(Math.random() * colors.length);
  return colors[randomIndex];
}

// Function to get the current price of SOL in USD
async function getSolPrice() {
  let retries = 10;
  let delay = 1000; // Initial delay in milliseconds

  while (retries > 0) {
    try {
      const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      return response.data.solana.usd;
    } catch (error) {
      if (error.response && error.response.status === 429) {
        console.warn(`Rate limit exceeded. Retrying in ${delay}ms...`);
        await new Promise(res => setTimeout(res, delay));
        delay *= 2; // Exponential backoff
        retries -= 1;
      } else {
        console.error('Error fetching SOL price:', error.message);
        return 0;
      }
    }
  }
  
  console.error('Failed to fetch SOL price after multiple retries. Exiting.');
  return 0;
}

// Function to delay execution
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Function to display progress
function createProgressBar(total) {
  const progressBar = new SingleBar({
    format: `Progress: {bar} | {percentage}% | {value}/{total} | Estimated Time Remaining: {eta_formatted}`,
    barsize: 30,
    stopOnComplete: true,
  }, Presets.shades_classic);

  progressBar.start(total, 0);
  return progressBar;
}

// Function to clear the terminal screen
function clearScreen() {
  process.stdout.write('\x1Bc');
}

// Function to prompt the user
function promptUser(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer);
    });
  });
}

// Function to display the title
function displayTitle() {
  clearScreen();
  const color = getRandomColor();
  console.log(color('===================================='));
  console.log(color('           Wallet Checker           '));
  console.log(color('====================================\n'));
}

// Main function to check SOL balances and write results to a file
async function checkBalances() {
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const solPrice = await getSolPrice();

  if (solPrice === 0) {
    console.error("Unable to retrieve SOL price. Exiting.");
    return;
  }

  const walletAddresses = fs.readFileSync('wallets.txt', 'utf-8').split('\n').map(address => address.trim());
  const totalWallets = walletAddresses.length;

  const results = [];
  const errorAddresses = [];
  let lowBalanceCount = 0;

  let progressBar = createProgressBar(totalWallets);

  for (const [index, address] of walletAddresses.entries()) {
    if (!address) continue;

    let retries = 10;
    let delayTime = 1000; // Initial delay in milliseconds

    while (retries > 0) {
      try {
        const publicKey = new PublicKey(address);
        const balanceInLamports = await connection.getBalance(publicKey);
        const balanceInSOL = balanceInLamports / LAMPORTS_PER_SOL;
        const totalBalanceInUSD = balanceInSOL * solPrice;

        if (totalBalanceInUSD > 10) {
          results.push({
            address,
            balanceInSOL,
            totalBalanceInUSD
          });
        } else {
          lowBalanceCount++;
        }
        break;
      } catch (error) {
        if (error.response && error.response.status === 429) {
          console.warn(`Rate limit exceeded for address ${address}. Retrying in ${delayTime}ms...`);
          await delay(delayTime);
          delayTime *= 2;
          retries -= 1;
        } else {
          console.error(`Error checking balance for wallet ${address}:`, error.message);
          errorAddresses.push(address);
          break;
        }
      }
    }

    if (retries === 0) {
      console.error(`Failed to check balance for wallet ${address} after multiple retries.`);
      errorAddresses.push(address);
    }

    progressBar.update(index + 1);
    await delay(1000);
  }

  progressBar.stop();

  results.sort((a, b) => b.totalBalanceInUSD - a.totalBalanceInUSD);

  let output = 'Wallet Checker\n\n';

  results.forEach((result, index) => {
    output += `${index + 1}. Wallet Address: ${result.address}\n` +
              `   Balance: ${result.balanceInSOL.toFixed(4)} SOL (~$${result.totalBalanceInUSD.toFixed(2)})\n\n`;
  });

  output += `Total number of wallets with balance less than $10: ${lowBalanceCount}\n`;

  if (errorAddresses.length > 0) {
    output += '\nErrors occurred for the following addresses:\n';
    errorAddresses.forEach((address, index) => {
      output += `   ${index + 1}. ${address}\n`;
    });
  }

  fs.writeFileSync('wallet_balances.txt', output);

  displayTitle(); // Display title before showing summary

  console.log(`Total number of wallets with balance less than $10: ${lowBalanceCount}`);
  console.log(`Total number of wallets with balance greater than $10: ${results.length}`);

  const returnChoice = await promptUser('Enter 0 to return to the main menu or any key to exit: ');
  if (returnChoice === '0') {
    await mainMenu(); // Return to the main menu
  } else {
    console.log('Exiting...');
    process.exit();
  }
}

// Function to check a single wallet address
async function checkSingleWallet() {
  const connection = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
  const solPrice = await getSolPrice();

  if (solPrice === 0) {
    console.error("Unable to retrieve SOL price. Exiting.");
    return;
  }

  while (true) {
    displayTitle();
    const walletAddress = await promptUser('Enter wallet address: ');

    if (walletAddress === '0') {
      return; // Exit the loop and return to the main menu
    }

    try {
      const publicKey = new PublicKey(walletAddress);
      const balanceInLamports = await connection.getBalance(publicKey);
      const balanceInSOL = balanceInLamports / LAMPORTS_PER_SOL;
      const totalBalanceInUSD = balanceInSOL * solPrice;

      console.log(`Wallet Address: ${walletAddress}`);
      console.log(`Balance: ${balanceInSOL.toFixed(4)} SOL (~$${totalBalanceInUSD.toFixed(2)})\n`);
    } catch (error) {
      console.error(`Error checking balance for wallet ${walletAddress}:`, error.message);
    }

    const continueChoice = await promptUser('Enter another wallet address or return to main menu (0): ');
    if (continueChoice === '0') {
      return; // Exit the loop and return to the main menu
    }
  }
}

// Main menu function
async function mainMenu() {
  displayTitle();
  const color = getRandomColor();
  console.log(color('1. Check balance of a specific wallet'));
  console.log(color('2. Check multiple wallets from a file'));
  console.log(color('3. Exit\n'));

  const choice = await promptUser('Enter your choice: ');

  switch (choice) {
    case '1':
      await checkSingleWallet(); // Call the function to check a single wallet
      await mainMenu(); // Return to the main menu after checking balances
      break;

    case '2':
      await checkBalances(); // Check balances for multiple wallets
      break;

    case '3':
      console.log('Exiting...');
      process.exit();
      break;

    default:
      displayTitle();
      console.log(chalk.red('Invalid choice. Please try again.'));
      await mainMenu(); // Return to the main menu on invalid choice
      break;
  }
}

mainMenu();
