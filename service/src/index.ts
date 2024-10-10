
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from 'uuid';

const client = new DynamoDBClient({ region: 'us-east-1' });
const dynamoDb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.TABLE_NAME;

export const handler = async (event: any) => {
    console.log("HTTP Method: ", JSON.stringify(event, null, 2));
    console.log('lets see', event)
    console.log('whats in body', event.body);

    console.log('tableee name', TABLE_NAME);
    try {
        const body = JSON.parse(event.body);

        console.log("flight data", body);

        // Generate a new orderId
        const orderId = uuidv4();

        // Create the order item
        const order = {
            orderId: orderId,
            passengerId: body.passengerId,
            passengerName: body.passengerName,
            email: body.email,
            flightDetails: body.flightDetails || {},
            totalAmount: body.totalAmount,
            notificationChannel: "EMAIL",
            paymentStatus: "Succeeded",
            createdAt: new Date().toISOString(),
        };
        console.log("reached here");
        // Store the order in DynamoDB using the PutCommand
        await dynamoDb.send(
            new PutCommand({
                TableName: TABLE_NAME,
                Item: order,
            })
        );
        console.log('done');
        // Return success response
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: "Order created successfully",
                orderId: orderId,
            }),
        };
    } catch (error) {
        console.error("Error creating order:", error, error.message);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server erro" }),
        };
    }
};