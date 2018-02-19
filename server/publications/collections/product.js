import { Meteor } from "meteor/meteor";
import { check, Match } from "meteor/check";
import { Media, Products, Revisions, Shops } from "/lib/collections";
import { Logger, Reaction } from "/server/api";
import { RevisionApi } from "/imports/plugins/core/revisions/lib/api/revisions";


/**
 * Helper function that creates and returns a Cursor of Media for relevant
 * products to a publication
 * @method findProductMedia
 * @param {Object} publicationInstance instance of the publication that invokes this method
 * @param {array} productIds array of productIds
 * @return {Object} Media Cursor containing the product media that matches the selector
 */
export function findProductMedia(publicationInstance, productIds) {
  const selector = {};

  if (Array.isArray(productIds)) {
    selector["metadata.productId"] = {
      $in: productIds
    };
  } else {
    selector["metadata.productId"] = productIds;
  }

  // No one needs to see archived images on products
  selector["metadata.workflow"] = {
    $nin: ["archived"]
  };

  // Product editors can see both published and unpublished images
  // There is an implied shopId in Reaction.hasPermission that defaults to
  // the active shopId via Reaction.getShopId
  if (!Reaction.hasPermission(["createProduct"], publicationInstance.userId)) {
    selector["metadata.workflow"].$in = [null, "published"];
  }


  // TODO: We should differentiate between the media selector for the product grid and PDP
  // The grid shouldn't need more than one Media document per product, while the PDP will need
  // all the images associated with the
  return Media.find(selector, {
    sort: {
      "metadata.priority": 1
    }
  });
}


/**
 * product detail publication
 * @param {String} productIdOrHandle - productId or handle
 * @return {Object} return product cursor
 */
Meteor.publish("Product", function (productIdOrHandle, shopIdOrSlug) {
  check(productIdOrHandle, Match.OptionalOrNull(String));
  check(shopIdOrSlug, Match.Maybe(String));

  if (!productIdOrHandle) {
    Logger.debug("ignoring null request on Product subscription");
    return this.ready();
  }

  const selector = {
    $or: [{
      _id: productIdOrHandle
    }, {
      handle: {
        $regex: productIdOrHandle,
        $options: "i"
      }
    }]
  };

  if (shopIdOrSlug) {
    const shop = Shops.findOne({
      $or: [{
        _id: shopIdOrSlug
      }, {
        slug: shopIdOrSlug
      }]
    });

    if (shop) {
      selector.shopId = shop._id;
    } else {
      return this.ready();
    }
  }

  // TODO review for REGEX / DOS vulnerabilities.
  // Need to peek into product to get associated shop. This is important to check permissions.
  const product = Products.findOne(selector);
  if (!product) {
    // Product not found, return empty subscription.
    return this.ready();
  }

  const _id = product._id;

  selector.isVisible = true;
  selector.isDeleted = { $in: [null, false] };
  selector.$or = [
    { _id },
    { ancestors: _id },
    { handle: productIdOrHandle }];

  // Authorized content curators for the shop get special publication of the product
  // all all relevant revisions all is one package
  if (Reaction.hasPermission(["owner", "createProduct"], this.userId, product.shopId)) {
    selector.isVisible = {
      $in: [true, false, undefined]
    };

    if (RevisionApi.isRevisionControlEnabled()) {
      const productCursor = Products.find(selector);
      const handle = productCursor.observeChanges({
        added: (id, fields) => {
          this.added("Products", id, fields);
          console.log(`Products.added - product added. ${id}`);
        },
        changed: (id, fields) => {
          this.changed("Products", id, fields);
        },
        removed: (id) => {
          this.removed("Products", id);
        }
      });

      const handle2 = Revisions.find({
        "workflow.status": {
          $nin: [
            "revision/published"
          ]
        }
      }).observe({
        added: (revision) => {
          this.added("Revisions", revision._id, revision);
          if (revision.documentType === "product") {
           /* console.log("this "+ JSON.stringify(this));
            console.log("userId " + this.userId);
            debugger;
            if (Meteor.server.sessions) {
              const ref = Meteor.server.sessions;
              for (sessionId in ref) {
                session = ref[sessionId];
                const collectionView = session.getCollectionView("Products");
                console.log("collectionView " + JSON.stringify(collectionView));
              }
            }*/
            // Check merge box (session collection view), if product if already in cache.
            // If yes, we send a `changed`, otherwise a `added` message.
            if (this._documents.Products[revision.documentId]) {
              this.changed("Products", revision.documentId, { __revisions: [revision] });
              console.log(`Products.added - product changed. ${revision.documentId}`);
            } else {
              this.added("Products", revision.documentId, { __revisions: [revision] });
              console.log(`Products.added - product added. ${revision.documentId}`);
            }

            /*const observedProduct = Products.findOne(revision.documentId);
            if (observedProduct) {
              // observedProduct.__revisions = [revision];
              // this.added("Products", revision.documentId, observedProduct);
              console.log(`Revisions.added - product added. ${revision.documentId}`);
              this.changed("Products", revision.documentId, { __revisions: [revision] });
            }*/
          }
        },
        changed: (revision) => {
          this.changed("Revisions", revision._id, revision);
          if (revision.documentType === "product") {
            this.changed("Products", revision.documentId, { __revisions: [revision] });
          }
        },
        removed: (revision) => {
          this.removed("Revisions", revision._id, revision);
          if (revision.documentType === "product") {
            this.changed("Products", revision.documentId, { __revisions: [] });
          }
        }
      });

      this.onStop(() => {
        handle.stop();
        handle2.stop();
      });

      const productIds = productCursor.map(p => p._id);
      return [
        findProductMedia(this, productIds)
      ];
    }

    // Revision control is disabled, but is an admin
    const productCursor = Products.find(selector);
    const productIds = productCursor.map(p => p._id);
    const mediaCursor = findProductMedia(this, productIds);

    return [
      productCursor,
      mediaCursor
    ];
  }

  // Everyone else gets the standard, visible products and variants
  const productCursor = Products.find(selector);
  const productIds = productCursor.map(p => p._id);
  const mediaCursor = findProductMedia(this, productIds);

  return [
    productCursor,
    mediaCursor
  ];
});
