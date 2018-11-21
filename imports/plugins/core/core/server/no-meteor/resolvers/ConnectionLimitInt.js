import { GraphQLScalarType } from "graphql";
import { Kind } from "graphql/language";

const MAX_LIMIT = 200;

/**
 * Adjusts value to be between 1 and MAX_LIMIT, inclusive
 * @private
 */
function parseValue(value) {
  if (value === undefined || isNaN(value)) return undefined;
  if (typeof value !== "number") return MAX_LIMIT;
  return Math.min(Math.max(1, value), MAX_LIMIT);
}

const description = `
An integer between 1 and 50, inclusive. Values less than 1 become 1 and
values greater than 50 become 50.
`;

export default new GraphQLScalarType({
  description,
  name: "ConnectionLimitInt",
  serialize: (value) => value,
  parseLiteral(ast) {
    if (ast.kind !== Kind.INT) return MAX_LIMIT;
    return parseValue(parseInt(ast.value, 10));
  },
  parseValue
});
