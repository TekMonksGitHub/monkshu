exports.registerSocket = async socket => {

    socket.on("data", (data) => {
        LOG.info("[INCOMING SOCKET DATA]");
        LOG.info(data);
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