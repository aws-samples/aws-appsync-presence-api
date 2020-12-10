/*!
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this
 * software and associated documentation files (the "Software"), to deal in the Software
 * without restriction, including without limitation the rights to use, copy, modify,
 * merge, publish, distribute, sublicense, and/or sell copies of the Software, and to
 * permit persons to whom the Software is furnished to do so.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

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