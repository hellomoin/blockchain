import FlightSuretyApp from '../../build/contracts/FlightSuretyApp.json';
import FlightSuretyData from '../../build/contracts/FlightSuretyData.json';
import Config from './config.json';
import Web3 from 'web3';
import express from 'express';
import cors from 'cors';


let config = Config['localhost'];
let web3 = new Web3(new Web3.providers.WebsocketProvider(config.url.replace('http', 'ws')));
web3.eth.defaultAccount = web3.eth.accounts[0];
let flightSuretyApp = new web3.eth.Contract(FlightSuretyApp.abi, config.appAddress);
let flightSuretyData = new web3.eth.Contract(FlightSuretyData.abi, config.dataAddress);

let oracleAccounts = [];
let oraclesIndexList = [];

const TEST_ORACLES_COUNT = 5;

const STATUS_CODE_UNKNOWN = 0;
const STATUS_CODE_ON_TIME = 10;
const STATUS_CODE_LATE_AIRLINE = 20;
const STATUS_CODE_LATE_WEATHER = 30;
const STATUS_CODE_LATE_TECHNICAL = 40;
const STATUS_CODE_LATE_OTHER = 50;

let defaultStatus = STATUS_CODE_ON_TIME;

const app = express();
app.use(cors());

app.get('/api', (req, res) => {
    res.send({
      message: 'An API for use with your Dapp!'
    })
})

app.get('/api/status/:status', (req, res) => {
  var status = req.params.status;
  var message = 'Default status changed: ';

  switch(status) {
    case '10':
      defaultStatus = STATUS_CODE_ON_TIME;
      message += "ON TIME";
      break;
    case '20':
      defaultStatus = STATUS_CODE_LATE_AIRLINE;
      message += "LATE AIRLINE";
      break;
    case '30':
      defaultStatus = STATUS_CODE_LATE_WEATHER;
      message += "LATE WEATHER";
      break;
    case '40':
      defaultStatus = STATUS_CODE_LATE_TECHNICAL;
      message += "LATE TECHNICAL";
      break;
    case '50':
      defaultStatus = STATUS_CODE_LATE_OTHER;
      message += "LATE OTHER";
      break;
    default:
      defaultStatus = STATUS_CODE_UNKNOWN;
      message += "UNKNOWN";
      break;
  }
  
  res.send({
    message: message
  })
});

function submitOracleResponse (oracle, index, airline, flight, timestamp) {
  let payload = {
    index: index,
    airline: airline,
    flight: flight,
    timestamp: timestamp,
    statusCode: defaultStatus
  }

  flightSuretyApp.methods.submitOracleResponse( index, airline, flight, timestamp, defaultStatus)
                        .send({ from: oracle, gas: 100000, gasPrice: 20000000}, (error, result) => {
                              if(error) {
                                  console.log(error, payload);
                              }

                              if(result) {
                                //console.log(result);
                              }
                          });

            if(defaultStatus == STATUS_CODE_LATE_AIRLINE) {
              flightSuretyData.methods.creditInsurees(flight).call({from: oracle}, (error, result) => {
                if(error){
                  console.log(error, payload);
                } else {
                  console.log("set credit for insurees: " + result);
                }
              });
  }
}

function getOracleAccounts() {
  return new Promise((resolve, reject) => {
    web3.eth.getAccounts().then(accountList => {
      oracleAccounts = accountList.slice(5, 10);
    }).catch(err => {
      reject(err);
    }).then(() => {
      resolve(oracleAccounts);
    });
  });
}

flightSuretyApp.events.OracleRequest({
    fromBlock: "latest"
    }, function (error, event) {
      if (error){
        console.log(error);
      } 

      let index = event.returnValues.index;

      console.log(`Triggered index: ${index}`);
      
      let i = 0;
      oraclesIndexList.forEach((indexes) => {
        let oracle = oracleAccounts[i];

        if( indexes[0] == index || 
            indexes[1] == index || 
            indexes[2] == index) {              
          console.log(`Oracle: ${oracle} triggered. Indexes: ${indexes}.`);
          submitOracleResponse(oracle, index, event.returnValues.airline, event.returnValues.flight, event.returnValues.timestamp);
        }
        i++;
    });
});

flightSuretyData.events.allEvents({
  fromBlock: "latest"
}, function (error, event) {
    if (event) {
        console.log("Event: " + event);
    }  

    if(error){
        console.log("Error received: " + error);
    }
});

function initOracles(accounts) {
  return new Promise((resolve, reject) => {
    flightSuretyApp.methods.REGISTRATION_FEE().call().then(fee => {
      for(let index=0; index < TEST_ORACLES_COUNT; index++) {
        flightSuretyApp.methods.registerOracle().send({
          "from": accounts[index],
          "value": fee,
          "gas": 1000000,
          "gasPrice": 10000000
        }).then(() => {
          flightSuretyApp.methods.getMyIndexes().call({
            "from": accounts[index]
          }).then(result => {
            console.log(`Oracle ${index} Registered at ${accounts[index]} with [${result}] indexes.`);
            oraclesIndexList.push(result);
          }).catch(err => {
            reject(err);
          });
        }).catch(err => {
          reject(err);
        });
      };
      resolve(oraclesIndexList);
    }).catch(err => {
      reject(err);
    });
  });
}

/////////////////////////////////////////////////////
getOracleAccounts().then(accounts => {
  initOracles(accounts).catch(err => {
    console.log(err.message);
  });
});


export default app;


