import { useEffect, useState, createContext } from "react";
import { useRouter } from "next/router";
import { ethers } from "ethers";
import { ContractABI, ContractAddress } from "./constants";
import { useToast } from "@chakra-ui/react";

export const StakerContext = createContext();

export const StakerProvider = ({ children }) => {
  // general
  const [provider, setProvider] = useState(undefined)
  const [signer, setSigner] = useState(undefined)
  const [signerAddress, setSignerAddress] = useState(undefined)

  // assets
  const [assetIds, setAssetIds] = useState([])

  // staking
  const [amount, setAmount] = useState(0)

  // helpers
  const toWei = ether => ethers.utils.parseEther(ether)
  const toEther = wei => ethers.utils.formatEther(wei)

  const [contract, setContract] = useState(null);
  const [assets, setAssets] = useState(null);
  const [loading, setLoading] = useState(false);
  const toast = useToast();
  const router = useRouter();

  useEffect(() => {
    const onLoad = async () => {
      const provider = await new ethers.providers.Web3Provider(window.ethereum)
      setProvider(provider)

      const contract = await new ethers.Contract(
        ContractAddress,
        ContractABI
      )
      setContract(contract)
    }
    onLoad()
  }, [])

  const isConnected = () => signer !== undefined

  const getSigner = async () => {
    provider.send("eth_requestAccounts", [])
    const signer = provider.getSigner()
    return signer
  }

  const getAssetIds = async (address, signer) => {
    const assetIds = await contract.connect(signer).getPositionIdsForAddress(address)
    return assetIds
  }

  const calcDaysRemaining = (unlockDate) => {
    const timeNow = Date.now() / 1000
    const secondsRemaining = unlockDate - timeNow
    return Math.max( (secondsRemaining / 60 / 60 / 24).toFixed(0), 0)
  }

  const getAssets = async (ids, signer) => {
    const queriedAssets = await Promise.all(
      ids.map(id => contract.connect(signer).getPositionById(id))
    )

    queriedAssets.map(async asset => {
      const parsedAsset = {
        positionId: asset.positionId,
        percentInterest: Number(asset.percentInterest) / 100,
        daysRemaining: calcDaysRemaining( Number(asset.unlockDate) ),
        etherInterest: toEther(asset.weiInterest),
        etherStaked: toEther(asset.weiStaked),
        open: asset.open,
      }

      setAssets(prev => [...prev, parsedAsset])
    })
  }

  const connectAndLoad = async () => {
    const signer = await getSigner(provider)
    setSigner(signer)

    const signerAddress = await signer.getAddress()
    setSignerAddress(signerAddress)

    const assetIds = await getAssetIds(signerAddress, signer)
    setAssetIds(assetIds)

    getAssets(assetIds, signer)
  }

  const stakeEther = async (stakingLength) => {
    if(!stakeValue && !account) return;
    try{
      setLoading(true)
      const wei = toWei(amount)
      const data = { value: wei }
      await contract.connect(signer).stakeEther(stakingLength, data)
      setLoading(false)
      toast({
        position: "top-left",
        title: "Stake AE Tokens",
        description: `${amount} AE has been staked successfully `,
        status: "success",
        duration: 9000,
        isClosable: true,
      });
    }catch(error){
      console.log(error);
      toast({
        position: "top-left",
        title: "Stake AE ERROR",
        description: "Something went wrong",
        status: "error",
        duration: 9000,
        isClosable: true,
      });
    }
  }

  const withdraw = positionId => {
    contract.connect(signer).closePosition(positionId)
  }
 

  const payDebt = async (addrs, value) => {
    try {
      await contract.connect(signer).payBorrowedFund(addrs, { value })
      toast({
        position: "top-left",
        title: "Pay Debt",
        description: "Your debts have been paid successfully",
        status: "success",
        duration: 9000,
        isClosable: true,
      });
      router.push('/')
    }catch(error){
      console.log(error)
      toast({
        position: "top-left",
        title: "Pay Debt",
        description: "Address owner is not a debtor",
        status: "warning",
        duration: 9000,
        isClosable: true,
      });
    }
  }

  

  return (
    <StakerContext.Provider
      value={{
        setAmount,
        signerAddress,
        assets,
        loading,
        isConnected,
        connectAndLoad,
        stakeEther,
        withdraw,
        payDebt
      }}
    >
      {children}
    </StakerContext.Provider>
  )
}
