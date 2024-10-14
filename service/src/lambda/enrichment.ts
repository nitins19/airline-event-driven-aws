import { unmarshall } from "@aws-sdk/util-dynamodb";


export const handler = async (event: any) => {

    const enrichedEvents = event.map((record:any) => {
        const newItem = unmarshall(record.dynamodb.NewImage);

        console.log(
            "Unmarshalled DynamoDB item:",
            JSON.stringify(newItem, null, 2)
        );

        return {
            orderId: newItem.orderId,
            passengerId: newItem.passengerId,
            passengerName: newItem.passengerName,
            email: newItem.email,
            addOns: newItem.addOns,
            flightDetails: newItem.flightDetails,
            notificationChannel: newItem.notificationChannel,
            totalAmount: newItem.totalAmount,
            createdAt: newItem.createdAt
        };
    });

    return enrichedEvents;
};