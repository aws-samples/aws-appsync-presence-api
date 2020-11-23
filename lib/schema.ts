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
  schema.addQuery("heartbeat", new AppSync.ResolvableField({
    returnType: returnPresence,
    args: { id: requiredId }
  }));
  schema.addQuery("status", new AppSync.ResolvableField({
    returnType: returnPresence,
    args: { id: requiredId }
  }));

  // Add mutations
  schema.addMutation("connect", new AppSync.ResolvableField({
    returnType: returnPresence,
    args: { id: requiredId }
  }));
  schema.addMutation("disconnect", new AppSync.ResolvableField({
    returnType: returnPresence,
    args: { id: requiredId }
  }));
  schema.addMutation("disconnected", new AppSync.ResolvableField({
    returnType: returnPresence,
    args: { id: requiredId },
    directives: [AppSync.Directive.iam()]
  }));

  // Add subscription
  schema.addSubscription("onStatus", new AppSync.ResolvableField({
    returnType: returnPresence,
    args: { id: requiredId },
    directives: [AppSync.Directive.subscribe("connect","disconnected")]
  }));

  return schema;
};