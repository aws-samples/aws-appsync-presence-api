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

/**
 * AppSync schema code first definition.
 * 
 * See [Code-First Schema](https://docs.aws.amazon.com/cdk/api/latest/docs/aws-appsync-readme.html#code-first-schema)
 */
import * as AppSync from '@aws-cdk/aws-appsync';

/**
 * Helper function to define a GraphQl Type from an intermediate type.
 * 
 * @param intermediateType the intermediate type this type derives from
 * @param options possible values are `isRequired`, `isList`, `isRequiredList`
 */
function typeFromObject( intermediateType: AppSync.IIntermediateType, options?: AppSync.GraphqlTypeOptions ) : AppSync.GraphqlType {
  return AppSync.GraphqlType.intermediate({ intermediateType, ...options });
}

/**
 * Function called to return the schema
 * 
 * @returns AppSync.Schema 
 */
export function PresenceSchema() : AppSync.Schema {

  // Instantiate the schema
  const schema = new AppSync.Schema();

  // A Required ID type ("ID!")
  const requiredId = AppSync.GraphqlType.id({isRequired: true});

  // User defined types: enum for presence state, and required version (i.e. "status!")
  const status = new AppSync.EnumType("Status", {
    definition: ["online", "offline"]
  });
  const requiredStatus = typeFromObject(status, {isRequired: true});
  
  // Main type returned by API calls:
  // Directives are used to set access through IAM and API KEY
  // In production, recommendation would be to use Cognito or Open Id
  // (https://docs.aws.amazon.com/appsync/latest/devguide/security.html)
  const presence = new AppSync.ObjectType("Presence", {
    definition: { 
      id: requiredId,
      status: requiredStatus
    },
    directives: [AppSync.Directive.iam(), AppSync.Directive.apiKey()]
  });
  const returnPresence = typeFromObject(presence);
  
  // Add user defined types to the schema
  schema.addType(status);
  schema.addType(presence);

  // Add queries
  schema.addQuery("heartbeat", new AppSync.Field({
    returnType: returnPresence,
    args: { id: requiredId }
  }));
  schema.addQuery("status", new AppSync.Field({
    returnType: returnPresence,
    args: { id: requiredId }
  }));

  // Add mutations
  schema.addMutation("connect", new AppSync.Field({
    returnType: returnPresence,
    args: { id: requiredId }
  }));
  schema.addMutation("disconnect", new AppSync.Field({
    returnType: returnPresence,
    args: { id: requiredId }
  }));
  schema.addMutation("disconnected", new AppSync.Field({
    returnType: returnPresence,
    args: { id: requiredId },
    directives: [AppSync.Directive.iam()]
  }));

  // Add subscription
  schema.addSubscription("onStatus", new AppSync.Field({
    returnType: returnPresence,
    args: { id: requiredId },
    directives: [AppSync.Directive.subscribe("connect","disconnected")]
  }));

  return schema;
};