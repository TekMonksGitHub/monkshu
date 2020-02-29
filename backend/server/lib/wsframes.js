
function parse(buffer) {

    const firstByte = buffer.readUInt8(0);
    const _isFinalFrame = Boolean((firstByte >>> 7) & 0x1);
    const [_reserved1, _reserved2, _reserved3] = [Boolean((firstByte >>> 6) & 0x1), Boolean((firstByte >>> 5) & 0x1), Boolean((firstByte >>> 4) & 0x1)];
    const opCode = firstByte & 0xF;

    /* 0x8 (Connection Close Frame) | 0x1 (Text Frame) */
    if (opCode === 0x8 || opCode !== 0x1) return;

    const secondByte = buffer.readUInt8(1);
    const isMasked = Boolean((secondByte >>> 7) & 0x1);

    /* Keep track of our current position as we advance through the buffer */
    let currentOffset = 2;
    let payloadLength = secondByte & 0x7F;

    if (payloadLength > 125) {
        if (payloadLength === 126) {
            payloadLength = buffer.readUInt16BE(currentOffset);
            currentOffset += 2;
        } else {
            /* payloadLength is 127 */
            throw new Error("Ridiculously huge payload. Currently not supported.");
        }
    }

    let maskingKey;
    if (isMasked) {
        maskingKey = buffer.readUInt32BE(currentOffset);
        currentOffset += 4;
    }

    /* Allocate somewhere to store the final message data */
    const data = Buffer.alloc(payloadLength);

    if (isMasked) {
        for (let i = 0, j = 0; i < payloadLength; ++i, j = i % 4) {
            const shift = j == 3 ? 0 : (3 - j) << 3;
            const mask = (shift == 0 ? maskingKey : (maskingKey >>> shift)) & 0xFF;
            const source = buffer.readUInt8(currentOffset++);
            data.writeUInt8(mask ^ source, i);
        }
    } else {
        buffer.copy(data, 0, currentOffset++);
    }

    try {
        const jsonString = data.toString('utf8');
        return JSON.parse(jsonString);
    } catch (error) {
        LOG.error("[PARSER] Invalid JSON provided.");
        return;
    }
};

function construct(data) {

    const jsonString = JSON.stringify(data);
    const jsonStringByteLength = Buffer.byteLength(jsonString);

    const lengthByteCount = jsonStringByteLength < 126 ? 0 : 2;
    const payloadLength = lengthByteCount === 0 ? jsonStringByteLength : 126;
    const buffer = Buffer.alloc(2 + lengthByteCount + jsonStringByteLength);

    buffer.writeUInt8(0b10000001, 0);
    buffer.writeUInt8(payloadLength, 1);

    let payloadOffset = 2;
    if (lengthByteCount > 0) {
        buffer.writeUInt16BE(jsonStringByteLength, 2);
        payloadOffset += lengthByteCount;
    }

    /* Write JSON data to the data buffer */
    buffer.write(jsonString, payloadOffset);

    return buffer;
};

module.exports = { parse, construct };
