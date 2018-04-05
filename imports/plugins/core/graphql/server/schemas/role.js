/* eslint-disable max-len */
export const typeDefs = `
  # The fields by which you are allowed to sort any query that returns an \`RoleConnection\`
  enum RoleSortByField {
    _id
    name
  }

  # Represents a named role
  type Role implements Node {
    # The role ID
    _id: ID!

    # A unique name for the role
    name: String!
  }

  # Wraps a list of \`Roles\`, providing pagination cursors and information.
  type RoleConnection implements NodeConnection {
    edges: [RoleEdge]
    nodes: [Role]
    pageInfo: PageInfo!
    totalCount: Int!
  }

  # A connection edge in which each node is a \`Role\` object
  type RoleEdge implements NodeEdge {
    cursor: ConnectionCursor!
    node: Role
  }

  extend type Query {
    # Returns a paged list of all roles associated with a shop
    roles(shopId: ID!, after: ConnectionCursor, before: ConnectionCursor, first: ConnectionLimitInt, last: ConnectionLimitInt, sortOrder: SortOrder = asc, sortBy: RoleSortByField = name): RoleConnection
  }
`;
