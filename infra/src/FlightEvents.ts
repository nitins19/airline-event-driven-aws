import { RemovalPolicy } from "aws-cdk-lib";
import { ITable } from "aws-cdk-lib/aws-dynamodb";
import { EventBus, Rule } from "aws-cdk-lib/aws-events";
import { CloudWatchLogGroup } from "aws-cdk-lib/aws-events-targets";
import { Role, ServicePrincipal } from "aws-cdk-lib/aws-iam";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { CfnPipe } from "aws-cdk-lib/aws-pipes";
import { Construct } from "constructs";

interface FlightEventsProps {
    flightOrderTable: ITable
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

        const pipeLogGroup = new LogGroup(this, "EventBridgePipeLogGroup", {
            retention: RetentionDays.ONE_DAY,
            removalPolicy: RemovalPolicy.DESTROY,
          });

        eventBus.grantPutEventsTo(pipeRole);
        props.flightOrderTable.grantStreamRead(pipeRole);
        pipeLogGroup.grantWrite(pipeRole);

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
                    source: 'flight/order',
                },
                inputTemplate: `{
                        "data": {
                          "passengerId": "<$.dynamodb.NewImage.passengerId.S>",
                          "passengerName": "<$.dynamodb.NewImage.passengerName.S>",
                          "email": "<$.dynamodb.NewImage.email.S>",
                          "flightDetails": {
                            "Flight": "<$.dynamodb.NewImage.flightDetails.M.Flight.S>",
                            "PNR": "<$.dynamodb.NewImage.flightDetails.M.PNR.S>",
                            "FROM": "<$.dynamodb.NewImage.flightDetails.M.FROM.S>",
                            "TO": "<$.dynamodb.NewImage.flightDetails.M.TO.S>",
                            "Departure Time": "<$.dynamodb.NewImage.flightDetails.M.Departure_Time.S>"
                                         },
                          "addOns": "<$.dynamodb.NewImage.addOns.L>",
                          "totalAmount": "<$.dynamodb.NewImage.totalAmount.N>"
                            }
                    }`
            }
        });

    }
}