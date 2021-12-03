
var FlightSuretyApp = artifacts.require("FlightSuretyApp");
var FlightSuretyData = artifacts.require("FlightSuretyData");
var BigNumber = require('bignumber.js');

var Config = async function(accounts) {
    
    // These test addresses are useful when you need to add
    // multiple users in test scripts
    let testAddresses = [
        "0xF8a3217dEF17480C064f1330855583caF430a8Fa",
        "0xe1f0F64607690F112225CA8832e0E4dD12d5c44a",
        "0x6ba12A82ed01c6BD9d3A06Cd976B7DBad7b6533e",
        "0xCadd48f12fa6C3f0A029fb3c69898C2704478Afa",
        "0x506fbf3B6b3C983EEF14c1122B9358Ead1063EF3",
        "0x7e5Db54Bfe85f25776604521dB8074E21cfE71fD",
        "0x6a76Dc7f26b613da36B871B04591fe86ab4c5C14",
        "0xD63D64EA40629ac4bDeA6ABF9872608dC38DcA59",
        "0xA3dd38bECd2AF94aD5cD84899EbCCb85cbFB4050",
        "0x20E8c45C8eaCB0F241BBC5f88d6B0aE11774E23B"
    ];


    let owner = accounts[0];
    let firstAirline = accounts[1];
    let firstPassenger = accounts[9];

    let flightSuretyData = await FlightSuretyData.new();
    let flightSuretyApp = await FlightSuretyApp.new(flightSuretyData.address);

    
    return {
        owner: owner,
        firstAirline: firstAirline,
        firstPassenger: firstPassenger,
        weiMultiple: (new BigNumber(10)).pow(18),
        testAddresses: testAddresses,
        flightSuretyData: flightSuretyData,
        flightSuretyApp: flightSuretyApp
    }
}

module.exports = {
    Config: Config
};