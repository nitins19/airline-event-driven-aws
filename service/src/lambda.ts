
export const handler = async(event: any) => {
    console.log("HTTP Method: ", JSON.stringify(event, null, 2));
    const response = {
        statusCode: 200,
        body: JSON.stringify('In progress..'),
    };
    return response;
};