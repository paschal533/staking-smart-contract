async function main() {
    [signer1, signer2] = await ethers.getSigners();

    Staking = await ethers.getContractFactory('Staking', signer1);

    staking = await Staking.deploy({
       // value: ethers.utils.parseEther('0.003')
    });

    console.log("Staking contract deployed to:", staking.address, "by", signer1.address)
     
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    })