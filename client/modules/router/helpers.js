import { Template } from "meteor/templating";
import { Meteor } from "meteor/meteor";
import Router from "./main";

/**
 * @method pathFor
 * @memberof Templates
 * @summary template helper to return path
 * @return {String} username
 */
Template.registerHelper("pathFor", Router.pathFor);

/**
 * @method urlFor
 * @memberof Templates
 * @summary template helper to return absolute + path
 * @return {String} username
 */
Template.registerHelper("urlFor", (path, params) => Meteor.absoluteUrl(Router.pathFor(path, params).substr(1)));

/**
 * @method active
 * @memberof Templates
 * @summary template helper for `Router.isActiveClassName`
 * @return {String} username
 */
Template.registerHelper("active", Router.isActiveClassName);
