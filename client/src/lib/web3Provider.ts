import { ethers } from 'ethers';

class Web3Provider {
  provider: ethers.BrowserProvider | null = null;
  signer: ethers.Signer | null = null;
  address: string | null = null;
  isConnected: boolean = false;

  async connect() {
    try {
      if (window.ethereum) {
        // Connect to the provider
        this.provider = new ethers.BrowserProvider(window.ethereum);
        
        // Request accounts
        await window.ethereum.request({ method: "eth_requestAccounts" });
        
        // Get signer
        this.signer = await this.provider.getSigner();
        
        // Get address
        this.address = await this.signer.getAddress();
        this.isConnected = true;
        
        return {
          provider: this.provider,
          signer: this.signer,
          address: this.address,
          isConnected: this.isConnected
        };
      } else {
        throw new Error("No Ethereum provider found. Please install MetaMask or another wallet.");
      }
    } catch (error) {
      console.error("Error connecting to wallet:", error);
      throw error;
    }
  }

  async getContract(address: string, abi: any) {
    if (!this.provider || !this.signer) {
      throw new Error("Provider not initialized. Call connect() first.");
    }
    
    return new ethers.Contract(address, abi, this.signer);
  }

  async disconnect() {
    this.provider = null;
    this.signer = null;
    this.address = null;
    this.isConnected = false;
  }
}

// Create a singleton instance
const web3Provider = new Web3Provider();
export default web3Provider;