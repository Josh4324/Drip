const express = require("express");
const { ethers, BigNumber } = require("ethers");
const abi = require("./utils/abi.json");
const axios = require("axios");
const writeXlsxFile = require("write-excel-file/node");
const { uuid } = require("uuidv4");
const cors = require("cors");

require("dotenv").config();

const port = process.env.PORT || 6000;

const app = express();

app.use(
  express.json({
    limit: "10mb",
  })
);

app.use(
  express.urlencoded({
    limit: "10mb",
    extended: false,
    parameterLimit: 10000,
  })
);

//Enable cors
app.use(cors());

const schema = [
  // Column #1
  {
    column: "Address",
    type: String,
    value: (item) => item.address,
  },
  // Column #2
  {
    column: "Claims",
    type: String,
    value: (item) => item.claims,
  },
  // Column #3
  {
    column: "Deposits",
    type: String,
    value: (item) => item.deposits,
  },
  // Column #4
  {
    column: "Payout",
    type: String,
    value: (item) => item.payouts,
  },
  {
    column: "Downliners",
    type: String,
    value: (item) => item.down,
  },
];

const provider = new ethers.providers.JsonRpcProvider(process.env.node);

const signer = provider.getSigner(process.env.address);

const getContract = new ethers.Contract(process.env.caddress, abi.abi, signer);

app.post("/api/drip", async (req, res) => {
  try {
    let allData = [];

    let name = "./files" + "/" + uuid() + "." + "xlsx";

    let addList = req.body.addList;
    let track = [];

    addList.map((item, index) => {
      let lines = [];

      (async () => {
        const claims = await getContract.claimsAvailable(item);
        const result2 = await getContract.userInfo(item);
        const down = await axios.get(`https://api.drip.community/org/${item}`);

        if (down.data.children) {
          down.data.children.map((item) => {
            lines.push(item.id);
          });
        } else {
          lines.push("");
        }

        let lineText = lines.join(",");

        const obj = {
          address: item,
          claims: String(Number(BigNumber.from(claims)) / 10 ** 18),
          deposits: String(Number(BigNumber.from(result2.deposits)) / 10 ** 18),
          payouts: String(Number(BigNumber.from(result2.payouts)) / 10 ** 18),
          down: lineText,
        };

        allData.push(obj);
        track.push(index);

        if (track.length === addList.length) {
          await writeXlsxFile(allData, {
            schema,
            filePath: name,
          });

          return res.status(200).json({
            success: true,
            name: name,
          });
        }
      })();
    });
  } catch (err) {
    console.log(err);
    res.status(500).json({ err });
  }
});

//Handling unhandle routes
app.all("*", (req, res, next) => {
  const response = new Response(
    false,
    404,
    `Page not found. Can't find ${req.originalUrl} on this server`
  );
  return res.status(response.code).json(response);
});

//listening to port
app.listen(port, () => {
  console.log(`Welcome to Node Auth Template Postgres running on port ${port}`);
});
