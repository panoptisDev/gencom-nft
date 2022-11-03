import {
  Box,
  Card,
  CardContent,
  Divider,
  Grid,
  Typography,
  FormControl,
  InputLabel,
  OutlinedInput,
  InputAdornment,
  Button,
  IconButton,
  Tooltip,
} from "@mui/material";
import CanvasGrid from "./CanvasGrid";
import SquareIcon from "@mui/icons-material/Square";
import PaletteIcon from "@mui/icons-material/Palette";
import CircleIcon from "@mui/icons-material/Circle";
import GavelIcon from "@mui/icons-material/Gavel";
import { colors, PRECISION, SYMBOL } from "../constants";
import { useState } from "react";
import { useEffect } from "react";
import { Keyring } from "@polkadot/api";
import dayjs from "dayjs";
import { useSnackbar } from "notistack";

const keyring = new Keyring({ type: "sr25519" });
const BN = require("bn.js");
export default function CanvasBox(props) {
  const renderColorSelectionButtons = () => {
    let list = [];
    for (let key in colors) {
      if (colors.hasOwnProperty(key)) {
        list.push(
          <Tooltip title={`Color: ${colors[key]}`} key={key}>
            <IconButton
              sx={{ marginRight: "8px" }}
              onClick={() => setTransaction({ ...transaction, color: key })}
            >
              <CircleIcon
                sx={{
                  color: colors[key],
                }}
              />
            </IconButton>
          </Tooltip>
        );
      }
    }
    return list;
  };
  const { enqueueSnackbar } = useSnackbar();
  const [gridData, setGridData] = useState();
  const [selectedCell, setSelectedCell] = useState({
    row: 0,
    column: 0,
  });
  const [transaction, setTransaction] = useState({ color: "0", bid: 0 });
  const [selectedCellDetails, setSelectedCellDetails] = useState({
    owner: "----------------------------------------------------",
    bidPrice: "0 ",
    color: "0",
  });
  const [now] = useState(dayjs().unix() * 1000);

  function changeAddressEncoding(address, toNetworkPrefix = 42) {
    if (!address) {
      return null;
    }
    const pubKey = keyring.decodeAddress(address);
    const encodedAddress = keyring.encodeAddress(pubKey, toNetworkPrefix);
    return encodedAddress;
  }

  const createTokenId = (canvasId, row, column) => {
    console.log(
      canvasId +
        row.toString().padStart(3, "0") +
        column.toString().padStart(3, "0")
    );
    return (
      canvasId +
      row.toString().padStart(3, "0") +
      column.toString().padStart(3, "0")
    );
  };

  const getCellDetails = async () => {
    if (props.activeAccount && props.contract && props.id) {
      console.log("Fetching cell details");
      await props.contract.query
        .getCellDetails(
          props.activeAccount.address,
          {
            value: 0,
            gasLimit: -1,
          },
          createTokenId(props.id, selectedCell.row, selectedCell.column)
        )
        .then((res) => {
          console.log(res);
          if (!res.output.toHuman().Err) {
            res = res.output?.toHuman().Ok;
            console.log(res);
            setSelectedCellDetails({
              ...selectedCellDetails,
              owner: changeAddressEncoding(res.owner),
              bidPrice:
                new BN(res.value.replace(/,/g, ""))
                  .div(new BN(PRECISION))
                  .toNumber() / 1000_000,
              color: "#" + parseInt(res.color.replace(/,/g, "")).toString(16),
            });
          } else if (res.output?.toHuman()?.Err === "TokenNotFound") {
            setSelectedCellDetails({
              ...selectedCellDetails,
              owner: "Be the first one to bid",
              bidPrice: props.basePrice,
              color: colors["0"],
            });
          } else {
            console.log("Error on get cell details", res.output.toHuman().Err);
          }
        })
        .catch((err) => {
          console.log("Error calling cell details", err);
        });
    }
  };

  const onBid = () => {
    if (selectedCell.owner === props.activeAccount.address) {
      changeCellColor();
    } else {
      captureCell();
    }
  };

  const changeCellColor = async () => {
    if (props.contract && props.activeAccount) {
      await props.contract.query
        .changeCellColor(
          props.activeAccount.address,
          {
            value: 0,
            gasLimit: -1,
          },
          props.id,
          selectedCell.row,
          selectedCell.column,
          parseInt(colors[transaction.color].subString(1), 16)
        )
        .then((res) => {
          console.log(res);
        });
    } else {
      console.log("Connect your wallet");
      enqueueSnackbar("Connect your wallet", { variant: "error" });
    }
  };

  const captureCell = async () => {
    if (props.contract && props.activeAccount) {
      await props.contract.query
        .captureCell(
          props.activeAccount.address,
          {
            value: 0,
            gasLimit: -1,
          },
          createTokenId(props.id, selectedCell.row, selectedCell.column),
          parseInt(colors[transaction.color].subString(1), 16)
        )
        .then((res) => {
          console.log(res);
        });
    } else {
      console.log("Connect your wallet");
      enqueueSnackbar("Connect your wallet", { variant: "error" });
    }
  };

  useEffect(() => {
    getCellDetails();
  }, [selectedCell]);

  return (
    <Box component="div" id="canvasBoxWrapperContainer">
      <Box component="div" id="canvasBoxWrapper">
        <Grid
          container
          spacing={2}
          sx={{ display: "flex", justifyContent: "center" }}
        >
          <Grid
            item
            md={12}
            lg={6}
            sx={{ display: "flex", justifyContent: "center" }}
          >
            <Card className="gridContainerCard" sx={{ borderRadius: "15px" }}>
              <CanvasGrid
                rows={32}
                columns={32}
                setSelectedCell={(x, y) =>
                  setSelectedCell({
                    row: x,
                    column: y,
                  })
                }
              />
              <Typography
                variant="h6"
                align="left"
                id="selectionDetails"
                sx={{
                  width: "384px",
                  color: "rgba(31, 38, 59, 1)",
                  margin: "30px 0px 5px 0px",
                  fontWeight: "500",
                }}
              >
                Selection Details
              </Typography>
              <Divider sx={{ width: "384px", marginBottom: "10px" }} />
              <Box component="div" className="cardDataRow">
                <Typography
                  align="left"
                  variant="subtitle2"
                  sx={{ width: "192px" }}
                >
                  Row:{" "}
                  <span style={{ color: "rgba(143,151,163,1)" }}>
                    {selectedCell.row + 1}
                  </span>
                </Typography>
                <Typography
                  align="right"
                  variant="subtitle2"
                  sx={{ width: "192px" }}
                >
                  Column:{" "}
                  <span style={{ color: "rgba(143,151,163,1)" }}>
                    {selectedCell.column + 1}
                  </span>
                </Typography>
              </Box>
              <Box component="div" className="cardDataRow">
                <Typography
                  align="left"
                  variant="subtitle2"
                  sx={{ width: "382px" }}
                >
                  Owner:{" "}
                  <span
                    style={{ color: "rgba(143,151,163,1)", fontSize: "11px" }}
                  >
                    {selectedCellDetails.owner}{" "}
                  </span>
                </Typography>
              </Box>
              <Box component="div" className="cardDataRow">
                <Typography
                  align="left"
                  variant="subtitle2"
                  sx={{ width: "382px" }}
                >
                  Last Bid Amount:{" "}
                  <span
                    style={{ color: "rgba(143,151,163,1)", fontSize: "12px" }}
                  >
                    {" "}
                    {selectedCellDetails.bidPrice + " " + SYMBOL}
                  </span>
                </Typography>
              </Box>
              <Box component="div" className="cardDataRow">
                <Typography
                  align="left"
                  variant="subtitle2"
                  sx={{ width: "352px" }}
                >
                  Current color:{" "}
                  <span
                    style={{ color: "rgba(143,151,163,1)", fontSize: "12px" }}
                  >
                    {selectedCellDetails.color}
                  </span>
                </Typography>
                <Typography sx={{ width: "30px" }}>
                  <SquareIcon sx={{ color: selectedCellDetails.color }} />
                </Typography>
              </Box>
            </Card>
          </Grid>
          <Grid
            item
            md={12}
            lg={6}
            sx={{ display: "flex", justifyContent: "center" }}
          >
            <Card
              className="gridContainerCard"
              sx={{
                borderRadius: "15px",
                width: "464px",
                height: "fit-content",
                paddingTop: "10px",
              }}
            >
              <CardContent
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  width: "384px",
                }}
              >
                <Typography
                  variant="h5"
                  sx={{
                    width: "384px",
                    color: "rgba(31, 38, 59, 1)",
                    marginBottom: "8px",
                  }}
                  align="left"
                  fontWeight="500"
                >
                  Choose and Bid
                </Typography>
                <Divider sx={{ width: "384px", marginBottom: "10px" }} />
                <Typography
                  variant="body1"
                  sx={{
                    width: "384px",
                    color: "rgba(31, 38, 59, 1)",
                    fontWeight: "500",
                    display: "flex",
                    margin: "10px 0px 20px 0px",
                  }}
                  align="left"
                >
                  Choose Color
                  <PaletteIcon sx={{ margin: "0px 0px 0px 4px" }} />
                </Typography>
                <Box
                  component="div"
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    marginBottom: "15px",
                  }}
                >
                  {renderColorSelectionButtons()}
                </Box>
                <Typography
                  variant="body1"
                  sx={{
                    width: "384px",
                    color: "rgba(31, 38, 59, 1)",
                    fontWeight: "500",
                    display: "flex",
                    margin: "10px 0px 20px 0px",
                  }}
                  align="left"
                >
                  Choose Bid Amount
                  <GavelIcon sx={{ margin: "0px 0px 0px 8px" }} />
                </Typography>
                <FormControl
                  sx={{ m: 1, width: "400px" }}
                  disabled={selectedCell.owner === props.activeAccount.address}
                >
                  <InputLabel htmlFor="bidding-price">Bid Amount</InputLabel>
                  <OutlinedInput
                    id="bidding-price"
                    startAdornment={
                      <InputAdornment position="start">{SYMBOL}</InputAdornment>
                    }
                    label="Bid Amount"
                    value={transaction.bid}
                    onChange={(e) =>
                      setTransaction({ ...transaction, bid: e.target.value })
                    }
                    type="number"
                    InputProps={{ inputProps: { min: 0 } }}
                  />
                </FormControl>
                <Typography
                  variant="caption"
                  sx={{ width: "384px", paddingLeft: "5px" }}
                  align="left"
                >
                  {transaction.bid && transaction.color ? (
                    <>
                      * Bid {transaction.bid + " " + SYMBOL} for Cell in Row{" "}
                      {selectedCell.row + 1} and Column{" "}
                      {selectedCell.column + 1} with color
                      <CircleIcon
                        sx={{
                          color: colors[transaction.color],
                          fontSize: "13px",
                          marginBottom: "-2px",
                          marginLeft: "5px",
                        }}
                      />
                    </>
                  ) : (
                    "* Select a color and bid price"
                  )}
                </Typography>
                <Button
                  variant="contained"
                  sx={{ marginTop: "10px" }}
                  onClick={() => onBid()}
                  disabled={props.start > now || props.end < now}
                >
                  Bid
                </Button>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </Box>
  );
}
