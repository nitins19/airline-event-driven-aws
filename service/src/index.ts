exports.handler = async (event) => {
    try {
        console.log("Received event:", JSON.stringify(event));
        const body = JSON.parse(event.body); // Ensure this line doesn't throw an error
        // Your business logic here
        return {
            statusCode: 200,
            body: JSON.stringify({ message: "Success" })
        };
    } catch (error) {
        console.error("Processing error:", error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: "Internal server error" })
        };
    }
};
