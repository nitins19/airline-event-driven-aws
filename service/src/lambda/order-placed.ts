
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamoDb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event: any) => {

    try {
        const body = JSON.parse(event.body);

        // Generate a new passengerId
        const passengerId = uuidv4();

        const order = {
            passengerId: passengerId,
            passengerName: body.passengerName,
            email: body.email,
            flightDetails: body.flightDetails || {},
            addOns: body.addOns,
            totalAmount: body.totalAmount,
            notificationChannel: "EMAIL",
            paymentStatus: "Succeeded",
            createdAt: new Date().toISOString(),
        };

        await dynamoDb.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: order,
            })
        );
        return ({
            statusCode: 201,
            body: JSON.stringify({
                message: "Order created successfully"
            }),
        });
    } catch (error) {
        console.error("Error creating order:", error);
    }
};