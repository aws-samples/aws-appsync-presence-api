/**
 * AppSync schema code first definition.
 * 
 */
import * as AppSync from '@aws-cdk/aws-appsync';

function typeFromObject( intermediateType: AppSync.IIntermediateType, options?: AppSync.GraphqlTypeOptions ) : AppSync.GraphqlType {
  return AppSync.GraphqlType.intermediate({ intermediateType, ...options });
}

export function PresenceSchema() : AppSync.Schema {

  const schema = new AppSync.Schema();

  // Types helpers
  const requiredId = AppSync.GraphqlType.id({isRequired: true});

  // User defined types
  const status = new AppSync.EnumType("Status", {
    definition: ["online", "offline"]
  });
  const requiredStatus = typeFromObject(status, {isRequired: true});
  const change = new AppSync.ObjectType("Change", {
    definition: { 
      id: requiredId,
      status: requiredStatus
    }
  });
  const returnChange = typeFromObject(change);
  
  // Add user defined types to the schema
  schema.addType(status);
  schema.addType(change);

  // Add queries
  schema.addQuery("heartbeat", new AppSync.ResolvableField({
    returnType: returnChange,
    args: { id: requiredId }
  }));
  schema.addQuery("status", new AppSync.ResolvableField({
    returnType: returnChange,
    args: { id: requiredId }
  }));

  // Add mutation
  schema.addMutation("connect", new AppSync.ResolvableField({
    returnType: returnChange,
    args: { id: requiredId }
  }));
  schema.addMutation("disconnect", new AppSync.ResolvableField({
    returnType: returnChange,
    args: { id: requiredId }
  }));
  schema.addMutation("disconnected", new AppSync.ResolvableField({
    returnType: returnChange,
    args: { id: requiredId },
    directives: [AppSync.Directive.iam()]
  }));

  // Add subscription
  schema.addSubscription("onStatus", new AppSync.ResolvableField({
    returnType: returnChange,
    args: { id: requiredId },
    directives: [AppSync.Directive.subscribe("connect","disconnected")]
  }));

  return schema;

};