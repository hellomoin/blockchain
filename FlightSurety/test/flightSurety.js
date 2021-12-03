
var Test = require('../config/testConfig.js');
var BigNumber = require('bignumber.js');

contract('Flight Surety Tests', async (accounts) => {
    var config;

    const TEST_ORACLES_COUNT = 10;
    const STATUS_CODE_LATE_AIRLINE = 20;

    before('setup contract', async () => {
    config = await Test.Config(accounts);
    await config.flightSuretyData.authorizeCaller(config.flightSuretyApp.address, { from: accounts[0] });
    });

    /****************************************************************************************/
    /* Operations and Settings                                                              */
    /****************************************************************************************/
    it(`App contract is authorized by Data contract`, async function () {
    // Get operating status
    let status = await config.flightSuretyData.isAuthorized.call(config.flightSuretyApp.address);
    assert.equal(status, true, "App contract should be authorized");

    });

    it(`(multiparty) has correct initial isOperational() value`, async function () {
    // Get operating status
    let status = await config.flightSuretyData.isOperational.call();
    console.log(status);
    assert.equal(status, true, "Incorrect initial operating status value");

    });

    it(`(multiparty) can block access to setOperatingStatus() for non-Contract Owner account`, async function () {

      // Ensure that access is denied for non-Contract Owner account
    let accessDenied = false;
    try 
    {
        await config.flightSuretyData.setOperatingStatus(false, { from: config.testAddresses[2] });
    }
    catch(e) {
        accessDenied = true;
    }

    assert.equal(accessDenied, true, "Access not restricted to Contract Owner");
            
    });

    it(`(multiparty) can allow access to setOperatingStatus() for Contract Owner account`, async function () {

      // Ensure that access is allowed for Contract Owner account
    let accessDenied = false;
    try 
    {
        await config.flightSuretyData.setOperatingStatus(false);
    }
    catch(e) {
        accessDenied = true;
    }
    assert.equal(accessDenied, false, "Access not restricted to Contract Owner");
    
    });

    it(`(multiparty) can block access to functions using requireIsOperational when operating status is false`, async function () {

        await config.flightSuretyData.setOperatingStatus(false);

        let reverted = false;
        try 
        {
            await config.flightSurety.setTestingMode(true);
        }
        catch(e) {
            reverted = true;
        }
        assert.equal(reverted, true, "Access not blocked for requireIsOperational");      

      // Set it back for other tests to work
        await config.flightSuretyData.setOperatingStatus(true);

    });

    it('(airline) cannot register an Airline using registerAirline() if it is not funded', async () => {    
    // ARRANGE
    let newAirline = accounts[2];

    // ACT
    try {
        await config.flightSuretyApp.registerAirline(newAirline, {from: config.firstAirline});
    }
    catch(e) {

    }

    let result = await config.flightSuretyData.isAirline.call(newAirline); 

    // ASSERT
    assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");

    });

    it('Register an Airline using registerAirline() directly', async () => {
    // ARRANGE
    let funds = await config.flightSuretyData.MINIMUM_FUNDS.call();

    // ACT
    try {
        await config.flightSuretyData.fund({from: accounts[0], value: funds});

        await config.flightSuretyApp.registerAirline(config.firstAirline, "Airline2", {from: accounts[0]});
    }
    catch(error) {
        console.log(error);
    }

    let airlinesCount = await config.flightSuretyData.airlinesCount.call(); 
    let result = await config.flightSuretyData.isAirline.call(config.firstAirline); 

    // ASSERT
    assert.equal(result, true, "Airline should be registered by another airline");
    assert.equal(airlinesCount, 2, "Airlines count should be 2 after registering new airline.");
    });  

    it("Airline needs 50% votes to register an airline using registerAirline() once there are 4 or more airlines registered", async () => {
        // ACT
        try {
            await config.flightSuretyApp.registerAirline(accounts[2], "Airline3", {from: accounts[0]});
            await config.flightSuretyApp.registerAirline(accounts[3], "Airline4", {from: accounts[0]});
            await config.flightSuretyApp.registerAirline(accounts[4], "Airline5", {from: accounts[0]});
        }
        catch(e) {
            console.log(e);
        }
        let result = await config.flightSuretyData.isAirline.call(accounts[4]);
        let airlinesCount = await config.flightSuretyData.airlinesCount.call(); 

        // ASSERT
        assert.equal(result, false, "Airline should not be able to register another airline if it hasn't provided funding");
        assert.equal(airlinesCount, 4, "Airlines count should be one after contract deploy.");
    });

    it('Register a flight using registerFlight()', async () => {
        // ARRANGE
        let timeStampInMilliseconds = Math.floor(Date.now() / 1000);
    
        // ACT
        try {
            let result = await config.flightSuretyData.isAirline.call(config.firstAirline); 

            // ARRANGE
            let funds = await config.flightSuretyData.MINIMUM_FUNDS.call();
            
            // If airline not registered then register it first
            if(result == false) {
                console.log("registering airline...");

               // ACT
                try {
                    await config.flightSuretyData.fund({from: accounts[0], value: funds});
                    await config.flightSuretyApp.registerAirline(config.firstAirline, "Airline2", {from: accounts[0]});
                }
                catch(error) {
                    console.log(error);
                }
            }

        await config.flightSuretyData.fund({from: config.firstAirline, value: funds});
        await config.flightSuretyApp.registerFlight("STR", "MUC", timeStampInMilliseconds, {from: config.firstAirline});    
        }   
        catch(error) {
            console.log(error);
        }
    });

    it("Passenger may pay up to 1 ether for purchasing flight insurance.", async () => {
        // ARRANGE
        let price = await config.flightSuretyData.INSURANCE_PRICE_LIMIT.call();
    
        // ACT
        try {
            await config.flightSuretyData.buy("STR", {from: config.firstPassenger, value: price});
        }
        catch(error) {
            console.log(error);
        }
    
        let registeredPassenger = await config.flightSuretyData.passengerAddresses.call(0);

        assert.equal(registeredPassenger, config.firstPassenger, "Passenger should be added to the list.");
    });

    it("Passenger receives credit of 1.5 X, if flight is delayed due to airline fault", async () => {
        // ARRANGE
        let price = await config.flightSuretyData.INSURANCE_PRICE_LIMIT.call();

        let creditToPay = await config.flightSuretyData.getCreditToPay.call({from: config.firstPassenger});

        const creditInWei = price * 1.5;

        assert.equal(creditToPay, creditInWei, "Passenger should have 1.5 ether to withdraw.");
    });

    it("Passenger can withdraw funds as a result of receiving credit for insurance", async () => {

        let creditToPay = await config.flightSuretyData.getCreditToPay.call({from: config.firstPassenger});
    
        try {
            let passengerOriginalBalance = await web3.eth.getBalance(config.firstPassenger);
            let receipt = await config.flightSuretyData.pay(config.firstPassenger);

            let passengerFinalBalance = await web3.eth.getBalance(config.firstPassenger);
        } catch(error) {
            console.log(error);
        }
    
        // Obtain total gas cost
        if(receipt != null) {
            const gasUsed = Number(receipt.receipt.gasUsed);
            const tx = await web3.eth.getTransaction(receipt.tx);
            const gasPrice = Number(tx.gasPrice);
            let finalCredit = await config.flightSuretyData.getCreditToPay.call({from: config.firstPassenger});
        
            assert.equal(finalCredit.toString(), 0, "Passenger should have transfered the ethers to its wallet.");
            assert.equal(Number(passengerOriginalBalance) + Number(creditToPay) - (gasPrice * gasUsed), Number(passengerFinalBalance), "Passengers balance should have increased the amount it had credited");
            }
        
    });    
});
