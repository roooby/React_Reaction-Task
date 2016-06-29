/* eslint dot-notation: 0 */
import { Meteor } from "meteor/meteor";
import { expect } from "meteor/practicalmeteor:chai";
import { sinon } from "meteor/practicalmeteor:sinon";
import { Roles } from "meteor/alanning:roles";
import { getShop } from "/server/imports/fixtures/shops";
import { Reaction } from "/server/api";
import * as Collections from "/lib/collections";
import Fixtures from "/server/imports/fixtures";

Fixtures();

describe.skip("Publication", function () {
  const shop = getShop();
  let sandbox;
  let productRemoveStub;
  let productInsertStub;

  beforeEach(function () {
    sandbox = sinon.sandbox.create();
  });

  afterEach(function () {
    sandbox.restore();
  });

  before(function () {
    // We are mocking inventory hooks, because we don't need them here, but
    // if you want to do a real stress test, you could try to comment out
    // this spyOn lines. This is needed only for ./reaction test. In one
    // package test this is ignoring.
    if (Array.isArray(Collections.Products._hookAspects.remove.after) && Collections.Products._hookAspects.remove.after.length) {
      productRemoveStub = sinon.stub(Collections.Products._hookAspects.remove.after[0], "aspect");
      productInsertStub = sinon.stub(Collections.Products._hookAspects.insert.after[0], "aspect");
    }
    Collections.Products.remove({});
    // really strange to see this, but without this `remove` finishes in
    // async way (somewhere in a middle of testing process)
    Meteor.setTimeout(function () {
      Collections.Orders.remove({});
    }, 500);
  });

  after(function () {
    productRemoveStub.restore();
    productInsertStub.restore();
  });

  describe.skip("Orders", () => {
    const publication = Meteor.server.publish_handlers["Orders"];
    const thisContext = {
      userId: "userId",
      ready: function () { return "ready"; }
    };
    let order;

    before(() => {
      // this is another hack. We put this factory inside hook because, first
      // we need to mock collectionHooks to Inventory. This way we do all things
      // in a right order. This is make sense only for --velocity (all package)
      // tests.
      order = Factory.create("order", { status: "created" });
    });

    beforeEach(() => {
      spyOn(Reaction, "getShopId").and.returnValue(shop._id);
    });

    it.skip(
      "should return shop orders for an admin",
      function () {
        // setup
        spyOn(Roles, "userIsInRole").and.returnValue(true);
        // execute
        const cursor = publication.apply(thisContext);
        // verify
        const data = cursor.fetch()[0];
        expect(data.shopId).toBe(order.shopId);
      }
    );

    it.skip(
      "should not return shop orders for non admin",
      function () {
        // setup
        spyOn(Roles, "userIsInRole").and.returnValue(false);
        const cursor = publication.apply(thisContext);
        expect(cursor.fetch()).toEqual([]);
      }
    );
  });

  describe("Cart", () => {
    // for this: "should return only one cart in cursor" test we need to avoid
    // user carts merging. We need registered users for here.
    const user = Factory.create("registeredUser");
    const userId = user._id;
    const sessionId = ReactionCore.sessionId = Random.id();
    const cartPub = Meteor.server.publish_handlers["Cart"];
    const thisContext = {
      userId: userId
    };

    beforeEach(() => {
      Collections.Cart.remove({});
      spyOn(Reaction, "getShopId").and.returnValue(shop._id);
      Meteor.call("cart/createCart", userId, sessionId);
    });

    it.skip(
      "should return a cart cursor",
      () => {
        const cursor = cartPub.apply(thisContext, [sessionId]);
        const data = cursor.fetch()[0];
        expect(data.userId).toEqual(userId);
      }
    );

    it.skip(
      "should return only one cart in cursor",
      () => {
        const user2 = Factory.create("registeredUser");
        Meteor.call("cart/createCart", user2._id, sessionId);
        const cursor = cartPub.apply(thisContext, [sessionId]);
        const data = cursor.fetch();
        expect(data.length).toEqual(1);
      }
    );
  });
});

