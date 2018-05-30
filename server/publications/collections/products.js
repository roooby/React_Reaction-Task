import _ from "lodash";
import SimpleSchema from "simpl-schema";
import { Meteor } from "meteor/meteor";
import { Tracker } from "meteor/tracker";
import { check, Match } from "meteor/check";
import { registerSchema } from "@reactioncommerce/schemas";
import { Products, Shops, Catalog } from "/lib/collections";
import { Reaction, Logger } from "/server/api";

//
// define search filters as a schema so we can validate
// params supplied to the products publication
//
const filters = new SimpleSchema({
  "shops": {
    type: Array,
    optional: true
  },
  "shops.$": String,
  "tags": {
    type: Array,
    optional: true
  },
  "tags.$": String,
  "query": {
    type: String,
    optional: true
  },
  "visibility": {
    type: Boolean,
    optional: true
  },
  "details": {
    type: Object,
    optional: true
  },
  "details.key": {
    type: String,
    optional: true
  },
  "details.value": {
    type: String,
    optional: true
  },
  "price": {
    type: Object,
    optional: true
  },
  "price.min": {
    type: String,
    optional: true
  },
  "price.max": {
    type: String,
    optional: true
  },
  "weight": {
    type: Object,
    optional: true
  },
  "weight.min": {
    type: String,
    optional: true
  },
  "weight.max": {
    type: String,
    optional: true
  }
}, { check, tracker: Tracker });

registerSchema("filters", filters);

const catalogProductFiltersSchema = new SimpleSchema({
  "shopIdsOrSlugs": {
    type: Array,
    optional: true
  },
  "shopIdsOrSlugs.$": String,
  "tagIds": {
    type: Array,
    optional: true
  },
  "tagIds.$": String,
  "query": {
    type: String,
    optional: true
  }
});

function applyShopsFilter(selector, shopIdsOrSlugs) {
  // Active shop
  const shopId = Reaction.getShopId();
  const primaryShopId = Reaction.getPrimaryShopId();

  // Don't publish if we're missing an active or primary shopId
  if (!shopId || !primaryShopId) {
    return false;
  }

  let activeShopIds;
  // if the current shop is the primary shop, get products from all shops
  // otherwise, only list products from _this_ shop.
  if (shopId === primaryShopId) {
    activeShopIds = Shops.find({
      $or: [
        { "workflow.status": "active" },
        { _id: primaryShopId }
      ]
    }, {
      fields: {
        _id: 1
      }
    }).fetch().map((activeShop) => activeShop._id);
  } else {
    activeShopIds = [shopId];
  }

  if (!activeShopIds.length) {
    return false;
  }

  if (shopIdsOrSlugs) {
    // Get all shopIds associated with the slug or Id
    const shopIds = Shops.find({
      "workflow.status": "active",
      "$or": [{
        _id: { $in: shopIdsOrSlugs }
      }, {
        slug: { $in: shopIdsOrSlugs }
      }]
    }, {
      fields: {
        _id: 1
      }
    }).map((shop) => shop._id);

    activeShopIds = _.intersection(activeShopIds, shopIds);
  }

  if (activeShopIds.length) {
    return {
      ...selector,
      shopId: { $in: activeShopIds }
    };
  }

  return selector;
}

function filterProducts(productFilters) {
  // if there are filter/params that don't match the schema
  // validate, catch except but return no results
  try {
    if (productFilters) filters.validate(productFilters);
  } catch (e) {
    Logger.warn(e, "Invalid Product Filters");
    return false;
  }

  // Init default selector - Everyone can see products that fit this selector
  const baseSelector = {
    ancestors: [], // Lookup top-level products
    isDeleted: { $ne: true }, // by default, we don't publish deleted products
    isVisible: true // by default, only lookup visible products
  };

  const shopIdsOrSlugs = productFilters && productFilters.shops;
  const selector = applyShopsFilter(baseSelector, shopIdsOrSlugs);

  if (!selector) return false;

  if (productFilters) {
    // filter by tags
    if (productFilters.tags) {
      _.extend(selector, {
        hashtags: {
          $in: productFilters.tags
        }
      });
    }

    // filter by query
    if (productFilters.query) {
      const cond = {
        $regex: productFilters.query,
        $options: "i"
      };
      _.extend(selector, {
        $or: [{
          title: cond
        }, {
          pageTitle: cond
        }, {
          description: cond
        }]
      });
    }

    // filter by details
    if (productFilters.details) {
      _.extend(selector, {
        metafields: {
          $elemMatch: {
            key: {
              $regex: productFilters.details.key,
              $options: "i"
            },
            value: {
              $regex: productFilters.details.value,
              $options: "i"
            }
          }
        }
      });
    }

    // filter by visibility
    if (productFilters.visibility !== undefined) {
      _.extend(selector, {
        isVisible: productFilters.visibility
      });
    }

    // filter by gte minimum price
    if (productFilters["price.min"] && !productFilters["price.max"]) {
      _.extend(selector, {
        "price.min": {
          $gte: parseFloat(productFilters["price.min"])
        }
      });
    }

    // filter by lte maximum price
    if (productFilters["price.max"] && !productFilters["price.min"]) {
      _.extend(selector, {
        "price.max": {
          $lte: parseFloat(productFilters["price.max"])
        }
      });
    }

    // filter with a price range
    if (productFilters["price.min"] && productFilters["price.max"]) {
      const pmin = parseFloat(productFilters["price.min"]);
      const pmax = parseFloat(productFilters["price.max"]);
      // where product A has min 12.99 variant and a 19.99 variant
      // price.min=12.99&price.max=19.98
      // should return product A
      _.extend(selector, {
        "price.min": {
          $lt: pmax
        },
        "price.max": {
          $gt: pmin
        }
      });
    }

    // filter by gte minimum weight
    if (productFilters["weight.min"] && !productFilters["weight.max"]) {
      _.extend(selector, {
        weight: {
          $gte: parseFloat(productFilters["weight.min"])
        }
      });
    }

    // filter by lte maximum weight
    if (productFilters["weight.max"] && !productFilters["weight.min"]) {
      _.extend(selector, {
        weight: {
          $lte: parseFloat(productFilters["weight.max"])
        }
      });
    }

    // filter with a weight range
    if (productFilters["weight.min"] && productFilters["weight.max"]) {
      const wmin = parseFloat(productFilters["weight.min"]);
      const wmax = parseFloat(productFilters["weight.max"]);
      _.extend(selector, {
        weight: {
          $lt: wmax,
          $gt: wmin
        }
      });
    }
  } // end if productFilters

  return selector;
}

/**
 * products publication
 * @param {Number} [productScrollLimit] - optional, defaults to 24
 * @param {Array} shops - array of shopId to retrieve product from.
 * @return {Object} return product cursor
 */
Meteor.publish("Products", function (productScrollLimit = 24, productFilters, sort = {}, editMode = true) {
  check(productScrollLimit, Number);
  check(productFilters, Match.OneOf(undefined, Object));
  check(sort, Match.OneOf(undefined, Object));
  check(editMode, Match.Maybe(Boolean));


  const selector = filterProducts(productFilters);

  if (selector === false) {
    return this.ready();
  }

  // Get a list of shopIds that this user has "createProduct" permissions for (owner permission is checked by default)
  const userAdminShopIds = Reaction.getShopsWithRoles(["createProduct"], this.userId) || [];

  // We publish an admin version of this publication to admins of products who are in "Edit Mode"
  if (editMode) {
    // Limit to only shops we have "createProduct" role for
    selector.shopId.$in = _.intersection(selector.shopId.$in, userAdminShopIds);
    if (selector.shopId.$in.length === 0) {
      return this.ready();
    }

    delete selector.isVisible; // in edit mode, you should see all products
  }

  // Get the IDs of the first N (limit) top-level products that match the query
  const productIds = Products.find(selector, {
    sort,
    limit: productScrollLimit
  }, {
    fields: {
      _id: 1
    }
  }).map((product) => product._id);

  // Return a cursor for the matching products plus all their variants
  return Products.find({
    $or: [{
      ancestors: {
        $in: productIds
      }
    }, {
      _id: {
        $in: productIds
      }
    }]
  }, {
    sort
    // We shouldn't limit here. Otherwise we are limited to 24 total products which
    // could be far less than 24 top-level products.
  });
});

function filterCatalogItems(catalogFilters) {
  // if there are filter/params that don't match the schema
  // validate, catch except but return no results
  try {
    if (catalogFilters) catalogProductFiltersSchema.validate(catalogFilters);
  } catch (e) {
    Logger.warn(e, "Invalid Catalog Product Filters");
    return false;
  }

  // Init default selector - Everyone can see products that fit this selector
  const baseSelector = {
    "product.isDeleted": { $ne: true }, // by default, we don't publish deleted products
    "product.isVisible": true // by default, only lookup visible products
  };

  const { shopIdsOrSlugs } = catalogFilters || {};
  const selector = applyShopsFilter(baseSelector, shopIdsOrSlugs);

  if (!selector) return false;
  if (!catalogFilters) return selector;

  // filter by tags
  if (catalogFilters.tagIds) {
    selector["product.tagIds"] = {
      $in: catalogFilters.tagIds
    };
  }

  // filter by query
  if (catalogFilters.query) {
    const cond = {
      $regex: catalogFilters.query,
      $options: "i"
    };

    selector.$or = [{
      title: cond
    }, {
      pageTitle: cond
    }, {
      description: cond
    }];
  }

  return selector;
}

/**
 * @name Products/grid
 * @method
 * @memberof Core
 * @summary Publication method for a customer facing product grid
 * @param {number} productScrollLimit - product find limit
 * @param {object} productFilters - filters to be applied to the product find
 * @return {MongoCursor} Mongo cursor object of found products
 */
Meteor.publish("Products/grid", function (productScrollLimit = 24, productFilters) {
  check(productScrollLimit, Number);
  check(productFilters, Match.OneOf(undefined, Object));

  const newSelector = filterCatalogItems(productFilters);

  if (newSelector === false) {
    return this.ready();
  }

  let tagIdForPosition = "_default";
  if (productFilters && Array.isArray(productFilters.tagIds) && productFilters.tagIds.length) {
    [tagIdForPosition] = productFilters.tagIds;
  }

  return Catalog.find(newSelector, {
    sort: {
      [`product.positions.${tagIdForPosition}.position`]: 1,
      createdAt: -1
    },
    limit: productScrollLimit,
    fields: {
      variants: 0
    }
  });
});
