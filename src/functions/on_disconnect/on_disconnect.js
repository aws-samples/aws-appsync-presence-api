/**
 * The `on_disconnect` function requires an AppSync client
 * It is installed as node modules within its own folder
 * 
 * Make sure `npm install` was run in this folder
 */
require('isomorphic-fetch'); // Required for 'aws-appsync'
const AWS = require('aws-sdk/global');
const AppSync = require('aws-appsync');
const AppSyncClient = AppSync.default;
const AUTH_TYPE = AppSync.AUTH_TYPE;
const gql = require('graphql-tag');

// Retrieve environment value
const graphqlEndpoint = process.env.GRAPHQL_ENDPOINT;

// Initialize GraphQL client with IAM credentials
const config = {
  url: graphqlEndpoint,
  region: process.env.AWS_REGION,
  auth: {
    type: AUTH_TYPE.AWS_IAM,
    credentials: AWS.config.credentials
  },
  disableOffline: true
};
const gqlClient = new AppSyncClient(config);

// Query is the same for all calls
const disconnected = gql`
  mutation disconnected($id: ID!) {
    disconnected(id: $id) {
      id
      status
    }
  }
`;

/**
 * Handler function for disconnection
 * 
 * 1 - Check `arguments.id` from the event
 * 2 - Call the `disconnected` mutation on AppSync client
 * 
 * @param {*} event
 */
exports.handler =  async function(event) {
  // Simply call graphql mutation
  const id = event && event.detail && event.detail.id;
  if (undefined === id || null === id) throw new Error("Missing argument 'id'");
  try {
    const result = await gqlClient.mutate({
      mutation: disconnected,
      variables: {id}
    });
    return result.data.disconnected;
  } catch (error) {
    return error;
  }
}