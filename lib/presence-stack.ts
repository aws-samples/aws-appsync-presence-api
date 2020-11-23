// Nodejs imports
import * as path from "path";

// CDK imports
import * as CDK from '@aws-cdk/core';
import * as EC2 from '@aws-cdk/aws-ec2';
import * as IAM from '@aws-cdk/aws-iam';
import * as ElastiCache from '@aws-cdk/aws-elasticache';
import * as Lambda from '@aws-cdk/aws-lambda';
import * as AppSync from '@aws-cdk/aws-appsync';
import * as AwsEvents from '@aws-cdk/aws-events';
import * as AwsEventsTargets from '@aws-cdk/aws-events-targets';

// Local imports: schema creation function
import { PresenceSchema } from './schema';

// Interface used as parameter to create resolvers for our API
// @see function createResolver
interface ResolverOptions {
  source: string | AppSync.BaseDataSource,
  requestMappingTemplate?: AppSync.MappingTemplate,
  responseMappingTemplate?: AppSync.MappingTemplate
}

/**
 * class PresenceStack
 * 
 * This is the main stack of our Application
 */
export class PresenceStack extends CDK.Stack {

  // Internal variables
  private vpc : EC2.Vpc;
  private lambdaSG : EC2.SecurityGroup;
  private redisCluster : ElastiCache.CfnReplicationGroup;
  private redisLayer : Lambda.LayerVersion;
  private redisPort : number = 6379;
  readonly api : AppSync.GraphqlApi;

  // Lambda functions for our stacks are store by name
  // for further explicit access
  private functions : { [key : string] : Lambda.Function } = {};

  /**
   * Adds a Lambda Function to an internal list of functions indexed by their name.
   * The function code is assumed to be located in a subfolder related to that name 
   * and using `${name}.js` file as entry point.
   * 
   * Functions that require access to redis will have the "Redis Layer" attached,
   * containing a node module for Redis access, be placed inside the VPC,
   * and have environment variables set to access the Redis cluster.
   * 
   * The CDK Lambda.Code construct takes care of bundling the code
   * (including local modules if any, like for `on_disconnect` to call AppSync endpoint),
   * and uploading it as Asset to S3.
   * 
   * @param name string : the name given to the function
   * @param useRedis boolean : whether the lambda uses redis or not, if so it requires layer / VPC / env variables
   */
  private addFunction(name: string, useRedis: boolean = true) : void {
    const props = useRedis ? {
      vpc: this.vpc,
      vpcSubnets: this.vpc.selectSubnets({subnetGroupName: "Lambda"}),
      securityGroups: [this.lambdaSG]
    } : {};
    const fn = new Lambda.Function(this, name, {
      ...props,
      code: Lambda.Code.fromAsset(path.resolve(__dirname, `../src/functions/${name}/`)),
      runtime: Lambda.Runtime.NODEJS_12_X,
      handler: `${name}.handler`
    });
    // Specific elements to add for redis access
    if (useRedis) {
      fn.addLayers(this.redisLayer);
      fn.addEnvironment("REDIS_HOST", this.redisCluster.attrPrimaryEndPointAddress);
      fn.addEnvironment("REDIS_PORT", this.redisCluster.attrPrimaryEndPointPort);
    }
    // Store the function for further internal access
    this.functions[name] = fn;
  };

  /**
   * Retrieve one of the Lambda function by its name
   * 
   * @param name : string
   */
  private getFn(name: string) : Lambda.Function {
    return this.functions[name];
  };

  /**
   * Helper function to create a resolver.
   * 
   * A resolver attaches a Data Source to a specific field in the schema. 
   * The ResolverOptions might also include request mapping and response mapping templates
   * It returns the attached DataSource for possible reuse.
   * 
   * @param typeName : string the type (e.g. Query, Mutation or any other type)
   * @param fieldName : string the resolvable fields
   * @param options ResolverOptions
   * 
   * @returns AppSync.BaseDataSource
   */
  private createResolver(typeName: string, fieldName: string, options: ResolverOptions)
    : AppSync.BaseDataSource {
    let source = (typeof(options.source) === 'string') ?
      this.api.addLambdaDataSource(`${options.source}DS`, this.getFn(options.source)) :
      options.source;
    source.createResolver({ typeName, fieldName, ...options });
    return source;
  };

  /**
   * Stack constructor
   * 
   * @param scope 
   * @param id 
   * @param props 
   */
  constructor(scope: CDK.Construct, id: string, props?: CDK.StackProps) {
    super(scope, id, props);

    /**
     * Network:
     * 
     * Here we define a VPC with two subnet groups.
     * The CDK automatically creates subnets in at least 2 AZs by default
     * You can change the behavior using the `maxAzs` parameter.
     * 
     * Subnet types can be:
     * - ISOLATED: fully isolated (example: used for Redis Cluster or lambda functions accessing it)
     * - PRIVATE: could be used for a Lambda function that would require internet access through a NAT Gateway
     * - PUBLIC: required if there is a PRIVATE subnet to setup a NAT Gateway
     * 
     **/
    this.vpc = new EC2.Vpc(this, 'PresenceVPC', {
      cidr: "10.42.0.0/16",
      subnetConfiguration: [
        // Subnet group for Redis
        {
          cidrMask: 24,
          name: "Redis",
          subnetType: EC2.SubnetType.ISOLATED
        },
        // Subnet group for Lambda functions
        {
          cidrMask: 24,
          name: "Lambda",
          subnetType: EC2.SubnetType.ISOLATED
        }
      ]
    });

    // Create two different security groups:
    // One for the redis cluster, one for the lambda function.
    // This is to allow traffic only from our functions to the redis cluster
    const redisSG = new EC2.SecurityGroup(this, "redisSg", {
      vpc: this.vpc,
      description: "Security group for Redis Cluster"
    });
    this.lambdaSG = new EC2.SecurityGroup(this, "lambdaSg", {
      vpc: this.vpc,
      description: "Security group for Lambda functions"
    });
    // Redis SG accepts TCP connections from the Lambda SG on Redis port.
    redisSG.addIngressRule(
      this.lambdaSG,
      EC2.Port.tcp(this.redisPort)
    );

    /**
     * Redis cache cluster
     * Uses T3 small instances to start withs
     * 
     * Note those are level 1 constructs in CDK.
     * So props like `cacheSubnetGroupName` have misleading names and require a name 
     * in CloudFormation sense, which is actually a "ref" for reference.
     */
    const redisSubnets = new ElastiCache.CfnSubnetGroup(this, "RedisSubnets", {
      cacheSubnetGroupName: "RedisSubnets",
      description: "Subnet Group for Redis Cluster",
      subnetIds: this.vpc.selectSubnets({ subnetGroupName: "Redis"}).subnetIds
    });
    this.redisCluster = new ElastiCache.CfnReplicationGroup(this, "PresenceCluster", {
      replicationGroupDescription: "PresenceReplicationGroup",
      cacheNodeType: "cache.t3.small",
      engine: "redis",
      numCacheClusters: 2,
      automaticFailoverEnabled: true,
      multiAzEnabled: true,
      cacheSubnetGroupName: redisSubnets.ref,
      securityGroupIds: [redisSG.securityGroupId],
      port: this.redisPort
    });

    /**
     * Lambda functions creation:
     * 
     * - Define the layer to add nodejs redis module
     * - Add the functions
     */
    this.redisLayer = new Lambda.LayerVersion(this, "redisModule", {
      code: Lambda.Code.fromAsset(path.join(__dirname, '../src/layer/')),
      compatibleRuntimes: [Lambda.Runtime.NODEJS_12_X],
      layerVersionName: "presenceLayer"
    });
    // Use arrow function to keep "this" scope
    ['heartbeat','status','disconnect','timeout'].forEach(
      (fn) => { this.addFunction(fn); }
    );
    // On disconnect function does not require access to redis
    this.addFunction("on_disconnect", false);
    
    /**
     * The GraphQL API
     * 
     * Default authorization is set to use API_KEY. This is good for development and test,
     * in production, we recommend using a COGNITO or OPEN_ID user based authentification.
     * 
     * We also force the API key to expire after 7 days starting from the last deployment
     */
    this.api = new AppSync.GraphqlApi(this, "PresenceAPI", {
      name: "PresenceAPI",
      authorizationConfig: {
        defaultAuthorization: {
          authorizationType: AppSync.AuthorizationType.API_KEY,
          apiKeyConfig: { 
            name: "PresenceKey",
            expires: CDK.Expiration.after(CDK.Duration.days(7))
          }
        },
        additionalAuthorizationModes: [
          { authorizationType: AppSync.AuthorizationType.IAM }
        ]
      },
      schema: PresenceSchema(),
      logConfig: { fieldLogLevel: AppSync.FieldLogLevel.ALL }
    });

    // Configure sources and resolvers
    const heartbeatDS = this.createResolver("Query", "heartbeat", {source: "heartbeat"});
    this.createResolver("Query", "status", {source: "status"});
    this.createResolver("Mutation", "connect", {source: heartbeatDS} ); // Note: reusing heartbeat lambda here
    this.createResolver("Mutation", "disconnect", {source: "disconnect"} );

    // The "disconnected" mutation is called on disconnection, and
    // is the one AppSync client will subscribe too.
    // It uses a NoneDataSource with simple templates passing its argument,
    // so that it could trigger the notifications.
    const noneDS = this.api.addNoneDataSource("disconnectedDS");
    const requestMappingTemplate = AppSync.MappingTemplate.fromString(`
      {
        "version": "2017-02-28",
        "payload": {
          "id": "$context.arguments.id",
          "status": "offline"
        }        
      }
    `);
    const responseMappingTemplate = AppSync.MappingTemplate.fromString(`
      $util.toJson($context.result)
    `);
    this.createResolver("Mutation", "disconnected", {
      source: noneDS,
      requestMappingTemplate,
      responseMappingTemplate
    });

    /**
     * Event bus
     * 
     * We could use the Default Bus with EventBridge, but a custom bus
     * might be better for further extensions.
     */
    const presenceBus = new AwsEvents.EventBus(this, "PresenceBus");
    // Rule to trigger lambda timeout every minute
    new AwsEvents.Rule(this, "PresenceTimeoutRule", {
      schedule: AwsEvents.Schedule.cron({minute:"*"}),
      targets: [new AwsEventsTargets.LambdaFunction(this.getFn("timeout"))],
      enabled: true
    });
    // Rule for disconnection event: triggers the on_disconnect
    // lambda function, according to the given pattern
    new AwsEvents.Rule(this, "PresenceDisconnectRule", {
      eventBus: presenceBus,
      description: "Rule for presence disconnection",
      eventPattern: {
        detailType: ["presence.disconnected"],
        source: ["api.presence"]
      },
      targets: [new AwsEventsTargets.LambdaFunction(this.getFn("on_disconnect"))],
      enabled: true
    });
    // Add an interface endpoint for EventBridge: this allow
    // the lambda inside the VPC to call EventBridge without requiring a NAT Gateway
    // It also requires a security group that allows TCP 80 communications from the Lambdas security groups.
    const eventsEndPointSG = new EC2.SecurityGroup(this, "eventsEndPointSG", {
      vpc: this.vpc,
      description: "EventBrige interface endpoint SG"
    });
    eventsEndPointSG.addIngressRule(this.lambdaSG, EC2.Port.tcp(80));
    this.vpc.addInterfaceEndpoint("eventsEndPoint", {
      service: EC2.InterfaceVpcEndpointAwsService.CLOUDWATCH_EVENTS,
      subnets: this.vpc.selectSubnets({subnetGroupName: "Lambda"}),
      securityGroups: [eventsEndPointSG]
    });
    
    /**
     * Finalize configuration for lambda functions
     * 
     *  - Add environment variables to access api
     *  - Add IAM policy statement for GraphQL access
     *  - Add IAM policy statement for event bus access (putEvents)
     *  - Add the timeout
     */
    const allowEventBridge = new IAM.PolicyStatement({ effect: IAM.Effect.ALLOW });
    allowEventBridge.addActions("events:PutEvents");
    allowEventBridge.addResources(presenceBus.eventBusArn);
    
    this.getFn("timeout").addEnvironment("TIMEOUT", "10000")
      .addEnvironment("EVENT_BUS", presenceBus.eventBusName)
      .addToRolePolicy(allowEventBridge);
    
    this.getFn('disconnect')
      .addEnvironment("EVENT_BUS", presenceBus.eventBusName)
      .addToRolePolicy(allowEventBridge);

    this.getFn("heartbeat")
      .addEnvironment("EVENT_BUS", presenceBus.eventBusName)
      .addToRolePolicy(allowEventBridge);

    const allowAppsync = new IAM.PolicyStatement({ effect: IAM.Effect.ALLOW });
    allowAppsync.addActions("appsync:GraphQL");
    allowAppsync.addResources(this.api.arn + "/*");
    this.getFn("on_disconnect")
      .addEnvironment("GRAPHQL_ENDPOINT", this.api.graphqlUrl)
      .addToRolePolicy(allowAppsync);

    /**
     * The CloudFormation stack output
     * 
     * Contains:
     * - the GraphQL API Endpoint
     * - The API Key for the integration tests (could be removed in production)
     * - The region (required to configure AppSync client in integration tests)
     * 
     * Use the `-O, --outputs-file` option with `cdk deploy` to output those in a JSON file
     * `npm run deploy` uses this option as default
     */
    new CDK.CfnOutput(this, "presence-api", {
      value: this.api.graphqlUrl,
      description: "Presence api endpoint",
      exportName: "presenceEndpoint"
    });
    new CDK.CfnOutput(this, "api-key", {
      value: this.api.apiKey || '',
      description: "Presence api key",
      exportName: "apiKey"
    });
    new CDK.CfnOutput(this, "region", {
      value: process.env.CDK_DEFAULT_REGION || '',
      description: "Presence api region",
      exportName: "region"
    });
  }
}
