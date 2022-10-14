import React, { useEffect, useState } from "react";
import logo from "../../assets/logo.png";
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "../../../declarations/nft";
import { idlFactory as tokenIdlFactory } from "../../../declarations/token";
import { Principal } from "@dfinity/principal";
import Button from "./Button";
import { opend } from "../../../declarations/opend";
import CURRENT_USER_ID from "../index";
import PriceLabel from "./PriceLabel";

function Item(props) {
  const [name, setName] = useState();
  const [owner, setOwner] = useState();
  const [img, setImg] = useState();
  const [button, setButton] = useState();
  const [priceInput, setPriceInput] = useState();
  const [loaderHidden, setLoader] = useState(true);
  const [blur, setBlur] = useState();
  const [sellStatus, setStatus] = useState("");
  const [priceLabel, setPriceLabel] = useState();
  const [shouldDisplay, setDisplay] = useState(true);

  const id = props.id;

  const localhost = "http://localhost:8080/";
  const agent = new HttpAgent({ host: localhost });
  //TODO: When deploy to live remove line 21
  agent.fetchRootKey();
  let NFTActor;

  async function loadNFT() {
    NFTActor = await Actor.createActor(idlFactory, {
      agent,
      canisterId: id,
    });

    const nome = await NFTActor.getName();
    const dono = await NFTActor.getOwner();
    const imageData = await NFTActor.getAsset();
    const imageContent = new Uint8Array(imageData);
    const image = URL.createObjectURL(
      new Blob([imageContent.buffer], { type: "image/png" })
    );
    setName(nome);
    setOwner(dono.toText());
    setImg(image);

    if (props.role == "collection") {
      const nftIsListed = await opend.isListed(props.id);

      if (nftIsListed) {
        setOwner("OpenD");
        setBlur({ filter: "blur(4px)" });
        setStatus("#Listed");
      } else {
        setButton(<Button handleClick={handleSell} text={"Sell"} />);
      }
    } else if (props.role == "discover") {
      const originalOwner = await opend.getOriginalOwner(props.id);
      if (originalOwner.toText() != CURRENT_USER_ID.toText()) {
        setButton(<Button handleClick={handleBuy} text={"Buy"} />);
      }

      const price = await opend.getListedNFTPrice(props.id);
      setPriceLabel(<PriceLabel sellPrice={price.toString()} />);
    }
  }

  useEffect(() => {
    loadNFT();
  }, []);
  let price;
  function handleSell() {
    console.log("clicked sell");
    setPriceInput(
      <input
        placeholder="Price in DLKZ"
        type="number"
        className="price-input"
        value={price}
        onChange={(e) => (price = e.target.value)}
      />
    );
    setButton(<Button handleClick={sellItem} text={"Confirm"} />);
  }

  async function sellItem() {
    setBlur({ filter: "blur(4px)" });
    setLoader(false);
    console.log("Set price = " + price);
    const listingResult = await opend.listItem(props.id, Number(price));
    console.log("listing: " + listingResult);
    if (listingResult == "Success") {
      const opendId = await opend.getOpenDCanisterID();
      const transferResult = await NFTActor.transferOwnership(opendId);
      console.log("transfer: " + transferResult);
      if (transferResult == "Success") {
        setLoader(true);
        setButton();
        setPriceInput();
        setOwner("OpenD");
        setStatus("#Listed");
      }
    }
  }

  async function handleBuy() {
    console.log("buy triggered");
    setLoader(false)
    const tokenActor = await Actor.createActor(tokenIdlFactory, {
      agent,
      canisterId: Principal.fromText("wqmuk-5qaaa-aaaaa-aaaqq-cai"),
    });

    const sellerId = await opend.getOriginalOwner(props.id);
    const itemPrice = await opend.getListedNFTPrice(props.id);

    const result = await tokenActor.transfer(sellerId, itemPrice);
    if (result == "Success") {
      const transferResult = await opend.completePurchase(
        props.id,
        sellerId,
        CURRENT_USER_ID
      );
      console.log("purchase: " + transferResult);
      setLoader(true)
      setDisplay(false)
    }
  }

  return (
    <div style={{display: shouldDisplay ? "inline" : "none"}}  className="disGrid-item">
      <div className="disPaper-root disCard-root makeStyles-root-17 disPaper-elevation1 disPaper-rounded">
        <img
          className="disCardMedia-root makeStyles-image-19 disCardMedia-media disCardMedia-img"
          src={img}
          style={blur}
        />
        <div hidden={loaderHidden} className="lds-ellipsis">
          <div></div>
          <div></div>
          <div></div>
          <div></div>
        </div>
        <div className="disCardContent-root">
          {priceLabel}
          <h2 className="disTypography-root makeStyles-bodyText-24 disTypography-h5 disTypography-gutterBottom">
            {name}
            <span className="purple-text"> {sellStatus}</span>
          </h2>
          <p className="disTypography-root makeStyles-bodyText-24 disTypography-body2 disTypography-colorTextSecondary">
            Owner: {owner}
          </p>
          {priceInput}
          {button}
        </div>
      </div>
    </div>
  );
}

export default Item;
