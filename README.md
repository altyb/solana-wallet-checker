# Wallet Checker Tool

## Description
A tool to check SOL balances of Solana wallets, display balances in USD, and manage wallet addresses.

## Features
- Check balance of a specific wallet
- Check multiple wallets from a file
- View balances above and below $10
- Progress bar display

## Requirements
- Node.js (v14 or later)
- npm (Node Package Manager)

## Installation
1. Clone the repository:

    ```sh
    git clone https://github.com/altyb/solana-wallet-checker.git
    ```

2. Navigate to the project directory:

    ```sh
    cd solana-wallet-checker
    ```

3. Install the required dependencies:

    ```sh
    npm install
    ```

## Usage
1. To check the balance of a specific wallet, run:

    ```sh
    node index.js
    ```

    Follow the on-screen prompts to enter the wallet address.

2. To check multiple wallets from a file, ensure you have a `wallets.txt` file in the same directory with each wallet address on a new line, then run:

    ```sh
    node index.js
    ```

    Select the option to check multiple wallets from the menu.

## Configuration
- Ensure you have Node.js and npm installed.
- Modify the `wallets.txt` file to include your wallet addresses.

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments
- Solana Web3.js library
- CoinGecko API for SOL price
