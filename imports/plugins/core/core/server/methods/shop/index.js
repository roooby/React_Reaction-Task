import createShop from "./createShop";
import createTag from "./createTag";
import getLocale from "./getLocale";
import hideHeaderTag from "./hideHeaderTag";
import locateAddress from "./locateAddress";
import removeHeaderTag from "./removeHeaderTag";
import resetShopId from "./resetShopId";
import togglePackage from "./togglePackage";
import updateBrandAssets from "./updateBrandAssets";
import updateCurrencyConfiguration from "./updateCurrencyConfiguration";
import updateDefaultParcelSize from "./updateDefaultParcelSize";
import updateHeaderTags from "./updateHeaderTags";
import updateLanguageConfiguration from "./updateLanguageConfiguration";
import updateShopExternalServices from "./updateShopExternalServices";

/**
 * @file Meteor methods for Shop
 *
 *
 * @namespace Shop/Methods
*/

export default {
  "shop/createShop": createShop,
  "shop/createTag": createTag,
  "shop/getLocale": getLocale,
  "shop/hideHeaderTag": hideHeaderTag,
  "shop/locateAddress": locateAddress,
  "shop/removeHeaderTag": removeHeaderTag,
  "shop/resetShopId": resetShopId,
  "shop/togglePackage": togglePackage,
  "shop/updateBrandAssets": updateBrandAssets,
  "shop/updateCurrencyConfiguration": updateCurrencyConfiguration,
  "shop/updateDefaultParcelSize": updateDefaultParcelSize,
  "shop/updateHeaderTags": updateHeaderTags,
  "shop/updateLanguageConfiguration": updateLanguageConfiguration,
  "shop/updateShopExternalServices": updateShopExternalServices
};
