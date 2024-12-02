import { Duration, Stack, StackProps } from "aws-cdk-lib";
import { AuthorizationType, LambdaIntegration, LogGroupLogDestination, MethodLoggingLevel, RestApi, TokenAuthorizer } from "aws-cdk-lib/aws-apigateway";
import { Table } from "aws-cdk-lib/aws-dynamodb";
// import { Table } from "aws-cdk-lib/aws-dynamodb";
import { Runtime } from "aws-cdk-lib/aws-lambda";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import path from "path";
import FlightEvents from "./FlightEvents";
import { DefinitionBody, Pass, Result, StateMachine, TaskInput } from "aws-cdk-lib/aws-stepfunctions";
import * as tasks from "aws-cdk-lib/aws-stepfunctions-tasks";
import { EventBus, Rule, RuleTargetInput } from "aws-cdk-lib/aws-events";
import { LambdaFunction, SfnStateMachine } from "aws-cdk-lib/aws-events-targets";
import { LambdaInvoke } from "aws-cdk-lib/aws-stepfunctions-tasks";
import { PolicyStatement, Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";

interface ServiceStackProps extends StackProps {
    readonly flightOrderTableName: string;
    readonly tableStreamARN: string;
    readonly eventBusName: string;
}

export default class ServiceStack extends Stack {

    readonly apiGateway: RestApi;

    constructor(scope: Construct, id: string, props: ServiceStackProps) {
        super(scope, id, props);

        const flightOrderTable = Table.fromTableAttributes(this, 'FlightOrderTable',
            {
                tableName: props.flightOrderTableName,
                tableStreamArn: props.tableStreamARN
            });

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



        const logGroup = new LogGroup(this, 'APIGatewayAccessLogs', {});

        this.apiGateway = new RestApi(this, 'MyApi', {
            restApiName: 'ServiceApi',
            deployOptions: {
                loggingLevel: MethodLoggingLevel.INFO,
                accessLogDestination: new LogGroupLogDestination(logGroup),
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

        const enrichmentLambda = new NodejsFunction(this, 'EnrichmentLambda', {
            runtime: Runtime.NODEJS_18_X,
            entry: path.join(__dirname, "../../service/src/lambda/enrichment.ts"),
            handler: "handler",
            timeout: Duration.seconds(10),
            memorySize: 250,
            bundling: {
                sourceMap: true,
                minify: true
            },
            logRetention: RetentionDays.FIVE_DAYS
        });


        new FlightEvents(this, 'FlightEvents', {
            flightOrderTable,
            enrichmentLambda
        });

        // ------------------ Step Function Logic ------------------

        const eventBus = EventBus.fromEventBusName(this, 'EventBus', props.eventBusName);

        const passState = new Pass(this, "PassState", {
            result: Result.fromObject({
                message: "Order processing initiated",
            }),
            resultPath: "$.passStateResult",
        });


        const processOrderLambda = new NodejsFunction(this, "ProcessOrderLambda", {
            runtime: Runtime.NODEJS_18_X,
            entry: '../../../service/src/lambda/process-order.ts',
            handler: "handler",
            bundling: {
                minify: true,
                sourceMap: true,
            },
            environment: {
                EVENT_BUS_NAME: eventBus.eventBusName
            },
        });

        eventBus.grantPutEventsTo(processOrderLambda);

        const processOrderTask = new LambdaInvoke(this, "ProcessOrderStep", {
            lambdaFunction: processOrderLambda,
            payload: TaskInput.fromJsonPathAt("$"),
            resultPath: "$.processOrderResult",
        });

        // State Machine
        const definition = passState.next(processOrderTask);

        const orderProcessingWorkflow = new StateMachine(this, "OrderProcessingWorkflow", {
            stateMachineName: 'OrderProcessingStateMachine',
            definitionBody: DefinitionBody.fromChainable(definition),
            timeout: Duration.minutes(5),
            tracingEnabled: true,
        });

        const eventBridgeRole = new Role(this, "EventBridgeRole", {
            assumedBy: new ServicePrincipal("events.amazonaws.com"),
        });

        orderProcessingWorkflow.grantStartExecution(eventBridgeRole);

        // Sending flight order events to state machine workflow for processing
        new Rule(this, "OrderCreatedRule", {
            eventBus: eventBus,
            eventPattern: {
                source: ["flight/orders"],
                detailType: ["Flight-Order-Created"],
            },
            targets: [
                new SfnStateMachine(orderProcessingWorkflow, {
                    role: eventBridgeRole,
                    input: RuleTargetInput.fromEventPath("$.detail")
                }),
            ],
        });

        const lambdaRole = new Role(this, 'LambdaExecutionRole', {
            assumedBy: new ServicePrincipal('lambda.amazonaws.com'),
            description: 'Role that allows lambda to send emails via SES'
        });
        
        // Adding SES permissions to the role
        lambdaRole.addToPolicy(new PolicyStatement({
            actions: ['ses:SendEmail', 'ses:SendRawEmail'],
            resources: [
                `arn:aws:ses:us-east-1:954976306395:identity/nitinsaxena913@gmail.com`
            ],
        }));


        const orderNotificationLambda = new NodejsFunction(this, "OrderNotificationLambda", {
            runtime: Runtime.NODEJS_18_X,
            entry: path.join(__dirname, "../../service/src/lambda/order-notification.ts"),
            handler: "handler",
            role:lambdaRole,
            bundling: {
                externalModules: ['aws-sdk'],
                nodeModules:['aws-sdk'],
                minify: true,
                sourceMap: true,
            },
            logRetention: RetentionDays.FIVE_DAYS
        });

        lambdaRole.addToPolicy(new PolicyStatement({
            actions: [
                'logs:CreateLogGroup',
                'logs:CreateLogStream',
                'logs:PutLogEvents'
            ],
            resources: [
                // This scope can be broadened to all log groups under this account if needed
                `arn:aws:logs:us-east-1:954976306395:log-group:/aws/lambda/*:log-stream:*`
            ]
        }));

        new Rule(this, "OrderCompletedRule", {
            eventBus: eventBus,
            ruleName: "OrderCompletedRule",
            description: 'Send order complete event to passenger email',
            eventPattern: {
                source: ['flight/orders'],
                detailType: ['flight-order-complete'] 
            },
            targets: [new LambdaFunction(orderNotificationLambda, {
                event: RuleTargetInput.fromEventPath('$.detail')
            })],
        });

        orderNotificationLambda.addPermission('InvokeByEventBus', {
            principal: new ServicePrincipal('events.amazonaws.com'),
            sourceArn: eventBus.eventBusArn
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