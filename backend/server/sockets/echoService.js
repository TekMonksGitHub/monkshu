const { wsBuffer } = require(`${CONSTANTS.LIBDIR}/wsBuffer.js`);

exports.registerSocket = async (socket) => {

    socket.on("data", (buffer) => {
        LOG.info("[INCOMING SOCKET DATA]");

        try {
            const message = wsBuffer.parse(buffer);
            if (!message) return;

            LOG.info(message);

            // Creating an echo service
            const response = wsBuffer.construct(message);
            socket.write(response);
        } catch (error) {
            LOG.error(error);
            socket.destroy();
        }
    });

    socket.on("end", _ => {
        LOG.info("[SOCKET CONNECTION DISCONNECTED]");
    });

    socket.on("close", _ => {
        LOG.info("[SOCKET CONNECTION CLOSED]");
    });

    socket.on("error", (error) => {
        LOG.info("[SOCKET CONNECTION ERROR]");
        LOG.error(error);
    });

    return true;
};