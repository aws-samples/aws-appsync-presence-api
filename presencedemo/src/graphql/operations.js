import gql from 'graphql-tag';
const presenceResult = `{
  id
  status
}`;
export default {
  getStatus: gql`
    query getStatus($id: ID!) {
      status(id: $id) ${presenceResult}
    }`,
  sendHeartbeat: gql`
    query heartbeat($id: ID!) {
      heartbeat(id: $id) ${presenceResult}
    }`,
  connect: gql`
    mutation connectPlayer($id: ID!) {
      connect(id: $id) ${presenceResult}
    }`,
  disconnect: gql`
    mutation disconnectPlayer($id: ID!) {
      disconnect(id: $id) ${presenceResult}
    }`,
  onStatus: gql`
    subscription statusChanged($id: ID!) {
      onStatus(id: $id) ${presenceResult}
    }`
}