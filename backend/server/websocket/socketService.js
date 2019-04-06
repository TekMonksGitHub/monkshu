exports.registerSocket = async socket => {

    socket.on("data", (data) => {
        LOG.info("[INCOMING SOCKET DATA]");
        LOG.info(data);

        // TODO:
        // Accumulate and unmask the incoming data buffer
        // Feed the unmasked data to the socket, creating an echo service
        // Making use of socker.write("...")
    });

    socket.on("end", _ => {
        LOG.info("[SOCKET CONNECTION DISCONNECTED]");
    });

    socket.on("close", _ => {
        LOG.info("[SOCKET CONNECTION CLOSED]");
    });

    socket.on("error", (error) => {
        LOG.info("[SOCKET CONNECTION ERROR]");
        LOG.info(error);
    })

    return true;
}