import { RemovalPolicy } from "aws-cdk-lib";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { CloudWatchLogGroup } from "aws-cdk-lib/aws-events-targets";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { NodejsFunction } from "aws-cdk-lib/aws-lambda-nodejs";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { CfnPipe } from "aws-cdk-lib/aws-pipes";
import { Construct } from "constructs";

interface FlightEventsProps {
    flightOrderTable: ITable
    enrichmentLambda: NodejsFunction
}

export default class FlightEvents extends Construct {
    constructor(scope: Construct, id: string, props: FlightEventsProps) {
        super(scope, id);

        const eventBus = new EventBus(this, "FlightOrderEventsBus", {
            eventBusName: "FlightOrderEventsBus",
        });

        const eventBusLogGroup = new LogGroup(this, "EventBusLogGroup", {
            retention: RetentionDays.ONE_DAY,
            removalPolicy: RemovalPolicy.DESTROY,
        });

        new Rule(this, "AllEventsRule", {
            eventBus: eventBus,
            ruleName: "AllEventsRule",
            description: 'Capture all events for debugging purpose',
            eventPattern: {
                source: ['flight/order'] 
            },
            targets: [new CloudWatchLogGroup(eventBusLogGroup)],
        });

        const pipeRole = new Role(this, "EventBridgePipeRole", {
            assumedBy: new ServicePrincipal("pipes.amazonaws.com"),
        });

        eventBus.grantPutEventsTo(pipeRole);
        props.flightOrderTable.grantStreamRead(pipeRole);
        props.enrichmentLambda.grantInvoke(pipeRole);

        const pipe = new CfnPipe(this, 'DynamoDBtoEventBusPipe', {
            name: 'EventOrderPipe',
            roleArn: pipeRole.roleArn,
            source: props.flightOrderTable.tableStreamArn!, // Ensure DynamoDB Streams is enabled on the table
            target: eventBus.eventBusArn,
            sourceParameters: {
                dynamoDbStreamParameters: {
                    startingPosition: 'LATEST',
                    batchSize: 10,
                },
                filterCriteria: {
                    filters: [{
                        pattern: `{
                            "eventName": ["INSERT"]
                        }`
                    }]
                }
            },
            targetParameters: {
                eventBridgeEventBusParameters: {
                    detailType: 'FlightOrderCreated',
                    source: 'flight/orders',
                },
                
            },
            enrichment: props.enrichmentLambda.functionArn,
        });

    }
}