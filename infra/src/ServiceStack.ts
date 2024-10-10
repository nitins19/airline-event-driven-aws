import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { AuthorizationType, LambdaIntegration, MethodLoggingLevel, RestApi, TokenAuthorizer } from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
// import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { RetentionDays } from "aws-cdk-lib/aws-logs";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import path from "path";

interface ServiceStackProps extends StackProps {
    readonly flightOrderTableName: string
}

export default class ServiceStack extends Stack {

    readonly apiGateway: RestApi;

    constructor(scope: Construct, id: string, props: ServiceStackProps) {
        super(scope, id, props);

        const flightOrderTable = Table.fromTableName(this, 'FlightOrderTable', props.flightOrderTableName);

        const serviceLambda = new NodejsFunction(this, 'ServiceLambda', {
            runtime: Runtime.NODEJS_18_X,
            entry: path.join(__dirname, "../../service/src/index.ts"),
            handler: "handler",
            timeout: Duration.seconds(10),
            memorySize: 250,
            bundling: {
                sourceMap: true,
                minify: true
            },
            environment: {
                TABLE_NAME: props.flightOrderTableName
            },
            logRetention: RetentionDays.FIVE_DAYS
        });

        flightOrderTable.grantReadWriteData(serviceLambda);
        

        this.apiGateway = new RestApi(this, 'MyApi', {
            restApiName: 'ServiceApi',
            deployOptions: {
                loggingLevel: MethodLoggingLevel.INFO,
                stageName: 'dev'
            }
        });

        // Define the authorizer Lambda function
        // const authorizerLambda = new NodejsFunction(this, 'AuthorizerLambda', {
        //     runtime: Runtime.NODEJS_18_X,
        //     entry: path.join(__dirname, "../../service/src/lambda/authorizer.ts"),
        //     handler: "handler",
        //     timeout: Duration.seconds(10),
        //     memorySize: 250,
        //     bundling: {
        //         sourceMap: true,
        //         minify: true
        //     },
        //     logRetention: RetentionDays.FIVE_DAYS
        // });

        // // Define the authorizer
        // const OAuthAuthorizer = new TokenAuthorizer(this, 'OAuthAuthorizer', {
        //     authorizerName: 'OktaAuthorizer',
        //     handler: authorizerLambda,
        //     identitySource: 'method.request.header.Authorization',
        //     resultsCacheTtl: Duration.seconds(300) // Cache authorization results for performance
        // });

        // Add a proxy resource and secure it with the OAuth authorizer
        const proxy = this.apiGateway.root.addProxy({
            anyMethod: true,
            defaultIntegration: new LambdaIntegration(serviceLambda)
            // defaultMethodOptions: {
            //     authorizer: OAuthAuthorizer,
            //     authorizationType: AuthorizationType.CUSTOM
            // }
        });

        // Create a Dead Letter Queue
        // const deadLetterQueue = new Queue(this, 'DLQ', {
        //     retentionPeriod: Duration.days(5) // Messages stay in the DLQ for 5 days
        // });

        // // Create the main SQS queue with a dead letter queue configured
        // const queue = new Queue(this, 'Queue', {
        //     retentionPeriod: Duration.days(1), // Messages stay in the queue for 1 day
        //     visibilityTimeout: Duration.seconds(40), // Visibility timeout of 40 seconds
        //     deadLetterQueue: {
        //         queue: deadLetterQueue,
        //         maxReceiveCount: 5 // Move messages to DLQ after 5 failed receives
        //     }
        // });

    }
}